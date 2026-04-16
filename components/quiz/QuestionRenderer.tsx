'use client';

import dynamic from 'next/dynamic';
import MCQQuestion from './MCQQuestion';
import type { MCQQuestionData } from './MCQQuestion';
import type { SQLQuestionData, SQLResult } from './SQLEditor';
import type { ExcelQuestionData, ExcelResult } from './ExcelGrid';
import PowerBIFillBlankQuestion, {
  type PowerBIFillBlankQuestionData,
} from './PowerBIFillBlankQuestion';
import ScenarioSubjectiveQuestion, {
  type ScenarioSubjectiveData,
} from './ScenarioSubjectiveQuestion';

const SQLEditor = dynamic(() => import('./SQLEditor'), {
  ssr: false,
  loading: () => (
    <div style={{ padding: '2rem', textAlign: 'center', color: '#a5b4fc' }}>
      Loading SQL Editor...
    </div>
  ),
});

const ExcelGrid = dynamic(() => import('./ExcelGrid'), {
  ssr: false,
  loading: () => (
    <div style={{ padding: '2rem', textAlign: 'center', color: '#10b981' }}>
      Loading Spreadsheet...
    </div>
  ),
});

export type QuestionData =
  | MCQQuestionData
  | SQLQuestionData
  | ExcelQuestionData
  | PowerBIFillBlankQuestionData
  | ScenarioSubjectiveData
  | (MCQQuestionData & { type: 'SCENARIO_MCQ'; scenario?: string });

export type QuestionResult = {
  questionIndex: number;
  isCorrect: boolean | null;
  userAnswer: string;
  correctAnswer: string;
  explanation: string;
  confidence?: number;
  type: string;
};

interface QuestionRendererProps {
  question: any;
  questionIndex: number;
  onAnswer: (result: QuestionResult) => void;
  result: QuestionResult | null;
  disabled: boolean;
  confidence?: number;
  footer?: React.ReactNode;
}

