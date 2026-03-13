import '@testing-library/jest-dom';

// Recharts ResponsiveContainer requires ResizeObserver which jsdom lacks
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
