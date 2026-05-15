
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

interface ReviewChange {
    file: string;
    description: string;
    consequences: string;
}

interface Review {
    summary: string;
    changes: ReviewChange[];
    risks: string[];
    verdict: string;
}

export async function writeReport(
    workspaceRoot: string,
    reviewJson: string,
    localBranch: string,
    remote: string,
    remoteBranch: string
): Promise<void> {

    const review: Review = JSON.parse(reviewJson);
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const reviewPath = path.join(workspaceRoot, 'REVIEW.md');

    const entry = [
        `---`,
        `## Review — ${timestamp}`,
        `**Comparing:** \`${localBranch}\` ← \`${remote}/${remoteBranch}\``,
        `**Verdict:** ${verdictBadge(review.verdict)}`,
        ``,
        `### Summary`,
        review.summary,
        ``,
        `### Changes`,
        ...review.changes.map(c => [
            `#### \`${c.file}\``,
            `**What changed:** ${c.description}`,
            `**Consequences:** ${c.consequences}`,
            ``
        ].join('\n')),
        `### Risks`,
        review.risks.length > 0
            ? review.risks.map(r => `- ${r}`).join('\n')
            : '_No risks identified._',
        ``,
    ].join('\n');

    // Create the file with a header if it doesn't exist yet

    //--------------- TO DO: ADD CHECK FOR EMPTY FILE --------------------


    if (!fs.existsSync(reviewPath)) {
        fs.writeFileSync(reviewPath, `# Revisor — Code Review History\n\n`);

        const gitignorePath = path.join(workspaceRoot, '.gitignore');
        const gitignoreEntry = '\n# Revisor\nREVIEW.md\n';

        if (fs.existsSync(gitignorePath)) {
            const contents = fs.readFileSync(gitignorePath, 'utf8');
            if (!contents.includes('REVIEW.md')) {
                fs.appendFileSync(gitignorePath, gitignoreEntry);
            }
        } else {
            fs.writeFileSync(gitignorePath, gitignoreEntry);
        }
    }

    // Append the new review entry
    fs.appendFileSync(reviewPath, entry);

    const doc = await vscode.workspace.openTextDocument(reviewPath);
    await vscode.window.showTextDocument(doc);
}

function verdictBadge(verdict: string): string {
    switch (verdict) {
        case 'safe':           return '✅ Safe';
        case 'review needed':  return '⚠️ Review Needed';
        case 'breaking':       return '🔴 Breaking';
        default:               return verdict;
    }
}