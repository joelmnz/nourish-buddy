import { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';

interface RecipeDetail {
  id: number;
  title: string;
  slotKeys: string[];
  ingredients: Array<{ qty: string; item: string }>;
  instructions: string | null;
}

interface RecipeFormProps {
  recipe?: RecipeDetail;
  onSave: () => void;
  onCancel: () => void;
}

export default function RecipeForm({ recipe, onSave, onCancel }: RecipeFormProps) {
  const [title, setTitle] = useState(recipe?.title || '');
  const [slotKeys, setSlotKeys] = useState<string[]>(recipe?.slotKeys || []);
  const [ingredients, setIngredients] = useState<Array<{ qty: string; item: string }>>(
    recipe?.ingredients || [{ qty: '', item: '' }]
  );
  const [instructions, setInstructions] = useState(recipe?.instructions || '');
  const instructionsRef = useRef<HTMLTextAreaElement>(null);
  const [saving, setSaving] = useState(false);

  const allSlots = ['BREAKFAST', 'SNACK_1', 'LUNCH', 'SNACK_2', 'DINNER', 'DESSERT', 'SUPPER'];

  // Update form state when recipe prop changes
  useEffect(() => {
    if (recipe) {
      setTitle(recipe.title);
      setSlotKeys(recipe.slotKeys);
      setIngredients(recipe.ingredients.length > 0 ? recipe.ingredients : [{ qty: '', item: '' }]);
      setInstructions(recipe.instructions || '');
    }
  }, [recipe]);

  useEffect(() => {
    if (instructionsRef.current) {
      instructionsRef.current.style.height = 'auto';
      instructionsRef.current.style.height = instructionsRef.current.scrollHeight + 'px';
    }
  }, [instructions]);

  function toggleSlot(slot: string) {
    setSlotKeys((prev) =>
      prev.includes(slot) ? prev.filter((s) => s !== slot) : [...prev, slot]
    );
  }

  function addIngredient() {
    setIngredients([...ingredients, { qty: '', item: '' }]);
  }

  function removeIngredient(index: number) {
    setIngredients(ingredients.filter((_, i) => i !== index));
  }

  function updateIngredient(index: number, field: 'qty' | 'item', value: string) {
    setIngredients(ingredients.map((ing, i) => (i === index ? { ...ing, [field]: value } : ing)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      alert('Please enter a recipe title');
      return;
    }

    setSaving(true);
    try {
      const cleanIngredients = ingredients.filter((ing) => ing.qty.trim() && ing.item.trim());

      if (recipe) {
        await api.recipes.update(recipe.id, {
          title,
          slotKeys,
          ingredients: cleanIngredients,
          instructions: instructions.trim() || null,
        });
      } else {
        await api.recipes.create({
          title,
          slotKeys,
          ingredients: cleanIngredients,
          instructions: instructions.trim() || null,
        });
      }
      onSave();
    } catch (error) {
      console.error('Failed to save recipe:', error);
      alert('Failed to save recipe');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card padded mb-4">
      <h2 className="h2 mb-4">{recipe ? 'Edit Recipe' : 'New Recipe'}</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="title" className="text-sm text-muted mb-2">
            Title *
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Recipe name"
            className="input"
            required
          />
        </div>

        <div>
          <label className="text-sm text-muted mb-2">Meal Types (optional)</label>
          <p className="text-xs text-muted mb-2 -mt-1">
            Select meal types where this recipe can be used, or leave empty to archive this recipe.
          </p>
          <div className="flex" style={{ gap: '8px', flexWrap: 'wrap' }}>
            {allSlots.map((slot) => (
              <button
                key={slot}
                type="button"
                onClick={() => toggleSlot(slot)}
                className={`btn btn-sm ${slotKeys.includes(slot) ? 'btn-primary' : 'btn-ghost'}`}
              >
                {slot}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="space-between mb-2">
            <label className="text-sm text-muted">Ingredients</label>
            <button type="button" onClick={addIngredient} className="btn btn-ghost btn-sm">
              + Add
            </button>
          </div>
          {ingredients.map((ing, idx) => (
            <div key={idx} className="flex mb-2" style={{ gap: '8px', display: 'flex' }}>
              <input
                type="text"
                value={ing.qty}
                onChange={(e) => updateIngredient(idx, 'qty', e.target.value)}
                placeholder="Qty"
                className="input"
                style={{ width: 100 }}
              />
              <input
                type="text"
                value={ing.item}
                onChange={(e) => updateIngredient(idx, 'item', e.target.value)}
                placeholder="Item"
                className="input"
                style={{ flex: 1 }}
              />
              <button
                type="button"
                onClick={() => removeIngredient(idx)}
                className="btn btn-ghost btn-sm"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        <div>
          <label htmlFor="instructions" className="text-sm text-muted mb-2">
            Instructions
          </label>
          <textarea
            id="instructions"
            ref={instructionsRef}
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Cooking instructions..."
            className="input"
            rows={1}
            style={{ resize: 'none', overflow: 'hidden' }}
          />
        </div>

        <div className="row gap-4">
          <button
            type="submit"
            disabled={saving}
            className={`btn ${saving ? 'btn-ghost' : 'btn-primary'}`}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button type="button" onClick={onCancel} className="btn btn-ghost">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
