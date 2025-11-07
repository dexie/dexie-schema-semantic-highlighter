# Dexie Schema Semantic Highlighter

- Highlights Dexie schema syntax inside `db.version(...).stores({ table: \`...\` })` template strings:
  - `++` (auto-increment primary key)
  - `&` (unique)
  - `*` (multiEntry)
  - Compound index parts within `[...]`
  - Type annotations after `:` (e.g. `title: Text`, `body: Y.Doc FullText`) highlighted as `dexieType`
  - Identifiers and punctuation

- Adds a general rule: `#` turns the rest of the **line** into a comment across the whole file (handy for ad‑hoc notes inside template strings too).

Supported languages: `javascript`, `typescript`, `javascriptreact` (JSX), `typescriptreact` (TSX).

## How it works

Uses a **Semantic Tokens** provider with a text heuristic:
- Finds `.version(...).stores({ ... })` blocks.
- Tokenizes each `: \`...\`` value.

Notes and limitations:
- Heuristic regex only; it does not evaluate JS/TS. False positives/negatives are possible.
- No support for template string interpolation `${...}` inside schema values.
- Only backtick strings are recognized (not quotes like ' or ").
- The `#` line comment rule applies to whole documents and may color parts of lines even inside regular code if a `#` appears.

For Dexie schema syntax, see Dexie docs:
- Version.stores(): https://dexie.org/docs/Version/Version.stores 
- Schema quick ref: `++`, `&`, `*`, `[A+B]`.

## Install / Run

Requires VS Code ≥ 1.90.

From source (development):
1. `npm install`
2. `npm run compile`
3. Press **F5** in VS Code to launch the Extension Development Host.

Package a VSIX (optional):
1. `npm run compile`
2. `npx vsce package` (generates `dexie-schema-semantic-highlighter-0.0.1.vsix`)
3. In VS Code: Command Palette → “Extensions: Install from VSIX…” → select the generated `.vsix`.
4. Reload the window if prompted.

Open a JS/TS file with code like:

```ts
import Dexie from 'dexie';
const db = new Dexie('x');
db.version(1).stores({
  people: `++id, &email, [first+last], *tags  # tags is a multiEntry index`
});
```

## Theme mapping (optional)

If your theme doesn't color these semantic tokens as you like, add to your user settings:

```json
"editor.semanticTokenColorCustomizations": {
  "rules": {
    "dexieOp":    { "fontStyle": "bold", "foreground": "#2677cc" },
    "dexieKey":   { "foreground": "#888888" },
    "dexiePunct": { "fontStyle": "" },
    "dexieType":  { "fontStyle": "italic" },
    "comment":    { "fontStyle": "italic" }
  }
}
```

Example goal ("++" blue, keys gray): set `dexieOp` to your preferred blue and `dexieKey` to a neutral gray as above. Because `dexieKey` now uses the `property` superType internally, some themes may already differentiate it; the explicit color rule ensures consistency across themes.

Tip: Use the “Developer: Inspect Editor Tokens and Scopes” command in VS Code to check the actual token type at the cursor.

## Contributing

PRs are welcome. A good place to start is improving heuristics or adding tests. Run the watcher during development:

```sh
npm run watch
```

## License

MIT
