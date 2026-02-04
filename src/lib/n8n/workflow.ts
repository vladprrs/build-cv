import {
  JOB_PARSER_SYSTEM_PROMPT,
  OPTIMIZER_BASE_SYSTEM_PROMPT,
  OPTIMIZER_STRICT_RULES,
  OPTIMIZER_LENIENT_RULES,
  COVER_LETTER_INSTRUCTION,
  NO_COVER_LETTER_INSTRUCTION,
  HALLUCINATION_STRICT_SYSTEM_PROMPT,
  HALLUCINATION_LENIENT_SYSTEM_PROMPT,
  AI_GENERATED_SYSTEM_PROMPT,
  SELECT_EVIDENCE_SYSTEM_PROMPT,
  TELEGRAM_HELP_MESSAGE_RU,
} from "./prompts";

// =============================================================================
// TYPES
// =============================================================================

export type N8nLlmProvider = "openrouter";
export type TriggerType = "webhook" | "telegram";
export type ValidationMode = "strict" | "lenient";

export interface N8nWorkflowOptions {
  provider?: N8nLlmProvider;
  model?: string;
  temperature?: number;
  includeCoverLetter?: boolean;
  highlightsLimit?: number;
  outputFormat?: "markdown";
  workflowName?: string;
  webhookPath?: string;
  // New options
  triggerType?: TriggerType;
  enableValidation?: boolean;
  validationMode?: ValidationMode;
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
  credentials?: Record<string, { id: string; name: string }>;
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

// =============================================================================
// DEFAULTS
// =============================================================================

const DEFAULT_OPTIONS = {
  provider: "openrouter" as const,
  model: "openai/gpt-4o-mini",
  temperature: 0.2,
  includeCoverLetter: false,
  highlightsLimit: 60,
  outputFormat: "markdown" as const,
  workflowName: "CV Optimizer Bot",
  webhookPath: "optimize-cv",
  triggerType: "telegram" as const,
  enableValidation: true,
  validationMode: "strict" as const,
};

const POSITION_Y = 320;
const POSITION_Y_BRANCH = 160;
const POSITION_STEP_X = 260;

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

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

// =============================================================================
// CORE NODE BUILDERS
// =============================================================================

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

// =============================================================================
// TELEGRAM NODE BUILDERS
// =============================================================================

function buildTelegramTriggerNode(
  id: string,
  position: [number, number]
): N8nNode {
  return {
    id,
    name: "Telegram Trigger",
    type: "n8n-nodes-base.telegramTrigger",
    typeVersion: 1,
    position,
    parameters: {
      updates: ["message"],
    },
    credentials: {
      telegramApi: {
        id: "telegram_bot_credential",
        name: "Telegram Bot",
      },
    },
  };
}

function buildTelegramSendNode(
  id: string,
  name: string,
  position: [number, number],
  chatIdExpr: string,
  textExpr: string,
  parseMode: "Markdown" | "HTML" = "Markdown"
): N8nNode {
  return {
    id,
    name,
    type: "n8n-nodes-base.telegram",
    typeVersion: 1,
    position,
    parameters: {
      operation: "sendMessage",
      chatId: chatIdExpr,
      text: textExpr,
      additionalFields: {
        parse_mode: parseMode,
      },
    },
    credentials: {
      telegramApi: {
        id: "telegram_bot_credential",
        name: "Telegram Bot",
      },
    },
  };
}

// =============================================================================
// ROUTING NODE BUILDERS
// =============================================================================

function buildIfNode(
  id: string,
  name: string,
  position: [number, number],
  conditionExpr: string
): N8nNode {
  return {
    id,
    name,
    type: "n8n-nodes-base.if",
    typeVersion: 2,
    position,
    parameters: {
      conditions: {
        options: {
          caseSensitive: true,
          leftValue: "",
          typeValidation: "strict",
        },
        conditions: [
          {
            id: "condition-1",
            leftValue: conditionExpr,
            rightValue: true,
            operator: {
              type: "boolean",
              operation: "equals",
            },
          },
        ],
        combinator: "and",
      },
      options: {},
    },
  };
}

function buildRouteMessageCode(): string {
  return `const text = $json.message?.text ?? '';
const chatId = $json.message?.chat?.id;
const isCommand = text.startsWith('/');
const isStartOrHelp = text === '/start' || text === '/help';
const isJobDescription = !isCommand && text.length > 50;

return [{
  json: {
    chatId,
    messageText: text,
    isCommand,
    isStartOrHelp,
    isJobDescription
  }
}];`;
}

// =============================================================================
// WORKFLOW GENERATOR
// =============================================================================

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

