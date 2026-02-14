import { groqCompletion } from './groq-client';

interface GenerateQuestionParams {
  skill: string;
  difficulty: 'easy' | 'medium' | 'hard';
  topics?: string[];
  seenQuestions?: string[];
}

export async function generateAIQuestion({
  skill,
  difficulty,
  topics = [],
  seenQuestions = [],
}: GenerateQuestionParams) {
  const prompt = `
    You are an expert quiz question creator for ${skill}. Generate ONE new unique multiple choice question.
    
    **Difficulty:** ${difficulty}
    **Available Topics:** ${topics.join(', ')}
    **Questions to AVOID (user has seen these):** ${seenQuestions.join(' | ')}
    
    Generate a question that:
    - Tests practical knowledge in ${skill}
    - Has exactly 4 options
    - Has only ONE correct answer
    - Includes a clear explanation
    
    Return ONLY valid JSON in this format:
    {
      "question": "...",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "The exact correct option text",
      "explanation": "...",
      "topics": ["topic1"],
      "difficulty": "${difficulty}"
    }
  `;

  const response = await groqCompletion(prompt);
  return JSON.parse(response);
}
