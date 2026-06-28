export type TechniqueScale = number | string;

export interface TechniqueConfig {
  label: string;
  scale: TechniqueScale[];
  thresholds: number[];
  numericMapping?: Record<string, number>;
}

export const TECHNIQUE_REGISTRY: Record<string, TechniqueConfig> = {
  FIBONACCI: {
    label: 'Fibonacci',
    scale: [1, 2, 3, 5, 8, 13, 21, 34, 55],
    thresholds: [1.5, 2.5, 3.5, 5.0, 6.5, 7.5, 8.5, 9.5, Infinity],
  },

  MODIFIED_FIBONACCI: {
    label: 'Modified Fibonacci (Planning Poker)',
    scale: [1, 2, 3, 5, 8, 13, 20, 40, 100],
    thresholds: [1.5, 2.5, 3.5, 5.0, 6.5, 7.5, 8.5, 9.5, Infinity],
  },

  TSHIRT: {
    label: 'T-Shirt Sizing',
    scale: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    thresholds: [2.0, 3.5, 5.0, 7.0, 8.5, Infinity],
    numericMapping: { XS: 1, S: 2, M: 3, L: 5, XL: 8, XXL: 13 },
  },

  POWERS_OF_TWO: {
    label: 'Powers of 2',
    scale: [1, 2, 4, 8, 16, 32],
    thresholds: [2.0, 3.5, 5.5, 7.5, 9.0, Infinity],
  },

  LINEAR: {
    label: 'Linear (1–10)',
    scale: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    thresholds: [1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, Infinity],
  },
};

export function mapScoreToSP(rawScore: number, technique: string): TechniqueScale {
  const config = TECHNIQUE_REGISTRY[technique];
  if (!config) throw new Error(`Unknown technique: ${technique}`);
  for (let i = 0; i < config.thresholds.length; i++) {
    if (rawScore < config.thresholds[i]) return config.scale[i];
  }
  return config.scale[config.scale.length - 1];
}
