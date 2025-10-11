import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface MealsByDayBarProps {
  totals: Array<{ date: string; total: number }>;
}

export default function MealsByDayBar({ totals }: MealsByDayBarProps) {
  const sorted = [...totals].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const data = {
    labels: sorted.map((d) =>
      new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    ),
    datasets: [
      {
        label: 'Total meal size',
        data: sorted.map((d) => d.total),
        backgroundColor: 'rgba(16, 185, 129, 0.6)',
        borderColor: 'rgb(16, 185, 129)',
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: {
        min: 0,
        ticks: { stepSize: 1, color: 'rgb(161, 161, 170)' },
        grid: { color: 'rgba(161, 161, 170, 0.1)' },
      },
      x: {
        ticks: { color: 'rgb(161, 161, 170)' },
        grid: { color: 'rgba(161, 161, 170, 0.1)' },
      },
    },
  } as const;

  return (
    <div className="chart-wrap">
      <Bar data={data} options={options} />
    </div>
  );
}
