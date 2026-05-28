const express = require('express');
const cors    = require('cors');
const path    = require('path');

const app = express();

// ── MIDDLEWARE ──
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── STATIC FILES (Frontend) ──
app.use(express.static(path.join(__dirname, '../frontend')));

// ── API ROUTES ──
app.use('/api/auth',      require('./routes/auth'));
app.use('/api/doctors',   require('./routes/doctors'));
app.use('/api/patients',  require('./routes/patients'));
app.use('/api/diagnoses', require('./routes/diagnoses'));

// ── STATS (Dashboard uchun) ──
const db = require('./database');

app.get('/api/stats', async (req, res) => {
  try {
    const doctors   = (await db.get_p('SELECT COUNT(*) as c FROM doctors')).c;
    const patients  = (await db.get_p('SELECT COUNT(*) as c FROM patients')).c;
    const diagnoses = (await db.get_p('SELECT COUNT(*) as c FROM diagnoses')).c;
    const severe    = (await db.get_p("SELECT COUNT(*) as c FROM diagnoses WHERE severity = 'Og''ir'")).c;
    const male      = (await db.get_p("SELECT COUNT(*) as c FROM patients WHERE gender = 'Erkak'")).c;
    const female    = (await db.get_p("SELECT COUNT(*) as c FROM patients WHERE gender = 'Ayol'")).c;

    res.json({
      success: true,
      data: { doctors, patients, diagnoses, severe, male, female }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── 404 ──
app.use('/api/*', (req, res) => {
  res.status(404).json({ success: false, message: 'API endpoint topilmadi!' });
});

// ── Frontend routing ──
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ── SERVER START ──
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`
  ✅ CareTrack Server ishga tushdi!
  🌐 http://localhost:${PORT}
  📡 API: http://localhost:${PORT}/api
  `);
});


