import { Outlet, NavLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

function IconToday() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <path d="M16 2v4M8 2v4M3 10h18"/>
    </svg>
  );
}
function IconPlan() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 5h18M3 12h18M3 19h18"/>
    </svg>
  );
}
function IconPlanner() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <path d="M16 2v4M8 2v4M3 10h18"/>
      <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01"/>
    </svg>
  );
}
function IconRecipes() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2"/>
      <path d="M7 2v20"/>
      <path d="M21 15V2v0a5 5 0 00-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/>
    </svg>
  );
}
function IconSettings() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.03A1.65 1.65 0 0 0 9 3.09V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.03a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.03c0 .62.22 1.22.62 1.69.4.47.62 1.07.62 1.69z"/>
    </svg>
  );
}

export default function Layout() {
  const { logout } = useAuth();

  return (
    <div className="app">
      <nav className="topbar">
        <div className="container topbar-inner">
          <div className="row">
            <div className="brand"><NavLink to="/">Nourish Buddy</NavLink></div>
            <div className="nav" aria-label="Primary">
              <NavLink to="/" end className={({ isActive }) => isActive ? 'active' : ''}>Today</NavLink>
              <NavLink to="/plan" className={({ isActive }) => isActive ? 'active' : ''}>Meal Times</NavLink>
              <NavLink to="/planner" className={({ isActive }) => isActive ? 'active' : ''}>Planner</NavLink>
              <NavLink to="/recipes" className={({ isActive }) => isActive ? 'active' : ''}>Recipes</NavLink>
              <NavLink to="/history" className={({ isActive }) => isActive ? 'active' : ''}>History</NavLink>
              <NavLink to="/weights" className={({ isActive }) => isActive ? 'active' : ''}>Weights</NavLink>
              <NavLink to="/issues" className={({ isActive }) => isActive ? 'active' : ''}>Issues</NavLink>
              <NavLink to="/settings" className={({ isActive }) => isActive ? 'active' : ''}>Settings</NavLink>
            </div>
          </div>
          <button onClick={logout} className="btn btn-ghost">Logout</button>
        </div>
      </nav>

      <main className="container main">
        <Outlet />
      </main>

      <div className="bottom-nav" aria-label="Mobile navigation">
        <NavLink to="/" end className={({ isActive }) => isActive ? 'active' : ''} title="Today"><IconToday /></NavLink>
        <NavLink to="/plan" className={({ isActive }) => isActive ? 'active' : ''} title="Meal Times"><IconPlan /></NavLink>
        <NavLink to="/planner" className={({ isActive }) => isActive ? 'active' : ''} title="Planner"><IconPlanner /></NavLink>
        <NavLink to="/recipes" className={({ isActive }) => isActive ? 'active' : ''} title="Recipes"><IconRecipes /></NavLink>
        <NavLink to="/settings" className={({ isActive }) => isActive ? 'active' : ''} title="Settings"><IconSettings /></NavLink>
      </div>
    </div>
  );
}
