import { useState, useEffect } from 'react';
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

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<RecipeDetail | null>(null);

  useEffect(() => {
    loadRecipes();
  }, []);

  async function loadRecipes() {
    try {
      const data = await api.recipes.list(searchQuery || undefined);
      setRecipes(data);
    } catch (error) {
      console.error('Failed to load recipes:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch() {
    setLoading(true);
    await loadRecipes();
  }

  async function handleDelete(id: number, title: string) {
    if (!confirm(`Delete recipe "${title}"?`)) return;
    
    try {
      await api.recipes.delete(id);
      await loadRecipes();
    } catch (error: any) {
      if (error.status === 409) {
        alert('Cannot delete this recipe because it is used in a weekly plan');
      } else {
        alert('Failed to delete recipe');
      }
    }
  }

  async function handleEdit(id: number) {
    try {
      const recipe = await api.recipes.get(id);
      setEditingRecipe(recipe);
      setShowForm(true);
    } catch (error) {
      console.error('Failed to load recipe:', error);
    }
  }

  function handleCloseForm() {
    setShowForm(false);
    setEditingRecipe(null);
  }

  async function handleSaveForm() {
    await loadRecipes();
    handleCloseForm();
  }

  if (loading) {
    return <div className="text-muted">Loading...</div>;
  }

  return (
    <div>
      <div className="space-between mb-4">
        <h1 className="h1">Recipes</h1>
        <button onClick={() => setShowForm(true)} className="btn btn-primary">
          New Recipe
        </button>
      </div>

      <div className="card padded mb-4">
        <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }} className="row gap-4">
          <div style={{ flex: 1 }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search recipes..."
              className="input"
            />
          </div>
          <div className="row" style={{ alignItems: 'end' }}>
            <button type="submit" className="btn btn-primary">
              Search
            </button>
          </div>
        </form>
      </div>

      {recipes.length === 0 ? (
        <div className="card padded text-center text-muted">
          No recipes found. Create your first recipe to get started!
        </div>
      ) : (
        <div className="card">
          <table className="table">
            <thead className="thead">
              <tr>
                <th className="th">Recipe</th>
                <th className="th">Meal Types</th>
                <th className="th" style={{ width: 150 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {recipes.map((recipe) => (
                <tr key={recipe.id} className="tr">
                  <td className="td">{recipe.title}</td>
                  <td className="td">
                    <div className="flex" style={{ gap: '4px', flexWrap: 'wrap' }}>
                      {recipe.slotKeys.map((key) => (
                        <span key={key} className="badge">
                          {key}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="td">
                    <div className="flex" style={{ gap: '8px' }}>
                      <button onClick={() => handleEdit(recipe.id)} className="btn btn-ghost btn-sm">
                        Edit
                      </button>
                      <button onClick={() => handleDelete(recipe.id, recipe.title)} className="btn btn-ghost btn-sm">
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

      {showForm && (
        <RecipeFormModal
          recipe={editingRecipe}
          onClose={handleCloseForm}
          onSave={handleSaveForm}
        />
      )}
    </div>
  );
}

function RecipeFormModal({ recipe, onClose, onSave }: {
  recipe: RecipeDetail | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const [title, setTitle] = useState(recipe?.title || '');
  const [slotKeys, setSlotKeys] = useState<string[]>(recipe?.slotKeys || []);
  const [ingredients, setIngredients] = useState<Array<{ qty: string; item: string }>>(recipe?.ingredients || [{ qty: '', item: '' }]);
  const [instructions, setInstructions] = useState(recipe?.instructions || '');
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
    setIngredients(ingredients.map((ing, i) => i === index ? { ...ing, [field]: value } : ing));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      alert('Please enter a recipe title');
      return;
    }
    if (slotKeys.length === 0) {
      alert('Please select at least one meal type');
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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 600 }}>
        <div className="modal-header">
          <h2 className="h2">{recipe ? 'Edit Recipe' : 'New Recipe'}</h2>
          <button onClick={onClose} className="btn btn-ghost">✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            <div className="mb-4">
              <label className="text-sm text-muted mb-1 block">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Recipe name"
                className="input"
                required
              />
            </div>

            <div className="mb-4">
              <label className="text-sm text-muted mb-1 block">Meal Types</label>
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

            <div className="mb-4">
              <div className="space-between mb-2">
                <label className="text-sm text-muted">Ingredients</label>
                <button type="button" onClick={addIngredient} className="btn btn-ghost btn-sm">
                  + Add
                </button>
              </div>
              {ingredients.map((ing, idx) => (
                <div key={idx} className="flex mb-2" style={{ gap: '8px' }}>
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

            <div className="mb-4">
              <label className="text-sm text-muted mb-1 block">Instructions</label>
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Cooking instructions..."
                className="input"
                rows={6}
                style={{ resize: 'vertical' }}
              />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-ghost">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn btn-primary">
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
