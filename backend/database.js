const sqlite3 = require('sqlite3').verbose();
const bcrypt  = require('bcryptjs');
const path    = require('path');

const DB_PATH = path.join(__dirname, 'caretrack.db');

// Database obyekti
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) console.error('DB xato:', err);
  else console.log('✅ SQLite ulandi:', DB_PATH);
});

// Promise wrapper — async/await ishlatish uchun
db.run_p   = (sql, params = []) => new Promise((res, rej) => db.run(sql, params, function(err) { if(err) rej(err); else res(this); }));
db.get_p   = (sql, params = []) => new Promise((res, rej) => db.get(sql, params, (err, row) => { if(err) rej(err); else res(row); }));
db.all_p   = (sql, params = []) => new Promise((res, rej) => db.all(sql, params, (err, rows) => { if(err) rej(err); else res(rows); }));

// ── JADVALLAR ──
async function createTables() {
  await db.run_p(`PRAGMA journal_mode = WAL`);

  await db.run_p(`
    CREATE TABLE IF NOT EXISTS users (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      username  TEXT UNIQUE NOT NULL,
      password  TEXT NOT NULL,
      role      TEXT NOT NULL,
      firstName TEXT NOT NULL,
      lastName  TEXT NOT NULL,
      email     TEXT,
      createdAt TEXT DEFAULT (datetime('now'))
    )
  `);

  // avatar ustuni (mavjud bazaga xavfsiz qo'shiladi — bor bo'lsa xato bермайди)
  try {
    await db.run_p(`ALTER TABLE users ADD COLUMN avatar TEXT`);
  } catch (e) { /* ustun allaqachon mavjud — normal */ }

  await db.run_p(`
    CREATE TABLE IF NOT EXISTS doctors (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      firstName      TEXT NOT NULL,
      lastName       TEXT NOT NULL,
      specialization TEXT NOT NULL,
      department     TEXT NOT NULL,
      phone          TEXT,
      email          TEXT,
      createdAt      TEXT DEFAULT (datetime('now'))
    )
  `);

  await db.run_p(`
    CREATE TABLE IF NOT EXISTS patients (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      firstName TEXT NOT NULL,
      lastName  TEXT NOT NULL,
      dob       TEXT NOT NULL,
      gender    TEXT NOT NULL,
      phone     TEXT,
      address   TEXT,
      doctorId  INTEGER,
      createdAt TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (doctorId) REFERENCES doctors(id)
    )
  `);

  await db.run_p(`
    CREATE TABLE IF NOT EXISTS diagnoses (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      icd         TEXT NOT NULL,
      name        TEXT NOT NULL,
      description TEXT,
      severity    TEXT NOT NULL,
      date        TEXT NOT NULL,
      patientId   INTEGER NOT NULL,
      createdAt   TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (patientId) REFERENCES patients(id)
    )
  `);

  await seed();
}

