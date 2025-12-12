// src/pages/invoice/InvoicePrint.js
import { formatCurrency, amountToWords, parseInvoiceDate } from "./invoiceUtils";

export function renderInvoiceHtml(payload) {
  const {
    companyInfo = {},
    companyUpi = null,
    showQr = false,
    invoiceNumber = "Draft",
    invoiceDate = new Date(),
    customerName = "",
    customerAddress = "",
    items = [],
    discountType = "amount",
    discountValue = 0,
    amountReceived = 0,
    terms = "",
    invoiceTitle = "INVOICE",
  } = payload || {};

  const d = parseInvoiceDate(invoiceDate);
  const dateStr = d.toLocaleDateString("en-IN");

  /* ---------------- CALCULATE TOTALS ---------------- */
  const totals = (() => {
    const subtotal = items.reduce(
      (s, r) => s + Number(r.quantity * r.rate || 0),
      0
    );
    const discount =
      discountType === "percent"
        ? subtotal * (Number(discountValue || 0) / 100)
        : Number(discountValue || 0);

    const total = Math.max(0, subtotal - discount);
    const balance = total - Number(amountReceived || 0);

    return { subtotal, discount, total, balance };
  })();

  const amountForWords =
    Number(amountReceived || 0) > 0 ? totals.balance : totals.total;

  /* ---------------- TABLE ROWS ---------------- */
  const rowsHtml = items
    .map(
      (r, i) => `
    <tr>
      <td class="cell center">${i + 1}</td>
      <td class="cell">${r.item}</td>
      <td class="cell right">${Number(r.quantity).toLocaleString("en-IN")}</td>
      <td class="cell center">${r.unit}</td>
      <td class="cell right">${formatCurrency(r.rate)}</td>
      <td class="cell right">${formatCurrency(r.amount)}</td>
    </tr>`
    )
    .join("");

  /* ---------------- QR CODE HTML (if any) ---------------- */
  let qrSection = "";
  if (showQr && companyUpi) {
    const qrImg = companyUpi.qrBase64
      ? companyUpi.qrBase64
      : "";

    if (qrImg) {
      qrSection = `
        <div style="margin-top:20px;">
          <img src="${qrImg}" style="width:120px;height:120px;" />
          <div style="font-weight:bold;margin-top:6px;">Scan & Pay (UPI)</div>
        </div>
      `;
    }
  }

  /* ---------------- FINAL HTML ---------------- */
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Invoice ${invoiceNumber}</title>

  <style>
    body {
      font-family: Arial, sans-serif;
      padding: 24px;
      max-width: 900px;
      margin: auto;
      color: #222;
    }

    .header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 20px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 16px;
    }

    th {
      background: #2f86b9;
      color: white;
      padding: 8px;
      border: 1px solid #ccc;
    }

    .cell {
      padding: 8px;
      border: 1px solid #ddd;
    }

    .right { text-align: right; }
    .center { text-align: center; }

    .summary-box {
      width: 260px;
      padding: 12px;
      border: 1px solid #ddd;
      border-radius: 8px;
      float: right;
      margin-top: 10px;
    }

    .signature {
      text-align: right;
      margin-top: 60px;
    }

    .footer {
      font-style: italic;
      text-align: center;
      margin-top: 30px;
      color: #666;
    }
  </style>
</head>

<body>

  <div class="header">
    <div>
      <h2>${companyInfo?.name || ""}</h2>
      <div>${companyInfo?.address || ""}</div>
      <div>Phone: ${companyInfo.phone || ""} ${
    companyInfo.email ? "| Email: " + companyInfo.email : ""
  }</div>
    </div>

    <div style="text-align:right;">
      <div style="font-size:18px;font-weight:bold;">${invoiceTitle}</div>
      <div>Invoice No: <strong>${invoiceNumber}</strong></div>
      <div>Date: <strong>${dateStr}</strong></div>
    </div>
  </div>

  <div style="margin-top:10px;">
    <strong>Bill To:</strong><br/>
    ${customerName}<br/>
    ${customerAddress}
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:4%">#</th>
        <th>Item</th>
        <th style="width:10%" class="right">Qty</th>
        <th style="width:10%" class="center">Unit</th>
        <th style="width:15%" class="right">Rate</th>
        <th style="width:15%" class="right">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>

  <div class="summary-box">
    <div style="display:flex; justify-content:space-between;">
      <span>Subtotal</span><span>₹ ${formatCurrency(totals.subtotal)}</span>
    </div>
    <div style="display:flex; justify-content:space-between; margin-top:6px;">
      <span>Discount</span><span>₹ ${formatCurrency(totals.discount)}</span>
    </div>
    <div style="border-top:1px solid #ccc; margin-top:8px; padding-top:8px; display:flex; justify-content:space-between; font-weight:bold;">
      <span>Total</span><span>₹ ${formatCurrency(totals.total)}</span>
    </div>
    ${
      Number(amountReceived || 0) > 0
        ? `
    <div style="margin-top:6px; display:flex; justify-content:space-between;">
      <span>Amount Received</span><span>₹ ${formatCurrency(amountReceived)}</span>
    </div>

    <div style="color:#b91c1c;margin-top:6px;display:flex;justify-content:space-between;font-weight:bold;">
      <span>Balance Due</span><span>₹ ${formatCurrency(
        totals.balance
      )}</span>
    </div>`
        : ""
    }
  </div>

  ${qrSection}

  <div style="margin-top:30px;">
    <strong>Amount (in words):</strong>
    ${amountToWords(amountForWords)}
  </div>

  <div class="signature">
    <div>__________________________</div>
    <div>Authorized Signature</div>
  </div>

  <div style="margin-top:20px;">
    <strong>Terms & Conditions:</strong><br/>
    ${(terms || "").replace(/\n/g, "<br/>")}
  </div>

  <div class="footer">Thank you for your business!</div>

</body>
</html>
`;
}
