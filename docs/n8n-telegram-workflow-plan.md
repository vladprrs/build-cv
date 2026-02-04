# n8n Telegram Bot Workflow: План реализации

## Обзор

Расширение функции экспорта n8n workflow для создания Telegram-бота, который:
- Принимает текст вакансии от пользователя
- Обрабатывает через LLM pipeline с валидацией
- Возвращает оптимизированное резюме в Markdown
- Опционально генерирует Cover Letter

---

## Текущее состояние

### Реализовано (`src/lib/n8n/workflow.ts`)

```
Webhook → Inject Context → Extract Requirements → Parse Requirements →
Prefilter Highlights → Select Evidence → Parse Selection →
Generate Resume → Assemble Response → Respond
```

**10 нод**, базовый pipeline:
- OpenRouter API для LLM вызовов
- Простые захардкоженные промпты
- Экспорт как JSON для импорта в n8n
- Keyword-based фильтрация highlights

### Чего не хватает

1. **Telegram интеграция** — сейчас только webhook
2. **Качественные промпты** — не используются из `prompts.md`
3. **Валидация результатов** — нет проверки на hallucination/AI detection
4. **Retry механизм** — нет повторной генерации при провале
5. **UI контролы** — нет выбора типа триггера и опций

---

## Целевая архитектура

### Workflow Structure (18 нод)

```
┌─────────────────────────────────────────────────────────────────────┐
│                         TELEGRAM TRIGGER                            │
│                              ↓                                       │
│                       [Route Message]                               │
│                      /              \                               │
│            /start, /help          job text                          │
│                 ↓                     ↓                              │
│          [Send Help]           [Inject Context]                     │
│                ↓                     ↓                              │
│               END             [Parse Job Posting]                   │
│                                     ↓                              │
│                              [Parse Job Result]                     │
│                                     ↓                              │
│                            [Prefilter Highlights]                   │
│                                     ↓                              │
│                             [Select Evidence]                       │
│                                     ↓                              │
│                              [Parse Selection]                      │
│                                     ↓                              │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              VALIDATION LOOP (2 iterations max)               │  │
│  │                                                               │  │
│  │  [Generate Resume] ←── OPTIMIZER + feedback от предыдущей    │  │
│  │         ↓                                                     │  │
│  │  [Hallucination Check] ←── HALLUCINATION_SYSTEM_PROMPT       │  │
│  │         ↓                                                     │  │
│  │  [AI Detection Check] ←── AI_GENERATED_SYSTEM_PROMPT         │  │
│  │         ↓                                                     │  │
│  │  [Evaluate Quality]                                           │  │
│  │         ↓                                                     │  │
│  │   PASS → exit    FAIL → [Build Feedback] → loop back         │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                     ↓                              │
│                           [Format Response]                         │
│                                     ↓                              │
│                          [Send to Telegram]                         │
└─────────────────────────────────────────────────────────────────────┘
```

### Nodes Description

| # | Node Name | Type | Purpose |
|---|-----------|------|---------|
| 1 | Telegram Trigger | telegramTrigger | Получение сообщений от пользователя |
| 2 | Route Message | function | Разбор команд vs текст вакансии |
| 3 | IF: Is Command | if | Роутинг /start, /help |
| 4 | Send Help | telegram | Отправка приветствия |
| 5 | Inject Context | function | Объединение RAG данных с вакансией |
| 6 | Parse Job Posting | httpRequest | LLM парсинг вакансии |
| 7 | Parse Job Result | function | Извлечение JSON из ответа |
| 8 | Prefilter Highlights | function | Фильтрация по keywords |
| 9 | Select Evidence | httpRequest | LLM выбор релевантных highlights |
| 10 | Parse Selection | function | Парсинг выбора |
| 11 | Initialize Retry | function | Начало retry loop |
| 12 | Generate Resume | httpRequest | LLM генерация резюме |
| 13 | Hallucination Check | httpRequest | Проверка на выдуманные факты |
| 14 | AI Detection | httpRequest | Проверка на AI-маркеры |
| 15 | Evaluate Quality | function | Оценка и решение о retry |
| 16 | Build Feedback | function | Формирование фидбека для retry |
| 17 | Format Response | function | Финальное форматирование |
| 18 | Send to Telegram | telegram | Отправка результата |

