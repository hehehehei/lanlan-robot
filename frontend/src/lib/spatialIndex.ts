import type { BoundingBox } from '../api/types';

export interface SpatialIndexItem {
  id: number | string;
  bounds: BoundingBox;
}

const intersects = (a: BoundingBox, b: BoundingBox): boolean => {
  return !(b.min_x > a.max_x || b.max_x < a.min_x || b.min_y > a.max_y || b.max_y < a.min_y);
};

export class SpatialIndex<T extends SpatialIndexItem> {
  private readonly cellSize: number;

  private readonly items = new Map<string, T>();

  private readonly cells = new Map<string, Set<string>>();

  private readonly itemCells = new Map<string, string[]>();

  constructor(cellSize = 256) {
    this.cellSize = cellSize;
  }

  insert(item: T): void {
    const key = this.toKey(item.id);
    const cellKeys = this.getCellsForBounds(item.bounds);

    this.items.set(key, item);
    this.itemCells.set(key, cellKeys);

    for (const cellKey of cellKeys) {
      let bucket = this.cells.get(cellKey);
      if (!bucket) {
        bucket = new Set<string>();
        this.cells.set(cellKey, bucket);
      }
      bucket.add(key);
    }
  }

  bulkInsert(items: T[]): void {
    for (const item of items) {
      this.insert(item);
    }
  }

  update(item: T): void {
    this.remove(item.id);
    this.insert(item);
  }

  remove(id: T['id']): boolean {
    const key = this.toKey(id);
    const cellKeys = this.itemCells.get(key);
    if (!cellKeys) {
      return false;
    }

    for (const cellKey of cellKeys) {
      const bucket = this.cells.get(cellKey);
      if (!bucket) {
        continue;
      }
      bucket.delete(key);
      if (bucket.size === 0) {
        this.cells.delete(cellKey);
      }
    }

    this.itemCells.delete(key);
    return this.items.delete(key);
  }

  search(bounds: BoundingBox): T[] {
    const cellKeys = this.getCellsForBounds(bounds);
    const result: T[] = [];
    const seen = new Set<string>();

    for (const cellKey of cellKeys) {
      const bucket = this.cells.get(cellKey);
      if (!bucket) {
        continue;
      }

      for (const itemKey of bucket) {
        if (seen.has(itemKey)) {
          continue;
        }
        seen.add(itemKey);

        const item = this.items.get(itemKey);
        if (!item) {
          continue;
        }

        if (intersects(item.bounds, bounds)) {
          result.push(item);
        }
      }
    }

    return result;
  }

  clear(): void {
    this.items.clear();
    this.cells.clear();
    this.itemCells.clear();
  }

  size(): number {
    return this.items.size;
  }

  all(): T[] {
    return Array.from(this.items.values());
  }

  private toKey(id: T['id']): string {
    return typeof id === 'number' ? id.toString(10) : String(id);
  }

  private getCellsForBounds(bounds: BoundingBox): string[] {
    const minX = Math.floor(bounds.min_x / this.cellSize);
    const maxX = Math.floor(bounds.max_x / this.cellSize);
    const minY = Math.floor(bounds.min_y / this.cellSize);
    const maxY = Math.floor(bounds.max_y / this.cellSize);

    const keys: string[] = [];
    for (let x = minX; x <= maxX; x += 1) {
      for (let y = minY; y <= maxY; y += 1) {
        keys.push(`${x}:${y}`);
      }
    }
    return keys;
  }
}
