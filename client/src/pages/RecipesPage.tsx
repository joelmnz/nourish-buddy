import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';

interface Recipe {
  id: number;
  title: string;
  slotKeys: string[];
}

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

function RecipeForm({ recipe, onSave, onCancel }: RecipeFormProps) {
  const [title, setTitle] = useState(recipe?.title || '');
  const [slotKeys, setSlotKeys] = useState<string[]>(recipe?.slotKeys || []);
  const [ingredients, setIngredients] = useState<Array<{ qty: string; item: string }>>(
    recipe?.ingredients || [{ qty: '', item: '' }]
  );
  const [instructions, setInstructions] = useState(recipe?.instructions || '');
  const instructionsRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (instructionsRef.current) {
      instructionsRef.current.style.height = 'auto';
      instructionsRef.current.style.height = instructionsRef.current.scrollHeight + 'px';
    }
  }, [instructions]);
  const [saving, setSaving] = useState(false);

  const allSlots = ['BREAKFAST', 'SNACK_1', 'LUNCH', 'SNACK_2', 'DINNER', 'DESSERT', 'SUPPER'];

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

export default function RecipesPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<RecipeDetail | undefined>();

  const loadRecipes = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.recipes.list(searchQuery || undefined);
      setRecipes(data);
    } catch (error) {
      console.error('Failed to load recipes:', error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    loadRecipes();
  }, [loadRecipes]);

  useEffect(() => {
    const editId = searchParams.get('edit');
    if (editId && !isNaN(Number(editId))) {
      // Trigger edit mode for the specified recipe
      (async () => {
        try {
          const recipe = await api.recipes.get(Number(editId));
          setEditingRecipe(recipe);
          setShowForm(true);
        } catch (error) {
          console.error('Failed to load recipe:', error);
        }
      })();
      // Clear the URL parameter after triggering edit
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  function handleNewRecipe() {
    setEditingRecipe(undefined);
    setShowForm(true);
  }

  async function handleEditRecipe(id: number) {
    try {
      const recipe = await api.recipes.get(id);
      setEditingRecipe(recipe);
      setShowForm(true);
    } catch (error) {
      console.error('Failed to load recipe:', error);
    }
  }

  function handleFormSave() {
    setShowForm(false);
    setEditingRecipe(undefined);
    loadRecipes();
  }

  function handleFormCancel() {
    setShowForm(false);
    setEditingRecipe(undefined);
  }

  async function handleDelete(id: number, title: string) {
    if (!confirm(`Delete recipe "${title}"?`)) return;

    try {
      await api.recipes.delete(id);
      loadRecipes();
    } catch (error) {
      const status = (error as { status?: number }).status;
      if (status === 409) {
        alert('Cannot delete this recipe because it is used in a weekly plan');
      } else {
        alert('Failed to delete recipe');
      }
    }
  }

  if (loading && recipes.length === 0) {
    return <div className="text-muted">Loading...</div>;
  }

  return (
    <div>
      <h1 className="h1 mb-4">Recipes</h1>

      {showForm ? (
        <RecipeForm recipe={editingRecipe} onSave={handleFormSave} onCancel={handleFormCancel} />
      ) : (
        <>
          <div className="card padded mb-4">
            <div className="row gap-4" style={{ alignItems: 'end' }}>
              <div style={{ flex: 1 }}>
                <label htmlFor="search" className="text-sm text-muted mb-2">
                  Search
                </label>
                <input
                  id="search"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search recipes..."
                  className="input"
                />
              </div>
              <button onClick={handleNewRecipe} className="btn btn-primary">
                New Recipe
              </button>
            </div>
          </div>

          {recipes.length === 0 ? (
            <div className="card padded text-center text-muted">
              {searchQuery
                ? 'No recipes found matching your search.'
                : 'No recipes found. Create your first recipe to get started!'}
            </div>
          ) : (
            <div className="card">
              <table className="table">
                <thead className="thead">
                  <tr>
                    <th className="th">Recipe</th>
                    <th className="th">Meal Types</th>
                    <th className="th" style={{ width: 150 }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                 <tbody>
{recipes.map((recipe) => (
  <tr
    key={recipe.id}
    className="tr"
    style={{ cursor: 'pointer' }}
    tabIndex={0}
    role="link"
    aria-label={`View ${recipe.title}`}
    onClick={() => navigate(`/recipe/${recipe.id}`)}
    onKeyDown={(e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        navigate(`/recipe/${recipe.id}`);
      }
    }}
  >
    <td className="td">{recipe.title}</td>
    <td className="td">
      <div className="flex" style={{ gap: '4px', flexWrap: 'wrap' }}>
        {recipe.slotKeys.length > 0 ? (
          recipe.slotKeys.map((key) => (
            <span key={key} className="badge">
              {key}
            </span>
          ))
        ) : (
          <span className="text-muted italic text-sm">
            Not assigned to any meal
          </span>
        )}
      </div>
    </td>
    <td className="td" style={{ paddingTop: 0, paddingBottom: 0 }}>
  <div className="flex row" style={{ gap: '4px', alignItems: 'center', justifyContent: 'flex-start' }}>
    <button
  onClick={e => { e.stopPropagation(); handleEditRecipe(recipe.id); }}
  className="btn btn-ghost text-sm"
>
  Edit
</button>
<button
  onClick={e => { e.stopPropagation(); handleDelete(recipe.id, recipe.title); }}
  className="btn btn-danger text-sm"
>
  Delete
</button>
  </div>
</td>
  </tr>
))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
