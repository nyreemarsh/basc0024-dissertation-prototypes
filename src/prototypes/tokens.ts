/**
 * Design Tokens for EnergyView Prototypes A–D
 * Aligns with the dissertation design system documented in DSColors, DSTypography, DSSpacing
 */

// ── Colour Tokens ────────────────────────────────────────────────────────────
export const colors = {
    // Background
    bg: {
      canvas: "#F8F8FA",
      surface: "#FFFFFF",
      surfaceElevated: "#FFFFFF",
    },
    // Borders
    border: {
      default: "#E0E0E0",
      subtle: "#F0F0F4",
    },
    // Text
    text: {
      primary: "#1C1C2E",
      secondary: "#6B6B7B",
      muted: "#9B9BAB",
    },
    // Brand / Data Series
    brand: {
      solar: "#4DB6A4",          // teal-green for solar generation
      consumption: "#E57373",     // coral-red for consumption
      battery: "#5B9BD5",         // steel blue for battery SOC
      gridImport: "#9B8EC4",      // muted violet for grid import
      gridExport: "#5CB85C",      // green for grid export
    },
    // AI-specific (DR11 safeguard: do not reuse these hues elsewhere)
    ai: {
      decision: "#E8971A",           // amber — reserved exclusively for AI decisions
      counterfactual: "#BBBBC8",     // neutral grey for counterfactual scenarios (Prototype D only)
    },
    // Uncertainty (Prototype C)
    uncertainty: {
      band: "rgba(91, 157, 213, 0.12)",  // translucent steel blue for confidence bands
    },
    // Semantic
    semantic: {
      success: "#5CB85C",
      warning: "#E8971A",
      info: "#5B9BD5",
    },
    // Temporal navigation (BBC Weather pattern)
    temporal: {
      dayBand: {
        low: "#E8E8EC",      // negligible solar
        mid: "#8ECFC8",      // moderate solar
        high: "#4DB6A4",     // high solar potential
      },
      nowMarker: "#E8971A",  // amber "NOW" marker
    },
  } as const;
  
  // ── Typography Tokens ────────────────────────────────────────────────────────
  export const fonts = {
    family: {
      sans: "'DM Sans', system-ui, -apple-system, sans-serif",
      serif: "'Lora', Georgia, serif",
    },
    size: {
      xs: 12,
      sm: 14,
      body: 16,
      lg: 18,
      h3: 20,
      h2: 24,
      h1: 32,
    },
    weight: {
      regular: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
  } as const;
  
  // ── Spacing Tokens (4px grid) ────────────────────────────────────────────────
  export const space = {
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    6: 24,
    8: 32,
    12: 48,
  } as const;
  
  // ── Border Radius ────────────────────────────────────────────────────────────
  export const radius = {
    sm: 4,
    md: 8,
    lg: 12,
    drawer: 16,
  } as const;
  
  // ── Shadows ──────────────────────────────────────────────────────────────────
  export const shadows = {
    card: "0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)",
    drawer: "0 10px 25px rgba(0, 0, 0, 0.1), 0 4px 10px rgba(0, 0, 0, 0.06)",
  } as const;
  