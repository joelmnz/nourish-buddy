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

interface MealStatsChartProps {
  stats: Array<{ mealName: string; averageSize: number }>;
}

export default function MealStatsChart({ stats }: MealStatsChartProps) {
  const data = {
    labels: stats.map((s) => s.mealName),
    datasets: [
      {
        label: '14-Day Average',
        data: stats.map((s) => s.averageSize),
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
    },
    scales: {
      y: {
        min: 0,
        max: 5,
        ticks: {
          stepSize: 1,
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
