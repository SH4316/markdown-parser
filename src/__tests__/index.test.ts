import { describe, test, expect } from 'bun:test';
import { parse } from '../index';
import type { Heading, Paragraph, Strong, Text, List, Code, Blockquote } from '../types';

describe('Integration: parse()', () => {
  describe('Empty Input', () => {
    test('empty string returns empty root', () => {
      const root = parse('');
      expect(root.type).toBe('root');
      expect(root.children).toHaveLength(0);
    });

    test('whitespace only returns empty root', () => {
      const root = parse('   \n   \n   ');
      expect(root.children).toHaveLength(0);
    });
  });

  describe('Headings with Inline Content', () => {
    test('ATX heading with text', () => {
      const root = parse('# Hello');
      expect(root.children).toHaveLength(1);

      const heading = root.children[0] as Heading;
      expect(heading.type).toBe('heading');
      expect(heading.depth).toBe(1);
      expect(heading.children).toHaveLength(1);

      const text = heading.children[0] as Text;
      expect(text.type).toBe('text');
      expect(text.value).toBe('Hello');
    });

    test('heading with emphasis', () => {
      const root = parse('# Hello *world*');
      const heading = root.children[0] as Heading;
      expect(heading.children.length).toBeGreaterThan(1);
      expect(heading.children.some(c => c.type === 'emphasis')).toBe(true);
    });
  });

  describe('Paragraphs with Inline Content', () => {
    test('simple paragraph', () => {
      const root = parse('Hello world');
      const para = root.children[0] as Paragraph;
      expect(para.type).toBe('paragraph');
      expect(para.children).toHaveLength(1);

      const text = para.children[0] as Text;
      expect(text.value).toBe('Hello world');
    });

    test('paragraph with strong', () => {
      const root = parse('**bold** text');
      const para = root.children[0] as Paragraph;
      expect(para.children[0].type).toBe('strong');
    });

    test('paragraph with inline code', () => {
      const root = parse('Use `console.log()` here');
      const para = root.children[0] as Paragraph;
      expect(para.children.some(c => c.type === 'inlineCode')).toBe(true);
    });
  });

  describe('Links', () => {
    test('inline link', () => {
      const root = parse('[click here](https://example.com)');
      const para = root.children[0] as Paragraph;
      const link = para.children[0] as any;
      expect(link.type).toBe('link');
      expect(link.url).toBe('https://example.com');
    });

    test('reference link', () => {
      const root = parse('[click here][example]\n\n[example]: https://example.com');
      const para = root.children[0] as Paragraph;
      const link = para.children[0] as any;
      expect(link.type).toBe('link');
      expect(link.url).toBe('https://example.com');
    });
  });

  describe('Lists with Inline Content', () => {
    test('list items have parsed inline content', () => {
      const root = parse('- **bold** item\n- *italic* item');
      const list = root.children[0] as List;
      expect(list.type).toBe('list');

      const firstItem = list.children[0] as any;
      const firstPara = firstItem.children[0] as Paragraph;
      expect(firstPara.children.some(c => c.type === 'strong')).toBe(true);
    });
  });

  describe('Blockquotes with Inline Content', () => {
    test('blockquote content is parsed for inline', () => {
      const root = parse('> **important** note');
      const bq = root.children[0] as Blockquote;
      const para = bq.children[0] as Paragraph;
      expect(para.children.some(c => c.type === 'strong')).toBe(true);
    });
  });

  describe('Code Blocks', () => {
    test('fenced code block preserves content', () => {
      const root = parse('```js\nconst x = 1;\n```');
      const code = root.children[0] as Code;
      expect(code.type).toBe('code');
      expect(code.lang).toBe('js');
      expect(code.value).toContain('const x = 1');
    });
  });

  describe('Position Tracking', () => {
    test('root has position', () => {
      const root = parse('# Hello\n\nWorld');
      expect(root.position).toBeDefined();
    });

    test('heading has position', () => {
      const root = parse('# Hello');
      const heading = root.children[0] as Heading;
      expect(heading.position).toBeDefined();
      expect(heading.position?.start.line).toBe(1);
    });
  });

  describe('Complex Documents', () => {
    test('full document with various elements', () => {
      const md = `# Welcome

This is a **bold** statement with \`code\`.

- Item one
- Item two with *emphasis*

> A quote with [a link](url)

\`\`\`javascript
function hello() {}
\`\`\`
`;
      const root = parse(md);

      expect(root.children[0].type).toBe('heading');
      expect(root.children[1].type).toBe('paragraph');
      expect(root.children[2].type).toBe('list');
      expect(root.children[3].type).toBe('blockquote');
      expect(root.children[4].type).toBe('code');

      const heading = root.children[0] as Heading;
      expect((heading.children[0] as Text).value).toBe('Welcome');

      const para = root.children[1] as Paragraph;
      expect(para.children.some(c => c.type === 'strong')).toBe(true);
      expect(para.children.some(c => c.type === 'inlineCode')).toBe(true);
    });
  });
});
