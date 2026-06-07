import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { EnvConfig } from '../config/env.js';
import { AppError, configurationError, conflict } from '../core/errors.js';

type Row = Record<string, unknown>;
type FilterValue = string | number | boolean | null | string[];
type RangeValue = string | number;

export type QueryOptions = {
  eq?: Record<string, FilterValue>;
  in?: Record<string, string[]>;
  contains?: Record<string, string[]>;
  ilike?: Record<string, string>;
  or?: string;
  lt?: Record<string, RangeValue>;
  lte?: Record<string, RangeValue>;
  gt?: Record<string, RangeValue>;
  gte?: Record<string, RangeValue>;
  order?: { column: string; ascending?: boolean };
  limit?: number;
};

export interface DataStore {
  list<T extends Row>(table: string, options?: QueryOptions, select?: string): Promise<T[]>;
  getById<T extends Row>(table: string, id: string, select?: string): Promise<T | null>;
  findOne<T extends Row>(table: string, options: QueryOptions, select?: string): Promise<T | null>;
  insert<T extends Row>(table: string, values: Row, select?: string): Promise<T>;
  update<T extends Row>(
    table: string,
    options: QueryOptions,
    values: Row,
    select?: string,
  ): Promise<T[]>;
  upsert<T extends Row>(
    table: string,
    values: Row,
    onConflict?: string,
    select?: string,
  ): Promise<T>;
  upsertMany<T extends Row>(
    table: string,
    values: Row[],
    onConflict?: string,
    select?: string,
  ): Promise<T[]>;
  rpc<T extends Row>(fnName: string, params: Row): Promise<T>;
}

export class SupabaseDataStore implements DataStore {
  private readonly client: SupabaseClient;
  private readonly config: EnvConfig;

