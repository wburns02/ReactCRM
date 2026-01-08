/**
 * Survey Preview Component
 *
 * Live preview of survey:
 * - Mobile/Desktop toggle
 * - Shows exactly how customer will see it
 * - Test submission mode
 */

import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils.ts';
import type { SurveyQuestion } from './SurveyBuilder.tsx';

// ============================================
// Types
// ============================================

type ViewMode = 'desktop' | 'tablet' | 'mobile';

export interface SurveyPreviewProps {
  surveyName: string;
  questions: SurveyQuestion[];
  onClose: () => void;
  onSubmitTest?: (responses: Record<string, unknown>) => void;
  brandColor?: string;
  logoUrl?: string;
}

interface QuestionPreviewProps {
  question: SurveyQuestion;
  questionNumber: number;
  value: unknown;
  onChange: (value: unknown) => void;
}

// ============================================
// Question Preview Components
// ============================================

function RatingPreview({
  question: _question,
  value,
  onChange,
}: {
  question: SurveyQuestion;
  value: number | null;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          onClick={() => onChange(star)}
          className={cn(
            'p-1 transition-colors',
            (value ?? 0) >= star ? 'text-yellow-400' : 'text-gray-300 hover:text-yellow-200'
          )}
        >
          <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
          </svg>
        </button>
      ))}
    </div>
  );
}

function ScalePreview({
  question,
  value,
  onChange,
}: {
  question: SurveyQuestion;
  value: number | null;
  onChange: (v: number) => void;
}) {
  const min = question.scale_min ?? 0;
  const max = question.scale_max ?? 10;
  const options = Array.from({ length: max - min + 1 }, (_, i) => min + i);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        {options.map((num) => (
          <button
            key={num}
            onClick={() => onChange(num)}
            className={cn(
              'w-10 h-10 rounded-lg font-medium transition-all',
              value === num
                ? 'bg-primary text-white shadow-md scale-110'
                : 'bg-bg-hover text-text-secondary hover:bg-bg-tertiary'
            )}
          >
            {num}
          </button>
        ))}
      </div>
      {question.scale_labels && (
        <div className="flex justify-between text-xs text-text-muted mt-2">
          <span>{question.scale_labels.min}</span>
          <span>{question.scale_labels.max}</span>
        </div>
      )}
    </div>
  );
}

function TextPreview({
  question,
  value,
  onChange,
}: {
  question: SurveyQuestion;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={question.placeholder || 'Enter your response...'}
      maxLength={question.max_length}
      className="w-full px-4 py-3 border border-border rounded-lg bg-bg-primary text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary resize-none"
      rows={4}
    />
  );
}

