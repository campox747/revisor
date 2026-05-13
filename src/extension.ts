// ================== Imports ==================== //
import * as vscode from 'vscode';
import * as os from 'os';
import * as path from 'path';

import { installGitAlias, setupOllamaModel} from './setup/gitAlias';
import { statusCheck, modelCheck } from './ai/ollama';
import { reviewWithOllama } from './ai/review';
import { handleReview } from './git/diff';
import { writeReport } from './report/writer';

// ================== Constants ==================== //

const SCRIPT_DIR = path.join(os.homedir(), '.config', 'revisor');

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
    await statusCheck();

    // Create custom ollama model (first run)
    await setupOllamaModel(context);

    await modelCheck();    

    const watcher = vscode.workspace.createFileSystemWatcher(
        new vscode.RelativePattern(
            vscode.Uri.file(SCRIPT_DIR),
            'pending-args.txt'
        )
    );

     const onFileChange = async () => {
        const result = await handleReview();
        if (result) {
            const { diff, remote, localBranch, remoteBranch } = result;
            const review = await reviewWithOllama(diff, localBranch, remote, remoteBranch);

            console.log(review);

            const workspaceRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
            if (workspaceRoot) {
                writeReport(workspaceRoot, review, localBranch, remote, remoteBranch);
            }
        }
    };

    watcher.onDidCreate(onFileChange);
    watcher.onDidChange(onFileChange);
    context.subscriptions.push(watcher);
}

export function deactivate(): void {}