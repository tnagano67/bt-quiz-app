"use client";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { formatDateShort } from "@/lib/format-date";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler
);

type Props = {
  data: { date: string; rate: number | null }[];
};

export default function PassRateTrendChart({ data }: Props) {
  const chartData = {
    labels: data.map((d) => formatDateShort(d.date)),
    datasets: [
      {
        label: "合格率（%）",
        data: data.map((d) => d.rate),
        borderColor: "#0d9488",
        backgroundColor: "rgba(13, 148, 136, 0.1)",
        fill: true,
        tension: 0.3,
        pointRadius: 2,
        pointHoverRadius: 5,
        spanGaps: false,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { display: false },
    },
    scales: {
      y: {
        min: 0,
        max: 100,
        title: { display: true, text: "合格率（%）" },
      },
      x: {
        title: { display: false },
        ticks: { maxTicksLimit: 10 },
      },
    },
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-bold text-gray-700">
        合格率推移（直近30日）
      </h3>
      <Line data={chartData} options={options} />
    </div>
  );
}
