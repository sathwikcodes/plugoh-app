export type NumericRangeDraft = {
  min: string;
  max: string;
};

export type ParsedNumericRange = {
  min?: number;
  max?: number;
};

export function emptyNumericRange(): NumericRangeDraft {
  return { min: '', max: '' };
}

export function parseNumericRange(range: NumericRangeDraft): ParsedNumericRange {
  const minText = range.min.trim();
  const maxText = range.max.trim();
  const parsed: ParsedNumericRange = {};

  if (minText.length > 0) {
    const min = Number(minText);
    if (Number.isFinite(min)) parsed.min = min;
  }

  if (maxText.length > 0) {
    const max = Number(maxText);
    if (Number.isFinite(max)) parsed.max = max;
  }

  return parsed;
}

export function numericRangeError(range: NumericRangeDraft, label: string) {
  const minText = range.min.trim();
  const maxText = range.max.trim();
  const min = minText.length > 0 ? Number(minText) : undefined;
  const max = maxText.length > 0 ? Number(maxText) : undefined;

  if (min !== undefined && (!Number.isFinite(min) || min < 0)) {
    return `${label} minimum must be zero or more.`;
  }

  if (max !== undefined && (!Number.isFinite(max) || max < 0)) {
    return `${label} maximum must be zero or more.`;
  }

  if (min !== undefined && max !== undefined && min > max) {
    return `${label} minimum cannot be greater than maximum.`;
  }

  return null;
}

export function numericRangeHasValue(range: NumericRangeDraft) {
  return range.min.trim().length > 0 || range.max.trim().length > 0;
}

export function matchesNumericRange(value: number | undefined | null, range: NumericRangeDraft) {
  if (!numericRangeHasValue(range)) return true;

  const amount = value ?? 0;
  const { min, max } = parseNumericRange(range);

  if (min !== undefined && amount < min) return false;
  if (max !== undefined && amount > max) return false;
  return true;
}
