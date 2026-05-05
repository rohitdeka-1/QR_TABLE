import Table from '../models/Table.js';
import { generateToken, buildQrUrl, generateQrDataUrl, generateQrPng } from '../utils/qr.js';
import { isWithinRadius } from '../utils/distance.js';
import { validationResult } from 'express-validator';

import path from 'path';
import archiver from 'archiver';

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



async function generateAndSaveQrCode(tableId, token, tableNumber) {
  try {
    const qrDataUrl = await generateQrDataUrl(tableId, token, tableNumber);
    const qrUrl = buildQrUrl(tableId, token, tableNumber);
    return { qrDataUrl, qrUrl };
  } catch (err) {
    console.error('QR generation error:', err);
    throw err;
  }
}

async function createTable(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  // accept both camelCase and snake_case from frontend
  const incomingTableNumber = req.body.tableNumber ?? req.body.table_number;
  const normalizedTableNumber = normalizeTableNumber(incomingTableNumber);
  if (!normalizedTableNumber) {
    return res.status(400).json({ message: 'tableNumber must be a positive integer (1, 2, 3...)' });
  }

  const { location } = req.body;
  const label = req.body.label ?? '';
  const restaurantId = req.user?.restaurantId || req.restaurantId || null;
  if (!restaurantId) return res.status(400).json({ message: 'restaurantId required' });

  const token = generateToken();
  const accessCode = generateToken();

  try {
    const table = await Table.create({
      restaurantId,
      tableNumber: normalizedTableNumber,
      label,
      location,
      qrToken: token,
      accessCode,
    });

    const { qrDataUrl, qrUrl } = await generateAndSaveQrCode(table._id, accessCode, table.tableNumber);

    table.qrCodeImage = qrDataUrl;
    table.qrUrl = qrUrl;
    await table.save();

    res.status(201).json({
      id: table._id.toString(),
      tableNumber: table.tableNumber,
      label: table.label || '',
      code: table.accessCode,
      qrUrl: qrUrl,
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
  const tables = await Table.find({}).sort({ createdAt: 1 });
  // filter by restaurant if available (admins should see only their restaurant)
  const restaurantId = req.user?.restaurantId || req.restaurantId || null;
  const filtered = restaurantId ? tables.filter(t => String(t.restaurantId) === String(restaurantId)) : tables;
  const sorted = filtered.sort((a, b) => {
    const aNum = Number(a.tableNumber);
    const bNum = Number(b.tableNumber);
    if (Number.isNaN(aNum) && Number.isNaN(bNum)) return String(a.tableNumber).localeCompare(String(b.tableNumber));
    if (Number.isNaN(aNum)) return 1;
    if (Number.isNaN(bNum)) return -1;
    return aNum - bNum;
  });

  // Format response with consistent field names
  const formatted = sorted.map(table => ({
    id: table._id.toString(),
    tableNumber: table.tableNumber,
    label: table.label || '',
    code: table.accessCode,
    qrUrl: buildQrUrl(table._id.toString(), table.accessCode, table.tableNumber),
  }));

  res.json(formatted);
}

async function updateTable(req, res) {
  const table = await Table.findById(req.params.id);
  if (!table) return res.status(404).json({ message: 'Table not found' });

  const updates = {};
  if (Object.prototype.hasOwnProperty.call(req.body, 'location')) {
    updates.location = req.body.location;
  }

  let didChangeTableNumber = false;
  // Accept camelCase or snake_case
  const incomingTableNumber = Object.prototype.hasOwnProperty.call(req.body, 'tableNumber') ? req.body.tableNumber : req.body.table_number;
  if (incomingTableNumber !== undefined) {
    const normalizedTableNumber = normalizeTableNumber(incomingTableNumber);
    if (!normalizedTableNumber) {
      return res.status(400).json({ message: 'tableNumber must be a positive integer (1, 2, 3...)' });
    }
    updates.tableNumber = normalizedTableNumber;
    didChangeTableNumber = normalizedTableNumber !== table.tableNumber;
  }
  if (Object.prototype.hasOwnProperty.call(req.body, 'label')) {
    updates.label = req.body.label;
  }

  try {
    const updated = await Table.findByIdAndUpdate(
      req.params.id,
      { ...updates, updatedAt: new Date() },
      { new: true, runValidators: true },
    );

    if (didChangeTableNumber) {
      const { qrDataUrl, qrUrl } = await generateAndSaveQrCode(updated._id, ensureAccessCode(updated), updated.tableNumber);
      updated.qrCodeImage = qrDataUrl;
      updated.qrUrl = qrUrl;
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

async function deleteAllTables(req, res) {
  try {
    const result = await Table.deleteMany({});
    res.json({
      message: 'All tables deleted successfully',
      deletedCount: result.deletedCount || 0,
    });
  } catch (err) {
    console.error('Delete all tables error:', err);
    res.status(500).json({ message: 'Failed to delete all tables' });
  }
}

// Download all QR PNG files as a zip archive
async function downloadAllQrs(req, res) {
  try {
    const tables = await Table.find({}).lean();

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="all-qrs.zip"');

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('error', (err) => {
      console.error('Archive error:', err);
      res.status(500).end();
    });

    archive.pipe(res);

    for (const table of tables) {
      const pngBuffer = await generateQrPng(table._id.toString(), table.accessCode, table.tableNumber);
      const safeTableNumber = String(table.tableNumber).replace(/[^a-zA-Z0-9-_]/g, '_');
      const fileName = `${safeTableNumber}-v${table.qrVersion || 1}.png`;
      archive.append(pngBuffer, { name: fileName });
    }

    await archive.finalize();
  } catch (err) {
    console.error('Download all QR error:', err);
    res.status(500).json({ message: 'Failed to create QR zip' });
  }
}

async function syncTableRange(req, res) {
  const start = Number(req.body.startNumber);
  const end = Number(req.body.endNumber);
  const pruneOutside = Boolean(req.body.pruneOutside);
  const restaurantId = req.user?.restaurantId || req.restaurantId || null;

  if (!restaurantId) return res.status(400).json({ message: 'restaurantId required' });

  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < 1 || start > end) {
    return res.status(400).json({ message: 'startNumber and endNumber must be positive integers, with startNumber <= endNumber' });
  }

  const targetTableNumbers = new Set();
  for (let tableNumber = start; tableNumber <= end; tableNumber += 1) {
    targetTableNumbers.add(String(tableNumber));
  }

  // Only get tables for this restaurant
  const existingTables = await Table.find({ restaurantId }).lean();
  const existingByNumber = new Map(existingTables.map((table) => [String(table.tableNumber), table]));

  const created = [];
  for (let tableNumber = start; tableNumber <= end; tableNumber += 1) {
    const tableNumberValue = String(tableNumber);
    if (existingByNumber.has(tableNumberValue)) continue;

    const token = generateToken();
    const table = await Table.create({
      restaurantId,
      tableNumber: tableNumberValue,
      location: `Range ${start}-${end}`,
      qrToken: token,
      accessCode: generateToken(),
    });
    const { qrDataUrl, qrUrl } = await generateAndSaveQrCode(table._id, table.accessCode, table.tableNumber);
    table.qrCodeImage = qrDataUrl;
    table.qrUrl = qrUrl;
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

  // Only return tables for this restaurant
  const refreshed = await Table.find({ restaurantId }).sort({ createdAt: 1 }).lean();
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
    const { qrDataUrl, qrUrl } = await generateAndSaveQrCode(table._id, table.accessCode, table.tableNumber);

    // Update table with new QR code
    table.qrCodeImage = qrDataUrl;
    table.qrUrl = qrUrl;
    await table.save();

    res.json({
      qrUrl: qrUrl,
      qrVersion: table.qrVersion,
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
      const { qrDataUrl: generated, qrUrl } = await generateAndSaveQrCode(table._id, table.accessCode, table.tableNumber);
      qrDataUrl = generated;
      table.qrCodeImage = generated;
      table.qrUrl = qrUrl;
      await table.save();
    }

    res.json({
      qrUrl: table.qrUrl || buildQrUrl(table._id, table.accessCode, table.tableNumber),
      qrVersion: table.qrVersion,
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
    ensureAccessCode(table);
    const pngBuffer = await generateQrPng(table._id.toString(), table.accessCode, table.tableNumber);

    res.set('Content-Type', 'image/png');
    res.set('Content-Disposition', `attachment; filename="table-${table.tableNumber}-qr.png"`);
    res.send(pngBuffer);
  } catch (err) {
    console.error('Get QR PNG error:', err);
    res.status(500).json({ message: 'QR code generation failed' });
  }
}

async function resolveSession(req, res) {
  const { accessCode } = req.params;
  const { customerLat, customerLng } = req.query;

  const table = await Table.findOne({ accessCode }).populate('restaurantId').lean();
  if (!table) return res.status(404).json({ message: 'Table not found' });

  // Check geolocation if restaurant location is set and customer location provided
  if (table.restaurantLat && table.restaurantLng && customerLat && customerLng) {
    const customerLatNum = parseFloat(customerLat);
    const customerLngNum = parseFloat(customerLng);

    if (isNaN(customerLatNum) || isNaN(customerLngNum)) {
      return res.status(400).json({
        message: 'Invalid customer coordinates',
        code: 'INVALID_COORDS'
      });
    }

    const { isWithinRadius: withinRadius, distance } = isWithinRadius(
      customerLatNum,
      customerLngNum,
      table.restaurantLat,
      table.restaurantLng,
      10 // 10km radius
    );

    if (!withinRadius) {
      return res.status(403).json({
        message: `You are ${distance}km away from the restaurant. You must be within 10km to order.`,
        code: 'OUT_OF_RANGE',
        distance,
        maxDistance: 10,
      });
    }
  }

  res.json({
    tableId: String(table._id),
    token: table.qrToken,
    restaurantId: table.restaurantId ? String(table.restaurantId._id || table.restaurantId) : null,
    restaurantName: table.restaurantId?.name || '',
    coverImage: table.restaurantId?.coverImage || '',
    tableNumber: table.tableNumber,
    location: table.location || '',
    restaurantLat: table.restaurantLat,
    restaurantLng: table.restaurantLng,
  });
}

/**
 * Set or update restaurant location for a table
 * POST /tables/:tableId/set-location
 * Body: { restaurantLat, restaurantLng }
 */
async function setRestaurantLocation(req, res) {
  const { tableId } = req.params;
  const { restaurantLat, restaurantLng } = req.body;

  if (restaurantLat === undefined || restaurantLng === undefined) {
    return res.status(400).json({ message: 'restaurantLat and restaurantLng are required' });
  }

  const lat = parseFloat(restaurantLat);
  const lng = parseFloat(restaurantLng);

  if (isNaN(lat) || isNaN(lng)) {
    return res.status(400).json({ message: 'Invalid coordinates' });
  }

  if (lat < -90 || lat > 90) {
    return res.status(400).json({ message: 'Latitude must be between -90 and 90' });
  }

  if (lng < -180 || lng > 180) {
    return res.status(400).json({ message: 'Longitude must be between -180 and 180' });
  }

  try {
    const table = await Table.findByIdAndUpdate(
      tableId,
      { restaurantLat: lat, restaurantLng: lng, updatedAt: new Date() },
      { new: true }
    );

    if (!table) {
      return res.status(404).json({ message: 'Table not found' });
    }

    res.json({
      message: 'Restaurant location updated',
      table: {
        _id: table._id,
        tableNumber: table.tableNumber,
        restaurantLat: table.restaurantLat,
        restaurantLng: table.restaurantLng,
      },
    });
  } catch (err) {
    console.error('Error setting restaurant location:', err);
    res.status(500).json({ message: 'Failed to set restaurant location' });
  }
}

/**
 * Set restaurant location for ALL tables globally
 * PATCH /tables/set-restaurant-location-global
 * Body: { restaurantLat, restaurantLng }
 */
async function setRestaurantLocationGlobal(req, res) {
  const { restaurantLat, restaurantLng } = req.body;

  if (restaurantLat === undefined || restaurantLng === undefined) {
    return res.status(400).json({ message: 'restaurantLat and restaurantLng are required' });
  }

  const lat = parseFloat(restaurantLat);
  const lng = parseFloat(restaurantLng);

  if (isNaN(lat) || isNaN(lng)) {
    return res.status(400).json({ message: 'Invalid coordinates' });
  }

  if (lat < -90 || lat > 90) {
    return res.status(400).json({ message: 'Latitude must be between -90 and 90' });
  }

  if (lng < -180 || lng > 180) {
    return res.status(400).json({ message: 'Longitude must be between -180 and 180' });
  }

  try {
    const result = await Table.updateMany(
      {},
      { restaurantLat: lat, restaurantLng: lng, updatedAt: new Date() }
    );

    res.json({
      message: `Restaurant location updated for ${result.modifiedCount} table(s)`,
      restaurantLat: lat,
      restaurantLng: lng,
      tablesUpdated: result.modifiedCount,
    });
  } catch (err) {
    console.error('Error setting global restaurant location:', err);
    res.status(500).json({ message: 'Failed to set restaurant location' });
  }
}

/**
 * Find table by access code (used by customer QR scanner)
 * GET /tables/by-code/:code
 */
async function getTableByCode(req, res) {
  const { code } = req.params;
  try {
    const table = await Table.findOne({ accessCode: code }).populate('restaurantId').lean();
    if (!table) return res.status(404).json({ message: 'Table not found' });
    if (table.restaurantId) {
      table.restaurantName = table.restaurantId.name;
      table.coverImage = table.restaurantId.coverImage;
      table.restaurantId = table.restaurantId._id;
    }
    res.json(table);
  } catch (err) {
    console.error('Get table by code error:', err);
    res.status(500).json({ message: 'Failed to retrieve table' });
  }
}

/**
 * Find table by table number (used by new QR format with table parameter)
 * GET /tables/by-number/:tableNumber
 */
async function getTableByNumber(req, res) {
  const { tableNumber } = req.params;
  try {
    const table = await Table.findOne({ tableNumber: normalizeTableNumber(tableNumber) }).populate('restaurantId').lean();
    if (!table) return res.status(404).json({ message: 'Table not found' });
    if (table.restaurantId) {
      table.restaurantName = table.restaurantId.name;
      table.coverImage = table.restaurantId.coverImage;
      table.restaurantId = table.restaurantId._id;
    }
    res.json(table);
  } catch (err) {
    console.error('Get table by number error:', err);
    res.status(500).json({ message: 'Failed to retrieve table' });
  }
}

export {
  createTable,
  listTables,
  updateTable,
  deleteTable,
  deleteAllTables,
  downloadAllQrs,
  syncTableRange,
  resolveSession,
  setRestaurantLocation,
  setRestaurantLocationGlobal,
  regenerateQr,
  getQr,
  getQrPng,
  getTableByCode,
  getTableByNumber,
};
