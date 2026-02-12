"use client";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { formatDateShort } from "@/lib/date-utils";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

type ScoreEntry = {
  date: string;
  score: number | null;
  passed: boolean | null;
};

type Props = {
  scores: ScoreEntry[];
};

export default function ScoreChart({ scores }: Props) {
  // 古い順に並べる（チャート表示用）
  const reversed = [...scores].reverse();

  const labels = reversed.map((e) => formatDateShort(e.date));

  const passedData = reversed.map((e) =>
    e.passed === true ? e.score : null
  );
  const failedData = reversed.map((e) =>
    e.passed === false ? e.score : null
  );

  const data = {
    labels,
    datasets: [
      {
        label: "合格",
        data: passedData,
        backgroundColor: "#28a745",
        borderColor: "#28a745",
        borderWidth: 1,
        borderRadius: 4,
        maxBarThickness: 20,
      },
      {
        label: "不合格",
        data: failedData,
        backgroundColor: "#dc3545",
        borderColor: "#dc3545",
        borderWidth: 1,
        borderRadius: 4,
        maxBarThickness: 20,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: "top" as const,
        labels: { padding: 20 },
      },
    },
    scales: {
      y: {
        min: 0,
        max: 100,
        title: { display: true, text: "スコア（%）" },
      },
      x: {
        title: { display: true, text: "日付" },
      },
    },
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-bold text-gray-700">
        直近10日間の成績
      </h3>
      <Bar data={data} options={options} />
    </div>
  );
}
