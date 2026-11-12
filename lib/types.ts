export interface TextAnchor {
  exact: string;
  prefix: string;
  suffix: string;
  start: number;
}

export interface LocationRef {
  conversationKey: string;
  messageKey?: string;
  fingerprint: string;
  anchor: TextAnchor;
}

export interface SavedItem {
  id: string;
  type: 'checkpoint' | 'highlight';
  location: LocationRef;
  label: string;
  kept: boolean;
  createdAt: number;
}

export interface ConversationState {
  schemaVersion: 1;
  items: SavedItem[];
  activeId?: string;
}

export interface Message {
  element: HTMLElement;
  key?: string;
}

export interface SelectionAnchor {
  location: LocationRef;
  range: Range;
  rect: DOMRect;
}
