/**
 * Prisma seed script for the question bank.
 *
 * Inserts curated questions from seed-questions.ts into the database.
 * Safe to run multiple times — deduplicates by question text.
 *
 * Usage:  npx tsx prisma/seed.ts
 * Or:     npx prisma db seed
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/* ── Curated question bank ─────────────────────────────────────── */
/* We inline a minimal version here so this file runs standalone    */
/* without needing path aliases from tsconfig.                      */

const DIFFICULTY_MAP: Record<number, 'easy' | 'medium' | 'hard'> = {
    1: 'easy',
    2: 'easy',
    3: 'easy',
    4: 'medium',
    5: 'medium',
    6: 'medium',
    7: 'hard',
    8: 'hard',
    9: 'hard',
    10: 'hard',
};

interface SeedQ {
    skill: string;
    text: string;
    options: string[];
    correctAnswer: string;
    explanation: string;
    difficulty: 'easy' | 'medium' | 'hard';
    tags: string[];
}

const QUESTIONS: SeedQ[] = [
    // ─── SQL ───────────────────────────────────────────────
    {
        skill: 'SQL',
        text: 'Which SQL clause is used to filter rows before grouping?',
        options: ['WHERE', 'HAVING', 'GROUP BY', 'ORDER BY'],
        correctAnswer: 'WHERE',
        explanation: 'WHERE filters individual rows before any GROUP BY aggregation occurs. HAVING filters groups after aggregation.',
        difficulty: 'easy',
        tags: ['filtering', 'basics'],
    },
    {
        skill: 'SQL',
        text: 'What is the difference between INNER JOIN and LEFT JOIN?',
        options: [
            'INNER JOIN returns only matching rows; LEFT JOIN returns all left table rows plus matching right rows',
            'LEFT JOIN returns only matching rows; INNER JOIN returns all rows',
            'They are the same',
            'LEFT JOIN removes duplicates',
        ],
        correctAnswer: 'INNER JOIN returns only matching rows; LEFT JOIN returns all left table rows plus matching right rows',
        explanation: 'INNER JOIN keeps only rows that have a match in both tables. LEFT JOIN keeps all rows from the left table, filling NULLs where there is no match.',
        difficulty: 'medium',
        tags: ['joins', 'intermediate'],
    },
    {
        skill: 'SQL',
        text: 'Which window function returns the row number within a partition?',
        options: ['ROW_NUMBER()', 'RANK()', 'DENSE_RANK()', 'NTILE()'],
        correctAnswer: 'ROW_NUMBER()',
        explanation: 'ROW_NUMBER() assigns a unique sequential number to each row within a partition. RANK() and DENSE_RANK() handle ties differently.',
        difficulty: 'medium',
        tags: ['window-functions', 'intermediate'],
    },
    {
        skill: 'SQL',
        text: 'What does the COALESCE function do?',
        options: [
            'Returns the first non-NULL value from a list of arguments',
            'Converts data types',
            'Concatenates strings',
            'Counts non-NULL values',
        ],
        correctAnswer: 'Returns the first non-NULL value from a list of arguments',
        explanation: 'COALESCE evaluates arguments in order and returns the first one that is not NULL. Commonly used to provide default values.',
        difficulty: 'medium',
        tags: ['functions', 'null-handling'],
    },
    {
        skill: 'SQL',
        text: 'Which SQL statement is used to create an index on a table?',
        options: ['CREATE INDEX', 'ADD INDEX', 'ALTER TABLE ... INDEX', 'INSERT INDEX'],
        correctAnswer: 'CREATE INDEX',
        explanation: 'CREATE INDEX index_name ON table_name (column) is the standard syntax. Indexes speed up SELECT queries at the cost of slower INSERT/UPDATE.',
        difficulty: 'medium',
        tags: ['indexing', 'performance'],
    },
    {
        skill: 'SQL',
        text: 'What is a Common Table Expression (CTE) in SQL?',
        options: [
            'A temporary named result set defined with WITH clause',
            'A permanent table stored in the database',
            'A type of stored procedure',
            'A trigger that runs on SELECT',
        ],
        correctAnswer: 'A temporary named result set defined with WITH clause',
        explanation: 'A CTE is defined using WITH ... AS (...) and exists only for the duration of the query. It improves readability and allows recursive queries.',
        difficulty: 'hard',
        tags: ['cte', 'advanced'],
    },
    {
        skill: 'SQL',
        text: 'Which aggregate function ignores NULL values by default?',
        options: ['All of them (SUM, AVG, COUNT, etc.)', 'Only COUNT(*)', 'None', 'Only SUM'],
        correctAnswer: 'All of them (SUM, AVG, COUNT, etc.)',
        explanation: 'All standard SQL aggregate functions (SUM, AVG, MIN, MAX, COUNT(column)) ignore NULLs. The exception is COUNT(*) which counts all rows including NULLs.',
        difficulty: 'medium',
        tags: ['aggregation', 'null-handling'],
    },

    // ─── Excel ─────────────────────────────────────────────
    {
        skill: 'Excel',
        text: 'Which Excel function searches for a value in the first column of a range and returns a value from a specified column?',
        options: ['VLOOKUP', 'HLOOKUP', 'INDEX', 'MATCH'],
        correctAnswer: 'VLOOKUP',
        explanation: 'VLOOKUP(lookup_value, table_array, col_index_num, [range_lookup]) searches the first column vertically and returns the value from the specified column number.',
        difficulty: 'easy',
        tags: ['lookup', 'basics'],
    },
    {
        skill: 'Excel',
        text: 'What does the XLOOKUP function offer over VLOOKUP?',
        options: [
            'It can search in any direction and returns exact matches by default',
            'It is faster for small datasets',
            'It only works with numbers',
            'It creates charts automatically',
        ],
        correctAnswer: 'It can search in any direction and returns exact matches by default',
        explanation: 'XLOOKUP replaces VLOOKUP/HLOOKUP by allowing left-to-right, right-to-left, top-to-bottom searches. It defaults to exact match.',
        difficulty: 'medium',
        tags: ['lookup', 'modern-excel'],
    },
    {
        skill: 'Excel',
        text: 'Which function combination is commonly used as a more flexible alternative to VLOOKUP?',
        options: ['INDEX + MATCH', 'IF + VLOOKUP', 'SUM + COUNTIF', 'LEFT + RIGHT'],
        correctAnswer: 'INDEX + MATCH',
        explanation: 'INDEX(array, MATCH(lookup_value, lookup_array, 0)) can look up values in any column, making it more versatile than VLOOKUP.',
        difficulty: 'medium',
        tags: ['lookup', 'intermediate'],
    },
    {
        skill: 'Excel',
        text: 'What does the SUMIFS function do?',
        options: [
            'Sums values that meet multiple criteria',
            'Sums all values in a range',
            'Counts values that meet criteria',
            'Returns the sum if a condition is true',
        ],
        correctAnswer: 'Sums values that meet multiple criteria',
        explanation: 'SUMIFS(sum_range, criteria_range1, criteria1, ...) adds up values where all specified conditions are met.',
        difficulty: 'medium',
        tags: ['aggregation', 'conditional'],
    },
    {
        skill: 'Excel',
        text: 'What is a PivotTable used for?',
        options: [
            'Summarizing, analyzing, and exploring large datasets interactively',
            'Creating charts from raw data',
            'Importing data from external sources',
            'Writing VBA macros',
        ],
        correctAnswer: 'Summarizing, analyzing, and exploring large datasets interactively',
        explanation: 'PivotTables allow you to drag-and-drop fields to dynamically group, filter, and aggregate data without writing formulas.',
        difficulty: 'easy',
        tags: ['pivottable', 'analysis'],
    },
    {
        skill: 'Excel',
        text: 'Which Excel function returns the current date?',
        options: ['TODAY()', 'NOW()', 'DATE()', 'CURRENT()'],
        correctAnswer: 'TODAY()',
        explanation: 'TODAY() returns the current date (no time). NOW() returns both date and time. DATE() constructs a date from year, month, day arguments.',
        difficulty: 'easy',
        tags: ['date-functions', 'basics'],
    },
    {
        skill: 'Excel',
        text: 'What is the purpose of the $ symbol in cell references like $A$1?',
        options: [
            'It creates an absolute reference that does not change when copied',
            'It formats the cell as currency',
            'It locks the cell from editing',
            'It links to an external workbook',
        ],
        correctAnswer: 'It creates an absolute reference that does not change when copied',
        explanation: 'The $ sign locks either the column ($A), row ($1), or both ($A$1) so the reference stays fixed when formulas are copied.',
        difficulty: 'easy',
        tags: ['cell-references', 'basics'],
    },

    // ─── Python ────────────────────────────────────────────
    {
        skill: 'Python',
        text: 'In pandas, which method is used to remove rows with missing values?',
        options: ['dropna()', 'fillna()', 'isna()', 'notna()'],
        correctAnswer: 'dropna()',
        explanation: 'df.dropna() removes rows containing any NaN values. fillna() replaces them instead of removing.',
        difficulty: 'easy',
        tags: ['pandas', 'data-cleaning'],
    },
    {
        skill: 'Python',
        text: 'What does the groupby() function do in pandas?',
        options: [
            'Groups rows by column values and allows aggregate operations on each group',
            'Sorts the DataFrame by column values',
            'Filters rows based on conditions',
            'Joins two DataFrames together',
        ],
        correctAnswer: 'Groups rows by column values and allows aggregate operations on each group',
        explanation: 'df.groupby("column").agg(func) splits data into groups, applies aggregate functions, and combines results.',
        difficulty: 'medium',
        tags: ['pandas', 'aggregation'],
    },
    {
        skill: 'Python',
        text: 'Which Python library is primarily used for data visualization?',
        options: ['matplotlib', 'numpy', 'pandas', 'scikit-learn'],
        correctAnswer: 'matplotlib',
        explanation: 'matplotlib (and its pyplot module) is the foundational plotting library in Python. seaborn and plotly are built on top of it.',
        difficulty: 'easy',
        tags: ['visualization', 'basics'],
    },
    {
        skill: 'Python',
        text: 'What is the difference between loc[] and iloc[] in pandas?',
        options: [
            'loc uses label-based indexing; iloc uses integer-position indexing',
            'loc is faster than iloc',
            'iloc uses label-based indexing; loc uses integer-position indexing',
            'They are identical',
        ],
        correctAnswer: 'loc uses label-based indexing; iloc uses integer-position indexing',
        explanation: 'df.loc[row_label] selects by label name. df.iloc[row_num] selects by integer position (0-based).',
        difficulty: 'medium',
        tags: ['pandas', 'indexing'],
    },
    {
        skill: 'Python',
        text: 'What does the apply() function do in pandas?',
        options: [
            'Applies a function along an axis of the DataFrame',
            'Imports external libraries',
            'Creates a new DataFrame',
            'Exports data to a file',
        ],
        correctAnswer: 'Applies a function along an axis of the DataFrame',
        explanation: 'df.apply(func) applies a function to each row (axis=1) or column (axis=0) of the DataFrame.',
        difficulty: 'medium',
        tags: ['pandas', 'transformation'],
    },
    {
        skill: 'Python',
        text: 'How do you read a CSV file into a pandas DataFrame?',
        options: ['pd.read_csv("file.csv")', 'pd.load("file.csv")', 'pd.import_csv("file.csv")', 'pd.open("file.csv")'],
        correctAnswer: 'pd.read_csv("file.csv")',
        explanation: 'pd.read_csv() is the standard function to load CSV files. It supports many parameters like sep, header, encoding, and dtype.',
        difficulty: 'easy',
        tags: ['pandas', 'io'],
    },

    // ─── Power BI ───────────────────────────────────────────
    {
        skill: 'Power BI',
        text: 'What language is used for creating calculated columns and measures in Power BI?',
        options: ['DAX', 'M', 'SQL', 'Python'],
        correctAnswer: 'DAX',
        explanation: 'DAX (Data Analysis Expressions) is used for calculations in Power BI. M is used in the Query Editor for data transformation.',
        difficulty: 'easy',
        tags: ['dax', 'basics'],
    },
    {
        skill: 'Power BI',
        text: 'What is the difference between a calculated column and a measure in Power BI?',
        options: [
            'Calculated columns are computed row by row and stored; measures are computed on the fly',
            'Measures are stored in the table; calculated columns are computed on the fly',
            'There is no difference',
            'Calculated columns use M; measures use DAX',
        ],
        correctAnswer: 'Calculated columns are computed row by row and stored; measures are computed on the fly',
        explanation: 'Calculated columns add a new column (computed at refresh). Measures are evaluated at query time based on the current filter context.',
        difficulty: 'medium',
        tags: ['dax', 'modeling'],
    },
    {
        skill: 'Power BI',
        text: 'What does the CALCULATE function do in DAX?',
        options: [
            'Evaluates an expression in a modified filter context',
            'Performs basic arithmetic',
            'Creates a new table',
            'Imports data from external sources',
        ],
        correctAnswer: 'Evaluates an expression in a modified filter context',
        explanation: 'CALCULATE(expression, filter1, filter2, ...) is the most important DAX function. It modifies the filter context.',
        difficulty: 'hard',
        tags: ['dax', 'advanced'],
    },
    {
        skill: 'Power BI',
        text: 'What is a slicer in Power BI?',
        options: [
            'A visual filter element that lets users interactively filter report data',
            'A type of chart',
            'A data transformation step',
            'A DAX function',
        ],
        correctAnswer: 'A visual filter element that lets users interactively filter report data',
        explanation: 'Slicers are standalone filter visuals on the report canvas. Users click on values to filter all related visuals on the page.',
        difficulty: 'easy',
        tags: ['visuals', 'filtering'],
    },
    {
        skill: 'Power BI',
        text: 'What type of relationship is most common in Power BI data models?',
        options: ['One-to-Many', 'Many-to-Many', 'One-to-One', 'Self-referencing'],
        correctAnswer: 'One-to-Many',
        explanation: 'One-to-Many relationships are the standard in star schema models. They enable proper filter propagation from dimension to fact tables.',
        difficulty: 'medium',
        tags: ['modeling', 'relationships'],
    },
    {
        skill: 'Power BI',
        text: 'What is Power Query used for in Power BI?',
        options: [
            'Extracting, transforming, and loading (ETL) data before it enters the model',
            'Creating DAX measures',
            'Building report visuals',
            'Publishing reports to the web',
        ],
        correctAnswer: 'Extracting, transforming, and loading (ETL) data before it enters the model',
        explanation: 'Power Query (using the M language) handles the ETL pipeline: connecting to data sources, cleaning, reshaping, and loading data.',
        difficulty: 'easy',
        tags: ['power-query', 'etl'],
    },
];

