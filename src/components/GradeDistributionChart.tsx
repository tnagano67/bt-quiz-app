"use client";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip);

type Props = {
  data: { gradeName: string; count: number }[];
};

export default function GradeDistributionChart({ data }: Props) {
  const chartData = {
    labels: data.map((d) => d.gradeName),
    datasets: [
      {
        label: "生徒数",
        data: data.map((d) => d.count),
        backgroundColor: "#0d9488",
        borderColor: "#0d9488",
        borderWidth: 1,
        borderRadius: 4,
        maxBarThickness: 28,
      },
    ],
  };

  const options = {
    indexAxis: "y" as const,
    responsive: true,
    plugins: {
      legend: { display: false },
    },
    scales: {
      x: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
          precision: 0,
        },
        title: { display: true, text: "人数" },
      },
      y: {
        title: { display: false },
      },
    },
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-bold text-gray-700">グレード分布</h3>
      {data.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-400">
          データがありません
        </p>
      ) : (
        <Bar data={chartData} options={options} />
      )}
    </div>
  );
}
