import type { DataStore, QueryOptions } from "../repositories/data-store.js";

type Row = Record<string, any>;

export class MemoryDataStore implements DataStore {
  readonly tables = new Map<string, Row[]>();

  constructor(seed: Record<string, Row[]> = {}) {
    for (const [table, rows] of Object.entries(seed)) {
      this.tables.set(
        table,
        rows.map((row) => ({ ...row })),
      );
    }
  }

  async list<T extends Row>(table: string, options: QueryOptions = {}, _select = "*") {
    return this.applyOptions(this.rows(table), options).map((row) => ({ ...row })) as T[];
  }

  async getById<T extends Row>(table: string, id: string, _select = "*") {
    const row = this.rows(table).find((item) => item.id === id);
    return row ? ({ ...row } as T) : null;
  }

  async findOne<T extends Row>(table: string, options: QueryOptions, _select = "*") {
    const row = this.applyOptions(this.rows(table), options)[0];
    return row ? ({ ...row } as T) : null;
  }

  async insert<T extends Row>(table: string, values: Row, _select = "*") {
    const row = { id: values.id ?? crypto.randomUUID(), ...values };
    this.rows(table).push(row);
    return { ...row } as unknown as T;
  }

  async update<T extends Row>(table: string, options: QueryOptions, values: Row, _select = "*") {
    const rows = this.applyOptions(this.rows(table), options);
    for (const row of rows) Object.assign(row, values);
    return rows.map((row) => ({ ...row })) as T[];
  }

  async upsert<T extends Row>(table: string, values: Row, onConflict = "id", _select = "*") {
    const keys = onConflict.split(",").map((key) => key.trim());
    const rows = this.rows(table);
    const existing = rows.find((row) => keys.every((key) => row[key] === values[key]));
    if (existing) {
      Object.assign(existing, values);
      return { ...existing } as T;
    }
    return this.insert<T>(table, values);
  }

  private rows(table: string) {
    if (!this.tables.has(table)) this.tables.set(table, []);
    return this.tables.get(table)!;
  }

  private applyOptions(rows: Row[], options: QueryOptions) {
    let result = rows.filter((row) => {
      for (const [key, value] of Object.entries(options.eq ?? {})) {
        if (row[key] !== value) return false;
      }
      for (const [key, values] of Object.entries(options.in ?? {})) {
        if (!values.includes(row[key])) return false;
      }
      for (const [key, pattern] of Object.entries(options.ilike ?? {})) {
        if (!ilike(row[key], pattern)) return false;
      }
      for (const [key, value] of Object.entries(options.lt ?? {})) {
        if (!(row[key] < value)) return false;
      }
      for (const [key, value] of Object.entries(options.lte ?? {})) {
        if (!(row[key] <= value)) return false;
      }
      for (const [key, value] of Object.entries(options.gt ?? {})) {
        if (!(row[key] > value)) return false;
      }
      for (const [key, value] of Object.entries(options.gte ?? {})) {
        if (!(row[key] >= value)) return false;
      }
      if (options.or && !matchesOr(row, options.or)) return false;
      return true;
    });
    if (options.order) {
      const direction = options.order.ascending === false ? -1 : 1;
      result = [...result].sort((a, b) => compareOrderedValues(a[options.order!.column], b[options.order!.column]) * direction);
    }
    if (options.limit) result = result.slice(0, options.limit);
    return result;
  }
}

function compareOrderedValues(a: unknown, b: unknown) {
  if (typeof a === "number" && typeof b === "number") return a - b;
  const aDate = typeof a === "string" ? Date.parse(a) : Number.NaN;
  const bDate = typeof b === "string" ? Date.parse(b) : Number.NaN;
  if (!Number.isNaN(aDate) && !Number.isNaN(bDate)) return aDate - bDate;
  return String(a ?? "").localeCompare(String(b ?? ""));
}

function ilike(value: unknown, pattern: string) {
  const source = String(value ?? "").toLowerCase();
  const needle = pattern.replaceAll("%", "").replaceAll("\\", "").toLowerCase();
  return source.includes(needle);
}

function matchesOr(row: Row, expression: string) {
  return expression.split(",").some((part) => {
    const [field, operator, pattern] = part.split(".");
    if (operator !== "ilike") return false;
    return ilike(row[field], pattern ?? "");
  });
}
