import React from 'react';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import { adminApi } from '@/api/admin';
import { useSiteSettingsStore } from '@/store/siteSettingsStore';
import type { AdminAppSettings } from '@/types/admin';
import LogoutConfirmModal from '@/components/modals/LogoutConfirmModal';

const AdminSettingsPage: React.FC = () => {
  const applyPublicSettings = useSiteSettingsStore((state) => state.applyPublicSettings);

  const [settings, setSettings] = React.useState<AdminAppSettings | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [pendingSave, setPendingSave] = React.useState<AdminAppSettings | null>(null);

  React.useEffect(() => {
    const loadSettings = async () => {
      setLoading(true);
      try {
        const { data } = await adminApi.getAppSettings();
        setSettings(data.data);
      } catch {
        toast.error('Failed to load runtime settings.');
      } finally {
        setLoading(false);
      }
    };

    void loadSettings();
  }, []);

  const updateField = <K extends keyof AdminAppSettings>(key: K, value: AdminAppSettings[K]) => {
    setSettings((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const handleSave = async () => {
    if (!settings) {
      return;
    }

    if (settings.maintenanceEnabled) {
      setPendingSave(settings);
      return;
    }

    void saveSettings(settings);
  };

  const saveSettings = async (payload: AdminAppSettings) => {
    setSaving(true);
    try {
      const { data } = await adminApi.updateAppSettings({
        paymentsEnabled: payload.paymentsEnabled,
        paymentsDisabledMessage: payload.paymentsDisabledMessage,
        maintenanceEnabled: payload.maintenanceEnabled,
        maintenanceMessage: payload.maintenanceMessage,
        maintenanceGraceSeconds: payload.maintenanceGraceSeconds,
      });

      setSettings(data.data);
      applyPublicSettings({
        paymentsEnabled: data.data.paymentsEnabled,
        paymentsDisabledMessage: data.data.paymentsDisabledMessage,
        maintenanceEnabled: data.data.maintenanceEnabled,
        maintenanceMessage: data.data.maintenanceMessage,
        maintenanceGraceSeconds: data.data.maintenanceGraceSeconds,
      });
      toast.success('Settings updated successfully.');
    } catch {
      toast.error('Unable to update runtime settings.');
    } finally {
      setSaving(false);
      setPendingSave(null);
    }
  };

  const handleConfirmMaintenanceEnable = () => {
    if (!pendingSave) {
      return;
    }

    void saveSettings(pendingSave);
  };

  const handleCancelMaintenanceEnable = () => {
    setPendingSave(null);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold text-slate-900">Runtime Settings</h1>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
          Loading settings...
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold text-slate-900">Runtime Settings</h1>
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          Failed to load settings. Refresh and try again.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Runtime Settings</h1>
        <p className="mt-2 text-sm text-slate-500">
          Control payment availability and whole-site maintenance mode without redeploying.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Payment Controls</h2>
          <p className="mt-1 text-sm text-slate-500">Block or allow all payment actions site-wide.</p>

          <label className="mt-4 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <input
              type="checkbox"
              checked={settings.paymentsEnabled}
              onChange={(event) => updateField('paymentsEnabled', event.target.checked)}
              className="h-4 w-4"
            />
            <span className="text-sm font-medium text-slate-700">Enable online payments</span>
          </label>

          <div className="mt-4">
            <label className="mb-1 block text-sm font-medium text-slate-700">Disabled payments message</label>
            <textarea
              rows={3}
              value={settings.paymentsDisabledMessage}
              onChange={(event) => updateField('paymentsDisabledMessage', event.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
            />
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Maintenance Controls</h2>
          <p className="mt-1 text-sm text-slate-500">
            Turn on maintenance mode. Non-admin users will be redirected and logged out after the grace period.
          </p>

          <label className="mt-4 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <input
              type="checkbox"
              checked={settings.maintenanceEnabled}
              onChange={(event) => updateField('maintenanceEnabled', event.target.checked)}
              className="h-4 w-4"
            />
            <span className="text-sm font-medium text-slate-700">Enable maintenance mode</span>
          </label>

          <div className="mt-4">
            <label className="mb-1 block text-sm font-medium text-slate-700">Maintenance message</label>
            <textarea
              rows={4}
              value={settings.maintenanceMessage}
              onChange={(event) => updateField('maintenanceMessage', event.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
            />
          </div>

          <div className="mt-4">
            <label className="mb-1 block text-sm font-medium text-slate-700">Grace period (seconds)</label>
            <input
              type="number"
              min={10}
              max={600}
              value={settings.maintenanceGraceSeconds}
              onChange={(event) =>
                updateField('maintenanceGraceSeconds', Math.max(10, Math.min(600, Number(event.target.value) || 60)))
              }
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
            />
          </div>
        </section>
      </div>

      <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-4">
        <p className="text-xs text-slate-500">
          Last updated: {settings.updatedAt ? new Date(settings.updatedAt).toLocaleString() : 'Unknown'}
        </p>
        <Button type="button" onClick={() => void handleSave()} isLoading={saving}>
          Save Settings
        </Button>
      </div>

      <LogoutConfirmModal
        isOpen={!!pendingSave}
        onClose={handleCancelMaintenanceEnable}
        onConfirm={handleConfirmMaintenanceEnable}
        title="Enable maintenance mode?"
        message="This will redirect non-admin users to the maintenance page and log them out after the grace period. Admin access will remain available."
        confirmLabel="Yes, enable maintenance"
      />
    </div>
  );
};

export default AdminSettingsPage;
