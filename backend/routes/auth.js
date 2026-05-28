const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const db      = require('../database');

const SECRET = process.env.JWT_SECRET || 'caretrack_secret_2026';

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username va parol kiritilishi shart!' });
    }

    const user = await db.get_p('SELECT * FROM users WHERE username = ?', [username]);

    if (!user) {
      return res.status(401).json({ success: false, message: 'Foydalanuvchi topilmadi!' });
    }

    const isValid = bcrypt.compareSync(password, user.password);
    if (!isValid) {
      return res.status(401).json({ success: false, message: "Parol noto'g'ri!" });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      success:   true,
      token,
      role:      user.role,
      firstName: user.firstName,
      lastName:  user.lastName,
      message:   'Muvaffaqiyatli kirildi!'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server xatosi!', error: err.message });
  }
});

// Yordamchi: token tekshirish
function checkToken(req) {
  const auth = req.headers.authorization;
  if (!auth) return null;
  try {
    return jwt.verify(auth.split(' ')[1], SECRET);
  } catch {
    return null;
  }
}

// GET /api/auth/me — database dan to'liq profil
router.get('/me', async (req, res) => {
  const u = checkToken(req);
  if (!u) return res.status(401).json({ success: false, message: "Token noto'g'ri yoki yo'q!" });
  try {
    const user = await db.get_p(
      'SELECT id, username, role, firstName, lastName, email, avatar FROM users WHERE id = ?',
      [u.id]
    );
    if (!user) return res.status(404).json({ success: false, message: 'Foydalanuvchi topilmadi!' });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server xatosi!', error: err.message });
  }
});

// PUT /api/auth/profile — profil ma'lumotlarini yangilash
router.put('/profile', async (req, res) => {
  const u = checkToken(req);
  if (!u) return res.status(401).json({ success: false, message: "Token noto'g'ri yoki yo'q!" });
  try {
    const { firstName, lastName, email, username } = req.body;
    if (!firstName || !lastName) {
      return res.status(400).json({ success: false, message: 'Ism va familiya kiritilishi shart!' });
    }

    let usernameChanged = false;
    if (username && username.trim().length >= 3) {
      const newU = username.trim();
      const current = await db.get_p('SELECT username FROM users WHERE id = ?', [u.id]);
      if (current && current.username !== newU) {
        // Login band emasligini tekshirish
        const taken = await db.get_p('SELECT id FROM users WHERE username = ? AND id != ?', [newU, u.id]);
        if (taken) {
          return res.status(400).json({ success: false, message: 'Bu login band! Boshqa login tanlang.' });
        }
        await db.run_p('UPDATE users SET username = ? WHERE id = ?', [newU, u.id]);
        usernameChanged = true;
      }
    }

    await db.run_p(
      'UPDATE users SET firstName = ?, lastName = ?, email = ? WHERE id = ?',
      [firstName, lastName, email || '', u.id]
    );
    res.json({ success: true, message: 'Profil yangilandi!', usernameChanged });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server xatosi!', error: err.message });
  }
});

// PUT /api/auth/password — parolni o'zgartirish
router.put('/password', async (req, res) => {
  const u = checkToken(req);
  if (!u) return res.status(401).json({ success: false, message: "Token noto'g'ri yoki yo'q!" });
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Eski va yangi parol kiritilishi shart!' });
    }
    if (newPassword.length < 4) {
      return res.status(400).json({ success: false, message: "Yangi parol kamida 4 ta belgi bo'lishi kerak!" });
    }
    const user = await db.get_p('SELECT * FROM users WHERE id = ?', [u.id]);
    if (!user) return res.status(404).json({ success: false, message: 'Foydalanuvchi topilmadi!' });

    const isValid = bcrypt.compareSync(oldPassword, user.password);
    if (!isValid) {
      return res.status(400).json({ success: false, message: "Joriy parol noto'g'ri!" });
    }
    const hashed = bcrypt.hashSync(newPassword, 10);
    await db.run_p('UPDATE users SET password = ? WHERE id = ?', [hashed, u.id]);
    res.json({ success: true, message: 'Parol muvaffaqiyatli yangilandi!' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server xatosi!', error: err.message });
  }
});

