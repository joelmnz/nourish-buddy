import { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';
import { getLocalDateString } from '../lib/date-utils';
import { useSettings } from '../hooks/useSettings';
import SettingsToggle from '../components/SettingsToggle';
import type { FeatureKey, TimeFormat } from '../../../shared/types';

const FEATURE_CONFIG: Array<{ key: FeatureKey; title: string; description: string }> = [
  { key: 'TODAY', title: 'Today', description: 'Daily meal tracking' },
  { key: 'PLANNER', title: 'Planner', description: 'Weekly meal planning' },
  { key: 'RECIPES', title: 'Recipes', description: 'Recipe management' },
  { key: 'HISTORY', title: 'History', description: 'Meal history logs' },
  { key: 'WEIGHTS', title: 'Weights', description: 'Weight tracking' },
  { key: 'ISSUES', title: 'Issues', description: 'Health issue tracking' },
];

function urlBase64ToUint8Array(base64String?: string) {
  if (!base64String) return new Uint8Array();
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

type PushSubscription = {
  id: number;
  endpoint: string;
  tz: string;
  userAgent: string | null;
  platform: string | null;
  deviceName: string | null;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  lastSeenAt: string | null;
};

export default function SettingsPage() {
  const { isFeatureEnabled, toggleFeature, loading: featuresLoading } = useSettings();
  const [settings, setSettings] = useState<{ remindersEnabled: boolean; timeFormat: TimeFormat; firstDayOfWeek: number; goalKg: number | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState<'meals' | 'weights' | null>(null);
  const [testingPush, setTestingPush] = useState(false);
  const [mealSlots, setMealSlots] = useState<Array<{ slotKey: string; orderIndex: number; time24h: string; name: string; notes: string | null }>>([]);
  const [slotChanges, setSlotChanges] = useState(false);
  const [subscriptions, setSubscriptions] = useState<PushSubscription[]>([]);
  const [currentEndpoint, setCurrentEndpoint] = useState<string | null>(null);
  const [editingDeviceName, setEditingDeviceName] = useState<{ id: number; name: string } | null>(null);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const goalKgDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadSettings();
    loadMealSlots();
    loadSubscriptions();
    detectCurrentEndpoint();

    return () => {
      if (goalKgDebounceRef.current) {
        clearTimeout(goalKgDebounceRef.current);
      }
    };
  }, []);

  async function detectCurrentEndpoint() {
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        setCurrentEndpoint(subscription.endpoint);
      }
    } catch (error) {
      console.error('Failed to detect current endpoint:', error);
    }
  }

  async function loadSettings() {
    try {
      const data = await api.settings.get();
      setSettings(data);
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadMealSlots() {
    try {
      const data = await api.mealPlan.get();
      setMealSlots(data);
    } catch (error) {
      console.error('Failed to load meal slots:', error);
    }
  }

  async function loadSubscriptions() {
    setLoadingDevices(true);
    try {
      const subs = await api.push.subscriptions();
      setSubscriptions(subs);
    } catch (error) {
      console.error('Failed to load subscriptions:', error);
    } finally {
      setLoadingDevices(false);
    }
  }

  async function updateSetting(key: keyof { remindersEnabled: boolean; timeFormat: TimeFormat; firstDayOfWeek: number; goalKg: number | null }, value: boolean | string | number | null) {
    if (!settings) return;

    const updated = { ...settings };
    if (key === 'remindersEnabled') updated.remindersEnabled = value as boolean;
    if (key === 'timeFormat') updated.timeFormat = (value ? '24' : '12') as TimeFormat;
    if (key === 'firstDayOfWeek') updated.firstDayOfWeek = value as number;
    if (key === 'goalKg') updated.goalKg = value as number | null;

    setSettings(updated);

    if (key === 'goalKg') {
      if (goalKgDebounceRef.current) clearTimeout(goalKgDebounceRef.current);
      goalKgDebounceRef.current = setTimeout(async () => {
        setSaving(true);
        try {
          await api.settings.update({ goalKg: value as number | null });
        } catch (error) {
          console.error('Failed to update goal weight:', error);
          // If the update fails, we might want to reload settings or show an error
          // For now, we'll follow the existing pattern
        } finally {
          setSaving(false);
          goalKgDebounceRef.current = null;
        }
      }, 750); // Slightly longer debounce for weight typing
      return;
    }

    setSaving(true);

    try {
      if (key === 'remindersEnabled') {
        await api.settings.update({ remindersEnabled: value as boolean });
      }
      if (key === 'timeFormat') {
        await api.settings.update({ timeFormat: value ? '24' : '12' });
      }
      if (key === 'firstDayOfWeek') {
        await api.settings.update({ firstDayOfWeek: value as number });
      }
    } catch (error) {
      console.error('Failed to update setting:', error);
      setSettings(settings);
    } finally {
      setSaving(false);
    }
  }

  function updateSlot(slotKey: string, field: 'time24h' | 'name' | 'notes', value: string) {
    setMealSlots((prev) =>
      prev.map((item) =>
        item.slotKey === slotKey ? { ...item, [field]: value } : item
      )
    );
    setSlotChanges(true);
  }

  async function saveMealSlots() {
    setSaving(true);
    try {
      await api.mealPlan.update(mealSlots);
      setSlotChanges(false);
    } catch (error) {
      console.error('Failed to save meal slots:', error);
    } finally {
      setSaving(false);
    }
  }

  async function exportData(type: 'meals' | 'weights') {
    setExporting(type);
    try {
      const blob = type === 'meals' ? await api.export.meals() : await api.export.weights();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nourish-buddy-${type}-${getLocalDateString()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(`Failed to export ${type}:`, error);
    } finally {
      setExporting(null);
    }
  }

  async function testNotification() {
    setTestingPush(true);
    try {
      if (!('Notification' in window)) {
        alert('This browser does not support notifications');
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        alert('Notification permission denied');
        return;
      }

      const config = await api.push.config();
      if (!config.enabled || !config.publicKey) {
        alert('Push notifications are not configured on the server');
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(config.publicKey),
      });

      const json = subscription.toJSON();
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      await api.push.subscribe({ endpoint: json.endpoint!, keys: { p256dh: json.keys!.p256dh!, auth: json.keys!.auth! }, tz });

      // Reload subscriptions to show the new device
      await loadSubscriptions();
      await detectCurrentEndpoint();

      new Notification('Nourish Buddy', {
        body: 'Test notification sent successfully!',
        icon: '/icon.svg',
      });
    } catch (error) {
      console.error('Failed to test notification:', error);
      alert('Failed to send test notification. Check console for details.');
    } finally {
      setTestingPush(false);
    }
  }

  async function toggleDeviceEnabled(id: number, enabled: boolean) {
    try {
      await api.push.updateSubscription(id, { enabled });
      setSubscriptions((prev) =>
        prev.map((sub) => (sub.id === id ? { ...sub, enabled } : sub))
      );
    } catch (error) {
      console.error('Failed to toggle device:', error);
      alert('Failed to update device. Please try again.');
    }
  }

  async function saveDeviceName(id: number, name: string) {
    try {
      await api.push.updateSubscription(id, { deviceName: name });
      setSubscriptions((prev) =>
        prev.map((sub) => (sub.id === id ? { ...sub, deviceName: name } : sub))
      );
      setEditingDeviceName(null);
    } catch (error) {
      console.error('Failed to save device name:', error);
      alert('Failed to save device name. Please try again.');
    }
  }

  async function deleteDevice(id: number, isCurrent: boolean) {
    const confirmMessage = isCurrent
      ? 'Are you sure you want to remove this device (current device)? You will need to re-enable notifications on this device.'
      : 'Are you sure you want to remove this device?';

    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      await api.push.deleteSubscription(id);
      setSubscriptions((prev) => prev.filter((sub) => sub.id !== id));
      if (isCurrent) {
        setCurrentEndpoint(null);
      }
    } catch (error) {
      console.error('Failed to delete device:', error);
      alert('Failed to delete device. Please try again.');
    }
  }

  function formatLastSeen(lastSeenAt: string | null): string {
    if (!lastSeenAt) return 'Never';
    const date = new Date(lastSeenAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }


  if (loading) {
    return <div className="text-muted">Loading...</div>;
  }

  if (!settings) {
    return <div className="text-muted">Failed to load settings</div>;
  }

  return (
    <div>
      <h1 className="h1 mb-4">Settings</h1>

      <div className="card padded mb-4">
        <h2 className="h2">Preferences</h2>
        <div className="mt-3">
          <SettingsToggle
            title="Reminders"
            description="Enable meal time reminders"
            checked={settings.remindersEnabled}
            onChange={(checked) => updateSetting('remindersEnabled', checked)}
          />
        </div>

        <div className="mt-3">
          <SettingsToggle
            title="24-Hour Time"
            description="Use 24-hour time format"
            checked={settings.timeFormat === '24'}
            onChange={(checked) => updateSetting('timeFormat', checked)}
          />
        </div>

        <div className="mt-3">
          <label htmlFor="firstDayOfWeek" className="block text-sm text-muted mb-2">
            First Day Of Week
          </label>
          <div className="text-sm text-muted mb-2">Controls the start of the week in the planner</div>
          <select
            id="firstDayOfWeek"
            value={settings.firstDayOfWeek}
            onChange={(e) => updateSetting('firstDayOfWeek', parseInt(e.target.value))}
            className="input"
          >
            <option value={0}>Sunday</option>
            <option value={1}>Monday</option>
            <option value={2}>Tuesday</option>
            <option value={3}>Wednesday</option>
            <option value={4}>Thursday</option>
            <option value={5}>Friday</option>
            <option value={6}>Saturday</option>
          </select>
        </div>

        <div className="mt-3">
          <label htmlFor="goalKg" className="block text-sm text-muted mb-2">
            Goal Weight (kg)
          </label>
          <div className="text-sm text-muted mb-2">Set your target weight to track progress</div>
          <input
            id="goalKg"
            type="number"
            step="0.1"
            min="1"
            max="500"
            value={settings.goalKg ?? ''}
            onChange={(e) => {
              const value = e.target.value;
              const parsed = parseFloat(value);
              updateSetting('goalKg', value === '' ? null : (isNaN(parsed) ? null : parsed));
            }}
            placeholder="Enter goal weight"
            className="input"
          />
        </div>
        {saving && <div className="mt-3 text-sm" style={{ color: 'rgb(74, 222, 128)' }}>Saving...</div>}
      </div>

      <div className="card padded mb-4">
        <h2 className="h2">Features</h2>
        <p className="text-sm text-muted mb-3">
          Control which menu items appear in the navigation. Pages remain accessible via direct URL.
        </p>

        <div className="space-y-3">
          {FEATURE_CONFIG.map(({ key, title, description }) => (
            <SettingsToggle
              key={key}
              title={title}
              description={description}
              checked={isFeatureEnabled(key)}
              onChange={(checked) => toggleFeature(key, checked)}
              disabled={featuresLoading}
            />
          ))}
        </div>
      </div>

      <div className="card padded mb-4">
        <div className="space-between mb-3">
          <h2 className="h2">Meal Times</h2>
          <button
            onClick={saveMealSlots}
            disabled={!slotChanges || saving}
            className={`btn ${slotChanges && !saving ? 'btn-primary' : 'btn-ghost'}`}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
        {slotChanges && (
          <div className="mb-3 text-sm" style={{ color: 'rgb(245, 158, 11)' }}>You have unsaved changes</div>
        )}
        <div className="space-y-3">
          {mealSlots.map((slot) => (
            <div key={slot.slotKey} className="grid" style={{ gridTemplateColumns: '120px 1fr 1fr', gap: '12px' }}>
              <div>
                <label className="block text-sm text-muted mb-2" htmlFor={`time-${slot.slotKey}`}>Time</label>
                <input
                  id={`time-${slot.slotKey}`}
                  type="time"
                  value={slot.time24h}
                  onChange={(e) => updateSlot(slot.slotKey, 'time24h', e.target.value)}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm text-muted mb-2" htmlFor={`name-${slot.slotKey}`}>Name</label>
                <input
                  id={`name-${slot.slotKey}`}
                  type="text"
                  value={slot.name}
                  onChange={(e) => updateSlot(slot.slotKey, 'name', e.target.value)}
                  placeholder="Meal name..."
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm text-muted mb-2" htmlFor={`notes-${slot.slotKey}`}>Notes</label>
                <input
                  id={`notes-${slot.slotKey}`}
                  type="text"
                  value={slot.notes || ''}
                  onChange={(e) => updateSlot(slot.slotKey, 'notes', e.target.value)}
                  placeholder="Optional notes..."
                  className="input"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card padded mb-4">
        <h2 className="h2">Notifications</h2>
        <button
          onClick={testNotification}
          disabled={testingPush}
          className={`btn mt-3 ${testingPush ? 'btn-ghost' : 'btn-primary'}`}
        >
          {testingPush ? 'Testing...' : 'Test Notification'}
        </button>
        <p className="mt-2 text-sm text-muted">
          This will request notification permissions and send a test notification
        </p>

        <div className="mt-6">
          <div className="space-between mb-3">
            <h3 className="font-medium">Registered Devices</h3>
            <button
              onClick={loadSubscriptions}
              disabled={loadingDevices}
              className="btn btn-ghost"
              style={{ fontSize: '0.875rem', padding: '4px 12px' }}
            >
              {loadingDevices ? 'Loading...' : 'Refresh'}
            </button>
          </div>

          {subscriptions.length === 0 && !loadingDevices && (
            <div className="text-sm text-muted">
              No devices registered. Use "Test Notification" to register this device.
            </div>
          )}

          {subscriptions.length > 0 && (
            <div className="space-y-3">
              {subscriptions.map((sub) => {
                const isCurrent = sub.endpoint === currentEndpoint;
                const isEditing = editingDeviceName?.id === sub.id;

                return (
                  <div
                    key={sub.id}
                    className="card padded"
                    style={{
                      backgroundColor: isCurrent ? 'rgba(74, 222, 128, 0.1)' : undefined,
                      border: isCurrent ? '1px solid rgb(74, 222, 128)' : undefined,
                    }}
                  >
                    <div className="space-between">
                      <div style={{ flex: 1 }}>
                        <div className="space-between mb-2">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {isEditing ? (
                              <input
                                type="text"
                                value={editingDeviceName.name}
                                onChange={(e) =>
                                  setEditingDeviceName({ id: sub.id, name: e.target.value })
                                }
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    saveDeviceName(sub.id, editingDeviceName.name);
                                  } else if (e.key === 'Escape') {
                                    setEditingDeviceName(null);
                                  }
                                }}
                                className="input"
                                style={{ fontSize: '1rem', padding: '4px 8px', width: '200px' }}
                                autoFocus
                              />
                            ) : (
                              <span className="font-medium">
                                {sub.deviceName || 'Unknown Device'}
                              </span>
                            )}
                            {isCurrent && (
                              <span
                                className="text-sm"
                                style={{
                                  color: 'rgb(74, 222, 128)',
                                  backgroundColor: 'rgba(74, 222, 128, 0.2)',
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                }}
                              >
                                This Device
                              </span>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            {isEditing ? (
                              <>
                                <button
                                  onClick={() => saveDeviceName(sub.id, editingDeviceName.name)}
                                  className="btn btn-primary"
                                  style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => setEditingDeviceName(null)}
                                  className="btn btn-ghost"
                                  style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() =>
                                  setEditingDeviceName({
                                    id: sub.id,
                                    name: sub.deviceName || '',
                                  })
                                }
                                className="btn btn-ghost"
                                style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                              >
                                Rename
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="text-sm text-muted">
                          {sub.platform || 'Unknown Platform'} • Last seen:{' '}
                          {formatLastSeen(sub.lastSeenAt)}
                        </div>
                        {!sub.enabled && (
                          <div
                            className="text-sm mt-2"
                            style={{ color: 'rgb(245, 158, 11)' }}
                          >
                            ⚠ Notifications disabled (needs re-enable)
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="space-between mt-3">
                      <button
                        onClick={() => toggleDeviceEnabled(sub.id, !sub.enabled)}
                        className="toggle-btn"
                        role="switch"
                        aria-checked={sub.enabled}
                        aria-label="Toggle device notifications"
                      >
                        <div className={`toggle ${sub.enabled ? 'on' : ''}`}>
                          <div className="toggle-knob" />
                        </div>
                      </button>
                      <button
                        onClick={() => deleteDevice(sub.id, isCurrent)}
                        className="btn"
                        style={{
                          fontSize: '0.875rem',
                          padding: '4px 12px',
                          color: 'rgb(239, 68, 68)',
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="card padded mb-4">
        <h2 className="h2">Export Data</h2>
        <div className="space-between mt-3">
          <div>
            <div className="font-medium">Meal History</div>
            <div className="text-sm text-muted">Export all meal logs to CSV</div>
          </div>
          <button
            onClick={() => exportData('meals')}
            disabled={exporting === 'meals'}
            className={`btn ${exporting === 'meals' ? 'btn-ghost' : 'btn-primary'}`}
          >
            {exporting === 'meals' ? 'Exporting...' : 'Export'}
          </button>
        </div>

        <div className="space-between mt-3">
          <div>
            <div className="font-medium">Weight History</div>
            <div className="text-sm text-muted">Export all weight entries to CSV</div>
          </div>
          <button
            onClick={() => exportData('weights')}
            disabled={exporting === 'weights'}
            className={`btn ${exporting === 'weights' ? 'btn-ghost' : 'btn-primary'}`}
          >
            {exporting === 'weights' ? 'Exporting...' : 'Export'}
          </button>
        </div>
      </div>

      <div className="mt-6 center">
        <img src="/nourish-buddy-logo.png" alt="Nourish Buddy logo" style={{ height: 64, width: 'auto' }} />
        <a
          href="https://github.com/joelmnz/nourish-buddy"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm"
          style={{ color: 'var(--accent)' }}
        >
          View project on GitHub
        </a>
      </div>
    </div>
  );
}
