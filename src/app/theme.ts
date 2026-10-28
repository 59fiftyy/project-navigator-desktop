import { useCallback, useEffect, useState } from "react";

export type Theme = "dark" | "light";

export const THEME_STORAGE_KEY = "atlas.theme";
export const DEFAULT_THEME: Theme = "dark";

/** Reads the saved theme. Anything unknown or missing falls back to dark. */
export function readTheme(storage: Pick<Storage, "getItem"> | undefined): Theme {
  try {
    const value = storage?.getItem(THEME_STORAGE_KEY);
    return value === "light" || value === "dark" ? value : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.remove("dark", "light");
  root.classList.add(theme);
}

/** Apply the saved theme before React renders to avoid a flash. */
export function initTheme() {
  applyTheme(readTheme(typeof localStorage === "undefined" ? undefined : localStorage));
}

const listeners = new Set<(theme: Theme) => void>();

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() =>
    readTheme(typeof localStorage === "undefined" ? undefined : localStorage),
  );

  useEffect(() => {
    listeners.add(setThemeState);
    return () => {
      listeners.delete(setThemeState);
    };
  }, []);

  const setTheme = useCallback((next: Theme) => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      /* storage unavailable: theme still applies for this session */
    }
    applyTheme(next);
    listeners.forEach((listener) => listener(next));
  }, []);

  return { theme, setTheme };
}
