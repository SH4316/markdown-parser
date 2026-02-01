# 테스트 작성 가이드

이 문서는 Markdown Parser 프로젝트의 테스트 작성 패턴과 규칙을 안내합니다. 모든 기여자는 이 가이드를 준수하여 일관성 있고 신뢰할 수 있는 테스트 코드를 작성해야 합니다.

## 1. 테스트 파일 규칙

### 파일 위치 및 명명 규칙
- 모든 테스트 파일은 `src/__tests__/` 디렉토리에 위치해야 합니다.
- 파일 이름은 반드시 `*.test.ts` 접미사를 사용해야 합니다.
  - 예: `tokenizer.test.ts`, `block-parser.test.ts`

### 테스트 프레임워크
- 본 프로젝트는 **Bun**의 내장 테스트 러너인 `bun:test`를 사용합니다.
- 외부 테스트 라이브러리(Jest, Mocha 등)를 추가하지 마세요.

## 2. 테스트 구조 및 패턴

### 기본 구조
테스트는 `describe` 블록을 사용하여 논리적으로 그룹화하고, `test` 블록을 사용하여 개별 케이스를 정의합니다.

```typescript
import { describe, test, expect } from 'bun:test';
import { 기능함수 } from '../모듈';

describe('모듈 이름', () => {
  describe('특정 기능 또는 시나리오', () => {
    test('기대하는 동작 설명', () => {
      // 1. 준비 (Arrange)
      const input = '...';
      
      // 2. 실행 (Act)
      const result = 기능함수(input);
      
      // 3. 검증 (Assert)
      expect(result).toBe('...');
    });
  });
});
```

### 중첩 구조 권장
기능별로 `describe`를 중첩하여 테스트 결과의 가독성을 높이세요.
- 첫 번째 `describe`: 모듈 또는 클래스 이름 (예: `Tokenizer`)
- 두 번째 `describe`: 하위 기능 또는 문법 요소 (예: `ATX Headings`)
- `test`: 구체적인 동작 (예: `level 1 heading`)

## 3. 테스트 작성 원칙

### 성공 케이스와 엣지 케이스
- **성공 케이스**: 일반적인 입력에 대해 기대하는 출력이 나오는지 확인합니다.
- **엣지 케이스**: 빈 문자열, 비정상적인 공백, 중첩된 구조 등 복잡하거나 예외적인 상황을 테스트합니다.

### 위치 정보 검증
파서의 핵심 기능 중 하나는 위치 추적입니다. 새로운 노드 타입을 추가할 때 `position` 정보가 정확한지 반드시 테스트해야 합니다.

```typescript
test('위치 정보가 정확해야 함', () => {
  const { root } = parseBlocks('# Hello');
  const heading = root.children[0];
  expect(heading.position).toBeDefined();
  expect(heading.position?.start.line).toBe(1);
});
```

## 4. 새로운 기능에 대한 테스트 추가 방법

1. **기존 파일 업데이트 또는 새 파일 생성**: `src/__tests__/`에 적절한 테스트 파일을 찾거나 생성합니다.
2. **기능 그룹 추가**: `describe` 블록을 추가하여 새로운 기능을 설명합니다.
3. **테스트 케이스 작성**: 다양한 입력 조합에 대해 `test` 케이스를 작성합니다.
4. **테스트 실행**: `bun test` 명령어를 통해 작성한 테스트가 통과하는지 확인합니다.

## 5. 코드 스타일 및 참고 사항

- **AGENTS.md 준수**: 테스트 코드 역시 프로젝트의 전반적인 코딩 스타일(2-space indentation, single quotes 등)을 따라야 합니다. 자세한 내용은 [AGENTS.md](../../AGENTS.md)를 참조하세요.
- **중복 방지**: `README.md`에 설명된 테스트 실행 방법이나 디버깅 방법은 이 문서에서 중복하여 다루지 않습니다.

## 6. 테스트 템플릿 예시

```typescript
import { describe, test, expect } from 'bun:test';
import { parse } from '../index';

describe('NewFeature', () => {
  test('should parse new feature correctly', () => {
    const input = 'new feature syntax';
    const ast = parse(input);
    
    expect(ast.children[0].type).toBe('newFeature');
    // 필요한 추가 검증...
  });
});
```
