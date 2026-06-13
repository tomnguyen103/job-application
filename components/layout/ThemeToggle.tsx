"use client";

import { useSyncExternalStore, type ReactElement } from "react";

const THEME_STORAGE_KEY = "job-application-theme";
const THEME_CHANGE_EVENT = "job-application-theme-change";

type Theme = "light" | "dark";

function getSystemTheme(): Theme {
  if (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  ) {
    return "dark";
  }

  return "light";
}

function getSavedTheme(): Theme | null {
  try {
    const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    return savedTheme === "dark" || savedTheme === "light"
      ? savedTheme
      : null;
  } catch {
    return null;
  }
}

function getPreferredTheme(): Theme {
  return getSavedTheme() ?? getSystemTheme();
}

function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

function getThemeSnapshot(): Theme {
  if (typeof document === "undefined") {
    return "light";
  }

  const documentTheme = document.documentElement.dataset.theme;
  if (documentTheme === "dark" || documentTheme === "light") {
    return documentTheme;
  }

  return getPreferredTheme();
}

function getServerThemeSnapshot(): Theme {
  return "light";
}

function subscribeToThemeChanges(onStoreChange: () => void): () => void {
  const activeTheme = getPreferredTheme();
  applyTheme(activeTheme);
  onStoreChange();

  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  const handleSystemThemeChange = (): void => {
    if (getSavedTheme()) {
      return;
    }

    applyTheme(getSystemTheme());
    onStoreChange();
  };
  const handleStorageChange = (event: StorageEvent): void => {
    if (event.key !== THEME_STORAGE_KEY) {
      return;
    }

    applyTheme(getPreferredTheme());
    onStoreChange();
  };
  const handleThemeChange = (): void => {
    onStoreChange();
  };

  mediaQuery.addEventListener("change", handleSystemThemeChange);
  window.addEventListener("storage", handleStorageChange);
  window.addEventListener(THEME_CHANGE_EVENT, handleThemeChange);

  return () => {
    mediaQuery.removeEventListener("change", handleSystemThemeChange);
    window.removeEventListener("storage", handleStorageChange);
    window.removeEventListener(THEME_CHANGE_EVENT, handleThemeChange);
  };
}

function SunIcon(): ReactElement {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 2.8v2.1M12 19.1v2.1M4.9 4.9l1.5 1.5M17.6 17.6l1.5 1.5M2.8 12h2.1M19.1 12h2.1M4.9 19.1l1.5-1.5M17.6 6.4l1.5-1.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function MoonIcon(): ReactElement {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M20.1 14.8A7.7 7.7 0 0 1 9.2 3.9 8.6 8.6 0 1 0 20.1 14.8Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export function ThemeToggle(): ReactElement {
  useSyncExternalStore(
    subscribeToThemeChanges,
    getThemeSnapshot,
    getServerThemeSnapshot,
  );

  const handleToggle = (): void => {
    const currentTheme = getThemeSnapshot();
    const nextTheme = currentTheme === "dark" ? "light" : "dark";

    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    } catch {
      // The visual toggle should still work when storage is unavailable.
    }

    applyTheme(nextTheme);
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  };

  return (
    <button
      type="button"
      aria-label="Toggle color theme"
      title="Toggle color theme"
      onClick={handleToggle}
      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border bg-surface text-text-primary shadow-card transition-colors hover:border-accent hover:bg-surface-secondary focus:outline-none focus-visible:ring-accent"
    >
      <span className="sr-only">Toggle color theme</span>
      <span className="theme-toggle-icon-dark">
        <SunIcon />
      </span>
      <span className="theme-toggle-icon-light">
        <MoonIcon />
      </span>
    </button>
  );
}
