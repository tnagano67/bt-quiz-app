import type { GradeAdvancementResult } from "@/lib/grade-logic";

type Props = {
  score: number;
  passed: boolean;
  totalQuestions: number;
  correctCount: number;
  advancement: GradeAdvancementResult | null;
  onGoHome: () => void;
  isRetry: boolean;
};

export default function QuizResult({
  score,
  passed,
  totalQuestions,
  correctCount,
  advancement,
  onGoHome,
  isRetry,
}: Props) {
  return (
    <div className="rounded-xl border-2 border-gray-200 bg-white p-6 text-center shadow-sm">
      <div
        className={`mb-4 text-5xl font-bold ${
          passed ? "text-green-600" : "text-red-600"
        }`}
      >
        {score}%
      </div>

      <p className="mb-1 text-lg font-bold text-gray-900">
        {passed ? "合格！" : "不合格"}
      </p>
      <p className="mb-4 text-sm text-gray-500">
        {totalQuestions}問中 {correctCount}問正解
      </p>

      {!isRetry && advancement && (
        <div className="mb-4 rounded-lg bg-gray-50 p-3 text-sm">
          {advancement.advanced ? (
            <p className="font-bold text-blue-600">
              おめでとうございます！ {advancement.newGrade} に昇級しました！
            </p>
          ) : advancement.isMaxGrade && passed ? (
            <p className="font-bold text-green-600">
              最上級グレードです。引き続き頑張りましょう！
            </p>
          ) : passed ? (
            <p className="text-gray-700">
              連続合格日数：
              <span className="font-bold">{advancement.newStreak}日</span>
            </p>
          ) : (
            <p className="text-red-600">
              連続合格日数がリセットされました。明日また挑戦しましょう！
            </p>
          )}
        </div>
      )}

      {isRetry && (
        <p className="mb-4 text-sm text-gray-500">
          ※ 再受験の結果は保存されません
        </p>
      )}

      <button
        onClick={onGoHome}
        className="rounded-lg bg-blue-600 px-6 py-2.5 font-bold text-white transition-colors hover:bg-blue-700"
      >
        ホームに戻る
      </button>
    </div>
  );
}
