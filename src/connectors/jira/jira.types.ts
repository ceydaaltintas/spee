export interface JiraIssue {
  id: string;
  key: string;
  fields: {
    summary: string;
    description: JiraDocument | string | null;
    issuetype: { name: string };
    labels: string[];
    issuelinks: JiraIssueLink[];
    [key: string]: unknown;
  };
}

export interface JiraDocument {
  type: 'doc';
  content: JiraDocNode[];
}

export interface JiraDocNode {
  type: string;
  text?: string;
  content?: JiraDocNode[];
}

export interface JiraIssueLink {
  id: string;
  type: { name: string };
}

export interface JiraSprint {
  id: number;
  name: string;
  state: string;
}
