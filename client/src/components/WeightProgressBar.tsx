interface WeightProgressBarProps {
  currentWeight: number;
  goalKg: number;
  weights: Array<{ date: string; kg: number }>;
}

export default function WeightProgressBar({ currentWeight, goalKg, weights }: WeightProgressBarProps) {
  const progressPercentage = Math.min(100, Math.max(0, (currentWeight / goalKg) * 100));
  const isAtGoal = Math.abs(currentWeight - goalKg) < 0.5;
  const isOverGoal = currentWeight > goalKg;

  const calculateWeeksToGoal = (): number | null => {
    if (weights.length < 2 || isAtGoal) return null;

    const sortedWeights = [...weights].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Calculate average weight change per week
    const firstWeight = sortedWeights[0];
    const lastWeight = sortedWeights[sortedWeights.length - 1];
    const daysDiff = (new Date(lastWeight.date).getTime() - new Date(firstWeight.date).getTime()) / (1000 * 60 * 60 * 24);
    const weeksDiff = daysDiff / 7;

    if (weeksDiff < 0.5) return null; // Not enough time has passed

    const weightChange = lastWeight.kg - firstWeight.kg;
    const weightChangePerWeek = weightChange / weeksDiff;

    // Check if trend is going in the right direction
    const targetDirection = goalKg < currentWeight ? -1 : 1; // negative if losing weight, positive if gaining
    const trendDirection = weightChangePerWeek < 0 ? -1 : 1;

    if (trendDirection !== targetDirection || Math.abs(weightChangePerWeek) < 0.01) {
      return null; // Trend is going wrong direction or too slow
    }

    const remainingWeight = Math.abs(goalKg - currentWeight);
    const weeksToGoal = remainingWeight / Math.abs(weightChangePerWeek);

    return Math.round(weeksToGoal);
  };

  const getStatusMessage = () => {
    if (isAtGoal) return '🎉 Goal achieved!';

    const weeksToGoal = calculateWeeksToGoal();
    const remainingKg = (isOverGoal ? currentWeight - goalKg : goalKg - currentWeight).toFixed(1);
    const baseMessage = isOverGoal ? `${remainingKg} kg over goal` : `${remainingKg} kg to goal`;

    if (weeksToGoal && weeksToGoal > 0 && weeksToGoal < 200) {
      return `${baseMessage} (~${weeksToGoal} ${weeksToGoal === 1 ? 'week' : 'weeks'})`;
    }

    return baseMessage;
  };

  const getProgressBarColor = () => {
    if (isAtGoal) return 'rgb(74, 222, 128)';
    if (isOverGoal) return 'rgb(251, 146, 60)';
    return 'rgb(16, 185, 129)';
  };

  return (
    <div className="mt-4">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <div className="text-sm text-muted">{progressPercentage.toFixed(0)}% of Goal Weight</div>
        <div className="text-sm">
          <span style={{ fontWeight: 500 }}>{currentWeight} kg</span>
          <span className="text-muted"> / {goalKg} kg</span>
        </div>
      </div>
      <div style={{ width: '100%', height: '1rem', backgroundColor: 'rgba(161, 161, 170, 0.2)', borderRadius: '0.5rem', overflow: 'hidden' }}>
        <div
          style={{
            width: `${progressPercentage}%`,
            height: '100%',
            backgroundColor: getProgressBarColor(),
            transition: 'width 0.3s ease',
          }}
        />
      </div>
      <div className="text-sm text-muted mt-2 center">
        {getStatusMessage()}
      </div>
    </div>
  );
}
