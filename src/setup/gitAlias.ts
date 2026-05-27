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

export async function setupOllamaModel(context: vscode.ExtensionContext, modelName: string): Promise<void> {
    const customModelName = `revisor-model-${modelName}`;
    if (context.globalState.get(`${customModelName}-installed`)) return;

    const ollamaExe = getOllamaExecutable();
    const modelfilePath = path.join(SCRIPT_DIR, 'Modelfile');

    fs.writeFileSync(modelfilePath, `FROM ${modelName}

SYSTEM """
You are a code reviewer. You will be given a git diff between two branches.
You must read the diff carefully and describe the ACTUAL content of the changes, not just that changes exist.

Rules:
- Read the actual lines added (+) and removed (-) in the diff
- For documentation files (.md): consequences are "No functional impact." UNLESS the content contains bash commands, scripts, or instructions that could cause data loss or system damage if executed
- SECURITY CHECK: If any added line contains shell commands flag them explicitly in risks and set verdict to "breaking" regardless of file type
- For "description": do not summarize in one sentence. Explain:
    * The exact lines added and removed.
    * What the old behaviour was before the change.
    * What the new behaviour is after the change.
- For "consequences": 
    * Never write "No functional impact" for code changes, you can write it only for documentation.
    * Explain the runtime effect — what happens now that didn't happen before, or vice versa.
    * If it's a refactor, explicitly state "behaviour is preserved but..."
    * Never write vague phrases like "may affect functionality" or "may affect how the project is displayed"
- For "risks": 
    * Think carefully — a change that looks safe may have edge cases.
    * For refactors: could the new implementation behave differently in edge cases?
    * For dependency updates: do major version bumps introduce breaking changes?
    * List any dangerous bash commands found verbatim, explain what they do.

- For "verdict": 
    * "safe" for documentation/minor changes with no logical impact on the code.
    * "review needed" for logic changes in the code that need human verification.
    * "breaking" for any change containing bash commands OR API/interface changes.
- Return ONLY a JSON object, no markdown, no backticks, no explanation.

You always return a JSON object with this exact structure:
{
    "summary": "Resume what changed in one sentence at a general level",
    "changes": [
        {
            "file": "filename",
            "description": "",
            "consequences": ""
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
        execSync(`"${ollamaExe}" create ${customModelName} -f "${modelfilePath}"`);  
        context.globalState.update(`${customModelName}-installed`, true);
        vscode.window.showInformationMessage(`${customModelName}-installed`);
    } catch (error) {
        vscode.window.showErrorMessage(`Revisor: failed to create Ollama model. ${error}`);
    }
}
