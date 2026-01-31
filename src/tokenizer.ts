export type LineType =
  | 'blank'
  | 'atxHeading'
  | 'setextUnderline'
  | 'thematicBreak'
  | 'listMarker'
  | 'blockquoteMarker'
  | 'codeFence'
  | 'indentedCode'
  | 'paragraph'
  | 'other';

export interface Token {
  type: LineType;
  raw: string;
  content: string;
  lineNumber: number;
  offset: number;
  indent: number;
  headingLevel?: number;
  setextLevel?: number;
  listType?: 'bullet' | 'ordered';
  listStart?: number;
  listMarker?: string;
  fenceChar?: string;
  fenceLength?: number;
  codeLang?: string;
}

interface ExpandedLine {
  expanded: string;
  indent: number;
}

function expandTabs(line: string): ExpandedLine {
  let column = 1;
  let expanded = '';
  let indent = 0;
  let inIndent = true;

  for (const char of line) {
    if (char === '\t') {
      const spaces = 4 - ((column - 1) % 4);
      expanded += ' '.repeat(spaces);
      if (inIndent) {
        indent += spaces;
      }
      column += spaces;
    } else {
      expanded += char;
      if (inIndent && char === ' ') {
        indent++;
      } else {
        inIndent = false;
      }
      column++;
    }
  }

  return { expanded, indent };
}

const ATX_HEADING_RE = /^(#{1,6})(?:\s|$)/;
const SETEXT_UNDERLINE_RE = /^(=+|-+)\s*$/;
const THEMATIC_BREAK_RE = /^([-*_])[ \t]*(?:\1[ \t]*){2,}$/;
const BULLET_LIST_RE = /^([-+*])[ \t]/;
const ORDERED_LIST_RE = /^(\d{1,9})([.)])[ \t]/;
const BLOCKQUOTE_RE = /^>[ ]?/;
const CODE_FENCE_BACKTICK_RE = /^(`{3,})([^`]*)$/;
const CODE_FENCE_TILDE_RE = /^(~{3,})(.*)$/;
const BLANK_RE = /^\s*$/;

function classifyLine(raw: string, expanded: string, indent: number): Token {
  const base = {
    raw,
    lineNumber: 0,
    offset: 0,
    indent,
  };

  if (BLANK_RE.test(raw)) {
    return { ...base, type: 'blank', content: '' };
  }

  const contentAfterIndent = expanded.slice(indent);
  const leadingSpaces = indent;

  if (leadingSpaces >= 4) {
    return {
      ...base,
      type: 'indentedCode',
      content: expanded.slice(4),
    };
  }

  const trimmedForPattern = contentAfterIndent;

  const atxMatch = trimmedForPattern.match(ATX_HEADING_RE);
  if (atxMatch) {
    const level = atxMatch[1].length as 1 | 2 | 3 | 4 | 5 | 6;
    let content = trimmedForPattern.slice(atxMatch[0].length);
    content = content.replace(/\s+#+\s*$/, '').replace(/#+\s*$/, '').trim();
    return {
      ...base,
      type: 'atxHeading',
      content,
      headingLevel: level,
    };
  }

  const thematicMatch = trimmedForPattern.match(THEMATIC_BREAK_RE);
  if (thematicMatch) {
    return { ...base, type: 'thematicBreak', content: '' };
  }

  const setextMatch = trimmedForPattern.match(SETEXT_UNDERLINE_RE);
  if (setextMatch) {
    const char = setextMatch[1][0];
    return {
      ...base,
      type: 'setextUnderline',
      content: '',
      setextLevel: char === '=' ? 1 : 2,
    };
  }

  const bulletMatch = trimmedForPattern.match(BULLET_LIST_RE);
  if (bulletMatch) {
    const marker = bulletMatch[1];
    const content = trimmedForPattern.slice(bulletMatch[0].length);
    return {
      ...base,
      type: 'listMarker',
      content,
      listType: 'bullet',
      listMarker: marker,
    };
  }

  const orderedMatch = trimmedForPattern.match(ORDERED_LIST_RE);
  if (orderedMatch) {
    const num = parseInt(orderedMatch[1], 10);
    const delimiter = orderedMatch[2];
    const content = trimmedForPattern.slice(orderedMatch[0].length);
    return {
      ...base,
      type: 'listMarker',
      content,
      listType: 'ordered',
      listStart: num,
      listMarker: orderedMatch[1] + delimiter,
    };
  }

  const blockquoteMatch = trimmedForPattern.match(BLOCKQUOTE_RE);
  if (blockquoteMatch) {
    const content = trimmedForPattern.slice(blockquoteMatch[0].length);
    return {
      ...base,
      type: 'blockquoteMarker',
      content,
    };
  }

  const backtickFenceMatch = trimmedForPattern.match(CODE_FENCE_BACKTICK_RE);
  if (backtickFenceMatch) {
    const fenceLength = backtickFenceMatch[1].length;
    const infoString = backtickFenceMatch[2].trim();
    return {
      ...base,
      type: 'codeFence',
      content: '',
      fenceChar: '`',
      fenceLength,
      codeLang: infoString,
    };
  }

  const tildeFenceMatch = trimmedForPattern.match(CODE_FENCE_TILDE_RE);
  if (tildeFenceMatch) {
    const fenceLength = tildeFenceMatch[1].length;
    const infoString = tildeFenceMatch[2].trim();
    return {
      ...base,
      type: 'codeFence',
      content: '',
      fenceChar: '~',
      fenceLength,
      codeLang: infoString,
    };
  }

  return {
    ...base,
    type: 'paragraph',
    content: trimmedForPattern,
  };
}

export function tokenize(input: string): Token[] {
  if (input === '') return [];

  const tokens: Token[] = [];
  const lineEndingRe = /\r\n|\r|\n/g;
  let lastIndex = 0;
  let lineNumber = 1;
  let match: RegExpExecArray | null;

  while ((match = lineEndingRe.exec(input)) !== null) {
    const raw = input.slice(lastIndex, match.index);
    const { expanded, indent } = expandTabs(raw);
    const token = classifyLine(raw, expanded, indent);
    token.lineNumber = lineNumber;
    token.offset = lastIndex;
    tokens.push(token);

    lastIndex = match.index + match[0].length;
    lineNumber++;
  }

  if (lastIndex <= input.length) {
    const raw = input.slice(lastIndex);
    if (raw.length > 0 || tokens.length === 0) {
      const { expanded, indent } = expandTabs(raw);
      const token = classifyLine(raw, expanded, indent);
      token.lineNumber = lineNumber;
      token.offset = lastIndex;
      tokens.push(token);
    }
  }

  return tokens;
}
