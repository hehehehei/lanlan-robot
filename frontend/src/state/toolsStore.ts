import { create } from 'zustand';
import { useSelectionStore } from './selectionStore';

export type Tool = 'select' | 'delete' | 'line' | 'rect' | 'polygon' | 'text';

export interface Point {
  x: number;
  y: number;
}

export interface DraftShapeBase {
  type: 'line' | 'rect' | 'polygon' | 'text';
}

export interface DraftLine extends DraftShapeBase {
  type: 'line';
  points: [Point] | [Point, Point];
}

export interface DraftRect extends DraftShapeBase {
  type: 'rect';
  points: [Point] | [Point, Point];
}

export interface DraftPolygon extends DraftShapeBase {
  type: 'polygon';
  points: Point[]; // at least 1 while drawing
  isClosed?: boolean;
}

export interface DraftText extends DraftShapeBase {
  type: 'text';
  anchor: Point;
  text: string;
}

export type DraftShape = DraftLine | DraftRect | DraftPolygon | DraftText;

export interface ToolsState {
  activeTool: Tool;
  draft: DraftShape | null;
  isTextModalOpen: boolean;
  textDraft: { anchor: Point | null; value: string };
  setTool: (tool: Tool) => void;
  // line
  startLine: (at: Point) => void;
  updateLine: (to: Point) => void;
  commitLine: () => void;
  cancelLine: () => void;
  // rect
  startRect: (at: Point) => void;
  updateRect: (to: Point) => void;
  commitRect: () => void;
  cancelRect: () => void;
  // polygon
  startPolygon: (at: Point) => void;
  addPolygonPoint: (pt: Point) => void;
  commitPolygon: () => void;
  cancelPolygon: () => void;
  // text
  openTextAt: (at: Point) => void;
  updateTextValue: (value: string) => void;
  confirmText: () => { ok: boolean; error?: string };
  cancelText: () => void;
  // utilities
  resetDraft: () => void;
}

let nextLocalId = -1;

const boundsFromPoints = (points: Point[]) => {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const min_x = Math.min(...xs);
  const max_x = Math.max(...xs);
  const min_y = Math.min(...ys);
  const max_y = Math.max(...ys);
  return { min_x, min_y, max_x, max_y };
};

export const useToolsStore = create<ToolsState>((set, get) => ({
  activeTool: 'select',
  draft: null,
  isTextModalOpen: false,
  textDraft: { anchor: null, value: '' },

  setTool: (tool) => {
    // Reset any ongoing draft when switching tools
    set({ activeTool: tool, draft: null, isTextModalOpen: false, textDraft: { anchor: null, value: '' } });
  },

  // Line
  startLine: (at) => {
    if (get().activeTool !== 'line') return;
    set({ draft: { type: 'line', points: [at] } });
  },
  updateLine: (to) => {
    const draft = get().draft as DraftLine | null;
    if (!draft || draft.type !== 'line') return;
    const start = draft.points[0];
    set({ draft: { type: 'line', points: [start, to] } });
  },
  commitLine: () => {
    const draft = get().draft as DraftLine | null;
    if (!draft || draft.type !== 'line' || draft.points.length < 2) return;
    const points = draft.points as [Point, Point];
    const bounds = boundsFromPoints(points);
    const id = nextLocalId--;
    useSelectionStore.getState().addOrUpdateEntity({ id, bounds, entityType: 'LINE', data: { points } });
    set({ draft: null });
  },
  cancelLine: () => {
    const draft = get().draft as DraftLine | null;
    if (draft?.type !== 'line') return;
    set({ draft: null });
  },

  // Rect
  startRect: (at) => {
    if (get().activeTool !== 'rect') return;
    set({ draft: { type: 'rect', points: [at] } });
  },
  updateRect: (to) => {
    const draft = get().draft as DraftRect | null;
    if (!draft || draft.type !== 'rect') return;
    const start = draft.points[0];
    set({ draft: { type: 'rect', points: [start, to] } });
  },
  commitRect: () => {
    const draft = get().draft as DraftRect | null;
    if (!draft || draft.type !== 'rect' || draft.points.length < 2) return;
    const [a, b] = draft.points as [Point, Point];
    const bounds = boundsFromPoints([a, b]);
    const id = nextLocalId--;
    useSelectionStore.getState().addOrUpdateEntity({ id, bounds, entityType: 'RECT', data: { a, b } });
    set({ draft: null });
  },
  cancelRect: () => {
    const draft = get().draft as DraftRect | null;
    if (draft?.type !== 'rect') return;
    set({ draft: null });
  },

  // Polygon
  startPolygon: (at) => {
    if (get().activeTool !== 'polygon') return;
    set({ draft: { type: 'polygon', points: [at] } });
  },
  addPolygonPoint: (pt) => {
    const draft = get().draft as DraftPolygon | null;
    if (!draft || draft.type !== 'polygon') return;
    const points = [...draft.points, pt];
    set({ draft: { type: 'polygon', points } });
  },
  commitPolygon: () => {
    const draft = get().draft as DraftPolygon | null;
    if (!draft || draft.type !== 'polygon' || draft.points.length < 2) return;
    const bounds = boundsFromPoints(draft.points);
    const id = nextLocalId--;
    useSelectionStore.getState().addOrUpdateEntity({ id, bounds, entityType: 'POLYGON', data: { points: draft.points } });
    set({ draft: null });
  },
  cancelPolygon: () => {
    const draft = get().draft as DraftPolygon | null;
    if (draft?.type !== 'polygon') return;
    set({ draft: null });
  },

  // Text
  openTextAt: (at) => {
    if (get().activeTool !== 'text') return;
    set({ isTextModalOpen: true, textDraft: { anchor: at, value: '' }, draft: { type: 'text', anchor: at, text: '' } });
  },
  updateTextValue: (value) => {
    const draft = get().draft as DraftText | null;
    const anchor = get().textDraft.anchor;
    if (!anchor || !draft || draft.type !== 'text') return;
    set({ textDraft: { anchor, value }, draft: { type: 'text', anchor, text: value } });
  },
  confirmText: () => {
    const { textDraft } = get();
    if (!textDraft.anchor) return { ok: false, error: '无效位置' };
    const text = textDraft.value?.trim() ?? '';
    if (!text) {
      return { ok: false, error: '请输入文本' };
    }
    if (text.length > 200) {
      return { ok: false, error: '文本长度不能超过200个字符' };
    }
    const id = nextLocalId--;
    const anchor = textDraft.anchor;
    const bounds = boundsFromPoints([anchor, anchor]);
    useSelectionStore.getState().addOrUpdateEntity({ id, bounds, entityType: 'TEXT', data: { text, anchor } });
    set({ isTextModalOpen: false, textDraft: { anchor: null, value: '' }, draft: null });
    return { ok: true };
  },
  cancelText: () => {
    set({ isTextModalOpen: false, textDraft: { anchor: null, value: '' }, draft: null });
  },

  resetDraft: () => set({ draft: null, isTextModalOpen: false, textDraft: { anchor: null, value: '' } }),
}));
