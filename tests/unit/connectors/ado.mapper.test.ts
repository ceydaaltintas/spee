import { describe, it, expect } from 'vitest';
import { mapAdoWorkItemToWorkItem } from '../../../src/connectors/ado/ado.mapper.js';
import type { AdoWorkItem } from '../../../src/connectors/ado/ado.types.js';

function makeItem(overrides: Partial<AdoWorkItem['fields']> = {}, relations?: AdoWorkItem['relations']): AdoWorkItem {
  return {
    id: 42,
    fields: {
      'System.Title': 'Test work item',
      'System.WorkItemType': 'User Story',
      ...overrides,
    },
    relations,
  };
}

describe('mapAdoWorkItemToWorkItem', () => {
  it('maps basic fields', () => {
    const result = mapAdoWorkItemToWorkItem(makeItem());
    expect(result.sourceSystem).toBe('ADO');
    expect(result.sourceId).toBe('42');
    expect(result.title).toBe('Test work item');
    expect(result.issueType).toBe('USER_STORY');
  });

  it('maps Bug type', () => {
    const result = mapAdoWorkItemToWorkItem(makeItem({ 'System.WorkItemType': 'Bug' }));
    expect(result.issueType).toBe('BUG');
  });

  it('strips HTML from description', () => {
    const result = mapAdoWorkItemToWorkItem(makeItem({
      'System.Description': '<p>Hello <strong>world</strong></p>',
    }));
    expect(result.description).toBe('Hello world');
  });

  it('parses tags', () => {
    const result = mapAdoWorkItemToWorkItem(makeItem({
      'System.Tags': 'frontend; backend; urgent',
    }));
    expect(result.labels).toEqual(['frontend', 'backend', 'urgent']);
  });

  it('maps acceptance criteria', () => {
    const result = mapAdoWorkItemToWorkItem(makeItem({
      'Microsoft.VSTS.Common.AcceptanceCriteria': '<p>Must work</p>',
    }));
    expect(result.acceptanceCriteria).toBe('Must work');
  });

  it('counts dependency relations', () => {
    const result = mapAdoWorkItemToWorkItem(makeItem({}, [
      { rel: 'System.LinkTypes.Dependency-Forward', url: 'http://example.com/1' },
      { rel: 'System.LinkTypes.Dependency-Reverse', url: 'http://example.com/2' },
      { rel: 'System.LinkTypes.Hierarchy-Forward', url: 'http://example.com/3' },
    ]));
    expect(result.linkCount).toBe(2);
  });
});
