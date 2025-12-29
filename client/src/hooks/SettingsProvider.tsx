import { useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { api } from '../lib/api';
import { SettingsContext } from './settings-context';
import { FEATURE_KEYS } from '../../../shared/types';
import type { FeatureKey } from '../../../shared/types';

export default function SettingsProvider({ children }: { children: ReactNode }) {
  const [featuresEnabled, setFeaturesEnabled] = useState<Set<FeatureKey>>(new Set());
  const [loading, setLoading] = useState(true);

  const loadSettings = useCallback(async () => {
    try {
      const settings = await api.settings.get();
      const features = settings.featuresEnabled.split(',').filter(Boolean) as FeatureKey[];
      setFeaturesEnabled(new Set(features));
    } catch (error) {
      console.error('Failed to load settings:', error);
      // Default to all features enabled on error
      setFeaturesEnabled(new Set([...FEATURE_KEYS]));
    } finally {
      setLoading(false);
    }
  }, []);

  const isFeatureEnabled = useCallback((feature: FeatureKey) => {
    return featuresEnabled.has(feature);
  }, [featuresEnabled]);

  const toggleFeature = useCallback(async (feature: FeatureKey, enabled: boolean) => {
    const newFeatures = new Set(featuresEnabled);
    if (enabled) {
      newFeatures.add(feature);
    } else {
      newFeatures.delete(feature);
    }

    setFeaturesEnabled(newFeatures);

    try {
      await api.settings.update({
        featuresEnabled: Array.from(newFeatures).join(','),
      });
    } catch (error) {
      console.error('Failed to update features:', error);
      // Revert on error
      setFeaturesEnabled(featuresEnabled);
    }
  }, [featuresEnabled]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  return (
    <SettingsContext.Provider value={{ featuresEnabled, isFeatureEnabled, toggleFeature, loading }}>
      {children}
    </SettingsContext.Provider>
  );
}
