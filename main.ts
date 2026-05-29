import { App, ItemView, Plugin, WorkspaceLeaf, debounce, Notice, MarkdownView, Editor, EditorSuggest, EditorSuggestContext, EditorPosition, EditorSuggestTriggerInfo, TFile, MarkdownPostProcessorContext } from "obsidian";
import * as http from "http";

// ─── Constants ────────────────────────────────────────────────────────────────

const VIEW_TYPE_ABNT = "zotero-abnt-references";

// Matches @citekey in any Pandoc-style context: [@key], [@key1; @key2], @key
const CITEKEY_REGEX = /@([\w:_-]+)/g;

const BBT_HOSTNAME = "127.0.0.1";
const BBT_PORT = 23119;
const BBT_PATH = "/better-bibtex/json-rpc";

// Official Zotero style ID for ABNT
const ABNT_STYLE_ID = "associacao-brasileira-de-normas-tecnicas";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReferenceResult {
  citekey: string;
  reference: string;
  error?: string;
}

// ─── Utility: Node.js HTTP Request ───────────────────────────────────────────

function bbtRequest(body: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const bodyBuffer = Buffer.from(body, "utf-8");

    const req = http.request(
      {
        hostname: BBT_HOSTNAME,
        port: BBT_PORT,
        path: BBT_PATH,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": bodyBuffer.length,
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
        res.on("error", reject);
      }
    );

    req.on("error", reject);
    req.write(bodyBuffer);
    req.end();
  });
}

// ─── Sidebar View ─────────────────────────────────────────────────────────────

class ABNTView extends ItemView {
  results: ReferenceResult[] = [];

  constructor(leaf: WorkspaceLeaf) {
    super(leaf);
  }

  getViewType(): string { return VIEW_TYPE_ABNT; }
  getDisplayText(): string { return "Referências ABNT"; }
  getIcon(): string { return "book-open"; }

  async onOpen(): Promise<void> { this.renderIdle(); }
  async onClose(): Promise<void> {}

  renderIdle(): void {
    const el = this.containerEl.children[1] as HTMLElement;
    el.empty();
    el.addClass("abnt-container");
    el.createEl("div", { cls: "abnt-empty", text: "Abra uma nota com referências." });
  }

  setLoading(): void {
    const el = this.containerEl.children[1] as HTMLElement;
    el.empty();
    el.addClass("abnt-container");
    el.createEl("div", { cls: "abnt-empty", text: "Buscando referências no Zotero…" });
  }

  setError(msg: string): void {
    const el = this.containerEl.children[1] as HTMLElement;
    el.empty();
    el.addClass("abnt-container");
    el.createEl("div", { cls: "abnt-missing", text: `Erro: ${msg}` });
    el.createEl("p", { 
      cls: "abnt-empty", 
      text: "Certifique-se que o Zotero está aberto e o Better BibTeX instalado."
    });
  }

  setResults(results: ReferenceResult[]): void {
    this.results = results;
    this.render();
  }

  render(): void {
    const el = this.containerEl.children[1] as HTMLElement;
    el.empty();
    el.addClass("abnt-container");

    if (this.results.length === 0) {
      el.createEl("div", { cls: "abnt-empty", text: "Nenhuma referência encontrada nesta nota." });
      return;
    }

    el.createEl("div", {
      cls: "abnt-header",
      text: "References",
    });

    const list = el.createEl("div", { cls: "abnt-list" });

    this.results.forEach((res, index) => {
      const item = list.createEl("div", {
        cls: "abnt-item" + (res.error ? " abnt-error" : ""),
      });
      
      if (res.error) {
        item.createEl("span", {
          cls: "abnt-missing",
          text: `[${index + 1}] — @${res.citekey}: ${res.error}`,
        });
      } else {
        let html = res.reference
          .replace(/<span class="Z3988".*?><\/span>/g, "")
          .replace(/<div class="csl-bib-body".*?>/g, "")
          .replace(/<div class="csl-entry">/g, "")
          .replace(/<\/div>/g, "");

        const p = item.createEl("p", { cls: "abnt-reference" });
        p.innerHTML = `<small style="color: var(--text-faint); margin-right: 4px;">[${index + 1}]</small> ` + html.trim();

        item.style.cursor = "pointer";
        item.addEventListener("click", () => {
          this.navigateToCitekey(res.citekey);
        });
      }
    });
  }

