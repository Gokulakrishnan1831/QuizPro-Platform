import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || '',
});

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();

    if (!text || text.length < 10) {
      return NextResponse.json({ error: 'Text input is too short' }, { status: 400 });
    }

    const systemPrompt = `
      You are an expert SQL instructor and Data Engineer. 
      Your task is to analyze unstructured text and extract high-quality SQL Multiple Choice Questions (MCQs).
      
      Rules:
      1. Extract questions related to SQL, Database Concepts, or Data Analytics.
      2. Ensure each question has 4 options and exactly one correct answer.
      3. Format the output as a valid JSON array.
      4. If the text contains no clear questions, generate 3 relevant SQL questions based on the topics mentioned in the text.
      5. The "difficulty" should be inferred (easy, medium, hard).
      
      JSON Schema:
      [
        {
          "domain": "Data Analytics",
          "skill": "SQL",
          "question": "Question text here",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "correctAnswer": "Option A",
          "explanation": "Brief explanation of why this is correct.",
          "difficulty": "medium"
        }
      ]
      
      Return ONLY the JSON array. Do not wrap in markdown code blocks.
    `;

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Extract questions from this text:\n\n${text}` },
      ],
      model: 'llama3-70b-8192',
      temperature: 0.1, // Low temp for strict JSON adherence
    });

    const rawContent = chatCompletion.choices[0]?.message?.content || '[]';
    
    // Clean up potential markdown formatting if the model disobeys
    const cleanJson = rawContent.replace(/```json/g, '').replace(/```/g, '').trim();
    
    let parsedQuestions;
    try {
      parsedQuestions = JSON.parse(cleanJson);
    } catch (e) {
      console.error('Failed to parse AI response:', rawContent);
      return NextResponse.json({ error: 'AI generated invalid JSON', raw: rawContent }, { status: 500 });
    }

    return NextResponse.json({ questions: parsedQuestions });

  } catch (error: any) {
    console.error('AI Parse Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