function MultipleChoicePreview({
  question,
  value,
  onChange,
}: {
  question: SurveyQuestion;
  value: string[];
  onChange: (v: string[]) => void;
}) {
  return (
    <div className="space-y-2">
      {(question.options || []).map((option, idx) => (
        <label
          key={idx}
          onClick={() => {
            if (value.includes(option)) {
              onChange(value.filter((v) => v !== option));
            } else {
              onChange([...value, option]);
            }
          }}
          className={cn(
            'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
            value.includes(option)
              ? 'border-primary bg-primary/5'
              : 'border-border hover:bg-bg-hover'
          )}
        >
          <div
            className={cn(
              'w-5 h-5 rounded border-2 flex items-center justify-center transition-colors',
              value.includes(option)
                ? 'bg-primary border-primary'
                : 'border-border'
            )}
          >
            {value.includes(option) && (
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
          <span className="text-text-primary">{option}</span>
        </label>
      ))}
    </div>
  );
}

function SingleChoicePreview({
  question,
  value,
  onChange,
}: {
  question: SurveyQuestion;
  value: string | null;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      {(question.options || []).map((option, idx) => (
        <label
          key={idx}
          onClick={() => onChange(option)}
          className={cn(
            'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
            value === option
              ? 'border-primary bg-primary/5'
              : 'border-border hover:bg-bg-hover'
          )}
        >
          <div
            className={cn(
              'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors',
              value === option
                ? 'border-primary'
                : 'border-border'
            )}
          >
            {value === option && (
              <div className="w-2.5 h-2.5 rounded-full bg-primary" />
            )}
          </div>
          <span className="text-text-primary">{option}</span>
        </label>
      ))}
    </div>
  );
}

// ============================================
// Question Preview Wrapper
// ============================================

function QuestionPreview({
  question,
  questionNumber,
  value,
  onChange,
}: QuestionPreviewProps) {
  return (
    <div className="mb-8">
      <div className="flex items-start gap-3 mb-4">
        <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold flex items-center justify-center text-sm">
          {questionNumber}
        </span>
        <div>
          <h3 className="font-medium text-text-primary">
            {question.text || 'Untitled Question'}
            {question.required && <span className="text-danger ml-1">*</span>}
          </h3>
        </div>
      </div>

      <div className="ml-11">
        {question.type === 'rating' && (
          <RatingPreview
            question={question}
            value={value as number | null}
            onChange={onChange as (v: number) => void}
          />
        )}
        {question.type === 'scale' && (
          <ScalePreview
            question={question}
            value={value as number | null}
            onChange={onChange as (v: number) => void}
          />
        )}
        {question.type === 'text' && (
          <TextPreview
            question={question}
            value={(value as string) || ''}
            onChange={onChange as (v: string) => void}
          />
        )}
        {question.type === 'multiple_choice' && (
          <MultipleChoicePreview
            question={question}
            value={(value as string[]) || []}
            onChange={onChange as (v: string[]) => void}
          />
        )}
        {question.type === 'single_choice' && (
          <SingleChoicePreview
            question={question}
            value={value as string | null}
            onChange={onChange as (v: string) => void}
          />
        )}
      </div>
    </div>
  );
}

// ============================================
// Device Frame Component
// ============================================

function DeviceFrame({
  mode,
  children,
}: {
  mode: ViewMode;
  children: React.ReactNode;
}) {
  const frameClasses: Record<ViewMode, string> = {
    desktop: 'w-full max-w-2xl',
    tablet: 'w-full max-w-md',
    mobile: 'w-full max-w-sm',
  };

  return (
    <div className={cn('mx-auto', frameClasses[mode])}>
      {mode !== 'desktop' && (
        <div className="bg-gray-800 rounded-t-3xl pt-6 pb-2 px-6">
          <div className="flex items-center justify-center gap-2">
            <div className="w-16 h-4 bg-gray-700 rounded-full" />
          </div>
        </div>
      )}
      <div
        className={cn(
          'bg-white overflow-hidden',
          mode === 'desktop' && 'rounded-xl shadow-2xl',
          mode !== 'desktop' && 'rounded-b-3xl shadow-2xl border-x-4 border-b-4 border-gray-800'
        )}
      >
        {children}
      </div>
    </div>
  );
}

// ============================================
// Progress Bar Component
// ============================================

function ProgressBar({ current, total }: { current: number; total: number }) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-white/70">
        <span>{current} of {total} completed</span>
        <span>{percentage}%</span>
      </div>
      <div className="h-2 bg-white/20 rounded-full overflow-hidden">
        <div
          className="h-full bg-white transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// ============================================
// Main Component
// ============================================

export function SurveyPreview({
  surveyName,
  questions,
  onClose,
  onSubmitTest,
  brandColor = '#4F46E5',
  logoUrl,
}: SurveyPreviewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('desktop');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, unknown>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [testMode, setTestMode] = useState(true);
  const [showAllQuestions, setShowAllQuestions] = useState(false);

  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  const answeredCount = Object.keys(responses).filter(k => {
    const val = responses[k];
    return val !== undefined && val !== null && val !== '' && !(Array.isArray(val) && val.length === 0);
  }).length;

  const canProceed = useMemo(() => {
    if (!currentQuestion) return false;
    if (!currentQuestion.required) return true;
    const response = responses[currentQuestion.id];
    if (response === undefined || response === null || response === '') return false;
    if (Array.isArray(response) && response.length === 0) return false;
    return true;
  }, [currentQuestion, responses]);

  const isComplete = useMemo(() => {
    return questions
      .filter((q) => q.required)
      .every((q) => {
        const response = responses[q.id];
        if (response === undefined || response === null) return false;
        if (Array.isArray(response)) return response.length > 0;
        if (typeof response === 'string') return response.trim().length > 0;
        return true;
      });
  }, [questions, responses]);

  const handleResponseChange = (questionId: string, value: unknown) => {
    setResponses((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const handleNext = () => {
    if (showAllQuestions) {
      setIsSubmitted(true);
      onSubmitTest?.(responses);
    } else if (isLastQuestion) {
      setIsSubmitted(true);
      onSubmitTest?.(responses);
    } else {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  };

  const handleReset = () => {
    setCurrentQuestionIndex(0);
    setResponses({});
    setIsSubmitted(false);
  };

  if (questions.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-bg-card rounded-xl p-8 max-w-md text-center">
          <svg className="w-16 h-16 text-text-muted mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M12 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-medium text-text-primary mb-2">No Questions to Preview</h3>
          <p className="text-text-muted mb-4">Add some questions to see how your survey will look.</p>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark"
          >
            Close Preview
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-gray-900/95 overflow-auto">
      {/* Header */}
      <div className="sticky top-0 bg-gray-800/90 backdrop-blur-sm border-b border-gray-700 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <div>
                <h2 className="text-white font-medium">{surveyName}</h2>
                <p className="text-sm text-gray-400">Preview Mode</p>
              </div>
            </div>

            {/* View Mode Selector */}
            <div className="flex items-center gap-2 bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setViewMode('desktop')}
                className={cn(
                  'p-2 rounded transition-colors',
                  viewMode === 'desktop' ? 'bg-gray-600 text-white' : 'text-gray-400 hover:text-white'
                )}
                title="Desktop view"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('tablet')}
                className={cn(
                  'p-2 rounded transition-colors',
                  viewMode === 'tablet' ? 'bg-gray-600 text-white' : 'text-gray-400 hover:text-white'
                )}
                title="Tablet view"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('mobile')}
                className={cn(
                  'p-2 rounded transition-colors',
                  viewMode === 'mobile' ? 'bg-gray-600 text-white' : 'text-gray-400 hover:text-white'
                )}
                title="Mobile view"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </button>
            </div>

            {/* Options */}
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showAllQuestions}
                  onChange={(e) => setShowAllQuestions(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-600 text-primary focus:ring-primary bg-gray-700"
                />
                Show All Questions
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={testMode}
                  onChange={(e) => setTestMode(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-600 text-primary focus:ring-primary bg-gray-700"
                />
                Test Mode
              </label>
              {testMode && (
                <button
                  onClick={handleReset}
                  className="px-3 py-1.5 text-sm text-gray-400 hover:text-white border border-gray-600 rounded-lg hover:border-gray-500 transition-colors"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Preview Area */}
      <div className="py-12 px-4">
        <DeviceFrame mode={viewMode}>
          {/* Survey Content */}
          <div className="min-h-[500px] flex flex-col">
            {/* Survey Header */}
            <div
              className="p-6 text-white"
              style={{ backgroundColor: brandColor }}
            >
              {logoUrl && (
                <img src={logoUrl} alt="Logo" className="h-8 mb-4" />
              )}
              <h1 className="text-xl font-semibold">{surveyName}</h1>
              {!isSubmitted && (
                <div className="mt-4">
                  <ProgressBar current={answeredCount} total={questions.length} />
                </div>
              )}
            </div>

            {/* Survey Body */}
            <div className="flex-1 p-6 bg-white">
              {isSubmitted ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">Thank You!</h2>
                  <p className="text-gray-600 mb-6">Your feedback has been submitted successfully.</p>

                  {testMode && (
                    <div className="mt-6 p-4 bg-gray-50 rounded-lg text-left">
                      <h3 className="font-medium text-gray-700 mb-2">Test Submission Data:</h3>
                      <pre className="text-xs text-gray-600 overflow-auto max-h-40">
                        {JSON.stringify(responses, null, 2)}
                      </pre>
                    </div>
                  )}

                  <button
                    onClick={handleReset}
                    className="mt-6 px-4 py-2 text-sm font-medium text-primary hover:underline"
                  >
                    Preview Again
                  </button>
                </div>
              ) : showAllQuestions ? (
                // Show all questions mode
                <div className="space-y-6">
                  {questions.map((question, idx) => (
                    <QuestionPreview
                      key={question.id}
                      question={question}
                      questionNumber={idx + 1}
                      value={responses[question.id]}
                      onChange={(value) => handleResponseChange(question.id, value)}
                    />
                  ))}
                </div>
              ) : (
                // One question at a time mode
                currentQuestion && (
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">
                      Question {currentQuestionIndex + 1} of {questions.length}
                    </p>
                    <QuestionPreview
                      question={currentQuestion}
                      questionNumber={currentQuestionIndex + 1}
                      value={responses[currentQuestion.id]}
                      onChange={(value) => handleResponseChange(currentQuestion.id, value)}
                    />
                  </div>
                )
              )}
            </div>

            {/* Survey Footer */}
            {!isSubmitted && (
              <div className="p-6 border-t border-gray-100 bg-white flex items-center justify-between">
                {!showAllQuestions ? (
                  <>
                    <button
                      onClick={handleBack}
                      disabled={currentQuestionIndex === 0}
                      className={cn(
                        'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                        currentQuestionIndex === 0
                          ? 'text-gray-300 cursor-not-allowed'
                          : 'text-gray-600 hover:bg-gray-100'
                      )}
                    >
                      Back
                    </button>

                    <button
                      onClick={handleNext}
                      disabled={!canProceed && testMode}
                      className={cn(
                        'px-6 py-2 text-sm font-medium rounded-lg transition-colors text-white',
                        canProceed || !testMode
                          ? 'hover:opacity-90'
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      )}
                      style={canProceed || !testMode ? { backgroundColor: brandColor } : { backgroundColor: undefined }}
                    >
                      {isLastQuestion ? 'Submit' : 'Next'}
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-gray-500">
                      {answeredCount} of {questions.length} answered
                    </p>
                    <button
                      onClick={handleNext}
                      disabled={!isComplete && testMode}
                      className={cn(
                        'px-6 py-2 text-sm font-medium rounded-lg transition-colors text-white',
                        isComplete || !testMode
                          ? 'hover:opacity-90'
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      )}
                      style={isComplete || !testMode ? { backgroundColor: brandColor } : { backgroundColor: undefined }}
                    >
                      Submit Survey
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </DeviceFrame>
      </div>

      {/* Test Mode Banner */}
      {testMode && (
        <div className="fixed bottom-0 inset-x-0 bg-yellow-500 text-yellow-900 py-2 text-center text-sm font-medium">
          Test Mode Active - Responses will not be saved
        </div>
      )}
    </div>
  );
}

export default SurveyPreview;
