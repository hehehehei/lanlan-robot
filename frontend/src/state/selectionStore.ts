import { create } from 'zustand';
import type { BoundingBox } from '../api/types';
import { SpatialIndex } from '../lib/spatialIndex';

export interface Point {
  x: number;
  y: number;
}

export interface SelectionItem {
  id: number;
  bounds: BoundingBox;
  layerId?: number;
  entityType?: string;
  data?: unknown;
}

export interface SelectAtOptions {
  additive?: boolean;
  toggle?: boolean;
  keepExistingOnMiss?: boolean;
}

export interface SelectionState {
  items: Record<number, SelectionItem>;
  spatialIndex: SpatialIndex<SelectionItem>;
  selectedIds: number[];
  selectedLookup: Record<number, true>;
  hoveredId: number | null;
  selectionBox: BoundingBox | null;
  selectionOrigin: Point | null;
  registerEntities: (entities: SelectionItem[]) => number[];
  addOrUpdateEntity: (entity: SelectionItem) => void;
  removeEntity: (id: number) => boolean;
  clearEntities: () => void;
  selectWithin: (bounds: BoundingBox, additive?: boolean) => number[];
  selectAt: (point: Point, radius?: number, options?: SelectAtOptions) => number[];
  toggleSelection: (id: number) => number[];
  selectIds: (ids: number[], additive?: boolean) => number[];
  clearSelection: () => void;
  beginSelection: (origin: Point) => void;
  updateSelection: (point: Point) => void;
  finalizeSelection: (options?: { additive?: boolean; minArea?: number }) => number[];
  cancelSelection: () => void;
  setHovered: (id: number | null) => void;
  deleteSelected: () => number[];
  hitTest: (point: Point, radius?: number) => SelectionItem | null;
  isSelected: (id: number) => boolean;
  reset: () => void;
}

export const DEFAULT_HIT_RADIUS = 6;
export const DEFAULT_MIN_SELECTION_AREA = 4;

const createBaseState = () => ({
  items: {} as Record<number, SelectionItem>,
  spatialIndex: new SpatialIndex<SelectionItem>(),
  selectedIds: [] as number[],
  selectedLookup: {} as Record<number, true>,
  hoveredId: null as number | null,
  selectionBox: null as BoundingBox | null,
  selectionOrigin: null as Point | null,
});

const computeBounds = (a: Point, b: Point): BoundingBox => ({
  min_x: Math.min(a.x, b.x),
  min_y: Math.min(a.y, b.y),
  max_x: Math.max(a.x, b.x),
  max_y: Math.max(a.y, b.y),
});

const areaOfBounds = (bounds: BoundingBox) =>
  Math.max(0, bounds.max_x - bounds.min_x) * Math.max(0, bounds.max_y - bounds.min_y);

const centerOfBounds = (bounds: BoundingBox): Point => ({
  x: (bounds.min_x + bounds.max_x) / 2,
  y: (bounds.min_y + bounds.max_y) / 2,
});

