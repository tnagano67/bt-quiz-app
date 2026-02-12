import type { ShuffledChoice } from "@/lib/quiz-logic";

type Props = {
  index: number;
  questionText: string;
  choices: ShuffledChoice[];
  selectedAnswer: number | null;
  onAnswer: (originalIndex: number) => void;
  disabled: boolean;
  // 結果表示用（送信後）
  result?: {
    correct: boolean;
    correctAnswer: number;
  };
};

export default function QuizQuestion({
  index,
  questionText,
  choices,
  selectedAnswer,
  onAnswer,
  disabled,
  result,
}: Props) {
  return (
    <div
      className={`rounded-lg border-2 p-4 ${
        result
          ? result.correct
            ? "border-green-300 bg-green-50"
            : "border-red-300 bg-red-50"
          : "border-gray-200 bg-white"
      }`}
    >
      <p className="mb-3 font-medium text-gray-900">
        <span className="mr-2 text-blue-600">Q{index + 1}.</span>
        {questionText}
      </p>

      <div className="flex flex-col gap-2">
        {choices.map((choice, i) => {
          const isSelected = selectedAnswer === choice.originalIndex;
          const isCorrectChoice = result && choice.originalIndex === result.correctAnswer;
          const isWrongSelected = result && isSelected && !result.correct;

          return (
            <label
              key={i}
              className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-2.5 text-sm transition-colors ${
                disabled ? "cursor-default" : "hover:bg-gray-50"
              } ${
                isCorrectChoice
                  ? "border-green-400 bg-green-100 font-bold text-green-800"
                  : isWrongSelected
                    ? "border-red-400 bg-red-100 text-red-800"
                    : isSelected
                      ? "border-blue-400 bg-blue-50 text-gray-900"
                      : "border-gray-200 text-gray-900"
              }`}
            >
              <input
                type="radio"
                name={`question-${index}`}
                checked={isSelected}
                onChange={() => onAnswer(choice.originalIndex)}
                disabled={disabled}
                className="h-4 w-4 accent-blue-600"
              />
              {choice.text}
            </label>
          );
        })}
      </div>

      {result && (
        <p
          className={`mt-2 text-sm font-bold ${
            result.correct ? "text-green-600" : "text-red-600"
          }`}
        >
          {result.correct ? "正解！" : "不正解"}
        </p>
      )}
    </div>
  );
}
