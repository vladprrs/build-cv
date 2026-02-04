export type N8nLlmProvider = "openrouter";

export interface N8nWorkflowOptions {
  provider?: N8nLlmProvider;
  model?: string;
  temperature?: number;
  includeCoverLetter?: boolean;
  highlightsLimit?: number;
  outputFormat?: "markdown";
  workflowName?: string;
  webhookPath?: string;
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

interface N8nNode {
  id: string;
  name: string;
  type: string;
  typeVersion: number;
  position: [number, number];
  parameters: Record<string, unknown>;
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

const DEFAULT_OPTIONS: Required<
  Pick<
    N8nWorkflowOptions,
    | "provider"
    | "model"
    | "temperature"
    | "includeCoverLetter"
    | "highlightsLimit"
    | "outputFormat"
    | "workflowName"
    | "webhookPath"
  >
> = {
  provider: "openrouter",
  model: "openai/gpt-4o-mini",
  temperature: 0.2,
  includeCoverLetter: false,
  highlightsLimit: 60,
  outputFormat: "markdown",
  workflowName: "CV Optimizer (OpenRouter)",
  webhookPath: "optimize-cv",
};

const POSITION_Y = 320;
const POSITION_STEP_X = 260;

function escapeForSingleQuotes(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/\n/g, "\\n");
}

function buildOpenRouterBodyExpression(
  systemPrompt: string,
  userExpression: string,
  options: { model: string; temperature: number }
): string {
  const safeSystem = escapeForSingleQuotes(systemPrompt);

  return `={{ {
  model: '${options.model}',
  temperature: ${options.temperature},
  messages: [
    { role: 'system', content: '${safeSystem}' },
    { role: 'user', content: ${userExpression} }
  ]
} }}`;
}

function buildHttpRequestNode(
  id: string,
  name: string,
  position: [number, number],
  bodyExpression: string
): N8nNode {
  return {
    id,
    name,
    type: "n8n-nodes-base.httpRequest",
    typeVersion: 4.1,
    position,
    parameters: {
      method: "POST",
      url: "https://openrouter.ai/api/v1/chat/completions",
      responseFormat: "json",
      sendBody: true,
      jsonParameters: true,
      bodyParametersJson: bodyExpression,
      headerParameters: {
        parameters: [
          {
            name: "Authorization",
            value: "={{'Bearer ' + $env.OPENROUTER_API_KEY}}",
          },
          {
            name: "HTTP-Referer",
            value: "={{$env.OPENROUTER_APP_URL || 'http://localhost'}}",
          },
          {
            name: "X-Title",
            value: "={{$env.OPENROUTER_APP_NAME || 'Build CV'}}",
          },
          {
            name: "Content-Type",
            value: "application/json",
          },
        ],
      },
      options: {},
    },
  };
}

function buildFunctionNode(
  id: string,
  name: string,
  position: [number, number],
  functionCode: string
): N8nNode {
  return {
    id,
    name,
    type: "n8n-nodes-base.function",
    typeVersion: 2,
    position,
    parameters: {
      functionCode,
    },
  };
}

export function generateN8nWorkflow(
  rag: RAGExportData,
  options: N8nWorkflowOptions = {}
): N8nWorkflow {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const trimmedHighlights = rag.highlights.slice(0, opts.highlightsLimit);
  const ragPayload = {
    ...rag,
    highlights: trimmedHighlights,
    exportedAt: new Date().toISOString(),
  };

  const ragLiteral = JSON.stringify(ragPayload);

  const vacancyExpr = "$('Inject Context').item.json.vacancy_text";
  const requirementsExpr = "$('Parse Requirements').item.json.requirements";
  const filteredExpr = "$('Prefilter Highlights').item.json.filtered_highlights";
  const selectionExpr = "$('Parse Selection').item.json.selection";

  const extractSystemPrompt =
    "Extract role requirements from the vacancy. Return JSON only with keys: role_title, summary, must_have, nice_to_have, skills, keywords.";

  const selectSystemPrompt =
    "Select the best highlights for the vacancy. Use only the provided highlights. Return JSON only: {selected_highlight_ids: string[], evidence_map: {id: string[]}, matched_skills: string[], missing_requirements: string[]}.";

  const resumeSystemPrompt =
    "Write a tailored resume in Markdown. Use only the approved highlights and evidence map. Do not invent facts.";

  const coverLetterInstruction = opts.includeCoverLetter
    ? "After the resume, include a short cover letter section titled 'Cover Letter'."
    : "Do not include any cover letter.";

  const extractBody = buildOpenRouterBodyExpression(
    extractSystemPrompt,
    `'Vacancy:\n' + ${vacancyExpr} + '\n\nReturn JSON only.'`,
    opts
  );

  const selectBody = buildOpenRouterBodyExpression(
    selectSystemPrompt,
    `'Vacancy:\n' + ${vacancyExpr} + '\n\nRequirements:\n' + JSON.stringify(${requirementsExpr}, null, 2) + '\n\nHighlights:\n' + JSON.stringify(${filteredExpr}, null, 2)`,
    opts
  );

  const resumeBody = buildOpenRouterBodyExpression(
    `${resumeSystemPrompt} ${coverLetterInstruction}`,
    `'Vacancy:\n' + ${vacancyExpr} + '\n\nRequirements:\n' + JSON.stringify(${requirementsExpr}, null, 2) + '\n\nApproved Highlights:\n' + JSON.stringify(${selectionExpr}.selected_highlights || [], null, 2) + '\n\nReturn Markdown only.'`,
    opts
  );

  const injectContextCode = `const rag = ${ragLiteral};
const vacancyText = $json.body?.vacancy_text ?? $json.vacancy_text ?? '';
const requestId = $json.body?.request_id ?? $json.request_id ?? '';
return [{
  json: {
    vacancy_text: vacancyText,
    request_id: requestId,
    rag_export: rag,
  }
}];`;

  const parseRequirementsCode = `const content = $json.choices?.[0]?.message?.content ?? '';
const base = {
  role_title: '',
  summary: '',
  must_have: [],
  nice_to_have: [],
  skills: [],
  keywords: []
};
let parsed = {};
try {
  parsed = JSON.parse(content);
} catch (error) {
  parsed = { parse_error: content };
}
return [{
  json: {
    requirements: { ...base, ...parsed },
    raw: content
  }
}];`;

  const prefilterHighlightsCode = `const rag = $('Inject Context').item.json.rag_export;
const req = $('Parse Requirements').item.json.requirements;
const limit = ${opts.highlightsLimit};

const keywordList = [
  ...(req.keywords || []),
  ...(req.skills || []),
  ...(req.must_have || []),
  ...(req.nice_to_have || [])
].map((k) => String(k).toLowerCase());
const keywordSet = new Set(keywordList);

const highlights = Array.isArray(rag.highlights) ? rag.highlights : [];
const filtered = highlights.filter((h) => {
  const tags = Array.isArray(h.tags) ? h.tags : [];
  const tagHit = tags.some((t) => keywordSet.has(String(t).toLowerCase()));
const text = (String(h.title || '') + ' ' + String(h.description || '')).toLowerCase();
  const textHit = keywordList.some((k) => k && text.includes(k));
  return tagHit || textHit;
});

const trimmed = (filtered.length > 0 ? filtered : highlights).slice(0, limit);
return [{
  json: {
    filtered_highlights: trimmed,
    keyword_hits: keywordList
  }
}];`;

  const parseSelectionCode = `const content = $json.choices?.[0]?.message?.content ?? '';
let parsed = {};
try {
  parsed = JSON.parse(content);
} catch (error) {
  parsed = { parse_error: content };
}

const selectedIds = Array.isArray(parsed.selected_highlight_ids)
  ? parsed.selected_highlight_ids
  : Array.isArray(parsed.selected_highlights)
    ? parsed.selected_highlights.map((h) => h?.id).filter(Boolean)
    : [];

const filtered = $('Prefilter Highlights').item.json.filtered_highlights || [];
const selectedHighlights = selectedIds.length
  ? filtered.filter((h) => selectedIds.includes(h.id))
  : Array.isArray(parsed.selected_highlights)
    ? parsed.selected_highlights
    : [];

return [{
  json: {
    selection: {
      selected_highlight_ids: selectedIds,
      selected_highlights: selectedHighlights,
      evidence_map: parsed.evidence_map || {},
      matched_skills: parsed.matched_skills || [],
      missing_requirements: parsed.missing_requirements || [],
      raw: content
    }
  }
}];`;

  const assembleResponseCode = `const resume = $json.choices?.[0]?.message?.content ?? '';
const selection = $('Parse Selection').item.json.selection || {};
const requirements = $('Parse Requirements').item.json.requirements || {};
return [{
  json: {
    resume_markdown: String(resume).trim(),
    evidence_map: selection.evidence_map || {},
    matched_skills: selection.matched_skills || [],
    warnings: selection.missing_requirements || [],
    requirements
  }
}];`;

  const nodes: N8nNode[] = [
    {
      id: "1",
      name: "Webhook",
      type: "n8n-nodes-base.webhook",
      typeVersion: 2,
      position: [0, POSITION_Y],
      parameters: {
        httpMethod: "POST",
        path: opts.webhookPath,
        responseMode: "responseNode",
        options: {},
      },
    },
    buildFunctionNode(
      "2",
      "Inject Context",
      [POSITION_STEP_X, POSITION_Y],
      injectContextCode
    ),
    buildHttpRequestNode(
      "3",
      "Extract Requirements",
      [POSITION_STEP_X * 2, POSITION_Y],
      extractBody
    ),
    buildFunctionNode(
      "4",
      "Parse Requirements",
      [POSITION_STEP_X * 3, POSITION_Y],
      parseRequirementsCode
    ),
    buildFunctionNode(
      "5",
      "Prefilter Highlights",
      [POSITION_STEP_X * 4, POSITION_Y],
      prefilterHighlightsCode
    ),
    buildHttpRequestNode(
      "6",
      "Select Evidence",
      [POSITION_STEP_X * 5, POSITION_Y],
      selectBody
    ),
    buildFunctionNode(
      "7",
      "Parse Selection",
      [POSITION_STEP_X * 6, POSITION_Y],
      parseSelectionCode
    ),
    buildHttpRequestNode(
      "8",
      "Generate Resume",
      [POSITION_STEP_X * 7, POSITION_Y],
      resumeBody
    ),
    buildFunctionNode(
      "9",
      "Assemble Response",
      [POSITION_STEP_X * 8, POSITION_Y],
      assembleResponseCode
    ),
    {
      id: "10",
      name: "Respond",
      type: "n8n-nodes-base.respondToWebhook",
      typeVersion: 1,
      position: [POSITION_STEP_X * 9, POSITION_Y],
      parameters: {
        respondWith: "json",
        responseBody: "={{ $json }}",
      },
    },
  ];

  const connections: N8nWorkflow["connections"] = {};
  for (let i = 0; i < nodes.length - 1; i += 1) {
    connections[nodes[i].name] = {
      main: [[{ node: nodes[i + 1].name, type: "main", index: 0 }]],
    };
  }

  return {
    name: opts.workflowName,
    nodes,
    connections,
    settings: {
      timezone: "UTC",
    },
    meta: {
      generatedBy: "build-cv",
      provider: opts.provider,
      outputFormat: opts.outputFormat,
    },
  };
}
