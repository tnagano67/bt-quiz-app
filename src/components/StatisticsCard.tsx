type Props = {
  totalAttempts: number;
  averageScore: number;
  highestScore: number;
  passRate: number;
};

export default function StatisticsCard({
  totalAttempts,
  averageScore,
  highestScore,
  passRate,
}: Props) {
  const items = [
    { label: "総受験回数", value: `${totalAttempts}回` },
    { label: "平均点", value: `${averageScore}点` },
    { label: "最高点", value: `${highestScore}点` },
    { label: "合格率", value: `${passRate}%` },
  ];

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-bold text-gray-700">
        直近30日間の統計
      </h3>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {items.map(({ label, value }) => (
          <div key={label} className="text-center">
            <p className="text-xs text-gray-500">{label}</p>
            <p className="mt-1 text-xl font-bold text-gray-800">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
