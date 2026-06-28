import { describe, it, expect } from 'vitest';
import { TASK_TYPE_REGISTRY } from '../../../src/task-types/task-type.registry.js';

describe('Task type weight sums', () => {
  for (const [taskType, config] of Object.entries(TASK_TYPE_REGISTRY)) {
    it(`${taskType} weights sum to 1.0`, () => {
      const sum = Object.values(config.defaultWeights).reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1.0, 2);
    });
  }
});
