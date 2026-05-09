import type { QueryClient } from "@tanstack/react-query";

export type QueryInvalidator = Pick<QueryClient, "invalidateQueries">;

export async function invalidateQueryKeys(queryClient: QueryInvalidator, keys: ReadonlyArray<readonly unknown[]>) {
  await Promise.all(keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
}
