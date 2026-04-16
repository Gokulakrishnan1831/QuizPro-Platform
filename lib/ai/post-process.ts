/**
 * Post-process AI-generated questions to ensure hands-on questions
 * have all required metadata (setupSQL, columns, initialData, etc.).
 *
 * The LLM sometimes generates SQL_HANDS_ON or EXCEL_HANDS_ON questions
 * without the structured data needed by the in-browser engines (DuckDB,
 * ExcelGrid). This module fills in missing fields so the editors work.
 */

/* ─── SQL Helpers ──────────────────────────────────────────── */

/**
 * Given a sampleData array (table name + row objects), produce the
 * CREATE TABLE + INSERT INTO statements for DuckDB.
 */
function sampleDataToSetupSQL(
    sampleData: { tableName: string; rows: Record<string, any>[] }[]
): string {
    const stmts: string[] = [];

    for (const table of sampleData) {
        if (!table.tableName || !table.rows?.length) continue;
        const cols = Object.keys(table.rows[0]);

        // Infer column types from first row values
        const colDefs = cols.map((col) => {
            const val = table.rows[0][col];
            if (typeof val === 'number') return `${col} DOUBLE`;
            if (typeof val === 'boolean') return `${col} BOOLEAN`;
            return `${col} VARCHAR`;
        });

        stmts.push(`CREATE TABLE ${table.tableName} (${colDefs.join(', ')});`);

        for (const row of table.rows) {
            const vals = cols.map((c) => {
                const v = row[c];
                if (v === null || v === undefined) return 'NULL';
                if (typeof v === 'number' || typeof v === 'boolean') return String(v);
                return `'${String(v).replace(/'/g, "''")}'`;
            });
            stmts.push(
                `INSERT INTO ${table.tableName} VALUES (${vals.join(', ')});`
            );
        }
    }

    return stmts.join('\n');
}

/**
 * Extract a table name from the question content text.
 * Looks for patterns like "from the 'students' table" or "the employees table".
 */
