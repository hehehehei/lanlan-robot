import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as PIXI from 'pixi.js';
import type { Entity, Layer } from '../../api/types';
import { useEntitiesStore, useFilesStore, useLayersStore } from '../../state/store';
import { transformManager, useTransform, type Point } from '../../lib/transform';
import {
  SpatialIndex,
  type Bounds,
  type SpatialRecord,
} from '../../lib/spatial';

const SAMPLE_FILE_ID = 0;
const SAMPLE_CREATED_AT = '2024-01-01T00:00:00Z';
const SAMPLE_UPDATED_AT = '2024-01-01T00:00:00Z';

const SAMPLE_LAYERS: Layer[] = [
  {
    id: 1,
    file_id: SAMPLE_FILE_ID,
    name: 'Geometry',
    is_locked: false,
    is_visible: true,
    color: '#00FFFF',
    line_type: 'Continuous',
    line_weight: 'Default',
    min_x: -160,
    min_y: -120,
    max_x: 220,
    max_y: 140,
    created_at: SAMPLE_CREATED_AT,
    updated_at: SAMPLE_UPDATED_AT,
  },
  {
    id: 2,
    file_id: SAMPLE_FILE_ID,
    name: 'Annotations',
    is_locked: false,
    is_visible: true,
    color: '#FFFF66',
    line_type: 'Dashed',
    line_weight: 'Default',
    min_x: -80,
    min_y: -80,
    max_x: 180,
    max_y: 120,
    created_at: SAMPLE_CREATED_AT,
    updated_at: SAMPLE_UPDATED_AT,
  },
];

const SAMPLE_ENTITIES: Record<number, Entity[]> = {
  1: [
    {
      id: 1001,
      layer_id: 1,
      entity_type: 'LINE',
      data: {
        start: { x: -140, y: -40 },
        end: { x: 200, y: -40 },
      },
      min_x: -140,
      min_y: -40,
      max_x: 200,
      max_y: -40,
      created_at: SAMPLE_CREATED_AT,
      updated_at: SAMPLE_UPDATED_AT,
    },
    {
      id: 1002,
      layer_id: 1,
      entity_type: 'POLYLINE',
      data: {
        vertices: [
          { x: -120, y: -80 },
          { x: -40, y: 20 },
          { x: 40, y: -30 },
          { x: 120, y: 70 },
        ],
      },
      min_x: -120,
      min_y: -80,
      max_x: 120,
      max_y: 70,
      created_at: SAMPLE_CREATED_AT,
      updated_at: SAMPLE_UPDATED_AT,
    },
    {
      id: 1003,
      layer_id: 1,
      entity_type: 'ARC',
      data: {
        center: { x: 0, y: 0 },
        radius: 60,
        start_angle: 0,
        end_angle: 210,
      },
      min_x: -60,
      min_y: -60,
      max_x: 60,
      max_y: 60,
      created_at: SAMPLE_CREATED_AT,
      updated_at: SAMPLE_UPDATED_AT,
    },
    {
      id: 1004,
      layer_id: 1,
      entity_type: 'CIRCLE',
      data: {
        center: { x: 140, y: 40 },
        radius: 28,
      },
      min_x: 112,
      min_y: 12,
      max_x: 168,
      max_y: 68,
      created_at: SAMPLE_CREATED_AT,
      updated_at: SAMPLE_UPDATED_AT,
    },
  ],
  2: [
    {
      id: 2001,
      layer_id: 2,
      entity_type: 'TEXT',
      data: {
        position: { x: -60, y: 80 },
        text: 'Sample Label',
        height: 12,
      },
      min_x: -60,
      min_y: 68,
      max_x: 20,
      max_y: 92,
      created_at: SAMPLE_CREATED_AT,
      updated_at: SAMPLE_UPDATED_AT,
    },
    {
      id: 2002,
      layer_id: 2,
      entity_type: 'INSERT',
      data: {
        block_name: 'DoorBlock',
        position: { x: 120, y: -40 },
        scale: { x: 1, y: 1 },
        rotation: 30,
      },
      min_x: 110,
      min_y: -50,
      max_x: 130,
      max_y: -30,
      created_at: SAMPLE_CREATED_AT,
      updated_at: SAMPLE_UPDATED_AT,
    },
  ],
};

