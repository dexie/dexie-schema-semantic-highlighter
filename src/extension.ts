import * as vscode from 'vscode';

/**
 * Heuristic regex to find .version(...).stores({ ... }) blocks.
 * We will then look for occurrences of "key: `...`" inside and tokenize the template content.
 */
const STORES_BLOCK = /\.version\s*\([^)]*\)\s*\.stores\s*\(\s*\{[\s\S]*?\}\s*\)/g;
/** Regex to find ": `...`" inside the stores block (non-greedy, no interpolation handling). */
const KEY_TEMPLATE = /:\s*`([\s\S]*?)`/g;

/** Tiny tokenizer for Dexie schema mini-DSL. */
const TOKEN_REGEX = /\+\+|&|\*|\[|\]|,|[A-Za-z_$][\w$]*/g;

// Define our token types once and reuse for legend and indexing
const TOKEN_TYPES = ['dexieKey', 'dexieOp', 'dexiePunct', 'dexieType', 'comment'] as const;
type TokenKind = typeof TOKEN_TYPES[number];

function tokenTypeIndex(kind: TokenKind): number {
  return TOKEN_TYPES.indexOf(kind);
}

/** Compute all ranges (start,end, exclusive) for template strings inside .version(...).stores({...}). */
function findSchemaTemplateRanges(fullText: string): Array<{ start: number; end: number }> {
  const ranges: Array<{ start: number; end: number }> = [];
  let m: RegExpExecArray | null;

  while ((m = STORES_BLOCK.exec(fullText))) {
    const blockText = m[0];
    const blockStart = m.index;

    let km: RegExpExecArray | null;
    KEY_TEMPLATE.lastIndex = 0;
    while ((km = KEY_TEMPLATE.exec(blockText))) {
      // Compute template start and end (inside backticks).
      const firstBacktick = km.index + km[0].indexOf('`');
      const lastBacktick = km.index + km[0].lastIndexOf('`');
      const start = blockStart + firstBacktick + 1; // after opening `
      const end = blockStart + lastBacktick;        // before closing `
      ranges.push({ start, end });
    }
  }
  return ranges;
}

/**
 * Push a semantic token.
 */
function pushToken(
  builder: vscode.SemanticTokensBuilder,
  doc: vscode.TextDocument,
  absStart: number,
  length: number,
  type: TokenKind
) {
  const pos = doc.positionAt(absStart);
  builder.push(pos.line, pos.character, length, tokenTypeIndex(type), 0);
}

/**
 * Tokenize a Dexie schema fragment.
 * - ++ (auto-increment PK)
 * - &  (unique)
 * - *  (multiEntry)
 * - [a+b] (compound parts)
 * - identifiers
 * - , [ ] punctuation
 *
 * NOTE: We also respect in-line '#' comments: once '#' is seen on a line,
 * the rest of *that* line becomes a 'comment' token and schema tokens stop there.
 */
