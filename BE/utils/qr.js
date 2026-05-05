import crypto from 'crypto';
import QRCode from 'qrcode';
import config from '../config/index.js';

function generateToken() {
  return crypto.randomBytes(18).toString('hex');
}

function buildQrUrl(tableId, accessCode, tableNumber, baseUrl = null) {
  const base = baseUrl || config.clientOrigins[config.clientOrigins.length - 1] || 'http://localhost:5174';
  return `${base}/?accessCode=${accessCode}&tableId=${tableId}&tableNumber=${tableNumber}`;
}

async function generateQrDataUrl(tableId, accessCode, tableNumber, baseUrl = null) {
  try {
    const url = buildQrUrl(tableId, accessCode, tableNumber, baseUrl);
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

async function generateQrPng(tableId, accessCode, tableNumber, baseUrl = null) {
  try {
    const url = buildQrUrl(tableId, accessCode, tableNumber, baseUrl);
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
