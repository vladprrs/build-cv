# Agent-Based Workflow Architecture

This document describes the AI Agent architecture for n8n workflow generation in Build CV.

## Overview

The agent-based architecture uses n8n's `@n8n/n8n-nodes-langchain.agent` node instead of a chain of HTTP Request nodes. The agent dynamically decides which tools to call and in what order, providing more flexible and intelligent resume optimization.

## Architecture Comparison

| Feature | HTTP Chain | Agent-Based |
|---------|-----------|-------------|
| Total nodes | 21 | 16 |
| LLM calls | 5 separate HTTP requests | 1 Agent + 4 tools |
| Flow control | Explicit IF nodes | Agent decides dynamically |
| Memory | None | Optional session memory |
| Retry logic | Manual in workflow | Agent handles internally |
| Complexity | More nodes, explicit flow | Fewer nodes, implicit flow |

## Workflow Structure

```
Telegram Trigger
      │
      ▼
Route Message (Code node)
      │
      ▼
Is Command? (IF node) ──── Yes ──► Send Help
      │
      No
      ▼
Is Valid Input? (IF node) ─ No ──► Send Invalid Input Error
      │
      Yes
      ▼
Prepare Agent Input (Code node)
      │
      ▼
┌─────────────────────────────────────────────────┐
│                 Resume Agent                     │
│                                                 │
│  ┌─────────────────┐   ┌──────────────────┐    │
│  │ OpenRouter Model│   │  Simple Memory   │    │
│  │ (ai_languageModel)  │  (ai_memory)     │    │
│  └─────────────────┘   └──────────────────┘    │
│                                                 │
│  Tools (ai_tool):                              │
│  ├── Parse Job Tool                            │
│  ├── Select Evidence Tool                      │
│  ├── Generate Resume Tool                      │
│  └── Validate Resume Tool (optional)           │
└─────────────────────────────────────────────────┘
      │
      ▼
Format Response (Code node)
      │
      ▼
Send to Telegram
```

## Agent Configuration

### System Prompt

The agent receives a detailed system prompt that instructs it to:

1. Parse the job posting using `parse_job_posting` tool
2. Select relevant highlights using `select_evidence` tool
3. Generate the resume using `generate_resume` tool
4. Validate quality using `validate_resume` tool (if validation enabled)
5. Retry with feedback if validation fails (max 2 attempts)
6. Return the final resume in Markdown format

### Critical Rules in System Prompt

- NEVER fabricate credentials, achievements, job titles, companies, or degrees
- NEVER invent metrics or numbers not present in the original highlights
- Focus on rephrasing, restructuring, and emphasizing existing content
- CAN infer related technologies from context
- CAN add general/umbrella terms inferable from specific skills
- Avoid AI-generated text markers: em dashes, "delve", excessive buzzwords

## Tool Definitions

### 1. parse_job_posting

**Purpose:** Extract structured information from job posting text.

**Input:**
```json
{
  "job_text": "Full text of the job posting"
}
```

**Output:**
```json
{
  "title": "Job title",
  "company": "Company name",
  "requirements": ["requirement1", "requirement2"],
  "keywords": ["keyword1", "keyword2"],
  "description": "Brief role summary"
}
```

**Implementation:** Makes an HTTP request to OpenRouter with `JOB_PARSER_SYSTEM_PROMPT`.

### 2. select_evidence

**Purpose:** Match candidate highlights to job requirements.

**Input:**
```json
{
  "job_title": "Target job title",
  "job_company": "Company name",
  "requirements": ["req1", "req2"],
  "keywords": ["kw1", "kw2"]
}
```

**Output:**
```json
{
  "selected_highlight_ids": ["id1", "id2"],
  "selected_highlights": [...],
  "matched_skills": ["skill1", "skill2"],
  "missing_requirements": ["req3"]
}
```

**Implementation:** Filters highlights from RAG export by keyword matching (tags + text content).

### 3. generate_resume

**Purpose:** Create an optimized resume in Markdown format.

**Input:**
```json
{
  "selected_highlight_ids": ["id1", "id2"],
  "job_title": "Target job title",
  "job_company": "Company name",
  "include_cover_letter": false,
  "feedback": "Optional feedback from previous validation"
}
```

**Output:** Markdown string with the optimized resume.

**Implementation:** Makes an HTTP request to OpenRouter with `OPTIMIZER_BASE_SYSTEM_PROMPT` + validation mode rules.

### 4. validate_resume

**Purpose:** Check resume for hallucinations and AI-generated content markers.

**Input:**
```json
{
  "resume_text": "Generated resume markdown"
}
```

**Output:**
```json
{
  "passed": true,
  "hallucination_score": 0.85,
  "ai_probability": 0.2,
  "concerns": [],
  "feedback": ""
}
```

**Implementation:** Makes two HTTP requests:
1. Hallucination check with `HALLUCINATION_*_SYSTEM_PROMPT`
2. AI detection with `AI_GENERATED_SYSTEM_PROMPT`

## Node Types Used

| Node | Type | Version |
|------|------|---------|
| AI Agent | `@n8n/n8n-nodes-langchain.agent` | 3.1 |
| OpenRouter Model | `@n8n/n8n-nodes-langchain.lmChatOpenRouter` | 1 |
| Simple Memory | `@n8n/n8n-nodes-langchain.memoryBufferWindow` | 1.3 |
| Code Tool | `@n8n/n8n-nodes-langchain.toolCode` | 1.3 |

## Connection Types

The agent workflow uses special AI connection types:

- `ai_languageModel` — connects the LLM to the agent
- `ai_memory` — connects session memory to the agent
- `ai_tool` — connects each tool to the agent (multiple tools connect to same input)

## Options

```typescript
interface N8nWorkflowOptions {
  architecture?: "http-chain" | "agent-based";
  enableMemory?: boolean;        // Enable session memory (default: true)
  maxAgentIterations?: number;   // Max tool calls (default: 10)
  // ... other options
}
```

## Session Memory

When `enableMemory: true`, the agent maintains conversation history per session:

- Session ID is derived from Telegram chat ID or webhook request ID
- Memory uses `memoryBufferWindow` with context window of 10 messages
- Enables multi-turn conversations (e.g., "make it shorter", "add more metrics")

## Credentials Required

1. **Telegram Bot** — for Telegram trigger and send nodes
2. **OpenRouter API** — for the chat model (configured in n8n credentials, not environment variable)

## When to Use Agent-Based Architecture

**Choose Agent-Based when:**
- You want dynamic tool selection based on context
- You need session memory for multi-turn conversations
- You prefer fewer nodes and simpler visual workflow
- You want the LLM to handle retry logic automatically

**Choose HTTP Chain when:**
- You need explicit control over execution flow
- You want to minimize LLM token usage
- You prefer deterministic, predictable execution
- You're debugging and need to inspect each step

## Files

- `src/lib/n8n/workflow.ts` — `generateAgentBasedWorkflow()` function
- `src/lib/n8n/prompts.ts` — Agent system prompt and tool descriptions
- `src/lib/n8n/types.ts` — `WorkflowArchitecture` type and options
