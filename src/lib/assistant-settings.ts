import { useSyncExternalStore } from "react";

const KEY = "morline.assistant.alwaysProceed";
const listeners = new Set<() => void>();

/** Read outside React (the assistant checks it at the moment a reply arrives). */
export function getAlwaysProceed(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function setAlwaysProceed(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? "1" : "0");
  } catch {
    // Storage can be blocked; the setting then lasts only until reload.
  }
  listeners.forEach((l) => l());
}

/**
 * "Always proceed": when on, changes the assistant proposes are applied and deployed straight
 * away instead of waiting for a click on Review. Stored per browser.
 */
export function useAlwaysProceed(): [boolean, (on: boolean) => void] {
  const on = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      window.addEventListener("storage", cb);
      return () => {
        listeners.delete(cb);
        window.removeEventListener("storage", cb);
      };
    },
    getAlwaysProceed,
    () => false,
  );
  return [on, setAlwaysProceed];
}