---

## Промпты

### Источник: `prompts.md`

Создать новый файл `src/lib/n8n/prompts.ts`:

```typescript
// =============================================================================
// JOB PARSER
// =============================================================================

export const JOB_PARSER_SYSTEM_PROMPT = `You are a job posting parser. Extract structured information from job postings.

Extract:
- title: The job title
- company: Company name
- requirements: List of specific requirements (skills, experience, education)
- keywords: Technical keywords, tools, technologies mentioned
- description: Brief summary of the role

Be thorough in extracting keywords - include all technologies, tools, frameworks, methodologies mentioned.

Return JSON only.`;

export const JOB_PARSER_USER_PROMPT = `Parse this job posting:

{job_text}`;

// =============================================================================
// OPTIMIZER
// =============================================================================

export const OPTIMIZER_BASE_SYSTEM_PROMPT = `You are a resume optimization expert. Create an optimized Markdown resume for a job posting.

OUTPUT: Generate a professional resume in Markdown format.

CONTENT RULES:
- When describing job experiences, show concrete results: focus on impact, not tasks.
- Include specific technologies within achievement descriptions.
- Feature keywords matching job requirements IF they exist in the original highlights.
- Prioritize and highlight experiences most relevant to the role.
- Remove unrelated content to save space.
- Remove obvious skills (Excel, VS Code, Jupyter, GitHub, Jira) unless specifically required.
- Exclude: location, language proficiency, age, hobbies unless required by job posting.
- Add a summary section highlighting the most relevant experiences.
- Try to preserve the original writing style if possible.`;

export const OPTIMIZER_STRICT_RULES = `
STRICT RULES - NEVER VIOLATE:
- Only add specific technologies, products, or platforms not in original if they can be justified from context
- NEVER fabricate job titles, companies, degrees, certifications, or achievements
- NEVER invent metrics, numbers and achievements not in original
- DO NOT drop work experience or achievements unless they decrease fit
- Never use the em dash symbol, the word "delve" or other common markers of LLM-generated text

ALLOWED:
- You CAN add related technologies plausible from context (e.g. Python user likely knows pip, venv)
- General/umbrella terms inferable from context: "NLP" if they did text processing
- Rephrasing metrics with same values: "1% - 10%" -> "1-10%"
- Reordering and emphasizing existing content`;

export const OPTIMIZER_LENIENT_RULES = `
LENIENT RULES:
- You CAN add related technologies plausible from context
- You CAN extrapolate skills from adjacent experience
- You CAN make light assumptions about the candidate

STRICT RULES - NEVER VIOLATE:
- NEVER fabricate job titles, companies, degrees, certifications, or achievements
- NEVER invent metrics, numbers and achievements not in original
- Never use the em dash symbol, the word "delve" or other common markers of LLM-generated text`;

export const OPTIMIZER_USER_PROMPT = `## Selected Highlights:
{highlights}

## Job Posting:
Title: {job_title}
Company: {job_company}
Requirements: {job_requirements}
Keywords: {job_keywords}
Description: {job_description}

{cover_letter_instruction}

{feedback_section}

Return ONLY the Markdown resume text.`;

export const COVER_LETTER_INSTRUCTION = `After the resume, include a Cover Letter section:
- 3-4 paragraphs
- Personalized to the company and role
- Reference specific highlights that match requirements
- Professional but not generic tone
- Start with "## Cover Letter"`;

// =============================================================================
// HALLUCINATION DETECTION
// =============================================================================

export const HALLUCINATION_STRICT_SYSTEM_PROMPT = `You are a resume verification specialist.
Compare an ORIGINAL resume with an OPTIMIZED version and return a no_hallucination_score from 0.0 to 1.0.

SCORING GUIDE:
- 1.0: Perfect - all content traceable to original, only rephrasing/restructuring
- 0.9-0.99: Minor acceptable additions (related tech inference, umbrella terms)
- 0.8-0.9: Light assumptions that are reasonable but noticeable
- 0.7-0.8: Questionable additions - somewhat plausible but stretching
- 0.5-0.69: Significant fabrications - claims that may not be true
- 0.0-0.49: Severe fabrications - fake jobs, degrees, major false claims

