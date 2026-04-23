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

    try {
        // Step 1: create the script file first
        fs.mkdirSync(scriptDir, { recursive: true });
        fs.writeFileSync(scriptPath, `#!/bin/bash\ngit fetch "$2" "$3" && git diff "$1" "$2/$3"\n`, { mode: 0o755 });

        // Step 2: write the git alias pointing to it
        execSync(`git config --global alias.revisor "!bash ~/.config/revisor/revisor.sh"`);

        vscode.window.showInformationMessage('Revisor: git alias installed. You can now use git revisor.');
    } catch (error) {
        vscode.window.showErrorMessage(`Revisor: failed to install git alias. ${error}`);
        return; // don't mark as installed if something went wrong
    }

    context.globalState.update('aliasInstalled', true);
}

export function activate(context: vscode.ExtensionContext) {

	console.log('aliasInstalled state:', context.globalState.get('aliasInstalled'));
	
	installGitAlias(context);

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const disposable = vscode.commands.registerCommand('revisor.helloWorld', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from Revisor!');
	});

	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
