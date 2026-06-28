import { BaseConnector, type WorkItemRaw } from '../base.connector.js';
import { mapJiraIssueToWorkItem } from './jira.mapper.js';
import type { JiraIssue } from './jira.types.js';

export interface JiraConfig {
  baseUrl: string;
  email: string;
  apiToken: string;
}

export class JiraConnector extends BaseConnector {
  private readonly baseUrl: string;
  private readonly authHeader: string;

  constructor(config: JiraConfig) {
    super();
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.authHeader = 'Basic ' + Buffer.from(`${config.email}:${config.apiToken}`).toString('base64');
  }

  async fetchWorkItem(issueKey: string): Promise<WorkItemRaw> {
    const response = await fetch(
      `${this.baseUrl}/rest/api/3/issue/${encodeURIComponent(issueKey)}`,
      { headers: this.headers() },
    );
    if (!response.ok) {
      throw new Error(`JIRA API error: ${response.status} ${response.statusText}`);
    }
    const issue = await response.json() as JiraIssue;
    return mapJiraIssueToWorkItem(issue);
  }

  async fetchSprintVelocity(boardId: string): Promise<number | null> {
    const response = await fetch(
      `${this.baseUrl}/rest/agile/1.0/board/${encodeURIComponent(boardId)}/sprint?state=closed&maxResults=3`,
      { headers: this.headers() },
    );
    if (!response.ok) return null;

    const data = await response.json() as { values: { id: number }[] };
    if (!data.values || data.values.length === 0) return null;

    let totalPoints = 0;
    let sprintCount = 0;

    for (const sprint of data.values) {
      const issuesRes = await fetch(
        `${this.baseUrl}/rest/agile/1.0/sprint/${sprint.id}/issue?fields=story_points`,
        { headers: this.headers() },
      );
      if (!issuesRes.ok) continue;

      const issuesData = await issuesRes.json() as { issues: { fields: { story_points?: number } }[] };
      const sprintPoints = issuesData.issues.reduce(
        (sum, issue) => sum + (issue.fields.story_points ?? 0), 0,
      );
      totalPoints += sprintPoints;
      sprintCount++;
    }

    return sprintCount > 0 ? totalPoints / sprintCount : null;
  }

  private headers(): Record<string, string> {
    return {
      'Authorization': this.authHeader,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };
  }
}
