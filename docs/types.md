# 타입 정의 (Types)

이 문서는 Markdown Parser에서 사용하는 모든 데이터 구조와 타입 정의에 대해 설명합니다. 본 프로젝트는 [MDAST(Markdown Abstract Syntax Tree)](https://github.com/syntax-tree/mdast) 사양을 기반으로 하며, 모든 노드는 TypeScript 인터페이스로 엄격하게 정의되어 있습니다.

## 기본 인터페이스

모든 AST 노드는 다음의 기본 인터페이스 중 하나를 상속받습니다.

### Point
소스 코드 내의 특정 지점을 나타냅니다.
- `line`: 행 번호 (1부터 시작)
- `column`: 열 번호 (1부터 시작)
- `offset`: 전체 문자열에서의 인덱스 (0부터 시작)

```typescript
export interface Point {
  line: number;
  column: number;
  offset: number;
}
```

### Position
노드가 차지하는 소스 코드상의 범위를 나타냅니다.
- `start`: 시작 지점
- `end`: 종료 지점

```typescript
export interface Position {
  start: Point;
  end: Point;
}
```

### Node
모든 노드의 최상위 인터페이스입니다.
- `type`: 노드의 유형을 나타내는 문자열
- `position`: (선택 사항) 노드의 위치 정보

```typescript
export interface Node {
  type: string;
  position?: Position;
}
```

### Parent
자식 노드를 가질 수 있는 노드입니다.
- `children`: 자식 노드들의 배열

```typescript
export interface Parent extends Node {
  children: Node[];
}
```

### Literal
텍스트 값을 직접 가지는 노드입니다.
- `value`: 노드가 포함하는 문자열 값

```typescript
export interface Literal extends Node {
  value: string;
}
```

## 블록 노드 (Block Nodes)

문서의 구조를 형성하는 큰 단위의 요소들입니다.

### Root
AST의 최상위 노드입니다.
- `type`: 'root'

### Heading
제목을 나타냅니다.
- `type`: 'heading'
- `depth`: 제목의 수준 (1~6)

### Paragraph
일반적인 텍스트 단락입니다.
- `type`: 'paragraph'

### List
목록을 나타냅니다.
- `type`: 'list'
- `ordered`: 순서 있는 목록 여부
- `start`: (선택 사항) 시작 번호
- `spread`: 목록 항목 간의 간격 여부 (Loose/Tight)

### ListItem
목록의 개별 항목입니다.
- `type`: 'listItem'
- `spread`: 항목 내부의 간격 여부

### Code
코드 블록을 나타냅니다.
- `type`: 'code'
- `lang`: (선택 사항) 프로그래밍 언어
- `meta`: (선택 사항) 추가 메타 정보

### Blockquote
인용구를 나타냅니다.
- `type`: 'blockquote'

### ThematicBreak
가로 구분선입니다.
- `type`: 'thematicBreak'

## 인라인 노드 (Inline Nodes)

단락이나 제목 내부에서 텍스트의 스타일이나 기능을 정의하는 요소들입니다.

### Text
일반 텍스트입니다.
- `type`: 'text'

### Strong
굵은 글씨 강조입니다.
- `type`: 'strong'

### Emphasis
기울임 강조입니다.
- `type`: 'emphasis'

### Link
하이퍼링크입니다.
- `type`: 'link'
- `url`: 연결될 URL
- `title`: (선택 사항) 링크 제목

### Image
이미지입니다.
- `type`: 'image'
- `url`: 이미지 URL
- `alt`: (선택 사항) 대체 텍스트
- `title`: (선택 사항) 이미지 제목

### InlineCode
인라인 코드입니다.
- `type`: 'inlineCode'

### Break
강제 줄바꿈입니다.
- `type`: 'break'

## 콘텐츠 모델 (Content Models)

노드들이 가질 수 있는 자식 노드의 유형을 제한하기 위해 유니온 타입을 사용합니다.

### FlowContent
블록 레벨에서 나타날 수 있는 노드들입니다.
```typescript
export type FlowContent =
  | Heading
  | Paragraph
  | Code
  | Blockquote
  | List
  | ThematicBreak
  | Definition;
```

### PhrasingContent
인라인 레벨에서 나타날 수 있는 노드들입니다.
```typescript
export type PhrasingContent =
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

### ListContent
목록 내부에 포함될 수 있는 노드입니다.
```typescript
export type ListContent = ListItem;
```

## 참조 관련 노드 (Reference Nodes)

링크 참조 정의와 관련된 노드들입니다.

### Definition
링크 참조 정의를 나타냅니다.
- `type`: 'definition'
- `identifier`: 참조 식별자
- `label`: (선택 사항) 참조 레이블
- `url`: 대상 URL
- `title`: (선택 사항) 제목

### LinkReference
참조 방식의 링크입니다.
- `type`: 'linkReference'
- `identifier`: 참조 식별자
- `label`: (선택 사항) 참조 레이블
- `referenceType`: 'full' | 'collapsed' | 'shortcut'

### ImageReference
참조 방식의 이미지입니다.
- `type`: 'imageReference'
- `identifier`: 참조 식별자
- `label`: (선택 사항) 참조 레이블
- `alt`: (선택 사항) 대체 텍스트
- `referenceType`: 'full' | 'collapsed' | 'shortcut'
