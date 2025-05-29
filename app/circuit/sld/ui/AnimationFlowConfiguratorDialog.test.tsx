// app/circuit/sld/ui/AnimationFlowConfiguratorDialog.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom'; // For .toBeInTheDocument()
import AnimationFlowConfiguratorDialog from './AnimationFlowConfiguratorDialog';
import { CustomFlowEdge, DataPoint, AnimationFlowConfig } from '@/types/sld'; // Assuming types are accessible

// Mock the DataLinkLiveValuePreview child component
const MockedDataLinkLiveValuePreview = jest.fn(({ dataPointId }) => (
  <div data-testid={`mocked-live-preview-${dataPointId}`}>
    Mocked Live Preview for {dataPointId}
  </div>
));
jest.mock('./DataLinkLiveValuePreview', () => ({
  __esModule: true, // This is important for ES6 modules
  default: MockedDataLinkLiveValuePreview,
}));


// Mock SearchableSelect to control its value for testing purposes
// This mock helps us simulate the selection of a data point.
const MockedSearchableSelect = jest.fn(({ value, onChange, placeholder }) => (
  <input
    data-testid={`searchable-select-${placeholder?.toLowerCase().includes('activation') ? 'active' : 'direction'}`}
    value={value || ''}
    onChange={(e) => onChange(e.target.value || undefined)} // Allow clearing, pass undefined if empty
    placeholder={placeholder}
  />
));
jest.mock('./SearchableSelect', () => ({
    __esModule: true,
    SearchableSelect: MockedSearchableSelect,
    // If ComboboxOption is also exported and used by AnimationFlowConfiguratorDialog directly, mock it or ensure it's available.
    // For this test, it seems not directly used by the Dialog logic itself, only by SearchableSelect.
}));


const mockOnOpenChange = jest.fn();
const mockOnConfigure = jest.fn();

const mockEdge: CustomFlowEdge = {
  id: 'edge-1',
  source: 'nodeA',
  target: 'nodeB',
  data: {
    label: 'Test Edge',
    dataPointLinks: [], // Start with no links for some tests
  },
};

const mockAvailableDataPoints: DataPoint[] = [
  { id: 'dp1', name: 'DP One (Active)', nodeId: 'ns=1;s=dp1', dataType: 'Boolean', unit: '' },
  { id: 'dp2', name: 'DP Two (Direction)', nodeId: 'ns=1;s=dp2', dataType: 'String', unit: '' },
  { id: 'dp3', name: 'DP Three (Other)', nodeId: 'ns=1;s=dp3', dataType: 'Float', unit: 'kW' },
];

