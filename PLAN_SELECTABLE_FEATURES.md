# Implementation Plan: Selectable Features

## Overview

Add a "Features" section to the Settings page that allows users to toggle menu items on/off. When disabled, menu items are hidden from navigation but pages remain accessible via direct URL.

### Requirements

- Add toggles for: Today, Planner, Recipes, History, Weights, Issues
- Settings cannot be toggled off (always visible)
- All features enabled by default
- Only hide menu items, not pages themselves

---

## Architecture Overview

**Current Structure:**
- **Frontend**: React + Vite with React Router, Context API for state management
- **Backend**: Hono with bun:sqlite + Drizzle ORM
- **Settings Storage**: SQLite database (`settings` table)
- **Navigation**: Dual navigation (mobile icon-based with overflow menu, desktop text-based)

**Menu Items:**
- Today (`/`)
- Planner (`/planner`)
- Recipes (`/recipes`)
- History (`/history`)
- Weights (`/weights`)
- Issues (`/issues`)
- Settings (`/settings`) - Must always be visible

---

## Implementation Phases

### Phase 1: Database Schema Changes

#### 1.1 Update Database Schema

**File**: `server/db/schema.ts`

Add new field to the `settings` table:
```typescript
export const settings = sqliteTable('settings', {
  // ... existing fields ...
  featuresEnabled: text('features_enabled')
    .notNull()
    .default('TODAY,PLANNER,RECIPES,HISTORY,WEIGHTS,ISSUES'),
});
```

**Rationale**: Store as comma-separated string for simplicity. This approach:
- Is simple to query and update
- Works well with SQLite
- Easy to migrate existing databases
- Validates easily on both client and server

#### 1.2 Create Database Migration

**File**: `server/db/migrate.ts`

Add migration logic in the `runMigrations()` function:

```typescript
// Check if features_enabled column exists
const settingsCols = sqlite.query(`PRAGMA table_info('settings')`).all() as Array<{ name: string }>;
const hasFeaturesEnabled = settingsCols.some((c) => c.name === 'features_enabled');

if (!hasFeaturesEnabled) {
  sqlite.run(`ALTER TABLE settings ADD COLUMN features_enabled TEXT NOT NULL DEFAULT 'TODAY,PLANNER,RECIPES,HISTORY,WEIGHTS,ISSUES'`);
  console.log('✓ Migrated: added features_enabled to settings');
}
```

---

### Phase 2: Backend API Updates

#### 2.1 Update Settings Route

**File**: `server/routes/settings.ts`

**Changes needed:**

1. Update the `updateSettingsSchema`:
```typescript
const updateSettingsSchema = z.object({
  reminders_enabled: z.boolean().optional(),
  time_format: z.enum(['12', '24']).optional(),
  first_day_of_week: z.number().int().min(0).max(6).optional(),
  features_enabled: z.string().optional(), // Add this
});
```

2. Update GET endpoint to return `features_enabled`
3. Update PUT endpoint to handle `features_enabled` updates

---

### Phase 3: Shared Types Updates

#### 3.1 Update Shared Types

**File**: `shared/types.ts`

Add new type definitions:
```typescript
export const FEATURE_KEYS = [
  'TODAY',
  'PLANNER',
  'RECIPES',
  'HISTORY',
  'WEIGHTS',
  'ISSUES',
] as const;

export type FeatureKey = typeof FEATURE_KEYS[number];
```

---

### Phase 4: Frontend API Client Updates

#### 4.1 Update API Client

**File**: `client/src/lib/api.ts`

Update the settings methods to include `featuresEnabled`:
- Add to GET response type
- Add to update method parameters
- Handle snake_case to camelCase conversion

---

### Phase 5: Settings Context (State Management)

#### 5.1 Create Settings Context

**New File**: `client/src/hooks/settings-context.ts`

```typescript
import { createContext } from 'react';
import type { FeatureKey } from '../../../shared/types';

export interface SettingsContextType {
  featuresEnabled: Set<FeatureKey>;
  isFeatureEnabled: (feature: FeatureKey) => boolean;
  toggleFeature: (feature: FeatureKey, enabled: boolean) => Promise<void>;
  loading: boolean;
}

export const SettingsContext = createContext<SettingsContextType | null>(null);
```

#### 5.2 Create Settings Provider

**New File**: `client/src/hooks/SettingsProvider.tsx`

Features:
- Loads feature settings from API on mount
- Provides `isFeatureEnabled()` check function
- Provides `toggleFeature()` update function
- Optimistic updates with error reversion
- Follows existing AuthProvider pattern

#### 5.3 Create Settings Hook

**New File**: `client/src/hooks/useSettings.tsx`

```typescript
import { useContext } from 'react';
import { SettingsContext } from './settings-context';

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return context;
}
```

---

### Phase 6: App Integration

#### 6.1 Wrap App with SettingsProvider

**File**: `client/src/App.tsx`

```typescript
import SettingsProvider from './hooks/SettingsProvider';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SettingsProvider>
          <Routes>
            {/* existing routes */}
          </Routes>
        </SettingsProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
```

**Note**: SettingsProvider goes inside AuthProvider because it needs authenticated API access.

---

### Phase 7: Update Navigation/Layout

#### 7.1 Update Layout Component

**File**: `client/src/components/Layout.tsx`

**Changes:**

1. Import and use `useSettings` hook
2. Wrap each navigation link (except Settings) with conditional rendering:
   ```typescript
   {isFeatureEnabled('TODAY') && <NavLink to="/" ...>Today</NavLink>}
   ```
3. Apply to both mobile and desktop navigation
4. Keep Settings link always visible (no conditional)

