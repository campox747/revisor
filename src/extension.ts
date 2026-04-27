// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

function installGitAlias(context: vscode.ExtensionContext) {

    const hasInstalled = context.globalState.get('aliasInstalled');
    if (hasInstalled) return;

    const scriptDir = path.join(os.homedir(), '.config', 'revisor');
    const scriptPath = path.join(scriptDir, 'revisor.sh');
    const argsPath = path.join(scriptDir, 'pending-args.txt');

    // Convert Windows path to Git Bash compatible path
    const bashScriptPath = scriptPath.replace(/\\/g, '/').replace(/^([A-Z]):/, (_, d) => `/${d.toLowerCase()}`);
    const bashArgsPath = argsPath.replace(/\\/g, '/').replace(/^([A-Z]):/, (_, d) => `/${d.toLowerCase()}`);

    try {
        fs.mkdirSync(scriptDir, { recursive: true });
        fs.writeFileSync(scriptPath,
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

export function activate(context: vscode.ExtensionContext) {

    // For test and debug purposes
    context.globalState.update('aliasInstalled', undefined);

    installGitAlias(context);

    const argsPath = path.join(os.homedir(), '.config', 'revisor', 'pending-args.txt');

    // Watch for the args file being written by revisor.sh
    const watcher = vscode.workspace.createFileSystemWatcher(
        new vscode.RelativePattern(
            vscode.Uri.file(path.join(os.homedir(), '.config', 'revisor')),
            'pending-args.txt'
        )
    );

    const handleReview = async () => {

        // Check workspace first — everything else depends on it
        const workspaceRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath;

        console.log(workspaceRoot);
        if (!workspaceRoot) {
            vscode.window.showErrorMessage('Revisor: please open a project folder in VSCode before running git revisor.');
            return;
        }

        // Step 1: read the args
        let localBranch: string, remote: string, remoteBranch: string;
        try {
            const args = fs.readFileSync(argsPath, 'utf8').trim().split(' ');
            if (args.length !== 3) {
                vscode.window.showErrorMessage('Revisor: invalid arguments in pending-args.txt');
                return;
            }
            [remote, localBranch, remoteBranch] = args;
        } catch {
            vscode.window.showErrorMessage('Revisor: could not read pending-args.txt');
            return;
        }

        // Step 2: git fetch + diff, both using workspaceRoot as cwd
        let diff: string;
        try {
            execSync(`git fetch ${remote} ${remoteBranch}`, { 
                cwd: workspaceRoot, 
                stdio: ['ignore', 'pipe', 'ignore'] // ignore stdin, pipe stdout, ignore stderr
            });

            const diff = execSync(`git diff ${localBranch} ${remote}/${remoteBranch}`, { 
                cwd: workspaceRoot
            }).toString();

            console.log(diff);
            
        } catch (error) {
            vscode.window.showErrorMessage(`Revisor: git command failed.`);
            console.error(error);
        }
    };
    // Fire on both create and change to cover first run and subsequent runs
    watcher.onDidCreate(handleReview);
    watcher.onDidChange(handleReview);

    context.subscriptions.push(watcher);
}
// This method is called when your extension is deactivated
export function deactivate() {}
