interface SettingsToggleProps {
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  ariaLabel?: string;
}

export default function SettingsToggle({
  title,
  description,
  checked,
  onChange,
  disabled = false,
  ariaLabel,
}: SettingsToggleProps) {
  return (
    <div className="space-between">
      <div>
        <div className="font-medium">{title}</div>
        <div className="text-sm text-muted">{description}</div>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className="toggle-btn"
        role="switch"
        aria-checked={checked}
        aria-label={ariaLabel ?? `Toggle ${title}`}
        disabled={disabled}
      >
        <div className={`toggle ${checked ? 'on' : ''}`}>
          <div className="toggle-knob" />
        </div>
      </button>
    </div>
  );
}
