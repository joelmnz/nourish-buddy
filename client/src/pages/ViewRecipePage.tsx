import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { api } from '../lib/api';

interface RecipeDetail {
  id: number;
  title: string;
  slotKeys: string[];
  instructions: string | null;
}

export default function ViewRecipePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState<RecipeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
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
    load();
  }, [id]);

  if (loading) return <div className="text-muted">Loading...</div>;
  if (notFound) return <div className="card padded text-center">Recipe not found</div>;
  if (error) return <div className="card padded text-center">{error}</div>;
  if (!recipe) return null;

  return (
    <div className="card padded" style={{ maxWidth: 800, margin: '0 auto' }}>
      <div className="space-between mb-2">
        <h1 className="h1" style={{ marginBottom: 0 }}>{recipe.title}</h1>
        <button
          onClick={() => navigate(`/recipe/edit/${id}`)}
          className="btn btn-ghost"
        >
          Edit
        </button>
      </div>

      <div className="mb-4">
        <div className="flex" style={{ gap: '6px', flexWrap: 'wrap' }}>
          {recipe.slotKeys.map((key) => (
            <span key={key} className="badge">{key}</span>
          ))}
          {recipe.slotKeys.length === 0 && (
            <span className="text-muted">No meal types specified.</span>
          )}
        </div>
      </div>

      <section>
        <h2 className="h3 mb-2">Instructions</h2>
        {recipe.instructions && recipe.instructions.trim() ? (
          <div className="prose" style={{ whiteSpace: 'normal' }}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {recipe.instructions}
            </ReactMarkdown>
          </div>
        ) : (
          <div className="text-muted">No instructions provided.</div>
        )}
      </section>
    </div>
  );
}
