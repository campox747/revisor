// ================== Imports ==================== //
import * as vscode from 'vscode';
import * as os from 'os';
import * as path from 'path';

import { installGitAlias, setupOllamaModel} from './setup/gitAlias';
import { statusCheck, getAvailableModels, checkCustomModel } from './ai/ollama';
import { reviewWithOllama, trimDiff } from './ai/review';
import { handleReview } from './git/diff';
import { writeReport } from './report/writer';

// ================== Constants ==================== //

const SCRIPT_DIR = path.join(os.homedir(), '.config', 'revisor');

// ================== Main ==================== //

export async function activate(context: vscode.ExtensionContext): Promise<void> {

    // context.globalState.update('aliasInstalled', undefined); // debug only
    // context.globalState.update('selectedModel', undefined); // debug only

    // Set up environment
    installGitAlias(context);

    // Check if Ollama is installed
    await statusCheck();

    // Get available models from Ollama
    const availableModels = await getAvailableModels();
    if (availableModels.length === 0) {
        vscode.window.showErrorMessage('Revisor: No models available in Ollama. Please pull a model first.');
        return;
    }

    // Check if user has already selected a model
    let selectedModel = context.globalState.get<string>('selectedModel');

    // If no model selected or model not available, show model selection palette
    if (!selectedModel || !availableModels.includes(selectedModel)) {
        const picked = await vscode.window.showQuickPick(availableModels, {
            title: 'Revisor: Select AI Model',
            placeHolder: 'Choose a model for code reviews'
        });

        if (!picked) {
            vscode.window.showErrorMessage('Revisor: No model selected. Extension disabled.');
            return;
        }

        selectedModel = picked;
        await context.globalState.update('selectedModel', selectedModel);
    }

    // Check if custom model exists, if not create it
    const modelExists = await checkCustomModel(selectedModel);
    if (!modelExists) {
        await setupOllamaModel(context, selectedModel);
    }

    // Register command to switch models
    const switchModelCommand = vscode.commands.registerCommand('revisor.switchModel', async () => {
        const newModel = await vscode.window.showQuickPick(availableModels, {
            title: 'Revisor: Select AI Model',
            placeHolder: 'Choose a different model'
        });

        if (newModel && newModel !== selectedModel) {
            selectedModel = newModel;
            await context.globalState.update('selectedModel', selectedModel);
            
            // Check if custom model exists, if not create it
            const newModelExists = await checkCustomModel(newModel);
            if (!newModelExists) {
                await setupOllamaModel(context, newModel);
            }
            
            vscode.window.showInformationMessage(`Revisor: Switched to model '${newModel}'.`);
        }
    });
    context.subscriptions.push(switchModelCommand);

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
            const trimmedDiff = trimDiff(diff);
            const review = await reviewWithOllama(trimmedDiff, localBranch, remote, remoteBranch, selectedModel!);

            // console.log(review);     For debug purposes only

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