const COLOR_INDEX_MAP: Record<string, number> = {
  '1': 0xff0000,
  '2': 0xffff00,
  '3': 0x00ff00,
  '4': 0x00ffff,
  '5': 0x0000ff,
  '6': 0xff00ff,
  '7': 0xffffff,
};

interface LayerDisplay {
  container: PIXI.Container;
  graphics: PIXI.Graphics;
  textContainer: PIXI.Container;
}

interface PerformanceMetrics {
  count: number;
  buildTime: number;
  queryTime: number;
}

export interface LayerVisibilityControlsProps {
  layers: Layer[];
  visibleLayerIds: number[];
  onToggleLayer: (layerId: number) => void;
  onShowAll: () => void;
  onHideAll: () => void;
  onResetView: () => void;
}

export const LayerVisibilityControls = ({
  layers,
  visibleLayerIds,
  onToggleLayer,
  onShowAll,
  onHideAll,
  onResetView,
}: LayerVisibilityControlsProps) => {
  return (
    <div className="renderer-panel">
      <h3 className="renderer-panel__title">Layers</h3>
      <div className="renderer-panel__layers">
        {layers.map((layer) => {
          const checked = visibleLayerIds.includes(layer.id);
          return (
            <label key={layer.id} className="renderer-panel__layer-toggle">
              <input
                type="checkbox"
                checked={checked}
                onChange={() => onToggleLayer(layer.id)}
              />
              <span className="renderer-panel__layer-label">{layer.name}</span>
            </label>
          );
        })}
      </div>
      <div className="renderer-panel__actions">
        <button type="button" onClick={onShowAll}>
          Show all
        </button>
        <button type="button" onClick={onHideAll}>
          Hide all
        </button>
        <button type="button" onClick={onResetView}>
          Reset view
        </button>
      </div>
    </div>
  );
};

const ensureSampleDataLoaded = () => {
  const layerState = useLayersStore.getState();
  if (!layerState.layers[SAMPLE_FILE_ID]) {
    useLayersStore.setState((state) => ({
      layers: { ...state.layers, [SAMPLE_FILE_ID]: SAMPLE_LAYERS },
      selectedLayerIds: SAMPLE_LAYERS.map((layer) => layer.id),
    }));
  } else if (!layerState.selectedLayerIds.length) {
    useLayersStore.setState(() => ({
      selectedLayerIds: SAMPLE_LAYERS.map((layer) => layer.id),
    }));
  }

  const entitiesState = useEntitiesStore.getState();
  const hasEntities = SAMPLE_LAYERS.every(
    (layer) => entitiesState.entities[layer.id]?.length
  );
  if (!hasEntities) {
    useEntitiesStore.setState((state) => ({
      entities: { ...state.entities, ...SAMPLE_ENTITIES },
    }));
  }

  const filesState = useFilesStore.getState();
  if (filesState.selectedFileId === null) {
    useFilesStore.setState({ selectedFileId: SAMPLE_FILE_ID });
  }
};

const resolveLayerColor = (layer: Layer): number => {
  if (layer.color) {
    if (layer.color.startsWith('#')) {
      return parseInt(layer.color.replace('#', ''), 16);
    }
    const mapped = COLOR_INDEX_MAP[layer.color];
    if (mapped !== undefined) {
      return mapped;
    }
    const parsed = Number(layer.color);
    if (!Number.isNaN(parsed)) {
      const hex = COLOR_INDEX_MAP[parsed.toString()];
      if (hex !== undefined) {
        return hex;
      }
    }
  }
  return 0xffffff;
};

const toNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return fallback;
};

