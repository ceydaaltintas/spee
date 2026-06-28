export interface AdoWorkItem {
  id: number;
  fields: {
    'System.Title': string;
    'System.Description'?: string;
    'System.WorkItemType': string;
    'System.Tags'?: string;
    'System.Parent'?: number;
    'Microsoft.VSTS.Common.AcceptanceCriteria'?: string;
    [key: string]: unknown;
  };
  relations?: AdoRelation[];
}

export interface AdoRelation {
  rel: string;
  url: string;
}
