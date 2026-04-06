export const nashvilleZones = {
  core: {
    type: "Feature" as const,
    properties: { zone: "core", name: "Nashville Core Service Area" },
    geometry: {
      type: "Polygon" as const,
      coordinates: [[
        [-86.93, 35.76],
        [-86.76, 35.73],
        [-86.70, 35.60],
        [-86.78, 35.46],
        [-86.95, 35.42],
        [-87.12, 35.45],
        [-87.20, 35.55],
        [-87.15, 35.68],
        [-86.93, 35.76],
      ]],
    },
  },
  extended: {
    type: "Feature" as const,
    properties: { zone: "extended", name: "Nashville Extended Service Area" },
    geometry: {
      type: "Polygon" as const,
      coordinates: [[
        [-86.80, 36.32],
        [-86.30, 36.28],
        [-86.05, 36.05],
        [-86.25, 35.78],
        [-86.55, 35.40],
        [-87.00, 35.30],
        [-87.30, 35.35],
        [-87.45, 35.55],
        [-87.45, 35.85],
        [-87.25, 36.15],
        [-87.05, 36.32],
        [-86.80, 36.32],
      ]],
    },
  },
};
