'use strict';

const path = require('node:path');
const fs = require('node:fs');
const Database = require('better-sqlite3');

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'sms.db');
const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS students (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    student_no    TEXT NOT NULL UNIQUE,
    name          TEXT NOT NULL,
    gender        TEXT NOT NULL DEFAULT '男',
    birth_date    TEXT,
    class_name    TEXT NOT NULL DEFAULT '',
    major         TEXT DEFAULT '',
    phone         TEXT DEFAULT '',
    email         TEXT DEFAULT '',
    address       TEXT DEFAULT '',
    enroll_date   TEXT,
    status        TEXT NOT NULL DEFAULT '在读',
    remark        TEXT DEFAULT '',
    created_at    TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    updated_at    TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
  );

  CREATE INDEX IF NOT EXISTS idx_students_name ON students(name);
  CREATE INDEX IF NOT EXISTS idx_students_class ON students(class_name);
  CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);
`);

// 首次启动时写入一些演示数据，方便直接体验
const countRow = db.prepare('SELECT COUNT(*) AS c FROM students').get();
if (countRow.c === 0) {
  const seed = db.prepare(`
    INSERT INTO students
      (student_no, name, gender, birth_date, class_name, major, phone, email, address, enroll_date, status, remark)
    VALUES
      (@student_no, @name, @gender, @birth_date, @class_name, @major, @phone, @email, @address, @enroll_date, @status, @remark)
  `);
  const demo = [
    { student_no: '2024001', name: '林晓雅', gender: '女', birth_date: '2006-03-12', class_name: '计算机2401班', major: '计算机科学与技术', phone: '13800001111', email: 'linxiao@example.com', address: '广东省广州市', enroll_date: '2024-09-01', status: '在读', remark: '班长' },
    { student_no: '2024002', name: '陈昊宇', gender: '男', birth_date: '2006-07-21', class_name: '计算机2401班', major: '计算机科学与技术', phone: '13800002222', email: 'chenhaoyu@example.com', address: '广东省深圳市', enroll_date: '2024-09-01', status: '在读', remark: '' },
    { student_no: '2024003', name: '王梓萱', gender: '女', birth_date: '2006-01-05', class_name: '软件工程2401班', major: '软件工程', phone: '13800003333', email: 'wangzixuan@example.com', address: '广东省东莞市', enroll_date: '2024-09-01', status: '休学', remark: '因病休学一年' },
    { student_no: '2023101', name: '张子墨', gender: '男', birth_date: '2005-11-18', class_name: '软件工程2301班', major: '软件工程', phone: '13800004444', email: 'zhangzimo@example.com', address: '广东省佛山市', enroll_date: '2023-09-01', status: '在读', remark: '' },
    { student_no: '2022201', name: '刘思远', gender: '男', birth_date: '2004-05-30', class_name: '网络工程2201班', major: '网络工程', phone: '13800005555', email: 'liusiyuan@example.com', address: '广东省惠州市', enroll_date: '2022-09-01', status: '毕业', remark: '已保研' }
  ];
  const insertMany = db.transaction((rows) => {
    for (const row of rows) seed.run(row);
  });
  insertMany(demo);
}

module.exports = db;
