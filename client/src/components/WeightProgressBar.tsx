interface WeightProgressBarProps {
  currentWeight: number;
  goalKg: number;
}

export default function WeightProgressBar({ currentWeight, goalKg }: WeightProgressBarProps) {
  const progressPercentage = Math.min(100, Math.max(0, (currentWeight / goalKg) * 100));
  const isAtGoal = Math.abs(currentWeight - goalKg) < 0.5;
  const isOverGoal = currentWeight > goalKg;

  const getStatusMessage = () => {
    if (isAtGoal) return '🎉 Goal achieved!';
    if (isOverGoal) return `${(currentWeight - goalKg).toFixed(1)} kg over goal`;
    return `${(goalKg - currentWeight).toFixed(1)} kg to goal`;
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
