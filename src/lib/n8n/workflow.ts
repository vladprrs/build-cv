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
  AGENT_SYSTEM_PROMPT,
  TOOL_PARSE_JOB_DESCRIPTION,
  TOOL_SELECT_EVIDENCE_DESCRIPTION,
  TOOL_GENERATE_RESUME_DESCRIPTION,
  TOOL_VALIDATE_RESUME_DESCRIPTION,
  TOOL_PARSE_JOB_SCHEMA,
  TOOL_SELECT_EVIDENCE_SCHEMA,
  TOOL_GENERATE_RESUME_SCHEMA,
  TOOL_VALIDATE_RESUME_SCHEMA,
} from "./prompts";
import type {
  N8nWorkflowOptions,
  RAGExportData,
  N8nNode,
  N8nWorkflow,
} from "./types";

// Re-export types for consumers
export type {
  N8nLlmProvider,
  TriggerType,
  ValidationMode,
  WorkflowArchitecture,
  N8nWorkflowOptions,
  RAGExportHighlight,
  RAGExportData,
  N8nWorkflow,
} from "./types";

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
  architecture: "http-chain" as const,
  enableMemory: true,
  maxAgentIterations: 10,
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
const isEmpty = !text || text.trim().length === 0;
const isTooShort = !isCommand && text.length > 0 && text.length < 50;
const isJobDescription = !isCommand && !isEmpty && text.length >= 50;