ACCEPTABLE (score 0.8+):
- Related technology inference: MySQL user -> PostgreSQL, React user -> Vue.js
- General/umbrella terms: "NLP" for text work, "SQL" for database users
- Rephrasing metrics: "1% - 10%" -> "1-10%"
- Summary sections synthesizing existing experience
- Reordering, restructuring, emphasizing existing content

SERIOUS FABRICATIONS (score below 0.5):
- Fabricated job titles, companies, or employment dates
- Invented degrees, certifications, or institutions
- Made-up metrics with specific numbers not in original
- Fake achievements, publications, or awards

Return JSON: { "no_hallucination_score": number, "concerns": string[] }`;

export const HALLUCINATION_USER_PROMPT = `Compare these two resumes and score the optimized version for hallucinations.

=== ORIGINAL HIGHLIGHTS (source of truth) ===
{original_highlights}

=== OPTIMIZED RESUME (check for fabrication) ===
{optimized_resume}

=== END ===

Return a no_hallucination_score (0.0-1.0) based on how faithful the optimized version is to the original.`;

// =============================================================================
// AI DETECTION
// =============================================================================

export const AI_GENERATED_SYSTEM_PROMPT = `You detect AI-generated content in resumes.

CRITICAL: Resumes are INTENTIONALLY formulaic. Every resume guide teaches:
- Action Verb + Task + Result pattern
- Consistent bullet structure and length
- Quantified metrics
- Industry keywords
This is GOOD resume writing, NOT AI tells.

=== NEVER FLAG (expected in professional resumes) ===
- Uniform bullet structure (Action Verb + Task + Metric)
- Consistent bullet lengths
- Action verbs: led, developed, managed, implemented, optimized
- Industry jargon and recent buzzwords (AI, ML, cloud, agile)
- Quantified achievements with ranges ("improved by 15-20%")
- Formal/professional tone throughout
- Perfect grammar and spelling
- Standard phrases: "responsible for", "collaborated with", "spearheaded"

=== FLAG ONLY (actual AI tells) ===
- FABRICATED/IMPOSSIBLE claims:
  - "5 years at [company founded 2 years ago]"
  - Metrics that don't make sense ("reduced latency by 500%")
  - Claimed seniority that contradicts timeline
- INTERNAL CONTRADICTIONS:
  - Different job titles for same role in different sections
  - Dates that overlap impossibly
- BUZZWORD SOUP with ZERO specifics:
  - "Leveraged synergies to drive paradigm shifts" (what did they actually DO?)
  - Multiple bullets with no concrete deliverables
- GENERIC FILLER repeated verbatim:
  - "Passionate about excellence" appearing 3+ times
  - Same vague phrase copy-pasted across roles
- HALLUCINATED DETAILS:
  - Technologies that didn't exist during claimed timeframe
  - Products/features the company never had

=== SCORING ===
ai_probability:
- 0.0-0.3 = Normal professional resume, no concerns
- 0.3-0.5 = Minor issues, possibly over-polished
- 0.5-0.7 = Multiple genuine AI tells found
- 0.7-1.0 = Clearly fabricated or AI-generated content

Set is_ai_generated=true ONLY if ai_probability > 0.5

Return JSON: { "ai_probability": number, "is_ai_generated": boolean, "indicators": string[] }`;

export const AI_GENERATED_USER_PROMPT = `Analyze this resume text for signs of AI generation.

=== RESUME TEXT ===
{resume_text}
=== END ===

Look for patterns that indicate AI generation while ignoring normal resume conventions.`;
```

---

## Реализация

### Фаза 1: Создание файла промптов

**Файл:** `src/lib/n8n/prompts.ts`

Создать файл с промптами (см. выше). Экспортировать все константы.

### Фаза 2: Расширение интерфейса опций

**Файл:** `src/lib/n8n/workflow.ts`

