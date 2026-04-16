import { aiCompletion } from './groq-client';

export interface SubjectiveGradingResult {
  accuracyScore: number;  // 0-100
  feedback: string;       // 2-3 sentence explanation
  keyPointsCovered: string[];
  keyPointsMissed: string[];
}

/**
 * Grade a subjective scenario-based answer using the LLM.
 * Returns an accuracy score (0–100%) plus detailed feedback.
 */
export async function gradeSubjectiveAnswer(params: {
  question: string;
  scenario: string;
  rubric: string;
  sampleAnswer: string;
  userAnswer: string;
  profileType: string;
}): Promise<SubjectiveGradingResult> {
  const { question, scenario, rubric, sampleAnswer, userAnswer, profileType } = params;

  // Handle empty or trivially short answers
  const trimmed = (userAnswer ?? '').trim();
  if (!trimmed || trimmed.length < 10) {
    return {
      accuracyScore: 0,
      feedback: 'No substantive answer was provided. Try to address the key points in the scenario.',
      keyPointsCovered: [],
      keyPointsMissed: rubric
        .split(/\d+\)/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0),
    };
  }

  const prompt = `You are an expert Data Analytics evaluator grading a candidate's written answer.

---- QUESTION ----
Scenario: ${scenario}
Question: ${question}

---- RUBRIC (key evaluation criteria) ----
${rubric}

---- MODEL/SAMPLE ANSWER ----
${sampleAnswer}

---- CANDIDATE'S ANSWER ----
${trimmed}

---- CANDIDATE PROFILE ----
Profile Type: ${profileType}

---- INSTRUCTIONS ----
Evaluate the candidate's answer against the rubric and sample answer. Be fair but rigorous.

Score the answer from 0 to 100 based on:
- Correctness (40%): Are the facts and reasoning accurate?
- Completeness (30%): Are all rubric key points addressed?
- Reasoning Quality (20%): Is the logic sound and well-explained?
- Practical Applicability (10%): Would this approach work in a real scenario?

Return ONLY valid JSON with this exact structure:
{
  "accuracyScore": <number 0-100>,
  "feedback": "2-3 sentence constructive feedback explaining the score",
  "keyPointsCovered": ["point 1 they addressed well", "point 2 they got right"],
  "keyPointsMissed": ["point they missed or got wrong"]
}

Be honest but encouraging. A score of 50+ means the candidate demonstrated reasonable understanding.
No markdown, no commentary — only the JSON object.`;

  try {
    const raw = await aiCompletion({
      prompt,
      systemInstruction:
        'You are a grading engine. You ONLY output valid JSON objects. No markdown, no commentary, no wrapping.',
      temperature: 0.3,
      maxOutputTokens: 512,
    });

    const cleaned = raw
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .trim();
    const parsed = JSON.parse(cleaned) as SubjectiveGradingResult;

    // Clamp accuracy score
    parsed.accuracyScore = Math.max(0, Math.min(100, Math.round(parsed.accuracyScore ?? 0)));

    if (typeof parsed.feedback !== 'string') parsed.feedback = '';
    if (!Array.isArray(parsed.keyPointsCovered)) parsed.keyPointsCovered = [];
    if (!Array.isArray(parsed.keyPointsMissed)) parsed.keyPointsMissed = [];

    return parsed;
  } catch (error) {
    console.error('Subjective grading error:', error);
    // Fallback: give a middle-of-the-road score
    return {
      accuracyScore: 40,
      feedback:
        'We were unable to fully evaluate your answer due to a processing error. Your response has been recorded and scored conservatively.',
      keyPointsCovered: [],
      keyPointsMissed: [],
    };
  }
}
