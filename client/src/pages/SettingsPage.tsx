import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import type { TimeFormat } from '../../../shared/types';

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

export default function SettingsPage() {
  const [settings, setSettings] = useState<{ remindersEnabled: boolean; timeFormat: TimeFormat; startingMealPlanDate: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState<'meals' | 'weights' | null>(null);
  const [testingPush, setTestingPush] = useState(false);
  const [mealSlots, setMealSlots] = useState<Array<{ slotKey: string; orderIndex: number; time24h: string; name: string; notes: string | null }>>([]);
  const [slotChanges, setSlotChanges] = useState(false);

  useEffect(() => {
    loadSettings();
    loadMealSlots();
  }, []);

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

  async function updateSetting(key: keyof { remindersEnabled: boolean; timeFormat: TimeFormat; startingMealPlanDate: string | null }, value: boolean | string | null) {
    if (!settings) return;

    const updated = { ...settings, [key]: value };
    setSettings(updated);
    setSaving(true);

    try {
      if (key === 'remindersEnabled') {
        await api.settings.update({ remindersEnabled: value as boolean });
      }
      if (key === 'timeFormat') {
        await api.settings.update({ timeFormat: value ? '24' : '12' });
      }
      if (key === 'startingMealPlanDate') {
        await api.settings.update({ startingMealPlanDate: value as string | null });
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
      a.download = `nourish-buddy-${type}-${new Date().toISOString().split('T')[0]}.csv`;
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
      
      new Notification('Nourish Buddy', {
        body: 'Test notification sent successfully!',
        icon: '/vite.svg',
      });
    } catch (error) {
      console.error('Failed to test notification:', error);
      alert('Failed to send test notification. Check console for details.');
    } finally {
      setTestingPush(false);
    }
  }

  if (loading) {
    return <div className="text-muted">Loading...</div>;
  }

  if (!settings) {
    return <div className="text-muted">Failed to load settings</div>;
  }

  return (
    <div className="max-w-2xl">
      <h1 className="h1 mb-4">Settings</h1>

      <div className="card">
        <div className="padded">
          <h2 className="h2">Preferences</h2>
          <div className="mt-3">
            <div className="space-between">
              <div>
                <div className="font-medium">Reminders</div>
                <div className="text-sm text-muted">Enable meal time reminders</div>
              </div>
              <button
                 onClick={() => updateSetting('remindersEnabled', !settings.remindersEnabled)}
                className="toggle-btn"
                aria-label="Toggle reminders"
              >
                 <div className={`toggle ${settings.remindersEnabled ? 'on' : ''}`}>
                  <div className="toggle-knob" />
                </div>
              </button>
            </div>

            <div className="space-between mt-3">
              <div>
                <div className="font-medium">24-Hour Time</div>
                <div className="text-sm text-muted">Use 24-hour time format</div>
              </div>
              <button
                 onClick={() => updateSetting('timeFormat', settings.timeFormat === '12')}
                className="toggle-btn"
                aria-label="Toggle 24-hour time"
              >
                 <div className={`toggle ${settings.timeFormat === '24' ? 'on' : ''}`}>
                  <div className="toggle-knob" />
                </div>
              </button>
            </div>

            <div className="mt-3">
              <div className="font-medium">Starting Meal Plan Date</div>
              <div className="text-sm text-muted mb-2">The date when your meal plan starts (for weekly planning)</div>
              <input
                type="date"
                value={settings.startingMealPlanDate || ''}
                onChange={(e) => updateSetting('startingMealPlanDate', e.target.value || null)}
                className="input"
              />
            </div>
          </div>
          {saving && <div className="mt-3 text-sm" style={{ color: 'rgb(74, 222, 128)' }}>Saving...</div>}
        </div>

        <div className="padded">
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
              <div key={slot.slotKey} className="grid" style={{ gridTemplateColumns: '120px 1fr', gap: '12px' }}>
                <div>
                  <label className="text-sm text-muted" htmlFor={`time-${slot.slotKey}`}>Time</label>
                  <input
                    id={`time-${slot.slotKey}`}
                    type="time"
                    value={slot.time24h}
                    onChange={(e) => updateSlot(slot.slotKey, 'time24h', e.target.value)}
                    className="input"
                  />
                </div>
                <div>
                  <label className="text-sm text-muted" htmlFor={`name-${slot.slotKey}`}>Name</label>
                  <input
                    id={`name-${slot.slotKey}`}
                    type="text"
                    value={slot.name}
                    onChange={(e) => updateSlot(slot.slotKey, 'name', e.target.value)}
                    placeholder="Meal name..."
                    className="input"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="padded">
          <h2 className="h2">Notifications</h2>
          <button
            onClick={testNotification}
            disabled={testingPush}
            className={`btn ${testingPush ? 'btn-ghost' : 'btn-primary'}`}
          >
            {testingPush ? 'Testing...' : 'Test Notification'}
          </button>
          <p className="mt-2 text-sm text-muted">
            This will request notification permissions and send a test notification
          </p>
        </div>

        <div className="padded">
          <h2 className="h2">Export Data</h2>
          <div className="mt-3">
            <div className="space-between">
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
        </div>
      </div>
    </div>
  );
}
