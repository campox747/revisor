// ================== Imports ==================== //

import * as vscode from 'vscode';
import * as os from 'os';
import * as path from 'path';


// ================== Constants ==================== //

const SCRIPT_DIR = path.join(os.homedir(), '.config', 'revisor');
const ollamaUrl = 'http://localhost:11434';


// ================== Functions ==================== //

export async function checkOllama(): Promise<boolean> {
    try {
        const res = await fetch(ollamaUrl);
        return res.ok;
    } catch {
        return false;
    }
}

export async function statusCheck(): Promise<void> {
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

export async function checkModel(model: string): Promise<boolean> {
    try {
        const res = await fetch('http://localhost:11434/api/tags');
        const data = await res.json() as { models: { name: string }[] };
        return data.models.some(m => m.name.startsWith(model));
    } catch {
        return false;
    }
}

export async function modelCheck(): Promise<void> {
    if (!await checkModel('revisor-model')) {
        const action = await vscode.window.showErrorMessage(
            'Revisor: revisor model not found. Please restart the extension.',
            'Dismiss'
        );
    return;
    }
}