/* ── Main ──────────────────────────────────────────────────────── */

async function main() {
    console.log('🌱 Seeding question bank...');

    let created = 0;
    let skipped = 0;

    for (const q of QUESTIONS) {
        let skillEnum: 'SQL' | 'EXCEL' | 'POWERBI' | 'PYTHON';
        if (q.skill === 'SQL') skillEnum = 'SQL';
        else if (q.skill === 'Excel') skillEnum = 'EXCEL';
        else if (q.skill === 'Power BI') skillEnum = 'POWERBI';
        else if (q.skill === 'Python') skillEnum = 'PYTHON';
        else continue; // Unknown skill

        let difficultyInt = 5;
        if (q.difficulty === 'easy') difficultyInt = 3;
        if (q.difficulty === 'hard') difficultyInt = 8;

        // Deduplicate
        const existing = await prisma.question.findFirst({ where: { content: q.text } });
        if (existing) {
            skipped++;
            continue;
        }

        await prisma.question.create({
            data: {
                skill: skillEnum,
                type: 'MCQ',
                content: q.text,
                options: q.options,
                correctAnswer: q.correctAnswer,
                solution: q.explanation,
                difficulty: difficultyInt,
                metadata: { tags: q.tags },
            },
        });
        created++;
    }

    console.log(`\n✅ Seeded ${created} questions (${skipped} duplicates/skipped)`);
    console.log('🎉 Seeding complete!');
}

main()
    .catch((e) => {
        console.error('❌ Seed error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
