// ================== Imports ==================== //

import * as vscode from 'vscode';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';


// ================== Constants ==================== //

const SCRIPT_DIR = path.join(os.homedir(), '.config', 'revisor');
const SCRIPT_PATH = path.join(SCRIPT_DIR, 'revisor.sh');
const ARGS_PATH = path.join(SCRIPT_DIR, 'pending-args.txt');


// ================== Functions ==================== //

export function toUnixPath(p: string): string {
    return p.replace(/\\/g, '/').replace(/^([A-Z]):/, (_, d) => `/${d.toLowerCase()}`);
}

export function installGitAlias(context: vscode.ExtensionContext): void {
    if (context.globalState.get('aliasInstalled')) return;

    const bashScriptPath = toUnixPath(SCRIPT_PATH);
    const bashArgsPath = toUnixPath(ARGS_PATH);

    try {
        fs.mkdirSync(SCRIPT_DIR, { recursive: true });
        fs.writeFileSync(
            SCRIPT_PATH,
            `#!/bin/bash\necho "$1 $2 $3" > "${bashArgsPath}"\n`,
            { mode: 0o755 }
        );
        execSync(`git config --global alias.revisor "!bash '${bashScriptPath}'"`);
        vscode.window.showInformationMessage('Revisor: git alias installed. You can now use git revisor.');
    } catch (error) {
        vscode.window.showErrorMessage(`Revisor: failed to install git alias. ${error}`);
        return;
    }

    context.globalState.update('aliasInstalled', true);
}

export function getOllamaExecutable(): string {
    return path.join(process.env['LOCALAPPDATA'] || '', 'Programs', 'Ollama', 'ollama.exe');
}

export async function setupOllamaModel(context: vscode.ExtensionContext): Promise<void> {
    if (context.globalState.get('ollamaModelInstalled')) return;

    const ollamaExe = getOllamaExecutable();
    const modelfilePath = path.join(SCRIPT_DIR, 'Modelfile');

    fs.writeFileSync(modelfilePath, `FROM qwen2.5-coder:1.5b

SYSTEM """
You are a code reviewer. You will be given a git diff between two branches.
You must read the diff carefully and describe the ACTUAL content of the changes, not just that changes exist.

Rules:
- Read the actual lines added (+) and removed (-) in the diff
- For documentation files (.md): consequences are "No functional impact." UNLESS the content contains dangerous commands, scripts, or instructions that could cause data loss or system damage if executed
- SECURITY CHECK: If any added line contains shell commands (especially rm, dd, mkfs, curl | bash, wget | sh, chmod, sudo), flag them explicitly in risks and set verdict to "breaking" regardless of file type
- - For "description": do not summarize in one sentence. Explain:
    * The exact lines added and removed
    * What the old behaviour was before the change
    * What the new behaviour is after the change
- For "consequences": 
    * Never write "No functional impact" for code changes, only for documentation
    * Explain the runtime effect — what happens now that didn't happen before, or vice versa
    * If it's a refactor, explicitly state "behaviour is preserved but..."
    * Never write vague phrases like "may affect functionality" or "may affect how the project is displayed"
- For "risks": list any dangerous commands found verbatim, explain what they do
- For "verdict": 
    * "safe" for documentation/minor changes with no dangerous content
    * "review needed" for logic changes that need human verification
    * "breaking" for any change containing dangerous commands OR API/interface changes
- Return ONLY a JSON object, no markdown, no backticks, no explanation

You always return a JSON object with this exact structure:
{
    "summary": "one paragraph overview of what changed",
    "changes": [
        {
            "file": "filename",
            "description": "what changed in this file",
            "consequences": "impact of this change on the codebase"
        }
    ],
    "risks": ["any potential issues or breaking changes"],
    "verdict": "safe | review needed | breaking"
}
Return ONLY the JSON object. No markdown, no explanation, no backticks.
"""

PARAMETER temperature 0.2
PARAMETER num_ctx 8192
`);

    try {
        execSync(`"${ollamaExe}" create revisor-model -f "${modelfilePath}"`);
        context.globalState.update('ollamaModelInstalled', true);
        vscode.window.showInformationMessage('Revisor: AI model ready.');
    } catch (error) {
        vscode.window.showErrorMessage(`Revisor: failed to create Ollama model. ${error}`);
    }
}