// GET /api/auth/users — barcha foydalanuvchilar (faqat admin)
router.get('/users', async (req, res) => {
  const u = checkToken(req);
  if (!u) return res.status(401).json({ success: false, message: "Token noto'g'ri yoki yo'q!" });
  if (u.role !== 'admin') {
    return res.status(403).json({ success: false, message: "Faqat Administrator ko'ra oladi!" });
  }
  try {
    const users = await db.all_p(
      'SELECT id, username, role, firstName, lastName, email FROM users ORDER BY id'
    );
    res.json({ success: true, data: users });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server xatosi!', error: err.message });
  }
});

// PUT /api/auth/users/:id/password — admin boshqa foydalanuvchi parolini o'zgartiradi
router.put('/users/:id/password', async (req, res) => {
  const u = checkToken(req);
  if (!u) return res.status(401).json({ success: false, message: "Token noto'g'ri yoki yo'q!" });
  if (u.role !== 'admin') {
    return res.status(403).json({ success: false, message: "Faqat Administrator parolni o'zgartira oladi!" });
  }
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 4) {
      return res.status(400).json({ success: false, message: "Parol kamida 4 ta belgi bo'lishi kerak!" });
    }
    const target = await db.get_p('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (!target) return res.status(404).json({ success: false, message: 'Foydalanuvchi topilmadi!' });

    const hashed = bcrypt.hashSync(newPassword, 10);
    await db.run_p('UPDATE users SET password = ? WHERE id = ?', [hashed, req.params.id]);
    res.json({ success: true, message: `${target.username} foydalanuvchi paroli yangilandi!` });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server xatosi!', error: err.message });
  }
});

// PUT /api/auth/users/:id — admin foydalanuvchi ma'lumotlarini to'liq tahrirlaydi
router.put('/users/:id', async (req, res) => {
  const u = checkToken(req);
  if (!u) return res.status(401).json({ success: false, message: "Token noto'g'ri yoki yo'q!" });
  if (u.role !== 'admin') {
    return res.status(403).json({ success: false, message: "Faqat Administrator tahrirlay oladi!" });
  }
  try {
    const { firstName, lastName, username } = req.body;
    if (!firstName || !lastName || !username) {
      return res.status(400).json({ success: false, message: 'Ism, familiya va login kiritilishi shart!' });
    }
    if (username.trim().length < 3) {
      return res.status(400).json({ success: false, message: "Login kamida 3 ta belgi bo'lishi kerak!" });
    }
    const target = await db.get_p('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (!target) return res.status(404).json({ success: false, message: 'Foydalanuvchi topilmadi!' });

    // Login band emasligini tekshirish (boshqa foydalanuvchida)
    const taken = await db.get_p(
      'SELECT id FROM users WHERE username = ? AND id != ?',
      [username.trim(), req.params.id]
    );
    if (taken) {
      return res.status(400).json({ success: false, message: 'Bu login band! Boshqa login tanlang.' });
    }

    await db.run_p(
      'UPDATE users SET firstName = ?, lastName = ?, username = ? WHERE id = ?',
      [firstName.trim(), lastName.trim(), username.trim(), req.params.id]
    );
    res.json({ success: true, message: `${target.username} foydalanuvchi ma'lumotlari yangilandi!` });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server xatosi!', error: err.message });
  }
});

// PUT /api/auth/avatar — profil rasmini saqlash (base64)
router.put('/avatar', async (req, res) => {
  const u = checkToken(req);
  if (!u) return res.status(401).json({ success: false, message: "Token noto'g'ri yoki yo'q!" });
  try {
    const { avatar } = req.body;
    if (!avatar) return res.status(400).json({ success: false, message: 'Rasm yuborilmadi!' });
    // Juda katta rasmni rad etish (~2MB base64 limit)
    if (avatar.length > 2800000) {
      return res.status(400).json({ success: false, message: 'Rasm juda katta! 2MB dan kichik tanlang.' });
    }
    await db.run_p('UPDATE users SET avatar = ? WHERE id = ?', [avatar, u.id]);
    res.json({ success: true, message: 'Profil rasmi saqlandi!' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server xatosi!', error: err.message });
  }
});

module.exports = router;