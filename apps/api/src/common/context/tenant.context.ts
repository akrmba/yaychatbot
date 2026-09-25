import { AsyncLocalStorage } from "node:async_hooks";

export interface TenantStore {
  organizationId: string;
  userId: string;
}

export const tenantStorage = new AsyncLocalStorage<TenantStore>();

export function getTenantContext(): TenantStore | undefined {
  return tenantStorage.getStore();
}

export function getRequiredTenantContext(): TenantStore {
  const store = tenantStorage.getStore();
  if (!store) {
    throw new Error("Tenant context not available — request not scoped");
  }
  return store;
}