  const nodes: N8nNode[] = [];
  const connections: N8nWorkflow["connections"] = {};
  let nodeId = 1;
  let posX = 0;

  // =========================================================================
  // TRIGGER SECTION
  // =========================================================================

  if (opts.triggerType === "telegram") {
    // Telegram Trigger
    nodes.push(buildTelegramTriggerNode(String(nodeId++), [posX, POSITION_Y]));
    posX += POSITION_STEP_X;

    // Route Message
    nodes.push(
      buildFunctionNode(
        String(nodeId++),
        "Route Message",
        [posX, POSITION_Y],
        buildRouteMessageCode()
      )
    );
    posX += POSITION_STEP_X;

    // IF: Is Command
    const ifNodeId = String(nodeId++);
    nodes.push(
      buildIfNode(ifNodeId, "Is Command", [posX, POSITION_Y], "={{$json.isStartOrHelp}}")
    );

    // Send Help (branch for commands) - positioned above main flow
    const helpNodeId = String(nodeId++);
    const helpMessage = escapeForSingleQuotes(TELEGRAM_HELP_MESSAGE_RU);
    nodes.push(
      buildTelegramSendNode(
        helpNodeId,
        "Send Help",
        [posX + POSITION_STEP_X, POSITION_Y_BRANCH],
        "={{$('Route Message').item.json.chatId}}",
        `='${helpMessage}'`
      )
    );
    posX += POSITION_STEP_X;

    // Connections for Telegram trigger
    connections["Telegram Trigger"] = {
      main: [[{ node: "Route Message", type: "main", index: 0 }]],
    };
    connections["Route Message"] = {
      main: [[{ node: "Is Command", type: "main", index: 0 }]],
    };
    // IF node has two outputs: true (index 0) -> Send Help, false (index 1) -> continue
    connections["Is Command"] = {
      main: [
        [{ node: "Send Help", type: "main", index: 0 }],
        [{ node: "Inject Context", type: "main", index: 0 }],
      ],
    };
  } else {
    // Webhook Trigger
    nodes.push({
      id: String(nodeId++),
      name: "Webhook",
      type: "n8n-nodes-base.webhook",
      typeVersion: 2,
      position: [posX, POSITION_Y],
      parameters: {
        httpMethod: "POST",
        path: opts.webhookPath,
        responseMode: "responseNode",
        options: {},
      },
    });
    posX += POSITION_STEP_X;

    connections["Webhook"] = {
      main: [[{ node: "Inject Context", type: "main", index: 0 }]],
    };
  }

  // =========================================================================
  // CORE PIPELINE
  // =========================================================================

  // Inject Context
  const injectContextCode =
    opts.triggerType === "telegram"
      ? `const rag = ${ragLiteral};
const vacancyText = $('Route Message').item.json.messageText ?? '';
const chatId = $('Route Message').item.json.chatId ?? '';
return [{
  json: {
    vacancy_text: vacancyText,
    chat_id: chatId,
    rag_export: rag,
  }
}];`
      : `const rag = ${ragLiteral};
const vacancyText = $json.body?.vacancy_text ?? $json.vacancy_text ?? '';
const requestId = $json.body?.request_id ?? $json.request_id ?? '';
return [{
  json: {
    vacancy_text: vacancyText,
    request_id: requestId,
    rag_export: rag,
  }
}];`;

  nodes.push(
    buildFunctionNode(String(nodeId++), "Inject Context", [posX, POSITION_Y], injectContextCode)
  );
  posX += POSITION_STEP_X;

