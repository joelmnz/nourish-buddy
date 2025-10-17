interface DaySelectorProps {
  days: string[];
  selectedDayIndex: number;
  onDaySelect: (index: number) => void;
}

export default function DaySelector({ days, selectedDayIndex, onDaySelect }: DaySelectorProps) {
  // Get first letter of each day for compact display
  const dayAbbreviations = days.map(day => day.charAt(0));

  return (
    <div className="day-selector">
      {dayAbbreviations.map((abbr, index) => (
        <button
          key={index}
          onClick={() => onDaySelect(index)}
          className={`day-selector-btn ${index === selectedDayIndex ? 'active' : ''}`}
          aria-label={days[index]}
        >
          {abbr}
        </button>
      ))}
    </div>
  );
}
