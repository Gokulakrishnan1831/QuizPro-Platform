/**
 * Static question bank — used as fallback when AI generation is unavailable
 * or for seeding the database via `prisma db seed`.
 *
 * Each entry matches the Question model shape (minus `id` and `createdAt`).
 */

export interface SeedQuestion {
    skill: 'EXCEL' | 'SQL' | 'POWERBI';
    type: 'MCQ' | 'SQL_HANDS_ON' | 'EXCEL_HANDS_ON' | 'POWERBI_FILL_BLANK';
    content: string;
    // MCQ fields
    options?: string[];
    correctAnswer?: string;
    solution: string;
    difficulty: number;
    // SQL hands-on
    setupSQL?: string;
    sampleData?: { tableName: string; rows: Record<string, any>[] }[];
    expectedOutput?: Record<string, any>[];
    expectedColumns?: string[];
    starterCode?: string;
    // Excel hands-on
    columns?: string[];
    initialData?: (string | number | null)[][];
    editableCells?: [number, number][];
    expectedFormulas?: { row: number; col: number; formulas: string[] }[];
    expectedValues?: { row: number; col: number; value: string | number }[];
    // Power BI fill-in-the-blank
    blankLabel?: string;
    acceptedAnswers?: string[];
    caseSensitive?: boolean;
}