```typescript
export type N8nLlmProvider = "openrouter";
export type TriggerType = "webhook" | "telegram";
export type ValidationMode = "strict" | "lenient";

export interface N8nWorkflowOptions {
  // Existing
  provider?: N8nLlmProvider;
  model?: string;
  temperature?: number;
  includeCoverLetter?: boolean;
  highlightsLimit?: number;
  outputFormat?: "markdown";
  workflowName?: string;
  webhookPath?: string;

  // New
  triggerType?: TriggerType;
  enableValidation?: boolean;
  validationMode?: ValidationMode;
}

const DEFAULT_OPTIONS: Required<N8nWorkflowOptions> = {
  provider: "openrouter",
  model: "openai/gpt-4o-mini",
  temperature: 0.2,
  includeCoverLetter: false,
  highlightsLimit: 60,
  outputFormat: "markdown",
  workflowName: "CV Optimizer Bot",
  webhookPath: "optimize-cv",

  // New defaults
  triggerType: "telegram",
  enableValidation: true,
  validationMode: "strict",
};
```

### Фаза 3: Новые Node Builders

**Файл:** `src/lib/n8n/workflow.ts`

```typescript
// =============================================================================
// TELEGRAM NODES
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
// ROUTING NODES
// =============================================================================

function buildIfNode(
  id: string,
  name: string,
  position: [number, number],
  conditionValue1: string,
  conditionValue2: unknown = true
): N8nNode {
  return {
    id,
    name,
    type: "n8n-nodes-base.if",
    typeVersion: 2,
    position,
    parameters: {
      conditions: {
        boolean: [
          {
            value1: conditionValue1,
            value2: conditionValue2,
          },
        ],
      },
    },
  };
}

function buildRouteMessageNode(
  id: string,
  position: [number, number]
): N8nNode {
  const code = `const text = $json.message?.text ?? '';
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

  return buildFunctionNode(id, "Route Message", position, code);
}

// =============================================================================
// VALIDATION NODES
// =============================================================================

function buildHallucinationCheckNode(
  id: string,
  position: [number, number],
  opts: { model: string; temperature: number }
): N8nNode {
  const systemPrompt = HALLUCINATION_STRICT_SYSTEM_PROMPT;
  const userExpr = `'Original highlights:\\n' + JSON.stringify($('Inject Context').item.json.rag_export.highlights, null, 2) + '\\n\\nOptimized resume:\\n' + $('Generate Resume').item.json.choices?.[0]?.message?.content`;

  const body = buildOpenRouterBodyExpression(systemPrompt, userExpr, opts);

  return buildHttpRequestNode(id, "Hallucination Check", position, body);
}

function buildAIDetectionNode(
  id: string,
  position: [number, number],
  opts: { model: string; temperature: number }
): N8nNode {
  const systemPrompt = AI_GENERATED_SYSTEM_PROMPT;
  const userExpr = `'Analyze this resume:\\n' + $('Generate Resume').item.json.choices?.[0]?.message?.content`;

  const body = buildOpenRouterBodyExpression(systemPrompt, userExpr, opts);

  return buildHttpRequestNode(id, "AI Detection", position, body);
}

