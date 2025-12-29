import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import RecipeForm from '../components/RecipeForm';

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

  useEffect(() => {
    async function loadRecipe() {
      if (!id) return;
      setLoading(true);
      setError(null);
      setNotFound(false);
      try {
        const data = await api.recipes.get(Number(id));
        setRecipe(data);
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

  function handleSave() {
    // Navigate back to the recipe view page
    navigate(`/recipe/${id}`);
  }

  function handleCancel() {
    navigate(`/recipe/${id}`);
  }

  if (loading) return <div className="text-muted">Loading...</div>;
  if (notFound) return <div className="card padded text-center">Recipe not found</div>;
  if (error) return <div className="card padded text-center">{error}</div>;
  if (!recipe) return null;

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <RecipeForm recipe={recipe} onSave={handleSave} onCancel={handleCancel} />
    </div>
  );
}
