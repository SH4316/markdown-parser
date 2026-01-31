import type {
  Root,
  Heading,
  Paragraph,
  List,
  ListItem,
  Code,
  Blockquote,
  ThematicBreak,
  Definition,
  Point,
  Position,
  Node,
} from './types';
import { tokenize, type Token } from './tokenizer';

export type ReferenceMap = Map<string, { url: string; title?: string }>;

export interface BlockParseResult {
  root: Root;
  references: ReferenceMap;
}

function makePoint(token: Token, column: number = 1): Point {
  return {
    line: token.lineNumber,
    column,
    offset: token.offset,
  };
}

function makePosition(startToken: Token, endToken: Token): Position {
  return {
    start: makePoint(startToken),
    end: {
      line: endToken.lineNumber,
      column: endToken.raw.length + 1,
      offset: endToken.offset + endToken.raw.length,
    },
  };
}

// Pattern: [label]: <url> "optional title" - CommonMark link reference definition
const LINK_DEF_RE = /^\[([^\]]+)\]:\s*<?([^\s>]+)>?(?:\s+["'(]([^"')]+)["')])?$/;

function parseLinkDefinition(
  content: string
): { identifier: string; url: string; title?: string } | null {
  const match = content.match(LINK_DEF_RE);
  if (!match) return null;

  const identifier = match[1].toLowerCase().replace(/\s+/g, ' ');
  const url = match[2];
  const title = match[3];

  return { identifier, url, title };
}

function collectParagraphTokens(tokens: Token[], startIdx: number): Token[] {
  const paragraphTokens: Token[] = [];
  let j = startIdx;

  while (j < tokens.length) {
    const token = tokens[j];

    if (token.type === 'blank') break;

    if (
      token.type === 'atxHeading' ||
      token.type === 'thematicBreak' ||
      token.type === 'codeFence' ||
      token.type === 'listMarker' ||
      token.type === 'blockquoteMarker'
    ) {
      break;
    }

    if (token.type === 'setextUnderline' && paragraphTokens.length > 0) {
      break;
    }

    if (token.type === 'indentedCode' && paragraphTokens.length === 0) {
      break;
    }

    paragraphTokens.push(token);
    j++;
  }

  return paragraphTokens;
}

function collectIndentedCodeTokens(tokens: Token[], startIdx: number): Token[] {
  const codeTokens: Token[] = [];
  let j = startIdx;

  while (j < tokens.length) {
    const token = tokens[j];

    if (token.type === 'indentedCode') {
      codeTokens.push(token);
      j++;
    } else if (token.type === 'blank') {
      const lookAhead = j + 1;
      if (lookAhead < tokens.length && tokens[lookAhead].type === 'indentedCode') {
        codeTokens.push(token);
        j++;
      } else {
        break;
      }
    } else {
      break;
    }
  }

  return codeTokens;
}

function collectFencedCodeTokens(
  tokens: Token[],
  startIdx: number,
  openingFence: Token
): Token[] {
  const codeTokens: Token[] = [];
  let j = startIdx + 1;
  const fenceChar = openingFence.fenceChar;
  const fenceLength = openingFence.fenceLength || 3;

  while (j < tokens.length) {
    const token = tokens[j];

    if (
      token.type === 'codeFence' &&
      token.fenceChar === fenceChar &&
      (token.fenceLength || 3) >= fenceLength
    ) {
      codeTokens.push(token);
      break;
    }

    codeTokens.push(token);
    j++;
  }

  return codeTokens;
}

function collectBlockquoteTokens(tokens: Token[], startIdx: number): Token[] {
  const bqTokens: Token[] = [];
  let j = startIdx;

  while (j < tokens.length) {
    const token = tokens[j];

    if (token.type === 'blockquoteMarker') {
      bqTokens.push(token);
      j++;
    } else if (token.type === 'blank') {
      break;
    } else if (token.type === 'paragraph' && bqTokens.length > 0) {
      // Lazy continuation per CommonMark spec
      bqTokens.push(token);
      j++;
    } else {
      break;
    }
  }

  return bqTokens;
}

