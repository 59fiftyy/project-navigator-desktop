/**
 * Single clipboard implementation used across Atlas.
 *
 * On the desktop the native clipboard plugin is used and is imported statically:
 * loading a lazy chunk while a context menu is tearing down was a source of
 * intermittent webview crashes. The DOM paths exist only for the browser
 * preview. Always reports whether the copy actually succeeded.
 */
import { writeText as writeNativeText } from "@tauri-apps/plugin-clipboard-manager";

import { isDesktopRuntime } from "@/platform/runtime";

export async function copyText(value: string): Promise<boolean> {
  const text = typeof value === "string" ? value : "";

  if (!text) {
    return false;
  }

  if (isDesktopRuntime()) {
    try {
      await writeNativeText(text);
      return true;
    } catch {
      return false;
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

/** Browser-preview only fallback for contexts without the async clipboard API. */
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