function tokenizeSchemaContent(
  builder: vscode.SemanticTokensBuilder,
  doc: vscode.TextDocument,
  absStart: number,
  content: string
) {
  const lines = content.split(/\r?\n/);
  let offset = 0;

  for (const line of lines) {
    const hashIdx = line.indexOf('#');

    // Tokenize until '#' or end of line
    const effective = hashIdx === -1 ? line : line.slice(0, hashIdx);

    // 1) Find type ranges after ':' up to next ',' or EOL (within 'effective')
    const typeRanges: Array<{ start: number; end: number }> = [];
    let searchFrom = 0;
    while (true) {
      const ci = effective.indexOf(':', searchFrom);
      if (ci === -1) break;
      // start after ':' and skip leading spaces
      let s = ci + 1;
      while (s < effective.length && /\s/.test(effective[s])) s++;
      // if nothing after ':', skip
      if (s >= effective.length) {
        searchFrom = ci + 1;
        continue;
      }
      // end at next comma or end of effective; trim trailing spaces
      let e = effective.indexOf(',', s);
      if (e === -1) e = effective.length;
      // trim trailing whitespace
      let eTrim = e;
      while (eTrim > s && /\s/.test(effective[eTrim - 1])) eTrim--;
      if (eTrim > s) {
        typeRanges.push({ start: s, end: eTrim });
      }
      searchFrom = e === effective.length ? effective.length : e + 1;
    }

    // 2) Collect standard tokens, skipping any that would fall inside a type range
    type LineToken = { abs: number; len: number; kind: TokenKind };
    const collected: LineToken[] = [];

    const inTypeRange = (idx: number) =>
      typeRanges.some(r => idx >= r.start && idx < r.end);

    TOKEN_REGEX.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = TOKEN_REGEX.exec(effective))) {
      const token = m[0];
      const relIdx = m.index;
      if (inTypeRange(relIdx)) continue; // skip overlapping tokens
      const tokenAbs = absStart + offset + relIdx;
      let t: TokenKind = 'dexieKey';

      // Classify token
      if (token === '++' || token === '&' || token === '*') {
        t = 'dexieOp';
      } else if (token === '[' || token === ']' || token === ',') {
        t = 'dexiePunct';
      } else {
        t = 'dexieKey';
      }
      collected.push({ abs: tokenAbs, len: token.length, kind: t });
    }

    // 3) Add type tokens
    for (const r of typeRanges) {
      const abs = absStart + offset + r.start;
      const len = r.end - r.start;
      collected.push({ abs, len, kind: 'dexieType' });
    }

    // 4) Sort and push in order to satisfy builder's expectations
    collected.sort((a, b) => a.abs - b.abs);
    for (const t of collected) {
      pushToken(builder, doc, t.abs, t.len, t.kind);
    }

    // If there is a '#', mark the rest of the line as a comment
    if (hashIdx !== -1) {
      const commentAbs = absStart + offset + hashIdx;
      const len = line.length - hashIdx;
      pushToken(builder, doc, commentAbs, len, 'comment');
    }

    offset += line.length + 1; // +1 for the removed newline
  }
}

/**
 * General rule: If a line in the document contains '#', mark from '#' to EOL as 'comment'.
 * This is independent of Dexie schema and applies to the whole file (as requested).
 */
function tokenizeHashCommentsWholeFile(builder: vscode.SemanticTokensBuilder, doc: vscode.TextDocument) {
  const lineCount = doc.lineCount;
  for (let i = 0; i < lineCount; i++) {
    const lineText = doc.lineAt(i).text;
    const idx = lineText.indexOf('#');
    if (idx !== -1) {
      const abs = doc.offsetAt(new vscode.Position(i, idx));
      const len = lineText.length - idx;
      pushToken(builder, doc, abs, len, 'comment');
    }
  }
}

export function activate(context: vscode.ExtensionContext) {
  const legend = new vscode.SemanticTokensLegend(
    [...TOKEN_TYPES],
    []
  );

  const provider: vscode.DocumentSemanticTokensProvider = {
    provideDocumentSemanticTokens(document) {
      const builder = new vscode.SemanticTokensBuilder(legend);
      const text = document.getText();

      // 1) Global '#' comment rule across the entire file
      tokenizeHashCommentsWholeFile(builder, document);

      // 2) Dexie schema inside db.version(...).stores({ key: `...` })
      const ranges = findSchemaTemplateRanges(text);
      for (const r of ranges) {
        const schema = text.slice(r.start, r.end);
        tokenizeSchemaContent(builder, document, r.start, schema);
      }

      return builder.build();
    }
  };

  // Register for JS/TS (+ React variants)
  ['javascript', 'typescript', 'javascriptreact', 'typescriptreact'].forEach((language) => {
    const d = vscode.languages.registerDocumentSemanticTokensProvider(
      { language },
      provider,
      legend
    );
    context.subscriptions.push(d);
  });
}

export function deactivate() {}
