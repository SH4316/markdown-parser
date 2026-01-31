import { describe, test, expect } from 'bun:test';
import { tokenize, type Token, type LineType } from '../tokenizer';

describe('Tokenizer', () => {
  describe('Basic', () => {
    test('empty string returns empty array', () => {
      expect(tokenize('')).toEqual([]);
    });

    test('single line tracks position', () => {
      const tokens = tokenize('hello');
      expect(tokens).toHaveLength(1);
      expect(tokens[0].lineNumber).toBe(1);
      expect(tokens[0].offset).toBe(0);
    });

    test('multiple lines increment line number', () => {
      const tokens = tokenize('line1\nline2\nline3');
      expect(tokens).toHaveLength(3);
      expect(tokens[0].lineNumber).toBe(1);
      expect(tokens[1].lineNumber).toBe(2);
      expect(tokens[2].lineNumber).toBe(3);
    });

    test('offset accumulates correctly', () => {
      const tokens = tokenize('abc\ndefg');
      expect(tokens[0].offset).toBe(0);
      expect(tokens[1].offset).toBe(4); // 'abc\n' = 4 chars
    });

    test('raw preserves original line content', () => {
      const tokens = tokenize('# Hello World');
      expect(tokens[0].raw).toBe('# Hello World');
    });

    test('handles CRLF line endings', () => {
      const tokens = tokenize('line1\r\nline2');
      expect(tokens).toHaveLength(2);
      expect(tokens[0].raw).toBe('line1');
      expect(tokens[1].raw).toBe('line2');
    });

    test('handles CR line endings', () => {
      const tokens = tokenize('line1\rline2');
      expect(tokens).toHaveLength(2);
    });
  });

  describe('Tab Handling', () => {
    test('tab at start expands to 4 spaces of indent', () => {
      const tokens = tokenize('\tfoo');
      expect(tokens[0].indent).toBe(4);
    });

    test('tab after 1 char expands to 3 spaces', () => {
      const tokens = tokenize('a\tb');
      // 'a' at column 1, tab goes to column 5, so no leading indent
      expect(tokens[0].indent).toBe(0);
    });

    test('tab after 2 chars expands to 2 spaces', () => {
      const tokens = tokenize('ab\tc');
      expect(tokens[0].indent).toBe(0);
    });

    test('tab after 4 chars expands to 4 spaces', () => {
      const tokens = tokenize('abcd\te');
      expect(tokens[0].indent).toBe(0);
    });

    test('multiple tabs expand correctly', () => {
      const tokens = tokenize('\t\tfoo');
      expect(tokens[0].indent).toBe(8);
    });

    test('space then tab', () => {
      const tokens = tokenize(' \tfoo');
      // ' ' at col 1, tab goes to col 5 (next tab stop), so indent = 4
      expect(tokens[0].indent).toBe(4);
    });

    test('two spaces then tab', () => {
      const tokens = tokenize('  \tfoo');
      // '  ' at col 1-2, tab goes to col 5, so indent = 4
      expect(tokens[0].indent).toBe(4);
    });

    test('three spaces then tab', () => {
      const tokens = tokenize('   \tfoo');
      // '   ' at col 1-3, tab goes to col 5, so indent = 4
      expect(tokens[0].indent).toBe(4);
    });

    test('four spaces then tab', () => {
      const tokens = tokenize('    \tfoo');
      // '    ' at col 1-4, tab goes to col 9, so indent = 8
      expect(tokens[0].indent).toBe(8);
    });
  });

  describe('ATX Headings', () => {
    test('level 1 heading', () => {
      const tokens = tokenize('# Hello');
      expect(tokens[0].type).toBe('atxHeading');
      expect(tokens[0].headingLevel).toBe(1);
      expect(tokens[0].content).toBe('Hello');
    });

    test('level 2 heading', () => {
      const tokens = tokenize('## World');
      expect(tokens[0].type).toBe('atxHeading');
      expect(tokens[0].headingLevel).toBe(2);
      expect(tokens[0].content).toBe('World');
    });

    test('level 3 heading', () => {
      const tokens = tokenize('### Three');
      expect(tokens[0].headingLevel).toBe(3);
    });

    test('level 4 heading', () => {
      const tokens = tokenize('#### Four');
      expect(tokens[0].headingLevel).toBe(4);
    });

    test('level 5 heading', () => {
      const tokens = tokenize('##### Five');
      expect(tokens[0].headingLevel).toBe(5);
    });

    test('level 6 heading', () => {
      const tokens = tokenize('###### Deep');
      expect(tokens[0].type).toBe('atxHeading');
      expect(tokens[0].headingLevel).toBe(6);
    });

    test('7 hashes is not heading', () => {
      const tokens = tokenize('####### Too many');
      expect(tokens[0].type).not.toBe('atxHeading');
    });

    test('no space after hash is not heading', () => {
      const tokens = tokenize('#NoSpace');
      expect(tokens[0].type).not.toBe('atxHeading');
    });

    test('closing hashes are stripped', () => {
      const tokens = tokenize('# Hello #');
      expect(tokens[0].content).toBe('Hello');
    });

    test('closing hashes with trailing spaces', () => {
      const tokens = tokenize('## Title ##  ');
      expect(tokens[0].content).toBe('Title');
    });

    test('only hashes with space is empty heading', () => {
      const tokens = tokenize('# ');
      expect(tokens[0].type).toBe('atxHeading');
      expect(tokens[0].content).toBe('');
    });

    test('heading with only closing hashes', () => {
      const tokens = tokenize('# ###');
      expect(tokens[0].content).toBe('');
    });

    test('heading can have up to 3 spaces indent', () => {
      const tokens = tokenize('   # Indented');
      expect(tokens[0].type).toBe('atxHeading');
      expect(tokens[0].content).toBe('Indented');
    });

    test('4 space indent is not heading', () => {
      const tokens = tokenize('    # Code');
      expect(tokens[0].type).not.toBe('atxHeading');
    });
  });

  describe('Setext Underline', () => {
    test('equals is level 1', () => {
      const tokens = tokenize('===');
      expect(tokens[0].type).toBe('setextUnderline');
      expect(tokens[0].setextLevel).toBe(1);
    });

    test('dashes is level 2', () => {
      const tokens = tokenize('---');
      // Note: '---' can be both setext and thematic break
      // In context-free tokenizer, we classify based on pattern
      // Since it has no spaces between chars, it matches setext pattern first
      // But in CommonMark, --- is typically thematic break
      // Let's test setext specifically with content context later
      // For now, we test just dashes - which could be either
      const type = tokens[0].type;
      expect(type === 'setextUnderline' || type === 'thematicBreak').toBe(true);
    });

    test('single equals is setext', () => {
      const tokens = tokenize('=');
      expect(tokens[0].type).toBe('setextUnderline');
      expect(tokens[0].setextLevel).toBe(1);
    });

    test('long equals line', () => {
      const tokens = tokenize('========================');
      expect(tokens[0].type).toBe('setextUnderline');
    });

    test('mixed chars is not setext', () => {
      const tokens = tokenize('=-=');
      expect(tokens[0].type).not.toBe('setextUnderline');
    });

    test('setext with trailing spaces', () => {
      const tokens = tokenize('===   ');
      expect(tokens[0].type).toBe('setextUnderline');
    });

    test('setext with up to 3 space indent', () => {
      const tokens = tokenize('   ===');
      expect(tokens[0].type).toBe('setextUnderline');
    });

    test('4 space indent is not setext', () => {
      const tokens = tokenize('    ===');
      expect(tokens[0].type).not.toBe('setextUnderline');
    });
  });

  describe('Thematic Break', () => {
    test('three asterisks', () => {
      const tokens = tokenize('***');
      expect(tokens[0].type).toBe('thematicBreak');
    });

    test('three dashes with spaces', () => {
      const tokens = tokenize('- - -');
      expect(tokens[0].type).toBe('thematicBreak');
    });

    test('many underscores', () => {
      const tokens = tokenize('_______________');
      expect(tokens[0].type).toBe('thematicBreak');
    });

    test('asterisks with spaces', () => {
      const tokens = tokenize('* * *');
      expect(tokens[0].type).toBe('thematicBreak');
    });

    test('underscores with spaces', () => {
      const tokens = tokenize('_ _ _');
      expect(tokens[0].type).toBe('thematicBreak');
    });

    test('mixed spacing', () => {
      const tokens = tokenize('*  *  *');
      expect(tokens[0].type).toBe('thematicBreak');
    });

    test('only two chars is not thematic break', () => {
      const tokens = tokenize('**');
      expect(tokens[0].type).not.toBe('thematicBreak');
    });

    test('mixed chars is not thematic break', () => {
      const tokens = tokenize('*-*');
      expect(tokens[0].type).not.toBe('thematicBreak');
    });

    test('up to 3 space indent', () => {
      const tokens = tokenize('   ***');
      expect(tokens[0].type).toBe('thematicBreak');
    });

    test('4 space indent is not thematic break', () => {
      const tokens = tokenize('    ***');
      expect(tokens[0].type).not.toBe('thematicBreak');
    });

    test('trailing spaces allowed', () => {
      const tokens = tokenize('***   ');
      expect(tokens[0].type).toBe('thematicBreak');
    });
  });

  describe('List Markers', () => {
    test('dash bullet', () => {
      const tokens = tokenize('- item');
      expect(tokens[0].type).toBe('listMarker');
      expect(tokens[0].listType).toBe('bullet');
      expect(tokens[0].listMarker).toBe('-');
    });

    test('asterisk bullet', () => {
      const tokens = tokenize('* item');
      expect(tokens[0].type).toBe('listMarker');
      expect(tokens[0].listType).toBe('bullet');
      expect(tokens[0].listMarker).toBe('*');
    });

    test('plus bullet', () => {
      const tokens = tokenize('+ item');
      expect(tokens[0].type).toBe('listMarker');
      expect(tokens[0].listType).toBe('bullet');
      expect(tokens[0].listMarker).toBe('+');
    });

    test('ordered with dot', () => {
      const tokens = tokenize('1. item');
      expect(tokens[0].type).toBe('listMarker');
      expect(tokens[0].listType).toBe('ordered');
      expect(tokens[0].listStart).toBe(1);
      expect(tokens[0].listMarker).toBe('1.');
    });

    test('ordered with paren', () => {
      const tokens = tokenize('5) item');
      expect(tokens[0].type).toBe('listMarker');
      expect(tokens[0].listType).toBe('ordered');
      expect(tokens[0].listStart).toBe(5);
      expect(tokens[0].listMarker).toBe('5)');
    });

    test('large ordered number', () => {
      const tokens = tokenize('123456789. item');
      expect(tokens[0].type).toBe('listMarker');
      expect(tokens[0].listStart).toBe(123456789);
    });

    test('10 digit number is too large', () => {
      const tokens = tokenize('1234567890. item');
      expect(tokens[0].type).not.toBe('listMarker');
    });

    test('list marker with tab after', () => {
      const tokens = tokenize('-\titem');
      expect(tokens[0].type).toBe('listMarker');
    });

    test('indented list marker', () => {
      const tokens = tokenize('   - item');
      expect(tokens[0].type).toBe('listMarker');
    });

    test('4 space indent not list marker at top level', () => {
      // 4 space indent means indented code
      const tokens = tokenize('    - item');
      expect(tokens[0].type).toBe('indentedCode');
    });

    test('list content is extracted', () => {
      const tokens = tokenize('- hello world');
      expect(tokens[0].content).toBe('hello world');
    });

    test('ordered list content extracted', () => {
      const tokens = tokenize('1. hello');
      expect(tokens[0].content).toBe('hello');
    });
  });

  describe('Blockquote', () => {
    test('simple blockquote', () => {
      const tokens = tokenize('> quote');
      expect(tokens[0].type).toBe('blockquoteMarker');
      expect(tokens[0].content).toBe('quote');
    });

    test('blockquote without space', () => {
      const tokens = tokenize('>quote');
      expect(tokens[0].type).toBe('blockquoteMarker');
      expect(tokens[0].content).toBe('quote');
    });

    test('empty blockquote', () => {
      const tokens = tokenize('>');
      expect(tokens[0].type).toBe('blockquoteMarker');
      expect(tokens[0].content).toBe('');
    });

    test('nested blockquote markers', () => {
      const tokens = tokenize('> > nested');
      expect(tokens[0].type).toBe('blockquoteMarker');
      // First level strips '> ', content includes rest
      expect(tokens[0].content).toBe('> nested');
    });

    test('indented blockquote', () => {
      const tokens = tokenize('   > quote');
      expect(tokens[0].type).toBe('blockquoteMarker');
    });

    test('4 space indent is not blockquote', () => {
      const tokens = tokenize('    > quote');
      expect(tokens[0].type).not.toBe('blockquoteMarker');
    });
  });

  describe('Code Fence', () => {
    test('backtick fence', () => {
      const tokens = tokenize('```js');
      expect(tokens[0].type).toBe('codeFence');
      expect(tokens[0].fenceChar).toBe('`');
      expect(tokens[0].fenceLength).toBe(3);
      expect(tokens[0].codeLang).toBe('js');
    });

    test('tilde fence', () => {
      const tokens = tokenize('~~~');
      expect(tokens[0].type).toBe('codeFence');
      expect(tokens[0].fenceChar).toBe('~');
      expect(tokens[0].fenceLength).toBe(3);
    });

    test('long fence', () => {
      const tokens = tokenize('`````python');
      expect(tokens[0].fenceLength).toBe(5);
      expect(tokens[0].codeLang).toBe('python');
    });

    test('fence with no language', () => {
      const tokens = tokenize('```');
      expect(tokens[0].type).toBe('codeFence');
      expect(tokens[0].codeLang).toBe('');
    });

    test('fence with language and spaces', () => {
      const tokens = tokenize('``` javascript ');
      expect(tokens[0].codeLang).toBe('javascript');
    });

    test('fence with info string', () => {
      const tokens = tokenize('```ruby startline=3');
      expect(tokens[0].codeLang).toBe('ruby startline=3');
    });

    test('tilde fence cannot have backticks in info', () => {
      // Tilde fence can have backticks in info string
      const tokens = tokenize('~~~`test');
      expect(tokens[0].type).toBe('codeFence');
    });

    test('backtick fence cannot have backticks in info', () => {
      const tokens = tokenize('```test`code');
      // Backticks in info string not allowed for backtick fence
      expect(tokens[0].type).not.toBe('codeFence');
    });

    test('indented fence', () => {
      const tokens = tokenize('   ```js');
      expect(tokens[0].type).toBe('codeFence');
    });

    test('4 space indent is not fence', () => {
      const tokens = tokenize('    ```');
      expect(tokens[0].type).not.toBe('codeFence');
    });
  });

  describe('Indented Code', () => {
    test('4 spaces is indented code', () => {
      const tokens = tokenize('    code');
      expect(tokens[0].type).toBe('indentedCode');
      expect(tokens[0].content).toBe('code');
    });

    test('tab is indented code', () => {
      const tokens = tokenize('\tcode');
      expect(tokens[0].type).toBe('indentedCode');
      expect(tokens[0].indent).toBe(4);
    });

    test('5 spaces is indented code', () => {
      const tokens = tokenize('     code');
      expect(tokens[0].type).toBe('indentedCode');
      expect(tokens[0].content).toBe(' code'); // 1 extra space
    });

    test('3 spaces is not indented code', () => {
      const tokens = tokenize('   text');
      expect(tokens[0].type).not.toBe('indentedCode');
    });
  });

  describe('Blank Line', () => {
    test('whitespace only is blank', () => {
      const tokens = tokenize('   ');
      expect(tokens[0].type).toBe('blank');
    });

    test('tab only is blank', () => {
      const tokens = tokenize('\t');
      expect(tokens[0].type).toBe('blank');
    });

    test('mixed whitespace is blank', () => {
      const tokens = tokenize('  \t  ');
      expect(tokens[0].type).toBe('blank');
    });
  });

  describe('Paragraph', () => {
    test('regular text is paragraph', () => {
      const tokens = tokenize('Hello world');
      expect(tokens[0].type).toBe('paragraph');
      expect(tokens[0].content).toBe('Hello world');
    });

    test('text with leading spaces (less than 4)', () => {
      const tokens = tokenize('   text');
      expect(tokens[0].type).toBe('paragraph');
      expect(tokens[0].content).toBe('text');
      expect(tokens[0].indent).toBe(3);
    });
  });

  describe('Complex Documents', () => {
    test('mixed content', () => {
      const doc = `# Heading

Paragraph text.

- List item
- Another item

> Quote

\`\`\`js
code
\`\`\``;
      const tokens = tokenize(doc);
      
      expect(tokens[0].type).toBe('atxHeading');
      expect(tokens[1].type).toBe('blank');
      expect(tokens[2].type).toBe('paragraph');
      expect(tokens[3].type).toBe('blank');
      expect(tokens[4].type).toBe('listMarker');
      expect(tokens[5].type).toBe('listMarker');
      expect(tokens[6].type).toBe('blank');
      expect(tokens[7].type).toBe('blockquoteMarker');
      expect(tokens[8].type).toBe('blank');
      expect(tokens[9].type).toBe('codeFence');
      expect(tokens[10].type).toBe('paragraph'); // 'code' inside fence is just text
      expect(tokens[11].type).toBe('codeFence');
    });

    test('position tracking across document', () => {
      const doc = '# H1\n\nPara';
      const tokens = tokenize(doc);
      
      expect(tokens[0].lineNumber).toBe(1);
      expect(tokens[0].offset).toBe(0);
      
      expect(tokens[1].lineNumber).toBe(2);
      expect(tokens[1].offset).toBe(5); // '# H1\n'
      
      expect(tokens[2].lineNumber).toBe(3);
      expect(tokens[2].offset).toBe(6); // '# H1\n\n'
    });
  });
});
