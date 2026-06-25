# Obsidian Zotero ABNT

Display Zotero references in ABNT (NBR 6023) format with a dedicated sidebar, citekey autocomplete, and smart editor navigation.

## Features
- **ABNT Formatting:** Automatically fetches correctly formatted references from Zotero via Better BibTeX.
- **Interactive Sidebar:** Dedicated view to see all references found in your current note.
- **Auto-Refresh & Manual Refresh:** References update automatically when the sidebar is opened, with a manual refresh command available via the palette.
- **Click-to-Jump:** Click a reference in the sidebar to scroll directly to its location in the editor.
- **Smart Links:** `Alt + Click` on any `@citekey` to open its bibliographic note in a new tab.
- **Citekey Autocomplete:** Scan your vault for bibliographic notes and suggest citekeys as you type `@`.
- **Clean Rich Text Copy:** Command to copy formatted references (preserving bold/italic) to the clipboard, automatically sanitized to a clean, one-per-line ABNT list.

## Installation

### From GitHub (Manual)
1. Download the latest release from the [Releases](https://github.com/andrekv/obsidian-zotero-abnt/releases) page.
2. Extract the `zip` file into your vault's `.obsidian/plugins/obsidian-zotero-abnt` folder.
3. Reload Obsidian and enable the plugin in Settings > Community Plugins.

### Using BRAT
1. Install the [BRAT plugin](https://github.com/TfTHacker/obsidian42-brat).
2. Go to BRAT settings and click "Add Beta plugin".
3. Paste this URL: `https://github.com/andrekv/obsidian-zotero-abnt`.

## Requirements
- **Zotero** with the **Better BibTeX** plugin installed.
- **ABNT CSL Style** installed in Zotero.

## Development
Built with TypeScript and the Obsidian API.

```bash
# Install dependencies
npm install

# Build the plugin
npm run build
```

## License
AGPL-3.0
