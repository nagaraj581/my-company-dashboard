import { getActiveCompanyId, getCompany } from "../services/companyService";
import { DEFAULT_DOCUMENT_STYLE_ID } from "./documentStyles";

let cache = null;

export async function getCompanyInfo() {
  if (cache) return cache;

  const companyId = await getActiveCompanyId();
  if (!companyId) return null;

  const company = await getCompany(companyId);
  if (!company) return null;

  const selectedUpi = company.defaultUpiId
    ? company.upis?.find((upi) => upi.id === company.defaultUpiId)
    : null;

  // Support both the current multi-UPI setup and older company-level UPI fields.
  const activeUpi = {
    qrBase64: selectedUpi?.qrBase64 || company.qrBase64 || null,
    upiId: selectedUpi?.upiId || company.upiId || null,
    name: selectedUpi?.name || company.upiName || company.name || "Merchant",
  };

  cache = {
    ...company,
    documentStyle: company.documentStyle || DEFAULT_DOCUMENT_STYLE_ID,
    activeUpi,
  };

  return cache;
}

export function clearCompanyInfoCache() {
  cache = null;
}
