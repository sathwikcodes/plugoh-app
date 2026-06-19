export type LocationSelection = {
  label: string;
  latitude: number;
  longitude: number;
};

type Listener = (selection: LocationSelection) => void;

export type LocationSelectionChannel = {
  /** Publish a selection to all subscribers and retain it for the next consume(). */
  set: (selection: LocationSelection) => void;
  /** Read and clear the last selection (one-shot handoff back to the opener screen). */
  consume: () => LocationSelection | null;
  /** Subscribe to live selections; returns an unsubscribe function. */
  subscribe: (listener: Listener) => () => void;
};

function createLocationSelectionChannel(): LocationSelectionChannel {
  let lastSelection: LocationSelection | null = null;
  const listeners = new Set<Listener>();

  return {
    set(selection) {
      lastSelection = selection;
      listeners.forEach((listener) => {
        listener(selection);
      });
    },
    consume() {
      const selection = lastSelection;
      lastSelection = null;
      return selection;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

/** Onboarding location picker → premium onboarding screen handoff. */
export const onboardingLocationChannel = createLocationSelectionChannel();
/** Profile/brand location picker → profile edit screen handoff. */
export const profileLocationChannel = createLocationSelectionChannel();
