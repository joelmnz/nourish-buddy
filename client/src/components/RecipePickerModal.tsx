import { useState, useEffect, useMemo } from 'react';
import { api } from '../lib/api';

interface Recipe {
  id: number;
  title: string;
}

interface RecipePickerModalProps {
  isOpen: boolean;
  slotKey: string;
  slotName: string;
  onClose: () => void;
  onSelect: (recipeId: number) => void;
}

export default function RecipePickerModal({
  isOpen,
  slotKey,
  slotName,
  onClose,
  onSelect,
}: RecipePickerModalProps) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    setSearch('');
    api.recipes
      .listBySlotKey(slotKey)
      .then((data) => {
        setRecipes(data);
      })
      .catch((error) => {
        console.error('Failed to load recipes:', error);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen, slotKey]);

  const filteredRecipes = useMemo(() => {
    if (!search.trim()) return recipes;
    const lowerSearch = search.toLowerCase();
    return recipes.filter((r) => r.title.toLowerCase().includes(lowerSearch));
  }, [recipes, search]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="recipe-picker-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 className="h2" style={{ margin: 0 }}>
            Select {slotName} Recipe
          </h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose} title="Close">
            ✕
          </button>
        </div>
        <div className="modal-body" style={{ padding: 0 }}>
          <div style={{ padding: '16px', borderBottom: '1px solid var(--border)' }}>
            <input
              type="text"
              className="input"
              placeholder="Search recipes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>
          <div className="recipe-picker-list">
            {loading ? (
              <div className="text-muted" style={{ padding: '16px', textAlign: 'center' }}>
                Loading...
              </div>
            ) : filteredRecipes.length === 0 ? (
              <div className="text-muted" style={{ padding: '16px', textAlign: 'center' }}>
                {recipes.length === 0
                  ? `No recipes available for ${slotName}`
                  : 'No recipes match your search'}
              </div>
            ) : (
              filteredRecipes.map((recipe) => (
                <button
                  key={recipe.id}
                  className="list-button"
                  onClick={() => onSelect(recipe.id)}
                >
                  {recipe.title}
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