  private async navigateToCitekey(citekey: string) {
    const { workspace } = this.app;
    
    // Find the current active leaf or one showing the active file
    const activeFile = workspace.getActiveFile();
    if (!activeFile) return;

    let leaf = workspace.getLeavesOfType("markdown").find(l => (l.view as MarkdownView).file?.path === activeFile.path);
    
    if (leaf && leaf.view instanceof MarkdownView) {
        workspace.setActiveLeaf(leaf, { focus: true });
        
        // If in Reading Mode, switch to Source/Live Preview first to allow jump
        const state = leaf.getViewState();
        if (state.state?.mode === "preview") {
            state.state.mode = "source";
            await leaf.setViewState(state);
            // Give it a tiny moment to switch
            await new Promise(r => setTimeout(r, 100));
        }

        const editor = leaf.view.editor;
        const content = editor.getValue();
        const pattern = new RegExp(`@${citekey}`, "g");
        const match = pattern.exec(content);

        if (match) {
            const pos = editor.offsetToPos(match.index);
            editor.setCursor(pos);
            editor.scrollIntoView({ from: pos, to: pos }, true);
        } else {
            new Notice(`Citekey @${citekey} não encontrada no texto.`);
        }
    }
  }
}

// ─── Citekey Autocomplete ───────────────────────────────────────────────────

class CitekeySuggest extends EditorSuggest<string> {
  plugin: ZoteroABNTPlugin;

  constructor(app: App, plugin: ZoteroABNTPlugin) {
    super(app);
    this.plugin = plugin;
  }

  onTrigger(cursor: EditorPosition, editor: Editor, file: TFile): EditorSuggestTriggerInfo | null {
    const line = editor.getLine(cursor.line);
    const sub = line.substring(0, cursor.ch);
    const match = sub.match(/@([\w:_-]*)$/);

    if (match) {
      return {
        start: { line: cursor.line, ch: match.index! },
        end: cursor,
        query: match[1]
      };
    }
    return null;
  }

  getSuggestions(context: EditorSuggestContext): string[] {
    const query = context.query.toLowerCase();
    const citekeys: string[] = [];
    const files = this.app.vault.getMarkdownFiles();
    
    for (const file of files) {
      const cache = this.app.metadataCache.getFileCache(file);
      const fileCitekey = cache?.frontmatter?.citekey;
      if (fileCitekey) {
          const keys = Array.isArray(fileCitekey) ? fileCitekey.map(String) : [String(fileCitekey)];
          keys.forEach(k => {
              // Sanitize: remove [@...] if present
              const clean = k.replace(/[\[\]@]/g, "");
              citekeys.push(clean);
          });
      }
    }

    const uniqueKeys = [...new Set(citekeys)];
    return uniqueKeys
      .filter(k => k.toLowerCase().includes(query))
      .sort()
      .slice(0, 10);
  }

  renderSuggestion(value: string, el: HTMLElement): void {
    el.createEl("div", { text: `@${value}` });
  }

  selectSuggestion(value: string, evt: MouseEvent | KeyboardEvent): void {
    if (this.context) {
      const { editor, start, end } = this.context;
      editor.replaceRange(`@${value}`, start, end);
    }
  }
}

// ─── Main Plugin ──────────────────────────────────────────────────────────────

export default class ZoteroABNTPlugin extends Plugin {
  private debouncedUpdate!: () => void;

  async onload(): Promise<void> {
    this.registerView(VIEW_TYPE_ABNT, (leaf) => new ABNTView(leaf));
    this.registerEditorSuggest(new CitekeySuggest(this.app, this));

    this.addRibbonIcon("book-open", "Referências ABNT (Zotero)", () => {
      this.activateView();
    });

    this.addCommand({
      id: "copy-abnt-references",
      name: "Copy all references (ABNT format)",
      callback: async () => {
        const view = this.getView();
        if (!view || view.results.length === 0) {
          new Notice("Nenhuma referência para copiar.");
          return;
        }

        const cleanResults = view.results.filter(r => !r.error);
        const plainText = cleanResults
          .map(r => r.reference.replace(/<.*?>/g, "").trim())
          .join("\n\n");

        const htmlText = cleanResults
          .map(r => `<div>${r.reference}</div>`)
          .join("<br>");

        try {
            const clipboardItem = new (window as any).ClipboardItem({
                "text/plain": new Blob([plainText], { type: "text/plain" }),
                "text/html": new Blob([htmlText], { type: "text/html" })
            });
            await navigator.clipboard.write([clipboardItem]);
            new Notice(`${cleanResults.length} referências copiadas com formatação!`);
        } catch (err) {
            await navigator.clipboard.writeText(plainText);
            new Notice(`${cleanResults.length} referências copiadas (apenas texto).`);
        }
      }
    });

    // SMART LINK: Markdown Post Processor for Reading Mode
    this.registerMarkdownPostProcessor((el, ctx) => {
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        const nodesToReplace: { textNode: Text, span: HTMLElement }[] = [];
        
        let node;
        while (node = walker.nextNode()) {
            const text = node.textContent;
            if (text && /@([\w:_-]+)/.test(text)) {
                const span = document.createElement("span");
                span.innerHTML = text.replace(/@([\w:_-]+)/g, (match, citekey) => {
                    return `<span class="abnt-citekey-link" data-citekey="${citekey}" style="color: var(--text-accent); cursor: pointer; text-decoration: underline;">${match}</span>`;
                });
                nodesToReplace.push({ textNode: node as Text, span });
            }
        }

        nodesToReplace.forEach(({ textNode, span }) => {
            textNode.replaceWith(span);
            span.querySelectorAll(".abnt-citekey-link").forEach(link => {
                link.addEventListener("click", (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const key = (link as HTMLElement).dataset.citekey;
                    if (key) this.openCitekeyFile(key);
                });
            });
        });
    });

    // SMART LINK: Editor Click Handler (Alt + Click)
    this.registerDomEvent(document, "click", (evt: MouseEvent) => {
        if (!evt.altKey) return;
        
        // This logic is a bit broad, but helps catch Alt+Click on text
        const selection = window.getSelection()?.toString().trim();
        // Match @citekey or just citekey if the user selects without @
        if (selection) {
            const cleanKey = selection.startsWith("@") ? selection.substring(1) : selection;
            // Only attempt if it looks like a citekey (alphanumeric/colons)
            if (/^[\w:_-]+$/.test(cleanKey)) {
                this.openCitekeyFile(cleanKey);
            }
        }
    }, true);

    this.debouncedUpdate = debounce(
      () => this.updateReferences(),
      1000,
      true
    );

    this.registerEvent(
      this.app.workspace.on("file-open", () => this.updateReferences())
    );
    this.registerEvent(
      this.app.workspace.on("editor-change", () => this.debouncedUpdate())
    );

    this.app.workspace.onLayoutReady(async () => {
      await this.updateReferences();
    });
  }

