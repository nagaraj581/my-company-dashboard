import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import QRCode from "qrcode";

import {
  amountToWords,
  formatCurrency,
  parseInvoiceDate,
  calcTotals,
} from "./invoiceUtils";

import {
  getDocumentStyle,
  getDocumentStyleId,
} from "../../config/documentStyles";

/* ============================================================
   HELPERS
============================================================ */

function getCurrencyWords(currency) {
  return currency === "AED" ? "Dirhams Only" : "Rupees Only";
}

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function text(value) {
  if (value === null || value === undefined) return "";
  return String(value);
}

/* ============================================================
   FALLBACK AMOUNT TO WORDS

   This protects the PDF even if invoiceUtils.amountToWords()
   receives an unexpected value.
============================================================ */

function safeAmountToWords(value) {
  const amount = Math.floor(Math.abs(num(value)));

  if (amount === 0) {
    return "Zero";
  }

  const ones = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];

  const tens = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];

  function below100(n) {
    if (n < 20) {
      return ones[n];
    }

    return (
      tens[Math.floor(n / 10)] +
      (n % 10 ? ` ${ones[n % 10]}` : "")
    );
  }

  function below1000(n) {
    if (n < 100) {
      return below100(n);
    }

    return (
      `${ones[Math.floor(n / 100)]} Hundred` +
      (n % 100 ? ` and ${below100(n % 100)}` : "")
    );
  }

  function indianWords(n) {
    if (n < 1000) {
      return below1000(n);
    }

    if (n < 100000) {
      return (
        `${indianWords(Math.floor(n / 1000))} Thousand` +
        (n % 1000 ? ` ${below1000(n % 1000)}` : "")
      );
    }

    if (n < 10000000) {
      return (
        `${indianWords(Math.floor(n / 100000))} Lakh` +
        (n % 100000
          ? ` ${indianWords(n % 100000)}`
          : "")
      );
    }

    return (
      `${indianWords(Math.floor(n / 10000000))} Crore` +
      (n % 10000000
        ? ` ${indianWords(n % 10000000)}`
        : "")
    );
  }

  return indianWords(amount);
}

/* ============================================================
   EXPORT PDF
============================================================ */

