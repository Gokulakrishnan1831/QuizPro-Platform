import { NextResponse } from 'next/server';

/**
 * GET /api/skills
 *
 * Returns the available skills and question types.
 * These are defined as enums in the schema so this is essentially static.
 */
export async function GET() {
  const skills = [
    {
      id: 'EXCEL',
      name: 'Excel',
      description: 'Formulas, pivot tables, data analysis, VBA',
      types: ['MCQ', 'EXCEL_HANDS_ON'],
    },
    {
      id: 'SQL',
      name: 'SQL',
      description: 'Queries, joins, aggregations, window functions',
      types: ['MCQ', 'SQL_HANDS_ON'],
    },
    {
      id: 'POWERBI',
      name: 'Power BI',
      description: 'DAX, data modeling, visualizations, dashboards',
      types: ['MCQ', 'POWERBI_FILL_BLANK'],
    },
  ];

  return NextResponse.json({ skills });
}
