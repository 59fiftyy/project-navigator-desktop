/**
 * Single clipboard implementation used across Atlas.
 *
 * Inside the Tauri webview the DOM clipboard APIs are unreliable, so the
 * native clipboard plugin is tried first and the browser paths act as
 * fallbacks. Always reports whether the copy actually succeeded.
 */
import { isDesktopRuntime } from "@/platform/runtime";

export async function copyText(value: string): Promise<boolean> {
  const text = value ?? "";

  if (!text) {
    return false;
  }

  if (isDesktopRuntime()) {
    try {
      const { writeText } = await import("@tauri-apps/plugin-clipboard-manager");
      await writeText(text);
      return true;
    } catch {
      // fall through to the web paths below
    }
  }

  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // ignore — the textarea fallback runs next
  }

  return copyWithTextarea(text);
}

function copyWithTextarea(text: string): boolean {
  if (typeof document === "undefined") {
    return false;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.top = "0";
  textarea.style.left = "0";
  textarea.style.opacity = "0";

  document.body.appendChild(textarea);

  try {
    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, text.length);
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    textarea.remove();
  }
}
