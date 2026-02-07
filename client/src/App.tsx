import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AuthProvider from './hooks/AuthProvider';
import SettingsProvider from './hooks/SettingsProvider';
import { useAuth } from './hooks/useAuth';
import LoginPage from './pages/LoginPage';
import Layout from './components/Layout';
import HomeRedirect from './components/HomeRedirect';

// ⚡ Bolt: Lazy load pages to split code and reduce initial bundle size
// This prevents loading heavy libraries (like Chart.js in History/Weights pages)
// on the initial load of the application.
const TodayPage = lazy(() => import('./pages/TodayPage'));
const WeeklyPlannerPage = lazy(() => import('./pages/WeeklyPlannerPage'));
const RecipesPage = lazy(() => import('./pages/RecipesPage'));
const ViewRecipePage = lazy(() => import('./pages/ViewRecipePage'));
const EditRecipePage = lazy(() => import('./pages/EditRecipePage'));
const HistoryPage = lazy(() => import('./pages/HistoryPage'));
const WeightsPage = lazy(() => import('./pages/WeightsPage'));
const IssuesPage = lazy(() => import('./pages/IssuesPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div className="center" style={{ minHeight: '100vh' }}>Loading...</div>;
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
}

function LoadingFallback() {
  return <div className="center" style={{ minHeight: '100vh' }}>Loading...</div>;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <SettingsProvider>
                    <Layout />
                  </SettingsProvider>
                </ProtectedRoute>
              }
            >
              <Route index element={<HomeRedirect />} />
              <Route path="today" element={<TodayPage />} />
              <Route path="planner" element={<WeeklyPlannerPage />} />
              <Route path="recipes" element={<RecipesPage />} />
              <Route path="recipe/:id" element={<ViewRecipePage />} />
              <Route path="recipe/edit/:id" element={<EditRecipePage />} />
              <Route path="history" element={<HistoryPage />} />
              <Route path="weights" element={<WeightsPage />} />
              <Route path="issues" element={<IssuesPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
