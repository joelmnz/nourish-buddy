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
}

export default function WeightChart({ weights }: WeightChartProps) {
  const sortedWeights = [...weights].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const data = {
    labels: sortedWeights.map((w) =>
      new Date(w.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    ),
    datasets: [
      {
         label: 'Weight (kg)',
        data: sortedWeights.map((w) => w.kg),
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
