/**
 * Prompt templates for AI quiz generation.
 */

export type ProfileType = 'FRESHER' | 'EXPERIENCED';
export type PersonaType = 'SWITCHER' | 'JOB_HOPPER' | 'FRESHER';
export type SkillType = 'EXCEL' | 'SQL' | 'POWERBI';
export type QuizGoalType = 'PRACTICE' | 'INTERVIEW_PREP';

function difficultyRange(profileType: ProfileType, experienceYears?: number): string {
  if (profileType === 'FRESHER') return 'Intermediate to Hard (difficulty 5-7 out of 10)';
  if ((experienceYears ?? 0) >= 5) return 'Hard (difficulty 7-9 out of 10)';
  return 'Intermediate to Hard (difficulty 6-8 out of 10)';
}

function profileContext(profileType: ProfileType, experienceYears?: number): string {
  if (profileType === 'FRESHER') {
    return `The candidate is a fresh graduate with little to no professional experience.
Focus on strong fundamentals plus interview-ready problem solving.
Include questions that test core concepts in realistic, moderately complex scenarios.
Use practical datasets (e.g., product analytics, customer cohorts, hiring funnels).`;
  }
  if ((experienceYears ?? 0) >= 5) {
    return `The candidate is a senior data analyst with ${experienceYears}+ years of experience.
Focus on advanced concepts, optimization, real-world complex scenarios,
and tricky edge cases that distinguish senior analysts.
Use realistic business datasets (e.g., revenue analytics, customer churn, supply chain).`;
  }
  return `The candidate is a mid-level professional transitioning or growing in data analytics.
They have some analytical thinking skills and hands-on experience.
Include a mix of conceptual and practical questions. Avoid niche edge-cases.
Use moderately complex datasets (e.g., sales reports, HR analytics, marketing campaigns).`;
}

function interviewPrepContext(company: string, jdText?: string): string {
  return `
---- INTERVIEW PREPARATION MODE ----
Target Company: ${company}
${jdText ? `Job Description:\n${jdText}` : ''}

IMPORTANT INSTRUCTIONS FOR INTERVIEW-STYLE QUESTIONS:
1. Generate questions that mirror the style, difficulty, and topics commonly asked by ${company} for data analyst roles.
2. Based on your training data knowledge of interview patterns from Glassdoor, Ambitionbox, LinkedIn, and other interview preparation sites for ${company}:
   - If you know specific question patterns for ${company}, generate questions that are very similar in concept and difficulty.
   - Also generate questions testing the same underlying concepts with different scenarios.
3. If ${company} is not well-known or you have limited pattern knowledge:
   - Analyze the JD to identify industry context.
   - Generate questions using scenarios relevant to that industry.
   - Match seniority level and tool requirements in the JD.
4. Focus at least 60% of questions on skills and tools mentioned in the JD.
5. Questions should feel like real interview questions: scenario-based, practical, and challenging.
6. For SQL questions, create datasets relevant to company domain/industry.
`;
}