function buildEvaluateQualityNode(
  id: string,
  position: [number, number],
  iterationNodeName: string
): N8nNode {
  const code = `const resume = $('Generate Resume').item.json.choices?.[0]?.message?.content ?? '';

// Parse validation results
let halResult = {};
let aiResult = {};
try {
  const halContent = $('Hallucination Check').item.json.choices?.[0]?.message?.content ?? '{}';
  halResult = JSON.parse(halContent.replace(/\`\`\`json\\n?|\\n?\`\`\`/g, ''));
} catch (e) {
  halResult = { no_hallucination_score: 0.5, concerns: ['Parse error'] };
}

try {
  const aiContent = $('AI Detection').item.json.choices?.[0]?.message?.content ?? '{}';
  aiResult = JSON.parse(aiContent.replace(/\`\`\`json\\n?|\\n?\`\`\`/g, ''));
} catch (e) {
  aiResult = { ai_probability: 0.5, indicators: ['Parse error'] };
}

const halScore = halResult.no_hallucination_score ?? 0;
const aiProb = aiResult.ai_probability ?? 0;
const iteration = $('${iterationNodeName}').item.json.iteration ?? 0;

// Quality thresholds
const passed = halScore >= 0.7 && aiProb <= 0.5;
const maxIterations = 2;
const exitLoop = passed || iteration >= maxIterations;

// Build feedback for retry
const feedback = [];
if (halScore < 0.7 && halResult.concerns) {
  feedback.push('Avoid fabricated content: ' + halResult.concerns.join(', '));
}
if (aiProb > 0.5 && aiResult.indicators) {
  feedback.push('Reduce AI markers: ' + aiResult.indicators.join(', '));
}

return [{
  json: {
    resume,
    passed,
    exitLoop,
    iteration: iteration + 1,
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

  return buildFunctionNode(id, "Evaluate Quality", position, code);
}
```

### Фаза 4: Обновление генератора workflow

**Файл:** `src/lib/n8n/workflow.ts`

```typescript
export function generateN8nWorkflow(
  rag: RAGExportData,
  options: N8nWorkflowOptions = {}
): N8nWorkflow {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const trimmedHighlights = rag.highlights.slice(0, opts.highlightsLimit);
  const ragPayload = { ...rag, highlights: trimmedHighlights };
  const ragLiteral = JSON.stringify(ragPayload);

  const nodes: N8nNode[] = [];
  let nodeId = 1;
  let posX = 0;

  // ==========================================================================
  // TRIGGER
  // ==========================================================================

  if (opts.triggerType === "telegram") {
    nodes.push(buildTelegramTriggerNode(String(nodeId++), [posX, POSITION_Y]));
    posX += POSITION_STEP_X;

    nodes.push(buildRouteMessageNode(String(nodeId++), [posX, POSITION_Y]));
    posX += POSITION_STEP_X;

    // IF: Is Start/Help command
    nodes.push(
      buildIfNode(
        String(nodeId++),
        "Is Command",
        [posX, POSITION_Y],
        "={{$json.isStartOrHelp}}"
      )
    );

    // Send Help (branch for commands)
    nodes.push(
      buildTelegramSendNode(
        String(nodeId++),
        "Send Help",
        [posX, POSITION_Y - 150],
        "={{$('Route Message').item.json.chatId}}",
        `="Привет! Отправьте мне текст вакансии, и я сгенерирую оптимизированное резюме.\\n\\nИспользование:\\n- Вставьте полное описание вакансии\\n- Подождите 30-60 секунд\\n- Получите резюме в Markdown"`
      )
    );
    posX += POSITION_STEP_X;
  } else {
    // Webhook trigger (existing logic)
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
  }

  // ==========================================================================
  // CORE PIPELINE
  // ==========================================================================

  // Inject Context
  const injectContextCode = buildInjectContextCode(ragLiteral, opts.triggerType);
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

  // Parse Job Result
  nodes.push(
    buildFunctionNode(String(nodeId++), "Parse Job Result", [posX, POSITION_Y], parseJobResultCode)
  );
  posX += POSITION_STEP_X;

  // Prefilter Highlights (existing logic)
  nodes.push(
    buildFunctionNode(
      String(nodeId++),
      "Prefilter Highlights",
      [posX, POSITION_Y],
      buildPrefilterCode(opts.highlightsLimit)
    )
  );
  posX += POSITION_STEP_X;

  // Select Evidence
  const selectBody = buildSelectEvidenceBody(opts);
  nodes.push(
    buildHttpRequestNode(String(nodeId++), "Select Evidence", [posX, POSITION_Y], selectBody)
  );
  posX += POSITION_STEP_X;

  // Parse Selection
  nodes.push(
    buildFunctionNode(String(nodeId++), "Parse Selection", [posX, POSITION_Y], parseSelectionCode)
  );
  posX += POSITION_STEP_X;

  // ==========================================================================
  // VALIDATION LOOP (if enabled)
  // ==========================================================================

  if (opts.enableValidation) {
    // Initialize Retry
    nodes.push(
      buildFunctionNode(
        String(nodeId++),
        "Initialize Retry",
        [posX, POSITION_Y],
        `return [{ json: { iteration: 0, feedback: '' } }];`
      )
    );
    posX += POSITION_STEP_X;
  }

  // Generate Resume (using improved prompt)
  const resumeBody = buildGenerateResumeBody(opts);
  nodes.push(
    buildHttpRequestNode(String(nodeId++), "Generate Resume", [posX, POSITION_Y], resumeBody)
  );
  posX += POSITION_STEP_X;

  if (opts.enableValidation) {
    // Hallucination Check
    nodes.push(buildHallucinationCheckNode(String(nodeId++), [posX, POSITION_Y], opts));
    posX += POSITION_STEP_X;

    // AI Detection
    nodes.push(buildAIDetectionNode(String(nodeId++), [posX, POSITION_Y], opts));
    posX += POSITION_STEP_X;

    // Evaluate Quality
    nodes.push(
      buildEvaluateQualityNode(String(nodeId++), [posX, POSITION_Y], "Initialize Retry")
    );
    posX += POSITION_STEP_X;

    // IF: Should Retry
    nodes.push(
      buildIfNode(
        String(nodeId++),
        "Should Retry",
        [posX, POSITION_Y],
        "={{!$json.exitLoop && $json.iteration < 2}}"
      )
    );

    // Build Feedback (retry branch)
    nodes.push(
      buildFunctionNode(
        String(nodeId++),
        "Build Feedback",
        [posX, POSITION_Y + 150],
        `return [{ json: { iteration: $json.iteration, feedback: $json.feedback } }];`
      )
    );
    posX += POSITION_STEP_X;
  }

  // ==========================================================================
  // RESPONSE
  // ==========================================================================

  // Format Response
  nodes.push(
    buildFunctionNode(
      String(nodeId++),
      "Format Response",
      [posX, POSITION_Y],
      buildFormatResponseCode(opts)
    )
  );
  posX += POSITION_STEP_X;

  // Send Response
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
  }

  // ==========================================================================
  // CONNECTIONS
  // ==========================================================================

  const connections = buildConnections(nodes, opts);

  return {
    name: opts.workflowName,
    nodes,
    connections,
    settings: { timezone: "UTC" },
    meta: {
      generatedBy: "build-cv",
      provider: opts.provider,
      triggerType: opts.triggerType,
      validationEnabled: opts.enableValidation,
    },
  };
}
```

### Фаза 5: Helper функции для промптов

```typescript
function buildGenerateResumeBody(opts: Required<N8nWorkflowOptions>): string {
  const rules = opts.validationMode === "strict"
    ? OPTIMIZER_STRICT_RULES
    : OPTIMIZER_LENIENT_RULES;

  const systemPrompt = `${OPTIMIZER_BASE_SYSTEM_PROMPT}\n\n${rules}`;

  const coverLetterPart = opts.includeCoverLetter
    ? COVER_LETTER_INSTRUCTION
    : "Do not include any cover letter.";

  const feedbackPart = opts.enableValidation
    ? `' + ($('Initialize Retry').item.json.feedback ? '\\n\\nFeedback from previous attempt: ' + $('Initialize Retry').item.json.feedback : '')`
    : `'`;

  const userExpr = `'Selected Highlights:\\n' + JSON.stringify($('Parse Selection').item.json.selection.selected_highlights || [], null, 2) + '\\n\\nJob Posting:\\n' + JSON.stringify($('Parse Job Result').item.json.job, null, 2) + '\\n\\n${coverLetterPart}${feedbackPart}`;

  return buildOpenRouterBodyExpression(systemPrompt, userExpr, opts);
}

