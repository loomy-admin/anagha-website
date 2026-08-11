export type ErpVisibility = {
  visibleCategories?: string[];
  visibleProducts?: string[];
};

export async function fetchErpVisibility(): Promise<ErpVisibility> {
  try {
    const res = await fetch('/api/upload/erp-visibility');
    if (!res.ok) return {};
    return (await res.json()) as ErpVisibility;
  } catch {
    return {};
  }
}