return [{
  json: {
    chatId,
    messageText: text,
    isCommand,
    isStartOrHelp,
    isEmpty,
    isTooShort,
    isJobDescription
  }
}];`;
}

// =============================================================================
// AGENT NODE BUILDERS
// =============================================================================

function buildAgentNode(
  id: string,
  name: string,
  position: [number, number],
  systemMessage: string,
  promptExpression: string,
  maxIterations: number = 10
): N8nNode {
  return {
    id,
    name,
    type: "@n8n/n8n-nodes-langchain.agent",
    typeVersion: 3.1,
    position,
    parameters: {
      promptType: "define",
      text: promptExpression,
      hasOutputParser: false,
      options: {
        systemMessage,
        maxIterations,
        returnIntermediateSteps: false,
      },
    },
  };
}

function buildOpenRouterChatModel(
  id: string,
  name: string,
  position: [number, number],
  model: string,
  temperature: number
): N8nNode {
  return {
    id,
    name,
    type: "@n8n/n8n-nodes-langchain.lmChatOpenRouter",
    typeVersion: 1,
    position,
    parameters: {
      model,
      options: {
        temperature,
        timeout: 120000,
        maxRetries: 2,
      },
    },
    credentials: {
      openRouterApi: {
        id: "openrouter_credential",
        name: "OpenRouter API",
      },
    },
  };
}

function buildMemoryNode(
  id: string,
  name: string,
  position: [number, number],
  sessionKeyExpression: string
): N8nNode {
  return {
    id,
    name,
    type: "@n8n/n8n-nodes-langchain.memoryBufferWindow",
    typeVersion: 1.3,
    position,
    parameters: {
      sessionIdType: "customKey",
      sessionKey: sessionKeyExpression,
      contextWindowLength: 10,
    },
  };
}

function buildCodeTool(
  id: string,
  name: string,
  position: [number, number],
  toolName: string,
  description: string,
  jsCode: string,
  inputSchema?: string
): N8nNode {
  const node: N8nNode = {
    id,
    name,
    type: "@n8n/n8n-nodes-langchain.toolCode",
    typeVersion: 1.3,
    position,
    parameters: {
      name: toolName,
      description,
      language: "javaScript",
      jsCode,
      specifyInputSchema: !!inputSchema,
    },
  };

  if (inputSchema) {
    node.parameters.schemaType = "manual";
    node.parameters.inputSchema = inputSchema;
  }

  return node;
}

// =============================================================================
// RESOLVED OPTIONS TYPE
// =============================================================================

interface ResolvedOptions {
  provider: "openrouter";
  model: string;
  temperature: number;
  includeCoverLetter: boolean;
  highlightsLimit: number;
  outputFormat: "markdown";
  workflowName: string;
  webhookPath: string;
  triggerType: "webhook" | "telegram";
  enableValidation: boolean;
  validationMode: "strict" | "lenient";
  architecture: "http-chain" | "agent-based";
  enableMemory: boolean;
  maxAgentIterations: number;
}

// =============================================================================
// AGENT-BASED WORKFLOW GENERATOR
// =============================================================================

function generateAgentBasedWorkflow(
  rag: RAGExportData,
  opts: ResolvedOptions
): N8nWorkflow {
  const trimmedHighlights = rag.highlights.slice(0, opts.highlightsLimit);
  const ragPayload = {
    ...rag,
    highlights: trimmedHighlights,
    exportedAt: new Date().toISOString(),
  };
  const ragLiteral = JSON.stringify(ragPayload);

  const nodes: N8nNode[] = [];
  type ConnectionMap = Record<
    string,
    {
      main?: Array<Array<{ node: string; type: string; index: number }>>;
      ai_languageModel?: Array<Array<{ node: string; type: string; index: number }>>;
      ai_memory?: Array<Array<{ node: string; type: string; index: number }>>;
      ai_tool?: Array<Array<{ node: string; type: string; index: number }>>;
    }
  >;
  const connections: ConnectionMap = {};
  let nodeId = 1;
  let posX = 0;

  const MAIN_Y = 320;
  const BRANCH_Y = 160;
  const AI_Y = 480;

  // Telegram Trigger
  if (opts.triggerType === "telegram") {
    nodes.push(buildTelegramTriggerNode(String(nodeId++), [posX, MAIN_Y]));
    posX += POSITION_STEP_X;

    nodes.push(
      buildFunctionNode(
        String(nodeId++),
        "Route Message",
        [posX, MAIN_Y],
        buildRouteMessageCode()
      )
    );
    posX += POSITION_STEP_X;

    nodes.push(
      buildIfNode(String(nodeId++), "Is Command", [posX, MAIN_Y], "={{$json.isStartOrHelp}}")
    );

    const helpMessage = escapeForSingleQuotes(TELEGRAM_HELP_MESSAGE_RU);
    nodes.push(
      buildTelegramSendNode(
        String(nodeId++),
        "Send Help",
        [posX + POSITION_STEP_X, BRANCH_Y],
        "={{$('Route Message').item.json.chatId}}",
        `='${helpMessage}'`
      )
    );
    posX += POSITION_STEP_X;

    nodes.push(
      buildIfNode(
        String(nodeId++),
        "Is Valid Input",
        [posX + POSITION_STEP_X, MAIN_Y],
        "={{$json.isJobDescription}}"
      )
    );

    const errorMessage = escapeForSingleQuotes(
      "⚠️ Пожалуйста, отправьте полный текст вакансии (минимум 50 символов).\n\nОтправьте /help для получения инструкций."
    );
    nodes.push(
      buildTelegramSendNode(
        String(nodeId++),
        "Send Invalid Input Error",
        [posX + POSITION_STEP_X * 2, BRANCH_Y],
        "={{$('Route Message').item.json.chatId}}",
        `='${errorMessage}'`
      )
    );

    connections["Telegram Trigger"] = {
      main: [[{ node: "Route Message", type: "main", index: 0 }]],
    };
    connections["Route Message"] = {
      main: [[{ node: "Is Command", type: "main", index: 0 }]],
    };
    connections["Is Command"] = {
      main: [
        [{ node: "Send Help", type: "main", index: 0 }],
        [{ node: "Is Valid Input", type: "main", index: 0 }],
      ],
    };
    connections["Is Valid Input"] = {
      main: [
        [{ node: "Prepare Agent Input", type: "main", index: 0 }],
        [{ node: "Send Invalid Input Error", type: "main", index: 0 }],
      ],
    };
  } else {
    nodes.push({
      id: String(nodeId++),
      name: "Webhook",
      type: "n8n-nodes-base.webhook",
      typeVersion: 2,
      position: [posX, MAIN_Y],
      parameters: {
        httpMethod: "POST",
        path: opts.webhookPath,
        responseMode: "responseNode",
        options: {},
      },
    });
    posX += POSITION_STEP_X;

    connections["Webhook"] = {
      main: [[{ node: "Prepare Agent Input", type: "main", index: 0 }]],
    };
  }

  posX += POSITION_STEP_X * 2;

  const prepareInputCode =
    opts.triggerType === "telegram"
      ? `const rag = ${ragLiteral};