export default function QuestionRenderer({
  question,
  questionIndex,
  onAnswer,
  result,
  disabled,
  footer,
}: QuestionRendererProps) {
  const questionType = (question.type ?? 'MCQ').toUpperCase();

  switch (questionType) {
    case 'MCQ':
      return (
        <MCQQuestion
          question={question as MCQQuestionData}
          onAnswer={(answer) => {
            const isCorrect = question.correctAnswer !== undefined && question.correctAnswer !== null
              ? String(answer).trim().toLowerCase() === String(question.correctAnswer ?? '').trim().toLowerCase()
              : null;
            onAnswer({
              questionIndex,
              isCorrect,
              userAnswer: answer,
              correctAnswer: question.correctAnswer ?? '',
              explanation: question.solution ?? '',
              type: 'MCQ',
            });
          }}
          result={
            result
              ? {
                  userAnswer: result.userAnswer,
                  isCorrect: result.isCorrect,
                  correctAnswer: result.correctAnswer,
                  explanation: result.explanation,
                }
              : null
          }
          selectedAnswer={result?.userAnswer ?? null}
          disabled={disabled || !!result}
          footer={footer}
        />
      );

    case 'SQL_HANDS_ON':
      return (
        <SQLEditor
          question={question as SQLQuestionData}
          onSubmit={(sqlResult: SQLResult) => {
            onAnswer({
              questionIndex,
              isCorrect: sqlResult.isCorrect,
              userAnswer: sqlResult.userQuery,
              correctAnswer: question.solution ?? '',
              explanation: sqlResult.explanation,
              type: 'SQL_HANDS_ON',
            });
          }}
          result={
            result
              ? {
                  isCorrect: result.isCorrect ?? false,
                  userQuery: result.userAnswer,
                  explanation: result.explanation,
                }
              : null
          }
          disabled={disabled || !!result}
        />
      );

    case 'EXCEL_HANDS_ON':
      return (
        <ExcelGrid
          question={question as ExcelQuestionData}
          onSubmit={(excelResult: ExcelResult) => {
            onAnswer({
              questionIndex,
              isCorrect: excelResult.isCorrect,
              userAnswer: JSON.stringify(excelResult.userValues),
              correctAnswer: question.solution ?? '',
              explanation: excelResult.explanation,
              type: 'EXCEL_HANDS_ON',
            });
          }}
          result={
            result
              ? {
                  isCorrect: result.isCorrect ?? false,
                  userValues: (() => {
                    try {
                      return JSON.parse(result.userAnswer);
                    } catch {
                      return {};
                    }
                  })(),
                  explanation: result.explanation,
                }
              : null
          }
          disabled={disabled || !!result}
        />
      );

    case 'POWERBI_FILL_BLANK':
      return (
        <PowerBIFillBlankQuestion
          question={question as PowerBIFillBlankQuestionData}
          onSubmit={(answer) => {
            onAnswer({
              questionIndex,
              isCorrect: null,
              userAnswer: answer,
              correctAnswer: '',
              explanation: question.solution ?? '',
              type: 'POWERBI_FILL_BLANK',
            });
          }}
          result={result ? { userAnswer: result.userAnswer } : null}
          disabled={disabled || !!result}
          footer={footer}
        />
      );

    case 'SCENARIO_MCQ':
      return (
        <div>
          {/* Scenario badge */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.25rem',
            }}
          >
            <span
              style={{
                padding: '5px 14px',
                borderRadius: '20px',
                background: 'rgba(245, 158, 11, 0.12)',
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                color: '#f59e0b',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              🎯 Scenario · MCQ
            </span>
            <span
              style={{
                padding: '4px 12px',
                borderRadius: '20px',
                background: 'var(--subtle-bg)',
                fontSize: '0.7rem',
                color: 'var(--text-muted)',
                letterSpacing: '0.5px',
              }}
            >
              Difficulty {question.difficulty ?? 5}/10
            </span>
          </div>

          {/* Scenario context card */}
          {question.scenario && (
            <div
              style={{
                padding: '1rem 1.25rem',
                borderRadius: '12px',
                background:
                  'linear-gradient(135deg, rgba(245, 158, 11, 0.06), rgba(99, 102, 241, 0.03))',
                border: '1px solid rgba(245, 158, 11, 0.15)',
                marginBottom: '1.5rem',
                fontSize: '0.9rem',
                lineHeight: '1.7',
                color: 'var(--text-primary)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginBottom: '8px',
                  fontSize: '0.75rem',
                  color: '#fbbf24',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                📋 Scenario Context
              </div>
              {question.scenario}
            </div>
          )}

          {/* Render as MCQ */}
          <MCQQuestion
            question={{ ...question, type: 'MCQ' } as MCQQuestionData}
            onAnswer={(answer) => {
              const isCorrect =
                question.correctAnswer !== undefined &&
                question.correctAnswer !== null
                  ? String(answer).trim().toLowerCase() ===
                    String(question.correctAnswer ?? '').trim().toLowerCase()
                  : null;
              onAnswer({
                questionIndex,
                isCorrect,
                userAnswer: answer,
                correctAnswer: question.correctAnswer ?? '',
                explanation: question.solution ?? '',
                type: 'SCENARIO_MCQ',
              });
            }}
            result={
              result
                ? {
                    userAnswer: result.userAnswer,
                    isCorrect: result.isCorrect,
                    correctAnswer: result.correctAnswer,
                    explanation: result.explanation,
                  }
                : null
            }
            selectedAnswer={result?.userAnswer ?? null}
            disabled={disabled || !!result}
            footer={footer}
          />
        </div>
      );

    case 'SCENARIO_SUBJECTIVE':
      return (
        <ScenarioSubjectiveQuestion
          question={question as ScenarioSubjectiveData}
          onSubmit={(answer) => {
            onAnswer({
              questionIndex,
              isCorrect: null, // graded server-side by LLM at completion
              userAnswer: answer,
              correctAnswer: question.sampleAnswer ?? '',
              explanation: question.rubric ?? '',
              type: 'SCENARIO_SUBJECTIVE',
            });
          }}
          result={
            result
              ? {
                  userAnswer: result.userAnswer,
                }
              : null
          }
          disabled={disabled || !!result}
          footer={footer}
        />
      );

    default:
      return (
        <MCQQuestion
          question={{ ...question, type: 'MCQ', options: question.options ?? [] }}
          onAnswer={(answer) => {
            const isCorrect = question.correctAnswer !== undefined && question.correctAnswer !== null
              ? String(answer).trim().toLowerCase() === String(question.correctAnswer ?? '').trim().toLowerCase()
              : null;
            onAnswer({
              questionIndex,
              isCorrect,
              userAnswer: answer,
              correctAnswer: question.correctAnswer ?? '',
              explanation: question.solution ?? '',
              type: 'MCQ',
            });
          }}
          result={
            result
              ? {
                  userAnswer: result.userAnswer,
                  isCorrect: result.isCorrect,
                  correctAnswer: result.correctAnswer,
                  explanation: result.explanation,
                }
              : null
          }
          selectedAnswer={result?.userAnswer ?? null}
          disabled={disabled || !!result}
          footer={footer}
        />
      );
  }
}
