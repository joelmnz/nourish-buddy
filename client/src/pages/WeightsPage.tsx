import { useState, useEffect, useRef, useMemo } from 'react';
import { api } from '../lib/api';
import { getLocalDateString } from '../lib/date-utils';

import WeightChart from '../components/WeightChart';
import WeightProgressBar from '../components/WeightProgressBar';

export default function WeightsPage() {
  const [weights, setWeights] = useState<Array<{ date: string; kg: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(getLocalDateString());
  const [weight, setWeight] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [goalKg, setGoalKg] = useState<number | null>(null);

  const formRef = useRef<HTMLDivElement>(null);
  const weightInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadWeights();
    loadSettings();
  }, []);

  async function loadWeights() {
    try {
      const data = await api.weights.get();
      setWeights(data);
    } catch (error) {
      console.error('Failed to load weights:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadSettings() {
    try {
      const data = await api.settings.get();
      setGoalKg(data.goalKg);
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!weight) return;

    const kg = parseFloat(weight);
    if (isNaN(kg) || kg <= 0 || kg > 500) {
      alert('Please enter a valid weight between 0 and 500 kg');
      return;
    }

    setSubmitting(true);
    try {
      await api.weights.create({ date, kg });
      await loadWeights();
      setWeight('');
      setDate(getLocalDateString());
      setEditingDate(null);
    } catch (error) {
      console.error('Failed to save weight:', error);
    } finally {
      setSubmitting(false);
    }
  }

  function handleEdit(w: { date: string; kg: number }) {
    setEditingDate(w.date);
    setDate(w.date);
    setWeight(w.kg.toString());
    
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => {
      weightInputRef.current?.focus();
    }, 300);
  }

  function handleCancelEdit() {
    setEditingDate(null);
    setDate(getLocalDateString());
    setWeight('');
  }

  async function deleteWeight(date: string) {
    if (!confirm(`Delete weight entry for ${new Date(date).toLocaleDateString()}?`)) return;

    try {
      await api.weights.delete(date);
      setWeights((prev) => prev.filter((w) => w.date !== date));
      if (editingDate === date) {
        handleCancelEdit();
      }
    } catch (error) {
      console.error('Failed to delete weight:', error);
    }
  }

  const currentWeight = useMemo(() => {
    if (weights.length === 0) return null;
    const sortedWeights = [...weights].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return sortedWeights[0]?.kg ?? null;
  }, [weights]);

  if (loading) {
    return <div className="text-muted">Loading...</div>;
  }

  return (
    <div>
      <h1 className="h1 mb-4">Weight History</h1>

      <div ref={formRef} className="card padded mb-4">
        <h2 className="h2">{editingDate ? 'Edit Weight' : 'Add/Update Weight'}</h2>
        <form onSubmit={handleSubmit} className="row gap-4">
          <div style={{ flex: 1 }}>
            <label htmlFor="date" className="text-sm text-muted mb-2">Date</label>
            <input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="input"
            />
          </div>
          <div style={{ flex: 1 }}>
             <label htmlFor="weight" className="text-sm text-muted mb-2">Weight (kg)</label>
            <input
              ref={weightInputRef}
              id="weight"
              type="number"
              step="0.1"
              min="0.1"
              max="500"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              required
              placeholder="150.5"
              className="input"
            />
          </div>
          <div className="row" style={{ alignItems: 'end', gap: '0.5rem' }}>
            <button type="submit" disabled={submitting} className={`btn ${submitting ? 'btn-ghost' : 'btn-primary'}`}>
              {submitting ? 'Saving...' : editingDate ? 'Update' : 'Save'}
            </button>
            {editingDate && (
              <button type="button" onClick={handleCancelEdit} className="btn btn-ghost">
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {weights.length > 0 && (
        <div className="card padded mb-4">
          <h2 className="h2">Weight Trend</h2>
          <div className="chart-wrap">
            <WeightChart weights={weights} goalKg={goalKg} />
          </div>
          {goalKg && goalKg > 0 && currentWeight && (
            <WeightProgressBar currentWeight={currentWeight} goalKg={goalKg} />
          )}
        </div>
      )}

      <div>
        <h2 className="h2">Weight Entries</h2>
        <div className="card">
          {weights.length === 0 ? (
            <div className="padded center text-muted">No weight entries yet. Add your first entry above!</div>
          ) : (
            <table className="table">
              <thead className="thead">
                <tr>
                  <th className="th text-muted">Date</th>
                   <th className="th text-muted">Weight (kg)</th>
                  <th className="th text-muted text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {weights.map((w) => (
                  <tr key={w.date} className="tr">
                    <td className="td">
                      {new Date(w.date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>
                     <td className="td">{w.kg}</td>
                    <td className="td text-right">
                      <button 
                        onClick={() => handleEdit(w)} 
                        disabled={submitting}
                        className="btn btn-primary text-sm"
                        style={{ marginRight: '0.5rem' }}
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => deleteWeight(w.date)} 
                        disabled={submitting}
                        className="btn btn-danger text-sm"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
