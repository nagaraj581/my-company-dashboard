import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import QRCode from "qrcode";
import {
  amountToWords,
  formatCurrency,
  parseInvoiceDate,
  calcTotals,
} from "./invoiceUtils";

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
  } = invoice;

  const doc = new jsPDF("p", "pt", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const left = 40;
  const right = 40;

  /* ---------------- HEADER ---------------- */
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.text("INVOICE", left, 60);

  doc.setDrawColor(30, 80, 130);
  doc.setLineWidth(1);
  doc.line(left, 75, pageWidth - right, 75);

  /* ---------------- COMPANY INFO ---------------- */
  let y = 110;

  // Company Name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(companyInfo?.name || "", left, y);

  // Address (auto-wrap)
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);

  const addrLines = doc.splitTextToSize(companyInfo?.address || "", 250);
  y += 18;
  doc.text(addrLines, left, y);
  y += addrLines.length * 14;

  // Phone + Email
  const phoneLine = `Phone: ${companyInfo?.phone || ""}${
    companyInfo?.email ? " | Email: " + companyInfo.email : ""
  }`;

  doc.text(phoneLine, left, y);
  y += 30;

  /* ---------------- INVOICE META ---------------- */
  const dateStr = parseInvoiceDate(invoiceDate).toLocaleDateString("en-IN");

  doc.setFontSize(11);
  doc.text(`Invoice No: ${invoiceNumber}`, pageWidth - right, 110, {
    align: "right",
  });
  doc.text(`Date: ${dateStr}`, pageWidth - right, 128, {
    align: "right",
  });

  /* ---------------- BILL TO ---------------- */
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Bill To:", left, y);

  y += 20;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.text(customerName || "", left, y);

  y += 18;
  if (customerAddress) doc.text(customerAddress, left, y);

  /* ---------------- TABLE ---------------- */
  const tableStart = y + 40;

  autoTable(doc, {
    startY: tableStart,
    head: [["#", "Description", "Price", "Qty", "Unit", "Total"]],
    body: items.map((r, i) => [
      i + 1,
      r.item,
      formatCurrency(r.rate),
      r.quantity.toLocaleString("en-IN"),
      r.unit,
      formatCurrency(r.amount),
    ]),
    theme: "grid",
    headStyles: {
      fillColor: [30, 80, 130],
      textColor: 255,
      fontStyle: "bold",
    },
    bodyStyles: {
      font: "helvetica",
      fontSize: 10,
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    columnStyles: {
      2: { halign: "right" },
      3: { halign: "right" },
      5: { halign: "right" },
    },
    margin: { left, right },
  });

  /* ---------------- AFTER TABLE ---------------- */
  let ty = doc.lastAutoTable.finalY + 20;

  /* ---------------- TOTALS ---------------- */
  const { subtotal, discount, total, roundOff } = calcTotals(
    items,
    discountType,
    discountValue
  );

  const labelX = pageWidth - right - 200;
  const valueX = pageWidth - right;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);

  // Subtotal
  doc.text("Subtotal:", labelX, ty);
  doc.text(`Rs. ${formatCurrency(subtotal)}`, valueX, ty, { align: "right" });

  ty += 18;

  // Discount
  const discountLabel =
    discountType === "percent"
      ? `Discount (${discountValue}%)`
      : `Discount (Rs.${discountValue})`;

  doc.text(discountLabel, labelX, ty);
  doc.text(`Rs. ${formatCurrency(discount)}`, valueX, ty, { align: "right" });

  ty += 18;

  // Round off
  doc.text("Round Off:", labelX, ty);
  doc.text(`Rs. ${formatCurrency(roundOff)}`, valueX, ty, { align: "right" });

  ty += 24;

  // TOTAL
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("TOTAL:", labelX, ty);
  doc.text(`Rs. ${formatCurrency(total)}`, valueX, ty, { align: "right" });

  /* ---------------- QR CODE ---------------- */
  const qrX = left;
  const qrY = ty + 20;
  const qrSize = 90;

  // Generate UPI QR
  let upiBase64 = "";
  const upiString = `upi://pay?pa=nagaraj581@ybl&pn=${encodeURIComponent(
    customerName || "Customer"
  )}&am=${total}&cu=INR`;

  try {
    upiBase64 = await QRCode.toDataURL(upiString);
  } catch (err) {
    console.error("QR generation failed:", err);
  }

  if (upiBase64) {
    doc.addImage(upiBase64, "PNG", qrX, qrY, qrSize, qrSize);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Scan & Pay (UPI)", qrX, qrY + qrSize + 15);
  }

  /* ---------------- AMOUNT IN WORDS ---------------- */
  let wordsY = qrY + qrSize + 40;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(`Amount in words: Rupees ${amountToWords(total)}`, left, wordsY);

  /* ---------------- SIGNATURE ---------------- */
  const sigY = wordsY + 40;
  doc.line(pageWidth - right - 120, sigY, pageWidth - right, sigY);
  doc.text("Authorized Sign", pageWidth - right - 80, sigY + 14);

  /* ---------------- TERMS ---------------- */
  const termsY = sigY + 50;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Terms & Conditions", left, termsY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  const wrapped = doc.splitTextToSize(terms || "", pageWidth - left - right);
  doc.text(wrapped, left, termsY + 18);

  /* ---------------- FOOTER ---------------- */
  doc.setFont("helvetica", "italic");
  doc.setFontSize(11);
  doc.setTextColor(80);

  // moved a bit lower so it never overlaps bottom content
  doc.text(
    "Thank you for your business!",
    pageWidth / 2,
    pageHeight - 10,
    { align: "center" }
  );

  /* ---------------- SAVE ---------------- */
  const safeName = String(invoiceNumber).replace(/[^\w\-]/g, "_");
  doc.save(`${safeName}.pdf`);
}
