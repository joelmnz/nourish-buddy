import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import DaySelector from '../components/DaySelector';
import RecipePickerModal from '../components/RecipePickerModal';

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

interface PickerState {
  isOpen: boolean;
  slotKey: string;
  slotName: string;
  dayIndex: number;
}

const BASE_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function IconDots() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="5" cy="12" r="1"/>
      <circle cx="12" cy="12" r="1"/>
      <circle cx="19" cy="12" r="1"/>
    </svg>
  );
}

export default function WeeklyPlannerPage() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<{ THIS: WeeklyPlan | null; NEXT: WeeklyPlan | null }>({ THIS: null, NEXT: null });
  const [mealSlots, setMealSlots] = useState<MealSlot[]>([]);
  const [recipes, setRecipes] = useState<Array<{ id: number; title: string; slotKeys: string[] }>>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'THIS' | 'NEXT'>('THIS');
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [firstDayOfWeek, setFirstDayOfWeek] = useState<number>(0);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [pickerState, setPickerState] = useState<PickerState>({
    isOpen: false,
    slotKey: '',
    slotName: '',
    dayIndex: 0,
  });

  function openPicker(slotKey: string, slotName: string, dayIndex: number) {
    setPickerState({ isOpen: true, slotKey, slotName, dayIndex });
  }

  function closePicker() {
    setPickerState((prev) => ({ ...prev, isOpen: false }));
  }

  function handlePickerSelect(recipeId: number) {
    setEntry(pickerState.dayIndex, pickerState.slotKey, recipeId);
    closePicker();
  }

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!menuRef.current) return;
      if (menuRef.current.contains(e.target as Node)) return;
      if (triggerRef.current?.contains(e.target as Node)) return;
      setMenuOpen(false);
    }
    if (menuOpen) {
      document.addEventListener('click', onDocClick);
    }
    return () => document.removeEventListener('click', onDocClick);
  }, [menuOpen]);

  // Set selected day to current day of week on mount
  useEffect(() => {
    const today = new Date();
    const currentDayOfWeek = today.getDay(); // 0 = Sunday, 6 = Saturday
    // Calculate the index in the rotated days array
    const rotatedIndex = (currentDayOfWeek - firstDayOfWeek + 7) % 7;
    setSelectedDayIndex(rotatedIndex);
  }, [firstDayOfWeek]);

  const rotatedDays = (() => {
    const start = firstDayOfWeek % 7;
    return [...BASE_DAYS.slice(start), ...BASE_DAYS.slice(0, start)];
  })();

  // Calculate current day's rotated index for desktop view indicator
  const currentDayRotatedIndex = (() => {
    const today = new Date();
    const currentDayOfWeek = today.getDay(); // 0 = Sunday, 6 = Saturday
    return (currentDayOfWeek - firstDayOfWeek + 7) % 7;
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

  if (loading) {
    return <div className="text-muted">Loading...</div>;
  }

  return (
    <div>
      <h1 className="h1 mb-4">Weekly Meal Planner</h1>

      <div className="card padded mb-2">
        <div className="planner-actions-mobile">
          <div className="planner-week-select">
            <button
              onClick={() => setActiveTab('THIS')}
              className={`btn ${activeTab === 'THIS' ? 'btn-primary' : 'btn-ghost'}`}
            >
              This
            </button>
            <button
              onClick={() => setActiveTab('NEXT')}
              className={`btn ${activeTab === 'NEXT' ? 'btn-primary' : 'btn-ghost'}`}
            >
              Next
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges || saving}
              className={`btn ${hasChanges && !saving ? 'btn-primary' : 'btn-ghost'}`}
              title="Save"
            >
              💾
            </button>
            <div className="overflow-menu" ref={menuRef}>
              <button
                ref={triggerRef}
                className="overflow-trigger btn btn-ghost"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((v) => !v)}
                title="More actions"
              >
                <IconDots />
              </button>
              {menuOpen && (
                <div className="menu-panel" role="menu">
                  <button onClick={() => { handleShuffle('week'); setMenuOpen(false); }} role="menuitem" className="menu-item">
                    🎲 Shuffle Week
                  </button>
                  <button onClick={() => { handleClear(); setMenuOpen(false); }} role="menuitem" className="menu-item">
                    Clear
                  </button>
                  {activeTab === 'THIS' && (
                    <button onClick={() => { handleCopyToNext(); setMenuOpen(false); }} role="menuitem" className="menu-item">
                      Copy to Next →
                    </button>
                  )}
                  {activeTab === 'NEXT' && (
                    <button onClick={() => { handleRollover(); setMenuOpen(false); }} role="menuitem" className="menu-item">
                      Set as Current
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
          {hasChanges && (
            <div className="mt-3 text-sm" style={{ color: 'rgb(245, 158, 11)' }}>
              You have unsaved changes
            </div>
          )}
        </div>

        <div className="planner-actions-desktop">
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
      </div>

      {/* Mobile: per-day cards; Desktop: table */}
      <div className="planner-responsive">
        <div className="planner-cards">
          {/* Day selector for mobile - tabs style */}
          <DaySelector
            days={rotatedDays}
            selectedDayIndex={selectedDayIndex}
            onDaySelect={setSelectedDayIndex}
          />

          {/* Show only the selected day's card */}
          {(() => {
            const rotatedIdx = selectedDayIndex;
            const storageIdx = toStorageDayIdx(rotatedIdx);
            const day = rotatedDays[rotatedIdx];
            
            return (
              <div key={rotatedIdx} className="card planner-card">
                <div className="planner-card-header">
                  <div className="planner-card-title">{day}</div>
                  <button
                    onClick={() => handleShuffle('day', storageIdx)}
                    className="btn btn-ghost btn-sm"
                    title="Shuffle this day"
                  >
                    🎲
                  </button>
                </div>
                <div className="planner-card-body">
                  {mealSlots.map((slot) => {
                    const entry = getEntry(storageIdx, slot.slotKey);
                    return (
                      <div key={slot.slotKey} className="planner-slot">
                        <div className="planner-slot-meta">
                          <div className="planner-slot-name">{slot.name}</div>
                          <div className="planner-slot-time text-sm text-muted">{slot.time24h}</div>
                        </div>
                        <div className="planner-slot-controls">
                          {entry?.recipeId && entry?.recipeTitle ? (
                            <button
                              onClick={() => navigate(`/recipe/${entry.recipeId}`)}
                              className="btn btn-ghost btn-sm"
                              style={{ flex: 1, textAlign: 'left' }}
                            >
                              {entry.recipeTitle}
                            </button>
                          ) : (
                            <div className="text-muted" style={{ flex: 1 }}>-</div>
                          )}
                          <div className="planner-slot-actions">
                            <button
                              onClick={() => openPicker(slot.slotKey, slot.name, storageIdx)}
                              className="btn btn-ghost btn-sm"
                              title="Pick recipe"
                            >
                              🔍
                            </button>
                            <button
                              onClick={() => handleShuffle('cell', storageIdx, slot.slotKey)}
                              className="btn btn-ghost btn-sm"
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
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>

        <div className="planner-table-wrap card">
          <table className="table" style={{ minWidth: 800 }}>
            <thead className="thead">
              <tr>
                <th className="th" style={{ width: 120 }}>Meal</th>
                {rotatedDays.map((day: string, rotatedIdx: number) => (
                  <th key={rotatedIdx} className={`th ${rotatedIdx === currentDayRotatedIndex ? 'th-active-day' : ''}`}>
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

                    return (
                      <td key={rotatedIdx} className="td">
                        <div className="flex flex-col" style={{ gap: '4px' }}>
                          {entry?.recipeId && entry?.recipeTitle ? (
                            <button
                              onClick={() => navigate(`/recipe/${entry.recipeId}`)}
                              className="btn btn-ghost btn-sm"
                              style={{ textAlign: 'left' }}
                            >
                              {entry.recipeTitle}
                            </button>
                          ) : (
                            <div className="text-muted">-</div>
                          )}
                          <div className="flex" style={{ gap: '4px' }}>
                            <button
                              onClick={() => openPicker(slot.slotKey, slot.name, storageIdx)}
                              className="btn btn-ghost btn-sm"
                              title="Pick recipe"
                            >
                              🔍
                            </button>
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

      <RecipePickerModal
        isOpen={pickerState.isOpen}
        slotKey={pickerState.slotKey}
        slotName={pickerState.slotName}
        onClose={closePicker}
        onSelect={handlePickerSelect}
      />
    </div>
  );
}
