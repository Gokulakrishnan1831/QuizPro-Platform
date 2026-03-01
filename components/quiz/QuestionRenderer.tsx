'use client';

import dynamic from 'next/dynamic';
import MCQQuestion from './MCQQuestion';
import type { MCQQuestionData } from './MCQQuestion';
import type { SQLQuestionData, SQLResult } from './SQLEditor';
import type { ExcelQuestionData, ExcelResult } from './ExcelGrid';
import PowerBIFillBlankQuestion, {
  type PowerBIFillBlankQuestionData,
} from './PowerBIFillBlankQuestion';

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
  | PowerBIFillBlankQuestionData;

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
