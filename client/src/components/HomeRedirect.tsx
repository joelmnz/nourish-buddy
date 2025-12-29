import { Navigate } from 'react-router-dom';
import { useSettings } from '../hooks/useSettings';
import type { FeatureKey } from '../../../shared/types';

export default function HomeRedirect() {
  const { isFeatureEnabled, loading } = useSettings();

  if (loading) {
    return <div className="center" style={{ minHeight: '100vh' }}>Loading...</div>;
  }

  const featureRoutes: Array<{ feature: FeatureKey; path: string }> = [
    { feature: 'TODAY', path: '/today' },
    { feature: 'PLANNER', path: '/planner' },
    { feature: 'RECIPES', path: '/recipes' },
    { feature: 'HISTORY', path: '/history' },
    { feature: 'WEIGHTS', path: '/weights' },
    { feature: 'ISSUES', path: '/issues' },
  ];

  for (const { feature, path } of featureRoutes) {
    if (isFeatureEnabled(feature)) {
      return <Navigate to={path} replace />;
    }
  }

  return <Navigate to="/settings" replace />;
}
