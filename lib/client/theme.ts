/**
 * Theme preference store. The preference ("light" | "dark" | "system") is
 * persisted in localStorage; <html> carries both the preference
 * (data-theme-pref, used by the toggle's CSS) and the resolved theme
 * (data-theme). THEME_SCRIPT applies both before first paint.
 */

export type ThemePreference = "light" | "dark" | "system";

const STORAGE_KEY = "pagedrop-theme";
const DARK_QUERY = "(prefers-color-scheme: dark)";
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

export const THEME_SCRIPT = `(function(){try{var r=document.documentElement;var p=localStorage.getItem("${STORAGE_KEY}");if(p!=="light"&&p!=="dark")p="system";var d=p==="dark"||(p==="system"&&matchMedia("${DARK_QUERY}").matches);r.setAttribute("data-theme",d?"dark":"light");r.setAttribute("data-theme-pref",p)}catch(e){}})()`;

const listeners = new Set<() => void>();

function readPreference(): ThemePreference {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === "light" || value === "dark" ? value : "system";
  } catch {
    return "system";
  }
}

function resolve(preference: ThemePreference): "light" | "dark" {
  if (preference !== "system") return preference;
  return window.matchMedia(DARK_QUERY).matches ? "dark" : "light";
}

/** Point the reveal animation starts from (usually the clicked button). */
export interface RevealOrigin {
  x: number;
  y: number;
}

/**
 * Switches the resolved theme with an animation:
 * - View Transitions API: the new theme is revealed as a circle expanding
 *   from `origin` over the old one.
 * - Fallback: every color property cross-fades.
 */
function applyTheme(preference: ThemePreference, origin?: RevealOrigin) {
  const root = document.documentElement;
  root.setAttribute("data-theme-pref", preference);
  const next = resolve(preference);
  if (root.getAttribute("data-theme") === next) return;

  const commit = () => root.setAttribute("data-theme", next);

  if (window.matchMedia(REDUCED_MOTION_QUERY).matches) {
    commit();
    return;
  }

  if (origin && typeof document.startViewTransition === "function") {
    const transition = document.startViewTransition(commit);
    transition.ready
      .then(() => {
        const radius = Math.hypot(
          Math.max(origin.x, window.innerWidth - origin.x),
          Math.max(origin.y, window.innerHeight - origin.y),
        );
        root.animate(
          {
            clipPath: [
              `circle(0px at ${origin.x}px ${origin.y}px)`,
              `circle(${radius}px at ${origin.x}px ${origin.y}px)`,
            ],
          },
          {
            duration: 700,
            easing: "cubic-bezier(0.65, 0, 0.35, 1)",
            pseudoElement: "::view-transition-new(root)",
          },
        );
      })
      .catch(() => undefined);
    return;
  }

  root.classList.add("theme-fade");
  commit();
  window.setTimeout(() => root.classList.remove("theme-fade"), 550);
}

export function setThemePreference(preference: ThemePreference, origin?: RevealOrigin) {
  try {
    if (preference === "system") localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, preference);
  } catch {
    // Storage unavailable: the choice still applies for this page view.
  }
  applyTheme(preference, origin);
  listeners.forEach((listener) => listener());
}

export function subscribeTheme(listener: () => void) {
  listeners.add(listener);
  // Follow OS changes (with a cross-fade) while the preference is "system".
  const media = window.matchMedia(DARK_QUERY);
  const onChange = () => {
    if (readPreference() === "system") applyTheme("system");
  };
  media.addEventListener("change", onChange);
  return () => {
    listeners.delete(listener);
    media.removeEventListener("change", onChange);
  };
}

export const getThemePreference = readPreference;
export const getServerThemePreference = (): ThemePreference => "system";
