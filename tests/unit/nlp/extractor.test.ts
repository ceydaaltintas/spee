import { describe, it, expect } from 'vitest';
import { extractSignals } from '../../../src/nlp/extractor.js';

describe('extractSignals', () => {
  describe('task type detection', () => {
    it('detects BUG from title', () => {
      expect(extractSignals('[BUG] Login fails').detectedTaskType).toBe('BUG');
    });

    it('detects BUG from "fix" keyword', () => {
      expect(extractSignals('Fix payment error').detectedTaskType).toBe('BUG');
    });

    it('detects TEST_TASK', () => {
      expect(extractSignals('Test senaryoları yaz').detectedTaskType).toBe('TEST_TASK');
    });

    it('detects ANALYSIS', () => {
      expect(extractSignals('Analiz: Kullanıcı davranışı').detectedTaskType).toBe('ANALYSIS');
    });

    it('detects DESIGN', () => {
      expect(extractSignals('UI tasarım - Dashboard').detectedTaskType).toBe('DESIGN');
    });

    it('detects DEVOPS', () => {
      expect(extractSignals('Deploy pipeline kurulumu').detectedTaskType).toBe('DEVOPS');
    });

    it('detects SPIKE', () => {
      expect(extractSignals('Spike: Redis cluster POC').detectedTaskType).toBe('SPIKE');
    });

    it('returns null for generic title', () => {
      expect(extractSignals('Implement user dashboard').detectedTaskType).toBeNull();
    });
  });

  describe('signal extraction', () => {
    it('detects security signals', () => {
      expect(extractSignals('Add OAuth flow', 'JWT token handling').hasSecurity).toBe(true);
    });

    it('detects performance signals', () => {
      expect(extractSignals('Optimize', 'Reduce latency for API calls').hasPerformance).toBe(true);
    });

    it('detects legacy signals', () => {
      expect(extractSignals('Update', 'Integrate with legacy system').hasLegacy).toBe(true);
    });

    it('detects migration signals', () => {
      expect(extractSignals('Database migration to v2').hasMigration).toBe(true);
    });

    it('detects realtime signals', () => {
      expect(extractSignals('Add websocket support').hasRealtime).toBe(true);
    });
  });

  describe('AC counting', () => {
    it('counts acceptance criteria from bullet list', () => {
      const desc = `Acceptance Criteria:
- User can log in
- User sees dashboard
- User can log out`;
      expect(extractSignals('Story', desc).acCount).toBe(3);
    });

    it('counts BDD-style given/when/then', () => {
      const desc = `Given a logged-in user When they click profile Then they see details
Given an admin When they open settings Then they see config`;
      expect(extractSignals('Story', desc).acCount).toBe(2);
    });

    it('returns 0 for no AC', () => {
      expect(extractSignals('Story', 'Just a simple description').acCount).toBe(0);
    });
  });
});
