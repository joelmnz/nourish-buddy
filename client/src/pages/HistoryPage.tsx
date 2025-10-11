import { useState, useEffect } from 'react';
import { api } from '../lib/api';


export default function HistoryPage() {
  const [dates, setDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [meals, setMeals] = useState<Array<{ id: number; slotKey: string; size: number; completed: boolean; notes: string | null; time: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMeals, setLoadingMeals] = useState(false);

  useEffect(() => {
    loadDates();
  }, []);

  async function loadDates() {
    try {
      const data = await api.history.getDates();
      setDates(data);
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadMeals(date: string) {
    setSelectedDate(date);
    setLoadingMeals(true);
    try {
      const day = await api.history.getDay(date);
      setMeals(day.logs);
    } catch (error) {
      console.error('Failed to load meals for date:', error);
    } finally {
      setLoadingMeals(false);
    }
  }

  async function deleteMeal(id: number) {
    if (!confirm('Delete this meal entry?')) return;
    
    try {
      await api.today.deleteLog(id);
      setMeals((prev) => prev.filter((m) => m.id !== id));
      await loadDates();
    } catch (error) {
      console.error('Failed to delete meal:', error);
    }
  }

  async function updateMeal(id: number, updates: Partial<{ id: number; slotKey: string; size: number; completed: boolean; notes: string | null; time: string }>) {
    try {
      const meal = meals.find((m) => m.id === id);
      if (!meal || !selectedDate) return;

      const updated = { ...meal, ...updates };
      await api.today.logMeal({
        date: selectedDate,
        slotKey: meal.slotKey,
        size: updated.size,
        completed: updated.completed,
        notes: updated.notes || undefined,
      });

      setMeals((prev) => prev.map((m) => (m.id === id ? (updated as any) : m)));
    } catch (error) {
      console.error('Failed to update meal:', error);
    }
  }

  if (loading) {
    return <div className="text-muted">Loading...</div>;
  }

  return (
    <div>
      <h1 className="h1 mb-4">Meal History</h1>

      <div className="grid grid-3 gap-4">
        <div>
          <h2 className="h2">Dates</h2>
          <div className="card" style={{ maxHeight: 600, overflowY: 'auto' }}>
            {dates.length === 0 ? (
              <div className="padded text-muted text-sm">No history yet</div>
            ) : (
               dates.map((date) => (
                <button
                  key={date}
                  onClick={() => loadMeals(date)}
                  className={`list-button ${selectedDate === date ? 'active' : ''}`}
                >
                  <div className="font-medium">
                    {new Date(date).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <div style={{ gridColumn: 'span 2' }}>
          {selectedDate ? (
            <>
              <h2 className="h2">
                {new Date(selectedDate).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </h2>
              {loadingMeals ? (
                <div className="text-muted">Loading meals...</div>
              ) : (
                <div>
                  {meals.map((meal) => (
                    <div key={meal.id} className="card padded mt-3">
                      <div className="space-between">
                        <div className="row">
                          <input
                            type="checkbox"
                            checked={meal.completed}
                            onChange={(e) =>
                              updateMeal(meal.id, { completed: e.target.checked })
                            }
                          />
                           <div className="text-sm text-muted" style={{ width: 64 }}>{meal.time}</div>
                          <div className="font-medium">{meal.slotKey}</div>
                        </div>
                        <button onClick={() => deleteMeal(meal.id)} className="btn btn-danger text-sm">
                          Delete
                        </button>
                      </div>

                      <div className="grid grid-2 mt-3">
                        <div>
                          <label className="text-sm text-muted mb-2">Size (0-5)</label>
                          <div className="pills">
                            {[0, 1, 2, 3, 4, 5].map((size) => (
                              <button
                                key={size}
                                onClick={() => updateMeal(meal.id, { size })}
                                className={`pill ${meal.size === size ? 'active' : ''}`}
                              >
                                {size}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="text-sm text-muted mb-2">Notes</label>
                          <input
                            type="text"
                            value={meal.notes || ''}
                            onChange={(e) =>
                              setMeals((prev) =>
                                prev.map((m) =>
                                  m.id === meal.id
                                    ? { ...m, notes: e.target.value }
                                    : m
                                )
                              )
                            }
                            onBlur={(e) => updateMeal(meal.id, { notes: e.target.value })}
                            placeholder="Optional notes..."
                            className="input"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="center" style={{ height: 256 }}>
              <div className="text-muted">Select a date to view meals</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
