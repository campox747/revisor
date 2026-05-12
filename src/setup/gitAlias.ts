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