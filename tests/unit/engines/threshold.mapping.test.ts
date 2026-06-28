import { describe, it, expect } from 'vitest';
import { mapScoreToSP, TECHNIQUE_REGISTRY } from '../../../src/techniques/technique.registry.js';

describe('mapScoreToSP', () => {
  describe('FIBONACCI', () => {
    it('maps 1.0 to 1', () => expect(mapScoreToSP(1.0, 'FIBONACCI')).toBe(1));
    it('maps 2.0 to 2', () => expect(mapScoreToSP(2.0, 'FIBONACCI')).toBe(2));
    it('maps 3.0 to 3', () => expect(mapScoreToSP(3.0, 'FIBONACCI')).toBe(3));
    it('maps 4.0 to 5', () => expect(mapScoreToSP(4.0, 'FIBONACCI')).toBe(5));
    it('maps 5.5 to 8', () => expect(mapScoreToSP(5.5, 'FIBONACCI')).toBe(8));
    it('maps 7.0 to 13', () => expect(mapScoreToSP(7.0, 'FIBONACCI')).toBe(13));
    it('maps 8.0 to 21', () => expect(mapScoreToSP(8.0, 'FIBONACCI')).toBe(21));
    it('maps 9.0 to 34', () => expect(mapScoreToSP(9.0, 'FIBONACCI')).toBe(34));
    it('maps 10.0 to 55', () => expect(mapScoreToSP(10.0, 'FIBONACCI')).toBe(55));
  });

  describe('TSHIRT', () => {
    it('maps 1.0 to XS', () => expect(mapScoreToSP(1.0, 'TSHIRT')).toBe('XS'));
    it('maps 3.0 to S', () => expect(mapScoreToSP(3.0, 'TSHIRT')).toBe('S'));
    it('maps 4.5 to M', () => expect(mapScoreToSP(4.5, 'TSHIRT')).toBe('M'));
    it('maps 6.0 to L', () => expect(mapScoreToSP(6.0, 'TSHIRT')).toBe('L'));
    it('maps 9.0 to XXL', () => expect(mapScoreToSP(9.0, 'TSHIRT')).toBe('XXL'));
  });

  describe('POWERS_OF_TWO', () => {
    it('maps 1.0 to 1', () => expect(mapScoreToSP(1.0, 'POWERS_OF_TWO')).toBe(1));
    it('maps 3.0 to 2', () => expect(mapScoreToSP(3.0, 'POWERS_OF_TWO')).toBe(2));
    it('maps 5.0 to 4', () => expect(mapScoreToSP(5.0, 'POWERS_OF_TWO')).toBe(4));
    it('maps 9.5 to 32', () => expect(mapScoreToSP(9.5, 'POWERS_OF_TWO')).toBe(32));
  });

  describe('boundary values', () => {
    it('maps exactly at threshold boundary', () => {
      expect(mapScoreToSP(1.5, 'FIBONACCI')).toBe(2);
    });

    it('maps 0 to first scale value', () => {
      expect(mapScoreToSP(0, 'FIBONACCI')).toBe(1);
    });
  });

  it('throws for unknown technique', () => {
    expect(() => mapScoreToSP(3, 'UNKNOWN')).toThrow();
  });
});