export const SEED_QUESTIONS: SeedQuestion[] = [
    // ─── SQL Questions ─────────────────────────────────────
    {
        skill: 'SQL',
        type: 'MCQ',
        content: 'Which SQL clause is used to filter rows before grouping?',
        options: ['WHERE', 'HAVING', 'GROUP BY', 'ORDER BY'],
        correctAnswer: 'WHERE',
        solution:
            'WHERE filters individual rows before any GROUP BY aggregation occurs. HAVING filters groups after aggregation.',
        difficulty: 3,
    },
    {
        skill: 'SQL',
        type: 'MCQ',
        content:
            'What is the difference between INNER JOIN and LEFT JOIN?',
        options: [
            'INNER JOIN returns only matching rows; LEFT JOIN returns all left table rows plus matching right rows',
            'LEFT JOIN returns only matching rows; INNER JOIN returns all rows',
            'They are the same',
            'LEFT JOIN removes duplicates',
        ],
        correctAnswer:
            'INNER JOIN returns only matching rows; LEFT JOIN returns all left table rows plus matching right rows',
        solution:
            'INNER JOIN keeps only rows that have a match in both tables. LEFT JOIN keeps all rows from the left table, filling NULLs where there is no match in the right table.',
        difficulty: 4,
    },
    {
        skill: 'SQL',
        type: 'MCQ',
        content:
            'Which window function returns the row number within a partition?',
        options: ['ROW_NUMBER()', 'RANK()', 'DENSE_RANK()', 'NTILE()'],
        correctAnswer: 'ROW_NUMBER()',
        solution:
            'ROW_NUMBER() assigns a unique sequential number to each row within a partition. RANK() and DENSE_RANK() handle ties differently.',
        difficulty: 5,
    },
    {
        skill: 'SQL',
        type: 'MCQ',
        content: 'What does the COALESCE function do?',
        options: [
            'Returns the first non-NULL value from a list of arguments',
            'Converts data types',
            'Concatenates strings',
            'Counts non-NULL values',
        ],
        correctAnswer:
            'Returns the first non-NULL value from a list of arguments',
        solution:
            'COALESCE evaluates arguments in order and returns the first one that is not NULL. It is commonly used to provide default values.',
        difficulty: 4,
    },
    {
        skill: 'SQL',
        type: 'MCQ',
        content:
            'Which SQL statement is used to create an index on a table?',
        options: [
            'CREATE INDEX',
            'ADD INDEX',
            'ALTER TABLE ... INDEX',
            'INSERT INDEX',
        ],
        correctAnswer: 'CREATE INDEX',
        solution:
            'CREATE INDEX index_name ON table_name (column) is the standard syntax. Indexes speed up SELECT queries at the cost of slower INSERT/UPDATE.',
        difficulty: 5,
    },
    {
        skill: 'SQL',
        type: 'MCQ',
        content:
            'What is a Common Table Expression (CTE) in SQL?',
        options: [
            'A temporary named result set defined with WITH clause',
            'A permanent table stored in the database',
            'A type of stored procedure',
            'A trigger that runs on SELECT',
        ],
        correctAnswer: 'A temporary named result set defined with WITH clause',
        solution:
            'A CTE is defined using WITH ... AS (...) and exists only for the duration of the query. It improves readability and allows recursive queries.',
        difficulty: 6,
    },
    {
        skill: 'SQL',
        type: 'MCQ',
        content:
            'Which aggregate function ignores NULL values by default?',
        options: ['All of them (SUM, AVG, COUNT, etc.)', 'Only COUNT(*)', 'None', 'Only SUM'],
        correctAnswer: 'All of them (SUM, AVG, COUNT, etc.)',
        solution:
            'All standard SQL aggregate functions (SUM, AVG, MIN, MAX, COUNT(column)) ignore NULLs. The exception is COUNT(*) which counts all rows including NULLs.',
        difficulty: 5,
    },

    // ─── Excel Questions ───────────────────────────────────
    {
        skill: 'EXCEL',
        type: 'MCQ',
        content: 'Which Excel function searches for a value in the first column of a range and returns a value from a specified column?',
        options: ['VLOOKUP', 'HLOOKUP', 'INDEX', 'MATCH'],
        correctAnswer: 'VLOOKUP',
        solution:
            'VLOOKUP(lookup_value, table_array, col_index_num, [range_lookup]) searches the first column vertically and returns the value from the specified column number.',
        difficulty: 3,
    },
    {
        skill: 'EXCEL',
        type: 'MCQ',
        content:
            'What does the XLOOKUP function offer over VLOOKUP?',
        options: [
            'It can search in any direction and returns exact matches by default',
            'It is faster for small datasets',
            'It only works with numbers',
            'It creates charts automatically',
        ],
        correctAnswer:
            'It can search in any direction and returns exact matches by default',
        solution:
            'XLOOKUP replaces VLOOKUP/HLOOKUP by allowing left-to-right, right-to-left, top-to-bottom searches. It defaults to exact match (unlike VLOOKUP which defaults to approximate match).',
        difficulty: 5,
    },
    {
        skill: 'EXCEL',
        type: 'MCQ',
        content:
            'Which function combination is commonly used as a more flexible alternative to VLOOKUP?',
        options: ['INDEX + MATCH', 'IF + VLOOKUP', 'SUM + COUNTIF', 'LEFT + RIGHT'],
        correctAnswer: 'INDEX + MATCH',
        solution:
            'INDEX(array, MATCH(lookup_value, lookup_array, 0)) can look up values in any column (not just the first) and supports left-lookups, making it more versatile than VLOOKUP.',
        difficulty: 5,
    },
    {
        skill: 'EXCEL',
        type: 'MCQ',
        content: 'What does the SUMIFS function do?',
        options: [
            'Sums values that meet multiple criteria',
            'Sums all values in a range',
            'Counts values that meet criteria',
            'Returns the sum if a condition is true',
        ],
        correctAnswer: 'Sums values that meet multiple criteria',
        solution:
            'SUMIFS(sum_range, criteria_range1, criteria1, [criteria_range2, criteria2], ...) adds up values where all specified conditions are met.',
        difficulty: 4,
    },
    {
        skill: 'EXCEL',
        type: 'MCQ',
        content: 'What is a PivotTable used for?',
        options: [
            'Summarizing, analyzing, and exploring large datasets interactively',
            'Creating charts from raw data',
            'Importing data from external sources',
            'Writing VBA macros',
        ],
        correctAnswer:
            'Summarizing, analyzing, and exploring large datasets interactively',
        solution:
            'PivotTables allow you to drag-and-drop fields to dynamically group, filter, and aggregate data without writing formulas. They are one of the most powerful Excel features for data analysis.',
        difficulty: 3,
    },
    {
        skill: 'EXCEL',
        type: 'MCQ',
        content: 'Which Excel function returns the current date?',
        options: ['TODAY()', 'NOW()', 'DATE()', 'CURRENT()'],
        correctAnswer: 'TODAY()',
        solution:
            'TODAY() returns the current date (no time component). NOW() returns both date and time. DATE() constructs a date from year, month, day arguments.',
        difficulty: 2,
    },
    {
        skill: 'EXCEL',
        type: 'MCQ',
        content:
            'What is the purpose of the $ symbol in cell references like $A$1?',
        options: [
            'It creates an absolute reference that does not change when copied',
            'It formats the cell as currency',
            'It locks the cell from editing',
            'It links to an external workbook',
        ],
        correctAnswer:
            'It creates an absolute reference that does not change when copied',
        solution:
            'The $ sign locks either the column ($A), row ($1), or both ($A$1) so the reference stays fixed when formulas are copied to other cells.',
        difficulty: 3,
    },

    // ─── Python Questions ──────────────────────────────────

    // ─── Power BI Questions ────────────────────────────────
    {
        skill: 'POWERBI',
        type: 'MCQ',
        content: 'What language is used for creating calculated columns and measures in Power BI?',
        options: ['DAX', 'M', 'SQL', 'R'],
        correctAnswer: 'DAX',
        solution:
            'DAX (Data Analysis Expressions) is used for calculations in Power BI. M (Power Query formula language) is used in the Query Editor for data transformation.',
        difficulty: 3,
    },
    {
        skill: 'POWERBI',
        type: 'MCQ',
        content:
            'What is the difference between a calculated column and a measure in Power BI?',
        options: [
            'Calculated columns are computed row by row and stored; measures are computed on the fly based on filter context',
            'Measures are stored in the table; calculated columns are computed on the fly',
            'There is no difference',
            'Calculated columns use M; measures use DAX',
        ],
        correctAnswer:
            'Calculated columns are computed row by row and stored; measures are computed on the fly based on filter context',
        solution:
            'Calculated columns add a new column to the table (computed at refresh). Measures are dynamic aggregations evaluated at query time based on the current filter context.',
        difficulty: 5,
    },
    {
        skill: 'POWERBI',
        type: 'MCQ',
        content: 'What does the CALCULATE function do in DAX?',
        options: [
            'Evaluates an expression in a modified filter context',
            'Performs basic arithmetic',
            'Creates a new table',
            'Imports data from external sources',
        ],
        correctAnswer: 'Evaluates an expression in a modified filter context',
        solution:
            'CALCULATE(expression, filter1, filter2, ...) is the most important DAX function. It modifies the filter context in which an expression is evaluated.',
        difficulty: 6,
    },
    {
        skill: 'POWERBI',
        type: 'MCQ',
        content:
            'What is a slicer in Power BI?',
        options: [
            'A visual filter element that lets users interactively filter report data',
            'A type of chart',
            'A data transformation step',
            'A DAX function',
        ],
        correctAnswer:
            'A visual filter element that lets users interactively filter report data',
        solution:
            'Slicers are standalone filter visuals on the report canvas. Users click on values in the slicer to filter all related visuals on the page.',
        difficulty: 2,
    },
    {
        skill: 'POWERBI',
        type: 'MCQ',
        content:
            'What type of relationship is most common in Power BI data models?',
        options: [
            'One-to-Many',
            'Many-to-Many',
            'One-to-One',
            'Self-referencing',
        ],
        correctAnswer: 'One-to-Many',
        solution:
            'One-to-Many relationships (e.g., one customer to many orders) are the standard in star schema models. They enable proper filter propagation from dimension to fact tables.',
        difficulty: 4,
    },
    {
        skill: 'POWERBI',
        type: 'MCQ',
        content: 'What is Power Query used for in Power BI?',
        options: [
            'Extracting, transforming, and loading (ETL) data before it enters the model',
            'Creating DAX measures',
            'Building report visuals',
            'Publishing reports to the web',
        ],
        correctAnswer:
            'Extracting, transforming, and loading (ETL) data before it enters the model',
        solution:
            'Power Query (using the M language) handles the ETL pipeline: connecting to data sources, cleaning, reshaping, and loading data into the Power BI data model.',
        difficulty: 3,
    },
    {
        skill: 'POWERBI',
        type: 'POWERBI_FILL_BLANK',
        content: 'In DAX, the function primarily used to modify filter context is ____.',
        acceptedAnswers: ['CALCULATE', 'CALCULATE()'],
        blankLabel: 'DAX function',
        caseSensitive: false,
        solution:
            'CALCULATE evaluates an expression in a modified filter context and is a core DAX function.',
        difficulty: 5,
    },
    {
        skill: 'POWERBI',
        type: 'POWERBI_FILL_BLANK',
        content: 'Power Query transformations are written in the ____ language.',
        acceptedAnswers: ['M', 'POWER QUERY M', 'POWER QUERY LANGUAGE'],
        blankLabel: 'Language',
        caseSensitive: false,
        solution:
            'Power Query uses the M language for data extraction and transformation steps.',
        difficulty: 3,
    },

    // ─── SQL Hands-On Questions ──────────────────────────────
    {
        skill: 'SQL',
        type: 'SQL_HANDS_ON',
        content: 'Write a SQL query to find the total salary per department. Order the results by total salary in descending order.',
        setupSQL: `CREATE TABLE employees (id INTEGER, name VARCHAR, department VARCHAR, salary INTEGER);
INSERT INTO employees VALUES
(1, 'Alice', 'Engineering', 120000),
(2, 'Bob', 'Marketing', 80000),
(3, 'Charlie', 'Engineering', 130000),
(4, 'Diana', 'Sales', 95000),
(5, 'Evan', 'Sales', 105000),
(6, 'Fiona', 'Marketing', 75000),
(7, 'George', 'Engineering', 110000);`,
        sampleData: [
            {
                tableName: 'employees',
                rows: [
                    { id: 1, name: 'Alice', department: 'Engineering', salary: 120000 },
                    { id: 2, name: 'Bob', department: 'Marketing', salary: 80000 },
                    { id: 3, name: 'Charlie', department: 'Engineering', salary: 130000 },
                    { id: 4, name: 'Diana', department: 'Sales', salary: 95000 },
                    { id: 5, name: 'Evan', department: 'Sales', salary: 105000 },
                    { id: 6, name: 'Fiona', department: 'Marketing', salary: 75000 },
                    { id: 7, name: 'George', department: 'Engineering', salary: 110000 },
                ],
            },
        ],
        expectedOutput: [
            { department: 'Engineering', total_salary: 360000 },
            { department: 'Sales', total_salary: 200000 },
            { department: 'Marketing', total_salary: 155000 },
        ],
        expectedColumns: ['department', 'total_salary'],
        starterCode: '-- Write your SQL query here\nSELECT ',
        solution: 'SELECT department, SUM(salary) AS total_salary FROM employees GROUP BY department ORDER BY total_salary DESC;',
        difficulty: 4,
    },

    // ─── Excel Hands-On Questions ────────────────────────────
    {
        skill: 'EXCEL',
        type: 'EXCEL_HANDS_ON',
        content: 'Calculate the total sales for each salesperson and the grand total. Fill in the "Total" column (column D) using addition, and the bottom row using SUM.',
        columns: ['Name', 'Q1 Sales', 'Q2 Sales', 'Total'],
        initialData: [
            ['Alice', 15000, 18000, null],
            ['Bob', 12000, 14500, null],
            ['Charlie', 20000, 22000, null],
            ['Grand Total', null, null, null],
        ],
        editableCells: [[0, 3], [1, 3], [2, 3], [3, 3]],
        expectedFormulas: [
            { row: 0, col: 3, formulas: ['=B1+C1'] },
            { row: 1, col: 3, formulas: ['=B2+C2'] },
            { row: 2, col: 3, formulas: ['=B3+C3'] },
            { row: 3, col: 3, formulas: ['=SUM(D1:D3)', '=D1+D2+D3'] },
        ],
        expectedValues: [
            { row: 0, col: 3, value: 33000 },
            { row: 1, col: 3, value: 26500 },
            { row: 2, col: 3, value: 42000 },
            { row: 3, col: 3, value: 101500 },
        ],
        solution: 'D1: =B1+C1 (15000+18000=33000)\nD2: =B2+C2 (12000+14500=26500)\nD3: =B3+C3 (20000+22000=42000)\nD4: =SUM(D1:D3) or =D1+D2+D3 (101500)',
        difficulty: 3,
    },

    // ─── Python Hands-On Questions ───────────────────────────
];

/**
 * Fetch random questions from the seed bank by skill.
 * Used as fallback when AI generation is unavailable.
 */
export function getRandomSeedQuestions(
    skills: Array<'EXCEL' | 'SQL' | 'POWERBI' | 'PYTHON'>,
    count: number,
    includeHandsOn: boolean = false
): SeedQuestion[] {
    let pool = SEED_QUESTIONS.filter((q) => skills.includes(q.skill));
    if (!includeHandsOn) {
        pool = pool.filter((q) => q.type === 'MCQ' || q.type === 'POWERBI_FILL_BLANK');
    }
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
}
