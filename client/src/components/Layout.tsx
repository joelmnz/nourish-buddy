import { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useSettings } from '../hooks/useSettings';

function IconToday() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <path d="M16 2v4M8 2v4M3 10h18"/>
    </svg>
  );
}
function IconPlanner() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <path d="M16 2v4M8 2v4M3 10h18"/>
      <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01"/>
    </svg>
  );
}
function IconRecipes() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2"/>
      <path d="M7 2v20"/>
      <path d="M21 15V2v0a5 5 0 00-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/>
    </svg>
  );
}
function IconIssues() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="10"/>
      <path d="M12 8v4M12 16h.01"/>
    </svg>
  );
}
function IconHistory() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  );
}
function IconWeights() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M6 18L18 6"/>
      <path d="M8 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0z"/>
      <path d="M20 16a2 2 0 1 1-4 0 2 2 0 0 1 4 0z"/>
    </svg>
  );
}
function IconDots() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="5" cy="12" r="1"/>
      <circle cx="12" cy="12" r="1"/>
      <circle cx="19" cy="12" r="1"/>
    </svg>
  );
}

export default function Layout() {
  const { logout } = useAuth();
  const { isFeatureEnabled } = useSettings();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const location = useLocation();

  useEffect(() => {
    // Close overflow menu on navigation
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!menuRef.current) return;
      if (menuRef.current.contains(e.target as Node)) return;
      setMenuOpen(false);
    }
    if (menuOpen) {
      document.addEventListener('click', onDocClick);
    }
    return () => document.removeEventListener('click', onDocClick);
  }, [menuOpen]);

  useEffect(() => {
    // When menu opens, move focus to first item
    if (menuOpen) {
      const first = menuRef.current?.querySelector<HTMLAnchorElement | HTMLButtonElement>('.menu-panel a, .menu-panel .menu-logout');
      first?.focus();
    }
  }, [menuOpen]);

  function onTriggerKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    if (e.key === 'ArrowDown' && !menuOpen) {
      e.preventDefault();
      setMenuOpen(true);
    } else if (e.key === 'Escape' && menuOpen) {
      e.preventDefault();
      setMenuOpen(false);
      triggerRef.current?.focus();
    }
  }

  function onMenuKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const items = menuRef.current?.querySelectorAll<HTMLAnchorElement | HTMLButtonElement>('.menu-panel a, .menu-panel .menu-logout');
    if (!items || items.length === 0) return;

    const currentIndex = Array.from(items).findIndex((el) => el === document.activeElement);

    if (e.key === 'Escape') {
      e.preventDefault();
      setMenuOpen(false);
      triggerRef.current?.focus();
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % items.length : 0;
      items[nextIndex].focus();
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = currentIndex >= 0 ? (currentIndex - 1 + items.length) % items.length : items.length - 1;
      items[prevIndex].focus();
      return;
    }
    if (e.key === 'Home') {
      e.preventDefault();
      items[0].focus();
      return;
    }
    if (e.key === 'End') {
      e.preventDefault();
      items[items.length - 1].focus();
      return;
    }
  }

  return (
    <div className="app">
      <nav className="topbar">
        <div className="container topbar-inner">
          <div className="brand">
            <NavLink to="/">
              <span className="brand-full">Nourish Buddy</span>
              <span className="brand-short">nB</span>
            </NavLink>
          </div>

          {/* Mobile icon nav */}
          <div className="mobile-nav" aria-label="Primary navigation">
            {isFeatureEnabled('TODAY') && <NavLink to="/today" aria-label="Today" title="Today" className={({ isActive }) => isActive ? 'active' : ''}><IconToday /></NavLink>}
            {isFeatureEnabled('PLANNER') && <NavLink to="/planner" aria-label="Planner" title="Planner" className={({ isActive }) => isActive ? 'active' : ''}><IconPlanner /></NavLink>}
            {isFeatureEnabled('RECIPES') && <NavLink to="/recipes" aria-label="Recipes" title="Recipes" className={({ isActive }) => isActive ? 'active' : ''}><IconRecipes /></NavLink>}
            {isFeatureEnabled('ISSUES') && <NavLink to="/issues" aria-label="Issues" title="Issues" className={({ isActive }) => isActive ? 'active' : ''}><IconIssues /></NavLink>}
            {isFeatureEnabled('HISTORY') && <NavLink to="/history" aria-label="History" title="History" className={({ isActive }) => isActive ? 'active' : ''}><IconHistory /></NavLink>}
            {isFeatureEnabled('WEIGHTS') && <NavLink to="/weights" aria-label="Weights" title="Weights" className={({ isActive }) => isActive ? 'active' : ''}><IconWeights /></NavLink>}
            <div className="overflow-menu" ref={menuRef}>
              <button
                ref={triggerRef}
                id="overflow-trigger"
                className="overflow-trigger"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                aria-controls="overflow-menu-panel"
                onKeyDown={onTriggerKeyDown}
                onClick={() => setMenuOpen((v) => !v)}
                title="More"
              >
                <IconDots />
              </button>
              {menuOpen && (
                <div
                  id="overflow-menu-panel"
                  className="menu-panel"
                  role="menu"
                  aria-labelledby="overflow-trigger"
                  onKeyDown={onMenuKeyDown}
                >
                  <NavLink to="/settings" role="menuitem">Settings</NavLink>
                  <button onClick={logout} role="menuitem" className="menu-logout">Logout</button>
                </div>
              )}
            </div>
          </div>

          {/* Desktop text nav */}
          <div className="nav" aria-label="Primary">
            {isFeatureEnabled('TODAY') && <NavLink to="/today" className={({ isActive }) => isActive ? 'active' : ''}>Today</NavLink>}
            {isFeatureEnabled('PLANNER') && <NavLink to="/planner" className={({ isActive }) => isActive ? 'active' : ''}>Planner</NavLink>}
            {isFeatureEnabled('RECIPES') && <NavLink to="/recipes" className={({ isActive }) => isActive ? 'active' : ''}>Recipes</NavLink>}
            {isFeatureEnabled('HISTORY') && <NavLink to="/history" className={({ isActive }) => isActive ? 'active' : ''}>History</NavLink>}
            {isFeatureEnabled('WEIGHTS') && <NavLink to="/weights" className={({ isActive }) => isActive ? 'active' : ''}>Weights</NavLink>}
            {isFeatureEnabled('ISSUES') && <NavLink to="/issues" className={({ isActive }) => isActive ? 'active' : ''}>Issues</NavLink>}
            <NavLink to="/settings" className={({ isActive }) => isActive ? 'active' : ''}>Settings</NavLink>
          </div>
          <button onClick={logout} className="btn btn-ghost logout-desktop">Logout</button>
        </div>
      </nav>

      <main className="container main">
        <Outlet />
      </main>
    </div>
  );
}
