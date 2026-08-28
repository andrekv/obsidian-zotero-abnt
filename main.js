var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// main.ts
var main_exports = {};
__export(main_exports, {
  default: () => ZoteroABNTPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian = require("obsidian");
var http = __toESM(require("http"));
var VIEW_TYPE_ABNT = "zotero-abnt-references";
var CITEKEY_REGEX = /\[@([\w:_-]+)\]/g;
var BBT_HOSTNAME = "127.0.0.1";
var BBT_PORT = 23119;
var BBT_PATH = "/better-bibtex/json-rpc";
var ABNT_STYLE_ID = "associacao-brasileira-de-normas-tecnicas";
function bbtRequest(body) {
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
          "Content-Length": bodyBuffer.length
        }
      },
      (res) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
        res.on("error", reject);
      }
    );
    req.on("error", reject);
    req.write(bodyBuffer);
    req.end();
  });
}
var ABNTView = class extends import_obsidian.ItemView {
  constructor(leaf) {
    super(leaf);
    this.results = [];
  }
  getViewType() {
    return VIEW_TYPE_ABNT;
  }
  getDisplayText() {
    return "Refer\xEAncias ABNT";
  }
  getIcon() {
    return "book-open";
  }
  async onOpen() {
    this.renderIdle();
  }
  async onClose() {
  }
  renderIdle() {
    const el = this.contentEl;
    el.empty();
    el.addClass("abnt-container");
    el.createEl("div", { cls: "abnt-empty", text: "Abra uma nota com refer\xEAncias." });
  }
  setLoading() {
    const el = this.contentEl;
    el.empty();
    el.createEl("div", { cls: "abnt-empty", text: "Buscando refer\xEAncias no Zotero\u2026" });
  }
  setError(msg) {
    const el = this.contentEl;
    el.empty();
    el.createEl("div", { cls: "abnt-missing", text: `Erro: ${msg}` });
    el.createEl("p", {
      cls: "abnt-empty",
      text: "Certifique-se que o Zotero est\xE1 aberto e o Better BibTeX instalado."
    });
  }
  setResults(results) {
    this.results = results;
    this.render();
  }
  render() {
    const el = this.contentEl;
    el.empty();
    el.addClass("abnt-container");
    if (this.results.length === 0) {
      el.createEl("div", { cls: "abnt-empty", text: "Nenhuma refer\xEAncia encontrada nesta nota." });
      return;
    }
    const list = el.createEl("div", { cls: "abnt-list" });
    this.results.forEach((res, index) => {
      const item = list.createEl("div", {
        cls: "abnt-item" + (res.error ? " abnt-error" : "")
      });
      if (res.error) {
        item.createEl("span", {
          cls: "abnt-missing",
          text: `[${index + 1}] \u2014 @${res.citekey}: ${res.error}`
        });
      } else {
        let html = res.reference.replace(/<span class="Z3988".*?><\/span>/g, "").replace(/<div class="csl-bib-body".*?>/g, "").replace(/<div class="csl-entry">/g, "").replace(/<\/div>/g, "");
        const p = item.createEl("p", { cls: "abnt-reference" });
        p.innerHTML = `<small style="color: var(--text-faint); margin-right: 4px;">[${index + 1}]</small> ` + html.trim();
        item.style.cursor = "pointer";
        item.addEventListener("click", () => {
          this.navigateToCitekey(res.citekey);
        });
        item.addEventListener("contextmenu", async (e) => {
          e.preventDefault();
          const rawRef = res.reference;
          const plainText = rawRef.replace(/<.*?>/g, "").replace(/\s+/g, " ").trim();
          const htmlText = `<div>${rawRef.replace(/\s+/g, " ").trim()}</div>`;
          try {
            const clipboardItem = new window.ClipboardItem({
              "text/plain": new Blob([plainText], { type: "text/plain" }),
              "text/html": new Blob([htmlText], { type: "text/html" })
            });
            await navigator.clipboard.write([clipboardItem]);
            new import_obsidian.Notice("Refer\xEAncia copiada!");
          } catch (err) {
            await navigator.clipboard.writeText(plainText);
            new import_obsidian.Notice("Refer\xEAncia copiada!");
          }
        });
      }
    });
  }
  async navigateToCitekey(citekey) {
    var _a;
    const { workspace } = this.app;
    const activeFile = workspace.getActiveFile();
    if (!activeFile)
      return;
    let leaf = workspace.getLeavesOfType("markdown").find((l) => {
      var _a2;
      return ((_a2 = l.view.file) == null ? void 0 : _a2.path) === activeFile.path;
    });
    if (leaf && leaf.view instanceof import_obsidian.MarkdownView) {
      workspace.setActiveLeaf(leaf, { focus: true });
      const state = leaf.getViewState();
      if (((_a = state.state) == null ? void 0 : _a.mode) === "preview") {
        state.state.mode = "source";
        await leaf.setViewState(state);
        await new Promise((r) => setTimeout(r, 100));
      }
      const editor = leaf.view.editor;
      const content = editor.getValue();
      let pattern = new RegExp(`\\[@${citekey}\\]`, "g");
      let match = pattern.exec(content);
      if (!match) {
        pattern = new RegExp(`@${citekey}`, "g");
        match = pattern.exec(content);
      }
      if (match) {
        const pos = editor.offsetToPos(match.index);
        editor.setCursor(pos);
        editor.scrollIntoView({ from: pos, to: pos }, true);
      } else {
        new import_obsidian.Notice(`Citekey @${citekey} n\xE3o encontrada no texto.`);
      }
    }
  }
};
var CitekeySuggest = class extends import_obsidian.EditorSuggest {
  constructor(app, plugin) {
    super(app);
    this.plugin = plugin;
  }
  onTrigger(cursor, editor, file) {
    const line = editor.getLine(cursor.line);
    const sub = line.substring(0, cursor.ch);
    const match = sub.match(/\[@([\w:_-]*)$/);
    if (match) {
      return {
        start: { line: cursor.line, ch: match.index },
        end: cursor,
        query: match[1]
      };
    }
    return null;
  }
  getSuggestions(context) {
    var _a;
    const query = context.query.toLowerCase();
    const citekeys = [];
    const files = this.app.vault.getMarkdownFiles();
    for (const file of files) {
      const cache = this.app.metadataCache.getFileCache(file);
      const fileCitekey = (_a = cache == null ? void 0 : cache.frontmatter) == null ? void 0 : _a.citekey;
      if (fileCitekey) {
        const keys = Array.isArray(fileCitekey) ? fileCitekey.map(String) : [String(fileCitekey)];
        keys.forEach((k) => {
          const clean = k.replace(/[\[\]@]/g, "");
          citekeys.push(clean);
        });
      }
    }
    const uniqueKeys = [...new Set(citekeys)];
    return uniqueKeys.filter((k) => k.toLowerCase().includes(query)).sort().slice(0, 10);
  }
  renderSuggestion(value, el) {
    el.createEl("div", { text: `[@${value}]` });
  }
  selectSuggestion(value, evt) {
    if (this.context) {
      const { editor, start, end } = this.context;
      editor.replaceRange(`[@${value}]`, start, end);
    }
  }
};
var ZoteroABNTPlugin = class extends import_obsidian.Plugin {
  constructor() {
    super(...arguments);
    this.referenceCache = /* @__PURE__ */ new Map();
  }
  async onload() {
    this.registerView(VIEW_TYPE_ABNT, (leaf) => new ABNTView(leaf));
    this.registerEditorSuggest(new CitekeySuggest(this.app, this));
    this.injectStyles();
    this.addRibbonIcon("book-open", "Refer\xEAncias ABNT (Zotero)", () => {
      this.activateView();
    });
    this.addCommand({
      id: "open-abnt-view",
      name: "Open ABNT References View",
      callback: () => this.activateView()
    });
    this.addCommand({
      id: "refresh-abnt-references",
      name: "Refresh references",
      callback: () => this.updateReferences()
    });
    this.addCommand({
      id: "copy-abnt-references",
      name: "Copy all references (ABNT format)",
      callback: async () => {
        const view = this.getView();
        if (!view || view.results.length === 0) {
          new import_obsidian.Notice("Nenhuma refer\xEAncia para copiar.");
          return;
        }
        const cleanResults = view.results.filter((r) => !r.error);
        const plainText = cleanResults.map(
          (r) => r.reference.replace(/<.*?>/g, "").replace(/\s+/g, " ").trim()
        ).join("\n");
        const htmlText = cleanResults.map((r) => `<div>${r.reference.replace(/\s+/g, " ").trim()}</div>`).join("");
        try {
          const clipboardItem = new window.ClipboardItem({
            "text/plain": new Blob([plainText], { type: "text/plain" }),
            "text/html": new Blob([htmlText], { type: "text/html" })
          });
          await navigator.clipboard.write([clipboardItem]);
          new import_obsidian.Notice(`${cleanResults.length} refer\xEAncias copiadas com formata\xE7\xE3o!`);
        } catch (err) {
          await navigator.clipboard.writeText(plainText);
          new import_obsidian.Notice(`${cleanResults.length} refer\xEAncias copiadas (apenas texto).`);
        }
      }
    });
    this.registerMarkdownPostProcessor((el, ctx) => {
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      const nodesToReplace = [];
      let node;
      while (node = walker.nextNode()) {
        const text = node.textContent;
        if (text && /\[@([\w:_-]+)\]/.test(text)) {
          const span = document.createElement("span");
          span.innerHTML = text.replace(/\[@([\w:_-]+)\]/g, (match, citekey) => {
            return `<span class="abnt-citekey-link" data-citekey="${citekey}" style="color: var(--text-accent); cursor: pointer; text-decoration: underline;">${match}</span>`;
          });
          nodesToReplace.push({ textNode: node, span });
        }
      }
      nodesToReplace.forEach(({ textNode, span }) => {
        textNode.replaceWith(span);
        span.querySelectorAll(".abnt-citekey-link").forEach((link) => {
          link.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            const key = link.dataset.citekey;
            if (key)
              this.openCitekeyFile(key);
          });
        });
      });
    });
    this.registerDomEvent(document, "click", (evt) => {
      var _a;
      if (!evt.altKey)
        return;
      const target = evt.target;
      if (!target.closest(".markdown-source-view, .markdown-reading-view"))
        return;
      const selection = (_a = window.getSelection()) == null ? void 0 : _a.toString().trim();
      if (selection) {
        const cleanKey = selection.startsWith("@") ? selection.substring(1) : selection;
        if (/^[\w:_-]+$/.test(cleanKey)) {
          this.openCitekeyFile(cleanKey);
        }
      }
    }, true);
    this.debouncedUpdate = (0, import_obsidian.debounce)(() => this.updateReferences(), 1500, true);
    this.registerEvent(this.app.workspace.on("file-open", () => this.updateReferences()));
    this.registerEvent(this.app.workspace.on("editor-change", () => this.debouncedUpdate()));
    this.app.workspace.onLayoutReady(async () => {
      await this.updateReferences();
    });
  }
  async onunload() {
    this.referenceCache.clear();
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_ABNT);
    const styleEl = document.getElementById("abnt-references-styles");
    if (styleEl)
      styleEl.remove();
  }
  async openCitekeyFile(citekey) {
    var _a;
    const files = this.app.vault.getMarkdownFiles();
    for (const file of files) {
      const cache = this.app.metadataCache.getFileCache(file);
      const fileCitekey = (_a = cache == null ? void 0 : cache.frontmatter) == null ? void 0 : _a.citekey;
      if (fileCitekey) {
        const keys = Array.isArray(fileCitekey) ? fileCitekey.map(String) : [String(fileCitekey)];
        const cleanKeys = keys.map((k) => k.replace(/[\[\]"@]/g, "").trim());
        if (cleanKeys.includes(citekey)) {
          await this.app.workspace.getLeaf("tab").openFile(file);
          return;
        }
      }
    }
    new import_obsidian.Notice(`Nota para @${citekey} n\xE3o encontrada no vault.`);
  }
  getView() {
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_ABNT);
    if (leaves.length > 0 && leaves[0].view instanceof ABNTView) {
      return leaves[0].view;
    }
    return null;
  }
  async activateView() {
    const { workspace } = this.app;
    let leaf = workspace.getLeavesOfType(VIEW_TYPE_ABNT)[0];
    if (!leaf) {
      const newLeaf = workspace.getRightLeaf(false);
      if (!newLeaf) {
        new import_obsidian.Notice("N\xE3o foi poss\xEDvel abrir a barra lateral. Verifique se o painel direito est\xE1 dispon\xEDvel.");
        return;
      }
      await newLeaf.setViewState({ type: VIEW_TYPE_ABNT, active: true });
      leaf = newLeaf;
    }
    workspace.revealLeaf(leaf);
  }
  async updateReferences() {
    var _a, _b;
    const view = this.getView();
    if (!view)
      return;
    const file = this.app.workspace.getActiveFile();
    if (!file || file.extension !== "md") {
      view.renderIdle();
      return;
    }
    const content = await this.app.vault.read(file);
    const inlineKeys = this.extractCitekeys(content);
    let frontmatterKeys = [];
    const cache = this.app.metadataCache.getFileCache(file);
    const fileCitekey = (_a = cache == null ? void 0 : cache.frontmatter) == null ? void 0 : _a.citekey;
    if (fileCitekey) {
      const keys = Array.isArray(fileCitekey) ? fileCitekey.map(String) : [String(fileCitekey)];
      frontmatterKeys = keys.map((k) => k.replace(/[\[\]"@]/g, "").trim());
    }
    const linkedKeys = [];
    const links = (cache == null ? void 0 : cache.links) || [];
    const embeds = (cache == null ? void 0 : cache.embeds) || [];
    const allLinks = [...links, ...embeds];
    const resolvedPaths = /* @__PURE__ */ new Set();
    for (const target of allLinks) {
      const destFile = this.app.metadataCache.getFirstLinkpathDest(target.link, file.path);
      if (destFile && destFile.extension === "md" && !resolvedPaths.has(destFile.path)) {
        resolvedPaths.add(destFile.path);
        const destCache = this.app.metadataCache.getFileCache(destFile);
        const destCitekey = (_b = destCache == null ? void 0 : destCache.frontmatter) == null ? void 0 : _b.citekey;
        if (destCitekey) {
          const keys = Array.isArray(destCitekey) ? destCitekey.map(String) : [String(destCitekey)];
          keys.forEach((k) => {
            linkedKeys.push(k.replace(/[\[\]"@]/g, "").trim());
          });
        }
      }
    }
    const allKeys = [.../* @__PURE__ */ new Set([...inlineKeys, ...frontmatterKeys, ...linkedKeys])];
    if (allKeys.length === 0) {
      view.setResults([]);
      document.querySelectorAll('.metadata-property[data-property-key="citekey"]').forEach((el) => {
        el.classList.remove("abnt-property-matched", "abnt-property-error");
      });
      return;
    }
    view.setLoading();
    try {
      const results = await Promise.all(allKeys.map((key) => this.fetchSingleReference(key)));
      view.setResults(results);
      document.querySelectorAll(".abnt-citekey-link").forEach((link) => {
        link.style.color = "var(--text-accent)";
      });
      document.querySelectorAll('.metadata-property[data-property-key="citekey"]').forEach((propertyEl) => {
        propertyEl.classList.remove("abnt-property-matched", "abnt-property-error");
      });
      this.app.workspace.iterateAllLeaves((leaf) => {
        if (leaf.view instanceof import_obsidian.MarkdownView) {
          const editor = leaf.view.editor;
          if (editor && editor.cm) {
            editor.cm.dispatch({});
          }
        }
      });
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      view.setError(errorMsg);
    }
  }
  injectStyles() {
    let styleEl = document.getElementById("abnt-references-styles");
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = "abnt-references-styles";
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = ``;
  }
  async fetchSingleReference(citekey) {
    if (this.referenceCache.has(citekey)) {
      return this.referenceCache.get(citekey);
    }
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
      const result = { citekey, reference: (data.result || "").trim(), error: void 0 };
      this.referenceCache.set(citekey, result);
      return result;
    } catch (e) {
      return { citekey, reference: "", error: "Erro de conex\xE3o" };
    }
  }
  extractCitekeys(content) {
    const matches = [...content.matchAll(CITEKEY_REGEX)];
    const keys = matches.map((m) => m[1]);
    return [...new Set(keys)];
  }
};