// ── BOSHLANG'ICH MA'LUMOTLAR ──
async function seed() {
  const row = await db.get_p('SELECT COUNT(*) as c FROM users');
  if (row.c > 0) return;

  // Users
  await db.run_p(`INSERT INTO users (username,password,role,firstName,lastName,email) VALUES (?,?,?,?,?,?)`,
    ['admin',      bcrypt.hashSync('admin123',10), 'admin',        'Admin',    'Karimov',  'admin@caretrack.uz']);
  await db.run_p(`INSERT INTO users (username,password,role,firstName,lastName,email) VALUES (?,?,?,?,?,?)`,
    ['doctor1',    bcrypt.hashSync('doc123',10),   'clinician',    'Doktor',   'Yusupov',  'doctor1@caretrack.uz']);
  await db.run_p(`INSERT INTO users (username,password,role,firstName,lastName,email) VALUES (?,?,?,?,?,?)`,
    ['reception1', bcrypt.hashSync('rec123',10),   'receptionist', 'Qabulxona','Rahimova', 'reception1@caretrack.uz']);

  // Doctors
  await db.run_p(`INSERT INTO doctors (firstName,lastName,specialization,department,phone,email) VALUES (?,?,?,?,?,?)`,
    ['Jahongir','Karimov',  'Kardiolog',    'Kardiologiya',    '+998 90 123 45 67','karimov@klinika.uz']);
  await db.run_p(`INSERT INTO doctors (firstName,lastName,specialization,department,phone,email) VALUES (?,?,?,?,?,?)`,
    ['Malika',  'Yusupova', 'Nevropatolog', 'Nevrologiya',     '+998 91 234 56 78','yusupova@klinika.uz']);
  await db.run_p(`INSERT INTO doctors (firstName,lastName,specialization,department,phone,email) VALUES (?,?,?,?,?,?)`,
    ['Sardor',  'Toshmatov','Dermatolog',   'Dermatologiya',   '+998 93 345 67 89','toshmatov@klinika.uz']);
  await db.run_p(`INSERT INTO doctors (firstName,lastName,specialization,department,phone,email) VALUES (?,?,?,?,?,?)`,
    ['Nilufar', 'Rahimova', 'Ortoped',      'Ortopediya',      '+998 94 456 78 90','rahimova@klinika.uz']);
  await db.run_p(`INSERT INTO doctors (firstName,lastName,specialization,department,phone,email) VALUES (?,?,?,?,?,?)`,
    ['Bobur',   'Mirzayev', 'Umumiy tabib', 'Umumiy amaliyot', '+998 97 567 89 01','mirzayev@klinika.uz']);
  await db.run_p(`INSERT INTO doctors (firstName,lastName,specialization,department,phone,email) VALUES (?,?,?,?,?,?)`,
    ['Doniyor', 'Xoliqov',  'Diagnostik',   'Diagnostika',     '+998 90 678 90 12','xoliqov@klinika.uz']);

  // Patients
  await db.run_p(`INSERT INTO patients (firstName,lastName,dob,gender,phone,address,doctorId) VALUES (?,?,?,?,?,?,?)`,
    ['Sardor', 'Aliyev',   '1990-05-12','Erkak','+998 90 111 22 33','Toshkent, Yunusobod',    1]);
  await db.run_p(`INSERT INTO patients (firstName,lastName,dob,gender,phone,address,doctorId) VALUES (?,?,?,?,?,?,?)`,
    ['Dilnoza','Nazarova', '1985-08-23','Ayol', '+998 91 222 33 44','Toshkent, Chilonzor',    2]);
  await db.run_p(`INSERT INTO patients (firstName,lastName,dob,gender,phone,address,doctorId) VALUES (?,?,?,?,?,?,?)`,
    ['Jasur',  'Rahimov',  '1978-03-07','Erkak','+998 93 333 44 55','Samarqand',              3]);
  await db.run_p(`INSERT INTO patients (firstName,lastName,dob,gender,phone,address,doctorId) VALUES (?,?,?,?,?,?,?)`,
    ['Feruza', 'Mirzayeva','1992-11-15','Ayol', '+998 94 444 55 66','Toshkent, Mirzo Ulugbek',1]);
  await db.run_p(`INSERT INTO patients (firstName,lastName,dob,gender,phone,address,doctorId) VALUES (?,?,?,?,?,?,?)`,
    ['Bobur',  'Xasanov',  '2000-01-30','Erkak','+998 97 555 66 77','Namangan',               2]);
  await db.run_p(`INSERT INTO patients (firstName,lastName,dob,gender,phone,address,doctorId) VALUES (?,?,?,?,?,?,?)`,
    ['Gulnora','Toxirova', '1975-06-18','Ayol', '+998 90 666 77 88','Toshkent, Shayxontohur', 4]);
  await db.run_p(`INSERT INTO patients (firstName,lastName,dob,gender,phone,address,doctorId) VALUES (?,?,?,?,?,?,?)`,
    ['Sherzod','Qodirov',  '1988-12-03','Erkak','+998 91 777 88 99','Toshkent, Olmazor',      5]);
  await db.run_p(`INSERT INTO patients (firstName,lastName,dob,gender,phone,address,doctorId) VALUES (?,?,?,?,?,?,?)`,
    ['Nodira', 'Ergasheva','1975-09-22','Ayol', '+998 93 888 99 00','Andijon',                3]);

  // Diagnoses
  await db.run_p(`INSERT INTO diagnoses (icd,name,description,severity,date,patientId) VALUES (?,?,?,?,?,?)`,
    ['J06.9',"O'tkir respirator kasallik (ARVI)","Yuqori nafas yo'llarining virus infeksiyasi",'Yengil',   '2026-05-01',1]);
  await db.run_p(`INSERT INTO diagnoses (icd,name,description,severity,date,patientId) VALUES (?,?,?,?,?,?)`,
    ['I10',  'Arterial gipertenziya',             'Qon bosimining surunkali oshishi',           "O'rtacha", '2026-04-28',2]);
  await db.run_p(`INSERT INTO diagnoses (icd,name,description,severity,date,patientId) VALUES (?,?,?,?,?,?)`,
    ['K29.7','Surunkali gastrit',                 "Oshqozon shilliq qavatining yallig'lanishi", "O'rtacha", '2026-05-03',3]);
  await db.run_p(`INSERT INTO diagnoses (icd,name,description,severity,date,patientId) VALUES (?,?,?,?,?,?)`,
    ['I21.0',"O'tkir miokard infarkti",           "Yurak mushaklarining o'tkir ishemiyasi",     "Og'ir",    '2026-05-10',4]);
  await db.run_p(`INSERT INTO diagnoses (icd,name,description,severity,date,patientId) VALUES (?,?,?,?,?,?)`,
    ['E11',  '2-tip qandli diabet',               "Insulin rezistentligiga bog'liq qandli diabet","O'rtacha",'2026-04-15',5]);
  await db.run_p(`INSERT INTO diagnoses (icd,name,description,severity,date,patientId) VALUES (?,?,?,?,?,?)`,
    ['M54.5',"Bel og'rig'i",                      "Umurtqa pog'onasining pastki qismi og'rig'i",'Yengil',   '2026-05-07',6]);

  console.log("✅ Boshlang'ich ma'lumotlar yuklandi!");
}

createTables().catch(console.error);

module.exports = db;