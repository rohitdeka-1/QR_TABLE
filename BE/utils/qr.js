import crypto from 'crypto';
import QRCode from 'qrcode';
import config from '../config/index.js';

function generateToken() {
  return crypto.randomBytes(18).toString('hex');
}

function buildQrUrl(tableId, accessCode, baseUrl = null) {
  // Use the last origin (most likely main/production) or fallback to 5174
  const base = baseUrl || config.clientOrigins[config.clientOrigins.length - 1] || 'http://localhost:5174';
  return `${base}/?accessCode=${accessCode}&tableId=${tableId}`;
}

// Generate QR code as data URL (base64 PNG for embedding in JSON responses)
async function generateQrDataUrl(tableId, accessCode, baseUrl = null) {
  try {
    const url = buildQrUrl(tableId, accessCode, baseUrl);
    const dataUrl = await QRCode.toDataURL(url, {
      width: 300,
      errorCorrectionLevel: 'H',
      type: 'image/png',
    });
    return dataUrl;
  } catch (err) {
    console.error('QR code generation error', err);
    throw err;
  }
}

// Generate QR code as PNG buffer for image endpoints
async function generateQrPng(tableId, accessCode, baseUrl = null) {
  try {
    const url = buildQrUrl(tableId, accessCode, baseUrl);
    const png = await QRCode.toBuffer(url, {
      width: 300,
      errorCorrectionLevel: 'H',
    });
    return png;
  } catch (err) {
    console.error('QR code generation error', err);
    throw err;
  }
}

export { generateToken, buildQrUrl, generateQrDataUrl, generateQrPng };
