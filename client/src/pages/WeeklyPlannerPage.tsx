import { useState, useEffect } from 'react';
import { api } from '../lib/api';

interface WeeklyPlan {
  id: number;
  key: string;
  entries: Array<{
    dayIndex: number;
    slotKey: string;
    recipeId: number | null;
    recipeTitle: string | null;
  }>;
}

interface MealSlot {
  slotKey: string;
  orderIndex: number;
  time24h: string;
  name: string;
  notes: string | null;
}

const BASE_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function WeeklyPlannerPage() {
  const [plans, setPlans] = useState<{ THIS: WeeklyPlan | null; NEXT: WeeklyPlan | null }>({ THIS: null, NEXT: null });
  const [mealSlots, setMealSlots] = useState<MealSlot[]>([]);
  const [recipes, setRecipes] = useState<Array<{ id: number; title: string; slotKeys: string[] }>>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'THIS' | 'NEXT'>('THIS');
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [firstDayOfWeek, setFirstDayOfWeek] = useState<number>(0);

  useEffect(() => {
    loadData();
  }, []);

  const rotatedDays = (() => {
    const start = firstDayOfWeek % 7;
    return [...BASE_DAYS.slice(start), ...BASE_DAYS.slice(0, start)];
  })();

  function toStorageDayIdx(rotatedIdx: number) {
    return (rotatedIdx + firstDayOfWeek) % 7;
  }


  async function loadData() {
    try {
      const [plansData, slotsData, recipesData, settingsData] = await Promise.all([
        api.weeklyPlans.get(),
        api.mealPlan.get(),
        api.recipes.list(),
        api.settings.get(),
      ]);
      setPlans(plansData);
      setMealSlots(slotsData);
      setRecipes(recipesData);
      setFirstDayOfWeek(settingsData.firstDayOfWeek ?? 0);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }

  function getEntry(dayIndex: number, slotKey: string) {
    const plan = plans[activeTab];
    if (!plan) return null;
    return plan.entries.find((e) => e.dayIndex === dayIndex && e.slotKey === slotKey);
  }

  // Write using storage indices (0=Sunday..6=Saturday) derived from rotated index
  function setEntry(dayIndex: number, slotKey: string, recipeId: number | null) {
    setPlans((prev) => {
      const plan = prev[activeTab];
      if (!plan) return prev;

      const existingIdx = plan.entries.findIndex((e) => e.dayIndex === dayIndex && e.slotKey === slotKey);
      let newEntries;
      
      if (existingIdx >= 0) {
        newEntries = [...plan.entries];
        if (recipeId === null) {
          newEntries.splice(existingIdx, 1);
        } else {
          const recipe = recipes.find((r) => r.id === recipeId);
          newEntries[existingIdx] = {
            ...newEntries[existingIdx],
            recipeId,
            recipeTitle: recipe?.title || null,
          };
        }
      } else if (recipeId !== null) {
        const recipe = recipes.find((r) => r.id === recipeId);
        newEntries = [
          ...plan.entries,
          { dayIndex, slotKey, recipeId, recipeTitle: recipe?.title || null },
        ];
      } else {
        newEntries = plan.entries;
      }

      return {
        ...prev,
        [activeTab]: { ...plan, entries: newEntries },
      };
    });
    setHasChanges(true);
  }

  async function handleSave() {
    const plan = plans[activeTab];
    if (!plan) return;

    setSaving(true);
    try {
      await api.weeklyPlans.update(activeTab, plan.entries.map((e) => ({
        dayIndex: e.dayIndex,
        slotKey: e.slotKey,
        recipeId: e.recipeId,
      })));
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to save plan:', error);
      alert('Failed to save plan');
    } finally {
      setSaving(false);
    }
  }

  async function handleShuffle(scope: 'week' | 'day' | 'cell', dayIndex?: number, slotKey?: string) {
    try {
      await api.weeklyPlans.shuffle(activeTab, scope, dayIndex, slotKey);
      await loadData();
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to shuffle:', error);
      alert('Failed to shuffle plan');
    }
  }

  async function handleClear() {
    if (!confirm('Clear all entries for this week?')) return;
    
    setPlans((prev) => {
      const plan = prev[activeTab];
      if (!plan) return prev;
      return {
        ...prev,
        [activeTab]: { ...plan, entries: [] },
      };
    });
    setHasChanges(true);
  }

  async function handleCopyToNext() {
    if (!confirm('Copy THIS week to NEXT week?')) return;
    
    const thisPlan = plans.THIS;
    if (!thisPlan) return;

    setPlans((prev) => ({
      ...prev,
      NEXT: prev.NEXT ? { ...prev.NEXT, entries: [...thisPlan.entries] } : null,
    }));
    setActiveTab('NEXT');
    setHasChanges(true);
  }

  async function handleRollover() {
    if (!confirm('Make NEXT week the current week (THIS)?')) return;
    
    try {
      await api.weeklyPlans.rollover();
      await loadData();
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to rollover:', error);
      alert('Failed to rollover plan');
    }
  }

  function getAvailableRecipes(slotKey: string) {
    return recipes.filter((r) => r.slotKeys.includes(slotKey));
  }

  if (loading) {
    return <div className="text-muted">Loading...</div>;
  }

  return (
    <div>
      <h1 className="h1 mb-4">Weekly Meal Planner</h1>

      <div className="card padded mb-4">
        <div className="flex" style={{ gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
          <button
            onClick={() => setActiveTab('THIS')}
            className={`btn ${activeTab === 'THIS' ? 'btn-primary' : 'btn-ghost'}`}
          >
            This Week
          </button>
          <button
            onClick={() => setActiveTab('NEXT')}
            className={`btn ${activeTab === 'NEXT' ? 'btn-primary' : 'btn-ghost'}`}
          >
            Next Week
          </button>
        </div>

        <div className="flex" style={{ gap: '8px', flexWrap: 'wrap' }}>
          <button onClick={() => handleShuffle('week')} className="btn btn-ghost">
            🎲 Shuffle Week
          </button>
          <button onClick={handleClear} className="btn btn-ghost">
            Clear
          </button>
          {activeTab === 'THIS' && (
            <button onClick={handleCopyToNext} className="btn btn-ghost">
              Copy to Next →
            </button>
          )}
          {activeTab === 'NEXT' && (
            <button onClick={handleRollover} className="btn btn-ghost">
              Set as Current
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className={`btn ${hasChanges && !saving ? 'btn-primary' : 'btn-ghost'}`}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>

        {hasChanges && (
          <div className="mt-3 text-sm" style={{ color: 'rgb(245, 158, 11)' }}>
            You have unsaved changes
          </div>
        )}
      </div>

      <div className="card" style={{ overflowX: 'auto' }}>
        <table className="table" style={{ minWidth: 800 }}>
          <thead className="thead">
            <tr>
              <th className="th" style={{ width: 120 }}>Meal</th>
              {rotatedDays.map((day: string, rotatedIdx: number) => (
                <th key={rotatedIdx} className="th">
                  <div className="flex flex-col" style={{ alignItems: 'center', gap: '4px', display: 'flex', flexDirection: 'row', justifyContent: 'center' }}>
                    <div>{day}</div>
                    <button
                      onClick={() => handleShuffle('day', toStorageDayIdx(rotatedIdx))}
                      className="btn btn-ghost btn-sm"
                      title="Shuffle this day"
                    >
                      🎲
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {mealSlots.map((slot) => (
              <tr key={slot.slotKey} className="tr">
                <td className="td">
                  <div className="font-medium">{slot.name}</div>
                  <div className="text-sm text-muted">{slot.time24h}</div>
                </td>
                {rotatedDays.map((_, rotatedIdx: number) => {
                  const storageIdx = toStorageDayIdx(rotatedIdx);
                  const entry = getEntry(storageIdx, slot.slotKey);
                  const availableRecipes = getAvailableRecipes(slot.slotKey);

                  return (
                    <td key={rotatedIdx} className="td">
                      <div className="flex flex-col" style={{ gap: '4px' }}>
                        <select
                          value={entry?.recipeId || ''}
                          onChange={(e) => setEntry(storageIdx, slot.slotKey, e.target.value ? parseInt(e.target.value) : null)}
                          className="input"
                          style={{ fontSize: '0.875rem' }}
                        >
                          <option value="">-</option>
                          {availableRecipes.map((recipe) => (
                            <option key={recipe.id} value={recipe.id}>
                              {recipe.title}
                            </option>
                          ))}
                        </select>
                        <div className="flex" style={{ gap: '4px' }}>
                          <button
                            onClick={() => handleShuffle('cell', storageIdx, slot.slotKey)}
                            className="btn btn-ghost btn-sm"
                            style={{ flex: 1 }}
                            title="Shuffle this cell"
                          >
                            🎲
                          </button>
                          {entry && (
                            <button
                              onClick={() => setEntry(storageIdx, slot.slotKey, null)}
                              className="btn btn-ghost btn-sm"
                              title="Clear"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
