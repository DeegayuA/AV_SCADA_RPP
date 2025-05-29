import { DataPointLink, AnimationFlowConfig } from '@/types/sld'; // Assuming AnimationFlowConfig is also in types or SLDInspectorDialog

// The core logic of the onConfigure callback, extracted for testability
// In a real scenario, this might be part of SLDInspectorDialog or a utility function.
const onConfigureLogic = (
  config: AnimationFlowConfig,
  currentDataLinks: DataPointLink[],
  setDataLinksCallback: (updater: (prevLinks: DataPointLink[]) => DataPointLink[]) => void
): void => {
  setDataLinksCallback(prevLinks => {
    let newLinks = [...prevLinks];

    // Handle Flow Activation Link (isEnergized)
    const activeTargetProperty = 'isEnergized';
    const existingActiveLinkIndex = newLinks.findIndex(link => link.targetProperty === activeTargetProperty);

    if (config.flowActiveDataPointId) {
      if (existingActiveLinkIndex !== -1) {
        newLinks[existingActiveLinkIndex] = {
          ...newLinks[existingActiveLinkIndex],
          dataPointId: config.flowActiveDataPointId,
        };
      } else {
        newLinks.push({
          dataPointId: config.flowActiveDataPointId,
          targetProperty: activeTargetProperty,
          // Add default format if needed, based on actual implementation
        });
      }
    } else { // flowActiveDataPointId is not provided, remove existing link
      if (existingActiveLinkIndex !== -1) {
        newLinks.splice(existingActiveLinkIndex, 1);
      }
    }

    // Handle Flow Direction Link (flowDirection)
    const directionTargetProperty = 'flowDirection';
    // Re-find index in case newLinks was modified by active link logic
    const existingDirectionLinkIndex = newLinks.findIndex(link => link.targetProperty === directionTargetProperty);

    if (config.flowDirectionDataPointId) {
      if (existingDirectionLinkIndex !== -1) {
        newLinks[existingDirectionLinkIndex] = {
          ...newLinks[existingDirectionLinkIndex],
          dataPointId: config.flowDirectionDataPointId,
        };
      } else {
        newLinks.push({
          dataPointId: config.flowDirectionDataPointId,
          targetProperty: directionTargetProperty,
          // Add default format if needed
        });
      }
    } else { // flowDirectionDataPointId is not provided, remove existing link
      if (existingDirectionLinkIndex !== -1) {
        newLinks.splice(existingDirectionLinkIndex, 1);
      }
    }
    return newLinks;
  });
};

