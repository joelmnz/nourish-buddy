import { useState, useEffect } from 'react';
import { api } from '../lib/api';

import WeightChart from '../components/WeightChart';

export default function WeightsPage() {
  const [weights, setWeights] = useState<Array<{ date: string; kg: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [weight, setWeight] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadWeights();
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!weight) return;

    setSubmitting(true);
    try {
      await api.weights.create({ date, kg: parseFloat(weight) });
      await loadWeights();
      setWeight('');
      setDate(new Date().toISOString().split('T')[0]);
    } catch (error) {
      console.error('Failed to save weight:', error);
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteWeight(date: string) {
    if (!confirm(`Delete weight entry for ${new Date(date).toLocaleDateString()}?`)) return;

    try {
      await api.weights.delete(date);
      setWeights((prev) => prev.filter((w) => w.date !== date));
    } catch (error) {
      console.error('Failed to delete weight:', error);
    }
  }

  if (loading) {
    return <div className="text-muted">Loading...</div>;
  }

  return (
    <div>
      <h1 className="h1 mb-4">Weight History</h1>

      <div className="card padded mb-4">
        <h2 className="h2">Add/Update Weight</h2>
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
              id="weight"
              type="number"
              step="0.1"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              required
              placeholder="150.5"
              className="input"
            />
          </div>
          <div className="row" style={{ alignItems: 'end' }}>
            <button type="submit" disabled={submitting} className={`btn ${submitting ? 'btn-ghost' : 'btn-primary'}`}>
              {submitting ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>

      {weights.length > 0 && (
        <div className="card padded mb-4">
          <h2 className="h2">Weight Trend</h2>
          <div className="chart-wrap">
            <WeightChart weights={weights} />
          </div>
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
                      <button onClick={() => deleteWeight(w.date)} className="btn btn-danger text-sm">
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
