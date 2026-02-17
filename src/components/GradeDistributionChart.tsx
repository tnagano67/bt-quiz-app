"use client";

import { useMemo } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  type TooltipItem,
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip);

type Props = {
  data: { gradeName: string; percentage: number }[];
};

const options = {
  indexAxis: "y" as const,
  responsive: true,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (context: TooltipItem<"bar">) => `${context.parsed.x ?? 0}%`,
      },
    },
  },
  scales: {
    x: {
      beginAtZero: true,
      max: 100,
      ticks: {
        callback: (value: string | number) => `${value}%`,
      },
      title: { display: true, text: "割合（%）" },
    },
    y: {
      title: { display: false },
    },
  },
};

export default function GradeDistributionChart({ data }: Props) {
  const chartData = useMemo(() => ({
    labels: data.map((d) => d.gradeName),
    datasets: [
      {
        label: "割合（%）",
        data: data.map((d) => d.percentage),
        backgroundColor: "#0d9488",
        borderColor: "#0d9488",
        borderWidth: 1,
        borderRadius: 4,
        maxBarThickness: 28,
      },
    ],
  }), [data]);

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
