const express  = require('express');
const router   = express.Router();
const db       = require('../database');
const { auth } = require('../middleware/auth');

// GET /api/doctors
router.get('/', auth, async (req, res) => {
  try {
    const { search, department } = req.query;
    let sql = `
      SELECT d.*, COUNT(p.id) as patientCount
      FROM doctors d
      LEFT JOIN patients p ON p.doctorId = d.id
    `;
    const params = [];
    const conds  = [];

    if (search) {
      conds.push(`(d.firstName LIKE ? OR d.lastName LIKE ? OR d.specialization LIKE ?)`);
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (department) {
      conds.push(`d.department = ?`);
      params.push(department);
    }
    if (conds.length) sql += ' WHERE ' + conds.join(' AND ');
    sql += ' GROUP BY d.id ORDER BY d.lastName';

    const doctors = await db.all_p(sql, params);
    res.json({ success: true, data: doctors });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/doctors/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const doctor = await db.get_p(`
      SELECT d.*, COUNT(p.id) as patientCount
      FROM doctors d LEFT JOIN patients p ON p.doctorId = d.id
      WHERE d.id = ? GROUP BY d.id
    `, [req.params.id]);

    if (!doctor) return res.status(404).json({ success: false, message: 'Shifokor topilmadi!' });
    res.json({ success: true, data: doctor });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/doctors
router.post('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: "Ruxsat yo'q!" });

    const { firstName, lastName, specialization, department, phone, email } = req.body;
    if (!firstName || !lastName || !specialization || !department) {
      return res.status(400).json({ success: false, message: "Majburiy maydonlar to'ldirilmagan!" });
    }

    const result = await db.run_p(
      `INSERT INTO doctors (firstName,lastName,specialization,department,phone,email) VALUES (?,?,?,?,?,?)`,
      [firstName, lastName, specialization, department, phone||'', email||'']
    );

    const doctor = await db.get_p('SELECT * FROM doctors WHERE id = ?', [result.lastID]);
    res.status(201).json({ success: true, data: doctor, message: "Shifokor qo'shildi!" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/doctors/:id
router.put('/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: "Ruxsat yo'q!" });

    const existing = await db.get_p('SELECT * FROM doctors WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ success: false, message: 'Shifokor topilmadi!' });

    const { firstName, lastName, specialization, department, phone, email } = req.body;
    await db.run_p(
      `UPDATE doctors SET firstName=?,lastName=?,specialization=?,department=?,phone=?,email=? WHERE id=?`,
      [
        firstName      || existing.firstName,
        lastName       || existing.lastName,
        specialization || existing.specialization,
        department     || existing.department,
        phone  !== undefined ? phone  : existing.phone,
        email  !== undefined ? email  : existing.email,
        req.params.id
      ]
    );

    const doctor = await db.get_p('SELECT * FROM doctors WHERE id = ?', [req.params.id]);
    res.json({ success: true, data: doctor, message: 'Shifokor yangilandi!' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/doctors/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: "Ruxsat yo'q!" });

    const existing = await db.get_p('SELECT * FROM doctors WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ success: false, message: 'Shifokor topilmadi!' });

    await db.run_p('DELETE FROM doctors WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: "Shifokor o'chirildi!" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;