import { config } from 'dotenv';
config({ path: '.env.local' });

import { extractAndRepairJson } from './lib/ai/json-repair';

async function test() {
  const PRIMARY_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const keysStr = process.env.GEMINI_API_KEYS || process.env.GROQ_API_KEYS || '';
  const keys = keysStr.split(',').map(k => k.trim()).filter(Boolean);
  
  console.log(`Model: ${PRIMARY_MODEL}`);
  console.log(`Keys: ${keys.length}`);

  const prompt = `You are an expert Data Analyst interview coach.
Generate a 5-question quiz.

Skills to cover: SQL
Difficulty range: Intermediate to Hard (difficulty 5-7 out of 10)

---- MCQ FORMAT ----
{
  "type": "MCQ",
  "skill": "SQL",
  "content": "Question text",
  "options": ["A", "B", "C", "D"],
  "correctAnswer": "The exact correct option text",
  "multipleCorrect": false,
  "solution": "2-3 sentence explanation",
  "difficulty": 6
}

---- RULES ----
1. MCQ must have exactly 4 plausible options and single correct answer.
2. Return only a JSON array of 5 question objects. No markdown or commentary.`;

  const payload = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.8,
      maxOutputTokens: 8192,
    },
    systemInstruction: {
      parts: [{ text: 'You are a quiz generation engine. You ONLY output valid JSON arrays. No markdown, no commentary, no wrapping.' }]
    }
  };

  try {
    console.log('\nSending request...');
    const start = Date.now();
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${PRIMARY_MODEL}:generateContent?key=${keys[0]}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`Status: ${response.status} (${elapsed}s)`);
    if (!response.ok) {
      console.error('ERROR:', await response.text());
      return;
    }
    
    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    console.log(`Raw length: ${text.length} chars`);
    const parsed = extractAndRepairJson(text);
    console.log(`\n✅ Successfully parsed ${parsed.length} questions!`);
    parsed.forEach((q: any, i: number) => {
      console.log(`  ${i+1}. [${q.type}/${q.skill}] ${q.content?.substring(0, 80)}...`);
    });
  } catch (err: any) {
    console.error('❌ Error:', err.message);
  }
}

test();
