# API 문서

이 문서는 Markdown 파서의 공개 API를 완전히 설명합니다.

## 주요 함수

### parse(markdown: string): Root

전체 Markdown 문자열을 파싱하여 MDAST 호환 AST의 루트 노드를 반환합니다. 이것이 가장 일반적으로 사용되는 함수입니다.

**매개변수:**
- `markdown` (string): 파싱할 Markdown 텍스트

**반환값:**
- `Root`: 문서의 최상위 노드로, 모든 블록 요소를 자식으로 포함합니다.

**예시:**
```typescript
import { parse } from 'markdown-parser';

const markdown = `# 제목

이것은 **굵은 글씨**입니다.

- 항목 1
- 항목 2
`;

const ast = parse(markdown);
console.log(ast.type); // 'root'
console.log(ast.children.length); // 3
```

### parseBlocks(markdown: string): BlockParseResult

블록 레벨 요소(제목, 단락, 목록, 코드 블록 등)만 파싱합니다. 참조 정의(Link Reference Definitions)도 함께 반환합니다. 이 함수는 `parse` 함수의 내부에서 사용됩니다.

**매개변수:**
- `markdown` (string): 파싱할 Markdown 텍스트

**반환값:**
- `BlockParseResult`: 다음 속성을 포함하는 객체
  - `root` (Root): 파싱된 블록 구조의 루트 노드
  - `references` (ReferenceMap): 링크 참조 정의 맵

**예시:**
```typescript
import { parseBlocks } from 'markdown-parser';

const markdown = `# 제목

[ref]: https://example.com "예제"

단락 텍스트
`;

const { root, references } = parseBlocks(markdown);
console.log(root.children[0].type); // 'heading'
console.log(references.get('ref')); // { url: 'https://example.com', title: '예제' }
```

### parseInline(text: string, references: ReferenceMap, startPosition?: Point): PhrasingContent[]

인라인 요소(강조, 링크, 코드 등)만 파싱합니다. 블록 파싱 단계에서 얻은 참조 맵이 필요합니다. 이 함수는 각 블록의 텍스트 내용을 처리하는 데 사용됩니다.

**매개변수:**
- `text` (string): 파싱할 인라인 텍스트
- `references` (ReferenceMap): 링크 참조 정의 맵
- `startPosition` (Point, 선택사항): 위치 추적을 위한 시작 위치

**반환값:**
- `PhrasingContent[]`: 파싱된 인라인 노드의 배열

**예시:**
```typescript
import { parseInline } from 'markdown-parser';

const text = '**굵게** 및 *기울임* 그리고 `코드`';
const references = new Map();
const nodes = parseInline(text, references);

console.log(nodes[0].type); // 'strong'
console.log(nodes[2].type); // 'emphasis'
console.log(nodes[4].type); // 'inlineCode'
```

### tokenize(input: string): Token[]

Markdown 입력을 라인 단위 토큰으로 분해합니다. 각 토큰은 라인의 타입, 내용, 위치 정보를 포함합니다. 이것은 저수준 API로, 일반적으로 직접 사용할 필요가 없습니다.

**매개변수:**
- `input` (string): 토큰화할 Markdown 텍스트

**반환값:**
- `Token[]`: 파싱된 토큰의 배열

**예시:**
```typescript
import { tokenize } from 'markdown-parser';

const markdown = `# 제목

단락`;

const tokens = tokenize(markdown);
console.log(tokens[0].type); // 'atxHeading'
console.log(tokens[0].headingLevel); // 1
console.log(tokens[1].type); // 'blank'
console.log(tokens[2].type); // 'paragraph'
```

## 내보낸 타입

### 기본 타입

#### Point
위치 정보의 한 지점을 나타냅니다.

```typescript
interface Point {
  line: number;      // 1부터 시작하는 라인 번호
  column: number;    // 1부터 시작하는 열 번호
  offset: number;    // 문자열의 시작부터의 오프셋
}
```

#### Position
노드의 시작과 끝 위치를 나타냅니다.

```typescript
interface Position {
  start: Point;  // 노드의 시작 위치
  end: Point;    // 노드의 끝 위치
}
```

