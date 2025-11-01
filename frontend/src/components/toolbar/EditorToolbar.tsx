import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelectionStore } from '../../state/selectionStore';
import { Tool, useToolsStore } from '../../state/toolsStore';
import './EditorToolbar.css';

const tools: { key: Tool; i18nKey: string }[] = [
  { key: 'select', i18nKey: 'toolbar.select' },
  { key: 'line', i18nKey: 'toolbar.line' },
  { key: 'rect', i18nKey: 'toolbar.rect' },
  { key: 'polygon', i18nKey: 'toolbar.polygon' },
  { key: 'text', i18nKey: 'toolbar.text' },
  { key: 'delete', i18nKey: 'toolbar.delete' },
];

export const EditorToolbar = () => {
  const { t } = useTranslation();
  const activeTool = useToolsStore((s) => s.activeTool);
  const setTool = useToolsStore((s) => s.setTool);
  const deleteSelected = useSelectionStore((s) => s.deleteSelected);
  const selectedCount = useSelectionStore((s) => s.selectedIds.length);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Improve a11y: when tool changes, announce via title attribute focus move
    const el = containerRef.current?.querySelector(
      `[data-tool="${activeTool}"]`
    ) as HTMLButtonElement | null;
    if (el) {
      el.setAttribute('aria-current', 'true');
    }
    return () => {
      if (el) el.removeAttribute('aria-current');
    };
  }, [activeTool]);

  const onClickTool = (tool: Tool) => {
    if (tool === 'delete') {
      deleteSelected();
      return;
    }
    setTool(tool);
  };

  return (
    <div className="editor-toolbar" ref={containerRef} role="toolbar" aria-label={t('toolbar.label')}>
      {tools.map((tItem) => (
        <button
          key={tItem.key}
          type="button"
          className={`tool-btn ${activeTool === tItem.key ? 'active' : ''}`}
          aria-label={t(tItem.i18nKey)}
          aria-pressed={activeTool === tItem.key}
          title={t(tItem.i18nKey)}
          data-tool={tItem.key}
          onClick={() => onClickTool(tItem.key)}
          disabled={tItem.key === 'delete' && selectedCount === 0}
        >
          {t(tItem.i18nKey)}
        </button>
      ))}
      {activeTool === 'text' && <span className="sr-only" aria-live="polite">{t('toolbar.textMode')}</span>}
    </div>
  );
};

EditorToolbar.displayName = 'EditorToolbar';
