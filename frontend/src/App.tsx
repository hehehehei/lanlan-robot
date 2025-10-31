import { MutableRefObject, useCallback, useEffect, useRef, useState } from 'react';
import { Stage, Graphics } from '@pixi/react';
import type { Graphics as PixiGraphics } from 'pixi.js';
import { useTranslation } from 'react-i18next';

import { environment } from './config';

type Size = {
  width: number;
  height: number;
};

function useElementSize<T extends HTMLElement>(): [MutableRefObject<T | null>, Size] {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });

  useEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }

    const updateSize = () => {
      if (!ref.current) {
        return;
      }
      setSize({ width: ref.current.clientWidth, height: ref.current.clientHeight });
    };

    const observer = new ResizeObserver(updateSize);
    observer.observe(element);
    updateSize();

    return () => observer.disconnect();
  }, []);

  return [ref, size];
}

const App = () => {
  const { t } = useTranslation();
  const [canvasRef, canvasSize] = useElementSize<HTMLDivElement>();

  const drawPlaceholder = useCallback(
    (graphics: PixiGraphics) => {
      graphics.clear();
      graphics.lineStyle(2, 0xffffff, 1);

      const width = Math.max(Math.min(canvasSize.width * 0.6, canvasSize.height * 0.8), 120);
      const height = width * 0.6;
      const x = (canvasSize.width - width) / 2;
      const y = (canvasSize.height - height) / 2;

      graphics.drawRect(x, y, width, height);
    },
    [canvasSize.height, canvasSize.width]
  );

  return (
    <div className="app">
      <header className="toolbar">
        <h1 className="toolbar__title">{t('toolbar.title')}</h1>
        <div className="toolbar__actions">
          <button type="button">{t('toolbar.open')}</button>
          <button type="button">{t('toolbar.save')}</button>
          <button type="button">{t('toolbar.export')}</button>
        </div>
      </header>
      <div className="workspace">
        <aside className="sidebar">
          <h2 className="sidebar__title">{t('layers.title')}</h2>
          <p className="sidebar__placeholder">{t('layers.placeholder')}</p>
          <div className="sidebar__meta">
            <span>API: {environment.apiBaseUrl || '未配置'}</span>
          </div>
        </aside>
        <main className="canvas" ref={canvasRef}>
          {canvasSize.width > 0 && canvasSize.height > 0 ? (
            <Stage
              width={canvasSize.width}
              height={canvasSize.height}
              options={{ antialias: true, background: 0x000000 }}
              className="canvas__stage"
            >
              <Graphics draw={drawPlaceholder} />
            </Stage>
          ) : null}
        </main>
      </div>
    </div>
  );
};

export default App;