describe('AnimationFlowConfiguratorDialog with Live Data Preview', () => {
  beforeEach(() => {
    // Clear all mock calls and instances before each test
    jest.clearAllMocks();
  });

  test('does not render previews when no data points are selected (initially)', () => {
    render(
      <AnimationFlowConfiguratorDialog
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        edge={mockEdge}
        availableDataPoints={mockAvailableDataPoints}
        onConfigure={mockOnConfigure}
      />
    );
    // Use queryByTestId as getByTestId would throw if not found
    expect(screen.queryByTestId(/mocked-live-preview-/)).toBeNull();
    expect(MockedDataLinkLiveValuePreview).not.toHaveBeenCalled();
  });

  test('renders preview for Flow Activation when selected and verifies props', () => {
    render(
      <AnimationFlowConfiguratorDialog
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        edge={mockEdge}
        availableDataPoints={mockAvailableDataPoints}
        onConfigure={mockOnConfigure}
      />
    );
    const activeDpSelector = screen.getByTestId('searchable-select-active');
    fireEvent.change(activeDpSelector, { target: { value: 'dp1' } });
    
    expect(screen.getByTestId('mocked-live-preview-dp1')).toBeInTheDocument();
    expect(MockedDataLinkLiveValuePreview).toHaveBeenCalledTimes(1);
    expect(MockedDataLinkLiveValuePreview).toHaveBeenCalledWith(
      expect.objectContaining({ 
        dataPointId: 'dp1',
        valueMapping: undefined, // As per current implementation
        format: undefined       // As per current implementation
      }),
      {} // Second argument to React component calls (context)
    );
  });

  test('renders preview for Flow Direction when selected and verifies props', () => {
    render(
      <AnimationFlowConfiguratorDialog
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        edge={mockEdge}
        availableDataPoints={mockAvailableDataPoints}
        onConfigure={mockOnConfigure}
      />
    );
    const directionDpSelector = screen.getByTestId('searchable-select-direction');
    fireEvent.change(directionDpSelector, { target: { value: 'dp2' } });

    expect(screen.getByTestId('mocked-live-preview-dp2')).toBeInTheDocument();
    expect(MockedDataLinkLiveValuePreview).toHaveBeenCalledTimes(1);
    expect(MockedDataLinkLiveValuePreview).toHaveBeenCalledWith(
      expect.objectContaining({ 
        dataPointId: 'dp2',
        valueMapping: undefined,
        format: undefined
      }),
      {}
    );
  });

  test('renders both previews when both are selected and verifies props', () => {
    render(
      <AnimationFlowConfiguratorDialog
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        edge={mockEdge}
        availableDataPoints={mockAvailableDataPoints}
        onConfigure={mockOnConfigure}
      />
    );
    const activeDpSelector = screen.getByTestId('searchable-select-active');
    fireEvent.change(activeDpSelector, { target: { value: 'dp1' } });
    
    const directionDpSelector = screen.getByTestId('searchable-select-direction');
    fireEvent.change(directionDpSelector, { target: { value: 'dp2' } });

    expect(screen.getByTestId('mocked-live-preview-dp1')).toBeInTheDocument();
    expect(screen.getByTestId('mocked-live-preview-dp2')).toBeInTheDocument();
    expect(MockedDataLinkLiveValuePreview).toHaveBeenCalledTimes(2);
    expect(MockedDataLinkLiveValuePreview).toHaveBeenCalledWith(expect.objectContaining({ dataPointId: 'dp1' }), {});
    expect(MockedDataLinkLiveValuePreview).toHaveBeenCalledWith(expect.objectContaining({ dataPointId: 'dp2' }), {});
  });

  test('removes preview when selection is cleared', () => {
    render(
      <AnimationFlowConfiguratorDialog
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        edge={mockEdge}
        availableDataPoints={mockAvailableDataPoints}
        onConfigure={mockOnConfigure}
      />
    );
    const activeDpSelector = screen.getByTestId('searchable-select-active');
    
    // Select a DP
    fireEvent.change(activeDpSelector, { target: { value: 'dp1' } });
    expect(screen.getByTestId('mocked-live-preview-dp1')).toBeInTheDocument();
    expect(MockedDataLinkLiveValuePreview).toHaveBeenCalledTimes(1);
    MockedDataLinkLiveValuePreview.mockClear(); // Clear calls for the next assertion

    // Clear selection
    fireEvent.change(activeDpSelector, { target: { value: '' } }); 
    expect(screen.queryByTestId('mocked-live-preview-dp1')).toBeNull();
    expect(MockedDataLinkLiveValuePreview).not.toHaveBeenCalled();
  });

  test('initializes with existing datalinks from edge prop', () => {
    const edgeWithLinks: CustomFlowEdge = {
      ...mockEdge,
      data: {
        ...mockEdge.data,
        dataPointLinks: [
          { dataPointId: 'dp1', targetProperty: 'isEnergized' },
          { dataPointId: 'dp2', targetProperty: 'flowDirection' },
        ],
      },
    };

    render(
      <AnimationFlowConfiguratorDialog
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        edge={edgeWithLinks}
        availableDataPoints={mockAvailableDataPoints}
        onConfigure={mockOnConfigure}
      />
    );

    // Check that SearchableSelects are initialized with these values
    expect(screen.getByTestId('searchable-select-active')).toHaveValue('dp1');
    expect(screen.getByTestId('searchable-select-direction')).toHaveValue('dp2');

    // Check that previews are rendered
    expect(screen.getByTestId('mocked-live-preview-dp1')).toBeInTheDocument();
    expect(screen.getByTestId('mocked-live-preview-dp2')).toBeInTheDocument();
    expect(MockedDataLinkLiveValuePreview).toHaveBeenCalledTimes(2);
    expect(MockedDataLinkLiveValuePreview).toHaveBeenCalledWith(expect.objectContaining({ dataPointId: 'dp1' }), {});
    expect(MockedDataLinkLiveValuePreview).toHaveBeenCalledWith(expect.objectContaining({ dataPointId: 'dp2' }), {});
  });

});
