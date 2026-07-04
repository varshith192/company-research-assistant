"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export interface AppSettings {
  model: string;
  discordBotToken: string;
  discordChannelId: string;
  applicantName: string;
  applicantEmail: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  model: "openai/gpt-4o-mini",
  discordBotToken: "",
  discordChannelId: "",
  applicantName: "",
  applicantEmail: "",
};

const STORAGE_KEY = "company-research-assistant:settings";

interface SettingsContextValue {
  settings: AppSettings;
  update: (patch: Partial<AppSettings>) => void;
  hasDiscordConfig: boolean;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

function readStoredSettings(): AppSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    // ignore malformed storage
  }
  return DEFAULT_SETTINGS;
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(readStoredSettings);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  function update(patch: Partial<AppSettings>) {
    setSettings((prev) => ({ ...prev, ...patch }));
  }

  const hasDiscordConfig = Boolean(
    settings.discordBotToken.trim() &&
      settings.discordChannelId.trim() &&
      settings.applicantName.trim() &&
      settings.applicantEmail.trim()
  );

  return (
    <SettingsContext.Provider value={{ settings, update, hasDiscordConfig }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used inside SettingsProvider");
  return ctx;
}