#### Node
모든 AST 노드의 기본 인터페이스입니다.

```typescript
interface Node {
  type: string;           // 노드의 타입
  position?: Position;    // 소스 코드 내의 위치 (선택사항)
}
```

#### Parent
자식 노드를 포함하는 노드의 인터페이스입니다.

```typescript
interface Parent extends Node {
  children: Node[];  // 자식 노드의 배열
}
```

#### Literal
문자열 값을 가지는 노드의 인터페이스입니다.

```typescript
interface Literal extends Node {
  value: string;  // 노드의 문자열 값
}
```

### 블록 노드 타입

#### Root
문서의 최상위 노드입니다.

```typescript
interface Root extends Parent {
  type: 'root';
}
```

#### Heading
제목 노드입니다 (레벨 1-6).

```typescript
interface Heading extends Parent {
  type: 'heading';
  depth: 1 | 2 | 3 | 4 | 5 | 6;  // 제목의 깊이
}
```

#### Paragraph
단락 노드입니다.

```typescript
interface Paragraph extends Parent {
  type: 'paragraph';
}
```

#### List
순서가 있거나 없는 목록 노드입니다.

```typescript
interface List extends Parent {
  type: 'list';
  ordered: boolean;    // true면 순서 있는 목록, false면 순서 없는 목록
  start?: number;      // 순서 있는 목록의 시작 번호
  spread: boolean;     // 항목 사이에 빈 줄이 있는지 여부
}
```

#### ListItem
목록의 개별 항목 노드입니다.

```typescript
interface ListItem extends Parent {
  type: 'listItem';
  spread: boolean;  // 항목 내에 빈 줄이 있는지 여부
}
```

#### Code
코드 블록 노드입니다 (펜스 코드 블록).

```typescript
interface Code extends Literal {
  type: 'code';
  lang?: string;   // 프로그래밍 언어 (예: 'typescript', 'python')
  meta?: string;   // 추가 메타데이터
}
```

#### Blockquote
인용구 노드입니다.

```typescript
interface Blockquote extends Parent {
  type: 'blockquote';
}
```

#### ThematicBreak
가로 구분선 노드입니다.

```typescript
interface ThematicBreak extends Node {
  type: 'thematicBreak';
}
```

### 인라인 노드 타입

#### Text
일반 텍스트 노드입니다.

```typescript
interface Text extends Literal {
  type: 'text';
}
```

#### Strong
굵은 글씨 노드입니다.

```typescript
interface Strong extends Parent {
  type: 'strong';
}
```

#### Emphasis
기울임 글씨 노드입니다.

```typescript
interface Emphasis extends Parent {
  type: 'emphasis';
}
```

#### Link
하이퍼링크 노드입니다.

```typescript
interface Link extends Parent {
  type: 'link';
  url: string;      // 링크 URL
  title?: string;   // 링크 제목 (선택사항)
}
```

#### Image
이미지 노드입니다.

```typescript
interface Image extends Node {
  type: 'image';
  url: string;      // 이미지 URL
  alt?: string;     // 대체 텍스트
  title?: string;   // 이미지 제목
}
```

#### InlineCode
인라인 코드 노드입니다.

```typescript
interface InlineCode extends Literal {
  type: 'inlineCode';
}
```

#### Break
강제 줄바꿈 노드입니다.

```typescript
interface Break extends Node {
  type: 'break';
}
```

### 참조 관련 타입

#### Definition
링크 참조 정의 노드입니다.

```typescript
interface Definition extends Node {
  type: 'definition';
  identifier: string;  // 참조 식별자
  label?: string;      // 참조 레이블
  url: string;         // 링크 URL
  title?: string;      // 링크 제목
}
```

#### LinkReference
링크 참조 노드입니다.

```typescript
interface LinkReference extends Parent {
  type: 'linkReference';
  identifier: string;                           // 참조 식별자
  label?: string;                               // 참조 레이블
  referenceType: 'full' | 'collapsed' | 'shortcut';  // 참조 타입
}
```

#### ImageReference
이미지 참조 노드입니다.

