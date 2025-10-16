import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card card padded">
        <h1 className="title">Nourish Buddy</h1>

        {error && (
          <div className="alert mb-3">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="grid gap-3">
          <div className="form-row">
            <label htmlFor="username" className="text-sm text-muted">Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
              className="input"
              placeholder="Enter username"
            />
          </div>

          <div className="form-row">
            <label htmlFor="password" className="text-sm text-muted">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="input"
              placeholder="Enter password"
            />
          </div>

          <button type="submit" disabled={loading} className={`btn ${loading ? 'btn-ghost' : 'btn-primary'}`}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="mt-3 text-sm text-muted center">Default credentials: admin / admin</p>
      </div>
    </div>
  );
}