  constructor(config: EnvConfig) {
    if (!config.supabaseUrl || !config.supabaseServiceRoleKey) {
      throw configurationError('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
    }
    this.config = config;
    this.client = createClient(config.supabaseUrl, config.supabaseServiceRoleKey);
  }

  async list<T extends Row>(table: string, options: QueryOptions = {}, select = '*') {
    const { data, error } = await this.applyOptions(
      this.client.from(table).select(select),
      options,
    );
    if (error) throw error;
    return (data ?? []) as T[];
  }

  async getById<T extends Row>(table: string, id: string, select = '*') {
    return this.findOne<T>(table, { eq: { id } }, select);
  }

  async findOne<T extends Row>(table: string, options: QueryOptions, select = '*') {
    const { data, error } = await this.applyOptions(
      this.client.from(table).select(select).limit(1).maybeSingle(),
      options,
    );
    if (error) throw error;
    return (data as T | null) ?? null;
  }

  async insert<T extends Row>(table: string, values: Row, select = '*') {
    const { data, error } = await this.client.from(table).insert(values).select(select).single();
    if (error) throw error;
    return data as unknown as T;
  }

  async update<T extends Row>(table: string, options: QueryOptions, values: Row, select = '*') {
    const query = applyFilters(this.client.from(table).update(values).select(select), options);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as T[];
  }

  async upsert<T extends Row>(table: string, values: Row, onConflict?: string, select = '*') {
    const options = onConflict ? { onConflict } : undefined;
    const { data, error } = await this.client
      .from(table)
      .upsert(values, options)
      .select(select)
      .single();
    if (error) throw error;
    return data as unknown as T;
  }

  async upsertMany<T extends Row>(table: string, values: Row[], onConflict?: string, select = '*') {
    if (values.length === 0) return [] as T[];
    const options = onConflict ? { onConflict } : undefined;
    const { data, error } = await this.client.from(table).upsert(values, options).select(select);
    if (error) throw error;
    return data as unknown as T[];
  }

  async rpc<T extends Row>(fnName: string, params: Row) {
    const { data, error } = await this.client.rpc(fnName, params);
    if (error) {
      throw this.mapRpcError(error);
    }
    return data as T;
  }

  createUserScopedClient(jwt: string) {
    if (!this.config.supabaseUrl || !this.config.supabaseAnonKey) {
      throw configurationError('SUPABASE_URL and SUPABASE_ANON_KEY are required');
    }
    return createClient(this.config.supabaseUrl, this.config.supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
  }

  createUserScopedStore(jwt: string): DataStore {
    const client = this.createUserScopedClient(jwt);
    const applyOptions = (query: any, options: QueryOptions) => {
      let next = applyFilters(query, options);
      if (options.order)
        next = next.order(options.order.column, { ascending: options.order.ascending ?? true });
      if (options.limit) next = next.limit(options.limit);
      return next;
    };
    return {
      async list<T extends Row>(table: string, options: QueryOptions = {}, select = '*') {
        const { data, error } = await applyOptions(client.from(table).select(select), options);
        if (error) throw error;
        return (data ?? []) as T[];
      },
      async getById<T extends Row>(table: string, id: string, select = '*') {
        return this.findOne<T>(table, { eq: { id } }, select);
      },
      async findOne<T extends Row>(table: string, options: QueryOptions, select = '*') {
        const { data, error } = await applyOptions(
          client.from(table).select(select).limit(1).maybeSingle(),
          options,
        );
        if (error) throw error;
        return (data as T | null) ?? null;
      },
      async insert<T extends Row>(table: string, values: Row, select = '*') {
        const { data, error } = await client.from(table).insert(values).select(select).single();
        if (error) throw error;
        return data as unknown as T;
      },
      async update<T extends Row>(table: string, options: QueryOptions, values: Row, select = '*') {
        const query = applyFilters(client.from(table).update(values).select(select), options);
        const { data, error } = await query;
        if (error) throw error;
        return (data ?? []) as T[];
      },
      async upsert<T extends Row>(table: string, values: Row, onConflict?: string, select = '*') {
        const options = onConflict ? { onConflict } : undefined;
        const { data, error } = await client
          .from(table)
          .upsert(values, options)
          .select(select)
          .single();
        if (error) throw error;
        return data as unknown as T;
      },
      async upsertMany<T extends Row>(
        table: string,
        values: Row[],
        onConflict?: string,
        select = '*',
      ) {
        if (values.length === 0) return [] as T[];
        const options = onConflict ? { onConflict } : undefined;
        const { data, error } = await client.from(table).upsert(values, options).select(select);
        if (error) throw error;
        return data as unknown as T[];
      },
      async rpc<T extends Row>(fnName: string, params: Row) {
        const { data, error } = await client.rpc(fnName, params);
        if (error) throw mapRpcError(error);
        return data as T;
      },
    };
  }

  private applyOptions(query: any, options: QueryOptions) {
    let next = applyFilters(query, options);
    if (options.order)
      next = next.order(options.order.column, { ascending: options.order.ascending ?? true });
    if (options.limit) next = next.limit(options.limit);
    return next;
  }

  private mapRpcError(error: { message?: string; code?: string }) {
    return mapRpcError(error);
  }
}

function applyFilters(query: any, options: QueryOptions) {
  let next = query;
  for (const [key, value] of Object.entries(options.eq ?? {})) next = next.eq(key, value);
  for (const [key, value] of Object.entries(options.in ?? {})) next = next.in(key, value);
  for (const [key, value] of Object.entries(options.contains ?? {}))
    next = next.contains(key, value);
  for (const [key, value] of Object.entries(options.ilike ?? {})) next = next.ilike(key, value);
  if (options.or) next = next.or(options.or);
  for (const [key, value] of Object.entries(options.lt ?? {})) next = next.lt(key, value);
  for (const [key, value] of Object.entries(options.lte ?? {})) next = next.lte(key, value);
  for (const [key, value] of Object.entries(options.gt ?? {})) next = next.gt(key, value);
  for (const [key, value] of Object.entries(options.gte ?? {})) next = next.gte(key, value);
  return next;
}

function mapRpcError(error: { message?: string; code?: string }) {
  const message = error.message ?? 'RPC failed';
  if (message.startsWith('code:')) {
    const [, code = 'RPC_ERROR', msg = 'RPC failed'] = message.split(':', 3);
    if (code === 'ILLEGAL_TRANSITION') {
      return conflict('ILLEGAL_TRANSITION', msg);
    }
    return new AppError(400, code, msg);
  }
  if (error.code === 'P0001' && message.includes('illegal_transition')) {
    return conflict('ILLEGAL_TRANSITION', message);
  }
  return new AppError(500, 'RPC_ERROR', message);
}
