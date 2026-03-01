import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

/**
 * General-purpose completion for short prompts (AI summaries, single question).
 */
export async function groqCompletion(prompt: string): Promise<string> {
  try {
    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 1024,
    });
    return response.choices[0].message.content || '';
  } catch (error) {
    console.error('Groq API Error:', error);
    throw new Error('Failed to generate AI response');
  }
}

/**
 * Dedicated completion for quiz generation — higher token limit and
 * JSON-structured output for reliable parsing.
 */
export async function groqQuizCompletion(prompt: string): Promise<string> {
  try {
    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content:
            'You are a quiz generation engine. You ONLY output valid JSON arrays. No markdown, no commentary, no wrapping.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.8,
      max_tokens: 4096,
    });
    return response.choices[0].message.content || '';
  } catch (error) {
    console.error('Groq Quiz Generation Error:', error);
    throw new Error('Failed to generate quiz');
  }
}

/**
 * Completion optimised for performance summaries — lower temperature
 * for more consistent, actionable feedback.
 */
export async function groqSummaryCompletion(prompt: string): Promise<string> {
  try {
    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
      max_tokens: 512,
    });
    return response.choices[0].message.content || '';
  } catch (error) {
    console.error('Groq Summary Error:', error);
    throw new Error('Failed to generate summary');
  }
}
