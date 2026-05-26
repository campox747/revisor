// ================== Imports ==================== //

import * as vscode from 'vscode';
import * as os from 'os';
import * as path from 'path';


// ================== Constants ==================== //

const SCRIPT_DIR = path.join(os.homedir(), '.config', 'revisor');
const OLLAMA_URL = 'http://localhost:11434';

// ================== Functions ==================== //

export async function checkOllama(): Promise<boolean> {
    try {
        const res = await fetch(OLLAMA_URL);
        return res.ok;
    } catch {
        return false;
    }
}

// Now returns boolean so activate() can react to it
export async function statusCheck(): Promise<boolean> {
    if (!await checkOllama()) {
        const action = await vscode.window.showErrorMessage(
            'Revisor: Ollama is not running. Please install Ollama and run "ollama serve" before using Revisor.',
            'Install Ollama',
            'Dismiss'
        );
        if (action === 'Install Ollama') {
            vscode.env.openExternal(vscode.Uri.parse('https://ollama.com'));
        }
        return false;
    }
    return true;
}

export async function checkModel(model: string): Promise<boolean> {
    try {
        const res = await fetch(`${OLLAMA_URL}/api/tags`);
        const data = await res.json() as { models: { name: string }[] };
        return data.models.some(m => m.name.startsWith(model));
    } catch {
        return false;
    }
}

export async function getAvailableModels(): Promise<string[]> {
    try {
        const res = await fetch(`${OLLAMA_URL}/api/tags`);
        const data = await res.json() as { models: { name: string }[] };
        return data.models
            .map(m => m.name)
            .filter(name => !name.startsWith('revisor-model-'))
            .sort();
    } catch {
        return [];
    }
}

export async function checkCustomModel(baseModelName: string): Promise<boolean> {
    try {
        const customModelName = `revisor-model-${baseModelName}`;
        const res = await fetch(`${OLLAMA_URL}/api/tags`);
        const data = await res.json() as { models: { name: string }[] };
        return data.models.some(m => m.name === customModelName);
    } catch {
        return false;
    }
}