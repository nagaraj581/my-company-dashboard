import { getActiveCompanyId, getCompany } from "../services/companyService";

let cache = null;

export async function getCompanyInfo() {
  if (cache) return cache;

  const activeId = await getActiveCompanyId();
  if (!activeId) return null;

  const data = await getCompany(activeId);
  cache = data;

  return cache;
}

export function clearCompanyInfoCache() {
  cache = null;
}
