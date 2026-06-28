export const estimateBodySchema = {
  type: 'object',
  required: ['sourceSystem', 'sourceId', 'teamId'],
  properties: {
    sourceSystem: { type: 'string', enum: ['JIRA', 'ADO'] },
    sourceId: { type: 'string', minLength: 1 },
    teamId: { type: 'string', format: 'uuid' },
    taskType: {
      type: 'string',
      enum: ['USER_STORY', 'BUG', 'ANALYSIS', 'TEST_TASK', 'DESIGN', 'DEVOPS', 'SPIKE', 'SUB_TASK'],
    },
    manualCriteria: {
      type: 'object',
      additionalProperties: {
        type: 'object',
        required: ['type'],
        properties: {
          type: { type: 'string', enum: ['scale5', 'count', 'boolean'] },
          value: {},
        },
      },
    },
  },
} as const;

export const approveBodySchema = {
  type: 'object',
  required: ['estimationId', 'approvedSP'],
  properties: {
    estimationId: { type: 'string', format: 'uuid' },
    approvedSP: { type: 'number', minimum: 0 },
    approvedBy: { type: 'string' },
  },
} as const;