```typescript
interface ImageReference extends Node {
  type: 'imageReference';
  identifier: string;                           // 참조 식별자
  label?: string;                               // 참조 레이블
  alt?: string;                                 // 대체 텍스트
  referenceType: 'full' | 'collapsed' | 'shortcut';  // 참조 타입
}
```

### 유니온 타입

#### FlowContent
블록 레벨 콘텐츠의 유니온 타입입니다.

```typescript
type FlowContent =
  | Heading
  | Paragraph
  | Code
  | Blockquote
  | List
  | ThematicBreak
  | Definition;
```

#### PhrasingContent
인라인 레벨 콘텐츠의 유니온 타입입니다.

```typescript
type PhrasingContent =
  | Text
  | Strong
  | Emphasis
  | Link
  | Image
  | InlineCode
  | Break
  | LinkReference
  | ImageReference;
```

#### ListContent
목록 콘텐츠의 유니온 타입입니다.

```typescript
type ListContent = ListItem;
```

### 유틸리티 타입

#### ReferenceMap
링크 참조 정의를 저장하는 맵입니다.

```typescript
type ReferenceMap = Map<string, { url: string; title?: string }>;
```

#### BlockParseResult
블록 파싱 결과를 나타냅니다.

```typescript
interface BlockParseResult {
  root: Root;                    // 파싱된 블록 구조
  references: ReferenceMap;      // 링크 참조 정의
}
```

#### Token
토큰화된 라인을 나타냅니다.

```typescript
interface Token {
  type: LineType;        // 라인의 타입
  raw: string;           // 원본 라인 텍스트
  content: string;       // 처리된 콘텐츠
  lineNumber: number;    // 라인 번호
  offset: number;        // 문자열 오프셋
  indent: number;        // 들여쓰기 수준
  headingLevel?: number; // ATX 제목의 레벨
  setextLevel?: number;  // Setext 제목의 레벨
  listType?: 'bullet' | 'ordered';  // 목록 타입
  listStart?: number;    // 순서 있는 목록의 시작 번호
  listMarker?: string;   // 목록 마커
  fenceChar?: string;    // 코드 펜스 문자
  fenceLength?: number;  // 코드 펜스 길이
  codeLang?: string;     // 코드 언어
}
```

#### LineType
라인의 타입을 나타냅니다.

```typescript
type LineType =
  | 'blank'              // 빈 라인
  | 'atxHeading'         // ATX 제목 (# 형식)
  | 'setextUnderline'    // Setext 제목 밑줄
  | 'thematicBreak'      // 가로 구분선
  | 'listMarker'         // 목록 마커
  | 'blockquoteMarker'   // 인용구 마커
  | 'codeFence'          // 코드 펜스
  | 'indentedCode'       // 들여쓰기 코드
  | 'paragraph'          // 단락
  | 'other';             // 기타
```

## 사용 예시

### 기본 파싱

```typescript
import { parse } from 'markdown-parser';

const markdown = `# 안녕하세요

이것은 **굵은 글씨**와 *기울임*이 포함된 단락입니다.

- 항목 1
- 항목 2

[링크](https://example.com)
`;

const ast = parse(markdown);
console.log(JSON.stringify(ast, null, 2));
```

### 특정 노드 타입 찾기

```typescript
import { parse } from 'markdown-parser';

const ast = parse(markdown);

// 모든 제목 찾기
const headings = ast.children.filter(node => node.type === 'heading');

// 모든 링크 찾기
function findLinks(node) {
  const links = [];
  if (node.type === 'link') {
    links.push(node);
  }
  if ('children' in node) {
    for (const child of node.children) {
      links.push(...findLinks(child));
    }
  }
  return links;
}

const allLinks = ast.children.flatMap(findLinks);
```

### 위치 정보 활용

```typescript
import { parse } from 'markdown-parser';

const ast = parse(markdown);

for (const node of ast.children) {
  if (node.position) {
    console.log(
      `${node.type}: 라인 ${node.position.start.line} ~ ${node.position.end.line}`
    );
  }
}
```

### 저수준 토큰화

```typescript
import { tokenize } from 'markdown-parser';

const tokens = tokenize(markdown);

for (const token of tokens) {
  console.log(`${token.type}: "${token.content}"`);
}
```