  async onunload(): Promise<void> {
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_ABNT);
  }

  private async openCitekeyFile(citekey: string) {
    const files = this.app.vault.getMarkdownFiles();
    console.log(`[ABNT] Searching for citekey: ${citekey}`);
    
    for (const file of files) {
        const cache = this.app.metadataCache.getFileCache(file);
        const fileCitekey = cache?.frontmatter?.citekey;
        
        if (fileCitekey) {
            const keys = Array.isArray(fileCitekey) ? fileCitekey.map(String) : [String(fileCitekey)];
            // Sanitize frontmatter keys: remove [@...], brackets, quotes
            const cleanKeys = keys.map(k => k.replace(/[\[\]"@]/g, "").trim());
            
            if (cleanKeys.includes(citekey)) {
                console.log(`[ABNT] Found matching file: ${file.path}`);
                // Open in a new tab (leaf)
                await this.app.workspace.getLeaf("tab").openFile(file);
                return;
            }
        }
    }
    new Notice(`Nota para @${citekey} não encontrada no vault.`);
  }

  private getView(): ABNTView | null {
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_ABNT);
    if (leaves.length > 0 && leaves[0].view instanceof ABNTView) {
      return leaves[0].view;
    }
    return null;
  }

  async activateView(): Promise<void> {
    const { workspace } = this.app;
    let leaf = workspace.getLeavesOfType(VIEW_TYPE_ABNT)[0];
    if (!leaf) {
      const newLeaf = workspace.getRightLeaf(false);
      if (!newLeaf) return;
      await newLeaf.setViewState({ type: VIEW_TYPE_ABNT, active: true });
      leaf = newLeaf;
    }
    workspace.revealLeaf(leaf);
  }

  async updateReferences(): Promise<void> {
    const view = this.getView();
    if (!view) return;

    const file = this.app.workspace.getActiveFile();
    if (!file || file.extension !== "md") {
      view.renderIdle();
      return;
    }

    const content = await this.app.vault.read(file);
    const citekeys = this.extractCitekeys(content);

    if (citekeys.length === 0) {
      view.setResults([]);
      return;
    }

    view.setLoading();

    try {
      const rawResponse = await bbtRequest(
        JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "item.bibliography",
          params: [citekeys, { id: ABNT_STYLE_ID, contentType: "html" }]
        })
      );

      const data = JSON.parse(rawResponse);

      if (data.error) {
        const results = await Promise.all(citekeys.map(key => this.fetchSingleReference(key)));
        view.setResults(results);
        return;
      }

      const results = await Promise.all(citekeys.map(key => this.fetchSingleReference(key)));
      view.setResults(results);

    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      console.error("[ABNT] Connection failed:", e);
      view.setError(`Falha na conexão: ${errorMsg}`);
    }
  }

  private async fetchSingleReference(citekey: string): Promise<ReferenceResult> {
    try {
      const rawResponse = await bbtRequest(
        JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "item.bibliography",
          params: [[citekey], { id: ABNT_STYLE_ID, contentType: "html" }]
        })
      );

      const data = JSON.parse(rawResponse);
      if (data.error) {
        return { citekey, reference: "", error: data.error.message };
      }
      return { citekey, reference: (data.result || "").trim(), error: undefined };
    } catch (e) {
      return { citekey, reference: "", error: "Erro de conexão" };
    }
  }

  private extractCitekeys(content: string): string[] {
    const matches = [...content.matchAll(CITEKEY_REGEX)];
    const keys = matches.map((m) => m[1]);
    return [...new Set(keys)];
  }
}
