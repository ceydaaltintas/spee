export interface WorkItemRaw {
  sourceSystem: 'JIRA' | 'ADO';
  sourceId: string;
  title: string;
  description: string | null;
  issueType: string;
  labels: string[];
  linkCount: number;
  acceptanceCriteria: string | null;
  rawPayload: Record<string, unknown>;
}

export abstract class BaseConnector {
  abstract fetchWorkItem(id: string): Promise<WorkItemRaw>;
  abstract fetchSprintVelocity(boardOrProjectId: string): Promise<number | null>;
}