export function buildQuizPrompt(params: {
  profileType: ProfileType;
  skills: SkillType[];
  numQuestions: number;
  experienceYears?: number;
  quizGoal?: QuizGoalType;
  jdText?: string;
  jdCompany?: string;
  interviewGroundingContext?: string;
  avoidQuestionFingerprints?: string[];
  difficultyFloor?: number;
  difficultyCeiling?: number;
}): string {
  const {
    profileType,
    skills,
    numQuestions,
    experienceYears,
    quizGoal,
    jdText,
    jdCompany,
    interviewGroundingContext,
    avoidQuestionFingerprints = [],
    difficultyFloor,
    difficultyCeiling,
  } = params;
  const questionsPerSkill = Math.ceil(numQuestions / skills.length);
  const difficulty = difficultyRange(profileType, experienceYears);
  const includesPowerBI = skills.includes('POWERBI');

  return `You are an expert Data Analyst interview coach.
Generate a ${numQuestions}-question quiz.

---- CANDIDATE PROFILE ----
Profile Type: ${profileType}
${profileContext(profileType, experienceYears)}
${experienceYears ? `Experience: ${experienceYears} years` : ''}

---- QUIZ PARAMETERS ----
Skills to cover: ${skills.join(', ')}
Aim for roughly ${questionsPerSkill} questions per skill.
Difficulty range: ${difficulty}
${typeof difficultyFloor === 'number' && typeof difficultyCeiling === 'number'
    ? `Hard constraint: Every question difficulty must be between ${difficultyFloor} and ${difficultyCeiling}.`
    : ''}

${quizGoal === 'INTERVIEW_PREP' && jdCompany ? interviewPrepContext(jdCompany, jdText) : ''}
${quizGoal === 'INTERVIEW_PREP' && interviewGroundingContext ? `\n${interviewGroundingContext}\n` : ''}
${avoidQuestionFingerprints.length > 0
    ? `\n---- PREVIOUSLY SERVED QUESTION SIGNATURES (DO NOT REPEAT) ----
${avoidQuestionFingerprints.slice(0, 60).map((v, i) => `${i + 1}. ${v}`).join('\n')}
`
    : ''}

---- MCQ FORMAT ----
{
  "type": "MCQ",
  "skill": "EXCEL" | "SQL" | "POWERBI",
  "content": "Question text",
  "options": ["A", "B", "C", "D"],
  "correctAnswer": "The exact correct option text",
  "multipleCorrect": false,
  "solution": "2-3 sentence explanation",
  "difficulty": <number 1-10>
}

${includesPowerBI ? `---- POWERBI FILL BLANK FORMAT ----
{
  "type": "POWERBI_FILL_BLANK",
  "skill": "POWERBI",
  "content": "In DAX, the function used to change filter context is ____.",
  "blankLabel": "DAX function",
  "acceptedAnswers": ["CALCULATE", "CALCULATE()"],
  "caseSensitive": false,
  "solution": "CALCULATE changes filter context in DAX.",
  "difficulty": 4
}
` : ''}

---- RULES ----
1. MCQ must have exactly 4 plausible options.
2. MCQ is single-answer only; correctAnswer must match one option verbatim.
3. POWERBI_FILL_BLANK must include acceptedAnswers with 1-4 variants.
4. Never generate SQL_HANDS_ON or EXCEL_HANDS_ON when skills are POWERBI-only.
5. Questions must be diverse and solutions should be educational.
6. Prefer question styles and topic distributions from internal company interview signals when provided.
7. Do not repeat previous question signatures listed above; keep concepts and wording clearly distinct.
8. Return only a JSON array of ${numQuestions} question objects. No markdown or commentary.`;
}