const vacancyText = $('Route Message').item.json.messageText ?? '';
const chatId = $('Route Message').item.json.chatId ?? '';
return [{
  json: {
    vacancy_text: vacancyText,
    chat_id: chatId,
    session_id: 'telegram_' + chatId,
    rag_export: rag,
    agent_prompt: 'Please optimize my resume for this job posting:\\n\\n' + vacancyText
  }
}];`
      : `const rag = ${ragLiteral};
const vacancyText = $json.body?.vacancy_text ?? $json.vacancy_text ?? '';
const requestId = $json.body?.request_id ?? $json.request_id ?? crypto.randomUUID();
return [{
  json: {
    vacancy_text: vacancyText,
    request_id: requestId,
    session_id: 'webhook_' + requestId,
    rag_export: rag,
    agent_prompt: 'Please optimize my resume for this job posting:\\n\\n' + vacancyText
  }
}];`;

  nodes.push(
    buildFunctionNode(String(nodeId++), "Prepare Agent Input", [posX, MAIN_Y], prepareInputCode)
  );
  posX += POSITION_STEP_X;

  const agentNodeName = "Resume Agent";
  const agentPosX = posX;

  const validationContext = opts.enableValidation
    ? `\n\nValidation is ENABLED in ${opts.validationMode} mode. After generating the resume, use the validate_resume tool to check quality. If validation fails, regenerate with the feedback.`
    : "\n\nValidation is DISABLED. Generate the resume without validation.";

  const coverLetterContext = opts.includeCoverLetter
    ? "\n\nInclude a cover letter after the resume."
    : "\n\nDo NOT include a cover letter.";

  const fullSystemPrompt = AGENT_SYSTEM_PROMPT + validationContext + coverLetterContext;

  nodes.push(
    buildAgentNode(
      String(nodeId++),
      agentNodeName,
      [posX, MAIN_Y],
      fullSystemPrompt,
      "={{$json.agent_prompt}}",
      opts.maxAgentIterations
    )
  );
  posX += POSITION_STEP_X;

  connections["Prepare Agent Input"] = {
    main: [[{ node: agentNodeName, type: "main", index: 0 }]],
  };

  const chatModelName = "OpenRouter Model";
  nodes.push(
    buildOpenRouterChatModel(
      String(nodeId++),
      chatModelName,
      [agentPosX - 100, AI_Y],
      opts.model,
      opts.temperature
    )
  );

  connections[chatModelName] = {
    ai_languageModel: [[{ node: agentNodeName, type: "ai_languageModel", index: 0 }]],
  };

  if (opts.enableMemory) {
    const memoryNodeName = "Simple Memory";
    nodes.push(
      buildMemoryNode(
        String(nodeId++),
        memoryNodeName,
        [agentPosX + 100, AI_Y],
        "={{$json.session_id}}"
      )
    );

    connections[memoryNodeName] = {
      ai_memory: [[{ node: agentNodeName, type: "ai_memory", index: 0 }]],
    };
  }

  const toolStartX = agentPosX - 200;
  const toolY = AI_Y + 160;
  let toolX = toolStartX;

  // Tool 1: Parse Job Posting
  const parseJobToolCode = `const jobText = job_text;
