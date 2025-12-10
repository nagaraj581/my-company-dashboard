// src/services/upiService.js
import QRCode from "qrcode";

export async function generateUPIQR(upiId, name, amount = "") {
  const upiString = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(
    name
  )}&am=${amount}&cu=INR`;

  return await QRCode.toDataURL(upiString);
}