describe('SLDInspectorDialog - Animation Flow onConfigure Logic', () => {
  let mockSetDataLinks: jest.Mock;
  let currentDataLinksState: DataPointLink[];

  beforeEach(() => {
    // Initialize with a fresh mock for each test
    currentDataLinksState = [];
    mockSetDataLinks = jest.fn((updaterOrValue) => {
      if (typeof updaterOrValue === 'function') {
        currentDataLinksState = updaterOrValue(currentDataLinksState);
      } else {
        currentDataLinksState = updaterOrValue;
      }
    });
  });

  const simulateOnConfigure = (config: AnimationFlowConfig, initialLinks: DataPointLink[]) => {
    currentDataLinksState = [...initialLinks]; // Set initial state for the simulation
    onConfigureLogic(config, currentDataLinksState, mockSetDataLinks);
    return currentDataLinksState; // Return the state after the logic has run
  };

  test('should add new links for active and direction', () => {
    const initialLinks: DataPointLink[] = [];
    const config: AnimationFlowConfig = { flowActiveDataPointId: 'dp1', flowDirectionDataPointId: 'dp2' };
    
    const result = simulateOnConfigure(config, initialLinks);

    expect(mockSetDataLinks).toHaveBeenCalledTimes(1);
    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ dataPointId: 'dp1', targetProperty: 'isEnergized' }),
        expect.objectContaining({ dataPointId: 'dp2', targetProperty: 'flowDirection' }),
      ])
    );
    expect(result.length).toBe(2);
  });

  test('should update existing links', () => {
    const initialLinks: DataPointLink[] = [
      { dataPointId: 'old_dp_active', targetProperty: 'isEnergized' },
      { dataPointId: 'old_dp_direction', targetProperty: 'flowDirection' },
    ];
    const config: AnimationFlowConfig = { flowActiveDataPointId: 'new_dp_active', flowDirectionDataPointId: 'new_dp_direction' };
    
    const result = simulateOnConfigure(config, initialLinks);

    expect(mockSetDataLinks).toHaveBeenCalledTimes(1);
    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ dataPointId: 'new_dp_active', targetProperty: 'isEnergized' }),
        expect.objectContaining({ dataPointId: 'new_dp_direction', targetProperty: 'flowDirection' }),
      ])
    );
    expect(result.length).toBe(2);
  });
  
  test('should remove a link if its config dpId is undefined', () => {
    const initialLinks: DataPointLink[] = [
      { dataPointId: 'dp1', targetProperty: 'isEnergized' },
      { dataPointId: 'dp2', targetProperty: 'flowDirection' },
    ];
    const config: AnimationFlowConfig = { flowActiveDataPointId: 'dp1', flowDirectionDataPointId: undefined };
    
    const result = simulateOnConfigure(config, initialLinks);

    expect(mockSetDataLinks).toHaveBeenCalledTimes(1);
    expect(result).toEqual(
        expect.arrayContaining([
            expect.objectContaining({ dataPointId: 'dp1', targetProperty: 'isEnergized' }),
        ])
    );
    expect(result.length).toBe(1);
    expect(result.find(l => l.targetProperty === 'flowDirection')).toBeUndefined();
  });

  test('should remove all relevant links and preserve others', () => {
    const initialLinks: DataPointLink[] = [
      { dataPointId: 'dp1', targetProperty: 'isEnergized' },
      { dataPointId: 'dp2', targetProperty: 'flowDirection' },
      { dataPointId: 'dp3', targetProperty: 'other' }, // This should be preserved
    ];
    const config: AnimationFlowConfig = { flowActiveDataPointId: undefined, flowDirectionDataPointId: undefined };
    
    const result = simulateOnConfigure(config, initialLinks);

    expect(mockSetDataLinks).toHaveBeenCalledTimes(1);
    expect(result).toEqual(
        expect.arrayContaining([
            expect.objectContaining({ dataPointId: 'dp3', targetProperty: 'other' }),
        ])
    );
    expect(result.length).toBe(1);
    expect(result.find(l => l.targetProperty === 'isEnergized')).toBeUndefined();
    expect(result.find(l => l.targetProperty === 'flowDirection')).toBeUndefined();
  });
  
  test('should add one link when one already exists for another target', () => {
    const initialLinks: DataPointLink[] = [{ dataPointId: 'dp_other', targetProperty: 'strokeColor'}];
    const config: AnimationFlowConfig = { flowActiveDataPointId: 'dp_active', flowDirectionDataPointId: undefined };
    
    const result = simulateOnConfigure(config, initialLinks);

    expect(mockSetDataLinks).toHaveBeenCalledTimes(1);
    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ dataPointId: 'dp_other', targetProperty: 'strokeColor'}),
        expect.objectContaining({ dataPointId: 'dp_active', targetProperty: 'isEnergized' })
      ])
    );
    expect(result.length).toBe(2);
  });

  test('should add only direction link if active is undefined', () => {
    const initialLinks: DataPointLink[] = [];
    const config: AnimationFlowConfig = { flowActiveDataPointId: undefined, flowDirectionDataPointId: 'dp_dir' };
    
    const result = simulateOnConfigure(config, initialLinks);

    expect(mockSetDataLinks).toHaveBeenCalledTimes(1);
    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ dataPointId: 'dp_dir', targetProperty: 'flowDirection' }),
      ])
    );
    expect(result.length).toBe(1);
    expect(result.find(l => l.targetProperty === 'isEnergized')).toBeUndefined();
  });

  test('should handle initial empty links and empty config', () => {
    const initialLinks: DataPointLink[] = [];
    const config: AnimationFlowConfig = { flowActiveDataPointId: undefined, flowDirectionDataPointId: undefined };
    
    const result = simulateOnConfigure(config, initialLinks);

    expect(mockSetDataLinks).toHaveBeenCalledTimes(1);
    expect(result).toEqual([]);
    expect(result.length).toBe(0);
  });

  test('should replace existing link when adding a new one for the same target property', () => {
    // This scenario is implicitly covered by "update existing links" but can be explicit
    const initialLinks: DataPointLink[] = [
        { dataPointId: 'dp_old_active', targetProperty: 'isEnergized' }
    ];
    const config: AnimationFlowConfig = { flowActiveDataPointId: 'dp_new_active', flowDirectionDataPointId: undefined };
    
    const result = simulateOnConfigure(config, initialLinks);

    expect(mockSetDataLinks).toHaveBeenCalledTimes(1);
    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ dataPointId: 'dp_new_active', targetProperty: 'isEnergized' }),
      ])
    );
    expect(result.length).toBe(1);
  });

  test('should correctly add links when initial state has unrelated links', () => {
    const initialLinks: DataPointLink[] = [
        { dataPointId: 'dp_unrelated1', targetProperty: 'fillColor' },
        { dataPointId: 'dp_unrelated2', targetProperty: 'opacity' },
    ];
    const config: AnimationFlowConfig = { flowActiveDataPointId: 'dp1', flowDirectionDataPointId: 'dp2' };
    
    const result = simulateOnConfigure(config, initialLinks);

    expect(mockSetDataLinks).toHaveBeenCalledTimes(1);
    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ dataPointId: 'dp_unrelated1', targetProperty: 'fillColor' }),
        expect.objectContaining({ dataPointId: 'dp_unrelated2', targetProperty: 'opacity' }),
        expect.objectContaining({ dataPointId: 'dp1', targetProperty: 'isEnergized' }),
        expect.objectContaining({ dataPointId: 'dp2', targetProperty: 'flowDirection' }),
      ])
    );
    expect(result.length).toBe(4);
  });
});
