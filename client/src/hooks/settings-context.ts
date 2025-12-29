import { createContext } from 'react';
import type { FeatureKey } from '../../../shared/types';

export interface SettingsContextType {
  featuresEnabled: Set<FeatureKey>;
  isFeatureEnabled: (feature: FeatureKey) => boolean;
  toggleFeature: (feature: FeatureKey, enabled: boolean) => Promise<void>;
  loading: boolean;
}

export const SettingsContext = createContext<SettingsContextType | null>(null);