function collectListTokens(
  tokens: Token[],
  startIdx: number,
  listType: 'bullet' | 'ordered',
  firstMarker: string
): { tokens: Token[]; isLoose: boolean } {
  const listTokens: Token[] = [];
  let j = startIdx;
  let hasBlankBetweenItems = false;
  let lastWasBlank = false;

  while (j < tokens.length) {
    const token = tokens[j];

    if (token.type === 'blank') {
      lastWasBlank = true;
      listTokens.push(token);
      j++;
      continue;
    }

    if (token.type === 'listMarker') {
      if (token.listType === listType) {
        if (listType === 'bullet') {
          const currentMarkerChar = token.listMarker?.[0];
          const firstMarkerChar = firstMarker[0];
          if (currentMarkerChar !== firstMarkerChar) break;
        }

        if (lastWasBlank && listTokens.length > 0) {
          hasBlankBetweenItems = true;
        }
        lastWasBlank = false;
        listTokens.push(token);
        j++;
        continue;
      } else {
        break;
      }
    }

    if (
      token.type === 'paragraph' ||
      token.type === 'indentedCode' ||
      token.indent >= 2
    ) {
      lastWasBlank = false;
      listTokens.push(token);
      j++;
      continue;
    }

    break;
  }

  return { tokens: listTokens, isLoose: hasBlankBetweenItems };
}

