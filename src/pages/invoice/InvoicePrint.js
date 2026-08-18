// src/pages/invoice/InvoicePrint.js

import {
  formatCurrency,
  amountToWords,
  parseInvoiceDate,
  calcTotals,
} from "./invoiceUtils";

import {
  getDocumentStyle,
  getDocumentStyleId,
} from "../../config/documentStyles";

function getCurrencyWords(currency) {
  return currency === "AED" ? "Dirhams Only" : "Rupees Only";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

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

    currency = "INR",
  } = payload || {};

  const d = parseInvoiceDate(invoiceDate);
  const dateStr = d.toLocaleDateString("en-IN");

  const docStyle = getDocumentStyle(
    getDocumentStyleId(payload)
  );

  /* =========================================================
     TOTALS
     ========================================================= */

  const normalizedItems = items.map((item) => ({
    ...item,
    quantity: Number(item.quantity || 0),
    rate: Number(item.rate || 0),
    amount:
      item.amount !== undefined && item.amount !== null
        ? Number(item.amount || 0)
        : Number(item.quantity || 0) * Number(item.rate || 0),
  }));

  const {
    subtotal,
    discount,
    total,
    roundOff,
  } = calcTotals(
    normalizedItems,
    discountType,
    Number(discountValue || 0)
  );

  const received = Number(amountReceived || 0);

  const balance = Math.max(
    0,
    Number(total) - received
  );

  /*
   * IMPORTANT:
   *
   * Amount in words must represent the INVOICE TOTAL.
   *
   * Previously this code used:
   *
   * received > 0 ? balance : total
   *
   * So when the invoice was fully paid:
   *
   * Total          = Rs 840
   * AmountReceived = Rs 840
   * Balance        = Rs 0
   *
   * and the preview displayed:
   *
   * Zero Rupees Only
   *
   * We now always convert TOTAL to words.
   */

  const amountForWords = Number(total || 0);

  const amountWords = amountToWords(amountForWords);

  /* =========================================================
     TABLE ROWS
     ========================================================= */

  const rowsHtml = normalizedItems
    .map(
      (r, i) => `
        <tr>
          <td class="cell center">
            ${i + 1}
          </td>

          <td class="cell item-cell">
            ${escapeHtml(r.item || "")}
          </td>

          <td class="cell right">
            ${Number(r.quantity).toLocaleString("en-IN")}
          </td>

          <td class="cell center">
            ${escapeHtml(r.unit || "")}
          </td>

          <td class="cell right">
            ${formatCurrency(r.rate, currency)}
          </td>

          <td class="cell right">
            ${formatCurrency(r.amount, currency)}
          </td>
        </tr>
      `
    )
    .join("");

  /* =========================================================
     QR CODE
     ========================================================= */

  let qrSection = "";

  if (showQr && companyUpi?.qrBase64) {
    qrSection = `
      <div class="qr-section">
        <img
          src="${companyUpi.qrBase64}"
          class="qr-image"
          alt="UPI QR"
        />

        <div class="qr-label">
          Scan &amp; Pay (UPI)
        </div>
      </div>
    `;
  }

  /* =========================================================
     COMPANY DATA
     ========================================================= */

  const companyName = escapeHtml(companyInfo?.name || "");

  const companyAddress = escapeHtml(
    companyInfo?.address || ""
  );

  const companyPhone = escapeHtml(
    companyInfo?.phone || ""
  );

  const companyEmail = escapeHtml(
    companyInfo?.email || ""
  );

  const customerNameSafe = escapeHtml(
    customerName
  );

  const customerAddressSafe = escapeHtml(
    customerAddress
  );

  const invoiceNumberSafe = escapeHtml(
    invoiceNumber
  );

  const invoiceTitleSafe = escapeHtml(
    invoiceTitle
  );

  /* =========================================================
     ADDRESS / PHONE
     ========================================================= */

  const contactLine = `
    ${
      companyPhone
        ? `<div>Phone: ${companyPhone}</div>`
        : ""
    }

    ${
      companyEmail
        ? `<div>Email: ${companyEmail}</div>`
        : ""
    }
  `;

  /* =========================================================
     TERMS
     ========================================================= */

  const termsHtml = escapeHtml(terms)
    .replace(/\r\n/g, "<br/>")
    .replace(/\n/g, "<br/>");

  /* =========================================================
     SUMMARY
     ========================================================= */

  const receivedRow =
    received > 0
      ? `
        <div class="summary-row">
          <span>Amount Received</span>
          <span>
            ${formatCurrency(received, currency)}
          </span>
        </div>

        <div class="summary-row balance-row">
          <span>Balance Due</span>
          <span>
            ${formatCurrency(balance, currency)}
          </span>
        </div>
      `
      : "";

  /* =========================================================
     FINAL HTML
     ========================================================= */

  return `
<!DOCTYPE html>

<html>

<head>

  <meta charset="utf-8" />

  <title>
    Invoice ${invoiceNumberSafe}
  </title>

  <style>

    * {
      box-sizing: border-box;
    }

    html,
    body {
      margin: 0;
      padding: 0;
    }

    body {

      font-family:
        Arial,
        Helvetica,
        sans-serif;

      color: ${docStyle.html.text};

      background: #ffffff;

      padding: 24px;

      max-width: 900px;

      margin: 0 auto;

      font-size: 12px;

      line-height: 1.25;
    }


    /* =====================================================
       HEADER
       ===================================================== */

    .header {

      display: flex;

      justify-content: space-between;

      align-items: flex-start;

      gap: 30px;

      padding-bottom: 16px;

      border-bottom:
        1px solid
        ${docStyle.html.primary};

    }


    .company-block {

      flex: 1;

      min-width: 0;
    }


    .company-name {

      margin: 0 0 10px 0;

      font-size: 22px;

      font-weight: 700;
    }


    .company-address {

      margin-bottom: 4px;

      white-space: pre-line;
    }


    .invoice-meta {

      width: 240px;

      text-align: right;

      flex-shrink: 0;
    }


    .invoice-title {

      font-size: 18px;

      font-weight: 700;

      margin-bottom: 8px;
    }


    .invoice-meta-row {

      margin-top: 2px;
    }


    /* =====================================================
       BILL TO
       ===================================================== */

    .bill-to {

      margin-top: 18px;

      margin-bottom: 18px;
    }


    .bill-title {

      font-weight: 700;

      margin-bottom: 4px;
    }


    /* =====================================================
       TABLE
       ===================================================== */

    table {

      width: 100%;

      border-collapse: collapse;

      margin-top: 10px;

      table-layout: fixed;
    }


    th {

      background:
        ${docStyle.html.primary};

      color: #ffffff;

      padding: 8px 7px;

      border:
        1px solid
        ${docStyle.html.border};

      font-weight: 700;

      text-align: center;

      white-space: nowrap;
    }


    .cell {

      padding: 7px;

      border:
        1px solid
        ${docStyle.html.border};

      vertical-align: middle;
    }


    tbody tr:nth-child(even) {

      background:
        ${docStyle.html.tableStripe};
    }


    .item-cell {

      text-align: left;

      word-break: break-word;
    }


    .right {

      text-align: right;
    }


    .center {

      text-align: center;
    }


    /* =====================================================
       AFTER TABLE
       ===================================================== */

    .after-table {

      margin-top: 12px;

      display: flex;

      justify-content: space-between;

      align-items: flex-start;

      gap: 24px;

      width: 100%;
    }


    /* =====================================================
       AMOUNT IN WORDS
       ===================================================== */

    .words-section {

      flex: 1;

      min-width: 0;

      padding-top: 8px;

      line-height: 1.5;
    }


    .words-label {

      font-weight: 700;
    }


    /* =====================================================
       SUMMARY
       ===================================================== */

    .summary-box {

      width: 260px;

      flex-shrink: 0;

      padding: 11px;

      border:
        1px solid
        ${docStyle.html.border};

      border-radius: 7px;

      background: #ffffff;
    }


    .summary-row {

      display: flex;

      justify-content: space-between;

      align-items: center;

      gap: 15px;

      margin-bottom: 6px;

      white-space: nowrap;
    }


    .summary-total {

      border-top:
        1px solid
        #cccccc;

      margin-top: 8px;

      padding-top: 8px;

      font-weight: 700;

      font-size: 13px;
    }


    .balance-row {

      color: #b91c1c;

      font-weight: 700;

      margin-bottom: 0;
    }


    /* =====================================================
       QR
       ===================================================== */

    .qr-section {

      margin-top: 18px;

      text-align: left;
    }


    .qr-image {

      width: 100px;

      height: 100px;

      display: block;
    }


    .qr-label {

      margin-top: 6px;

      font-weight: 700;

      font-size: 11px;
    }


    /* =====================================================
       LOWER SECTION
       ===================================================== */

    .lower-section {

      margin-top: 34px;

      display: flex;

      justify-content: space-between;

      align-items: flex-start;

      gap: 40px;
    }


    /* =====================================================
       TERMS
       ===================================================== */

    .terms {

      flex: 1;

      min-width: 0;

      line-height: 1.4;
    }


    .terms-title {

      font-weight: 700;

      margin-bottom: 4px;
    }


    /* =====================================================
       SIGNATURE
       ===================================================== */

    .signature {

      width: 220px;

      flex-shrink: 0;

      text-align: center;

      margin-top: 8px;
    }


    .signature-line {

      border-top:
        1px solid
        #333333;

      width: 100%;

      margin-bottom: 6px;
    }


    .signature-label {

      font-size: 11px;

      white-space: nowrap;
    }


    /* =====================================================
       FOOTER
       ===================================================== */

    .footer {

      font-style: italic;

      text-align: center;

      margin-top: 34px;

      color: ${docStyle.html.muted};

      font-size: 11px;
    }


    /* =====================================================
       PRINT
       ===================================================== */

    @media print {

      body {

        padding: 0;

        max-width: none;
      }


      .header {

        break-inside: avoid;
      }


      table {

        break-inside: auto;
      }


      tr {

        break-inside: avoid;

        break-after: auto;
      }


      .summary-box,
      .lower-section,
      .signature,
      .terms {

        break-inside: avoid;
      }
    }


    /* =====================================================
       SMALL SCREEN PREVIEW
       ===================================================== */

    @media screen and (max-width: 700px) {

      body {

        padding: 15px;

        font-size: 11px;
      }


      .header {

        gap: 15px;
      }


      .company-name {

        font-size: 18px;
      }


      .invoice-meta {

        width: 180px;
      }


      .after-table {

        gap: 12px;
      }


      .summary-box {

        width: 230px;
      }


      .lower-section {

        gap: 20px;
      }


      .signature {

        width: 180px;
      }
    }

  </style>

</head>


<body>


  <!-- =====================================================
       HEADER
       ===================================================== -->

  <div class="header">

    <div class="company-block">

      <div class="company-name">
        ${companyName}
      </div>

      ${
        companyAddress
          ? `
            <div class="company-address">
              ${companyAddress}
            </div>
          `
          : ""
      }

      ${contactLine}

    </div>


    <div class="invoice-meta">

      <div class="invoice-title">
        ${invoiceTitleSafe}
      </div>

      <div class="invoice-meta-row">
        Invoice No:
        <strong>${invoiceNumberSafe}</strong>
      </div>

      <div class="invoice-meta-row">
        Date:
        <strong>${dateStr}</strong>
      </div>

    </div>

  </div>


  <!-- =====================================================
       BILL TO
       ===================================================== -->

  <div class="bill-to">

    <div class="bill-title">
      Bill To:
    </div>

    <div>
      ${customerNameSafe}
    </div>

    ${
      customerAddressSafe
        ? `
          <div>
            ${customerAddressSafe}
          </div>
        `
        : ""
    }

  </div>


  <!-- =====================================================
       ITEMS TABLE
       ===================================================== -->

  <table>

    <thead>

      <tr>

        <th style="width: 5%;">
          #
        </th>

        <th style="width: 40%;">
          Item
        </th>

        <th style="width: 10%;">
          Qty
        </th>

        <th style="width: 10%;">
          Unit
        </th>

        <th style="width: 17.5%;">
          Rate
        </th>

        <th style="width: 17.5%;">
          Amount
        </th>

      </tr>

    </thead>


    <tbody>

      ${rowsHtml}

    </tbody>

  </table>


  <!-- =====================================================
       WORDS + SUMMARY
       ===================================================== -->

  <div class="after-table">


    <!-- AMOUNT IN WORDS -->

    <div class="words-section">

      <span class="words-label">
        Amount (in words):
      </span>

      ${escapeHtml(amountWords)}
      ${getCurrencyWords(currency)}

    </div>


    <!-- SUMMARY -->

    <div class="summary-box">

      <div class="summary-row">

        <span>
          Subtotal
        </span>

        <span>
          ${formatCurrency(subtotal, currency)}
        </span>

      </div>


      <div class="summary-row">

        <span>
          Discount
        </span>

        <span>
          ${formatCurrency(discount, currency)}
        </span>

      </div>


      ${
        Math.abs(Number(roundOff || 0)) >= 0.005
          ? `
            <div class="summary-row">

              <span>
                Round Off
              </span>

              <span>
                ${formatCurrency(roundOff, currency)}
              </span>

            </div>
          `
          : ""
      }


      <div class="summary-row summary-total">

        <span>
          Total
        </span>

        <span>
          ${formatCurrency(total, currency)}
        </span>

      </div>


      ${receivedRow}

    </div>

  </div>


  <!-- =====================================================
       QR CODE
       ===================================================== -->

  ${qrSection}


  <!-- =====================================================
       TERMS + SIGNATURE
       ===================================================== -->

  <div class="lower-section">


    <!-- TERMS -->

    <div class="terms">

      <div class="terms-title">
        Terms &amp; Conditions:
      </div>

      ${
        termsHtml
          ? `<div>${termsHtml}</div>`
          : ""
      }

    </div>


    <!-- SIGNATURE -->

    <div class="signature">

      <div class="signature-line"></div>

      <div class="signature-label">
        Authorised Signature
      </div>

    </div>


  </div>


  <!-- =====================================================
       FOOTER
       ===================================================== -->

  <div class="footer">
    Thank you for your business!
  </div>


</body>

</html>
`;
}