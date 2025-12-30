import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';


ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface WeightChartProps {
  weights: Array<{ date: string; kg: number }>;
  goalKg?: number | null;
}

export default function WeightChart({ weights, goalKg }: WeightChartProps) {
  const sortedWeights = [...weights].sort((a, b) =>
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const datasets = [
    {
       label: 'Weight (kg)',
      data: sortedWeights.map((w) => w.kg),
      borderColor: 'rgb(16, 185, 129)',
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      tension: 0.4,
    },
  ];

  if (goalKg && goalKg > 0) {
    datasets.push({
      label: 'Goal Weight',
      data: sortedWeights.map(() => goalKg),
      borderColor: 'rgb(251, 146, 60)',
      backgroundColor: 'rgba(251, 146, 60, 0.1)',
      tension: 0,
      borderDash: [5, 5],
    });
  }

  const data = {
    labels: sortedWeights.map((w) =>
      new Date(w.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    ),
    datasets,
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: !!(goalKg && goalKg > 0),
        labels: {
          color: 'rgb(161, 161, 170)',
        },
      },
    },
    scales: {
      y: {
        ticks: {
          color: 'rgb(161, 161, 170)',
        },
        grid: {
          color: 'rgba(161, 161, 170, 0.1)',
        },
      },
      x: {
        ticks: {
          color: 'rgb(161, 161, 170)',
        },
        grid: {
          color: 'rgba(161, 161, 170, 0.1)',
        },
      },
    },
  } as const;

  return (
    <div className="chart-wrap">
      <Line data={data} options={options} />
    </div>
  );
}
