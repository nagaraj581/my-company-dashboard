// HTML preview for printing. Returns HTML string used by window.open()
// place at: src/pages/invoice/InvoicePrint.js

import { formatCurrency, amountToWords, parseInvoiceDate } from "./invoiceUtils";

export function renderInvoiceHtml(payload) {
  const {
    companyInfo = {},
    invoiceNumber = "Draft",
    invoiceDate = new Date(),
    customerName = "",
    customerAddress = "",
    items = [],
    discountType = "amount",
    discountValue = 0,
    terms = "",
  } = payload || {};

  const d = parseInvoiceDate(invoiceDate);
  const dateStr = d.toLocaleDateString("en-IN");

  const rowsHtml = (items || [])
    .map(
      (r, i) => `
    <tr>
      <td style="padding:8px;border:1px solid #ddd">${i + 1}</td>
      <td style="padding:8px;border:1px solid #ddd">${r.item}</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right">${Number(
        r.quantity || 0
      ).toLocaleString("en-IN")}</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center">${
        r.unit || ""
      }</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right">${Number(
        r.rate || 0
      ).toFixed(2)}</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right">${Number(
        r.amount || r.quantity * r.rate || 0
      ).toFixed(2)}</td>
    </tr>
  `
    )
    .join("");

  // Calculate totals
  const totals = (() => {
    const subtotal = (items || []).reduce(
      (s, r) => s + Number((r.quantity || 0) * (r.rate || 0)),
      0
    );
    const disc =
      discountType === "percent"
        ? subtotal * (Number(discountValue || 0) / 100)
        : Number(discountValue || 0);

    const total = Math.max(0, subtotal - disc);
    return { subtotal, disc, total };
  })();

  const html = `
  <!doctype html>
  <html>
  <head>
    <meta charset="utf-8" />
    <title>Invoice - ${invoiceNumber}</title>
    <style>
      body {
        font-family: Arial, Helvetica, sans-serif; 
        color:#222; 
        max-width:800px; 
        margin:0 auto; 
        padding:24px;
      }
      h2 { margin:0; }
      .header {
        display:flex;
        justify-content:space-between;
      }
      .card {
        background:#fff;
        border:1px solid #e5e7eb;
        border-radius:10px;
        padding:16px;
      }
      table {
        width:100%;
        border-collapse:collapse;
        margin-top:12px;
      }
      th {
        background:#2f86b9;
        color:#fff;
        padding:8px;
        text-align:left;
      }
      td { 
        padding:8px; 
        border:1px solid #ddd; 
      }
      .right { text-align:right; }
      .summary {
        width:260px;
        margin-left:auto;
        border:1px solid #e5e7eb;
        border-radius:8px;
        padding:12px;
      }
      .signature {
        display:flex;
        justify-content:flex-end;
        margin-top:24px;
      }
      .terms {
        margin-top:16px;
        font-size:13px;
        color:#444;
      }
    </style>
  </head>

  <body>

    <div class="card header">
      <div>
        <h2>${companyInfo?.name || ""}</h2>
        <div style="color:#444">${companyInfo?.address || ""}</div>
        <div style="color:#444">
          Phone: ${companyInfo?.phone || ""} ${
    companyInfo?.email ? "| Email: " + companyInfo.email : ""
  }
        </div>
      </div>
      <div style="text-align:right">
        <div><strong>INVOICE</strong></div>
        <div>Invoice No: <strong>${invoiceNumber}</strong></div>
        <div>Date: <strong>${dateStr}</strong></div>
      </div>
    </div>

    <div style="margin-top:16px">
      <strong>Bill To:</strong><br>
      ${customerName || ""}<br>
      ${customerAddress || ""}
    </div>

    <table>
      <thead>
        <tr>
          <th style="width:4%">#</th>
          <th>Item</th>
          <th style="width:10%;text-align:right">Qty</th>
          <th style="width:10%;text-align:center">Unit</th>
          <th style="width:15%;text-align:right">Rate</th>
          <th style="width:15%;text-align:right">Amount</th>
        </tr>
      </thead>

      <tbody>
        ${rowsHtml}

        <tr>
          <td colspan="5" style="text-align:right;padding:8px;border:1px solid #ddd">
            <strong>Subtotal</strong>
          </td>
          <td style="text-align:right;padding:8px;border:1px solid #ddd">
            <strong>₹ ${formatCurrency(totals.subtotal)}</strong>
          </td>
        </tr>

        <tr>
          <td colspan="5" style="text-align:right;padding:8px;border:1px solid #ddd">
            Discount
          </td>
          <td style="text-align:right;padding:8px;border:1px solid #ddd">
            ₹ ${formatCurrency(totals.disc)}
          </td>
        </tr>

        <tr>
          <td colspan="5" style="text-align:right;padding:8px;border:1px solid #ddd;background:#f7f7f7">
            <strong>Total</strong>
          </td>
          <td style="text-align:right;padding:8px;border:1px solid #ddd;background:#f7f7f7">
            <strong>₹ ${formatCurrency(totals.total)}</strong>
          </td>
        </tr>
      </tbody>
    </table>

    <div style="display:flex;justify-content:space-between;margin-top:12px;align-items:center">
      <div>
        <strong>Amount (in words):</strong> ${amountToWords(totals.total)}
      </div>

      <div class="summary">
        <div style="display:flex;justify-content:space-between">
          <span>Subtotal</span><span>₹ ${formatCurrency(totals.subtotal)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;margin-top:6px">
          <span>Discount</span><span>₹ ${formatCurrency(totals.disc)}</span>
        </div>
        <div style="border-top:1px solid #eee;margin-top:8px;padding-top:8px;display:flex;justify-content:space-between;font-weight:700">
          <span>Total</span><span>₹ ${formatCurrency(totals.total)}</span>
        </div>
      </div>
    </div>

    <div class="signature">
      <div style="text-align:center">
        <div>__________________________</div>
        <div>Authorized Signature</div>
      </div>
    </div>

    <div class="terms">
      <strong>Terms & Conditions:</strong><br>
      ${(terms || "").replace(/\n/g, "<br/>")}
    </div>

    <script>
      if (window.location.search.includes('print=true')) 
        window.print();
    </script>

  </body>
  </html>
  `;

  return html;
}