function buildFormatResponseCode(opts: Required<N8nWorkflowOptions>): string {
  const validationPart = opts.enableValidation
    ? `
const scores = $json.scores || { hallucination: 1, ai_probability: 0 };
response += '\\n\\n---\\n';
response += '**Quality Report:**\\n';
response += '- Authenticity: ' + (scores.hallucination * 100).toFixed(0) + '%\\n';
response += '- AI Detection: ' + (scores.ai_probability < 0.5 ? 'Passed' : 'Warning') + '\\n';`
    : "";

  return `const job = $('Parse Job Result').item.json.job || {};
const resume = ${opts.enableValidation ? "$json.resume" : "$json.choices?.[0]?.message?.content"} || '';

let response = '**Resume for: ' + job.title + ' at ' + job.company + '**\\n\\n';
response += resume;
${validationPart}

return [{
  json: {
    chat_id: $('Inject Context').item.json.chat_id,
    message: response
  }
}];`;
}
```

### Фаза 6: UI компонент

**Файл:** `src/components/unified-feed/export-panel.tsx`

```tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Copy, Download, Check, ChevronDown, ChevronUp, FileJson, FileText } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useFilters } from '@/contexts/filter-context';
import { exportHighlightsForRAG, exportN8nWorkflow, type SearchFilters } from '@/app/actions';
import { type RAGExportData, type TriggerType } from '@/lib/n8n/workflow';
import { generateMarkdownExport } from '@/lib/export-utils';

