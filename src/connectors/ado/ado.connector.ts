import { BaseConnector, type WorkItemRaw } from '../base.connector.js';
import { mapAdoWorkItemToWorkItem } from './ado.mapper.js';
import type { AdoWorkItem } from './ado.types.js';

export interface AdoConfig {
  orgUrl: string;
  project: string;
  pat: string;
}

export class AdoConnector extends BaseConnector {
  private readonly orgUrl: string;
  private readonly project: string;
  private readonly authHeader: string;

  constructor(config: AdoConfig) {
    super();
    this.orgUrl = config.orgUrl.replace(/\/$/, '');
    this.project = config.project;
    this.authHeader = 'Basic ' + Buffer.from(`:${config.pat}`).toString('base64');
  }

  async fetchWorkItem(id: string): Promise<WorkItemRaw> {
    const response = await fetch(
      `${this.orgUrl}/${encodeURIComponent(this.project)}/_apis/wit/workitems/${encodeURIComponent(id)}?$expand=all&api-version=7.0`,
      { headers: this.headers() },
    );
    if (!response.ok) {
      throw new Error(`ADO API error: ${response.status} ${response.statusText}`);
    }
    const item = await response.json() as AdoWorkItem;
    return mapAdoWorkItemToWorkItem(item);
  }

  async fetchSprintVelocity(_projectId: string): Promise<number | null> {
    return null;
  }

  private headers(): Record<string, string> {
    return {
      'Authorization': this.authHeader,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };
  }
}
