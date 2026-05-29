# Obsidian Zotero ABNT

An Obsidian plugin to fetch and display Zotero references in **ABNT (NBR 6023)** format. It provides a dedicated sidebar to view references used in your current note, features citekey autocompletion, and smart navigation between your text and bibliographic notes.

## 🚀 Features

- **ABNT NBR 6023 Formatting**: Automatically fetches correctly formatted references from Zotero (via Better BibTeX).
- **Interactive Sidebar**: A dedicated view showing all references found in your active note.
- **Click-to-Jump**: Click any reference in the sidebar to scroll the editor directly to that citation.
- **Smart Link Navigation**: 
    - **Editor Mode**: `Alt + Click` on a `@citekey` to open its bibliographic note in a **new tab**.
    - **Reading Mode**: Citekeys become clickable links that open the corresponding note.
- **Citekey Autocomplete**: Type `@` to see suggestions based on bibliographic notes already in your vault.
- **Rich Text Export**: A command to copy all formatted references to the clipboard, preserving **bold** and *italic* formatting for use in Word, Google Docs, or Obsidian.

## 🛠️ Requirements

1. **Zotero** must be open.
2. **[Better BibTeX (BBT)](https://retorque.re/zotero-better-bibtex/)** plugin installed in Zotero.
3. The **ABNT CSL Style** must be installed in Zotero:
    - Go to Zotero → Preferences → Cite → Styles.
    - Click "Get additional styles" and search for `Associação Brasileira de Normas Técnicas`.
    - Install the version you prefer (usually "Associação Brasileira de Normas Técnicas (Português - Brasil)").

## 📥 Installation

### Via BRAT (Recommended for Beta)
1. Install the **[BRAT](https://github.com/TfTHacker/obsidian42-brat)** plugin from the Obsidian Community Plugins.
2. Open the Command Palette and run `BRAT: Add a beta plugin for testing`.
3. Paste this repository URL: `https://github.com/andrekv/obsidian-zotero-abnt`
4. Click `Add Plugin`.

### Manual
1. Download `main.js`, `manifest.json`, and `styles.css` from the latest release.
2. Create a folder `zotero-abnt-references` in your vault's `.obsidian/plugins/` directory.
3. Move the downloaded files into that folder.
4. Enable the plugin in Obsidian settings.

## ⌨️ Commands

- **Copy all references (ABNT format)**: Copies the bibliography of the active note to the clipboard with full formatting.

## 📜 License

This project is licensed under the **GNU Affero General Public License v3.0 (AGPL-3.0)**.
