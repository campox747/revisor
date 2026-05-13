// ================== Constants ==================== //

const ollamaUrl = 'http://localhost:11434';

// ================== Functions ==================== //

export async function reviewWithOllama(diff: string, localBranch: string, remote: string, remoteBranch: string): Promise<string> {
    const prompt = `Local branch: ${localBranch}\nRemote: ${remote}/${remoteBranch}\n\nDiff:\n${diff}` // as above
    console.log(diff);
    const response = await fetch(`${ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: 'revisor-model',
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