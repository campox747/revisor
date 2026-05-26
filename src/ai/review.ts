// ================== Constants ==================== //

const ollamaUrl = 'http://localhost:11434';

// ================== Functions ==================== //

interface ParsedDiff {
    files: {
        filename: string;
        added: string[];
        removed: string[];
    }[];
}

export function parseDiff(diff: string): ParsedDiff {
    const files: ParsedDiff['files'] = [];
    let currentFile: ParsedDiff['files'][0] | null = null;

    for (const line of diff.split('\n')) {
        // Detect new file
        if (line.startsWith('diff --git')) {
            if (currentFile) files.push(currentFile);
            const match = line.match(/diff --git a\/.+ b\/(.+)/);
            currentFile = {
                filename: match ? match[1] : 'unknown',
                added: [],
                removed: []
            };
        }
        // Added line
        else if (line.startsWith('+') && !line.startsWith('+++') && currentFile) {
            currentFile.added.push(line.substring(1).trim());
        }
        // Removed line
        else if (line.startsWith('-') && !line.startsWith('---') && currentFile) {
            currentFile.removed.push(line.substring(1).trim());
        }
    }

    if (currentFile) files.push(currentFile);
    return { files };
}

export function trimDiff(diff: string, maxLines = 300): string {
    const lines = diff.split('\n');
    if (lines.length <= maxLines) return diff;

    const trimmed = lines.slice(0, maxLines);
    trimmed.push(`\n... diff truncated at ${maxLines} lines for performance ...`);
    return trimmed.join('\n');
}

export async function reviewWithOllama(diff: string, localBranch: string, remote: string, remoteBranch: string, modelName: string): Promise<string> {

    const parsed = parseDiff(diff);
    const customModelName = `revisor-model-${modelName}`;

    const humanReadableChanges = parsed.files.map(f => {
        const ext = f.filename.split('.').pop();
        const fileType = ext === 'md' ? 'documentation'
            : ext === 'json' ? 'configuration'
            : 'file';

        const parts: string[] = [
            `File: ${f.filename} (${fileType})`
        ];
        if (f.added.length > 0) {
            parts.push(`Added lines:\n${f.added.map(l => `  + ${l}`).join('\n')}`);
        }
        if (f.removed.length > 0) {
            parts.push(`Removed lines:\n${f.removed.map(l => `  - ${l}`).join('\n')}`);
        }
        return parts.join('\n');
    }).join('\n\n');

    const prompt = `Local branch: ${localBranch}\nRemote: ${remote}/${remoteBranch}\n\nDiff:\n${diff} 
    The following lines were explicitly added or removed: ${humanReadableChanges}`

    const response = await fetch(`${ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: customModelName,
            prompt,
            stream: false
        })
    });

    const data = await response.json() as { response: string };
    
    // Strip markdown fences if the model ignores instructions
    const cleaned = data.response
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();

    // Validate it's actually JSON before writing to REVIEW.md
    try {
        JSON.parse(cleaned);
    } catch {
        throw new Error('Ollama returned invalid JSON. Please try again.');
    }

    return cleaned;
}