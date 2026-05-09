import type { QueryClient } from "@tanstack/react-query";

export async function invalidateQueryKeys(queryClient: QueryClient, keys: ReadonlyArray<readonly unknown[]>) {
  await Promise.all(keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
}
