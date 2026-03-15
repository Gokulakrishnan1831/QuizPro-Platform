import { groqCompletion } from './groq-client';

interface GenerateQuestionParams {
  skill: string;
  difficulty: number; // 1-10
  seenQuestions?: string[];
}

/**
 * Generate a single MCQ question using OpenAI.
 * Returns a parsed question object ready for quiz playback.
 *
 * Note: The output format matches the quiz JSONB schema (type, skill,
 * content, options, correctAnswer, solution, difficulty) NOT the
 * Question table schema (text, explanation, Difficulty enum, skillId).
 */
export async function generateAIQuestion({
  skill,
  difficulty,
  seenQuestions = [],
}: GenerateQuestionParams) {
  const diffLabel =
    difficulty <= 3 ? 'easy' : difficulty <= 6 ? 'medium' : 'hard';

  const isPowerBi = String(skill).toUpperCase() === 'POWERBI';
  const prompt = `You are an expert quiz creator for ${skill} in data analytics.
Generate ONE new unique question.

Difficulty: ${diffLabel} (${difficulty}/10)

${seenQuestions.length > 0 ? `Questions to AVOID (user has seen these):\n${seenQuestions.join('\n')}` : ''}

Generate a question that:
- Tests practical knowledge in ${skill}
- Uses type MCQ${isPowerBi ? ' or POWERBI_FILL_BLANK' : ''}
- Includes a detailed explanation

Return ONLY valid JSON:
{
  "type": "MCQ",
  "skill": "${skill}",
  "content": "Question text here",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctAnswer": "The exact correct option text",
  "solution": "Detailed explanation of why this is correct",
  "difficulty": ${difficulty},
  "multipleCorrect": false
}

${isPowerBi ? `OR
{
  "type": "POWERBI_FILL_BLANK",
  "skill": "POWERBI",
  "content": "Power BI fill in the blank question text with ____.",
  "blankLabel": "Answer",
  "acceptedAnswers": ["Answer1", "Answer2"],
  "caseSensitive": false,
  "solution": "Detailed explanation",
  "difficulty": ${difficulty}
}` : ''}`;

  const response = await groqCompletion(prompt);
  return JSON.parse(response);
}
