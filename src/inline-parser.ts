import type {
  Text,
  Strong,
  Emphasis,
  Link,
  Image,
  InlineCode,
  Break,
  LinkReference,
  ImageReference,
  Point,
  Position,
  Node,
} from './types';

export type ReferenceMap = Map<string, { url: string; title?: string }>;

export type PhrasingContent =
  | Text
  | Strong
  | Emphasis
  | Link
  | Image
  | InlineCode
  | Break
  | LinkReference
  | ImageReference;

interface Delimiter {
  type: '*' | '_';
  count: number;
  originalCount: number;
  position: number;
  canOpen: boolean;
  canClose: boolean;
  active: boolean;
}

const ESCAPABLE = '!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~';

const ENTITY_MAP: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: '\u00A0',
  copy: '©',
  reg: '®',
};

function decodeEntity(entity: string): string | null {
  if (entity.startsWith('#x') || entity.startsWith('#X')) {
    const code = parseInt(entity.slice(2), 16);
    return isNaN(code) ? null : String.fromCodePoint(code);
  }
  if (entity.startsWith('#')) {
    const code = parseInt(entity.slice(1), 10);
    return isNaN(code) ? null : String.fromCodePoint(code);
  }
  return ENTITY_MAP[entity.toLowerCase()] || null;
}

function isWhitespace(char: string): boolean {
  return /\s/.test(char);
}

function isAlphanumeric(char: string): boolean {
  return /[a-zA-Z0-9]/.test(char);
}