export function ExportPanel({ isOpen, onOpenChange }: ExportPanelProps) {
  const { filters } = useFilters();
  const [customContext, setCustomContext] = useState('');
  const [exportData, setExportData] = useState<RAGExportData | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'json' | 'markdown' | 'n8n'>('json');
  const [n8nContent, setN8nContent] = useState('');
  const [n8nLoading, setN8nLoading] = useState(false);

  // N8n options state
  const [triggerType, setTriggerType] = useState<TriggerType>('telegram');
  const [includeCoverLetter, setIncludeCoverLetter] = useState(false);
  const [enableValidation, setEnableValidation] = useState(true);

  // ... existing useEffect for exportData

  useEffect(() => {
    if (!isOpen || activeTab !== 'n8n') return;

    let cancelled = false;
    const fetchWorkflow = async () => {
      setN8nLoading(true);
      try {
        const workflow = await exportN8nWorkflow(
          customContext || undefined,
          searchFilters,
          {
            provider: 'openrouter',
            outputFormat: 'markdown',
            triggerType,
            includeCoverLetter,
            enableValidation,
          }
        );
        if (!cancelled) {
          setN8nContent(JSON.stringify(workflow, null, 2));
        }
      } finally {
        if (!cancelled) setN8nLoading(false);
      }
    };

    fetchWorkflow();
    return () => { cancelled = true; };
  }, [activeTab, customContext, isOpen, searchFilters, triggerType, includeCoverLetter, enableValidation]);

  return (
    <Collapsible open={isOpen} onOpenChange={onOpenChange}>
      {/* ... existing trigger button ... */}

      <CollapsibleContent>
        <Card className="mt-2 border-dashed">
          <CardContent className="p-4 space-y-4">
            {/* Custom Context */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Custom Context (optional)</label>
              <Textarea
                placeholder="e.g., Applying for Senior PM role at Stripe..."
                value={customContext}
                onChange={(e) => setCustomContext(e.target.value)}
                className="h-16 text-sm resize-none"
              />
            </div>

            {/* Format Tabs */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
              {/* ... existing tab list ... */}

              <TabsContent value="n8n" className="mt-2 space-y-4">
                {/* N8n Options */}
                <div className="grid grid-cols-2 gap-4 p-3 bg-muted/50 rounded-md">
                  {/* Trigger Type */}
                  <div className="space-y-2">
                    <Label className="text-xs">Trigger Type</Label>
                    <Select value={triggerType} onValueChange={(v) => setTriggerType(v as TriggerType)}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="telegram">Telegram Bot</SelectItem>
                        <SelectItem value="webhook">Webhook (API)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Validation Toggle */}
                  <div className="space-y-2">
                    <Label className="text-xs">Quality Validation</Label>
                    <div className="flex items-center gap-2 h-8">
                      <Switch
                        checked={enableValidation}
                        onCheckedChange={setEnableValidation}
                        className="scale-75"
                      />
                      <span className="text-xs text-muted-foreground">
                        {enableValidation ? 'Enabled (retry on failure)' : 'Disabled'}
                      </span>
                    </div>
                  </div>

                  {/* Cover Letter Toggle */}
                  <div className="col-span-2 space-y-2">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={includeCoverLetter}
                        onCheckedChange={setIncludeCoverLetter}
                        className="scale-75"
                      />
                      <Label className="text-xs">Include Cover Letter</Label>
                    </div>
                  </div>
                </div>

                {/* Workflow Preview */}
                <pre className="p-3 bg-muted rounded-md text-xs overflow-auto max-h-64 font-mono">
                  {n8nLoading ? 'Loading...' : n8nContent || 'No workflow generated yet.'}
                </pre>
              </TabsContent>
            </Tabs>

            {/* ... existing stats ... */}
          </CardContent>
        </Card>
      </CollapsibleContent>
    </Collapsible>
  );
}
```

---

## Тестирование

### Unit Tests

```typescript
// src/lib/n8n/__tests__/workflow.test.ts

describe('generateN8nWorkflow', () => {
  const mockRag: RAGExportData = {
    context: 'Test context',
    request_filters: {},
    highlights: [
      { id: '1', title: 'Test', company: 'Co', period: '2023', description: 'Desc', metrics: '', tags: [] }
    ]
  };

  it('generates webhook workflow by default', () => {
    const workflow = generateN8nWorkflow(mockRag, { triggerType: 'webhook' });
    expect(workflow.nodes[0].type).toBe('n8n-nodes-base.webhook');
  });

  it('generates telegram workflow when specified', () => {
    const workflow = generateN8nWorkflow(mockRag, { triggerType: 'telegram' });
    expect(workflow.nodes[0].type).toBe('n8n-nodes-base.telegramTrigger');
  });

  it('includes validation nodes when enabled', () => {
    const workflow = generateN8nWorkflow(mockRag, { enableValidation: true });
    const nodeNames = workflow.nodes.map(n => n.name);
    expect(nodeNames).toContain('Hallucination Check');
    expect(nodeNames).toContain('AI Detection');
  });

  it('excludes validation nodes when disabled', () => {
    const workflow = generateN8nWorkflow(mockRag, { enableValidation: false });
    const nodeNames = workflow.nodes.map(n => n.name);
    expect(nodeNames).not.toContain('Hallucination Check');
  });
});
```

### Manual Testing

1. **Export Workflow:**
   - Открыть /highlights
   - Открыть Export Panel
   - Выбрать таб n8n
   - Выбрать Telegram Bot
   - Скачать JSON

2. **Import to n8n:**
   - Открыть n8n (local или cloud)
   - Import from File
   - Настроить Telegram credentials
   - Настроить OPENROUTER_API_KEY

3. **Test Bot:**
   - Отправить /start → должен вернуть приветствие
   - Отправить текст вакансии → должен вернуть резюме
   - Проверить Quality Report в ответе

4. **Edge Cases:**
   - Пустое сообщение
   - Очень короткое сообщение (<50 символов)
   - Очень длинная вакансия (>10000 символов)
   - Ошибка OpenRouter API

---

## Переменные окружения

### В n8n

```bash
# Environment Variables (Settings → Variables)
OPENROUTER_API_KEY=sk-or-...
```

### Credentials

```yaml
# Telegram Bot (Settings → Credentials → Telegram API)
Access Token: <from @BotFather>
```

---

## Порядок реализации

| # | Task | File(s) | Complexity |
|---|------|---------|------------|
| 1 | Create prompts file | `src/lib/n8n/prompts.ts` | Low |
| 2 | Add new types | `src/lib/n8n/workflow.ts` | Low |
| 3 | Add Telegram node builders | `src/lib/n8n/workflow.ts` | Medium |
| 4 | Add validation node builders | `src/lib/n8n/workflow.ts` | Medium |
| 5 | Update generateN8nWorkflow | `src/lib/n8n/workflow.ts` | High |
| 6 | Add connection logic for branching | `src/lib/n8n/workflow.ts` | Medium |
| 7 | Update UI with options | `export-panel.tsx` | Medium |
| 8 | Test in n8n | — | — |

---

## Limitations & Future Work

### Current Limitations

- **No retry loop** — используется 2-pass фиксированный подход
- **Markdown only** — нет PDF генерации
- **Single message** — длинные резюме могут обрезаться Telegram

### Future Improvements

- [ ] True retry loop с SplitInBatches node
- [ ] PDF generation через external service
- [ ] Multi-message splitting для длинных резюме
- [ ] Поддержка других мессенджеров (Slack, Discord)
- [ ] Custom LLM provider selection в UI