const toPoint = (value: unknown): Point => {
  if (typeof value === 'object' && value !== null) {
    const maybePoint = value as Record<string, unknown>;
    return {
      x: toNumber(maybePoint.x),
      y: toNumber(maybePoint.y),
    };
  }
  return { x: 0, y: 0 };
};

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

export const Renderer = () => {
  const transform = useTransform();
  const scale = transform.scale;
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const displaysRef = useRef<Map<number, LayerDisplay>>(new Map());
  const spatialIndexesRef = useRef<Map<number, SpatialIndex<Entity>>>(
    new Map()
  );
  const benchmarkRef = useRef<PerformanceMetrics | null>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<
    PerformanceMetrics | null
  >(null);

  const layersByFile = useLayersStore((state) => state.layers);
  const selectedLayerIds = useLayersStore((state) => state.selectedLayerIds);
  const toggleLayerSelection = useLayersStore(
    (state) => state.toggleLayerSelection
  );
  const selectLayers = useLayersStore((state) => state.selectLayers);
  const entitiesByLayer = useEntitiesStore((state) => state.entities);
  const selectedFileId = useFilesStore((state) => state.selectedFileId);
  const activeFileId = selectedFileId ?? SAMPLE_FILE_ID;

  useEffect(() => {
    if (selectedFileId === null) {
      ensureSampleDataLoaded();
    }
  }, [selectedFileId]);

  const layers = useMemo(
    () => layersByFile[activeFileId] ?? [],
    [activeFileId, layersByFile]
  );

  const visibleLayerIds = useMemo(() => {
    if (!selectedLayerIds.length) {
      return layers.map((layer) => layer.id);
    }
    const layerIds = new Set(layers.map((layer) => layer.id));
    return selectedLayerIds.filter((layerId) => layerIds.has(layerId));
  }, [layers, selectedLayerIds]);

  const getEntitiesForLayer = useCallback(
    (layerId: number, bounds: Bounds): Entity[] => {
      const index = spatialIndexesRef.current.get(layerId);
      if (index) {
        return index.search(bounds).map((record) => record.item);
      }
      return entitiesByLayer[layerId] ?? [];
    },
    [entitiesByLayer]
  );

  const drawLine = useCallback(
    (
      graphics: PIXI.Graphics,
      start: Point,
      end: Point,
      color: number,
      lineWidth: number
    ) => {
      const startScreen = transformManager.worldToScreen(start);
      const endScreen = transformManager.worldToScreen(end);
      graphics.beginPath();
      graphics.moveTo(startScreen.x, startScreen.y);
      graphics.lineTo(endScreen.x, endScreen.y);
      graphics.stroke({ width: lineWidth, color, alpha: 1 });
    },
    []
  );

  const drawPolyline = useCallback(
    (
      graphics: PIXI.Graphics,
      points: Point[],
      color: number,
      lineWidth: number
    ) => {
      if (!points.length) return;
      graphics.beginPath();
      const [first, ...rest] = points;
      const firstScreen = transformManager.worldToScreen(first);
      graphics.moveTo(firstScreen.x, firstScreen.y);
      for (const point of rest) {
        const screen = transformManager.worldToScreen(point);
        graphics.lineTo(screen.x, screen.y);
      }
      graphics.stroke({ width: lineWidth, color, alpha: 1 });
    },
    []
  );

  const drawArc = useCallback(
    (
      graphics: PIXI.Graphics,
      center: Point,
      radius: number,
      startAngle: number,
      endAngle: number,
      color: number,
      lineWidth: number
    ) => {
      graphics.beginPath();
      const screenCenter = transformManager.worldToScreen(center);
      const radiusPixels = Math.abs(radius * scale);
      const start = -toRadians(startAngle);
      const end = -toRadians(endAngle);
      graphics.arc(screenCenter.x, screenCenter.y, radiusPixels, start, end);
      graphics.stroke({ width: lineWidth, color, alpha: 1 });
    },
    [scale]
  );

  const drawCircle = useCallback(
    (
      graphics: PIXI.Graphics,
      center: Point,
      radius: number,
      color: number,
      lineWidth: number
    ) => {
      graphics.beginPath();
      const screenCenter = transformManager.worldToScreen(center);
      const radiusPixels = Math.max(Math.abs(radius * scale), 1);
      graphics.circle(screenCenter.x, screenCenter.y, radiusPixels);
      graphics.stroke({ width: lineWidth, color, alpha: 1 });
    },
    [scale]
  );

  const drawInsert = useCallback(
    (
      graphics: PIXI.Graphics,
      position: Point,
      color: number,
      label: string
    ) => {
      const screen = transformManager.worldToScreen(position);
      const size = 12;
      graphics.beginPath();
      graphics.moveTo(screen.x - size, screen.y);
      graphics.lineTo(screen.x + size, screen.y);
      graphics.moveTo(screen.x, screen.y - size);
      graphics.lineTo(screen.x, screen.y + size);
      graphics.stroke({ width: 1.5, color, alpha: 1 });

      const text = new PIXI.Text({
        text: label,
        style: {
          fill: color,
          fontSize: 12,
          fontFamily: 'Arial, sans-serif',
        },
      });
      text.x = screen.x + 8;
      text.y = screen.y - 12;
      text.anchor.set(0, 1);
      return text;
    },
    []
  );

  const drawText = useCallback(
    (content: string, position: Point, color: number, height: number) => {
      const screen = transformManager.worldToScreen(position);
      const fontSize = Math.max(10, height * scale);
      const text = new PIXI.Text({
        text: content,
        style: {
          fill: color,
          fontSize,
          fontFamily: 'Arial, sans-serif',
        },
      });
      text.x = screen.x;
      text.y = screen.y;
      text.anchor.set(0, 1);
      return text;
    },
    [scale]
  );

  const updateSpatialIndexes = useCallback(() => {
    const map = new Map<number, SpatialIndex<Entity>>();
    for (const layer of layers) {
      const index = new SpatialIndex<Entity>();
      const layerEntities = entitiesByLayer[layer.id] ?? [];
      const records: SpatialRecord<Entity>[] = layerEntities.map((entity) => ({
        minX: entity.min_x,
        minY: entity.min_y,
        maxX: entity.max_x,
        maxY: entity.max_y,
        item: entity,
      }));
      index.load(records);
      map.set(layer.id, index);
    }
    spatialIndexesRef.current = map;
  }, [entitiesByLayer, layers]);

  const cleanupStage = useCallback(() => {
    const app = appRef.current;
    if (!app) return;
    const displays = displaysRef.current;
    for (const display of displays.values()) {
      display.container.destroy({ children: true });
    }
    displays.clear();
    spatialIndexesRef.current.clear();
  }, []);

  const updateScene = useCallback(() => {
    const app = appRef.current;
    if (!app) return;

    const viewBounds = transformManager.getViewBounds();
    const displays = displaysRef.current;
    const stage = app.stage;

    const layerIdSet = new Set(layers.map((layer) => layer.id));
    for (const [id, display] of displays.entries()) {
      if (!layerIdSet.has(id)) {
        display.container.destroy({ children: true });
        displays.delete(id);
      }
    }

    for (const layer of layers) {
      if (!displays.has(layer.id)) {
        const container = new PIXI.Container();
        const graphics = new PIXI.Graphics();
        const textContainer = new PIXI.Container();
        container.addChild(graphics);
        container.addChild(textContainer);
        stage.addChild(container);
        displays.set(layer.id, { container, graphics, textContainer });
      }
    }

    for (const layer of layers) {
      const display = displays.get(layer.id);
      if (!display) continue;
      const isVisible = visibleLayerIds.includes(layer.id);
      display.container.visible = isVisible;
      if (!isVisible) {
        continue;
      }

      display.graphics.clear();
      for (const child of [...display.textContainer.children]) {
        child.destroy();
      }
      display.textContainer.removeChildren();

      const color = resolveLayerColor(layer);
      const entities = getEntitiesForLayer(layer.id, viewBounds);
      const lineWidth = Math.max(1, scale * 0.4);

      for (const entity of entities) {
        switch (entity.entity_type) {
          case 'LINE': {
            const start = toPoint((entity.data as Record<string, unknown>).start);
            const end = toPoint((entity.data as Record<string, unknown>).end);
            drawLine(display.graphics, start, end, color, lineWidth);
            break;
          }
          case 'POLYLINE': {
            const raw = entity.data as Record<string, unknown>;
            const verticesSource =
              (raw.vertices as unknown[]) ?? (raw.points as unknown[]);
            const points = Array.isArray(verticesSource)
              ? verticesSource.map(toPoint)
              : [];
            drawPolyline(display.graphics, points, color, lineWidth);
            break;
          }
          case 'ARC': {
            const raw = entity.data as Record<string, unknown>;
            const center = toPoint(raw.center);
            const radius = toNumber(raw.radius, 0);
            const startAngle = toNumber(raw.start_angle, 0);
            const endAngle = toNumber(raw.end_angle, 360);
            drawArc(
              display.graphics,
              center,
              radius,
              startAngle,
              endAngle,
              color,
              lineWidth
            );
            break;
          }
          case 'CIRCLE': {
            const raw = entity.data as Record<string, unknown>;
            const center = toPoint(raw.center);
            const radius = toNumber(raw.radius, 0);
            drawCircle(display.graphics, center, radius, color, lineWidth);
            break;
          }
          case 'TEXT': {
            const raw = entity.data as Record<string, unknown>;
            const position = toPoint(raw.position);
            const content =
              typeof raw.text === 'string'
                ? raw.text
                : typeof raw.content === 'string'
                ? raw.content
                : '';
            const height = toNumber(raw.height, 12);
            if (content) {
              const text = drawText(content, position, color, height);
              display.textContainer.addChild(text);
            }
            break;
          }
          case 'INSERT': {
            const raw = entity.data as Record<string, unknown>;
            const position = toPoint(raw.position);
            const label =
              typeof raw.block_name === 'string' ? raw.block_name : 'Block';
            const text = drawInsert(display.graphics, position, color, label);
            if (text) {
              display.textContainer.addChild(text);
            }
            break;
          }
          default:
            break;
        }
      }
    }
    app.render();
  }, [
    drawArc,
    drawCircle,
    drawInsert,
    drawLine,
    drawPolyline,
    drawText,
    getEntitiesForLayer,
    layers,
    scale,
    visibleLayerIds,
  ]);

  useEffect(() => {
    let isMounted = true;
    const initApp = async () => {
      if (appRef.current || !containerRef.current) {
        return;
      }
      const app = new PIXI.Application();
      await app.init({
        background: '#000000',
        resizeTo: containerRef.current,
        antialias: true,
      });
      if (!isMounted) {
        app.destroy(true);
        return;
      }
      appRef.current = app;
      containerRef.current.appendChild(app.canvas);
      updateScene();
    };
    initApp();

    return () => {
      isMounted = false;
      cleanupStage();
      if (appRef.current) {
        appRef.current.destroy(true);
        appRef.current = null;
      }
    };
  }, [cleanupStage, updateScene]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const rect = element.getBoundingClientRect();
    transformManager.setViewport(rect.width, rect.height);

    if (typeof ResizeObserver === 'undefined') {
      return;
    }

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      transformManager.setViewport(entry.contentRect.width, entry.contentRect.height);
    });
    resizeObserver.observe(element);

    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    let isPanning = false;
    let lastPosition: Point | null = null;

    const onPointerDown = (event: PointerEvent) => {
      isPanning = true;
      lastPosition = { x: event.clientX, y: event.clientY };
      element.setPointerCapture?.(event.pointerId);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!isPanning || !lastPosition) return;
      const deltaX = event.clientX - lastPosition.x;
      const deltaY = event.clientY - lastPosition.y;
      transformManager.pan({ x: deltaX, y: deltaY });
      lastPosition = { x: event.clientX, y: event.clientY };
    };

    const onPointerUp = (event: PointerEvent) => {
      isPanning = false;
      lastPosition = null;
      element.releasePointerCapture?.(event.pointerId);
    };

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = element.getBoundingClientRect();
      const pivot: Point = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
      const factor = event.deltaY < 0 ? 1.1 : 0.9;
      transformManager.zoom(factor, pivot);
    };

    element.addEventListener('pointerdown', onPointerDown);
    element.addEventListener('pointermove', onPointerMove);
    element.addEventListener('pointerup', onPointerUp);
    element.addEventListener('pointerleave', onPointerUp);
    element.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      element.removeEventListener('pointerdown', onPointerDown);
      element.removeEventListener('pointermove', onPointerMove);
      element.removeEventListener('pointerup', onPointerUp);
      element.removeEventListener('pointerleave', onPointerUp);
      element.removeEventListener('wheel', onWheel);
    };
  }, []);

  useEffect(() => {
    updateSpatialIndexes();
  }, [updateSpatialIndexes]);

  useEffect(() => {
    updateScene();
  }, [updateScene, transform]);

  useEffect(() => {
    if (benchmarkRef.current || typeof window === 'undefined') {
      return;
    }

    const runBenchmark = () => {
      const count = 100_000;
      const baseY = 2000;
      const mockEntities: SpatialRecord<Entity>[] = [];
      for (let i = 0; i < count; i += 1) {
        const x = (i % 1000) * 2;
        const y = baseY + Math.floor(i / 1000) * 2;
        const entity: Entity = {
          id: 300000 + i,
          layer_id: 9999,
          entity_type: 'LINE',
          data: {
            start: { x, y },
            end: { x: x + 1, y: y + 1 },
          },
          min_x: x,
          min_y: y,
          max_x: x + 1,
          max_y: y + 1,
          created_at: SAMPLE_CREATED_AT,
          updated_at: SAMPLE_UPDATED_AT,
        };
        mockEntities.push({
          minX: entity.min_x,
          minY: entity.min_y,
          maxX: entity.max_x,
          maxY: entity.max_y,
          item: entity,
        });
      }

      const index = new SpatialIndex<Entity>();
      const buildStart = performance.now();
      index.load(mockEntities);
      const buildTime = performance.now() - buildStart;

      const queryStart = performance.now();
      index.search({ minX: 0, minY: baseY, maxX: 400, maxY: baseY + 400 });
      const queryTime = performance.now() - queryStart;

      const metrics: PerformanceMetrics = {
        count,
        buildTime,
        queryTime,
      };
      benchmarkRef.current = metrics;
      setPerformanceMetrics(metrics);
    };

    runBenchmark();
  }, []);

  const handleShowAll = useCallback(() => {
    selectLayers(layers.map((layer) => layer.id));
  }, [layers, selectLayers]);

  const handleHideAll = useCallback(() => {
    selectLayers([]);
  }, [selectLayers]);

  const handleResetView = useCallback(() => {
    transformManager.reset();
  }, []);

  return (
    <div className="renderer-root">
      <div ref={containerRef} className="renderer-surface" />
      <div className="renderer-overlay">
        <LayerVisibilityControls
          layers={layers}
          visibleLayerIds={visibleLayerIds}
          onToggleLayer={toggleLayerSelection}
          onShowAll={handleShowAll}
          onHideAll={handleHideAll}
          onResetView={handleResetView}
        />
        {performanceMetrics && (
          <div className="performance-metrics">
            <h4>Performance snapshot</h4>
            <div>
              Entities measured:{' '}
              {performanceMetrics.count.toLocaleString()}
            </div>
            <div>
              Index build: {performanceMetrics.buildTime.toFixed(2)} ms
            </div>
            <div>
              View query: {performanceMetrics.queryTime.toFixed(2)} ms
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
