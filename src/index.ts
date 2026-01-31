import type {
  Root,
  Heading,
  Paragraph,
  Node,
  Parent,
} from './types';
import { parseBlocks, type ReferenceMap, type BlockParseResult } from './block-parser';
import { parseInline, type PhrasingContent } from './inline-parser';

export type { ReferenceMap, BlockParseResult };
export type { PhrasingContent };
export * from './types';

function processNode(node: Node, references: ReferenceMap): void {
  if ('rawText' in node && typeof (node as any).rawText === 'string') {
    const rawText = (node as any).rawText as string;
    delete (node as any).rawText;

    if ('children' in node) {
      const parent = node as Parent;
      const inlineNodes = parseInline(rawText, references);
      parent.children = inlineNodes as Node[];
    }
  }

  if ('children' in node) {
    const parent = node as Parent;
    for (const child of parent.children) {
      processNode(child, references);
    }
  }
}

export function parse(markdown: string): Root {
  const { root, references } = parseBlocks(markdown);

  for (const child of root.children) {
    processNode(child, references);
  }

  return root;
}

export { parseBlocks } from './block-parser';
export { parseInline } from './inline-parser';
export { tokenize } from './tokenizer';
