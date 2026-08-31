"use client";

import { useEffect, useRef, useState } from "react";

type ThemePref = "system" | "light" | "dark";
type FontSize = "sm" | "base" | "lg" | "xl";
type Contrast = "normal" | "high";
type Motion = "normal" | "reduced";

type Settings = {
  theme: ThemePref;
  fontSize: FontSize;
  contrast: Contrast;
  motion: Motion;
};

const STORAGE_KEY = "pw-a11y";

const DEFAULTS: Settings = {
  theme: "system",
  fontSize: "base",
  contrast: "normal",
  motion: "normal",
};

function resolveTheme(pref: ThemePref): "light" | "dark" {
  if (pref === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return pref;
}

function applySettings(settings: Settings) {
  const html = document.documentElement;
  html.setAttribute("data-theme", resolveTheme(settings.theme));

  if (settings.fontSize === "base") {
    html.removeAttribute("data-font-size");
  } else {
    html.setAttribute("data-font-size", settings.fontSize);
  }

  if (settings.contrast === "high") {
    html.setAttribute("data-contrast", "high");
  } else {
    html.removeAttribute("data-contrast");
  }

  if (settings.motion === "reduced") {
    html.setAttribute("data-motion", "reduced");
  } else {
    html.removeAttribute("data-motion");
  }
}

export default function AccessibilityWidget() {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const panelRef = useRef<HTMLDivElement>(null);

  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setSettings({ ...DEFAULTS, ...JSON.parse(raw) });
    } catch {
      // ignore malformed storage
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    applySettings(settings);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // ignore storage failures (private browsing, etc.)
    }
  }, [settings, hydrated]);

  useEffect(() => {
    if (settings.theme !== "system") return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applySettings(settings);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [settings]);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div ref={panelRef} className="fixed bottom-5 left-5 z-50">
      {open && (
        <div className="mb-3 w-72 rounded-lg border border-border bg-background p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Accessibility Options</h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close accessibility options"
              className="text-foreground/50 hover:text-foreground"
            >
              ✕
            </button>
          </div>

          <fieldset className="mt-4">
            <legend className="text-xs font-medium text-foreground/60">
              Text size
            </legend>
            <div className="mt-2 grid grid-cols-4 gap-1">
              {(
                [
                  ["sm", "A−"],
                  ["base", "A"],
                  ["lg", "A+"],
                  ["xl", "A++"],
                ] as [FontSize, string][]
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => update("fontSize", value)}
                  aria-pressed={settings.fontSize === value}
                  className={
                    "rounded-md border py-1.5 text-xs font-medium transition-colors " +
                    (settings.fontSize === value
                      ? "border-navy bg-navy text-white dark:border-baby-blue dark:bg-baby-blue dark:text-navy"
                      : "border-border hover:bg-surface-hover")
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="mt-4">
            <legend className="text-xs font-medium text-foreground/60">
              Theme
            </legend>
            <div className="mt-2 grid grid-cols-3 gap-1">
              {(
                [
                  ["light", "Light"],
                  ["dark", "Dark"],
                  ["system", "System"],
                ] as [ThemePref, string][]
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => update("theme", value)}
                  aria-pressed={settings.theme === value}
                  className={
                    "rounded-md border py-1.5 text-xs font-medium transition-colors " +
                    (settings.theme === value
                      ? "border-navy bg-navy text-white dark:border-baby-blue dark:bg-baby-blue dark:text-navy"
                      : "border-border hover:bg-surface-hover")
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>

          <label className="mt-4 flex items-center justify-between text-xs font-medium text-foreground/60">
            High contrast
            <input
              type="checkbox"
              checked={settings.contrast === "high"}
              onChange={(e) =>
                update("contrast", e.target.checked ? "high" : "normal")
              }
              className="h-4 w-4 accent-navy dark:accent-baby-blue"
            />
          </label>

          <label className="mt-3 flex items-center justify-between text-xs font-medium text-foreground/60">
            Reduce motion
            <input
              type="checkbox"
              checked={settings.motion === "reduced"}
              onChange={(e) =>
                update("motion", e.target.checked ? "reduced" : "normal")
              }
              className="h-4 w-4 accent-navy dark:accent-baby-blue"
            />
          </label>

          <button
            type="button"
            onClick={() => setSettings(DEFAULTS)}
            className="mt-4 w-full rounded-md border border-border py-1.5 text-xs font-medium hover:bg-surface-hover"
          >
            Reset to defaults
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Accessibility options"
        aria-expanded={open}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-navy text-white shadow-lg ring-2 ring-yellow ring-offset-2 ring-offset-background transition-transform hover:scale-105 dark:bg-baby-blue dark:text-navy"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-6 w-6"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="7.5" r="1.4" fill="currentColor" stroke="none" />
          <path d="M6.5 10c2.2.9 3.8.9 5.5.9s3.3 0 5.5-.9" />
          <path d="M12 10.9V15" />
          <path d="M12 15l-2.5 5.2" />
          <path d="M12 15l2.5 5.2" />
        </svg>
      </button>
    </div>
  );
}