export async function exportPdf(invoice) {
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
    currency = "INR",
  } = invoice || {};

  /* ==========================================================
     DOCUMENT
  ========================================================== */

  const doc = new jsPDF("p", "pt", "a4");

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const docStyle = getDocumentStyle(
    getDocumentStyleId(invoice)
  );

  const left = 40;
  const right = 40;

  const usableWidth = pageWidth - left - right;

  const primaryColor =
    docStyle?.primary || [52, 152, 219];

  const stripeColor =
    docStyle?.tableStripe || [245, 245, 245];

  /* ==========================================================
     HEADER
  ========================================================== */

  let y = 42;

  /* Company name */

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(25, 25, 25);

  doc.text(
    text(companyInfo?.name),
    left,
    y
  );

  /* Invoice title */

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);

  doc.text(
    text(invoice.invoiceTitle || "INVOICE"),
    pageWidth - right,
    y,
    {
      align: "right",
    }
  );

  /* ==========================================================
     COMPANY DETAILS
  ========================================================== */

  y += 18;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(40, 40, 40);

  const companyAddress =
    text(companyInfo?.address);

  const addressLines = companyAddress
    ? doc.splitTextToSize(
        companyAddress,
        280
      )
    : [];

  if (addressLines.length) {
    doc.text(
      addressLines,
      left,
      y
    );

    y += addressLines.length * 12;
  }

  const companyPhone =
    text(companyInfo?.phone);

  const companyEmail =
    text(companyInfo?.email);

  if (companyPhone) {
    doc.text(
      `Phone: ${companyPhone}`,
      left,
      y
    );

    y += 12;
  }

  if (companyEmail) {
    doc.text(
      `Email: ${companyEmail}`,
      left,
      y
    );

    y += 12;
  }

  /* ==========================================================
     INVOICE META
  ========================================================== */

  const date =
    parseInvoiceDate(invoiceDate);

  const dateStr =
    date.toLocaleDateString("en-IN");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);

  doc.text(
    `Invoice No: ${text(invoiceNumber)}`,
    pageWidth - right,
    y - 18,
    {
      align: "right",
    }
  );

  doc.text(
    `Date: ${dateStr}`,
    pageWidth - right,
    y - 5,
    {
      align: "right",
    }
  );

  /* ==========================================================
     HEADER LINE
  ========================================================== */

  const lineY =
    Math.max(y + 8, 88);

  doc.setDrawColor(
    ...primaryColor
  );

  doc.setLineWidth(1);

  doc.line(
    left,
    lineY,
    pageWidth - right,
    lineY
  );

  /* ==========================================================
     BILL TO
  ========================================================== */

  y = lineY + 25;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(20, 20, 20);

  doc.text(
    "Bill To:",
    left,
    y
  );

  y += 15;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);

  doc.text(
    text(customerName),
    left,
    y
  );

  y += 13;

  doc.setFont("helvetica", "normal");

  if (customerAddress) {
    const customerLines =
      doc.splitTextToSize(
        text(customerAddress),
        300
      );

    doc.text(
      customerLines,
      left,
      y
    );

    y +=
      customerLines.length * 12;
  }

  /* ==========================================================
     PREPARE ITEMS
  ========================================================== */

  const safeItems =
    Array.isArray(items)
      ? items
      : [];

  const tableRows =
    safeItems.map(
      (item, index) => {
        const quantity =
          num(item?.quantity);

        const rate =
          num(item?.rate);

        const amount =
          item?.amount !== undefined
            ? num(item.amount)
            : quantity * rate;

        return [
          index + 1,

          text(
            item?.item ||
              item?.description
          ),

          quantity.toLocaleString(
            "en-IN"
          ),

          text(item?.unit),

          formatCurrency(
            rate,
            currency
          ),

          formatCurrency(
            amount,
            currency
          ),
        ];
      }
    );

  /* ==========================================================
     ITEMS TABLE
  ========================================================== */

  const tableStart =
    y + 20;

  autoTable(doc, {
    startY: tableStart,

    head: [
      [
        "#",
        "Item",
        "Qty",
        "Unit",
        "Rate",
        "Amount",
      ],
    ],

    body: tableRows,

    theme: "grid",

    styles: {
      font: "helvetica",
      fontSize: 9,
      cellPadding: 6,
      lineColor: [215, 215, 215],
      lineWidth: 0.5,
      textColor: [35, 35, 35],
      valign: "middle",
    },

    headStyles: {
      fillColor: primaryColor,
      textColor: 255,
      fontStyle: "bold",
      fontSize: 9,
      halign: "center",
      valign: "middle",
      cellPadding: 6,
    },

    bodyStyles: {
      fontSize: 9,
    },

    alternateRowStyles: {
      fillColor: stripeColor,
    },

    columnStyles: {
      0: {
        cellWidth: 28,
        halign: "center",
      },

      1: {
        cellWidth: 250,
        halign: "left",
      },

      2: {
        cellWidth: 55,
        halign: "right",
      },

      3: {
        cellWidth: 55,
        halign: "center",
      },

      4: {
        cellWidth: 75,
        halign: "right",
      },

      5: {
        cellWidth: 85,
        halign: "right",
      },
    },

    margin: {
      left,
      right,
    },

    tableWidth: "auto",

    didDrawPage: () => {
      doc.setFont(
        "helvetica",
        "normal"
      );
    },
  });

  /* ==========================================================
     TOTAL CALCULATION
  ========================================================== */

  const totals =
    calcTotals(
      safeItems,
      discountType,
      discountValue
    ) || {};

  const subtotal =
    num(totals.subtotal);

  const discount =
    num(totals.discount);

  const total =
    num(totals.total);

  const roundOff =
    num(totals.roundOff);

  /* ==========================================================
     PAYMENT
  ========================================================== */

  const amountReceived =
    num(invoice.amountReceived);

  /*
    IMPORTANT:
    Balance can never be negative.
  */

  const balanceDue =
    Math.max(
      0,
      total - amountReceived
    );

  /* ==========================================================
     TOTALS BOX
  ========================================================== */

  let totalsY =
    doc.lastAutoTable.finalY + 12;

  const totalsWidth = 215;

  const totalsX =
    pageWidth -
    right -
    totalsWidth;

  const rowHeight = 18;

  let numberOfRows = 4;

  if (amountReceived > 0) {
    numberOfRows += 2;
  }

  const totalsHeight =
    numberOfRows *
      rowHeight +
    18;

  /* Border */

  doc.setDrawColor(
    210,
    210,
    210
  );

  doc.setLineWidth(0.7);

  doc.roundedRect(
    totalsX,
    totalsY,
    totalsWidth,
    totalsHeight,
    5,
    5
  );

  let ty =
    totalsY + 17;

  const labelX =
    totalsX + 10;

  const valueX =
    totalsX +
    totalsWidth -
    10;

  doc.setFont(
    "helvetica",
    "normal"
  );

  doc.setFontSize(9.5);

  doc.setTextColor(
    35,
    35,
    35
  );

  /* Subtotal */

  doc.text(
    "Subtotal",
    labelX,
    ty
  );

  doc.text(
    formatCurrency(
      subtotal,
      currency
    ),
    valueX,
    ty,
    {
      align: "right",
    }
  );

  ty += rowHeight;

  /* Discount */

  let discountLabel =
    "Discount";

  if (
    discountType ===
    "percent"
  ) {
    discountLabel =
      `Discount (${discountValue}%)`;
  }

  doc.text(
    discountLabel,
    labelX,
    ty
  );

  doc.text(
    formatCurrency(
      discount,
      currency
    ),
    valueX,
    ty,
    {
      align: "right",
    }
  );

  ty += rowHeight;

  /* Round Off */

  doc.text(
    "Round Off",
    labelX,
    ty
  );

  doc.text(
    formatCurrency(
      roundOff,
      currency
    ),
    valueX,
    ty,
    {
      align: "right",
    }
  );

  ty += 5;

  /* Separator */

  doc.setDrawColor(
    205,
    205,
    205
  );

  doc.line(
    labelX,
    ty,
    valueX,
    ty
  );

  ty += 17;

  /* TOTAL */

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(10.5);

  doc.text(
    "Total",
    labelX,
    ty
  );

  doc.text(
    formatCurrency(
      total,
      currency
    ),
    valueX,
    ty,
    {
      align: "right",
    }
  );

  /* Amount Received */

  if (amountReceived > 0) {
    ty += rowHeight;

    doc.setFont(
      "helvetica",
      "normal"
    );

    doc.setFontSize(9.5);

    doc.text(
      "Amount Received",
      labelX,
      ty
    );

    doc.text(
      formatCurrency(
        amountReceived,
        currency
      ),
      valueX,
      ty,
      {
        align: "right",
      }
    );

    /* Balance Due */

    ty += rowHeight;

    doc.setFont(
      "helvetica",
      "bold"
    );

    if (balanceDue > 0) {
      doc.setTextColor(
        190,
        30,
        30
      );
    } else {
      doc.setTextColor(
        30,
        120,
        60
      );
    }

    doc.text(
      "Balance Due",
      labelX,
      ty
    );

    doc.text(
      formatCurrency(
        balanceDue,
        currency
      ),
      valueX,
      ty,
      {
        align: "right",
      }
    );

    doc.setTextColor(
      35,
      35,
      35
    );
  }

  /* ==========================================================
     AMOUNT IN WORDS
  ========================================================== */

  /*
    IMPORTANT FIX

    Previously the code used:

      amountReceived > 0
        ? balanceDue
        : total

    Therefore a fully paid invoice:
      Total = 840
      Received = 840
      Balance = 0

    became:

      "Zero Rupees Only"

    We now ALWAYS display the invoice TOTAL
    in words.
  */

  const amountForWords =
    Math.max(
      0,
      num(total)
    );

  let wordsY =
    totalsY +
    totalsHeight +
    25;

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(9.5);

  doc.setTextColor(
    35,
    35,
    35
  );

  doc.text(
    "Amount in words:",
    left,
    wordsY
  );

  doc.setFont(
    "helvetica",
    "normal"
  );

  /*
    Use invoiceUtils first.
    If it fails or returns an invalid result,
    use the safe local converter.
  */

  let convertedWords = "";

  try {
    convertedWords =
      amountToWords(
        amountForWords
      );
  } catch (error) {
    console.error(
      "amountToWords failed:",
      error
    );
  }

  if (
    !convertedWords ||
    String(
      convertedWords
    ).trim() === ""
  ) {
    convertedWords =
      safeAmountToWords(
        amountForWords
      );
  }

  /*
    Extra protection:
    If invoiceUtils incorrectly returns "Zero"
    for a non-zero total, use the local converter.
  */

  if (
    amountForWords > 0 &&
    String(
      convertedWords
    )
      .trim()
      .toLowerCase() === "zero"
  ) {
    convertedWords =
      safeAmountToWords(
        amountForWords
      );
  }

  const wordsText =
    `${convertedWords} ${getCurrencyWords(currency)}`;

  const wordsLines =
    doc.splitTextToSize(
      wordsText,
      usableWidth - 100
    );

  doc.text(
    wordsLines,
    left + 85,
    wordsY
  );

  wordsY +=
    Math.max(
      1,
      wordsLines.length
    ) * 12;

  /* ==========================================================
     QR CODE
  ========================================================== */

  let qrBottom =
    wordsY;

  if (invoice.showQr) {
    const qrSize = 72;

    const qrX = left;

    const qrY =
      wordsY + 15;

    let qrBase64 = "";

    const effectiveUpi =
      invoice.companyUpi ??
      invoice.companyInfo?.activeUpi ??
      null;

    if (
      effectiveUpi?.qrBase64
    ) {
      qrBase64 =
        effectiveUpi.qrBase64;
    } else if (
      effectiveUpi?.upiId
    ) {
      /*
        UPI should always be INR.
      */

      const upiAmount =
        num(total);

      const upiString =
        `upi://pay?pa=${encodeURIComponent(
          effectiveUpi.upiId
        )}` +
        `&pn=${encodeURIComponent(
          effectiveUpi?.name ||
            companyInfo?.name ||
            "Merchant"
        )}` +
        `&am=${upiAmount.toFixed(
          2
        )}` +
        `&cu=INR`;

      try {
        qrBase64 =
          await QRCode.toDataURL(
            upiString,
            {
              margin: 1,
              width: 300,
            }
          );
      } catch (error) {
        console.error(
          "QR generation failed:",
          error
        );
      }
    }

    if (qrBase64) {
      doc.addImage(
        qrBase64,
        "PNG",
        qrX,
        qrY,
        qrSize,
        qrSize
      );

      doc.setFont(
        "helvetica",
        "bold"
      );

      doc.setFontSize(8.5);

      doc.setTextColor(
        35,
        35,
        35
      );

      doc.text(
        "Scan & Pay (UPI)",
        qrX,
        qrY + qrSize + 13
      );

      qrBottom =
        qrY +
        qrSize +
        20;
    }
  }

  /* ==========================================================
     TERMS + SIGNATURE

     IMPORTANT:
     Signature is now positioned independently from
     the totals box.

     Left:
       Terms & Conditions

     Right:
       Signature

     This prevents the signature line from crossing
     or sitting underneath the totals panel.
  ========================================================== */

  const contentBottom =
    Math.max(
      wordsY,
      qrBottom
    );

  /*
    Give enough vertical separation from
    amount-in-words / QR.
  */

  const termsY =
    contentBottom + 38;

  /* ----------------------------------------------------------
     TERMS
  ---------------------------------------------------------- */

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(10.5);

  doc.setTextColor(
    0,
    0,
    0
  );

  doc.text(
    "Terms & Conditions:",
    left,
    termsY
  );

  doc.setFont(
    "helvetica",
    "normal"
  );

  doc.setFontSize(9.5);

  const termsText =
    text(terms);

  /*
    Keep terms strictly on the left half.
  */

  const termsWidth =
    pageWidth / 2 -
    left -
    20;

  const wrappedTerms =
    termsText
      ? doc.splitTextToSize(
          termsText,
          termsWidth
        )
      : [];

  if (
    wrappedTerms.length > 0
  ) {
    doc.text(
      wrappedTerms,
      left,
      termsY + 16
    );
  }

  /* ----------------------------------------------------------
     SIGNATURE
  ---------------------------------------------------------- */

  const signatureWidth = 150;

  const signatureX =
    pageWidth -
    right -
    signatureWidth;

  /*
    Signature is aligned with the
    Terms & Conditions section.
  */

  const signatureY =
    termsY + 28;

  doc.setDrawColor(
    70,
    70,
    70
  );

  doc.setLineWidth(0.7);

  doc.line(
    signatureX,
    signatureY,
    pageWidth - right,
    signatureY
  );

  doc.setFont(
    "helvetica",
    "normal"
  );

  doc.setFontSize(9.5);

  doc.setTextColor(
    0,
    0,
    0
  );

  doc.text(
    "Authorised Signature",
    signatureX +
      signatureWidth / 2,
    signatureY + 14,
    {
      align: "center",
    }
  );

  /* ==========================================================
     FOOTER
  ========================================================== */

  doc.setFont(
    "helvetica",
    "italic"
  );

  doc.setFontSize(9);

  doc.setTextColor(
    100,
    100,
    100
  );

  doc.text(
    "Thank you for your business!",
    pageWidth / 2,
    pageHeight - 35,
    {
      align: "center",
    }
  );

  /* ==========================================================
     SAVE
  ========================================================== */

  const safeName =
    text(invoiceNumber)
      .replace(
        /[^\w-]/g,
        "_"
      );

  doc.save(
    `${safeName}.pdf`
  );
}