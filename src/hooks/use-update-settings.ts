import * as React from "react";

interface UpdateSettings {
  autoNotifyOnStartup: boolean;
  lastCheckedAt: string | null;
}

const DEFAULT_SETTINGS: UpdateSettings = {
  autoNotifyOnStartup: true,
  lastCheckedAt: null,
};

const STORAGE_KEY = "app_update_settings";

export function useUpdateSettings() {
  const [settings, setSettings] = React.useState<UpdateSettings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = React.useState(false);

  // Load settings from localStorage
  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      }
    } catch (err) {
      console.error("Failed to load update settings:", err);
    }
    setIsLoaded(true);
  }, []);

  // Save settings to localStorage
  const updateSettings = (newSettings: Partial<UpdateSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (err) {
      console.error("Failed to save update settings:", err);
    }
  };

  const toggleAutoNotify = () => {
    updateSettings({
      autoNotifyOnStartup: !settings.autoNotifyOnStartup,
    });
  };

  const setLastChecked = () => {
    updateSettings({
      lastCheckedAt: new Date().toISOString(),
    });
  };

  return {
    settings,
    isLoaded,
    updateSettings,
    toggleAutoNotify,
    setLastChecked,
  };
}
