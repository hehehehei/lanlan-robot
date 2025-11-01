import { beforeEach, describe, expect, it } from 'vitest';
import { SpatialIndex } from '../lib/spatialIndex';
import {
  DEFAULT_HIT_RADIUS,
  type SelectionItem,
  useSelectionStore,
} from '../state/selectionStore';

const makeBounds = (
  min_x: number,
  min_y: number,
  max_x: number,
  max_y: number
) => ({ min_x, min_y, max_x, max_y });

describe('SpatialIndex', () => {
  it('returns entries that intersect with the query bounds', () => {
    const index = new SpatialIndex<SelectionItem>(10);
    index.bulkInsert([
      { id: 1, bounds: makeBounds(0, 0, 5, 5) },
      { id: 2, bounds: makeBounds(12, 12, 18, 18) },
      { id: 3, bounds: makeBounds(-4, -4, -1, -1) },
    ]);

    const hits = index.search(makeBounds(-2, -2, 6, 6)).map((item) => item.id).sort();
    expect(hits).toEqual([1]);

    const extendedHits = index
      .search(makeBounds(-10, -10, 20, 20))
      .map((item) => item.id)
      .sort();
    expect(extendedHits).toEqual([1, 2, 3]);
  });

  it('updates and removes entries correctly', () => {
    const index = new SpatialIndex<SelectionItem>(5);
    index.insert({ id: 'text-1', bounds: makeBounds(0, 0, 2, 2) });
    index.insert({ id: 'text-2', bounds: makeBounds(10, 10, 12, 12) });

    index.update({ id: 'text-1', bounds: makeBounds(20, 20, 22, 22) });

    const shouldBeEmpty = index.search(makeBounds(0, 0, 5, 5));
    expect(shouldBeEmpty).toHaveLength(0);

    const moved = index.search(makeBounds(19, 19, 23, 23));
    expect(moved.map((item) => item.id)).toEqual(['text-1']);

    const removed = index.remove('text-2');
    expect(removed).toBe(true);
    expect(index.size()).toBe(1);
  });
});

describe('selection store', () => {
  const entities: SelectionItem[] = [
    {
      id: 1,
      bounds: makeBounds(0, 0, 6, 6),
      entityType: 'LINE',
    },
    {
      id: 2,
      bounds: makeBounds(10, 10, 20, 20),
      entityType: 'TEXT',
    },
    {
      id: 3,
      bounds: makeBounds(-6, -6, 2, 2),
      entityType: 'LINE',
    },
  ];

  beforeEach(() => {
    const store = useSelectionStore.getState();
    store.reset();
    store.registerEntities(entities);
  });

  it('selectWithin queries selection via the spatial index', () => {
    const store = useSelectionStore.getState();

    const first = store.selectWithin(makeBounds(-2, -2, 7, 7));
    expect(first).toEqual([1, 3]);
    expect(store.isSelected(1)).toBe(true);
    expect(store.isSelected(3)).toBe(true);

    const additive = store.selectWithin(makeBounds(9, 9, 21, 21), true);
    expect(additive).toEqual([1, 2, 3]);
  });

  it('selectAt respects additive and toggle behaviours', () => {
    const store = useSelectionStore.getState();

    const single = store.selectAt({ x: 1, y: 1 }, 1);
    expect(single).toEqual([1]);

    const additive = store.selectAt({ x: 15, y: 15 }, 5, { additive: true });
    expect(additive).toEqual([1, 2]);

    const toggled = store.selectAt({ x: 1, y: 1 }, 5, { toggle: true });
    expect(toggled).toEqual([2]);
  });

  it('hitTest returns the closest intersecting entity', () => {
    const store = useSelectionStore.getState();

    const hit = store.hitTest({ x: 0, y: 0 }, DEFAULT_HIT_RADIUS);
    expect(hit?.id).toBe(3);

    const miss = store.hitTest({ x: 50, y: 50 }, DEFAULT_HIT_RADIUS);
    expect(miss).toBeNull();
  });

  it('deleteSelected removes entities and clears selection state', () => {
    const store = useSelectionStore.getState();

    store.selectIds([1, 2]);
    const removed = store.deleteSelected();

    expect(removed).toEqual([1, 2]);
    expect(store.selectedIds).toEqual([]);
    expect(store.spatialIndex.size()).toBe(1);

    const remainingHit = store.hitTest({ x: -4, y: -4 }, DEFAULT_HIT_RADIUS);
    expect(remainingHit?.id).toBe(3);
  });

  it('ignores tiny drag selections below the threshold area', () => {
    const store = useSelectionStore.getState();

    store.beginSelection({ x: 0, y: 0 });
    store.updateSelection({ x: 0.5, y: 0.5 });
    const result = store.finalizeSelection();

    expect(result).toEqual([]);
    expect(store.selectedIds).toEqual([]);
    expect(store.selectionBox).toBeNull();
  });
});
