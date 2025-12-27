import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

interface RecipeDetail {
  id: number;
  title: string;
  slotKeys: string[];
  ingredients: Array<{ qty: string; item: string }>;
  instructions: string | null;
}

export default function EditRecipePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState<RecipeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [slotKeys, setSlotKeys] = useState<string[]>([]);
  const [ingredients, setIngredients] = useState<Array<{ qty: string; item: string }>>([
    { qty: '', item: '' },
  ]);
  const [instructions, setInstructions] = useState('');
  const instructionsRef = useRef<HTMLTextAreaElement>(null);
  const [saving, setSaving] = useState(false);

  const allSlots = ['BREAKFAST', 'SNACK_1', 'LUNCH', 'SNACK_2', 'DINNER', 'DESSERT', 'SUPPER'];

  useEffect(() => {
    async function loadRecipe() {
      if (!id) return;
      setLoading(true);
      setError(null);
      setNotFound(false);
      try {
        const data = await api.recipes.get(Number(id));
        setRecipe(data);
        setTitle(data.title);
        setSlotKeys(data.slotKeys);
        setIngredients(data.ingredients.length > 0 ? data.ingredients : [{ qty: '', item: '' }]);
        setInstructions(data.instructions || '');
      } catch (err) {
        const status = (err as { status?: number }).status;
        if (status === 404) {
          setNotFound(true);
        } else {
          setError('Failed to load recipe');
        }
      } finally {
        setLoading(false);
      }
    }
    loadRecipe();
  }, [id]);

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

    if (!recipe) return;

    setSaving(true);
    try {
      const cleanIngredients = ingredients.filter((ing) => ing.qty.trim() && ing.item.trim());

      await api.recipes.update(recipe.id, {
        title,
        slotKeys,
        ingredients: cleanIngredients,
        instructions: instructions.trim() || null,
      });

      // Navigate back to the recipe view page
      navigate(`/recipe/${recipe.id}`);
    } catch (error) {
      console.error('Failed to save recipe:', error);
      alert('Failed to save recipe');
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    if (recipe) {
      navigate(`/recipe/${recipe.id}`);
    } else {
      navigate('/recipes');
    }
  }

  if (loading) return <div className="text-muted">Loading...</div>;
  if (notFound) return <div className="card padded text-center">Recipe not found</div>;
  if (error) return <div className="card padded text-center">{error}</div>;
  if (!recipe) return null;

  return (
    <div className="card padded" style={{ maxWidth: 800, margin: '0 auto' }}>
      <h1 className="h1 mb-4">Edit Recipe</h1>
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
          <button type="button" onClick={handleCancel} className="btn btn-ghost">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
