"use client";

import { useMemo, useSyncExternalStore } from "react";

function createMountStore() {
  let hasMounted = false;
  const listeners = new Set<() => void>();

  return {
    getServerSnapshot: () => false,
    getSnapshot: () => hasMounted,
    subscribe: (listener: () => void) => {
      listeners.add(listener);

      if (!hasMounted) {
        hasMounted = true;
        queueMicrotask(() => {
          listeners.forEach((currentListener) => currentListener());
        });
      }

      return () => {
        listeners.delete(listener);
      };
    },
  };
}

export function useHasMounted() {
  const mountStore = useMemo(() => createMountStore(), []);

  return useSyncExternalStore(
    mountStore.subscribe,
    mountStore.getSnapshot,
    mountStore.getServerSnapshot,
  );
}
