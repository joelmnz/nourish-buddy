import { useState, useEffect } from 'react';
import { api } from '../lib/api';


export default function MealPlanPage() {
  const [plan, setPlan] = useState<Array<{ slotKey: string; orderIndex: number; time24h: string; name: string; notes: string | null }>>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadPlan();
  }, []);

  async function loadPlan() {
    try {
      const data = await api.mealPlan.get();
      setPlan(data);
    } catch (error) {
      console.error('Failed to load meal plan:', error);
    } finally {
      setLoading(false);
    }
  }

  function updateSlot(slotKey: string, field: 'time24h' | 'name' | 'notes', value: string) {
    setPlan((prev) =>
        prev.map((item) =>
        item.slotKey === slotKey ? { ...item, [field]: value } : item
      )
    );
    setHasChanges(true);
  }

  async function savePlan() {
    setSaving(true);
    try {
      await api.mealPlan.update(plan);
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to save meal plan:', error);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="text-muted">Loading...</div>;
  }

  return (
    <div>
      <div className="space-between mb-4">
        <h1 className="h1">Meal Plan</h1>
        <button
          onClick={savePlan}
          disabled={!hasChanges || saving}
          className={`btn ${hasChanges && !saving ? 'btn-primary' : 'btn-ghost'}`}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {hasChanges && (
        <div className="card padded mb-4" style={{ borderColor: 'rgba(245, 158, 11, 0.5)', background: 'rgba(245, 158, 11, 0.08)' }}>
          <div className="text-sm">You have unsaved changes</div>
        </div>
      )}

      <div className="card">
        <table className="table">
          <thead className="thead">
            <tr>
              <th className="th text-muted" style={{ width: 80 }}>Slot</th>
              <th className="th text-muted" style={{ width: 140 }}>Time</th>
              <th className="th text-muted">Name</th>
              <th className="th text-muted">Notes</th>
            </tr>
          </thead>
          <tbody>
            {plan.map((item) => (
              <tr key={item.slotKey} className="tr">
                <td className="td">{item.slotKey}</td>
                <td className="td">
                  <input
                    type="time"
                    value={item.time24h}
                    onChange={(e) => updateSlot(item.slotKey, 'time24h', e.target.value)}
                    className="input"
                  />
                </td>
                <td className="td">
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) => updateSlot(item.slotKey, 'name', e.target.value)}
                    placeholder="Meal name..."
                    className="input"
                  />
                </td>
                <td className="td">
                  <input
                    type="text"
                    value={item.notes || ''}
                    onChange={(e) => updateSlot(item.slotKey, 'notes', e.target.value)}
                    placeholder="Optional notes..."
                    className="input"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
