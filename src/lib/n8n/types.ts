// =============================================================================
// N8N WORKFLOW TYPES
// =============================================================================

export type N8nLlmProvider = "openrouter";
export type TriggerType = "webhook" | "telegram";
export type ValidationMode = "strict" | "lenient";
export type WorkflowArchitecture = "http-chain" | "agent-based";

export interface N8nWorkflowOptions {
  provider?: N8nLlmProvider;
  model?: string;
  temperature?: number;
  includeCoverLetter?: boolean;
  highlightsLimit?: number;
  outputFormat?: "markdown";
  workflowName?: string;
  webhookPath?: string;
  triggerType?: TriggerType;
  enableValidation?: boolean;
  validationMode?: ValidationMode;
  // Agent-based architecture options
  architecture?: WorkflowArchitecture;
  enableMemory?: boolean;
  maxAgentIterations?: number;
}

export interface RAGExportHighlight {
  id: string;
  title: string;
  company?: string;
  period: string;
  description: string;
  metrics: string;
  tags: string[];
}

export interface RAGExportData {
  context: string;
  request_filters: {
    domains?: string[];
    skills?: string[];
    types?: string[];
    query?: string;
    onlyWithMetrics?: boolean;
  };
  highlights: RAGExportHighlight[];
}

export interface N8nNode {
  id: string;
  name: string;
  type: string;
  typeVersion: number;
  position: [number, number];
  parameters: Record<string, unknown>;
  credentials?: Record<string, { id: string; name: string }>;
  // Error handling
  onError?: "continueRegularOutput" | "continueErrorOutput" | "stopWorkflow";
  retryOnFail?: boolean;
  maxTries?: number;
  waitBetweenTries?: number;
}

export interface N8nWorkflow {
  name: string;
  nodes: N8nNode[];
  connections: Record<
    string,
    {
      main: Array<Array<{ node: string; type: string; index: number }>>;
    }
  >;
  settings?: Record<string, unknown>;
  meta?: Record<string, unknown>;
}
