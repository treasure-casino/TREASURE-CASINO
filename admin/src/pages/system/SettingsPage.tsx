import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { SystemSettingItem } from '../../types';
import {
  Settings,
  Shield,
  Save,
  CheckCircle,
  AlertCircle,
  Loader2,
  Lock,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<SystemSettingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Local form state map
  const [formValues, setFormValues] = useState<Record<string, string>>({});

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get('/api/admin/settings');
      if (res.data.success && res.data.data) {
        setSettings(res.data.data);
        const map: Record<string, string> = {};
        res.data.data.forEach((s: SystemSettingItem) => {
          map[s.key] = s.value;
        });
        setFormValues(map);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to fetch system settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleUpdate = async (key: string) => {
    try {
      setSavingKey(key);
      setError(null);
      const value = formValues[key];

      const res = await apiClient.put('/api/admin/settings', { key, value });
      if (res.data.success) {
        setActionSuccess(`Setting "${key}" updated successfully.`);
        setTimeout(() => setActionSuccess(null), 3000);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || `Failed to update setting "${key}"`);
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Top Header */}
      <div className="pb-6 border-b border-dark-800">
        <h1 className="text-2xl font-black tracking-wide text-white font-cinzel">
          SYSTEM CONFIGURATION
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Dynamic runtime platform parameters, regulatory simulation flags, and betting limits.
        </p>
      </div>

      {actionSuccess && (
        <div className="p-4 bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-sm rounded-xl flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-950/60 border border-rose-800 text-rose-300 text-sm rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="text-center py-16 text-gold">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" />
          <span className="text-sm font-cinzel">LOADING PLATFORM SETTINGS...</span>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Important Regulatory Card */}
          <div className="bg-dark-900 border border-amber-600/40 rounded-xl p-6 shadow-xl">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-amber-950/60 border border-amber-600/50 rounded-lg text-amber-400">
                <Lock className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-white font-cinzel">
                  Financial Simulation Control
                </h3>
                <p className="text-xs text-gray-300 mt-1 leading-relaxed">
                  Real-money financial processing remains disabled in compliance with Indian regulatory and provider approval directives.
                  All deposits and withdrawals are credited or reserved as simulated demo units.
                </p>

                <div className="mt-4 pt-4 border-t border-dark-800 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-mono font-bold text-gold">simulated_payments_only</span>
                    <span className="text-[11px] text-gray-400 block">Enforced strictly by server</span>
                  </div>
                  <span className="px-3 py-1 rounded bg-amber-950 border border-amber-800 text-amber-400 font-bold text-xs">
                    ACTIVE (LOCKED)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Editable Settings List */}
          <div className="bg-dark-900 border border-dark-800 rounded-xl p-6 space-y-6 shadow-xl">
            <h3 className="text-base font-bold text-white font-cinzel border-b border-dark-800 pb-3">
              Runtime Platform Parameters
            </h3>

            {settings
              .filter((s) => s.key !== 'simulated_payments_only')
              .map((setting) => (
                <div
                  key={setting.id}
                  className="p-4 bg-dark-950 border border-dark-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex-1">
                    <div className="text-sm font-bold text-white font-mono">{setting.key}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{setting.description || 'System setting'}</div>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                    <input
                      type="text"
                      value={formValues[setting.key] ?? setting.value}
                      onChange={(e) =>
                        setFormValues({ ...formValues, [setting.key]: e.target.value })
                      }
                      className="flex-1 sm:w-48 bg-dark-900 border border-dark-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gold font-mono min-w-0"
                    />

                    <button
                      onClick={() => handleUpdate(setting.key)}
                      disabled={savingKey === setting.key}
                      className="px-3.5 py-2 bg-dark-800 hover:bg-dark-700 border border-dark-700 hover:border-gold/50 rounded-lg text-xs font-semibold text-gold transition flex items-center gap-1.5 disabled:opacity-50 shrink-0"
                    >
                      {savingKey === setting.key ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Save className="w-3.5 h-3.5" />
                      )}
                      <span>Save</span>
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

