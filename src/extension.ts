// ================== Imports ==================== //
import * as vscode from 'vscode';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { installGitAlias, setupOllamaModel} from './setup/gitAlias';
import { statusCheck, modelCheck } from './ai/ollama';
import { reviewWithOllama } from './ai/review';


// ================== Constants ==================== //

const SCRIPT_DIR = path.join(os.homedir(), '.config', 'revisor');
const ARGS_PATH = path.join(SCRIPT_DIR, 'pending-args.txt');


// ================== Main ==================== //

export async function activate(context: vscode.ExtensionContext): Promise<void> {

    // context.globalState.update('aliasInstalled', undefined); // debug only

    // Set up environment
    installGitAlias(context);

    // Check if Ollama is installed and the model pulled
    await statusCheck();

    // Create custom ollama model (first run)
    await setupOllamaModel(context);

    await modelCheck();    

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

        // Next: send diff to Ollama
        let review = await reviewWithOllama(diff, localBranch, remote, remoteBranch);
        console.log(review);

    };

    watcher.onDidCreate(handleReview);
    watcher.onDidChange(handleReview);
    context.subscriptions.push(watcher);
}

export function deactivate(): void {}