import Table from '../models/Table.js';
import { generateToken, buildQrUrl, generateQrDataUrl, generateQrPng } from '../utils/qr.js';
import { validationResult } from 'express-validator';
import fs from 'fs/promises';
import path from 'path';

const QR_CODES_DIR = path.join(process.cwd(), 'QR codes');

function normalizeTableNumber(value) {
  const raw = String(value ?? '').trim();
  if (!/^\d+$/.test(raw)) return null;
  const asNumber = Number(raw);
  if (!Number.isInteger(asNumber) || asNumber < 1) return null;
  return String(asNumber);
}

function ensureAccessCode(table) {
  if (table.accessCode) return table.accessCode;
  table.accessCode = generateToken();
  return table.accessCode;
}

function buildQrFileName(tableNumber, qrVersion) {
  const safeTableNumber = String(tableNumber).replace(/[^a-zA-Z0-9-_]/g, '_');
  return `${safeTableNumber}-v${qrVersion}.png`;
}

async function saveQrToFile(tableId, tableNumber, qrVersion, token) {
  await fs.mkdir(QR_CODES_DIR, { recursive: true });
  const fileName = buildQrFileName(tableNumber, qrVersion);
  const filePath = path.join(QR_CODES_DIR, fileName);
  const pngBuffer = await generateQrPng(tableId, token);
  await fs.writeFile(filePath, pngBuffer);
  return filePath;
}

// Helper: Generate QR code and save to database
async function generateAndSaveQrCode(tableId, token) {
  try {
    const qrDataUrl = await generateQrDataUrl(tableId, token);
    const qrUrl = buildQrUrl(tableId, token);
    return { qrDataUrl, qrUrl };
  } catch (err) {
    console.error('QR generation error:', err);
    throw err;
  }
}

async function createTable(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const normalizedTableNumber = normalizeTableNumber(req.body.tableNumber);
  if (!normalizedTableNumber) {
    return res.status(400).json({ message: 'tableNumber must be a positive integer (1, 2, 3...)' });
  }

  const { location } = req.body;
  const token = generateToken();
  const accessCode = generateToken();
  
  try {
    // Create the table first so QR URL includes a real tableId.
    const table = await Table.create({ 
      tableNumber: normalizedTableNumber,
      location, 
      qrToken: token,
      accessCode,
    });

    const { qrDataUrl, qrUrl } = await generateAndSaveQrCode(table._id, accessCode);
    const qrFilePath = await saveQrToFile(table._id, table.tableNumber, table.qrVersion, accessCode);

    table.qrCodeImage = qrDataUrl;
    table.qrUrl = qrUrl;
    table.qrFilePath = qrFilePath;
    await table.save();
    
    res.status(201).json({ 
      table: {
        _id: table._id,
        tableNumber: table.tableNumber,
        location: table.location,
        qrVersion: table.qrVersion,
        qrFilePath: table.qrFilePath,
      },
      accessCode: table.accessCode,
      qrUrl: qrUrl,
      qrCode: qrDataUrl // Base64 PNG for immediate display
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: `Table '${req.body.tableNumber}' already exists` });
    }
    console.error('Table creation error:', err);
    res.status(500).json({ message: 'Table creation failed' });
  }
}

async function listTables(req, res) {
  const tables = await Table.find({}).sort({ createdAt: 1 }).lean();
  const sorted = tables.sort((a, b) => {
    const aNum = Number(a.tableNumber);
    const bNum = Number(b.tableNumber);
    if (Number.isNaN(aNum) && Number.isNaN(bNum)) return String(a.tableNumber).localeCompare(String(b.tableNumber));
    if (Number.isNaN(aNum)) return 1;
    if (Number.isNaN(bNum)) return -1;
    return aNum - bNum;
  });
  res.json(sorted);
}

async function updateTable(req, res) {
  const table = await Table.findById(req.params.id);
  if (!table) return res.status(404).json({ message: 'Table not found' });

  const updates = {};
  if (Object.prototype.hasOwnProperty.call(req.body, 'location')) {
    updates.location = req.body.location;
  }

  let didChangeTableNumber = false;
  if (Object.prototype.hasOwnProperty.call(req.body, 'tableNumber')) {
    const normalizedTableNumber = normalizeTableNumber(req.body.tableNumber);
    if (!normalizedTableNumber) {
      return res.status(400).json({ message: 'tableNumber must be a positive integer (1, 2, 3...)' });
    }
    updates.tableNumber = normalizedTableNumber;
    didChangeTableNumber = normalizedTableNumber !== table.tableNumber;
  }

  try {
    const updated = await Table.findByIdAndUpdate(
      req.params.id,
      { ...updates, updatedAt: new Date() },
      { new: true, runValidators: true },
    );

    if (didChangeTableNumber) {
      updated.qrFilePath = await saveQrToFile(updated._id, updated.tableNumber, updated.qrVersion, ensureAccessCode(updated));
      await updated.save();
    }

    res.json(updated);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: `Table '${req.body.tableNumber}' already exists` });
    }
    throw err;
  }
}

async function deleteTable(req, res) {
  const table = await Table.findByIdAndDelete(req.params.id);
  if (!table) return res.status(404).json({ message: 'Table not found' });
  res.status(204).send();
}

