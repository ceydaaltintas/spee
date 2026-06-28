import type { WorkItemRaw } from '../base.connector.js';
import type { JiraIssue, JiraDocNode } from './jira.types.js';

const TASK_TYPE_MAP: Record<string, string> = {
  'Story': 'USER_STORY',
  'User Story': 'USER_STORY',
  'Bug': 'BUG',
  'Defect': 'BUG',
  'Task': 'SUB_TASK',
  'Analysis': 'ANALYSIS',
  'Test': 'TEST_TASK',
  'QA Task': 'TEST_TASK',
  'Epic': 'USER_STORY',
  'Spike': 'SPIKE',
};

export function mapJiraIssueToWorkItem(issue: JiraIssue): WorkItemRaw {
  const description = extractPlainText(issue.fields.description);

  return {
    sourceSystem: 'JIRA',
    sourceId: issue.key,
    title: issue.fields.summary,
    description,
    issueType: TASK_TYPE_MAP[issue.fields.issuetype.name] ?? 'USER_STORY',
    labels: issue.fields.labels ?? [],
    linkCount: issue.fields.issuelinks?.length ?? 0,
    acceptanceCriteria: null,
    rawPayload: issue as unknown as Record<string, unknown>,
  };
}

function extractPlainText(doc: unknown): string | null {
  if (!doc) return null;
  if (typeof doc === 'string') return doc;
  if (typeof doc === 'object' && 'type' in (doc as Record<string, unknown>)) {
    return extractFromDocNode(doc as JiraDocNode).trim() || null;
  }
  return null;
}

function extractFromDocNode(node: JiraDocNode): string {
  let text = node.text ?? '';
  if (node.content) {
    text += node.content.map(extractFromDocNode).join('');
  }
  if (node.type === 'paragraph' || node.type === 'heading') {
    text += '\n';
  }
  return text;
}
