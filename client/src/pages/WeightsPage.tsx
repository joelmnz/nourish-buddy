import { Fragment, useState, useEffect, useRef, useMemo } from 'react';
import { api } from '../lib/api';
import { getLocalDateString } from '../lib/date-utils';
import { WEIGHT_NOTES_MAX_LENGTH } from '../../../shared/types';

import WeightChart from '../components/WeightChart';
import WeightProgressBar from '../components/WeightProgressBar';

export default function WeightsPage() {
  const [weights, setWeights] = useState<Awaited<ReturnType<typeof api.weights.get>>>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(getLocalDateString());
  const [weight, setWeight] = useState('');
  const [notes, setNotes] = useState('');
  const [originalNotes, setOriginalNotes] = useState<string | null>(null);
  const [saveError, setSaveError] = useState('');
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

    if (notes.length > WEIGHT_NOTES_MAX_LENGTH) {
      setSaveError(`Notes must be at most ${WEIGHT_NOTES_MAX_LENGTH} characters.`);
      return;
    }

    setSaveError('');
    setSubmitting(true);
    try {
      const normalizedNotes = notes.trim() ? notes : null;
      const notesChanged = editingDate === date && editingDate !== null
        ? normalizedNotes !== originalNotes
        : normalizedNotes !== null;
      await api.weights.create({ date, kg, ...(notesChanged ? { notes: normalizedNotes } : {}) });
      await loadWeights();
      setWeight('');
      setNotes('');
      setOriginalNotes(null);
      setDate(getLocalDateString());
      setEditingDate(null);
    } catch (error) {
      setSaveError(`Failed to save weight. Your draft is preserved. ${error instanceof Error ? error.message : 'Please try again.'}`);
    } finally {
      setSubmitting(false);
    }
  }

  function handleEdit(w: { date: string; kg: number; notes: string | null }) {
    setEditingDate(w.date);
    setDate(w.date);
    setWeight(w.kg.toString());
    setNotes(w.notes ?? '');
    setOriginalNotes(w.notes);
    setSaveError('');
    
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => {
      weightInputRef.current?.focus();
    }, 300);
  }

  function handleCancelEdit() {
    setEditingDate(null);
    setDate(getLocalDateString());
    setWeight('');
    setNotes('');
    setOriginalNotes(null);
    setSaveError('');
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
        <form onSubmit={handleSubmit} className="row gap-4" style={{ flexWrap: 'wrap' }}>
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
          <div style={{ flex: '1 1 100%', minWidth: 0 }}>
            <label htmlFor="weight-notes" className="text-sm text-muted mb-2">Notes (optional)</label>
            <textarea id="weight-notes" className="input" rows={3} value={notes}
              onChange={(e) => setNotes(e.target.value)} aria-describedby="weight-notes-help" />
            <div id="weight-notes-help" className="text-sm text-muted">Maximum {WEIGHT_NOTES_MAX_LENGTH} characters.</div>
          </div>
          {saveError && <div role="alert" style={{ flex: '1 1 100%' }}>{saveError}</div>}
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
            <WeightProgressBar currentWeight={currentWeight} goalKg={goalKg} weights={weights} />
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
                  <Fragment key={w.date}>
                    <tr className="tr">
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
                    {w.notes && <tr><td className="td" colSpan={3} style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{w.notes}</td></tr>}
                  </Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