export const useSelectionStore = create<SelectionState>()((set, get) => {
  const applySelection = (ids: number[]) => {
    const unique = Array.from(new Set(ids.map((id) => Number(id)))).sort((a, b) => a - b);
    const lookup: Record<number, true> = {};
    for (const id of unique) {
      lookup[id] = true;
    }
    set({ selectedIds: unique, selectedLookup: lookup });
    return unique;
  };

  return {
    ...createBaseState(),

    registerEntities: (entities) => {
      const index = new SpatialIndex<SelectionItem>();
      index.bulkInsert(entities);

      const map: Record<number, SelectionItem> = {};
      for (const entity of entities) {
        map[entity.id] = entity;
      }

      set({
        spatialIndex: index,
        items: map,
        selectionBox: null,
        selectionOrigin: null,
        hoveredId: null,
      });

      applySelection([]);
      return entities.map((entity) => entity.id);
    },

    addOrUpdateEntity: (entity) => {
      const state = get();
      if (state.items[entity.id]) {
        state.spatialIndex.remove(entity.id);
      }
      state.spatialIndex.insert(entity);
      set({
        items: {
          ...state.items,
          [entity.id]: entity,
        },
      });
    },

    removeEntity: (id) => {
      const state = get();
      if (!state.items[id]) {
        return false;
      }

      state.spatialIndex.remove(id);
      const nextItems = { ...state.items };
      delete nextItems[id];
      set({ items: nextItems });

      if (state.selectedLookup[id]) {
        const remaining = state.selectedIds.filter((selectedId) => selectedId !== id);
        applySelection(remaining);
      }

      if (state.hoveredId === id) {
        set({ hoveredId: null });
      }

      return true;
    },

    clearEntities: () => {
      const base = createBaseState();
      set({
        spatialIndex: base.spatialIndex,
        items: base.items,
        selectionBox: null,
        selectionOrigin: null,
        hoveredId: null,
      });
      applySelection([]);
    },

    selectWithin: (bounds, additive = false) => {
      const { spatialIndex, selectedIds } = get();
      const hits = spatialIndex.search(bounds).map((item) => Number(item.id));
      const next = additive
        ? Array.from(new Set([...selectedIds, ...hits]))
        : hits;
      set({ selectionBox: bounds });
      return applySelection(next);
    },

    selectAt: (point, radius = DEFAULT_HIT_RADIUS, options = {}) => {
      const { additive = false, toggle = false, keepExistingOnMiss = false } = options;
      const { spatialIndex, items, selectedIds, selectedLookup } = get();
      const bounds: BoundingBox = {
        min_x: point.x - radius,
        min_y: point.y - radius,
        max_x: point.x + radius,
        max_y: point.y + radius,
      };
      const hits = spatialIndex.search(bounds);

      if (!hits.length) {
        if (!keepExistingOnMiss && !additive && !toggle) {
          applySelection([]);
        }
        return [];
      }

      const sortedHits = hits
        .map((item) => ({
          item,
          area: areaOfBounds(item.bounds),
          distance: (() => {
            const center = centerOfBounds(item.bounds);
            return Math.hypot(center.x - point.x, center.y - point.y);
          })(),
        }))
        .sort((a, b) => {
          if (a.distance === b.distance) {
            return a.area - b.area;
          }
          return a.distance - b.distance;
        });

      const target = sortedHits[0]?.item;
      if (!target) {
        return [];
      }

      const targetId = Number(target.id);

      if (toggle) {
        const isSelected = Boolean(selectedLookup[targetId]);
        const next = isSelected
          ? selectedIds.filter((selectedId) => selectedId !== targetId)
          : [...selectedIds, targetId];
        return applySelection(next);
      }

      if (additive) {
        if (selectedLookup[targetId]) {
          return selectedIds;
        }
        return applySelection([...selectedIds, targetId]);
      }

      return applySelection([targetId]);
    },

    toggleSelection: (id) => {
      const { selectedIds, selectedLookup } = get();
      const targetId = Number(id);
      const next = selectedLookup[targetId]
        ? selectedIds.filter((selectedId) => selectedId !== targetId)
        : [...selectedIds, targetId];
      return applySelection(next);
    },

    selectIds: (ids, additive = false) => {
      const { selectedIds } = get();
      const normalized = ids.map((id) => Number(id));
      const next = additive
        ? Array.from(new Set([...selectedIds, ...normalized]))
        : normalized;
      return applySelection(next);
    },

    clearSelection: () => applySelection([]),

    beginSelection: (origin) => {
      set({
        selectionOrigin: origin,
        selectionBox: {
          min_x: origin.x,
          min_y: origin.y,
          max_x: origin.x,
          max_y: origin.y,
        },
      });
    },

    updateSelection: (point) => {
      const { selectionOrigin } = get();
      if (!selectionOrigin) {
        return;
      }
      set({ selectionBox: computeBounds(selectionOrigin, point) });
    },

    finalizeSelection: (options = {}) => {
      const { additive = false, minArea = DEFAULT_MIN_SELECTION_AREA } = options;
      const { selectionBox } = get();
      if (!selectionBox) {
        return [];
      }

      const area = areaOfBounds(selectionBox);
      let result: number[] = [];
      if (area >= minArea) {
        result = get().selectWithin(selectionBox, additive);
      }

      set({ selectionOrigin: null, selectionBox: null });
      return result;
    },

    cancelSelection: () => {
      set({ selectionOrigin: null, selectionBox: null });
    },

    setHovered: (id) => {
      set({ hoveredId: id });
    },

    deleteSelected: () => {
      const { selectedIds, items, spatialIndex, hoveredId } = get();
      if (!selectedIds.length) {
        return [];
      }

      const nextItems = { ...items };
      for (const id of selectedIds) {
        delete nextItems[id];
        spatialIndex.remove(id);
      }

      set({ items: nextItems });
      applySelection([]);

      if (hoveredId !== null && selectedIds.includes(hoveredId)) {
        set({ hoveredId: null });
      }

      return selectedIds;
    },

    hitTest: (point, radius = DEFAULT_HIT_RADIUS) => {
      const { spatialIndex } = get();
      const bounds: BoundingBox = {
        min_x: point.x - radius,
        min_y: point.y - radius,
        max_x: point.x + radius,
        max_y: point.y + radius,
      };
      const hits = spatialIndex.search(bounds);
      if (!hits.length) {
        return null;
      }

      return hits
        .map((item) => ({
          item,
          distance: (() => {
            const center = centerOfBounds(item.bounds);
            return Math.hypot(center.x - point.x, center.y - point.y);
          })(),
        }))
        .sort((a, b) => a.distance - b.distance)[0]?.item ?? null;
    },

    isSelected: (id) => {
      const { selectedLookup } = get();
      return Boolean(selectedLookup[Number(id)]);
    },

    reset: () => {
      const base = createBaseState();
      set({
        spatialIndex: base.spatialIndex,
        items: base.items,
        selectedIds: base.selectedIds,
        selectedLookup: base.selectedLookup,
        hoveredId: base.hoveredId,
        selectionBox: base.selectionBox,
        selectionOrigin: base.selectionOrigin,
      });
    },
  };
});
