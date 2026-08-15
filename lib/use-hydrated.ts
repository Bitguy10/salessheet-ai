import { useSyncExternalStore } from "react";

// Returns false during SSR and the first client render, then true once the
// component has hydrated — without a setState-in-effect. Use it to gate
// client-only widgets (e.g. a chart that measures the DOM) so their initial
// markup matches on hydration and only mounts for real on the client.
const subscribe = () => () => {};

export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true, // client snapshot
    () => false, // server snapshot
  );
}
