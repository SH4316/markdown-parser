// Position types
export interface Point {
  line: number;
  column: number;
  offset: number;
}

export interface Position {
  start: Point;
  end: Point;
}

// Base Node interface
export interface Node {
  type: string;
  position?: Position;
}

// Parent interface - nodes that contain other nodes
export interface Parent extends Node {
  children: Node[];
}

// Literal interface - nodes with string values
export interface Literal extends Node {
  value: string;
}

// Root node - top-level container
export interface Root extends Parent {
  type: 'root';
}

// Block nodes
export interface Heading extends Parent {
  type: 'heading';
  depth: 1 | 2 | 3 | 4 | 5 | 6;
}

export interface Paragraph extends Parent {
  type: 'paragraph';
}

export interface List extends Parent {
  type: 'list';
  ordered: boolean;
  start?: number;
  spread: boolean;
}

export interface ListItem extends Parent {
  type: 'listItem';
  spread: boolean;
}

export interface Code extends Literal {
  type: 'code';
  lang?: string;
  meta?: string;
}

export interface Blockquote extends Parent {
  type: 'blockquote';
}

export interface ThematicBreak extends Node {
  type: 'thematicBreak';
}

// Inline nodes
export interface Text extends Literal {
  type: 'text';
}

export interface Strong extends Parent {
  type: 'strong';
}

export interface Emphasis extends Parent {
  type: 'emphasis';
}

export interface Link extends Parent {
  type: 'link';
  url: string;
  title?: string;
}

export interface Image extends Node {
  type: 'image';
  url: string;
  alt?: string;
  title?: string;
}

export interface InlineCode extends Literal {
  type: 'inlineCode';
}

export interface Break extends Node {
  type: 'break';
}

// Helper nodes
export interface Definition extends Node {
  type: 'definition';
  identifier: string;
  label?: string;
  url: string;
  title?: string;
}

export interface LinkReference extends Parent {
  type: 'linkReference';
  identifier: string;
  label?: string;
  referenceType: 'full' | 'collapsed' | 'shortcut';
}

export interface ImageReference extends Node {
  type: 'imageReference';
  identifier: string;
  label?: string;
  alt?: string;
  referenceType: 'full' | 'collapsed' | 'shortcut';
}

// Content model types (union types)
export type FlowContent =
  | Heading
  | Paragraph
  | Code
  | Blockquote
  | List
  | ThematicBreak
  | Definition;

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

export type ListContent = ListItem;
