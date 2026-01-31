import { describe, test, expect } from 'bun:test';
import { parseInline, type ReferenceMap } from '../inline-parser';
import type { Text, Strong, Emphasis, Link, Image, InlineCode, Break } from '../types';

const emptyRefs: ReferenceMap = new Map();

describe('Inline Parser', () => {
  describe('Plain Text', () => {
    test('plain text returns text node', () => {
      const nodes = parseInline('hello world', emptyRefs);
      expect(nodes).toHaveLength(1);
      expect(nodes[0].type).toBe('text');
      expect((nodes[0] as Text).value).toBe('hello world');
    });

    test('empty string returns empty array', () => {
      const nodes = parseInline('', emptyRefs);
      expect(nodes).toHaveLength(0);
    });
  });

  describe('Code Spans', () => {
    test('single backticks', () => {
      const nodes = parseInline('`code`', emptyRefs);
      expect(nodes).toHaveLength(1);
      expect(nodes[0].type).toBe('inlineCode');
      expect((nodes[0] as InlineCode).value).toBe('code');
    });

    test('double backticks', () => {
      const nodes = parseInline('``code with ` inside``', emptyRefs);
      expect(nodes[0].type).toBe('inlineCode');
      expect((nodes[0] as InlineCode).value).toBe('code with ` inside');
    });

    test('code preserves content literally', () => {
      const nodes = parseInline('`*not emphasis*`', emptyRefs);
      expect((nodes[0] as InlineCode).value).toBe('*not emphasis*');
    });

    test('text before and after code', () => {
      const nodes = parseInline('before `code` after', emptyRefs);
      expect(nodes).toHaveLength(3);
      expect(nodes[0].type).toBe('text');
      expect(nodes[1].type).toBe('inlineCode');
      expect(nodes[2].type).toBe('text');
    });
  });

  describe('Backslash Escapes', () => {
    test('escaped asterisk', () => {
      const nodes = parseInline('\\*not emphasis\\*', emptyRefs);
      expect(nodes).toHaveLength(1);
      expect(nodes[0].type).toBe('text');
      expect((nodes[0] as Text).value).toBe('*not emphasis*');
    });

    test('escaped backslash', () => {
      const nodes = parseInline('\\\\', emptyRefs);
      expect((nodes[0] as Text).value).toBe('\\');
    });
  });

  describe('Entity References', () => {
    test('named entity amp', () => {
      const nodes = parseInline('&amp;', emptyRefs);
      expect((nodes[0] as Text).value).toBe('&');
    });

    test('named entity lt', () => {
      const nodes = parseInline('&lt;', emptyRefs);
      expect((nodes[0] as Text).value).toBe('<');
    });

    test('numeric entity decimal', () => {
      const nodes = parseInline('&#65;', emptyRefs);
      expect((nodes[0] as Text).value).toBe('A');
    });

    test('numeric entity hex', () => {
      const nodes = parseInline('&#x41;', emptyRefs);
      expect((nodes[0] as Text).value).toBe('A');
    });
  });

  describe('Emphasis', () => {
    test('asterisk emphasis', () => {
      const nodes = parseInline('*em*', emptyRefs);
      expect(nodes).toHaveLength(1);
      expect(nodes[0].type).toBe('emphasis');
      const em = nodes[0] as Emphasis;
      expect(em.children).toHaveLength(1);
      expect((em.children[0] as Text).value).toBe('em');
    });

    test('underscore emphasis', () => {
      const nodes = parseInline('_em_', emptyRefs);
      expect(nodes[0].type).toBe('emphasis');
    });

    test('emphasis with text around', () => {
      const nodes = parseInline('before *em* after', emptyRefs);
      expect(nodes.length).toBeGreaterThanOrEqual(3);
      expect(nodes.some(n => n.type === 'emphasis')).toBe(true);
    });
  });

  describe('Strong', () => {
    test('double asterisk', () => {
      const nodes = parseInline('**strong**', emptyRefs);
      expect(nodes[0].type).toBe('strong');
      expect((nodes[0] as Strong).children).toHaveLength(1);
    });

    test('double underscore', () => {
      const nodes = parseInline('__strong__', emptyRefs);
      expect(nodes[0].type).toBe('strong');
    });
  });

  describe('Strong + Emphasis', () => {
    test('triple asterisk', () => {
      const nodes = parseInline('***both***', emptyRefs);
      expect(nodes).toHaveLength(1);
      const outer = nodes[0];
      expect(outer.type === 'strong' || outer.type === 'emphasis').toBe(true);
    });
  });

  describe('Links', () => {
    test('inline link', () => {
      const nodes = parseInline('[text](url)', emptyRefs);
      expect(nodes).toHaveLength(1);
      expect(nodes[0].type).toBe('link');
      const link = nodes[0] as Link;
      expect(link.url).toBe('url');
      expect(link.children).toHaveLength(1);
    });

    test('inline link with title', () => {
      const nodes = parseInline('[text](url "title")', emptyRefs);
      const link = nodes[0] as Link;
      expect(link.title).toBe('title');
    });

    test('full reference link', () => {
      const refs: ReferenceMap = new Map([['ref', { url: '/url', title: 'Title' }]]);
      const nodes = parseInline('[text][ref]', refs);
      expect(nodes[0].type).toBe('link');
      const link = nodes[0] as Link;
      expect(link.url).toBe('/url');
    });

    test('collapsed reference link', () => {
      const refs: ReferenceMap = new Map([['text', { url: '/url' }]]);
      const nodes = parseInline('[text][]', refs);
      expect(nodes[0].type).toBe('link');
    });

    test('shortcut reference link', () => {
      const refs: ReferenceMap = new Map([['text', { url: '/url' }]]);
      const nodes = parseInline('[text]', refs);
      expect(nodes[0].type).toBe('link');
    });

    test('undefined reference becomes text', () => {
      const nodes = parseInline('[undefined]', emptyRefs);
      expect(nodes[0].type).toBe('text');
    });

    test('url with parentheses', () => {
      const nodes = parseInline('[text](url_(with)_parens)', emptyRefs);
      const link = nodes[0] as Link;
      expect(link.url).toBe('url_(with)_parens');
    });
  });

  describe('Images', () => {
    test('inline image', () => {
      const nodes = parseInline('![alt](url)', emptyRefs);
      expect(nodes).toHaveLength(1);
      expect(nodes[0].type).toBe('image');
      const img = nodes[0] as Image;
      expect(img.url).toBe('url');
      expect(img.alt).toBe('alt');
    });

    test('inline image with title', () => {
      const nodes = parseInline('![alt](url "title")', emptyRefs);
      const img = nodes[0] as Image;
      expect(img.title).toBe('title');
    });

    test('reference image', () => {
      const refs: ReferenceMap = new Map([['ref', { url: '/img.png' }]]);
      const nodes = parseInline('![alt][ref]', refs);
      expect(nodes[0].type).toBe('image');
    });
  });

  describe('Hard Line Breaks', () => {
    test('two spaces before newline', () => {
      const nodes = parseInline('line1  \nline2', emptyRefs);
      const breakNode = nodes.find(n => n.type === 'break');
      expect(breakNode).toBeDefined();
    });

    test('backslash before newline', () => {
      const nodes = parseInline('line1\\\nline2', emptyRefs);
      const breakNode = nodes.find(n => n.type === 'break');
      expect(breakNode).toBeDefined();
    });
  });

  describe('Flanking Rules', () => {
    test('underscore in word is not emphasis', () => {
      const nodes = parseInline('foo_bar_baz', emptyRefs);
      expect(nodes).toHaveLength(1);
      expect(nodes[0].type).toBe('text');
    });
  });

  describe('Complex Cases', () => {
    test('multiple inline types', () => {
      const nodes = parseInline('**bold** and *italic* and `code`', emptyRefs);
      expect(nodes.some(n => n.type === 'strong')).toBe(true);
      expect(nodes.some(n => n.type === 'emphasis')).toBe(true);
      expect(nodes.some(n => n.type === 'inlineCode')).toBe(true);
    });

    test('link with emphasis in text', () => {
      const nodes = parseInline('[*emphasized* link](url)', emptyRefs);
      const link = nodes[0] as Link;
      expect(link.children.some(c => c.type === 'emphasis')).toBe(true);
    });
  });
});
