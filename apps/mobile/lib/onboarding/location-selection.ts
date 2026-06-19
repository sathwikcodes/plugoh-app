export type OnboardingLocationSelection = {
  label: string;
  latitude: number;
  longitude: number;
};

type Listener = (selection: OnboardingLocationSelection) => void;

let lastSelection: OnboardingLocationSelection | null = null;
const listeners = new Set<Listener>();

export function setOnboardingLocationSelection(selection: OnboardingLocationSelection) {
  lastSelection = selection;
  listeners.forEach((listener) => {
    listener(selection);
  });
}

export function getOnboardingLocationSelection() {
  return lastSelection;
}

export function consumeOnboardingLocationSelection() {
  const selection = lastSelection;
  lastSelection = null;
  return selection;
}

export function subscribeOnboardingLocationSelection(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
