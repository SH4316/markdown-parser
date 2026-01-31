import { describe, test, expect } from 'bun:test';
import type { Root, Heading, Text, Position } from '../types';

describe('Type Infrastructure', () => {
  test('Root node structure is valid', () => {
    const root: Root = {
      type: 'root',
      children: []
    };
    expect(root.type).toBe('root');
    expect(root.children).toEqual([]);
  });

  test('Position tracking works', () => {
    const pos: Position = {
      start: { line: 1, column: 1, offset: 0 },
      end: { line: 1, column: 10, offset: 9 }
    };
    expect(pos.start.line).toBe(1);
    expect(pos.end.offset).toBe(9);
  });

  test('Heading with text child is valid', () => {
    const text: Text = { type: 'text', value: 'Hello' };
    const heading: Heading = {
      type: 'heading',
      depth: 1,
      children: [text]
    };
    expect(heading.depth).toBe(1);
    expect(heading.children[0]).toBe(text);
  });
});
