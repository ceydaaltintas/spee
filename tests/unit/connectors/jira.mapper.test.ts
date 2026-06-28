import { describe, it, expect } from 'vitest';
import { mapJiraIssueToWorkItem } from '../../../src/connectors/jira/jira.mapper.js';
import type { JiraIssue } from '../../../src/connectors/jira/jira.types.js';

function makeIssue(overrides: Partial<JiraIssue['fields']> = {}): JiraIssue {
  return {
    id: '10001',
    key: 'PROJ-123',
    fields: {
      summary: 'Test issue',
      description: null,
      issuetype: { name: 'Story' },
      labels: [],
      issuelinks: [],
      ...overrides,
    },
  };
}

describe('mapJiraIssueToWorkItem', () => {
  it('maps basic fields', () => {
    const result = mapJiraIssueToWorkItem(makeIssue());
    expect(result.sourceSystem).toBe('JIRA');
    expect(result.sourceId).toBe('PROJ-123');
    expect(result.title).toBe('Test issue');
    expect(result.issueType).toBe('USER_STORY');
  });

  it('maps Bug issue type', () => {
    const result = mapJiraIssueToWorkItem(makeIssue({ issuetype: { name: 'Bug' } }));
    expect(result.issueType).toBe('BUG');
  });

  it('counts issue links', () => {
    const result = mapJiraIssueToWorkItem(makeIssue({
      issuelinks: [
        { id: '1', type: { name: 'Blocks' } },
        { id: '2', type: { name: 'Relates' } },
      ],
    }));
    expect(result.linkCount).toBe(2);
  });

  it('extracts plain text from Atlassian Document Format', () => {
    const result = mapJiraIssueToWorkItem(makeIssue({
      description: {
        type: 'doc',
        content: [
          { type: 'paragraph', content: [{ type: 'text', text: 'Hello world' }] },
        ],
      },
    }));
    expect(result.description).toContain('Hello world');
  });

  it('handles string description', () => {
    const result = mapJiraIssueToWorkItem(makeIssue({ description: 'Plain text' as any }));
    expect(result.description).toBe('Plain text');
  });

  it('maps labels', () => {
    const result = mapJiraIssueToWorkItem(makeIssue({ labels: ['frontend', 'urgent'] }));
    expect(result.labels).toEqual(['frontend', 'urgent']);
  });
});
