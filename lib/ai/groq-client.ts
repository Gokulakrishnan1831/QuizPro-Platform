const DEFAULT_OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-5.3';
let lastResolvedModel = DEFAULT_OPENAI_MODEL;

function getOpenAiApiKey(): string {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error('OPENAI_API_KEY is not configured');
  }
  return key;
}

function parseOpenAiError(status: number, rawText: string): string {
  try {
    const parsed = JSON.parse(rawText) as { error?: { message?: string } };
    return parsed.error?.message || rawText;
  } catch {
    return rawText;
  }
}

async function openAiChatCompletion(params: {
  prompt: string;
  systemInstruction?: string;
  temperature: number;
  maxOutputTokens: number;
}): Promise<string> {
  const apiKey = getOpenAiApiKey();
  const model = DEFAULT_OPENAI_MODEL;

  const messages: Array<{ role: 'system' | 'user'; content: string }> = [];
  if (params.systemInstruction) {
    messages.push({ role: 'system', content: params.systemInstruction });
  }
  messages.push({ role: 'user', content: params.prompt });

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: params.temperature,
      max_completion_tokens: params.maxOutputTokens,
    }),
  });

  if (!response.ok) {
    const rawText = await response.text();
    const message = parseOpenAiError(response.status, rawText);
    throw new Error(`OpenAI API error ${response.status}: ${message}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{
      message?: {
        content?: string | Array<{ type?: string; text?: string }>;
      };
    }>;
  };

  const content = data.choices?.[0]?.message?.content;
  const text = Array.isArray(content)
    ? content
      .map((part) => (typeof part.text === 'string' ? part.text : ''))
      .join('')
    : (content || '');

  if (!text) {
    throw new Error('OpenAI returned an empty response');
  }

  lastResolvedModel = model;
  return text;
}

export async function aiCompletion(params: {
  prompt: string;
  systemInstruction?: string;
  temperature?: number;
  maxOutputTokens?: number;
}): Promise<string> {
  return openAiChatCompletion({
    prompt: params.prompt,
    systemInstruction: params.systemInstruction,
    temperature: params.temperature ?? 0.7,
    maxOutputTokens: params.maxOutputTokens ?? 1024,
  });
}

/**
 * General-purpose completion for short prompts (AI summaries, single question).
 */
export async function groqCompletion(prompt: string): Promise<string> {
  try {
    return await aiCompletion({
      prompt,
      temperature: 0.7,
      maxOutputTokens: 1024,
    });
  } catch (error) {
    console.error('OpenAI API Error:', error);
    throw new Error('Failed to generate AI response');
  }
}

/**
 * Dedicated completion for quiz generation — higher token limit and
 * JSON-structured output for reliable parsing.
 */
export async function groqQuizCompletion(prompt: string): Promise<string> {
  try {
    return await aiCompletion({
      prompt,
      systemInstruction:
        'You are a quiz generation engine. You ONLY output valid JSON arrays. No markdown, no commentary, no wrapping.',
      temperature: 0.8,
      maxOutputTokens: 4096,
    });
  } catch (error) {
    console.error('OpenAI Quiz Generation Error:', error);
    throw new Error('Failed to generate quiz');
  }
}

/**
 * Completion optimised for performance summaries — lower temperature
 * for more consistent, actionable feedback.
 */
export async function groqSummaryCompletion(prompt: string): Promise<string> {
  try {
    return await aiCompletion({
      prompt,
      temperature: 0.5,
      maxOutputTokens: 512,
    });
  } catch (error) {
    console.error('OpenAI Summary Error:', error);
    throw new Error('Failed to generate summary');
  }
}

export function getActiveAiModel(): string {
  return lastResolvedModel;
}
