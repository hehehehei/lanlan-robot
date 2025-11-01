export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface SpatialRecord<T> extends Bounds {
  item: T;
}

export const intersects = (a: Bounds, b: Bounds): boolean =>
  !(a.minX > b.maxX || a.maxX < b.minX || a.minY > b.maxY || a.maxY < b.minY);

export class SpatialIndex<T> {
  private readonly cells = new Map<string, SpatialRecord<T>[]>();

  constructor(private readonly cellSize = 128) {}

  clear(): void {
    this.cells.clear();
  }

  load(records: SpatialRecord<T>[]): void {
    this.clear();
    for (const record of records) {
      this.insert(record);
    }
  }

  insert(record: SpatialRecord<T>): void {
    const keys = this.getCellKeys(record);
    for (const key of keys) {
      const cell = this.cells.get(key);
      if (cell) {
        cell.push(record);
      } else {
        this.cells.set(key, [record]);
      }
    }
  }

  search(bounds: Bounds): SpatialRecord<T>[] {
    const keys = this.getCellKeys(bounds);
    const results = new Set<SpatialRecord<T>>();
    for (const key of keys) {
      const cell = this.cells.get(key);
      if (!cell) continue;
      for (const record of cell) {
        if (intersects(record, bounds)) {
          results.add(record);
        }
      }
    }
    return [...results];
  }

  size(): number {
    let count = 0;
    for (const cell of this.cells.values()) {
      count += cell.length;
    }
    return count;
  }

  private getCellKeys(bounds: Bounds): string[] {
    if (
      !Number.isFinite(bounds.minX) ||
      !Number.isFinite(bounds.minY) ||
      !Number.isFinite(bounds.maxX) ||
      !Number.isFinite(bounds.maxY)
    ) {
      return [];
    }

    const minCol = Math.floor(bounds.minX / this.cellSize);
    const maxCol = Math.floor(bounds.maxX / this.cellSize);
    const minRow = Math.floor(bounds.minY / this.cellSize);
    const maxRow = Math.floor(bounds.maxY / this.cellSize);

    const keys: string[] = [];
    for (let col = minCol; col <= maxCol; col += 1) {
      for (let row = minRow; row <= maxRow; row += 1) {
        keys.push(`${col}:${row}`);
      }
    }
    return keys;
  }
}