  // Parse Job Posting (using improved prompt)
  const jobParserBody = buildOpenRouterBodyExpression(
    JOB_PARSER_SYSTEM_PROMPT,
    `'Parse this job posting:\\n\\n' + $('Inject Context').item.json.vacancy_text`,
    opts
  );
  nodes.push(
    buildHttpRequestNode(String(nodeId++), "Parse Job Posting", [posX, POSITION_Y], jobParserBody)
  );
  posX += POSITION_STEP_X;

  connections["Inject Context"] = {
    main: [[{ node: "Parse Job Posting", type: "main", index: 0 }]],
  };

  // Parse Job Result
  const parseJobResultCode = `const content = $json.choices?.[0]?.message?.content ?? '';
let parsed = {};
try {
  const cleaned = content.replace(/\`\`\`json\\n?|\\n?\`\`\`/g, '').trim();
  parsed = JSON.parse(cleaned);
} catch (error) {
  parsed = { parse_error: content };
}
return [{
  json: {
    job: {
      title: parsed.title || 'Unknown',
      company: parsed.company || 'Unknown',
      requirements: parsed.requirements || [],
      keywords: parsed.keywords || [],
      description: parsed.description || ''
    },
    raw: content
  }
}];`;

  nodes.push(
    buildFunctionNode(String(nodeId++), "Parse Job Result", [posX, POSITION_Y], parseJobResultCode)
  );
  posX += POSITION_STEP_X;

  connections["Parse Job Posting"] = {
    main: [[{ node: "Parse Job Result", type: "main", index: 0 }]],
  };

