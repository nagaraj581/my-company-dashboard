import { getActiveCompanyId, getCompany } from "../services/companyService";

let cache = null;

export async function getCompanyInfo() {
  if (cache) return cache;

  const companyId = await getActiveCompanyId();
  if (!companyId) return null;

  const company = await getCompany(companyId);
  if (!company) return null;

  // Build a unified UPI object from fields inside company doc
  const activeUpi = {
    qrBase64: company.qrBase64 || null,
    upiId: company.upiId || null,
    name: company.upiName || company.name || "Merchant"
  };

  cache = {
    ...company,
    activeUpi,
  };

  return cache;
}

export function clearCompanyInfoCache() {
  cache = null;
}
