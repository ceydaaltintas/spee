import type { WorkItemRaw } from '../base.connector.js';
import type { AdoWorkItem } from './ado.types.js';

const TASK_TYPE_MAP: Record<string, string> = {
  'User Story': 'USER_STORY',
  'Bug': 'BUG',
  'Task': 'SUB_TASK',
  'Feature': 'USER_STORY',
  'Epic': 'USER_STORY',
  'Test Case': 'TEST_TASK',
  'Impediment': 'BUG',
};

export function mapAdoWorkItemToWorkItem(item: AdoWorkItem): WorkItemRaw {
  const description = stripHtml(item.fields['System.Description'] ?? null);
  const tags = item.fields['System.Tags']?.split(';').map(t => t.trim()).filter(Boolean) ?? [];
  const linkCount = item.relations?.filter(r => r.rel === 'System.LinkTypes.Dependency-Forward' || r.rel === 'System.LinkTypes.Dependency-Reverse').length ?? 0;

  return {
    sourceSystem: 'ADO',
    sourceId: String(item.id),
    title: item.fields['System.Title'],
    description,
    issueType: TASK_TYPE_MAP[item.fields['System.WorkItemType']] ?? 'USER_STORY',
    labels: tags,
    linkCount,
    acceptanceCriteria: stripHtml(item.fields['Microsoft.VSTS.Common.AcceptanceCriteria'] ?? null),
    rawPayload: item as unknown as Record<string, unknown>,
  };
}

function stripHtml(html: string | null): string | null {
  if (!html) return null;
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() || null;
}
