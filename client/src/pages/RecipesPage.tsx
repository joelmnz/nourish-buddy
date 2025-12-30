import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import RecipeForm from '../components/RecipeForm';

interface Recipe {
  id: number;
  title: string;
  slotKeys: string[];
}

interface RecipeDetail {
  id: number;
  title: string;
  slotKeys: string[];
  instructions: string | null;
}

export default function RecipesPage() {
  const navigate = useNavigate();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<RecipeDetail | undefined>();

  // Debounce search query to avoid API calls on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadRecipes = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.recipes.list(debouncedSearchQuery || undefined);
      setRecipes(data);
    } catch (error) {
      console.error('Failed to load recipes:', error);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearchQuery]);

  useEffect(() => {
    loadRecipes();
  }, [loadRecipes]);

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
