// themeColors.js (or inline in your component)

// Light Theme
const lightThemeColors = {
  miniMapBg: 'rgba(240, 240, 240, 0.92)', // Slightly transparent off-white
  nodeColorDefault: '#9e9e9e',          // Medium gray for nodes
  nodeColorInput: '#66BB6A',             // Softer Green
  nodeColorDefaultStroke: '#757575',     // Darker gray stroke
  nodeColorOutput: '#42A5F5',            // Softer Blue
  maskBg: 'rgba(100, 100, 100, 0.15)',    // Subtle dark overlay for viewport
  maskStroke: '#007AFF',                 // A common UI blue for viewport border
};

// Dark Theme
const darkThemeColors = {
  miniMapBg: 'rgba(40, 40, 40, 0.92)',  // Slightly transparent off-black
  nodeColorDefault: '#757575',         // Lighter gray for nodes on dark bg
  nodeColorInput: '#4CAF50',            // Green
  nodeColorDefaultStroke: '#9e9e9e',    // Lighter gray stroke
  nodeColorOutput: '#2196F3',           // Blue
  maskBg: 'rgba(200, 200, 200, 0.15)',   // Subtle light overlay for viewport
  maskStroke: '#34AADC',                // A vibrant light blue for viewport border
};

// Example usage for nodeColor function
export const getNodeColor = (node: { type: any; }, colors: { miniMapBg?: string; nodeColorDefault: any; nodeColorInput: any; nodeColorDefaultStroke?: string; nodeColorOutput: any; maskBg?: string; maskStroke?: string; }) => {
  switch (node.type) {
    case 'input':
      return colors.nodeColorInput;
    case 'output':
      return colors.nodeColorOutput;
    default:
      return colors.nodeColorDefault;
  }
};


export const getThemeAwareColors = (theme: string) => {
  return {
    miniMapBg: theme === 'dark' ? '#1e1e1e' : '#f8f8f8',
    miniMapBorder: theme === 'dark' ? '#444' : '#ddd',
    nodeColorDefault: theme === 'dark' ? '#2a2a2a' : '#f0f0f0',
    nodeColorInput: theme === 'dark' ? '#004D40' : '#E0F2F1',
    nodeColorDefaultStroke: theme === 'dark' ? '#e2e2e2' : '#555',
    nodeColorOutput: theme === 'dark' ? '#01579B' : '#E1F5FE',
    maskBg: theme === 'dark' ? 'rgba(240, 240, 240, 0.2)' : 'rgba(30, 30, 30, 0.07)',
    maskStroke: theme === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.3)',
    backgroundDots: theme === 'dark' ? '#444' : '#aaa',
  };
};

export const getNodeStrokeColor = (node: any, colors: { nodeColorDefaultStroke: any; }) => {
  // For simplicity, we use one stroke color, but you could customize it like nodeColor
  return colors.nodeColorDefaultStroke;
};