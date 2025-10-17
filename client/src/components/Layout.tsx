import { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

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
function IconSettings() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.03A1.65 1.65 0 0 0 9 3.09V3a2 2 0 1 1 4 0v.09a1.65 1.65 0  0 0 1 1.51h.03a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.03c0 .62.22 1.22.62 1.69.4.47.62 1.07.62 1.69z"/>
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
          <div className="brand"><NavLink to="/">Nourish Buddy</NavLink></div>

          {/* Mobile icon nav */}
          <div className="mobile-nav" aria-label="Primary navigation">
            <NavLink to="/" end aria-label="Today" title="Today" className={({ isActive }) => isActive ? 'active' : ''}><IconToday /></NavLink>
            <NavLink to="/planner" aria-label="Planner" title="Planner" className={({ isActive }) => isActive ? 'active' : ''}><IconPlanner /></NavLink>
            <NavLink to="/recipes" aria-label="Recipes" title="Recipes" className={({ isActive }) => isActive ? 'active' : ''}><IconRecipes /></NavLink>
            <NavLink to="/settings" aria-label="Settings" title="Settings" className={({ isActive }) => isActive ? 'active' : ''}><IconSettings /></NavLink>
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
                  <NavLink to="/history" role="menuitem">History</NavLink>
                  <NavLink to="/weights" role="menuitem">Weights</NavLink>
                  <NavLink to="/issues" role="menuitem">Issues</NavLink>
                  <button onClick={logout} role="menuitem" className="menu-logout">Logout</button>
                </div>
              )}
            </div>
          </div>

          {/* Desktop text nav */}
          <div className="nav" aria-label="Primary">
            <NavLink to="/" end className={({ isActive }) => isActive ? 'active' : ''}>Today</NavLink>
            <NavLink to="/planner" className={({ isActive }) => isActive ? 'active' : ''}>Planner</NavLink>
            <NavLink to="/recipes" className={({ isActive }) => isActive ? 'active' : ''}>Recipes</NavLink>
            <NavLink to="/history" className={({ isActive }) => isActive ? 'active' : ''}>History</NavLink>
            <NavLink to="/weights" className={({ isActive }) => isActive ? 'active' : ''}>Weights</NavLink>
            <NavLink to="/issues" className={({ isActive }) => isActive ? 'active' : ''}>Issues</NavLink>
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
