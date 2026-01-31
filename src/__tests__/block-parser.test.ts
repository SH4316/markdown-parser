import { describe, test, expect } from 'bun:test';
import { parseBlocks } from '../block-parser';
import type { Heading, Paragraph, List, Code, Blockquote, ThematicBreak } from '../types';

describe('Block Parser', () => {
  describe('ATX Headings', () => {
    test('level 1 heading', () => {
      const { root } = parseBlocks('# Hello');
      expect(root.children).toHaveLength(1);
      const heading = root.children[0] as Heading;
      expect(heading.type).toBe('heading');
      expect(heading.depth).toBe(1);
    });

    test('all heading levels', () => {
      const { root } = parseBlocks('# H1\n## H2\n### H3\n#### H4\n##### H5\n###### H6');
      expect(root.children).toHaveLength(6);
      for (let i = 0; i < 6; i++) {
        expect((root.children[i] as Heading).depth).toBe(i + 1);
      }
    });

    test('heading with trailing hashes', () => {
      const { root } = parseBlocks('# Hello #');
      const heading = root.children[0] as Heading;
      expect((heading as any).rawText).toBe('Hello');
    });
  });

  describe('Setext Headings', () => {
    test('level 1 with equals', () => {
      const { root } = parseBlocks('Hello\n===');
      expect(root.children).toHaveLength(1);
      const heading = root.children[0] as Heading;
      expect(heading.type).toBe('heading');
      expect(heading.depth).toBe(1);
    });

    test('level 2 with dashes', () => {
      const { root } = parseBlocks('World\n---');
      const heading = root.children[0] as Heading;
      expect(heading.type).toBe('heading');
      expect(heading.depth).toBe(2);
    });
  });

  describe('Paragraphs', () => {
    test('simple paragraph', () => {
      const { root } = parseBlocks('Hello world');
      expect(root.children).toHaveLength(1);
      expect(root.children[0].type).toBe('paragraph');
    });

    test('multi-line paragraph', () => {
      const { root } = parseBlocks('Line 1\nLine 2');
      expect(root.children).toHaveLength(1);
      expect(root.children[0].type).toBe('paragraph');
    });

    test('blank line separates paragraphs', () => {
      const { root } = parseBlocks('Para 1\n\nPara 2');
      expect(root.children).toHaveLength(2);
    });
  });

  describe('Thematic Break', () => {
    test('asterisks', () => {
      const { root } = parseBlocks('***');
      expect(root.children[0].type).toBe('thematicBreak');
    });

    test('dashes', () => {
      const { root } = parseBlocks('---');
      expect(root.children[0].type).toBe('thematicBreak');
    });

    test('underscores', () => {
      const { root } = parseBlocks('___');
      expect(root.children[0].type).toBe('thematicBreak');
    });
  });

  describe('Code Blocks', () => {
    test('fenced with language', () => {
      const { root } = parseBlocks('```js\ncode\n```');
      const code = root.children[0] as Code;
      expect(code.type).toBe('code');
      expect(code.lang).toBe('js');
      expect(code.value).toBe('code');
    });

    test('fenced with tildes', () => {
      const { root } = parseBlocks('~~~\ncode\n~~~');
      const code = root.children[0] as Code;
      expect(code.type).toBe('code');
    });

    test('indented code block', () => {
      const { root } = parseBlocks('    code line 1\n    code line 2');
      const code = root.children[0] as Code;
      expect(code.type).toBe('code');
      expect(code.value).toContain('code line 1');
    });
  });

  describe('Blockquotes', () => {
    test('simple blockquote', () => {
      const { root } = parseBlocks('> quoted');
      const bq = root.children[0] as Blockquote;
      expect(bq.type).toBe('blockquote');
      expect(bq.children).toHaveLength(1);
      expect(bq.children[0].type).toBe('paragraph');
    });

    test('nested blockquote', () => {
      const { root } = parseBlocks('> > nested');
      const bq = root.children[0] as Blockquote;
      expect(bq.type).toBe('blockquote');
    });
  });

  describe('Lists', () => {
    test('unordered list', () => {
      const { root } = parseBlocks('- item 1\n- item 2');
      const list = root.children[0] as List;
      expect(list.type).toBe('list');
      expect(list.ordered).toBe(false);
      expect(list.children).toHaveLength(2);
    });

    test('ordered list', () => {
      const { root } = parseBlocks('1. first\n2. second');
      const list = root.children[0] as List;
      expect(list.type).toBe('list');
      expect(list.ordered).toBe(true);
      expect(list.start).toBe(1);
    });

    test('ordered list with start number', () => {
      const { root } = parseBlocks('5. fifth\n6. sixth');
      const list = root.children[0] as List;
      expect(list.start).toBe(5);
    });

    test('tight list', () => {
      const { root } = parseBlocks('- a\n- b');
      const list = root.children[0] as List;
      expect(list.spread).toBe(false);
    });

    test('loose list', () => {
      const { root } = parseBlocks('- a\n\n- b');
      const list = root.children[0] as List;
      expect(list.spread).toBe(true);
    });
  });

  describe('Link Reference Definitions', () => {
    test('simple definition', () => {
      const { root, references } = parseBlocks('[foo]: /url');
      expect(references.has('foo')).toBe(true);
      expect(references.get('foo')?.url).toBe('/url');
      expect(root.children).toHaveLength(0);
    });

    test('definition with title', () => {
      const { references } = parseBlocks('[bar]: /url "title"');
      expect(references.get('bar')?.title).toBe('title');
    });

    test('case-insensitive lookup', () => {
      const { references } = parseBlocks('[FOO]: /url');
      expect(references.has('foo')).toBe(true);
    });
  });

  describe('Position Tracking', () => {
    test('heading has position', () => {
      const { root } = parseBlocks('# Hello');
      expect(root.children[0].position).toBeDefined();
      expect(root.children[0].position?.start.line).toBe(1);
    });

    test('multi-line block has correct end position', () => {
      const { root } = parseBlocks('Line 1\nLine 2');
      const para = root.children[0];
      expect(para.position?.start.line).toBe(1);
      expect(para.position?.end.line).toBe(2);
    });
  });

  describe('Complex Documents', () => {
    test('mixed content', () => {
      const md = `# Title

First paragraph.

- Item 1
- Item 2

\`\`\`js
code
\`\`\`

> Quote`;
      const { root } = parseBlocks(md);
      expect(root.children[0].type).toBe('heading');
      expect(root.children[1].type).toBe('paragraph');
      expect(root.children[2].type).toBe('list');
      expect(root.children[3].type).toBe('code');
      expect(root.children[4].type).toBe('blockquote');
    });
  });

  describe('Empty Input', () => {
    test('empty string returns empty root', () => {
      const { root } = parseBlocks('');
      expect(root.type).toBe('root');
      expect(root.children).toHaveLength(0);
    });
  });
});
