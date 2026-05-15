// ================== Imports ==================== //

import * as vscode from 'vscode';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';


// ================== Constants ==================== //

const SCRIPT_DIR = path.join(os.homedir(), '.config', 'revisor');
const ARGS_PATH = path.join(SCRIPT_DIR, 'pending-args.txt');
const MOCK_DIFF_PATH = path.join(SCRIPT_DIR, 'mock-diff.txt');

// ================== Functions ==================== //
    export const handleReview = async (): Promise<{ diff: string; remote: string; localBranch: string; remoteBranch: string } | undefined> => {

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
/*
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

        return {diff, remote, localBranch, remoteBranch}; */

        // 3. THE MOCK BYPASS: Read from the .txt file instead of executing Git
    let diff: string;
    try {
        if (!fs.existsSync(MOCK_DIFF_PATH)) {
            // Create a dummy file if it doesn't exist
            fs.writeFileSync(MOCK_DIFF_PATH, "PASTE YOUR TEST DIFF HERE");
            vscode.window.showWarningMessage(`Revisor: Created empty ${MOCK_DIFF_PATH}. Please add content to it.`);
            return;
        }

        diff = fs.readFileSync(MOCK_DIFF_PATH, 'utf8');
        console.log('--- MOCK MODE: Reading diff from file instead of Git ---');
    } catch (error) {
        vscode.window.showErrorMessage(`Revisor: Failed to read mock-diff.txt. ${error}`);
        return;
    }

    if (!diff.trim() || diff === "PASTE YOUR TEST DIFF HERE") {
        vscode.window.showInformationMessage('Revisor: Mock diff is empty.');
        return;
    }

    return { diff, remote, localBranch, remoteBranch };
    };