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
function IconHistory() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 3v5h5"/>
      <path d="M3.05 13A9 9 0 1 0 8 4.6"/>
      <path d="M12 7v5l3 3"/>
    </svg>
  );
}
function IconWeights() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M6 14V6a2 2 0 0 1 2-2h8"/>
      <path d="M6 18h12"/>
      <rect x="2" y="14" width="4" height="6" rx="1"/>
      <rect x="18" y="14" width="4" height="6" rx="1"/>
    </svg>
  );
}
function IconIssues() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="10"/>
      <path d="M12 8v4"/>
      <path d="M12 16h.01"/>
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
              <NavLink to="/plan" className={({ isActive }) => isActive ? 'active' : ''}>Meal Plan</NavLink>
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
        <NavLink to="/plan" className={({ isActive }) => isActive ? 'active' : ''} title="Meal Plan"><IconPlan /></NavLink>
        <NavLink to="/history" className={({ isActive }) => isActive ? 'active' : ''} title="History"><IconHistory /></NavLink>
        <NavLink to="/weights" className={({ isActive }) => isActive ? 'active' : ''} title="Weights"><IconWeights /></NavLink>
        <NavLink to="/issues" className={({ isActive }) => isActive ? 'active' : ''} title="Issues"><IconIssues /></NavLink>
        <NavLink to="/settings" className={({ isActive }) => isActive ? 'active' : ''} title="Settings"><IconSettings /></NavLink>
      </div>
    </div>
  );
}
