# Revisor - Your local AI-powered commit reviewer

Revisor is a local, privacy-first AI assistant that helps developers understand incoming commits before merging them. Controlled directly from your terminal with a single command, Revisor fetches the latest remote changes, analyzes the diff against your local branch, and runs it through a local AI model to generate a structured review. The final report is displayed instantly inside VS Code as a side-by-side Markdown document.


## Features

* **Terminal-Driven Workflow:** Trigger code reviews straight from your regular terminal flow using a native Git alias.
* **100% Local & Private:** Your source code never leaves your machine. All analysis is performed entirely on your local hardware.
* **Smart Pre-Merge Sight:** Automatically executes a clean `git fetch` background pipeline to see what has changed on the remote branch without polluting your current working state.
* **Rich Markdown Reports:** Displays an interactive, clean review panel highlighting summaries, breaking changes, and structural risks.

## How It Works

Once installed, Revisor injects a lightweight global script wrapper into your Git config. 

When you run `git revisor`, the extension uses a local file-bridge pipeline (`pending-args.txt`) to securely pass environment metrics from your shell directly to the VS Code Extension Host, circumventing traditional CLI-to-editor limitations.

## Requirements

Revisor relies on Git and a local AI engine to guarantee complete data security. 

1. **Install Ollama:** Download and run [Ollama](https://ollama.com) on your machine.
2. **Pull a Coding Model:** Open your terminal and download a model optimized for code intelligence. Depending on your machine's hardware, we recommend:
   * **For lightweight setups (8GB RAM):** `ollama pull qwen2.5-coder:1.5b`
   * **For standard developer setups (16GB+ RAM):** `ollama pull qwen2.5-coder:7b` or `deepseek-coder-v2:lite` (6GB+ VRAM)
   * **For high-performance rigs:** `ollama pull llama3:8b`

## Usage

Open your terminal in any active Git repository and type:

```bash
git revisor <remote> <localBranch> <remoteBranch>

```

## Known Issues

None

## Release Notes

Users appreciate release notes as you update your extension.

### 1.0.0

Initial release of Revisor

---

Thank you for choosing Revisor!

