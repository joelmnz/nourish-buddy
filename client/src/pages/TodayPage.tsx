import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../lib/api';

// Get today's date in YYYY-MM-DD format using the browser's local timezone
function getLocalDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function TodayPage() {
  const location = useLocation();
  const [meals, setMeals] = useState<Array<{ slotKey: string; time: string; name: string; size: number; completed: boolean; notes: string | null; logId: number | null }>>([]);
  const [avgSize, setAvgSize] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [date, setDate] = useState(getLocalDateString());

  // Reset date to current date when navigating to this page
  useEffect(() => {
    const today = getLocalDateString();
    setDate(today);
  }, [location.pathname]);

  useEffect(() => {
    loadData();
  }, [date]);

  async function loadData() {
    setLoading(true);
    try {
      const [todayData, statsData] = await Promise.all([
        api.today.get(date),
        api.stats.meals(),
      ]);
      setMeals(todayData.meals);
      setAvgSize(statsData.average_size ?? null);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function updateMeal(slotKey: string, updates: Partial<{ size: number; notes: string | null; completed: boolean }>) {
    setSaving(slotKey);
    try {
      const meal = meals.find((m) => m.slotKey === slotKey);
      if (!meal) return;

      const updated = { ...meal, ...updates };
      await api.today.logMeal({
        date,
        slotKey,
        size: updated.size ?? 0,
        notes: updated.notes ?? undefined,
        completed: updated.completed ?? false,
      });

      setMeals((prev) => prev.map((m) => (m.slotKey === slotKey ? (updated as any) : m)));

      const statsData = await api.stats.meals();
      setAvgSize(statsData.average_size ?? null);
    } catch (error) {
      console.error('Failed to update meal:', error);
    } finally {
      setSaving(null);
    }
  }

  if (loading) {
    return <div className="text-muted">Loading...</div>;
  }

  return (
    <div>
      <div className="space-between mb-4">
        <h1 className="h1">Today</h1>
        <div className="row gap-4">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="input"
          />
          <div className="text-muted">
            {new Date(date).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </div>
        </div>
      </div>

      {avgSize !== null && (
        <div className="card padded mb-4">
          <h2 className="h2">14-Day Average Meal Size</h2>
          <div className="text-2xl font-semibold">{avgSize.toFixed(2)}</div>
        </div>
      )}

      <div className="section mt-4">
        <h2 className="h2">Today's Meals</h2>
        <div>
            {meals.map((meal) => (
              <div key={meal.slotKey} className="card padded mt-3">
                <div className="space-between">
                  <div className="row" style={{ flex: 1 }}>
                    <input
                      type="checkbox"
                      checked={meal.completed}
                      onChange={(e) =>
                        updateMeal(meal.slotKey, { completed: e.target.checked })
                      }
                    />
                    <div className="text-sm text-muted" style={{ width: 64 }}>{meal.time}</div>
                    <div className="font-medium">{meal.name}</div>
                  </div>
                  {saving === meal.slotKey && (
                    <div className="text-sm text-muted">Saving...</div>
                  )}
                </div>

              <div className="grid grid-2 mt-3">
                <div>
                  <label className="text-sm text-muted mb-2">Size (0-5)</label>
                  <div className="pills">
                    {[0, 1, 2, 3, 4, 5].map((size) => (
                      <button
                        key={size}
                         onClick={() => updateMeal(meal.slotKey, { completed: true, size: size })}
                         className={`pill ${meal.size === size ? 'active' : ''}`}
                       >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                   <label htmlFor={`notes-${meal.slotKey}`} className="text-sm text-muted mb-2">
                    Notes
                  </label>
                  <input
                    id={`notes-${meal.slotKey}`}
                    type="text"
                    value={meal.notes || ''}
                    onChange={(e) =>
                      setMeals((prev) =>
                        prev.map((m) =>
                          m.slotKey === meal.slotKey
                            ? { ...m, notes: e.target.value }
                            : m
                        )
                      )
                    }
                    onBlur={(e) => updateMeal(meal.slotKey, { notes: e.target.value })}
                    placeholder="Optional notes..."
                    className="input"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