export function parseBlocks(input: string): BlockParseResult {
  const tokens = tokenize(input);
  const references: ReferenceMap = new Map();

  const root: Root = {
    type: 'root',
    children: [],
  };

  if (tokens.length === 0) {
    return { root, references };
  }

  let i = 0;

  function addChild(node: Node): void {
    (root.children as Node[]).push(node);
  }

  while (i < tokens.length) {
    const token = tokens[i];

    if (token.type === 'blank') {
      i++;
      continue;
    }

    if (token.type === 'atxHeading') {
      const heading: Heading = {
        type: 'heading',
        depth: token.headingLevel as 1 | 2 | 3 | 4 | 5 | 6,
        children: [],
        position: makePosition(token, token),
      };
      (heading as any).rawText = token.content;
      addChild(heading);
      i++;
      continue;
    }

    if (token.type === 'thematicBreak') {
      const tb: ThematicBreak = {
        type: 'thematicBreak',
        position: makePosition(token, token),
      };
      addChild(tb);
      i++;
      continue;
    }

    if (token.type === 'codeFence') {
      const codeTokens = collectFencedCodeTokens(tokens, i, token);
      const hasClosing =
        codeTokens.length > 0 &&
        codeTokens[codeTokens.length - 1].type === 'codeFence';

      const contentTokens = hasClosing ? codeTokens.slice(0, -1) : codeTokens;
      const codeContent = contentTokens.map((t) => t.raw).join('\n');

      const endToken = hasClosing
        ? codeTokens[codeTokens.length - 1]
        : contentTokens.length > 0
        ? contentTokens[contentTokens.length - 1]
        : token;

      const code: Code = {
        type: 'code',
        lang: token.codeLang || undefined,
        value: codeContent,
        position: makePosition(token, endToken),
      };
      addChild(code);
      i += codeTokens.length + 1;
      continue;
    }

    if (token.type === 'indentedCode') {
      const codeTokens = collectIndentedCodeTokens(tokens, i);
      const codeContent = codeTokens
        .map((t) => (t.type === 'blank' ? '' : t.content))
        .join('\n');

      const endToken = codeTokens[codeTokens.length - 1];
      const code: Code = {
        type: 'code',
        value: codeContent,
        position: makePosition(token, endToken),
      };
      addChild(code);
      i += codeTokens.length;
      continue;
    }

    if (token.type === 'blockquoteMarker') {
      const bqTokens = collectBlockquoteTokens(tokens, i);
      const innerContent = bqTokens.map((t) => t.content).join('\n');
      const innerResult = parseBlocks(innerContent);

      innerResult.references.forEach((v, k) => references.set(k, v));

      const endToken = bqTokens[bqTokens.length - 1];
      const blockquote: Blockquote = {
        type: 'blockquote',
        children: innerResult.root.children,
        position: makePosition(token, endToken),
      };
      addChild(blockquote);
      i += bqTokens.length;
      continue;
    }

    if (token.type === 'listMarker') {
      const listType = token.listType!;
      const { tokens: listTokens, isLoose } = collectListTokens(
        tokens,
        i,
        listType,
        token.listMarker!
      );

      const list: List = {
        type: 'list',
        ordered: listType === 'ordered',
        start: listType === 'ordered' ? token.listStart : undefined,
        spread: isLoose,
        children: [],
        position: makePosition(token, listTokens[listTokens.length - 1] || token),
      };

      let currentItemTokens: Token[] = [];
      let currentItemStart: Token | null = null;

      for (const lt of listTokens) {
        if (lt.type === 'listMarker') {
          if (currentItemTokens.length > 0 && currentItemStart) {
            const itemContent = currentItemTokens.map((t) => t.content).join('\n');
            const itemResult = parseBlocks(itemContent);
            itemResult.references.forEach((v, k) => references.set(k, v));

            const listItem: ListItem = {
              type: 'listItem',
              spread: isLoose,
              children: itemResult.root.children,
              position: makePosition(
                currentItemStart,
                currentItemTokens[currentItemTokens.length - 1]
              ),
            };
            list.children.push(listItem);
          }

          currentItemTokens = [lt];
          currentItemStart = lt;
        } else if (lt.type !== 'blank') {
          currentItemTokens.push(lt);
        }
      }

      if (currentItemTokens.length > 0 && currentItemStart) {
        const itemContent = currentItemTokens.map((t) => t.content).join('\n');
        const itemResult = parseBlocks(itemContent);
        itemResult.references.forEach((v, k) => references.set(k, v));

        const listItem: ListItem = {
          type: 'listItem',
          spread: isLoose,
          children: itemResult.root.children,
          position: makePosition(
            currentItemStart,
            currentItemTokens[currentItemTokens.length - 1]
          ),
        };
        list.children.push(listItem);
      }

      addChild(list);
      i += listTokens.length;
      continue;
    }

    if (token.type === 'paragraph' || token.type === 'setextUnderline') {
      const paragraphTokens = collectParagraphTokens(tokens, i);

      if (paragraphTokens.length === 0) {
        i++;
        continue;
      }

      const nextIdx = i + paragraphTokens.length;
      if (nextIdx < tokens.length && tokens[nextIdx].type === 'setextUnderline') {
        const setextToken = tokens[nextIdx];
        const rawText = paragraphTokens.map((t) => t.content).join('\n');

        const heading: Heading = {
          type: 'heading',
          depth: setextToken.setextLevel as 1 | 2,
          children: [],
          position: makePosition(paragraphTokens[0], setextToken),
        };
        (heading as any).rawText = rawText;
        addChild(heading);
        i = nextIdx + 1;
        continue;
      }

      if (paragraphTokens.length === 1) {
        const defResult = parseLinkDefinition(paragraphTokens[0].content);
        if (defResult) {
          references.set(defResult.identifier, {
            url: defResult.url,
            title: defResult.title,
          });
          i += paragraphTokens.length;
          continue;
        }
      }

      const rawText = paragraphTokens.map((t) => t.content).join('\n');
      const paragraph: Paragraph = {
        type: 'paragraph',
        children: [],
        position: makePosition(
          paragraphTokens[0],
          paragraphTokens[paragraphTokens.length - 1]
        ),
      };
      (paragraph as any).rawText = rawText;
      addChild(paragraph);
      i += paragraphTokens.length;
      continue;
    }

    i++;
  }

  if (root.children.length > 0) {
    const firstChild = root.children[0];
    const lastChild = root.children[root.children.length - 1];
    if (firstChild.position && lastChild.position) {
      root.position = {
        start: firstChild.position.start,
        end: lastChild.position.end,
      };
    }
  }

  return { root, references };
}