async function syncTableRange(req, res) {
  const start = Number(req.body.startNumber);
  const end = Number(req.body.endNumber);
  const pruneOutside = Boolean(req.body.pruneOutside);

  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < 1 || start > end) {
    return res.status(400).json({ message: 'startNumber and endNumber must be positive integers, with startNumber <= endNumber' });
  }

  const targetTableNumbers = new Set();
  for (let tableNumber = start; tableNumber <= end; tableNumber += 1) {
    targetTableNumbers.add(String(tableNumber));
  }

  const existingTables = await Table.find({}).lean();
  const existingByNumber = new Map(existingTables.map((table) => [String(table.tableNumber), table]));

  const created = [];
  for (let tableNumber = start; tableNumber <= end; tableNumber += 1) {
    const tableNumberValue = String(tableNumber);
    if (existingByNumber.has(tableNumberValue)) continue;

    const token = generateToken();
    const table = await Table.create({
      tableNumber: tableNumberValue,
      location: `Range ${start}-${end}`,
      qrToken: token,
      accessCode: generateToken(),
    });
    const { qrDataUrl, qrUrl } = await generateAndSaveQrCode(table._id, table.accessCode);
    table.qrCodeImage = qrDataUrl;
    table.qrUrl = qrUrl;
    table.qrFilePath = await saveQrToFile(table._id, table.tableNumber, table.qrVersion, table.accessCode);
    await table.save();
    created.push(table);
  }

  let prunedCount = 0;
  if (pruneOutside) {
    const outsideIds = existingTables
      .filter((table) => !targetTableNumbers.has(String(table.tableNumber)))
      .map((table) => table._id);
    if (outsideIds.length) {
      const result = await Table.deleteMany({ _id: { $in: outsideIds } });
      prunedCount = result.deletedCount || 0;
    }
  }

  const refreshed = await Table.find({}).sort({ createdAt: 1 }).lean();
  const sorted = refreshed.sort((a, b) => {
    const aNum = Number(a.tableNumber);
    const bNum = Number(b.tableNumber);
    if (Number.isNaN(aNum) && Number.isNaN(bNum)) return String(a.tableNumber).localeCompare(String(b.tableNumber));
    if (Number.isNaN(aNum)) return 1;
    if (Number.isNaN(bNum)) return -1;
    return aNum - bNum;
  });

  res.json({
    startNumber: start,
    endNumber: end,
    pruneOutside,
    createdCount: created.length,
    prunedCount,
    tables: sorted,
  });
}

async function regenerateQr(req, res) {
  const table = await Table.findById(req.params.id);
  if (!table) return res.status(404).json({ message: 'Table not found' });
  
  try {
    table.qrVersion = (table.qrVersion || 1) + 1;
    table.qrToken = generateToken();
    table.accessCode = generateToken();
    
    // Generate new QR code
    const { qrDataUrl, qrUrl } = await generateAndSaveQrCode(table._id, table.accessCode);
    const qrFilePath = await saveQrToFile(table._id, table.tableNumber, table.qrVersion, table.accessCode);
    
    // Update table with new QR code
    table.qrCodeImage = qrDataUrl;
    table.qrUrl = qrUrl;
    table.qrFilePath = qrFilePath;
    await table.save();
    
    res.json({ 
      qrUrl: qrUrl, 
      qrVersion: table.qrVersion,
      qrFilePath: table.qrFilePath,
      qrCode: qrDataUrl // Base64 PNG for display
    });
  } catch (err) {
    console.error('QR regeneration error:', err);
    res.status(500).json({ message: 'QR code generation failed' });
  }
}

async function getQr(req, res) {
  const table = await Table.findById(req.params.id);
  if (!table) return res.status(404).json({ message: 'Table not found' });
  
  try {
    // If QR code is stored, return it; otherwise generate
    let qrDataUrl = table.qrCodeImage;
    if (!qrDataUrl) {
      ensureAccessCode(table);
      const { qrDataUrl: generated, qrUrl } = await generateAndSaveQrCode(table._id, table.accessCode);
      qrDataUrl = generated;
      table.qrCodeImage = generated;
      table.qrUrl = qrUrl;
      table.qrFilePath = await saveQrToFile(table._id, table.tableNumber, table.qrVersion, table.accessCode);
      await table.save();
    }
    
    res.json({ 
      qrUrl: table.qrUrl || buildQrUrl(table._id, table.accessCode), 
      qrVersion: table.qrVersion,
      qrFilePath: table.qrFilePath,
      qrCode: qrDataUrl // Base64 PNG for display
    });
  } catch (err) {
    console.error('Get QR error:', err);
    res.status(500).json({ message: 'QR code retrieval failed' });
  }
}

// Get QR code as PNG image (for download/print)
async function getQrPng(req, res) {
  const table = await Table.findById(req.params.id);
  if (!table) return res.status(404).json({ message: 'Table not found' });
  
  try {
    let filePath = table.qrFilePath;
    if (!filePath) {
      ensureAccessCode(table);
      filePath = await saveQrToFile(table._id, table.tableNumber, table.qrVersion, table.accessCode);
      table.qrFilePath = filePath;
      await table.save();
    }

    try {
      await fs.access(filePath);
    } catch {
      filePath = await saveQrToFile(table._id, table.tableNumber, table.qrVersion, table.accessCode || ensureAccessCode(table));
      table.qrFilePath = filePath;
      await table.save();
    }

    res.set('Content-Type', 'image/png');
    res.set('Content-Disposition', `attachment; filename="table-${table.tableNumber}-qr.png"`);
    res.sendFile(path.resolve(filePath));
  } catch (err) {
    console.error('Get QR PNG error:', err);
    res.status(500).json({ message: 'QR code generation failed' });
  }
}

async function resolveSession(req, res) {
  const { accessCode } = req.params;
  const table = await Table.findOne({ accessCode }).lean();
  if (!table) return res.status(404).json({ message: 'Table not found' });
  res.json({
    tableId: String(table._id),
    token: table.qrToken,
    tableNumber: table.tableNumber,
    location: table.location || '',
  });
}

export {
  createTable,
  listTables,
  updateTable,
  deleteTable,
  syncTableRange,
  resolveSession,
  regenerateQr,
  getQr,
  getQrPng,
};
