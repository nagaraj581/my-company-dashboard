import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  Building2,
  CheckCircle2,
  CreditCard,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import {
  deleteCompany,
  getActiveCompanyId,
  getCompanies,
  getCompany,
  saveCompany,
  setActiveCompanyId,
} from "../../services/companyService";
import { clearCompanyInfoCache } from "../../config/companyInfo";
import {
  DEFAULT_DOCUMENT_STYLE_ID,
  DOCUMENT_STYLE_OPTIONS,
  getDocumentStyle,
} from "../../config/documentStyles";
import { generateUPIQR } from "../../services/upiService";
import UPIManager from "./UPIManager";

const emptyForm = () => ({
  name: "",
  address: "",
  phone: "",
  email: "",
  gst: "",
  terms: "Goods once sold cannot be returned.",
  upiId: "",
  upiName: "",
  qrBase64: "",
  documentStyle: DEFAULT_DOCUMENT_STYLE_ID,
});

export default function CompanyList() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [managingUpisFor, setManagingUpisFor] = useState(null);

  const refreshCompanies = async () => {
    const [list, currentActiveId] = await Promise.all([getCompanies(), getActiveCompanyId()]);
    setCompanies(list);
    setActiveId(currentActiveId);
  };

  useEffect(() => {
    let active = true;

    (async () => {
      setLoading(true);
      try {
        const [list, currentActiveId] = await Promise.all([getCompanies(), getActiveCompanyId()]);
        if (!active) return;
        setCompanies(list);
        setActiveId(currentActiveId);
      } catch (error) {
        console.error("Unable to load companies:", error);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const closeEditor = () => {
    setShowModal(false);
    setEditing(null);
    setForm(emptyForm());
  };

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm());
    setShowModal(true);
  };

  const openEdit = async (id) => {
    try {
      const company = await getCompany(id);
      if (!company) return;
      setEditing(id);
      setForm({
        name: company.name || "",
        address: company.address || "",
        phone: company.phone || "",
        email: company.email || "",
        gst: company.gst || "",
        terms: company.terms || emptyForm().terms,
        upiId: company.upiId || "",
        upiName: company.upiName || "",
        qrBase64: company.qrBase64 || "",
        documentStyle: company.documentStyle || DEFAULT_DOCUMENT_STYLE_ID,
      });
      setShowModal(true);
    } catch (error) {
      console.error("Unable to open company:", error);
      alert("Could not load the company. Please try again.");
    }
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleGenerateQr = async () => {
    if (!form.upiId.trim() || !form.upiName.trim()) {
      alert("Enter the UPI ID and beneficiary name first.");
      return;
    }

    try {
      const qrBase64 = await generateUPIQR(form.upiId.trim(), form.upiName.trim());
      setForm((current) => ({ ...current, qrBase64 }));
    } catch (error) {
      console.error("QR generation error:", error);
      alert("Unable to generate the UPI QR code.");
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      alert("Company name is required.");
      return;
    }

    setSaving(true);
    try {
      const savedId = await saveCompany(editing, {
        name: form.name.trim(),
        address: form.address.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        gst: form.gst.trim(),
        terms: form.terms.trim(),
        upiId: form.upiId.trim(),
        upiName: form.upiName.trim(),
        qrBase64: form.qrBase64,
        documentStyle: form.documentStyle || DEFAULT_DOCUMENT_STYLE_ID,
      });

      if (!activeId) {
        await setActiveCompanyId(savedId);
      }

      clearCompanyInfoCache();
      await refreshCompanies();
      closeEditor();
    } catch (error) {
      console.error("Unable to save company:", error);
      alert(`Unable to save company: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSetActive = async (id) => {
    try {
      await setActiveCompanyId(id);
      setActiveId(id);
      clearCompanyInfoCache();
    } catch (error) {
      console.error("Unable to set active company:", error);
      alert("Unable to change the active company.");
    }
  };

  const handleDelete = async (company) => {
    if (!window.confirm(`Delete ${company.name}? This cannot be undone.`)) return;

    try {
      await deleteCompany(company.id);
      if (activeId === company.id) {
        await setActiveCompanyId(null);
        setActiveId(null);
      }
      clearCompanyInfoCache();
      setCompanies((current) => current.filter((item) => item.id !== company.id));
    } catch (error) {
      console.error("Unable to delete company:", error);
      alert("Unable to delete the company.");
    }
  };

  const editorModal = showModal && typeof document !== "undefined"
    ? createPortal(
        <Modal title={editing ? "Edit company" : "Create company"} onClose={closeEditor}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Company name" required>
              <input name="name" value={form.name} onChange={handleChange} placeholder="e.g. Acme Interiors" className="field" autoFocus />
            </Field>
            <Field label="Phone">
              <input name="phone" value={form.phone} onChange={handleChange} placeholder="Phone number" className="field" />
            </Field>
            <Field label="Email">
              <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="email@company.com" className="field" />
            </Field>
            <Field label="GST / VAT">
              <input name="gst" value={form.gst} onChange={handleChange} placeholder="Tax registration number" className="field" />
            </Field>
            <Field label="Address" className="sm:col-span-2">
              <textarea name="address" value={form.address} onChange={handleChange} placeholder="Business address" rows={3} className="field resize-y" />
            </Field>
            <Field label="Document style" className="sm:col-span-2">
              <select name="documentStyle" value={form.documentStyle} onChange={handleChange} className="field">
                {DOCUMENT_STYLE_OPTIONS.map((style) => <option key={style.id} value={style.id}>{style.name}</option>)}
              </select>
            </Field>
          </div>

          <div className="mt-6 rounded-2xl border border-sky-100 bg-sky-50/60 p-4 dark:border-sky-900/60 dark:bg-sky-950/20">
            <div className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-white"><CreditCard size={17} className="text-sky-600" /> Default payment QR</div>
            <div className="grid gap-4 sm:grid-cols-2">
              <input name="upiId" value={form.upiId} onChange={handleChange} placeholder="UPI ID (optional)" className="field" />
              <input name="upiName" value={form.upiName} onChange={handleChange} placeholder="Beneficiary name" className="field" />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button type="button" onClick={handleGenerateQr} className="secondary-button">Generate QR</button>
              {form.qrBase64 && <><img src={form.qrBase64} alt="UPI QR preview" className="h-20 w-20 rounded-lg border border-sky-100 bg-white p-1" /><button type="button" onClick={() => setForm((current) => ({ ...current, qrBase64: "" }))} className="text-sm font-bold text-rose-600">Remove</button></>}
            </div>
          </div>

          <Field label="Terms and conditions" className="mt-6">
            <textarea name="terms" value={form.terms} onChange={handleChange} rows={3} className="field resize-y" />
          </Field>

          <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" onClick={closeEditor} className="secondary-button">Cancel</button>
            <button type="button" onClick={handleSave} disabled={saving} className="primary-button disabled:cursor-not-allowed disabled:opacity-60">{saving ? "Saving..." : "Save company"}</button>
          </div>
        </Modal>,
        document.body,
      )
    : null;

  const upiModal = managingUpisFor && typeof document !== "undefined"
    ? createPortal(
        <Modal title={`UPI accounts · ${managingUpisFor.name}`} onClose={() => setManagingUpisFor(null)}>
          <UPIManager companyId={managingUpisFor.id} onClose={() => setManagingUpisFor(null)} />
        </Modal>,
        document.body,
      )
    : null;

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-5 rounded-3xl border border-slate-200/80 bg-white/80 p-6 shadow-sm backdrop-blur md:flex-row md:items-end md:justify-between dark:border-slate-700/70 dark:bg-slate-900/70 md:p-8">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-sky-100 px-3 py-1 text-xs font-bold text-sky-700 dark:bg-sky-950/60 dark:text-sky-300"><Building2 size={14} /> Business setup</div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 dark:text-white">Company profiles</h1>
          <p className="mt-2 max-w-xl text-sm font-medium text-slate-600 dark:text-slate-400">Set the active business identity, document styling, terms, and payment details used on quotes and invoices.</p>
        </div>
        <button type="button" onClick={openNew} className="primary-button"><Plus size={18} /> Add company</button>
      </section>

      {loading ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((item) => <div key={item} className="h-64 animate-pulse rounded-3xl border border-slate-200 bg-white/70 dark:border-slate-700 dark:bg-slate-900/70" />)}
        </div>
      ) : companies.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-sky-300 bg-sky-50/60 px-6 py-16 text-center dark:border-sky-900 dark:bg-sky-950/20">
          <Building2 size={38} className="mx-auto text-sky-600" />
          <h2 className="mt-4 text-xl font-extrabold text-slate-900 dark:text-white">Create your first company</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-600 dark:text-slate-400">It becomes your active document profile automatically, so you can start invoicing straight away.</p>
          <button type="button" onClick={openNew} className="primary-button mt-6"><Plus size={18} /> Create company</button>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {companies.map((company) => {
            const isActive = company.id === activeId;
            const documentStyle = getDocumentStyle(company.documentStyle);
            return (
              <article key={company.id} className={`relative overflow-hidden rounded-3xl border bg-white/85 p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl dark:bg-slate-900/75 ${isActive ? "border-sky-300 ring-2 ring-sky-100 dark:border-sky-700 dark:ring-sky-950" : "border-slate-200/80 dark:border-slate-700/70"}`}>
                <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-sky-500 via-cyan-500 to-emerald-500" />
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-sky-600 dark:bg-slate-800"><Building2 size={23} /></div><div className="min-w-0"><h2 className="truncate text-lg font-extrabold text-slate-950 dark:text-white">{company.name}</h2><p className="mt-0.5 text-xs font-bold text-slate-500">{documentStyle.name}</p></div></div>
                  {isActive && <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-extrabold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"><CheckCircle2 size={13} /> Active</span>}
                </div>

                <div className="mt-5 space-y-2.5 text-sm text-slate-600 dark:text-slate-400">
                  {company.address && <p className="flex gap-2"><MapPin size={16} className="mt-0.5 shrink-0 text-slate-400" /><span className="line-clamp-2">{company.address}</span></p>}
                  {company.phone && <p className="flex items-center gap-2"><Phone size={16} className="shrink-0 text-slate-400" /><span className="truncate">{company.phone}</span></p>}
                  {company.email && <p className="flex items-center gap-2"><Mail size={16} className="shrink-0 text-slate-400" /><span className="truncate">{company.email}</span></p>}
                  {!company.address && !company.phone && !company.email && <p className="italic text-slate-400">Contact details have not been added.</p>}
                </div>

                <div className="mt-6 flex flex-wrap gap-2 border-t border-slate-100 pt-5 dark:border-slate-800">
                  {!isActive && <button type="button" onClick={() => handleSetActive(company.id)} className="secondary-button"><CheckCircle2 size={16} /> Set active</button>}
                  <button type="button" onClick={() => openEdit(company.id)} className="icon-button" aria-label={`Edit ${company.name}`} title="Edit company"><Pencil size={17} /></button>
                  <button type="button" onClick={() => setManagingUpisFor(company)} className="icon-button" aria-label={`Manage UPI accounts for ${company.name}`} title="Manage UPI accounts"><CreditCard size={17} /></button>
                  <button type="button" onClick={() => handleDelete(company)} className="icon-button ml-auto text-rose-600 hover:border-rose-200 hover:bg-rose-50 dark:hover:border-rose-900 dark:hover:bg-rose-950/40" aria-label={`Delete ${company.name}`} title="Delete company"><Trash2 size={17} /></button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {editorModal}
      {upiModal}
    </div>
  );
}

function Field({ label, required, className = "", children }) {
  return <label className={`block ${className}`}><span className="mb-1.5 block text-sm font-bold text-slate-700 dark:text-slate-300">{label}{required && <span className="ml-1 text-rose-500">*</span>}</span>{children}</label>;
}

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-slate-950/60 p-3 backdrop-blur-sm sm:p-6">
      <div role="dialog" aria-modal="true" aria-label={title} className="my-3 flex max-h-[calc(100dvh-1.5rem)] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-white/70 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:my-0 sm:max-h-[calc(100dvh-3rem)] sm:p-7">
        <div className="mb-5 flex shrink-0 items-center justify-between gap-4"><h2 className="text-xl font-extrabold text-slate-950 dark:text-white">{title}</h2><button type="button" onClick={onClose} className="icon-button" aria-label="Close dialog"><X size={19} /></button></div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
          {children}
        </div>
      </div>
    </div>
  );
}
