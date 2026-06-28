import { describe, it, expect } from 'vitest';
import { runEnsemble } from '../../../src/engines/ensemble/ensemble.engine.js';

describe('runEnsemble', () => {
  it('returns ruleBasedSP when no CBR result', () => {
    const result = runEnsemble({
      ruleBasedSP: 5,
      cbrSP: null,
      technique: 'FIBONACCI',
    });
    expect(result.ensembleSP).toBe(5);
    expect(result.agreement).toBe(true);
  });

  it('averages when both engines agree', () => {
    const result = runEnsemble({
      ruleBasedSP: 5,
      cbrSP: 5,
      technique: 'FIBONACCI',
    });
    expect(result.ensembleSP).toBe(5);
    expect(result.agreement).toBe(true);
  });

  it('produces intermediate value for close disagreement', () => {
    const result = runEnsemble({
      ruleBasedSP: 3,
      cbrSP: 5,
      technique: 'FIBONACCI',
    });
    expect(result.agreement).toBe(true);
    expect([3, 5]).toContain(result.ensembleSP);
  });

  it('detects disagreement for far apart values', () => {
    const result = runEnsemble({
      ruleBasedSP: 1,
      cbrSP: 21,
      technique: 'FIBONACCI',
    });
    expect(result.agreement).toBe(false);
  });

  it('handles T-Shirt technique', () => {
    const result = runEnsemble({
      ruleBasedSP: 'M',
      cbrSP: 'L',
      technique: 'TSHIRT',
    });
    expect(['S', 'M', 'L']).toContain(result.ensembleSP);
  });

  it('returns ruleBasedSP for unknown technique', () => {
    const result = runEnsemble({
      ruleBasedSP: 5,
      cbrSP: 8,
      technique: 'UNKNOWN',
    });
    expect(result.ensembleSP).toBe(5);
  });
});
