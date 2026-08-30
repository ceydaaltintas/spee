export type TaskType = 'USER_STORY' | 'BUG' | 'ANALYSIS' | 'TEST_TASK' | 'DESIGN' | 'DEVOPS' | 'SPIKE' | 'SUB_TASK';
export type Technique = 'FIBONACCI' | 'MODIFIED_FIBONACCI' | 'TSHIRT' | 'POWERS_OF_TWO' | 'LINEAR' | 'CUSTOM';
export type SourceSystem = 'JIRA' | 'ADO';

export interface CriteriaValue {
  type: 'scale5' | 'count' | 'boolean';
  value: number | boolean;
}

export interface EstimateRequest {
  sourceSystem: SourceSystem;
  sourceId: string;
  teamId: string;
  taskType?: TaskType;
  manualCriteria?: Record<string, CriteriaValue>;
}

export interface EstimateResponse {
  estimationId: string;
  suggestedSP: number | string;
  technique: Technique;
  confidenceScore: number;
  confidenceLow: number | null;
  confidenceHigh: number | null;
  taskType: TaskType;
  missingCriteria: string[];
  autoFilledCriteria: string[];
  breakdown: Record<string, {
    rawValue: CriteriaValue;
    normalizedScore: number;
    contribution: number;
  }>;
  engines: {
    ruleBased: { rawScore: number; sp: number };
    cbr?: { sp: number; similarity: number; matchCount: number };
  };
}

export interface TeamConfig {
  teamId: string;
  joinCode: string;
  name: string;
  sourceSystem: SourceSystem;
  activeTechnique: Technique;
  velocityAvg: number | null;
  weights: Record<string, Record<string, number>>;
  weightSources: Record<string, Record<string, string>>; // 'manual' | 'calibration'
  activeCriteriaOverrides: Record<string, string[]> | null; // null = use defaults
}

export interface HistoryItem {
  estimationId: string;
  sourceId: string;
  title: string;
  sourceSystem: SourceSystem;
  taskType: TaskType;
  technique: Technique;
  suggestedSP: number;
  approvedSP: number | null;
  confidenceScore: number;
  confidenceLow: number | null;
  confidenceHigh: number | null;
  createdAt: string;
  outcome: {
    completedInSprint: boolean;
    actualHours: number | null;
    reopenCount: number;
    spilloverCount: number;
  } | null;
}

export interface BaselineStory {
  id: string;
  teamId: string;
  taskType: string | null; // null = genel
  title: string;
  description: string | null;
  storyPoints: number;
  compDevelopment: number | null;
  compAnalysis: number | null;
  compTesting: number | null;
  compDesign: number | null;
  compDevops: number | null;
  criteriaSnapshot: Record<string, any> | null;
  isActive: boolean;
  createdAt: string;
}

export interface CalibrationResult {
  currentWeights: Record<string, Record<string, number>>;
  suggestedWeights: Record<string, Record<string, number>>;
  driftAnalysis: {
    overallMeanError: number;
    overallDirection: 'over' | 'under' | 'balanced';
    byTaskType: Record<string, {
      meanError: number;
      direction: 'over' | 'under' | 'balanced';
      sampleCount: number;
    }>;
    shouldCalibrate: boolean;
    estimations: {
      estimationId: string;
      sourceId: string;
      taskType: string;
      suggestedSP: number;
      approvedSP: number;
      sprintId: string | null;
    }[];
  };
}
