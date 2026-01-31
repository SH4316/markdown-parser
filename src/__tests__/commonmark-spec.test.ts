import { describe, test, expect } from 'bun:test';
import { parse } from '../index';
import type { Heading, Paragraph, Code, List, Blockquote, ThematicBreak, Text, Strong, Emphasis, Link, Image, InlineCode } from '../types';

describe('CommonMark Spec Compliance', () => {
  describe('Thematic Breaks', () => {
    test('three asterisks', () => {
      const root = parse('***');
      expect(root.children[0].type).toBe('thematicBreak');
    });

    test('three dashes', () => {
      const root = parse('---');
      expect(root.children[0].type).toBe('thematicBreak');
    });

    test('three underscores', () => {
      const root = parse('___');
      expect(root.children[0].type).toBe('thematicBreak');
    });

    test('with spaces between', () => {
      const root = parse('- - -');
      expect(root.children[0].type).toBe('thematicBreak');
    });

    test('many characters', () => {
      const root = parse('_____________________________________');
      expect(root.children[0].type).toBe('thematicBreak');
    });
  });

  describe('ATX Headings', () => {
    test('all levels', () => {
      const root = parse('# H1\n## H2\n### H3\n#### H4\n##### H5\n###### H6');
      expect(root.children).toHaveLength(6);
      for (let i = 0; i < 6; i++) {
        const h = root.children[i] as Heading;
        expect(h.type).toBe('heading');
        expect(h.depth).toBe(i + 1);
      }
    });

    test('7 hashes is not a heading', () => {
      const root = parse('####### foo');
      expect(root.children[0].type).toBe('paragraph');
    });

    test('no space after hash is not heading', () => {
      const root = parse('#5 bolt');
      expect(root.children[0].type).toBe('paragraph');
    });

    test('closing hashes', () => {
      const root = parse('## foo ##');
      const h = root.children[0] as Heading;
      expect(h.type).toBe('heading');
      expect(h.depth).toBe(2);
    });

    test('empty heading', () => {
      const root = parse('## \n#');
      expect(root.children[0].type).toBe('heading');
      expect(root.children[1].type).toBe('heading');
    });
  });

  describe('Setext Headings', () => {
    test('level 1 with equals', () => {
      const root = parse('Foo\n===');
      const h = root.children[0] as Heading;
      expect(h.type).toBe('heading');
      expect(h.depth).toBe(1);
    });

    test('level 2 with dashes', () => {
      const root = parse('Foo\n---');
      const h = root.children[0] as Heading;
      expect(h.type).toBe('heading');
      expect(h.depth).toBe(2);
    });

    test('multiline content', () => {
      const root = parse('Foo\nbar\n---');
      const h = root.children[0] as Heading;
      expect(h.type).toBe('heading');
      expect(h.depth).toBe(2);
    });
  });

  describe('Indented Code Blocks', () => {
    test('simple indented code', () => {
      const root = parse('    a simple\n      indented code block');
      const code = root.children[0] as Code;
      expect(code.type).toBe('code');
      expect(code.value).toContain('a simple');
    });
  });

  describe('Fenced Code Blocks', () => {
    test('backtick fence', () => {
      const root = parse('```\n<\n >\n```');
      const code = root.children[0] as Code;
      expect(code.type).toBe('code');
    });

    test('tilde fence', () => {
      const root = parse('~~~\n<\n >\n~~~');
      const code = root.children[0] as Code;
      expect(code.type).toBe('code');
    });

    test('with language', () => {
      const root = parse('```ruby\ndef foo(x)\n  return 3\nend\n```');
      const code = root.children[0] as Code;
      expect(code.lang).toBe('ruby');
    });

    test('longer closing fence', () => {
      const root = parse('````\naaa\n```\n``````');
      const code = root.children[0] as Code;
      expect(code.value).toContain('```');
    });
  });

  describe('Paragraphs', () => {
    test('simple paragraph', () => {
      const root = parse('aaa\n\nbbb');
      expect(root.children).toHaveLength(2);
      expect(root.children[0].type).toBe('paragraph');
      expect(root.children[1].type).toBe('paragraph');
    });

    test('multiline paragraph', () => {
      const root = parse('aaa\nbbb\n\nccc\nddd');
      expect(root.children).toHaveLength(2);
    });
  });

  describe('Block Quotes', () => {
    test('simple blockquote', () => {
      const root = parse('> # Foo\n> bar\n> baz');
      const bq = root.children[0] as Blockquote;
      expect(bq.type).toBe('blockquote');
    });

    test('nested blockquotes', () => {
      const root = parse('> > > foo');
      expect(root.children[0].type).toBe('blockquote');
    });
  });

  describe('Lists', () => {
    test('unordered with dash', () => {
      const root = parse('- one\n- two');
      const list = root.children[0] as List;
      expect(list.type).toBe('list');
      expect(list.ordered).toBe(false);
      expect(list.children).toHaveLength(2);
    });

    test('ordered list', () => {
      const root = parse('1. one\n2. two');
      const list = root.children[0] as List;
      expect(list.type).toBe('list');
      expect(list.ordered).toBe(true);
    });

    test('list with start number', () => {
      const root = parse('3. three\n4. four');
      const list = root.children[0] as List;
      expect(list.start).toBe(3);
    });
  });

  describe('Backslash Escapes', () => {
    test('escaped punctuation', () => {
      const root = parse('\\*not emphasis\\*');
      const para = root.children[0] as Paragraph;
      const text = para.children[0] as Text;
      expect(text.value).toBe('*not emphasis*');
    });

    test('hard line break', () => {
      const root = parse('foo\\\nbar');
      const para = root.children[0] as Paragraph;
      expect(para.children.some(c => c.type === 'break')).toBe(true);
    });
  });

  describe('Code Spans', () => {
    test('simple code span', () => {
      const root = parse('`foo`');
      const para = root.children[0] as Paragraph;
      const code = para.children[0] as InlineCode;
      expect(code.type).toBe('inlineCode');
      expect(code.value).toBe('foo');
    });

    test('double backticks', () => {
      const root = parse('``foo ` bar``');
      const para = root.children[0] as Paragraph;
      const code = para.children[0] as InlineCode;
      expect(code.value).toBe('foo ` bar');
    });

    test('backticks in code', () => {
      const root = parse('`` `foo` ``');
      const para = root.children[0] as Paragraph;
      const code = para.children[0] as InlineCode;
      expect(code.value).toBe('`foo`');
    });
  });

  describe('Emphasis', () => {
    test('asterisk emphasis', () => {
      const root = parse('*foo bar*');
      const para = root.children[0] as Paragraph;
      expect(para.children[0].type).toBe('emphasis');
    });

    test('underscore emphasis', () => {
      const root = parse('_foo bar_');
      const para = root.children[0] as Paragraph;
      expect(para.children[0].type).toBe('emphasis');
    });

    test('intraword with asterisks', () => {
      const root = parse('foo*bar*baz');
      const para = root.children[0] as Paragraph;
      expect(para.children.some(c => c.type === 'emphasis')).toBe(true);
    });

    test('intraword underscore is not emphasis', () => {
      const root = parse('foo_bar_baz');
      const para = root.children[0] as Paragraph;
      expect(para.children[0].type).toBe('text');
    });
  });

  describe('Strong Emphasis', () => {
    test('double asterisks', () => {
      const root = parse('**foo bar**');
      const para = root.children[0] as Paragraph;
      expect(para.children[0].type).toBe('strong');
    });

    test('double underscores', () => {
      const root = parse('__foo bar__');
      const para = root.children[0] as Paragraph;
      expect(para.children[0].type).toBe('strong');
    });
  });

  describe('Links', () => {
    test('inline link', () => {
      const root = parse('[link](/uri)');
      const para = root.children[0] as Paragraph;
      const link = para.children[0] as Link;
      expect(link.type).toBe('link');
      expect(link.url).toBe('/uri');
    });

    test('inline link with title', () => {
      const root = parse('[link](/uri "title")');
      const para = root.children[0] as Paragraph;
      const link = para.children[0] as Link;
      expect(link.title).toBe('title');
    });

    test('reference link', () => {
      const root = parse('[foo][bar]\n\n[bar]: /url "title"');
      const para = root.children[0] as Paragraph;
      const link = para.children[0] as Link;
      expect(link.type).toBe('link');
      expect(link.url).toBe('/url');
    });
  });

  describe('Images', () => {
    test('inline image', () => {
      const root = parse('![foo](/url "title")');
      const para = root.children[0] as Paragraph;
      const img = para.children[0] as Image;
      expect(img.type).toBe('image');
      expect(img.url).toBe('/url');
      expect(img.alt).toBe('foo');
      expect(img.title).toBe('title');
    });

    test('reference image', () => {
      const root = parse('![foo][bar]\n\n[bar]: /url');
      const para = root.children[0] as Paragraph;
      const img = para.children[0] as Image;
      expect(img.type).toBe('image');
    });
  });

  describe('Hard Line Breaks', () => {
    test('two spaces before newline', () => {
      const root = parse('foo  \nbar');
      const para = root.children[0] as Paragraph;
      expect(para.children.some(c => c.type === 'break')).toBe(true);
    });

    test('backslash before newline', () => {
      const root = parse('foo\\\nbar');
      const para = root.children[0] as Paragraph;
      expect(para.children.some(c => c.type === 'break')).toBe(true);
    });
  });

  describe('Entity References', () => {
    test('named entities', () => {
      const root = parse('&amp;');
      const para = root.children[0] as Paragraph;
      const text = para.children[0] as Text;
      expect(text.value).toBe('&');
    });

    test('numeric entities decimal', () => {
      const root = parse('&#35;');
      const para = root.children[0] as Paragraph;
      const text = para.children[0] as Text;
      expect(text.value).toBe('#');
    });

    test('numeric entities hex', () => {
      const root = parse('&#X22;');
      const para = root.children[0] as Paragraph;
      const text = para.children[0] as Text;
      expect(text.value).toBe('"');
    });
  });

  describe('Complex Documents', () => {
    test('mixed block types', () => {
      const md = `# Heading

Paragraph with **bold** and *italic*.

- List item 1
- List item 2

> Blockquote

\`\`\`js
code
\`\`\`

---
`;
      const root = parse(md);

      const types = root.children.map(c => c.type);
      expect(types).toContain('heading');
      expect(types).toContain('paragraph');
      expect(types).toContain('list');
      expect(types).toContain('blockquote');
      expect(types).toContain('code');
      expect(types).toContain('thematicBreak');
    });
  });
});
