/**
 * Chart.js theme configuration
 * Applies default styling for charts across the application
 */
import { Chart as ChartJS } from 'chart.js';

type Theme = 'light' | 'dark';

export function applyChartJSTheme(theme: Theme = 'light') {
  // Configure default Chart.js options
  ChartJS.defaults.responsive = true;
  ChartJS.defaults.maintainAspectRatio = false;
  ChartJS.defaults.font.family = 'system-ui, -apple-system, sans-serif';
  ChartJS.defaults.font.size = 12;

  // Theme-aware colors
  ChartJS.defaults.color = theme === 'dark' ? '#9ca3af' : '#6b7280'; // gray-400 : gray-500
  ChartJS.defaults.borderColor = theme === 'dark' ? '#374151' : '#e5e7eb'; // gray-700 : gray-200

  // Configure default plugin options
  if (ChartJS.defaults.plugins.legend) {
    ChartJS.defaults.plugins.legend.display = true;
    ChartJS.defaults.plugins.legend.position = 'top';
  }

  if (ChartJS.defaults.plugins.tooltip) {
    ChartJS.defaults.plugins.tooltip.enabled = true;
    ChartJS.defaults.plugins.tooltip.backgroundColor =
      theme === 'dark' ? 'rgba(31, 41, 55, 0.95)' : 'rgba(17, 24, 39, 0.9)';
    ChartJS.defaults.plugins.tooltip.padding = 12;
    ChartJS.defaults.plugins.tooltip.cornerRadius = 6;
    ChartJS.defaults.plugins.tooltip.titleColor =
      theme === 'dark' ? '#f3f4f6' : '#ffffff';
    ChartJS.defaults.plugins.tooltip.bodyColor =
      theme === 'dark' ? '#e5e7eb' : '#ffffff';
  }
}