**Important**: Don't hide the overflow menu trigger button - users always need access to Settings and Logout.

---

### Phase 8: Update Settings Page

#### 8.1 Add Features Section

**File**: `client/src/pages/SettingsPage.tsx`

Add new "Features" section with toggle switches for each feature:

```typescript
<div className="card padded mb-4">
  <h2 className="h2">Features</h2>
  <p className="text-sm text-muted mb-3">
    Control which menu items appear in the navigation. Pages remain accessible via direct URL.
  </p>

  <div className="space-y-3">
    {/* Toggle for each feature */}
    <div className="space-between">
      <div>
        <div className="font-medium">Today</div>
        <div className="text-sm text-muted">Daily meal tracking</div>
      </div>
      <button
        onClick={() => toggleFeature('TODAY', !isFeatureEnabled('TODAY'))}
        className="toggle-btn"
      >
        <div className={`toggle ${isFeatureEnabled('TODAY') ? 'on' : ''}`}>
          <div className="toggle-knob" />
        </div>
      </button>
    </div>
    {/* ... repeat for each feature ... */}
  </div>
</div>
```

Include all 6 features plus a disabled Settings toggle to show it's always visible.

---

### Phase 9: Testing & Edge Cases

#### 9.1 Manual Testing Checklist

**Database Migration:**
- Test on existing database (column should be added)
- Test on fresh database (column should exist from start)
- Verify default value is correct

**Settings API:**
- GET `/api/settings` returns `features_enabled`
- PUT `/api/settings` accepts `features_enabled`
- Invalid values are rejected

**UI Behavior:**
- Toggle switches update immediately (optimistic)
- Changes persist after page reload
- Hidden menu items don't appear in navigation
- Pages are still accessible via direct URL
- Settings is always visible
- Mobile and desktop navigation both work correctly

**Edge Cases:**
- All features disabled except Settings
- Network error during save (should revert UI)
- Multiple browser tabs (changes in one should reflect in others after reload)
- Overflow menu behavior when all overflow items are hidden

#### 9.2 Potential Issues & Solutions

**Issue**: User disables all features and gets lost.
**Solution**: Settings can never be disabled, providing an escape hatch.

**Issue**: User navigates to disabled page via URL, then can't find navigation.
**Solution**: Pages remain functional when accessed directly. User can navigate to Settings or use browser back button.

---

## Implementation Sequence

**Recommended Order:**

1. **Backend First** (Phases 1-2):
   - Update schema
   - Add migration
   - Update settings route
   - Test API endpoints

2. **Shared Types** (Phase 3):
   - Update type definitions

3. **Frontend Data Layer** (Phases 4-5):
   - Update API client
   - Create Settings context, provider, and hook

4. **Integration** (Phases 6-8):
   - Wrap app with provider
   - Update Layout component
   - Update Settings page

5. **Testing** (Phase 9):
   - Test all scenarios
   - Fix any issues

**Estimated Time**: 3-4 hours for complete implementation and testing

---

## Critical Architectural Decisions

### Decision 1: Storage Format
**Chosen**: Comma-separated string in single column
**Alternatives**:
- Separate boolean columns (rejected: too many ALTER TABLE statements)
- JSON column (rejected: harder to query in SQLite)
- Separate table (rejected: overkill for single-user app)

### Decision 2: State Management
**Chosen**: React Context API (SettingsContext)
**Alternatives**:
- Local state in Layout (rejected: Settings page needs access)
- Global state library (rejected: overkill for this app)
- URL parameters (rejected: settings should persist)

### Decision 3: Default Behavior
**Chosen**: All features ON by default
**Rationale**: Existing users expect all features; new users can customize later

### Decision 4: Route Protection
**Chosen**: Hide menu items ONLY, pages remain accessible
**Rationale**:
- Simpler implementation
- Avoids navigation loops
- User has full control via URL
- Settings provides escape hatch

### Decision 5: Optimistic Updates
**Chosen**: Update UI immediately, revert on error
**Rationale**: Better UX, settings changes are low-risk

---

## Rollback Plan

If issues arise in production:

1. **Quick Fix**: Remove features section from Settings page UI (users can still access all features)
2. **Database Rollback**: Column is nullable, can ignore it
3. **Full Rollback**: Remove SettingsProvider from App.tsx, remove conditionals from Layout.tsx

---

## Files to Modify/Create

### Backend
- `server/db/schema.ts` - Add `featuresEnabled` field
- `server/db/migrate.ts` - Add migration for new column
- `server/routes/settings.ts` - Update GET/PUT endpoints

### Shared
- `shared/types.ts` - Add feature key types

### Frontend - New Files
- `client/src/hooks/settings-context.ts` - Context definition
- `client/src/hooks/SettingsProvider.tsx` - State management provider
- `client/src/hooks/useSettings.tsx` - Hook for consuming context

### Frontend - Modified Files
- `client/src/lib/api.ts` - Update settings API methods
- `client/src/App.tsx` - Wrap with SettingsProvider
- `client/src/components/Layout.tsx` - Conditional navigation rendering
- `client/src/pages/SettingsPage.tsx` - Add Features section UI

---

## Optional Future Enhancements

1. **Feature Descriptions**: Add help text explaining what each feature does
2. **Bulk Toggle**: "Enable All" / "Disable All" buttons
3. **Feature Groups**: Group related features (e.g., "Meal Tracking" group)
4. **URL Redirects**: Redirect disabled feature URLs to home page
5. **Analytics**: Track which features are most commonly disabled
6. **Multi-User Support**: Per-user feature toggles in multi-user environment
