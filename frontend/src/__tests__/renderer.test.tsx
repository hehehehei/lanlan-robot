import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Layer } from '../api/types';
import { LayerVisibilityControls } from '../components/canvas/Renderer';
import { useLayersStore } from '../state/store';

const SAMPLE_LAYERS: Layer[] = [
  {
    id: 10,
    file_id: 0,
    name: 'Layer A',
    is_locked: false,
    is_visible: true,
    color: '#ffcc00',
    line_type: 'Continuous',
    line_weight: 'Default',
    min_x: 0,
    min_y: 0,
    max_x: 100,
    max_y: 100,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 20,
    file_id: 0,
    name: 'Layer B',
    is_locked: false,
    is_visible: true,
    color: '#00ccff',
    line_type: 'Dashed',
    line_weight: 'Default',
    min_x: 0,
    min_y: 0,
    max_x: 200,
    max_y: 150,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

const ControlsWrapper = () => {
  const visibleLayerIds = useLayersStore((state) => state.selectedLayerIds);
  const toggleLayerSelection = useLayersStore(
    (state) => state.toggleLayerSelection
  );
  const selectLayers = useLayersStore((state) => state.selectLayers);

  return (
    <LayerVisibilityControls
      layers={SAMPLE_LAYERS}
      visibleLayerIds={visibleLayerIds}
      onToggleLayer={toggleLayerSelection}
      onShowAll={() => selectLayers(SAMPLE_LAYERS.map((layer) => layer.id))}
      onHideAll={() => selectLayers([])}
      onResetView={() => {}}
    />
  );
};

describe('LayerVisibilityControls', () => {
  beforeEach(() => {
    useLayersStore.setState({
      layers: { 0: SAMPLE_LAYERS },
      selectedLayerIds: SAMPLE_LAYERS.map((layer) => layer.id),
    });
  });

  it('toggles a single layer visibility state', () => {
    render(<ControlsWrapper />);

    const layerToggle = screen.getByLabelText('Layer A');
    fireEvent.click(layerToggle);

    const state = useLayersStore.getState();
    expect(state.selectedLayerIds).not.toContain(SAMPLE_LAYERS[0].id);
  });

  it('handles show all and hide all actions', () => {
    render(<ControlsWrapper />);

    fireEvent.click(screen.getByRole('button', { name: /hide all/i }));
    let state = useLayersStore.getState();
    expect(state.selectedLayerIds).toHaveLength(0);

    fireEvent.click(screen.getByRole('button', { name: /show all/i }));
    state = useLayersStore.getState();
    expect(state.selectedLayerIds).toEqual(
      SAMPLE_LAYERS.map((layer) => layer.id)
    );
  });
});