export function buildMixedQuizPrompt(params: {
  profileType: ProfileType;
  skills: SkillType[];
  numQuestions: number;
  handsOnRatio?: number;
  experienceYears?: number;
  quizGoal?: QuizGoalType;
  jdText?: string;
  jdCompany?: string;
  interviewGroundingContext?: string;
  avoidQuestionFingerprints?: string[];
  difficultyFloor?: number;
  difficultyCeiling?: number;
}): string {
  const {
    profileType,
    skills,
    numQuestions,
    handsOnRatio = 0.3,
    experienceYears,
    quizGoal,
    jdText,
    jdCompany,
    interviewGroundingContext,
    avoidQuestionFingerprints = [],
    difficultyFloor,
    difficultyCeiling,
  } = params;

  const handsOnCount = Math.max(1, Math.round(numQuestions * handsOnRatio));
  const mcqCount = numQuestions - handsOnCount;
  const difficulty = difficultyRange(profileType, experienceYears);
  const handsOnSkills = skills.filter((s) => s !== 'POWERBI');
  const hasHandsOn = handsOnSkills.length > 0;
  const includesPowerBI = skills.includes('POWERBI');

  return `You are an expert Data Analyst interview coach.
Generate a ${numQuestions}-question quiz with MCQ and hands-on questions where applicable.

---- CANDIDATE PROFILE ----
Profile Type: ${profileType}
${profileContext(profileType, experienceYears)}
${experienceYears ? `Experience: ${experienceYears} years` : ''}

---- QUIZ PARAMETERS ----
Skills to cover: ${skills.join(', ')}
Difficulty range: ${difficulty}
${typeof difficultyFloor === 'number' && typeof difficultyCeiling === 'number'
    ? `Hard constraint: Every question difficulty must be between ${difficultyFloor} and ${difficultyCeiling}.`
    : ''}
MCQ questions: ${mcqCount}
${hasHandsOn ? `Hands-on questions: ${handsOnCount} (from: ${handsOnSkills.join(', ')})` : `All ${numQuestions} questions should be non-hands-on.`}

${quizGoal === 'INTERVIEW_PREP' && jdCompany ? interviewPrepContext(jdCompany, jdText) : ''}
${quizGoal === 'INTERVIEW_PREP' && interviewGroundingContext ? `\n${interviewGroundingContext}\n` : ''}
${avoidQuestionFingerprints.length > 0
    ? `\n---- PREVIOUSLY SERVED QUESTION SIGNATURES (DO NOT REPEAT) ----
${avoidQuestionFingerprints.slice(0, 60).map((v, i) => `${i + 1}. ${v}`).join('\n')}
`
    : ''}

---- MCQ FORMAT ----
{
  "type": "MCQ",
  "skill": "EXCEL" | "SQL" | "POWERBI",
  "content": "Question text",
  "options": ["A", "B", "C", "D"],
  "correctAnswer": "The exact correct option text",
  "multipleCorrect": false,
  "solution": "2-3 sentence explanation",
  "difficulty": <number 1-10>
}

${includesPowerBI ? `---- POWERBI FILL BLANK FORMAT ----
{
  "type": "POWERBI_FILL_BLANK",
  "skill": "POWERBI",
  "content": "Power Query language used in transformations is ____.",
  "blankLabel": "Language",
  "acceptedAnswers": ["M", "Power Query M"],
  "caseSensitive": false,
  "solution": "Power Query transformations are written in M.",
  "difficulty": <number 1-10>
}
` : ''}

${hasHandsOn ? `---- SQL HANDS-ON FORMAT ----
{
  "type": "SQL_HANDS_ON",
  "skill": "SQL",
  "content": "Task description with table context",
  "setupSQL": "CREATE TABLE ...; INSERT INTO ...;",
  "sampleData": [{"tableName": "table_name", "rows": [{"col1": "val1", "col2": 123}]}],
  "expectedOutput": [{"col1": "val1", "col2": 123}],
  "expectedColumns": ["col1", "col2"],
  "hints": ["Hint 1", "Hint 2"],
  "starterCode": "-- Write your SQL query here\\nSELECT ",
  "solution": "The correct SQL query",
  "difficulty": <number 1-10>
}

---- EXCEL HANDS-ON FORMAT ----
{
  "type": "EXCEL_HANDS_ON",
  "skill": "EXCEL",
  "content": "Task description",
  "columns": ["Name", "Q1", "Q2", "Total"],
  "initialData": [["Alice", 10, 20, null], ["Bob", 5, 15, null]],
  "editableCells": [[0, 3], [1, 3]],
  "expectedFormulas": [{"row": 0, "col": 3, "formulas": ["=B1+C1"]}],
  "expectedValues": [{"row": 0, "col": 3, "value": 30}],
  "solution": "D1 = B1+C1",
  "difficulty": <number 1-10>
}
` : ''}

---- RULES ----
1. MCQ must have exactly 4 plausible options and single correct answer.
2. POWERBI_FILL_BLANK must include acceptedAnswers.
3. Never generate hands-on question types for POWERBI.
4. SQL_HANDS_ON requires non-empty setupSQL with CREATE TABLE + INSERT.
5. EXCEL_HANDS_ON requires columns, initialData, editableCells, expectedFormulas, expectedValues.
6. Questions must be diverse and solutions educational.
7. Prefer question styles and topic distributions from internal company interview signals when provided.
8. Do not repeat previous question signatures listed above; keep concepts and wording clearly distinct.
9. Return only a JSON array of ${numQuestions} question objects. No markdown or commentary.`;
}

export function buildPerformanceSummaryPrompt(params: {
  profileType: ProfileType;
  score: number;
  totalQuestions: number;
  wrongAnswers: Array<{
    skill: string;
    question: string;
    userAnswer: string;
    correctAnswer: string;
  }>;
}): string {
  const { profileType, score, totalQuestions, wrongAnswers } = params;

  return `You are a data analytics mentor.

A ${profileType.toLowerCase()} candidate just completed a quiz.
Score: ${score}/${totalQuestions} (${Math.round((score / totalQuestions) * 100)}%)

Wrong answers:
${wrongAnswers
      .map(
        (w, i) =>
          `${i + 1}. [${w.skill}] Q: ${w.question}
   Their answer: ${w.userAnswer}
   Correct answer: ${w.correctAnswer}`
      )
      .join('\n')}

Provide your response in TWO sections:

SECTION 1 - PERFORMANCE SUMMARY (3-5 sentences):
1. Identify the weakest skill area.
2. Pinpoint specific concept gaps.
3. Give 1-2 concrete next steps.

SECTION 2 - FOCUS TOPICS (JSON array):
Return a JSON array of specific topic strings.

Format exactly:
SUMMARY:
[summary]

TOPICS:
["topic1", "topic2", "topic3"]

Keep tone encouraging but honest. No markdown headers.`;
}

export function calculateQuizTimer(
  questionCount: number,
  includeHandsOn: boolean,
  profileType: ProfileType
): number {
  const minutesPerQ = includeHandsOn ? 2.5 : 1.5;
  const multiplier = profileType === 'FRESHER' ? 1.15 : 1.0;
  const rawTime = questionCount * minutesPerQ * multiplier;
  const rounded = Math.ceil(rawTime / 5) * 5;
  return Math.max(5, Math.min(20, rounded));
}
