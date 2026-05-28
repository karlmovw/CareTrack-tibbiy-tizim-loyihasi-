const express  = require('express');
const router   = express.Router();
const db       = require('../database');
const { auth } = require('../middleware/auth');

// GET /api/patients
router.get('/', auth, async (req, res) => {
  try {
    const { search, gender, doctorId } = req.query;
    let sql = `
      SELECT p.*, d.firstName as docFirst, d.lastName as docLast, d.specialization
      FROM patients p LEFT JOIN doctors d ON d.id = p.doctorId
    `;
    const params = [];
    const conds  = [];

    if (search) {
      conds.push(`(p.firstName LIKE ? OR p.lastName LIKE ? OR p.phone LIKE ?)`);
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (gender)   { conds.push(`p.gender = ?`);   params.push(gender); }
    if (doctorId) { conds.push(`p.doctorId = ?`); params.push(doctorId); }

    if (conds.length) sql += ' WHERE ' + conds.join(' AND ');
    sql += ' ORDER BY p.lastName';

    const patients = await db.all_p(sql, params);
    res.json({ success: true, data: patients });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/patients/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const patient = await db.get_p(`
      SELECT p.*, d.firstName as docFirst, d.lastName as docLast,
             d.specialization, d.department, d.phone as docPhone, d.email as docEmail
      FROM patients p LEFT JOIN doctors d ON d.id = p.doctorId
      WHERE p.id = ?
    `, [req.params.id]);

    if (!patient) return res.status(404).json({ success: false, message: 'Bemor topilmadi!' });

    const diagnoses = await db.all_p(
      'SELECT * FROM diagnoses WHERE patientId = ? ORDER BY date DESC',
      [req.params.id]
    );

    res.json({ success: true, data: { ...patient, diagnoses } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/patients
router.post('/', auth, async (req, res) => {
  try {
    if (req.user.role === 'clinician') return res.status(403).json({ success: false, message: "Ruxsat yo'q!" });

    const { firstName, lastName, dob, gender, phone, address, doctorId } = req.body;
    if (!firstName || !lastName || !dob || !gender) {
      return res.status(400).json({ success: false, message: "Majburiy maydonlar to'ldirilmagan!" });
    }

    const result = await db.run_p(
      `INSERT INTO patients (firstName,lastName,dob,gender,phone,address,doctorId) VALUES (?,?,?,?,?,?,?)`,
      [firstName, lastName, dob, gender, phone||'', address||'', doctorId||null]
    );

    const patient = await db.get_p('SELECT * FROM patients WHERE id = ?', [result.lastID]);
    res.status(201).json({ success: true, data: patient, message: "Bemor qo'shildi!" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/patients/:id
router.put('/:id', auth, async (req, res) => {
  try {
    if (req.user.role === 'receptionist') return res.status(403).json({ success: false, message: "Ruxsat yo'q!" });

    const existing = await db.get_p('SELECT * FROM patients WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ success: false, message: 'Bemor topilmadi!' });

    const { firstName, lastName, dob, gender, phone, address, doctorId } = req.body;
    await db.run_p(
      `UPDATE patients SET firstName=?,lastName=?,dob=?,gender=?,phone=?,address=?,doctorId=? WHERE id=?`,
      [
        firstName || existing.firstName,
        lastName  || existing.lastName,
        dob       || existing.dob,
        gender    || existing.gender,
        phone   !== undefined ? phone   : existing.phone,
        address !== undefined ? address : existing.address,
        doctorId !== undefined ? doctorId : existing.doctorId,
        req.params.id
      ]
    );

    const patient = await db.get_p('SELECT * FROM patients WHERE id = ?', [req.params.id]);
    res.json({ success: true, data: patient, message: 'Bemor yangilandi!' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/patients/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: "Ruxsat yo'q!" });

    const existing = await db.get_p('SELECT * FROM patients WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ success: false, message: 'Bemor topilmadi!' });

    await db.run_p('DELETE FROM patients WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: "Bemor o'chirildi!" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;