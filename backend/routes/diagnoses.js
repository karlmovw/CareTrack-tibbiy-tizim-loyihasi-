const express  = require('express');
const router   = express.Router();
const db       = require('../database');
const { auth } = require('../middleware/auth');

// GET /api/diagnoses
router.get('/', auth, async (req, res) => {
  try {
    const { search, severity, patientId } = req.query;
    let sql = `
      SELECT diag.*, p.firstName as patFirst, p.lastName as patLast
      FROM diagnoses diag LEFT JOIN patients p ON p.id = diag.patientId
    `;
    const params = [];
    const conds  = [];

    if (search) {
      conds.push(`(diag.name LIKE ? OR diag.icd LIKE ? OR diag.description LIKE ?)`);
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (severity)  { conds.push(`diag.severity = ?`);   params.push(severity); }
    if (patientId) { conds.push(`diag.patientId = ?`);  params.push(patientId); }

    if (conds.length) sql += ' WHERE ' + conds.join(' AND ');
    sql += ' ORDER BY diag.date DESC';

    const diagnoses = await db.all_p(sql, params);
    res.json({ success: true, data: diagnoses });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/diagnoses/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const diag = await db.get_p(`
      SELECT diag.*, p.firstName as patFirst, p.lastName as patLast
      FROM diagnoses diag LEFT JOIN patients p ON p.id = diag.patientId
      WHERE diag.id = ?
    `, [req.params.id]);

    if (!diag) return res.status(404).json({ success: false, message: 'Tashxis topilmadi!' });
    res.json({ success: true, data: diag });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/diagnoses
router.post('/', auth, async (req, res) => {
  try {
    if (req.user.role === 'receptionist') return res.status(403).json({ success: false, message: "Ruxsat yo'q!" });

    const { icd, name, description, severity, date, patientId } = req.body;
    if (!icd || !name || !severity || !date || !patientId) {
      return res.status(400).json({ success: false, message: "Majburiy maydonlar to'ldirilmagan!" });
    }

    const result = await db.run_p(
      `INSERT INTO diagnoses (icd,name,description,severity,date,patientId) VALUES (?,?,?,?,?,?)`,
      [icd, name, description||'', severity, date, patientId]
    );

    const diag = await db.get_p('SELECT * FROM diagnoses WHERE id = ?', [result.lastID]);
    res.status(201).json({ success: true, data: diag, message: "Tashxis qo'shildi!" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/diagnoses/:id
router.put('/:id', auth, async (req, res) => {
  try {
    if (req.user.role === 'receptionist') return res.status(403).json({ success: false, message: "Ruxsat yo'q!" });

    const existing = await db.get_p('SELECT * FROM diagnoses WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ success: false, message: 'Tashxis topilmadi!' });

    const { icd, name, description, severity, date, patientId } = req.body;
    await db.run_p(
      `UPDATE diagnoses SET icd=?,name=?,description=?,severity=?,date=?,patientId=? WHERE id=?`,
      [
        icd         || existing.icd,
        name        || existing.name,
        description !== undefined ? description : existing.description,
        severity    || existing.severity,
        date        || existing.date,
        patientId   || existing.patientId,
        req.params.id
      ]
    );

    const diag = await db.get_p('SELECT * FROM diagnoses WHERE id = ?', [req.params.id]);
    res.json({ success: true, data: diag, message: 'Tashxis yangilandi!' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/diagnoses/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: "Ruxsat yo'q!" });

    const existing = await db.get_p('SELECT * FROM diagnoses WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ success: false, message: 'Tashxis topilmadi!' });

    await db.run_p('DELETE FROM diagnoses WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: "Tashxis o'chirildi!" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;