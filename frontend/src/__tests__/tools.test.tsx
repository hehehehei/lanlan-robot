import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EditorToolbar } from '../components/toolbar/EditorToolbar';
import { useSelectionStore } from '../state/selectionStore';
import { useToolsStore } from '../state/toolsStore';
import '../i18n';

const resetStores = () => {
  useSelectionStore.getState().reset();
  useToolsStore.setState({
    activeTool: 'select',
    draft: null,
    isTextModalOpen: false,
    textDraft: { anchor: null, value: '' },
  });
};

describe('tools store workflows', () => {
  beforeEach(() => {
    resetStores();
  });

  it('creates a line through start/update/commit', () => {
    const tools = useToolsStore.getState();
    tools.setTool('line');
    tools.startLine({ x: 0, y: 0 });
    tools.updateLine({ x: 10, y: 0 });
    tools.commitLine();

    const items = useSelectionStore.getState().items;
    expect(Object.keys(items).length).toBe(1);
    const entity = Object.values(items)[0];
    expect(entity.bounds.min_x).toBe(0);
    expect(entity.bounds.max_x).toBe(10);
  });

  it('creates a polygon with multiple points', () => {
    const tools = useToolsStore.getState();
    tools.setTool('polygon');
    tools.startPolygon({ x: 0, y: 0 });
    tools.addPolygonPoint({ x: 10, y: 0 });
    tools.addPolygonPoint({ x: 10, y: 10 });
    tools.commitPolygon();

    const items = useSelectionStore.getState().items;
    expect(Object.keys(items).length).toBe(1);
    const entity = Object.values(items)[0];
    expect(entity.bounds.max_x).toBe(10);
    expect(entity.bounds.max_y).toBe(10);
  });

  it('validates text modal and commits a text entity', () => {
    const tools = useToolsStore.getState();
    tools.setTool('text');
    tools.openTextAt({ x: 5, y: 5 });
    let result = tools.confirmText();
    expect(result.ok).toBe(false);

    tools.updateTextValue('测试文本');
    result = tools.confirmText();
    expect(result.ok).toBe(true);

    const items = useSelectionStore.getState().items;
    expect(Object.keys(items).length).toBe(1);
  });
});

describe('EditorToolbar UI', () => {
  beforeEach(() => {
    resetStores();
  });

  it('renders Chinese labels and is accessible', () => {
    render(<EditorToolbar />);
    expect(screen.getByRole('toolbar', { name: '编辑工具' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '选择' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '直线' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '矩形' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '多边形' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '文本' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '删除' })).toBeInTheDocument();
  });

  it('delete button removes selected items', () => {
    const id = 123;
    useSelectionStore.getState().addOrUpdateEntity({
      id,
      bounds: { min_x: 0, min_y: 0, max_x: 1, max_y: 1 },
      entityType: 'LINE',
      data: {},
    });
    useSelectionStore.getState().selectIds([id]);

    render(<EditorToolbar />);
    const delBtn = screen.getByRole('button', { name: '删除' });
    expect(delBtn).not.toBeDisabled();
    fireEvent.click(delBtn);

    expect(Object.keys(useSelectionStore.getState().items).length).toBe(0);
    expect(useSelectionStore.getState().selectedIds.length).toBe(0);
  });
});
