# Markdown Parser

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![CommonMark](https://img.shields.io/badge/CommonMark-0.31.2-000000?style=flat-square)](https://commonmark.org/)
[![Bun](https://img.shields.io/badge/Bun-%23000000.svg?style=flat-square&logo=bun&logoColor=white)](https://bun.sh/)

TypeScript로 작성된 강력하고 가벼운 Markdown 파서입니다. Markdown 텍스트를 [MDAST(Markdown Abstract Syntax Tree)](https://github.com/syntax-tree/mdast) 호환 트리 구조로 변환합니다.

## 주요 특징

- **CommonMark 준수**: CommonMark 사양(0.31.2)을 충실히 따릅니다.
- **MDAST 호환**: 출력 형식이 MDAST 사양을 준수하여 다른 도구와의 호환성이 뛰어납니다.
- **TypeScript 지원**: 모든 노드와 API에 대한 완벽한 타입 정의를 제공합니다.
- **위치 추적**: 모든 노드에 소스 코드 내의 위치 정보(행, 열, 오프셋)가 포함됩니다.
- **의존성 제로**: 외부 런타임 의존성이 없어 가볍고 빠릅니다.
- **Bun 최적화**: Bun 런타임에서 최고의 성능을 발휘하도록 설계되었습니다.

## 문서

상세한 문서는 `./docs` 디렉토리에서 확인할 수 있습니다.

| 문서 | 설명 | 대상 독자 |
|------|------|-----------|
| [docs/README.md](./docs/README.md) | 문서 목차 및 탐색 가이드 | 모든 사용자 |
| [docs/types.md](./docs/types.md) | MDAST 타입 정의 및 계층 구조 | 타입 정의가 궁금한 개발자 |
| [docs/tokenizer.md](./docs/tokenizer.md) | 라인 기반 토큰화 및 위치 추적 메커니즘 | 내부 구조를 이해하고 싶은 개발자 |
| [docs/block-parser.md](./docs/block-parser.md) | 블록 레벨 파싱 알고리즘 (컨테이너/리프 블록) | 파서 구현에 관심 있는 개발자 |
| [docs/inline-parser.md](./docs/inline-parser.md) | 인라인 파싱 및 델리미터 스택 알고리즘 | 파서 구현에 관심 있는 개발자 |
| [docs/architecture.md](./docs/architecture.md) | 2단계 파싱 아키텍처 개요 | 시스템 설계를 이해하고 싶은 개발자 |
| [docs/api.md](./docs/api.md) | 완전한 API 레퍼런스 및 사용 예시 | 라이브러리 사용자 |

**빠른 선택 가이드:**
- 라이브러리를 처음 사용하시나요? → [docs/api.md](./docs/api.md)에서 `parse()` 함수를 확인하세요.
- AST 노드 타입이 궁금하신가요? → [docs/types.md](./docs/types.md)를 참조하세요.
- 내부 동작 원리를 이해하고 싶으신가요? → [docs/architecture.md](./docs/architecture.md)부터 시작하세요.

## 설치 방법

원하는 패키지 매니저를 사용하여 설치하세요:

### Bun
```bash
bun add markdown-parser
```

### npm
```bash
npm install markdown-parser
```

### pnpm
```bash
pnpm add markdown-parser
```

## 빠른 시작

가장 간단한 사용 방법은 `parse` 함수를 사용하는 것입니다.

```typescript
import { parse } from 'markdown-parser';

const markdown = `# 안녕하세요!

이것은 **굵은 글씨**와 \`인라인 코드\`가 포함된 문장입니다.

- 항목 1
- 항목 2

[Google로 이동](https://google.com)
`;

const ast = parse(markdown);
console.log(JSON.stringify(ast, null, 2));
```

### 출력 예시 (JSON)

```json
{
  "type": "root",
  "children": [
    {
      "type": "heading",
      "depth": 1,
      "children": [
        { "type": "text", "value": "안녕하세요!" }
      ],
      "position": {
        "start": { "line": 1, "column": 1, "offset": 0 },
        "end": { "line": 1, "column": 8, "offset": 7 }
      }
    },
    {
      "type": "paragraph",
      "children": [
        { "type": "text", "value": "이것은 " },
        {
          "type": "strong",
          "children": [{ "type": "text", "value": "굵은 글씨" }]
        },
        { "type": "text", "value": "와 " },
        { "type": "inlineCode", "value": "인라인 코드" },
        { "type": "text", "value": "가 포함된 문장입니다." }
      ]
    }
  ]
}
```

## API 문서

### `parse(markdown: string): Root`
전체 Markdown 문자열을 파싱하여 AST의 루트 노드를 반환합니다. 가장 일반적으로 사용되는 함수입니다.

### `parseBlocks(markdown: string): BlockParseResult`
블록 레벨 요소(제목, 단락, 목록 등)만 파싱합니다. 참조 정의(Link Reference Definitions)를 함께 반환합니다.

```typescript
import { parseBlocks } from 'markdown-parser';

const { root, references } = parseBlocks('# 제목\n\n[ref]: /url');
```

### `parseInline(text: string, references: ReferenceMap): PhrasingContent[]`
인라인 요소(강조, 링크, 코드 등)만 파싱합니다. 블록 파싱 단계에서 얻은 참조 맵이 필요합니다.

```typescript
import { parseInline } from 'markdown-parser';

const nodes = parseInline('**굵게** 및 *기울임*', new Map());
```

### `tokenize(input: string): Token[]`
Markdown 입력을 라인 단위 토큰으로 분해합니다. 저수준 제어가 필요한 경우에 사용합니다.

## 지원하는 구문

### 블록 요소 (Block Elements)

| 유형 | 설명 | 예시 |
|------|-------------|------|
| `root` | 문서의 최상위 노드 | - |
| `heading` | 제목 (Level 1-6) | `# 제목` |
| `paragraph` | 일반 단락 | `텍스트 내용` |
| `blockquote` | 인용구 | `> 인용 내용` |
| `list` | 순서가 있거나 없는 목록 | `- 항목` 또는 `1. 항목` |
| `listItem` | 목록의 개별 항목 | `- 항목` |
| `code` | 코드 블록 (Fenced) | ` ```js ... ``` ` |
| `thematicBreak` | 가로 구분선 | `---` |

### 인라인 요소 (Inline Elements)

| 유형 | 설명 | 예시 |
|------|-------------|------|
| `text` | 일반 텍스트 | `안녕` |
| `strong` | 굵게 | `**강조**` |
| `emphasis` | 기울임 | `*강조*` |
| `inlineCode` | 인라인 코드 | `` `code` `` |
| `link` | 하이퍼링크 | `[링크](url)` |
| `image` | 이미지 | `![설명](url)` |
| `break` | 강제 줄바꿈 | `  ` (공백 두 개) |

## 고급 활용 예시

### 노드 필터링 및 변환
AST를 순회하며 특정 노드만 추출하거나 수정할 수 있습니다.

```typescript
import { parse } from 'markdown-parser';

const ast = parse(markdown);

// 모든 제목(heading) 노드 찾기
const headings = ast.children.filter(node => node.type === 'heading');
```

### 위치 정보 활용
에디터 등에서 특정 노드가 소스 코드의 어디에 위치하는지 알 수 있습니다.

```typescript
const firstNode = ast.children[0];
console.log(`시작 위치: ${firstNode.position.start.line}행 ${firstNode.position.start.column}열`);
```

## 개발 설정

프로젝트 기여를 위한 설정 방법입니다:

```bash
# 의존성 설치
bun install

# 테스트 실행
bun test

# 타입 체크
bunx tsc --noEmit
```

## 아키텍처 개요

이 파서는 다음과 같은 단계로 작동합니다:
1. **Tokenizer**: 입력을 라인 단위로 토큰화하고 위치 정보를 계산합니다.
2. **Block Parser**: 토큰을 분석하여 블록 구조(목록, 인용구 등)를 형성합니다.
3. **Inline Parser**: 각 블록 내부의 텍스트를 분석하여 인라인 요소(강조, 링크 등)를 파싱합니다.
4. **Processor**: 모든 정보를 결합하여 최종 MDAST 트리를 생성합니다.

## 타입 정의 (Type Definitions)

모든 주요 타입은 라이브러리에서 직접 내보내집니다:

```typescript
import type {
  Root, Heading, Paragraph, Text, Strong, Emphasis,
  Link, Image, InlineCode, Code, List, ListItem,
  Blockquote, ThematicBreak, Break, Position, Point
} from 'markdown-parser';
```

## 제한 사항

- 현재 GFM(GitHub Flavored Markdown) 확장 기능(표, 취소선, 작업 목록 등)은 지원하지 않습니다.
- HTML 렌더링 기능은 포함되어 있지 않습니다 (AST 생성 전용).

## 라이선스

MIT License. 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.
