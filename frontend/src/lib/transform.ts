import { useSyncExternalStore } from 'react';

export interface Point {
  x: number;
  y: number;
}

export interface ViewportSize {
  width: number;
  height: number;
}

export interface TransformState {
  scale: number;
  translation: Point;
  viewport: ViewportSize;
}

type TransformListener = () => void;

const DEFAULT_MIN_SCALE = 0.05;
const DEFAULT_MAX_SCALE = 40;

export class Transform {
  private state: TransformState = {
    scale: 1,
    translation: { x: 0, y: 0 },
    viewport: { width: 0, height: 0 },
  };

  private readonly listeners = new Set<TransformListener>();

  constructor(
    private readonly minScale: number = DEFAULT_MIN_SCALE,
    private readonly maxScale: number = DEFAULT_MAX_SCALE
  ) {}

  subscribe(listener: TransformListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit() {
    for (const listener of this.listeners) {
      listener();
    }
  }

  private clampScale(value: number): number {
    return Math.min(this.maxScale, Math.max(this.minScale, value));
  }

  getState = (): TransformState => this.state;

  setViewport(width: number, height: number) {
    if (
      width === this.state.viewport.width &&
      height === this.state.viewport.height
    ) {
      return;
    }

    const isInitial = this.state.viewport.width === 0 && this.state.viewport.height === 0;
    const translation = isInitial
      ? { x: width / 2, y: height / 2 }
      : this.state.translation;

    this.state = {
      ...this.state,
      translation,
      viewport: { width, height },
    };
    this.emit();
  }

  setScale(scale: number, pivot?: Point) {
    const clamped = this.clampScale(scale);
    if (clamped === this.state.scale) {
      return;
    }

    const pivotScreen =
      pivot ?? {
        x: this.state.viewport.width / 2,
        y: this.state.viewport.height / 2,
      };
    const worldPivot = this.screenToWorld(pivotScreen);

    const translation: Point = {
      x: pivotScreen.x - worldPivot.x * clamped,
      y: pivotScreen.y + worldPivot.y * clamped,
    };

    this.state = {
      ...this.state,
      scale: clamped,
      translation,
    };

    this.emit();
  }

  zoom(factor: number, pivot?: Point) {
    if (!Number.isFinite(factor) || factor === 0) return;
    this.setScale(this.state.scale * factor, pivot);
  }

  pan(delta: Point) {
    if (!delta.x && !delta.y) return;
    const translation: Point = {
      x: this.state.translation.x + delta.x,
      y: this.state.translation.y + delta.y,
    };

    this.state = {
      ...this.state,
      translation,
    };
    this.emit();
  }

  reset() {
    const translation: Point = {
      x: this.state.viewport.width / 2,
      y: this.state.viewport.height / 2,
    };

    this.state = {
      ...this.state,
      scale: 1,
      translation,
    };
    this.emit();
  }

  worldToScreen(point: Point): Point {
    return {
      x: point.x * this.state.scale + this.state.translation.x,
      y: -point.y * this.state.scale + this.state.translation.y,
    };
  }

  screenToWorld(point: Point): Point {
    if (this.state.scale === 0) {
      return { x: 0, y: 0 };
    }
    return {
      x: (point.x - this.state.translation.x) / this.state.scale,
      y: -(point.y - this.state.translation.y) / this.state.scale,
    };
  }

  getViewBounds(): {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  } {
    const topLeft = this.screenToWorld({ x: 0, y: 0 });
    const bottomRight = this.screenToWorld({
      x: this.state.viewport.width,
      y: this.state.viewport.height,
    });

    return {
      minX: Math.min(topLeft.x, bottomRight.x),
      minY: Math.min(topLeft.y, bottomRight.y),
      maxX: Math.max(topLeft.x, bottomRight.x),
      maxY: Math.max(topLeft.y, bottomRight.y),
    };
  }
}

export const transformManager = new Transform();

export const useTransform = () =>
  useSyncExternalStore(
    transformManager.subscribe.bind(transformManager),
    transformManager.getState,
    transformManager.getState
  );
