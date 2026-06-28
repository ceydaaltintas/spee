export const updateTeamConfigSchema = {
  type: 'object',
  properties: {
    activeTechnique: {
      type: 'string',
      enum: ['FIBONACCI', 'MODIFIED_FIBONACCI', 'TSHIRT', 'POWERS_OF_TWO', 'LINEAR', 'CUSTOM'],
    },
    weights: {
      type: 'object',
      additionalProperties: {
        type: 'object',
        additionalProperties: { type: 'number', minimum: 0, maximum: 1 },
      },
    },
  },
} as const;
