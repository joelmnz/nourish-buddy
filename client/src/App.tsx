import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AuthProvider from './hooks/AuthProvider';
import { useAuth } from './hooks/useAuth';
import LoginPage from './pages/LoginPage';
import Layout from './components/Layout';
import TodayPage from './pages/TodayPage';
import MealPlanPage from './pages/MealPlanPage';
import WeeklyPlannerPage from './pages/WeeklyPlannerPage';
import RecipesPage from './pages/RecipesPage';
import HistoryPage from './pages/HistoryPage';
import WeightsPage from './pages/WeightsPage';
import IssuesPage from './pages/IssuesPage';
import SettingsPage from './pages/SettingsPage';
import ViewRecipePage from './pages/ViewRecipePage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div className="center" style={{ minHeight: '100vh' }}>Loading...</div>;
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<TodayPage />} />
            <Route path="plan" element={<MealPlanPage />} />
            <Route path="planner" element={<WeeklyPlannerPage />} />
            <Route path="recipes" element={<RecipesPage />} />
            <Route path="recipe/:id" element={<ViewRecipePage />} />
            <Route path="history" element={<HistoryPage />} />
            <Route path="weights" element={<WeightsPage />} />
            <Route path="issues" element={<IssuesPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