function extractTableName(content: string): string {
    // Match: 'tableName' table, "tableName" table, the tableName table
    const patterns = [
        /['"](\w+)['"]\s+table/i,
        /\bfrom\s+(?:the\s+)?['"]?(\w+)['"]?(?:\s+table)?/i,
        /\btable\s+['"]?(\w+)['"]?/i,
    ];
    for (const p of patterns) {
        const m = content.match(p);
        if (m?.[1] && !['the', 'a', 'an', 'this', 'that'].includes(m[1].toLowerCase())) {
            return m[1].toLowerCase();
        }
    }
    return 'data';
}

/**
 * Generate a basic setupSQL from the question content when no sampleData exists.
 * Creates a simple table with sample rows so the user can at least run queries.
 */
function generateFallbackSetupSQL(content: string): string {
    const tableName = extractTableName(content);

    // Detect likely columns from the question text
    const contentLower = content.toLowerCase();

    // Common dataset patterns
    if (contentLower.includes('student') || contentLower.includes('marks') || contentLower.includes('grade')) {
        return `CREATE TABLE ${tableName} (id INTEGER, name VARCHAR, age INTEGER, grade VARCHAR, marks INTEGER);
INSERT INTO ${tableName} VALUES (1, 'Alice', 22, 'A', 85);
INSERT INTO ${tableName} VALUES (2, 'Bob', 19, 'B', 72);
INSERT INTO ${tableName} VALUES (3, 'Charlie', 21, 'A', 90);
INSERT INTO ${tableName} VALUES (4, 'Diana', 20, 'C', 65);
INSERT INTO ${tableName} VALUES (5, 'Eve', 23, 'B', 78);`;
    }

    if (contentLower.includes('employee') || contentLower.includes('salary') || contentLower.includes('department')) {
        return `CREATE TABLE ${tableName} (id INTEGER, name VARCHAR, department VARCHAR, salary DOUBLE, hire_date DATE);
INSERT INTO ${tableName} VALUES (1, 'Alice', 'Engineering', 75000, '2020-01-15');
INSERT INTO ${tableName} VALUES (2, 'Bob', 'Marketing', 55000, '2019-06-01');
INSERT INTO ${tableName} VALUES (3, 'Charlie', 'Engineering', 82000, '2018-03-10');
INSERT INTO ${tableName} VALUES (4, 'Diana', 'Sales', 60000, '2021-09-20');
INSERT INTO ${tableName} VALUES (5, 'Eve', 'Marketing', 58000, '2020-11-05');`;
    }

    if (contentLower.includes('sales') || contentLower.includes('revenue') || contentLower.includes('product')) {
        return `CREATE TABLE ${tableName} (id INTEGER, product VARCHAR, category VARCHAR, amount DOUBLE, sale_date DATE);
INSERT INTO ${tableName} VALUES (1, 'Laptop', 'Electronics', 1200, '2024-01-15');
INSERT INTO ${tableName} VALUES (2, 'Phone', 'Electronics', 800, '2024-01-16');
INSERT INTO ${tableName} VALUES (3, 'Desk', 'Furniture', 350, '2024-01-17');
INSERT INTO ${tableName} VALUES (4, 'Chair', 'Furniture', 250, '2024-01-18');
INSERT INTO ${tableName} VALUES (5, 'Tablet', 'Electronics', 500, '2024-01-19');`;
    }

    if (contentLower.includes('order') || contentLower.includes('customer')) {
        return `CREATE TABLE ${tableName} (id INTEGER, customer_name VARCHAR, product VARCHAR, quantity INTEGER, total DOUBLE, order_date DATE);
INSERT INTO ${tableName} VALUES (1, 'Alice', 'Widget A', 5, 50.00, '2024-01-10');
INSERT INTO ${tableName} VALUES (2, 'Bob', 'Widget B', 3, 45.00, '2024-01-12');
INSERT INTO ${tableName} VALUES (3, 'Alice', 'Widget A', 2, 20.00, '2024-01-15');
INSERT INTO ${tableName} VALUES (4, 'Charlie', 'Widget C', 7, 105.00, '2024-01-18');
INSERT INTO ${tableName} VALUES (5, 'Bob', 'Widget A', 1, 10.00, '2024-01-20');`;
    }

    // Generic fallback
    return `CREATE TABLE ${tableName} (id INTEGER, name VARCHAR, value DOUBLE, category VARCHAR);
INSERT INTO ${tableName} VALUES (1, 'Item A', 100, 'X');
INSERT INTO ${tableName} VALUES (2, 'Item B', 200, 'Y');
INSERT INTO ${tableName} VALUES (3, 'Item C', 150, 'X');
INSERT INTO ${tableName} VALUES (4, 'Item D', 300, 'Y');
INSERT INTO ${tableName} VALUES (5, 'Item E', 250, 'X');`;
}

/* ─── Main post-processor ──────────────────────────────────── */

/**
 * Validates and fixes all questions returned by the LLM.
 * Ensures SQL_HANDS_ON questions have setupSQL and
 * EXCEL_HANDS_ON questions have columns/initialData.
 */
export function postProcessQuestions(
    questions: any[],
    opts?: { difficultyFloor?: number; difficultyCeiling?: number }
): any[] {
    return questions.map((q) => {
        const rawType = String(q.type ?? 'MCQ').toUpperCase();
        const type = rawType === 'POWERBI_MCQ' ? 'MCQ' : rawType;
        const rawSkill = String(q.skill ?? '').toUpperCase().replace(/\s+/g, '');
        const normalizedSkill =
            rawSkill === 'POWERBI' ? 'POWERBI' :
                rawSkill === 'EXCEL' ? 'EXCEL' :
                    rawSkill === 'SQL' ? 'SQL' :
                        String(q.skill ?? 'SQL').toUpperCase();
        q.type = type;
        q.skill = normalizedSkill;

        if (type === 'MCQ') {
            if (!Array.isArray(q.options)) q.options = [];
            const normalizedOptions = q.options
                .filter((opt: any) => typeof opt === 'string')
                .map((opt: string) => opt.trim())
                .filter((opt: string) => opt.length > 0);
            const deduped = Array.from(new Set(normalizedOptions)).slice(0, 4);
            while (deduped.length < 4) deduped.push(`Option ${String.fromCharCode(65 + deduped.length)}`);
            q.options = deduped;

            const correct = typeof q.correctAnswer === 'string' ? q.correctAnswer.trim() : '';
            q.correctAnswer = q.options.includes(correct) ? correct : q.options[0];
            // Power BI MCQ stays single-correct in this iteration.
            q.multipleCorrect = false;
        }

        if (type === 'POWERBI_FILL_BLANK') {
            q.skill = 'POWERBI';
            if (typeof q.content !== 'string') q.content = '';
            if (typeof q.solution !== 'string') q.solution = '';
            if (typeof q.blankLabel !== 'string') q.blankLabel = 'Answer';
            if (typeof q.caseSensitive !== 'boolean') q.caseSensitive = false;
            if (!Array.isArray(q.acceptedAnswers)) {
                const fallbackAnswer =
                    typeof q.correctAnswer === 'string' && q.correctAnswer.trim().length > 0
                        ? q.correctAnswer.trim()
                        : '';
                q.acceptedAnswers = fallbackAnswer ? [fallbackAnswer] : [];
            }
            q.acceptedAnswers = Array.from(
                new Set(
                    q.acceptedAnswers
                        .filter((a: any) => typeof a === 'string')
                        .map((a: string) => a.trim())
                        .filter((a: string) => a.length > 0)
                )
            );
            if (q.acceptedAnswers.length === 0 && q.solution.trim().length > 0) {
                q.acceptedAnswers = [q.solution.trim()];
            }
        }

        const difficultyNum = Number(q.difficulty);
        q.difficulty = Number.isFinite(difficultyNum)
            ? Math.max(1, Math.min(10, Math.round(difficultyNum)))
            : 5;
        if (typeof opts?.difficultyFloor === 'number') {
            q.difficulty = Math.max(q.difficulty, Math.round(opts.difficultyFloor));
        }
        if (typeof opts?.difficultyCeiling === 'number') {
            q.difficulty = Math.min(q.difficulty, Math.round(opts.difficultyCeiling));
        }

        if (type === 'SQL_HANDS_ON') {
            // Fix missing setupSQL
            if (!q.setupSQL || q.setupSQL.trim().length === 0) {
                if (q.sampleData?.length > 0) {
                    // Generate from structured sampleData
                    q.setupSQL = sampleDataToSetupSQL(q.sampleData);
                } else {
                    // Generate fallback from question content
                    q.setupSQL = generateFallbackSetupSQL(q.content ?? '');
                }
            }

            // If sampleData is missing, generate it from setupSQL
            if (!q.sampleData || q.sampleData.length === 0) {
                q.sampleData = extractSampleDataFromSQL(q.setupSQL);
            }

            // Ensure expectedOutput exists (empty array as fallback)
            if (!q.expectedOutput) {
                q.expectedOutput = [];
            }
        }

        if (type === 'EXCEL_HANDS_ON') {
            // Ensure required fields exist
            if (!Array.isArray(q.columns)) q.columns = [];
            if (!Array.isArray(q.initialData) || q.initialData.length === 0) q.initialData = [[]];
            if (!Array.isArray(q.editableCells)) q.editableCells = [];
            if (!Array.isArray(q.expectedFormulas)) q.expectedFormulas = [];
            if (!Array.isArray(q.expectedValues)) q.expectedValues = [];

            // Normalize row widths to columns length when possible.
            const width = q.columns.length > 0
                ? q.columns.length
                : Math.max(0, ...q.initialData.map((row: any[]) => Array.isArray(row) ? row.length : 0));
            q.initialData = q.initialData.map((row: any) => {
                const arr = Array.isArray(row) ? row : [];
                if (width <= 0) return arr;
                if (arr.length >= width) return arr.slice(0, width);
                return [...arr, ...Array.from({ length: width - arr.length }, () => null)];
            });

            const height = q.initialData.length;
            const inBounds = (row: number, col: number) =>
                Number.isInteger(row) &&
                Number.isInteger(col) &&
                row >= 0 &&
                col >= 0 &&
                row < height &&
                (q.initialData[row]?.length ?? 0) > col;

            q.editableCells = q.editableCells
                .filter((item: any) => Array.isArray(item) && item.length === 2)
                .map(([row, col]: [any, any]) => [Number(row), Number(col)])
                .filter(([row, col]: [number, number]) => inBounds(row, col));

            q.expectedFormulas = q.expectedFormulas
                .filter((item: any) => item && typeof item === 'object')
                .map((item: any) => ({
                    row: Number(item.row),
                    col: Number(item.col),
                    formulas: Array.isArray(item.formulas) ? item.formulas.filter((f: any) => typeof f === 'string') : [],
                }))
                .filter((item: any) => inBounds(item.row, item.col));

            q.expectedValues = q.expectedValues
                .filter((item: any) => item && typeof item === 'object')
                .map((item: any) => ({
                    row: Number(item.row),
                    col: Number(item.col),
                    value: item.value,
                }))
                .filter((item: any) => inBounds(item.row, item.col));

            if (!q.engineMode) q.engineMode = 'HYPERFORMULA';
            if (typeof q.allowEquivalentFormula !== 'boolean') q.allowEquivalentFormula = true;
            if (typeof q.valueTolerance !== 'number') q.valueTolerance = 0.01;
        }

        if (type === 'SCENARIO_MCQ') {
            q.skill = 'DATA_ANALYTICS';
            if (typeof q.scenario !== 'string' || q.scenario.trim().length === 0) {
                q.scenario = q.content ?? '';
            }
            if (!Array.isArray(q.options)) q.options = [];
            const scenarioOptions = q.options
                .filter((opt: any) => typeof opt === 'string')
                .map((opt: string) => opt.trim())
                .filter((opt: string) => opt.length > 0);
            const scenarioDeduped = Array.from(new Set(scenarioOptions)).slice(0, 4);
            while (scenarioDeduped.length < 4) scenarioDeduped.push(`Option ${String.fromCharCode(65 + scenarioDeduped.length)}`);
            q.options = scenarioDeduped;

            const scenarioCorrect = typeof q.correctAnswer === 'string' ? q.correctAnswer.trim() : '';
            q.correctAnswer = q.options.includes(scenarioCorrect) ? scenarioCorrect : q.options[0];
            q.multipleCorrect = false;
        }

        if (type === 'SCENARIO_SUBJECTIVE') {
            q.skill = 'DATA_ANALYTICS';
            if (typeof q.scenario !== 'string' || q.scenario.trim().length === 0) {
                q.scenario = q.content ?? '';
            }
            if (typeof q.rubric !== 'string' || q.rubric.trim().length === 0) {
                q.rubric = 'Evaluate based on correctness, completeness, and practical reasoning.';
            }
            if (typeof q.sampleAnswer !== 'string' || q.sampleAnswer.trim().length === 0) {
                q.sampleAnswer = q.solution ?? '';
            }
            if (typeof q.maxWords !== 'number' || q.maxWords <= 0) {
                q.maxWords = 200;
            }
        }

        return q;
    });
}


/**
 * Extract simple sampleData from setupSQL for display purposes.
 * Parses CREATE TABLE to get column names and INSERT INTO for rows.
 */
function extractSampleDataFromSQL(
    setupSQL: string
): { tableName: string; rows: Record<string, any>[] }[] {
    const result: { tableName: string; rows: Record<string, any>[] }[] = [];

    // Find CREATE TABLE statements
    const createMatches = setupSQL.matchAll(
        /CREATE\s+TABLE\s+(\w+)\s*\(([^)]+)\)/gi
    );

    for (const cm of createMatches) {
        const tableName = cm[1];
        const colDefs = cm[2].split(',').map((c) => c.trim().split(/\s+/)[0]);
        const rows: Record<string, any>[] = [];

        // Match both single-row and multi-row INSERT statements:
        // INSERT INTO table VALUES (...);
        // INSERT INTO table VALUES (...), (...), (...);
        const escapedTableName = tableName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const insertRegex = new RegExp(
            `INSERT\\s+INTO\\s+${escapedTableName}\\s*(?:\\(([^)]*)\\))?\\s+VALUES\\s*([\\s\\S]*?);`,
            'gi'
        );
        const insertMatches = setupSQL.matchAll(insertRegex);

        for (const im of insertMatches) {
            const explicitColsRaw = im[1];
            const valuesBlock = im[2];
            const tupleCols = explicitColsRaw
                ? splitSqlCsv(explicitColsRaw).map((c) => c.trim().replace(/["'`]/g, ''))
                : colDefs;

            for (const tuple of extractValueTuples(valuesBlock)) {
                const vals = splitSqlCsv(tuple).map(parseSqlLiteral);

                const row: Record<string, any> = {};
                tupleCols.forEach((col, i) => {
                    row[col] = vals[i] ?? null;
                });
                rows.push(row);
            }
        }

        result.push({ tableName, rows });
    }

    return result;
}

function extractValueTuples(valuesBlock: string): string[] {
    const tuples: string[] = [];
    let depth = 0;
    let inQuote = false;
    let current = '';

    for (let i = 0; i < valuesBlock.length; i++) {
        const ch = valuesBlock[i];
        const next = valuesBlock[i + 1];

        if (ch === "'") {
            current += ch;
            // Handle escaped quote in SQL string: ''
            if (inQuote && next === "'") {
                current += next;
                i++;
                continue;
            }
            inQuote = !inQuote;
            continue;
        }

        if (!inQuote) {
            if (ch === '(') {
                depth++;
                // Do not keep outer parens in the stored tuple
                if (depth > 1) current += ch;
                continue;
            }
            if (ch === ')') {
                depth--;
                if (depth === 0) {
                    tuples.push(current.trim());
                    current = '';
                    continue;
                }
                current += ch;
                continue;
            }
        }

        if (depth > 0) current += ch;
    }

    return tuples;
}

function splitSqlCsv(input: string): string[] {
    const out: string[] = [];
    let inQuote = false;
    let token = '';

    for (let i = 0; i < input.length; i++) {
        const ch = input[i];
        const next = input[i + 1];

        if (ch === "'") {
            token += ch;
            if (inQuote && next === "'") {
                token += next;
                i++;
                continue;
            }
            inQuote = !inQuote;
            continue;
        }

        if (ch === ',' && !inQuote) {
            out.push(token.trim());
            token = '';
            continue;
        }

        token += ch;
    }

    if (token.trim().length > 0) out.push(token.trim());
    return out;
}

function parseSqlLiteral(raw: string): string | number | boolean | null {
    const trimmed = raw.trim();
    if (!trimmed) return null;

    if (/^null$/i.test(trimmed)) return null;
    if (/^true$/i.test(trimmed)) return true;
    if (/^false$/i.test(trimmed)) return false;

    if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
        return trimmed.slice(1, -1).replace(/''/g, "'");
    }

    const num = Number(trimmed);
    if (!Number.isNaN(num)) return num;

    return trimmed;
}
