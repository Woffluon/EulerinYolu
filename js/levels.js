import { BRIDGE_INITIAL_COLOR_RGBA } from './config.js';

// Define colors for clarity and consistency
const LAND_COLOR_HEX = '#6e903a'; // Example land color from SVG
const WATER_COLOR_HEX = '#68adcd'; // Example water color

// Placeholder for variant level SVG path
const konigsbergVariantSVGPath = 'svgs/variant.svg'; // Example path

export const levels = [
  { name: "Birinci Bölüm", svgPath: "svgs/konigsberg.svg" },
  { name: "İkinci Bölüm", svgPath: "svgs/circular.svg" },
  { name: "Üçüncü Bölüm", svgPath: "svgs/third.svg" },
  { name: "Dördüncü Bölüm", svgPath: "svgs/fourth.svg" },
  // { name: "Üçüncü Bölüm", svgPath: konigsbergVariantSVGPath }, // Uncomment when ready
];