function isPunctuation(char: string): boolean {
  return /[!"#$%&'()*+,\-./:;<=>?@\[\\\]^_`{|}~]/.test(char);
}

function scanCodeSpan(
  text: string,
  start: number
): { value: string; end: number } | null {
  let backtickCount = 0;
  let pos = start;

  while (pos < text.length && text[pos] === '`') {
    backtickCount++;
    pos++;
  }

  if (backtickCount === 0) return null;

  const contentStart = pos;
  let closingStart = -1;

  while (pos < text.length) {
    if (text[pos] === '`') {
      let closeCount = 0;
      const closeStart = pos;
      while (pos < text.length && text[pos] === '`') {
        closeCount++;
        pos++;
      }
      if (closeCount === backtickCount) {
        closingStart = closeStart;
        break;
      }
    } else {
      pos++;
    }
  }

  if (closingStart === -1) return null;

  let content = text.slice(contentStart, closingStart);
  content = content.replace(/\n/g, ' ');
  if (
    content.length >= 2 &&
    content[0] === ' ' &&
    content[content.length - 1] === ' ' &&
    content.trim().length > 0
  ) {
    content = content.slice(1, -1);
  }

  return { value: content, end: pos };
}

function parseDestination(
  text: string,
  start: number
): { url: string; end: number } | null {
  let pos = start;

  if (text[pos] === '<') {
    pos++;
    let url = '';
    while (pos < text.length && text[pos] !== '>' && text[pos] !== '\n') {
      if (text[pos] === '\\' && pos + 1 < text.length) {
        url += text[pos + 1];
        pos += 2;
      } else {
        url += text[pos];
        pos++;
      }
    }
    if (text[pos] === '>') {
      return { url, end: pos + 1 };
    }
    return null;
  }

  let url = '';
  let parenDepth = 0;

  while (pos < text.length) {
    const char = text[pos];

    if (isWhitespace(char) && parenDepth === 0) break;
    if (char === ')' && parenDepth === 0) break;

    if (char === '(') {
      parenDepth++;
      url += char;
      pos++;
    } else if (char === ')') {
      parenDepth--;
      url += char;
      pos++;
    } else if (char === '\\' && pos + 1 < text.length) {
      url += text[pos + 1];
      pos += 2;
    } else {
      url += char;
      pos++;
    }
  }

  if (url.length === 0) return null;
  return { url, end: pos };
}

function parseTitle(
  text: string,
  start: number
): { title: string; end: number } | null {
  let pos = start;

  while (pos < text.length && isWhitespace(text[pos])) {
    pos++;
  }

  if (pos >= text.length) return null;

  const quote = text[pos];
  if (quote !== '"' && quote !== "'" && quote !== '(') return null;

  const closeQuote = quote === '(' ? ')' : quote;
  pos++;

  let title = '';
  while (pos < text.length && text[pos] !== closeQuote) {
    if (text[pos] === '\\' && pos + 1 < text.length) {
      title += text[pos + 1];
      pos += 2;
    } else {
      title += text[pos];
      pos++;
    }
  }

  if (text[pos] !== closeQuote) return null;

  return { title, end: pos + 1 };
}

function parseLinkOrImage(
  text: string,
  start: number,
  references: ReferenceMap,
  isImage: boolean
): { node: Link | Image | LinkReference | ImageReference; end: number } | null {
  let pos = isImage ? start + 2 : start + 1;

  let bracketDepth = 1;
  let labelEnd = pos;

  while (labelEnd < text.length && bracketDepth > 0) {
    if (text[labelEnd] === '\\' && labelEnd + 1 < text.length) {
      labelEnd += 2;
      continue;
    }
    if (text[labelEnd] === '[') bracketDepth++;
    if (text[labelEnd] === ']') bracketDepth--;
    if (bracketDepth > 0) labelEnd++;
  }

  if (bracketDepth !== 0) return null;

  const label = text.slice(pos, labelEnd);
  pos = labelEnd + 1;

  if (pos < text.length && text[pos] === '(') {
    pos++;

    while (pos < text.length && isWhitespace(text[pos])) {
      pos++;
    }

    const destResult = parseDestination(text, pos);
    if (!destResult) return null;

    pos = destResult.end;

    let title: string | undefined;
    const titleResult = parseTitle(text, pos);
    if (titleResult) {
      title = titleResult.title;
      pos = titleResult.end;
    }

    while (pos < text.length && isWhitespace(text[pos])) {
      pos++;
    }

    if (text[pos] !== ')') return null;
    pos++;

    if (isImage) {
      const image: Image = {
        type: 'image',
        url: destResult.url,
        alt: label,
        title,
      };
      return { node: image, end: pos };
    } else {
      const link: Link = {
        type: 'link',
        url: destResult.url,
        title,
        children: [],
      };
      (link as any).rawText = label;
      return { node: link, end: pos };
    }
  }

  if (pos < text.length && text[pos] === '[') {
    const refStart = pos + 1;
    let refEnd = refStart;
    while (refEnd < text.length && text[refEnd] !== ']') {
      refEnd++;
    }
    if (text[refEnd] !== ']') return null;

    const refLabel = text.slice(refStart, refEnd);
    const identifier = (refLabel || label).toLowerCase().replace(/\s+/g, ' ');
    const ref = references.get(identifier);

    pos = refEnd + 1;

    if (ref) {
      if (isImage) {
        const image: Image = {
          type: 'image',
          url: ref.url,
          alt: label,
          title: ref.title,
        };
        return { node: image, end: pos };
      } else {
        const link: Link = {
          type: 'link',
          url: ref.url,
          title: ref.title,
          children: [],
        };
        (link as any).rawText = label;
        return { node: link, end: pos };
      }
    }
    return null;
  }

  const identifier = label.toLowerCase().replace(/\s+/g, ' ');
  const ref = references.get(identifier);

  if (ref) {
    if (isImage) {
      const image: Image = {
        type: 'image',
        url: ref.url,
        alt: label,
        title: ref.title,
      };
      return { node: image, end: pos };
    } else {
      const link: Link = {
        type: 'link',
        url: ref.url,
        title: ref.title,
        children: [],
      };
      (link as any).rawText = label;
      return { node: link, end: pos };
    }
  }

  return null;
}

function isLeftFlanking(text: string, pos: number, count: number): boolean {
  const after = text[pos + count];
  // (1) not followed by whitespace
  if (!after || isWhitespace(after)) return false;

  const before = text[pos - 1];
  // (2a) not followed by punctuation
  if (!isPunctuation(after)) return true;

  // (2b) followed by punctuation AND preceded by whitespace/punctuation
  if (!before || isWhitespace(before) || isPunctuation(before)) return true;

  return false;
}

function isRightFlanking(text: string, pos: number, count: number): boolean {
  const before = text[pos - 1];
  // (1) not preceded by whitespace
  if (!before || isWhitespace(before)) return false;

  const after = text[pos + count];
  // (2a) not preceded by punctuation
  if (!isPunctuation(before)) return true;

  // (2b) preceded by punctuation AND followed by whitespace/punctuation
  if (!after || isWhitespace(after) || isPunctuation(after)) return true;

  return false;
}

function canOpen(
  text: string,
  pos: number,
  count: number,
  char: '*' | '_'
): boolean {
  if (!isLeftFlanking(text, pos, count)) return false;

  if (char === '_') {
    const before = text[pos - 1];
    if (before && isAlphanumeric(before)) return false;
  }

  return true;
}

function canClose(
  text: string,
  pos: number,
  count: number,
  char: '*' | '_'
): boolean {
  if (!isRightFlanking(text, pos, count)) return false;

  if (char === '_') {
    const after = text[pos + count];
    if (after && isAlphanumeric(after)) return false;
  }

  return true;
}

export function parseInline(
  text: string,
  references: ReferenceMap,
  startPosition?: Point
): PhrasingContent[] {
  if (text.length === 0) return [];

  const nodes: PhrasingContent[] = [];
  const delimiters: Delimiter[] = [];
  let currentText = '';
  let pos = 0;

  function flushText(): void {
    if (currentText.length > 0) {
      nodes.push({ type: 'text', value: currentText });
      currentText = '';
    }
  }

  while (pos < text.length) {
    const char = text[pos];

    if (char === '`') {
      const codeResult = scanCodeSpan(text, pos);
      if (codeResult) {
        flushText();
        nodes.push({ type: 'inlineCode', value: codeResult.value });
        pos = codeResult.end;
        continue;
      }
    }

    if (char === '\\' && pos + 1 < text.length) {
      const nextChar = text[pos + 1];
      if (nextChar === '\n') {
        flushText();
        nodes.push({ type: 'break' });
        pos += 2;
        continue;
      }
      if (ESCAPABLE.includes(nextChar)) {
        currentText += nextChar;
        pos += 2;
        continue;
      }
    }

    if (char === '&') {
      const semiPos = text.indexOf(';', pos + 1);
      if (semiPos !== -1 && semiPos - pos <= 32) {
        const entity = text.slice(pos + 1, semiPos);
        const decoded = decodeEntity(entity);
        if (decoded) {
          currentText += decoded;
          pos = semiPos + 1;
          continue;
        }
      }
    }

    if (char === '!' && text[pos + 1] === '[') {
      const imageResult = parseLinkOrImage(text, pos, references, true);
      if (imageResult) {
        flushText();
        nodes.push(imageResult.node as Image);
        pos = imageResult.end;
        continue;
      }
    }

    if (char === '[') {
      const linkResult = parseLinkOrImage(text, pos, references, false);
      if (linkResult) {
        flushText();
        const link = linkResult.node as Link;
        if ((link as any).rawText) {
          const linkChildren = parseInline((link as any).rawText, references);
          link.children = linkChildren as any;
          delete (link as any).rawText;
        }
        nodes.push(link);
        pos = linkResult.end;
        continue;
      }
    }

    if (char === ' ' && text[pos + 1] === ' ') {
      let spaceEnd = pos;
      while (spaceEnd < text.length && text[spaceEnd] === ' ') {
        spaceEnd++;
      }
      if (text[spaceEnd] === '\n') {
        currentText += text.slice(pos, spaceEnd - 2);
        flushText();
        nodes.push({ type: 'break' });
        pos = spaceEnd + 1;
        continue;
      }
    }

    if (char === '*' || char === '_') {
      let count = 0;
      let tempPos = pos;
      while (tempPos < text.length && text[tempPos] === char) {
        count++;
        tempPos++;
      }

      flushText();

      const delimiter: Delimiter = {
        type: char,
        count,
        originalCount: count,
        position: nodes.length,
        canOpen: canOpen(text, pos, count, char),
        canClose: canClose(text, pos, count, char),
        active: true,
      };

      nodes.push({ type: 'text', value: char.repeat(count) });
      delimiters.push(delimiter);
      pos = tempPos;
      continue;
    }

    if (char === '\n') {
      currentText += ' ';
      pos++;
      continue;
    }

    currentText += char;
    pos++;
  }

  flushText();

  processEmphasis(nodes, delimiters);

  return nodes;
}

function processEmphasis(nodes: PhrasingContent[], delimiters: Delimiter[]): void {
  let closerIdx = 0;

  while (closerIdx < delimiters.length) {
    const closer = delimiters[closerIdx];

    if (!closer.canClose || !closer.active || closer.count === 0) {
      closerIdx++;
      continue;
    }

    let openerIdx = closerIdx - 1;
    let foundOpener = false;

    while (openerIdx >= 0) {
      const opener = delimiters[openerIdx];

      if (
        opener.type === closer.type &&
        opener.canOpen &&
        opener.active &&
        opener.count > 0
      ) {
        if (
          (opener.canOpen && opener.canClose) ||
          (closer.canOpen && closer.canClose)
        ) {
          if ((opener.originalCount + closer.originalCount) % 3 === 0) {
            if (opener.originalCount % 3 !== 0 || closer.originalCount % 3 !== 0) {
              openerIdx--;
              continue;
            }
          }
        }

        foundOpener = true;
        break;
      }

      openerIdx--;
    }

    if (!foundOpener) {
      closerIdx++;
      continue;
    }

    const opener = delimiters[openerIdx];
    const useCount = opener.count >= 2 && closer.count >= 2 ? 2 : 1;

    opener.count -= useCount;
    closer.count -= useCount;

    const openerTextNode = nodes[opener.position] as Text;
    const closerTextNode = nodes[closer.position] as Text;

    openerTextNode.value = openerTextNode.value.slice(0, -useCount);
    closerTextNode.value = closerTextNode.value.slice(useCount);

    const emphType = useCount === 2 ? 'strong' : 'emphasis';
    const innerNodes = nodes.splice(
      opener.position + 1,
      closer.position - opener.position - 1
    );

    const emphNode: Strong | Emphasis = {
      type: emphType,
      children: innerNodes.filter(
        (n) => n.type !== 'text' || (n as Text).value.length > 0
      ) as any,
    };

    nodes.splice(opener.position + 1, 0, emphNode);

    for (let i = openerIdx + 1; i < closerIdx; i++) {
      delimiters[i].active = false;
    }

    for (let i = openerIdx + 1; i < delimiters.length; i++) {
      delimiters[i].position -= closer.position - opener.position - 2;
    }

    if (opener.count === 0) {
      opener.active = false;
    }
    if (closer.count === 0) {
      closer.active = false;
      closerIdx++;
    }
  }

  const filteredNodes: PhrasingContent[] = [];
  for (const node of nodes) {
    if (node.type === 'text' && (node as Text).value.length === 0) {
      continue;
    }
    filteredNodes.push(node);
  }

  nodes.length = 0;
  nodes.push(...filteredNodes);

  // Merge adjacent text nodes
  let i = 0;
  while (i < nodes.length - 1) {
    if (nodes[i].type === 'text' && nodes[i + 1].type === 'text') {
      (nodes[i] as Text).value += (nodes[i + 1] as Text).value;
      nodes.splice(i + 1, 1);
    } else {
      i++;
    }
  }
}
