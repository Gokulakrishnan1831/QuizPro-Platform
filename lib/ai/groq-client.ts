const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'google/gemma-4-26b-a4b-it:free';
const GROQ_FALLBACK_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

let lastResolvedModel = OPENROUTER_MODEL;

function getGroqKeys(): string[] {
  const keysStr = process.env.GROQ_API_KEYS || process.env.GROQ_API_KEY;
  return keysStr ? keysStr.split(',').map(k => k.trim()).filter(Boolean) : [];
}

/**
 * Primary AI completion using OpenRouter, with Groq auto-failover and rotation.
 */
export async function aiCompletion(params: {
  prompt: string;
  systemInstruction?: string;
  temperature?: number;
  maxOutputTokens?: number;
}): Promise<string> {
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const groqKeys = getGroqKeys();
  
  if (!openRouterKey && groqKeys.length === 0) {
    throw new Error('No AI API keys configured (Missing OPENROUTER_API_KEY or GROQ_API_KEY)');
  }

  const messages: any[] = [];
  if (params.systemInstruction) {
    messages.push({ role: 'system', content: params.systemInstruction });
  }
  messages.push({ role: 'user', content: params.prompt });

  const payload = {
    messages,
    temperature: params.temperature ?? 0.7,
    max_tokens: params.maxOutputTokens ?? 1024,
  };

  let lastError: Error | null = null;

  // 1. Try OpenRouter Primary
  if (openRouterKey) {
    const maxOpenRouterAttempts = 3;

    for (let i = 0; i < maxOpenRouterAttempts; i++) {
        try {
            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${openRouterKey}`,
                  'HTTP-Referer': 'https://preplytics.com', // Optional but recommended by OpenRouter
                  'X-Title': 'Preplytics AI Quiz', // Optional
                },
                body: JSON.stringify({
                  ...payload,
                  model: OPENROUTER_MODEL,
                }),
            });

            if (!response.ok) {
                const rawText = await response.text();
                if (response.status === 429 || response.status === 503) {
                    throw new Error(`OpenRouter rate limit/server error (${response.status}): ${rawText}`);
                }
                throw new Error(`OpenRouter API error ${response.status}: ${rawText}`);
            }

            const data = await response.json();
            const text = data.choices?.[0]?.message?.content;
            if (!text) {
                throw new Error('OpenRouter returned an empty response');
            }

            lastResolvedModel = OPENROUTER_MODEL;
            return text;
        } catch (err: any) {
            lastError = err;
            if (!err.message.includes('429') && !err.message.includes('503')) {
                console.warn(`⚠ OpenRouter failed (fatal): ${err.message}. Falling back to Groq...`);
                break; // Break if structural
            }
            
            console.warn(`⚠ OpenRouter hit ${err.message.includes('429') ? '429' : '503'}. Attempt ${i + 1}/${maxOpenRouterAttempts}.`);
            if (i < maxOpenRouterAttempts - 1) {
                const backoffBase = Math.min(Math.pow(2, i) * 3000, 15000); // 3s, 6s...
                const delayMs = backoffBase + Math.random() * 1000;
                console.log(`Waiting ${Math.round(delayMs)}ms before OpenRouter retry...`);
                await new Promise((res) => setTimeout(res, delayMs));
            } else {
                console.warn(`⚠ OpenRouter exhausted retries. Falling back to Groq...`);
            }
        }
    }
  }

  // 2. Try Groq Fallback with retry/rotation if multiple keys
  if (groqKeys.length > 0) {
    // Shuffle Groq keys
    const shuffledKeys = [...groqKeys];
    for (let i = shuffledKeys.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledKeys[i], shuffledKeys[j]] = [shuffledKeys[j], shuffledKeys[i]];
    }

    const maxAttempts = Math.max(shuffledKeys.length * 2, 4);

    for (let i = 0; i < maxAttempts; i++) {
        const apiKey = shuffledKeys[i % shuffledKeys.length];

        try {
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                  ...payload,
                  model: GROQ_FALLBACK_MODEL,
                }),
            });

            if (!response.ok) {
                const rawText = await response.text();
                if (response.status === 429 || response.status === 503) {
                    throw new Error(`Groq rate limit/server error (${response.status}): ${rawText}`);
                }
                throw new Error(`Groq API error ${response.status}: ${rawText}`);
            }

            const data = await response.json();
            const text = data.choices?.[0]?.message?.content;
            if (!text) {
                throw new Error('Groq returned an empty response');
            }

            lastResolvedModel = GROQ_FALLBACK_MODEL;
            if (openRouterKey || i > 0) {
                console.log(`✅ AI completed via Groq fallback (Attempt ${i + 1})`);
            }
            return text;
        } catch (err: any) {
            lastError = err;
            if (!err.message.includes('429') && !err.message.includes('503')) {
                break; // Break if structural
            }
            
            if (i < maxAttempts - 1) {
                const backoffBase = Math.min(Math.pow(2, i) * 1000, 8000);
                const delayMs = backoffBase + Math.random() * 500;
                console.log(`Waiting ${Math.round(delayMs)}ms before Groq retry...`);
                await new Promise((res) => setTimeout(res, delayMs));
            }
        }
    }
  }

  throw lastError || new Error('All AI providers failed');
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
    console.error('AI Completion Error:', error);
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
      maxOutputTokens: 8192,
    });
  } catch (error) {
    console.error('Quiz Generation Error:', error);
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
    console.error('Summary Completion Error:', error);
    throw new Error('Failed to generate summary');
  }
}

export function getActiveAiModel(): string {
  return lastResolvedModel;
}
