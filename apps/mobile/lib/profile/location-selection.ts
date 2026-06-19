export type ProfileLocationSelection = {
  label: string;
  latitude: number;
  longitude: number;
};

let lastSelection: ProfileLocationSelection | null = null;
const listeners = new Set<(selection: ProfileLocationSelection) => void>();

export function setProfileLocationSelection(selection: ProfileLocationSelection) {
  lastSelection = selection;
  for (const listener of listeners) listener(selection);
}

export function consumeProfileLocationSelection() {
  const selection = lastSelection;
  lastSelection = null;
  return selection;
}

export function subscribeProfileLocationSelection(
  listener: (selection: ProfileLocationSelection) => void,
) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
