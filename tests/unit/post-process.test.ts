import { describe, it, expect } from 'vitest';
import { postProcessQuestions } from '@/lib/ai/post-process';

describe('postProcessQuestions', () => {
    /* ─── SQL_HANDS_ON ──────────────────────────────────────── */

    it('preserves setupSQL when already provided by LLM', () => {
        const questions = [
            {
                type: 'SQL_HANDS_ON',
                skill: 'SQL',
                content: 'Get all users',
                setupSQL: 'CREATE TABLE users (id INTEGER, name VARCHAR); INSERT INTO users VALUES (1, \'Alice\');',
                expectedOutput: [{ id: 1, name: 'Alice' }],
                solution: 'SELECT * FROM users',
                difficulty: 3,
            },
        ];

        const result = postProcessQuestions(questions);
        expect(result[0].setupSQL).toBe(questions[0].setupSQL);
    });

    it('generates setupSQL from sampleData when setupSQL is missing', () => {
        const questions = [
            {
                type: 'SQL_HANDS_ON',
                skill: 'SQL',
                content: 'Get all students older than 20',
                setupSQL: '',
                sampleData: [
                    {
                        tableName: 'students',
                        rows: [
                            { id: 1, name: 'Alice', age: 22 },
                            { id: 2, name: 'Bob', age: 19 },
                        ],
                    },
                ],
                expectedOutput: [{ id: 1, name: 'Alice', age: 22 }],
                solution: 'SELECT * FROM students WHERE age > 20',
                difficulty: 3,
            },
        ];

        const result = postProcessQuestions(questions);
        expect(result[0].setupSQL).toContain('CREATE TABLE students');
        expect(result[0].setupSQL).toContain('INSERT INTO students');
        expect(result[0].setupSQL).toContain('Alice');
        expect(result[0].setupSQL).toContain('Bob');
    });

    it('generates fallback setupSQL when both setupSQL and sampleData are missing', () => {
        const questions = [
            {
                type: 'SQL_HANDS_ON',
                skill: 'SQL',
                content: "Retrieve the names and ages of students from the 'students' table who are older than 20",
                solution: 'SELECT name, age FROM students WHERE age > 20',
                difficulty: 3,
            },
        ];

        const result = postProcessQuestions(questions);
        expect(result[0].setupSQL).toBeTruthy();
        expect(result[0].setupSQL.length).toBeGreaterThan(10);
        expect(result[0].setupSQL).toContain('CREATE TABLE');
        expect(result[0].setupSQL).toContain('INSERT INTO');
        // Should detect "students" from the content
        expect(result[0].setupSQL).toContain('students');
    });

    it('generates employee table for employee-related questions', () => {
        const questions = [
            {
                type: 'SQL_HANDS_ON',
                skill: 'SQL',
                content: 'Find the average salary per department from the employees table',
                solution: 'SELECT department, AVG(salary) FROM employees GROUP BY department',
                difficulty: 5,
            },
        ];

        const result = postProcessQuestions(questions);
        expect(result[0].setupSQL).toContain('employees');
        expect(result[0].setupSQL).toContain('salary');
        expect(result[0].setupSQL).toContain('department');
    });

    it('generates sales table for sales-related questions', () => {
        const questions = [
            {
                type: 'SQL_HANDS_ON',
                skill: 'SQL',
                content: 'Find the total revenue by product category from the sales table',
                solution: 'SELECT category, SUM(amount) FROM sales GROUP BY category',
                difficulty: 4,
            },
        ];

        const result = postProcessQuestions(questions);
        expect(result[0].setupSQL).toContain('sales');
        expect(result[0].setupSQL).toContain('amount');
        expect(result[0].setupSQL).toContain('category');
    });

    it('generates sampleData from setupSQL when sampleData is missing', () => {
        const questions = [
            {
                type: 'SQL_HANDS_ON',
                skill: 'SQL',
                content: 'Get all users',
                setupSQL: "CREATE TABLE users (id INTEGER, name VARCHAR); INSERT INTO users VALUES (1, 'Alice'); INSERT INTO users VALUES (2, 'Bob');",
                expectedOutput: [],
                solution: 'SELECT * FROM users',
                difficulty: 3,
            },
        ];

        const result = postProcessQuestions(questions);
        expect(result[0].sampleData).toBeDefined();
        expect(result[0].sampleData.length).toBe(1);
        expect(result[0].sampleData[0].tableName).toBe('users');
        expect(result[0].sampleData[0].rows.length).toBe(2);
        expect(result[0].sampleData[0].rows[0].name).toBe('Alice');
    });

    it('ensures expectedOutput exists even when missing', () => {
        const questions = [
            {
                type: 'SQL_HANDS_ON',
                skill: 'SQL',
                content: 'Get all users',
                setupSQL: 'CREATE TABLE users (id INTEGER);',
                solution: 'SELECT * FROM users',
                difficulty: 3,
            },
        ];

        const result = postProcessQuestions(questions);
        expect(result[0].expectedOutput).toBeDefined();
        expect(Array.isArray(result[0].expectedOutput)).toBe(true);
    });

    /* ─── EXCEL_HANDS_ON ────────────────────────────────────── */

    it('ensures EXCEL_HANDS_ON has required fields even when missing', () => {
        const questions = [
            {
                type: 'EXCEL_HANDS_ON',
                skill: 'EXCEL',
                content: 'Calculate totals',
                solution: 'Use SUM formula',
                difficulty: 3,
            },
        ];

        const result = postProcessQuestions(questions);
        expect(result[0].columns).toBeDefined();
        expect(result[0].initialData).toBeDefined();
        expect(result[0].editableCells).toBeDefined();
        expect(result[0].expectedFormulas).toBeDefined();
        expect(result[0].expectedValues).toBeDefined();
    });

    it('preserves EXCEL_HANDS_ON data when already provided', () => {
        const questions = [
            {
                type: 'EXCEL_HANDS_ON',
                skill: 'EXCEL',
                content: 'Calculate totals',
                columns: ['Name', 'Sales', 'Total'],
                initialData: [['Alice', 100, null]],
                editableCells: [[0, 2]],
                expectedValues: [{ row: 0, col: 2, value: 100 }],
                solution: 'Use SUM',
                difficulty: 3,
            },
        ];

        const result = postProcessQuestions(questions);
        expect(result[0].columns).toEqual(['Name', 'Sales', 'Total']);
        expect(result[0].initialData).toEqual([['Alice', 100, null]]);
    });

    it('normalizes POWERBI_MCQ into MCQ and keeps valid option structure', () => {
        const questions = [
            {
                type: 'POWERBI_MCQ',
                skill: 'Power BI',
                content: 'Power BI question',
                options: ['A', 'A', '', 'B'],
                correctAnswer: 'B',
                solution: 's',
                difficulty: 11,
            },
        ];

        const result = postProcessQuestions(questions);
        expect(result[0].type).toBe('MCQ');
        expect(result[0].skill).toBe('POWERBI');
        expect(result[0].options).toHaveLength(4);
        expect(result[0].difficulty).toBe(10);
    });

    it('normalizes POWERBI_FILL_BLANK accepted answers', () => {
        const questions = [
            {
                type: 'POWERBI_FILL_BLANK',
                skill: 'POWERBI',
                content: 'In DAX ____ changes filter context',
                acceptedAnswers: [' CALCULATE ', '', 'CALCULATE()'],
                solution: 'CALCULATE changes filter context',
                difficulty: 4,
            },
        ];

        const result = postProcessQuestions(questions);
        expect(result[0].type).toBe('POWERBI_FILL_BLANK');
        expect(result[0].acceptedAnswers).toEqual(['CALCULATE', 'CALCULATE()']);
        expect(result[0].caseSensitive).toBe(false);
    });

    /* ─── MCQ (passthrough) ─────────────────────────────────── */

    it('does not modify MCQ questions', () => {
        const questions = [
            {
                type: 'MCQ',
                skill: 'SQL',
                content: 'What is a JOIN?',
                options: ['A', 'B', 'C', 'D'],
                correctAnswer: 'A',
                solution: 'A JOIN combines rows',
                difficulty: 3,
            },
        ];

        const result = postProcessQuestions(questions);
        expect(result[0]).toEqual(questions[0]);
    });

    /* ─── DuckDB compatibility ──────────────────────────────── */

    it('generated setupSQL uses DuckDB-compatible syntax (no AUTO_INCREMENT)', () => {
        const questions = [
            {
                type: 'SQL_HANDS_ON',
                skill: 'SQL',
                content: 'Get all students from the students table',
                solution: 'SELECT * FROM students',
                difficulty: 3,
            },
        ];

        const result = postProcessQuestions(questions);
        expect(result[0].setupSQL).not.toContain('AUTO_INCREMENT');
        expect(result[0].setupSQL).not.toContain('SERIAL');
        expect(result[0].setupSQL).toContain('INTEGER');
    });

    it('handles single quotes in data correctly', () => {
        const questions = [
            {
                type: 'SQL_HANDS_ON',
                skill: 'SQL',
                content: 'Get customer orders',
                setupSQL: '',
                sampleData: [
                    {
                        tableName: 'customers',
                        rows: [{ id: 1, name: "O'Brien", city: 'New York' }],
                    },
                ],
                expectedOutput: [],
                solution: 'SELECT * FROM customers',
                difficulty: 3,
            },
        ];

        const result = postProcessQuestions(questions);
        // Escaped quote for DuckDB
        expect(result[0].setupSQL).toContain("O''Brien");
    });

    /* ─── Mixed quiz ────────────────────────────────────────── */

    it('processes a mixed quiz with MCQ + SQL + Excel correctly', () => {
        const questions = [
            { type: 'MCQ', content: 'Q1', options: ['A'], correctAnswer: 'A', solution: 's', difficulty: 3 },
            { type: 'SQL_HANDS_ON', content: 'Get employees', solution: 'SELECT *', difficulty: 3 },
            { type: 'EXCEL_HANDS_ON', content: 'Sum values', solution: 'SUM', difficulty: 3 },
        ];

        const result = postProcessQuestions(questions);
        expect(result).toHaveLength(3);

        // MCQ unchanged
        expect(result[0].type).toBe('MCQ');
        expect(result[0].setupSQL).toBeUndefined();

        // SQL got setupSQL
        expect(result[1].setupSQL).toBeTruthy();
        expect(result[1].setupSQL).toContain('CREATE TABLE');

        // Excel got defaults
        expect(result[2].columns).toBeDefined();
        expect(result[2].initialData).toBeDefined();
    });
});