  // Prefilter Highlights
  const prefilterHighlightsCode = `const rag = $('Inject Context').item.json.rag_export;
const job = $('Parse Job Result').item.json.job;
const limit = ${opts.highlightsLimit};

const keywordList = [
  ...(job.keywords || []),
  ...(job.requirements || [])
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

  nodes.push(
    buildFunctionNode(
      String(nodeId++),
      "Prefilter Highlights",
      [posX, POSITION_Y],
      prefilterHighlightsCode
    )
  );
  posX += POSITION_STEP_X;

  connections["Parse Job Result"] = {
    main: [[{ node: "Prefilter Highlights", type: "main", index: 0 }]],
  };

  // Select Evidence
  const selectBody = buildOpenRouterBodyExpression(
    SELECT_EVIDENCE_SYSTEM_PROMPT,
    `'Job:\\n' + JSON.stringify($('Parse Job Result').item.json.job, null, 2) + '\\n\\nHighlights:\\n' + JSON.stringify($('Prefilter Highlights').item.json.filtered_highlights, null, 2)`,
    opts
  );
  nodes.push(
    buildHttpRequestNode(String(nodeId++), "Select Evidence", [posX, POSITION_Y], selectBody)
  );
  posX += POSITION_STEP_X;

  connections["Prefilter Highlights"] = {
    main: [[{ node: "Select Evidence", type: "main", index: 0 }]],
  };

  // Parse Selection
  const parseSelectionCode = `const content = $json.choices?.[0]?.message?.content ?? '';
let parsed = {};
try {
  const cleaned = content.replace(/\`\`\`json\\n?|\\n?\`\`\`/g, '').trim();
  parsed = JSON.parse(cleaned);
} catch (error) {
  parsed = { parse_error: content };
}

const selectedIds = Array.isArray(parsed.selected_highlight_ids)
  ? parsed.selected_highlight_ids
  : [];

const filtered = $('Prefilter Highlights').item.json.filtered_highlights || [];
const selectedHighlights = selectedIds.length
  ? filtered.filter((h) => selectedIds.includes(h.id))
  : filtered.slice(0, 10);

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

  nodes.push(
    buildFunctionNode(String(nodeId++), "Parse Selection", [posX, POSITION_Y], parseSelectionCode)
  );
  posX += POSITION_STEP_X;

  connections["Select Evidence"] = {
    main: [[{ node: "Parse Selection", type: "main", index: 0 }]],
  };

  // =========================================================================
  // GENERATION & VALIDATION SECTION
  // =========================================================================

  const optimizerRules =
    opts.validationMode === "strict" ? OPTIMIZER_STRICT_RULES : OPTIMIZER_LENIENT_RULES;

  const optimizerSystemPrompt = `${OPTIMIZER_BASE_SYSTEM_PROMPT}\n\n${optimizerRules}`;

  const coverLetterPart = opts.includeCoverLetter
    ? COVER_LETTER_INSTRUCTION
    : NO_COVER_LETTER_INSTRUCTION;

  if (opts.enableValidation) {
    // --- VALIDATION ENABLED: 2-pass approach ---

    // Generate Resume V1
    const resumeV1Body = buildOpenRouterBodyExpression(
      optimizerSystemPrompt,
      `'Selected Highlights:\\n' + JSON.stringify($('Parse Selection').item.json.selection.selected_highlights || [], null, 2) + '\\n\\nJob:\\n' + JSON.stringify($('Parse Job Result').item.json.job, null, 2) + '\\n\\n${escapeForSingleQuotes(coverLetterPart)}\\n\\nReturn ONLY the Markdown resume.'`,
      opts
    );

    nodes.push(
      buildHttpRequestNode(String(nodeId++), "Generate Resume V1", [posX, POSITION_Y], resumeV1Body)
    );
    posX += POSITION_STEP_X;

    connections["Parse Selection"] = {
      main: [[{ node: "Generate Resume V1", type: "main", index: 0 }]],
    };

    // Hallucination Check
    const hallucinationPrompt =
      opts.validationMode === "strict"
        ? HALLUCINATION_STRICT_SYSTEM_PROMPT
        : HALLUCINATION_LENIENT_SYSTEM_PROMPT;

    const hallucinationBody = buildOpenRouterBodyExpression(
      hallucinationPrompt,
      `'Original highlights:\\n' + JSON.stringify($('Parse Selection').item.json.selection.selected_highlights || [], null, 2) + '\\n\\nOptimized resume:\\n' + ($json.choices?.[0]?.message?.content ?? '')`,
      opts
    );

    nodes.push(
      buildHttpRequestNode(
        String(nodeId++),
        "Hallucination Check",
        [posX, POSITION_Y],
        hallucinationBody
      )
    );
    posX += POSITION_STEP_X;

    connections["Generate Resume V1"] = {
      main: [[{ node: "Hallucination Check", type: "main", index: 0 }]],
    };

    // AI Detection
    const aiDetectionBody = buildOpenRouterBodyExpression(
      AI_GENERATED_SYSTEM_PROMPT,
      `'Analyze this resume:\\n' + $('Generate Resume V1').item.json.choices?.[0]?.message?.content`,
      opts
    );

    nodes.push(
      buildHttpRequestNode(String(nodeId++), "AI Detection", [posX, POSITION_Y], aiDetectionBody)
    );
    posX += POSITION_STEP_X;

    connections["Hallucination Check"] = {
      main: [[{ node: "AI Detection", type: "main", index: 0 }]],
    };

    // Evaluate & Build Feedback
    const evaluateCode = `const resumeV1 = $('Generate Resume V1').item.json.choices?.[0]?.message?.content ?? '';

// Parse validation results
let halResult = {};
let aiResult = {};
try {
  const halContent = $('Hallucination Check').item.json.choices?.[0]?.message?.content ?? '{}';
  const halCleaned = halContent.replace(/\`\`\`json\\n?|\\n?\`\`\`/g, '').trim();
  halResult = JSON.parse(halCleaned);
} catch (e) {
  halResult = { no_hallucination_score: 0.8, concerns: [] };
}

try {
  const aiContent = $json.choices?.[0]?.message?.content ?? '{}';
  const aiCleaned = aiContent.replace(/\`\`\`json\\n?|\\n?\`\`\`/g, '').trim();
  aiResult = JSON.parse(aiCleaned);
} catch (e) {
  aiResult = { ai_probability: 0.2, indicators: [] };
}

const halScore = halResult.no_hallucination_score ?? 0.8;
const aiProb = aiResult.ai_probability ?? 0.2;

// Quality thresholds
const passed = halScore >= 0.7 && aiProb <= 0.5;

// Build feedback for retry
const feedback = [];
if (halScore < 0.7 && halResult.concerns && halResult.concerns.length > 0) {
  feedback.push('Avoid fabricated content: ' + halResult.concerns.slice(0, 3).join(', '));
}
if (aiProb > 0.5 && aiResult.indicators && aiResult.indicators.length > 0) {
  feedback.push('Reduce AI markers: ' + aiResult.indicators.slice(0, 3).join(', '));
}

return [{
  json: {
    resumeV1,
    passed,
    needsRetry: !passed,
    feedback: feedback.join('. '),
    scores: {
      hallucination: halScore,
      ai_probability: aiProb
    },
    details: {
      hallucination_concerns: halResult.concerns || [],
      ai_indicators: aiResult.indicators || []
    }
  }
}];`;

    nodes.push(
      buildFunctionNode(
        String(nodeId++),
        "Evaluate Quality",
        [posX, POSITION_Y],
        evaluateCode
      )
    );
    posX += POSITION_STEP_X;

    connections["AI Detection"] = {
      main: [[{ node: "Evaluate Quality", type: "main", index: 0 }]],
    };

    // IF: Needs Retry
    const ifRetryId = String(nodeId++);
    nodes.push(
      buildIfNode(ifRetryId, "Needs Retry", [posX, POSITION_Y], "={{$json.needsRetry}}")
    );
    posX += POSITION_STEP_X;

    connections["Evaluate Quality"] = {
      main: [[{ node: "Needs Retry", type: "main", index: 0 }]],
    };

    // Generate Resume V2 (retry with feedback)
    const resumeV2Body = buildOpenRouterBodyExpression(
      optimizerSystemPrompt,
      `'Selected Highlights:\\n' + JSON.stringify($('Parse Selection').item.json.selection.selected_highlights || [], null, 2) + '\\n\\nJob:\\n' + JSON.stringify($('Parse Job Result').item.json.job, null, 2) + '\\n\\n${escapeForSingleQuotes(coverLetterPart)}\\n\\nFEEDBACK FROM PREVIOUS ATTEMPT (fix these issues):\\n' + $('Evaluate Quality').item.json.feedback + '\\n\\nReturn ONLY the Markdown resume.'`,
      opts
    );

    nodes.push(
      buildHttpRequestNode(
        String(nodeId++),
        "Generate Resume V2",
        [posX, POSITION_Y_BRANCH],
        resumeV2Body
      )
    );

    // Merge Results
    const mergeCode = `// Get the final resume - either V2 (if retried) or V1 (if passed)
const evaluateData = $('Evaluate Quality').item.json;
let finalResume;
let usedRetry = false;

// Check if V2 exists (retry branch was taken)
try {
  const v2Content = $('Generate Resume V2').item.json?.choices?.[0]?.message?.content;
  if (v2Content) {
    finalResume = v2Content;
    usedRetry = true;
  }
} catch (e) {
  // V2 doesn't exist, use V1
}

if (!finalResume) {
  finalResume = evaluateData.resumeV1;
}

return [{
  json: {
    resume: finalResume,
    usedRetry,
    scores: evaluateData.scores,
    details: evaluateData.details
  }
}];`;

    nodes.push(
      buildFunctionNode(String(nodeId++), "Merge Results", [posX + POSITION_STEP_X, POSITION_Y], mergeCode)
    );
    posX += POSITION_STEP_X * 2;

    // Connections for IF Needs Retry
    // true (index 0) -> Generate Resume V2, false (index 1) -> Merge Results
    connections["Needs Retry"] = {
      main: [
        [{ node: "Generate Resume V2", type: "main", index: 0 }],
        [{ node: "Merge Results", type: "main", index: 0 }],
      ],
    };
    connections["Generate Resume V2"] = {
      main: [[{ node: "Merge Results", type: "main", index: 0 }]],
    };

    // Format Response (with validation info)
    const formatResponseCode = `const job = $('Parse Job Result').item.json.job || {};
const data = $json;
const chatId = $('Inject Context').item.json.chat_id || '';

let response = '**Resume for: ' + job.title + ' at ' + job.company + '**\\n\\n';
response += data.resume || '';
response += '\\n\\n---\\n';
response += '**Quality Report:**\\n';
response += '- Authenticity: ' + ((data.scores?.hallucination || 1) * 100).toFixed(0) + '%\\n';
response += '- AI Detection: ' + ((data.scores?.ai_probability || 0) < 0.5 ? 'Passed' : 'Warning') + '\\n';
if (data.usedRetry) {
  response += '- Note: Resume was regenerated to improve quality\\n';
}

return [{
  json: {
    chat_id: chatId,
    message: response,
    resume_markdown: data.resume,
    scores: data.scores
  }
}];`;

    nodes.push(
      buildFunctionNode(String(nodeId++), "Format Response", [posX, POSITION_Y], formatResponseCode)
    );
    posX += POSITION_STEP_X;

    connections["Merge Results"] = {
      main: [[{ node: "Format Response", type: "main", index: 0 }]],
    };
  } else {
    // --- VALIDATION DISABLED: Simple generation ---

    const resumeBody = buildOpenRouterBodyExpression(
      optimizerSystemPrompt,
      `'Selected Highlights:\\n' + JSON.stringify($('Parse Selection').item.json.selection.selected_highlights || [], null, 2) + '\\n\\nJob:\\n' + JSON.stringify($('Parse Job Result').item.json.job, null, 2) + '\\n\\n${escapeForSingleQuotes(coverLetterPart)}\\n\\nReturn ONLY the Markdown resume.'`,
      opts
    );

    nodes.push(
      buildHttpRequestNode(String(nodeId++), "Generate Resume", [posX, POSITION_Y], resumeBody)
    );
    posX += POSITION_STEP_X;

    connections["Parse Selection"] = {
      main: [[{ node: "Generate Resume", type: "main", index: 0 }]],
    };

    // Format Response (simple)
    const formatResponseCode = `const job = $('Parse Job Result').item.json.job || {};
const resume = $json.choices?.[0]?.message?.content ?? '';
const chatId = $('Inject Context').item.json.chat_id || '';

let response = '**Resume for: ' + job.title + ' at ' + job.company + '**\\n\\n';
response += resume;

return [{
  json: {
    chat_id: chatId,
    message: response,
    resume_markdown: resume
  }
}];`;

    nodes.push(
      buildFunctionNode(String(nodeId++), "Format Response", [posX, POSITION_Y], formatResponseCode)
    );
    posX += POSITION_STEP_X;

    connections["Generate Resume"] = {
      main: [[{ node: "Format Response", type: "main", index: 0 }]],
    };
  }

  // =========================================================================
  // RESPONSE SECTION
  // =========================================================================

  if (opts.triggerType === "telegram") {
    nodes.push(
      buildTelegramSendNode(
        String(nodeId++),
        "Send to Telegram",
        [posX, POSITION_Y],
        "={{$json.chat_id}}",
        "={{$json.message}}"
      )
    );

    connections["Format Response"] = {
      main: [[{ node: "Send to Telegram", type: "main", index: 0 }]],
    };
  } else {
    nodes.push({
      id: String(nodeId++),
      name: "Respond",
      type: "n8n-nodes-base.respondToWebhook",
      typeVersion: 1,
      position: [posX, POSITION_Y],
      parameters: {
        respondWith: "json",
        responseBody: "={{ $json }}",
      },
    });

    connections["Format Response"] = {
      main: [[{ node: "Respond", type: "main", index: 0 }]],
    };
  }

  // =========================================================================
  // RETURN WORKFLOW
  // =========================================================================

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
      triggerType: opts.triggerType,
      validationEnabled: opts.enableValidation,
      outputFormat: opts.outputFormat,
    },
  };
}
