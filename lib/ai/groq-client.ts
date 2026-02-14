import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function groqCompletion(prompt: string): Promise<string> {
  try {
    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 1024,
      response_format: { type: 'json_object' },
    });
    return response.choices[0].message.content || '';
  } catch (error) {
    console.error('Groq API Error:', error);
    throw new Error('Failed to generate AI response');
  }
}
