type BasicsDraft = {
  full_name: string;
  phone: string;
  location: string;
};

let draft: BasicsDraft | null = null;

export function setBasicsDraft(input: BasicsDraft) {
  draft = input;
}

export function getBasicsDraft() {
  return draft;
}

export function clearBasicsDraft() {
  draft = null;
}
