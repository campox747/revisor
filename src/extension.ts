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

function toUnixPath(p: string): string {
    return p.replace(/\\/g, '/').replace(/^([A-Z]):/, (_, d) => `/${d.toLowerCase()}`);
}

function installGitAlias(context: vscode.ExtensionContext): void {
    if (context.globalState.get('aliasInstalled')) return;

    // Add logic for other OSs here in future
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

async function checkOllama(): Promise<boolean> {
    try {
        const res = await fetch('http://localhost:11434');
        return res.ok;
    } catch {
        return false;
    }
}

async function statusCheck(): Promise<void> {
    if (!await checkOllama()) {
        const action = await vscode.window.showErrorMessage(
            'Revisor: Ollama is not running. Please install Ollama and run "ollama serve" before using Revisor.',
            'Install Ollama',
            'Dismiss'
        );
        if (action === 'Install Ollama') {
            vscode.env.openExternal(vscode.Uri.parse('https://ollama.com'));
        }
        return;
    }
}

async function checkModel(model: string): Promise<boolean> {
    try {
        const res = await fetch('http://localhost:11434/api/tags');
        const data = await res.json() as { models: { name: string }[] };
        return data.models.some(m => m.name.startsWith(model));
    } catch {
        return false;
    }
}

async function modelCheck(): Promise<void> {
    if (!await checkModel('codellama')) {
        const action = await vscode.window.showErrorMessage(
            'Revisor: codellama model not found. Please run "ollama pull codellama" in your terminal.',
            'Dismiss'
        );
    return;
    }
}

// TO DO: split file into multiple helpers and orcherstrate everything from extension.ts
// TO DO: set up the custom ollama model during first iteration


async function reviewWithOllama(diff: string, localBranch: string, remote: string, remoteBranch: string): Promise<string> {
    const prompt = `Local branch: ${localBranch}\nRemote: ${remote}/${remoteBranch}\n\nDiff:\n${diff}` // as above

    const response = await fetch(`${}/api/generate`, {
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
// ================== Main ==================== //

export function activate(context: vscode.ExtensionContext): void {

    // context.globalState.update('aliasInstalled', undefined); // debug only

    // Set up environment
    installGitAlias(context);

    // Check if Ollama is installed and the model pulled
    statusCheck();
    modelCheck();    

    // Watcher must be created inside activate()
    const watcher = vscode.workspace.createFileSystemWatcher(
        new vscode.RelativePattern(
            vscode.Uri.file(SCRIPT_DIR),
            'pending-args.txt'
        )
    );

    const handleReview = async () => {

        const workspaceRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
        if (!workspaceRoot) {
            vscode.window.showErrorMessage('Revisor: please open a project folder in VSCode before running git revisor.');
            return;
        }

        // Read the args
        let remote: string, localBranch: string, remoteBranch: string;
        try {
            const args = fs.readFileSync(ARGS_PATH, 'utf8').trim().split(' ');
            if (args.length !== 3) {
                vscode.window.showErrorMessage('Revisor: invalid arguments. Usage: git revisor <remote> <localBranch> <remoteBranch>');
                return;
            }
            [remote, localBranch, remoteBranch] = args;
        } catch {
            vscode.window.showErrorMessage('Revisor: could not read pending-args.txt');
            return;
        }

        // Git fetch + diff
        let diff: string;
        try {
            execSync(`git fetch ${remote} ${remoteBranch}`, { cwd: workspaceRoot });
            diff = execSync(`git diff ${localBranch}..${remote}/${remoteBranch}`, { cwd: workspaceRoot }).toString();
        } catch (error) {
            vscode.window.showErrorMessage(`Revisor: git command failed. ${error}`);
            return;
        }

        if (!diff.trim()) {
            vscode.window.showInformationMessage('Revisor: no differences found between branches.');
            return;
        }
    };

    watcher.onDidCreate(handleReview);
    watcher.onDidChange(handleReview);
    context.subscriptions.push(watcher);
}

export function deactivate(): void {}