const response = await $helpers.httpRequest({
  method: 'POST',
  url: 'https://openrouter.ai/api/v1/chat/completions',
  headers: {
    'Authorization': 'Bearer ' + $env.OPENROUTER_API_KEY,
    'Content-Type': 'application/json'
  },
  body: {
    model: '${opts.model}',
    temperature: ${opts.temperature},
    messages: [
      { role: 'system', content: ${JSON.stringify(JOB_PARSER_SYSTEM_PROMPT)} },
      { role: 'user', content: 'Parse this job posting:\\n\\n' + jobText }
    ]
  }
});
const content = response.choices?.[0]?.message?.content ?? '{}';
try {
  const cleaned = content.replace(/\\\`\\\`\\\`json\\\\n?|\\\\n?\\\`\\\`\\\`/g, '').trim();
  return JSON.parse(cleaned);
} catch (e) {
  return { title: 'Unknown', company: 'Unknown', requirements: [], keywords: [], description: jobText.slice(0, 200) };
}`;

  nodes.push(
    buildCodeTool(
      String(nodeId++),
      "Parse Job Tool",
      [toolX, toolY],
      "parse_job_posting",
      TOOL_PARSE_JOB_DESCRIPTION,
      parseJobToolCode,
      TOOL_PARSE_JOB_SCHEMA
    )
  );

  connections["Parse Job Tool"] = {
    ai_tool: [[{ node: agentNodeName, type: "ai_tool", index: 0 }]],
  };

  toolX += POSITION_STEP_X;

  // Tool 2: Select Evidence
  const selectEvidenceToolCode = `const rag = $('Prepare Agent Input').item.json.rag_export;
const highlights = rag.highlights || [];
const keywordList = [...(requirements || []), ...(keywords || [])].map(k => String(k).toLowerCase());
const keywordSet = new Set(keywordList);
const filtered = highlights.filter(h => {
  const tags = Array.isArray(h.tags) ? h.tags : [];
  const tagHit = tags.some(t => keywordSet.has(String(t).toLowerCase()));
  const text = (String(h.title || '') + ' ' + String(h.description || '')).toLowerCase();
  const textHit = keywordList.some(k => k && text.includes(k));
  return tagHit || textHit;
});
const selected = (filtered.length > 0 ? filtered : highlights).slice(0, 15);
return {
  selected_highlight_ids: selected.map(h => h.id),
  selected_highlights: selected,
  matched_skills: [...new Set(selected.flatMap(h => h.tags || []))].slice(0, 20),
  missing_requirements: requirements.filter(r =>
    !selected.some(h =>
      (h.tags || []).some(t => String(t).toLowerCase().includes(String(r).toLowerCase())) ||
      String(h.description || '').toLowerCase().includes(String(r).toLowerCase())
    )
  )
};`;

  nodes.push(
    buildCodeTool(
      String(nodeId++),
      "Select Evidence Tool",
      [toolX, toolY],
      "select_evidence",
      TOOL_SELECT_EVIDENCE_DESCRIPTION,
      selectEvidenceToolCode,
      TOOL_SELECT_EVIDENCE_SCHEMA
    )
  );

  connections["Select Evidence Tool"] = {
    ai_tool: [[{ node: agentNodeName, type: "ai_tool", index: 0 }]],
  };

  toolX += POSITION_STEP_X;

  // Tool 3: Generate Resume
  const optimizerRules =
    opts.validationMode === "strict" ? OPTIMIZER_STRICT_RULES : OPTIMIZER_LENIENT_RULES;
  const optimizerPrompt = OPTIMIZER_BASE_SYSTEM_PROMPT + "\n\n" + optimizerRules;
  const coverLetterInstr = opts.includeCoverLetter ? COVER_LETTER_INSTRUCTION : NO_COVER_LETTER_INSTRUCTION;

  const generateResumeToolCode = `const rag = $('Prepare Agent Input').item.json.rag_export;
const highlights = rag.highlights || [];
const selectedIds = selected_highlight_ids || [];
const selectedHighlights = selectedIds.length > 0
  ? highlights.filter(h => selectedIds.includes(h.id))
  : highlights.slice(0, 10);
let userPrompt = 'Selected Highlights:\\n' + JSON.stringify(selectedHighlights, null, 2);
userPrompt += '\\n\\nJob Title: ' + (job_title || 'Unknown');
userPrompt += '\\nCompany: ' + (job_company || 'Unknown');
userPrompt += '\\n\\n${escapeForSingleQuotes(coverLetterInstr)}';
if (feedback) {
  userPrompt += '\\n\\nFEEDBACK FROM PREVIOUS ATTEMPT (fix these issues):\\n' + feedback;
}
userPrompt += '\\n\\nReturn ONLY the Markdown resume.';
const response = await $helpers.httpRequest({
  method: 'POST',
  url: 'https://openrouter.ai/api/v1/chat/completions',
  headers: {
    'Authorization': 'Bearer ' + $env.OPENROUTER_API_KEY,
    'Content-Type': 'application/json'
  },
  body: {
    model: '${opts.model}',
    temperature: ${opts.temperature},
    messages: [
      { role: 'system', content: ${JSON.stringify(optimizerPrompt)} },
      { role: 'user', content: userPrompt }
    ]
  }
});
return response.choices?.[0]?.message?.content ?? 'Error generating resume';`;

  nodes.push(
    buildCodeTool(
      String(nodeId++),
      "Generate Resume Tool",
      [toolX, toolY],
      "generate_resume",
      TOOL_GENERATE_RESUME_DESCRIPTION,
      generateResumeToolCode,
      TOOL_GENERATE_RESUME_SCHEMA
    )
  );

  connections["Generate Resume Tool"] = {
    ai_tool: [[{ node: agentNodeName, type: "ai_tool", index: 0 }]],
  };

  toolX += POSITION_STEP_X;

  if (opts.enableValidation) {
    const hallucinationPrompt =
      opts.validationMode === "strict"
        ? HALLUCINATION_STRICT_SYSTEM_PROMPT
        : HALLUCINATION_LENIENT_SYSTEM_PROMPT;

    const validateResumeToolCode = `const rag = $('Prepare Agent Input').item.json.rag_export;
const highlights = rag.highlights || [];
const halResponse = await $helpers.httpRequest({
  method: 'POST',
  url: 'https://openrouter.ai/api/v1/chat/completions',
  headers: {
    'Authorization': 'Bearer ' + $env.OPENROUTER_API_KEY,
    'Content-Type': 'application/json'
  },
  body: {
    model: '${opts.model}',
    temperature: 0.1,
    messages: [
      { role: 'system', content: ${JSON.stringify(hallucinationPrompt)} },
      { role: 'user', content: 'Original highlights:\\n' + JSON.stringify(highlights, null, 2) + '\\n\\nOptimized resume:\\n' + resume_text }
    ]
  }
});
let halResult = {};
try {
  const halContent = halResponse.choices?.[0]?.message?.content ?? '{}';
  const halCleaned = halContent.replace(/\\\`\\\`\\\`json\\\\n?|\\\\n?\\\`\\\`\\\`/g, '').trim();
  halResult = JSON.parse(halCleaned);
} catch (e) {
  halResult = { no_hallucination_score: 0.8, concerns: [] };
}
const aiResponse = await $helpers.httpRequest({
  method: 'POST',
  url: 'https://openrouter.ai/api/v1/chat/completions',
  headers: {
    'Authorization': 'Bearer ' + $env.OPENROUTER_API_KEY,
    'Content-Type': 'application/json'
  },
  body: {
    model: '${opts.model}',
    temperature: 0.1,
    messages: [
      { role: 'system', content: ${JSON.stringify(AI_GENERATED_SYSTEM_PROMPT)} },
      { role: 'user', content: 'Analyze this resume:\\n' + resume_text }
    ]
  }
});
let aiResult = {};
try {
  const aiContent = aiResponse.choices?.[0]?.message?.content ?? '{}';
  const aiCleaned = aiContent.replace(/\\\`\\\`\\\`json\\\\n?|\\\\n?\\\`\\\`\\\`/g, '').trim();
  aiResult = JSON.parse(aiCleaned);
} catch (e) {
  aiResult = { ai_probability: 0.2, indicators: [] };
}
const halScore = halResult.no_hallucination_score ?? 0.8;
const aiProb = aiResult.ai_probability ?? 0.2;
const passed = halScore >= 0.7 && aiProb <= 0.5;
const feedback = [];
if (halScore < 0.7 && halResult.concerns?.length > 0) {
  feedback.push('Avoid fabricated content: ' + halResult.concerns.slice(0, 3).join(', '));
}
if (aiProb > 0.5 && aiResult.indicators?.length > 0) {
  feedback.push('Reduce AI markers: ' + aiResult.indicators.slice(0, 3).join(', '));
}
return {
  passed,
  hallucination_score: halScore,
  ai_probability: aiProb,
  concerns: [...(halResult.concerns || []), ...(aiResult.indicators || [])],
  feedback: feedback.join('. ')
};`;

    nodes.push(
      buildCodeTool(
        String(nodeId++),
        "Validate Resume Tool",
        [toolX, toolY],
        "validate_resume",
        TOOL_VALIDATE_RESUME_DESCRIPTION,
        validateResumeToolCode,
        TOOL_VALIDATE_RESUME_SCHEMA
      )
    );

    connections["Validate Resume Tool"] = {
      ai_tool: [[{ node: agentNodeName, type: "ai_tool", index: 0 }]],
    };
  }

  const formatResponseCode = `const agentOutput = $json.output ?? $json.text ?? '';
const chatId = $('Prepare Agent Input').item.json.chat_id || '';
if (!agentOutput || agentOutput.includes('Error')) {
  return [{
    json: {
      chat_id: chatId,
      message: '❌ **Failed to generate resume**\\n\\nPlease try again with a different job description.',
      error: true
    }
  }];
}
return [{
  json: {
    chat_id: chatId,
    message: agentOutput,
    resume_markdown: agentOutput,
    error: false
  }
}];`;

  nodes.push(
    buildFunctionNode(String(nodeId++), "Format Response", [posX, MAIN_Y], formatResponseCode)
  );
  posX += POSITION_STEP_X;

  connections[agentNodeName] = {
    main: [[{ node: "Format Response", type: "main", index: 0 }]],
  };

  if (opts.triggerType === "telegram") {
    nodes.push(
      buildTelegramSendNode(
        String(nodeId++),
        "Send to Telegram",
        [posX, MAIN_Y],
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
      position: [posX, MAIN_Y],
      parameters: {
        respondWith: "json",
        responseBody: "={{ $json }}",
      },
    });

    connections["Format Response"] = {
      main: [[{ node: "Respond", type: "main", index: 0 }]],
    };
  }

  return {
    name: opts.workflowName + " (Agent)",
    nodes,
    connections: connections as N8nWorkflow["connections"],
    settings: {
      executionOrder: "v1",
      timezone: "UTC",
    },
    meta: {
      generatedBy: "build-cv",
      architecture: "agent-based",
      provider: opts.provider,
      triggerType: opts.triggerType,
      validationEnabled: opts.enableValidation,
      memoryEnabled: opts.enableMemory,
      outputFormat: opts.outputFormat,
    },
  };
}

// =============================================================================
// WORKFLOW GENERATOR
// =============================================================================

export function generateN8nWorkflow(
  rag: RAGExportData,
  options: N8nWorkflowOptions = {}
): N8nWorkflow {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Route to agent-based workflow if requested
  if (opts.architecture === "agent-based") {
    return generateAgentBasedWorkflow(rag, opts);
  }

  // HTTP chain workflow (default)

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
