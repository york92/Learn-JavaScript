'use strict';

const db = require('../db');

const STATUS_VALUES = ['在读', '休学', '毕业', '退学'];
const GENDER_VALUES = ['男', '女'];

const studentBodySchema = {
  type: 'object',
  required: ['student_no', 'name'],
  properties: {
    student_no: { type: 'string', minLength: 1, maxLength: 32 },
    name: { type: 'string', minLength: 1, maxLength: 32 },
    gender: { type: 'string', enum: GENDER_VALUES },
    birth_date: { type: 'string', maxLength: 32 },
    class_name: { type: 'string', maxLength: 64 },
    major: { type: 'string', maxLength: 64 },
    phone: { type: 'string', maxLength: 32 },
    email: { type: 'string', maxLength: 64 },
    address: { type: 'string', maxLength: 128 },
    enroll_date: { type: 'string', maxLength: 32 },
    status: { type: 'string', enum: STATUS_VALUES },
    remark: { type: 'string', maxLength: 256 }
  },
  additionalProperties: false
};

function normalizeStudentInput(body) {
  return {
    student_no: (body.student_no || '').trim(),
    name: (body.name || '').trim(),
    gender: body.gender || '男',
    birth_date: body.birth_date || null,
    class_name: (body.class_name || '').trim(),
    major: (body.major || '').trim(),
    phone: (body.phone || '').trim(),
    email: (body.email || '').trim(),
    address: (body.address || '').trim(),
    enroll_date: body.enroll_date || null,
    status: body.status || '在读',
    remark: (body.remark || '').trim()
  };
}

async function studentRoutes(fastify) {
  // 列表：支持分页 + 关键字搜索(姓名/学号) + 班级筛选 + 状态筛选
  fastify.get('/api/students', async (request, reply) => {
    const {
      page = 1,
      pageSize = 10,
      keyword = '',
      class_name = '',
      status = ''
    } = request.query;

    const p = Math.max(1, parseInt(page, 10) || 1);
    const ps = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 10));

    const where = [];
    const params = {};

    if (keyword) {
      where.push('(name LIKE @kw OR student_no LIKE @kw)');
      params.kw = `%${keyword}%`;
    }
    if (class_name) {
      where.push('class_name = @class_name');
      params.class_name = class_name;
    }
    if (status) {
      where.push('status = @status');
      params.status = status;
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const total = db
      .prepare(`SELECT COUNT(*) AS c FROM students ${whereSql}`)
      .get(params).c;

    const rows = db
      .prepare(
        `SELECT * FROM students ${whereSql}
         ORDER BY id DESC
         LIMIT @limit OFFSET @offset`
      )
      .all({ ...params, limit: ps, offset: (p - 1) * ps });

    return reply.send({
      data: rows,
      pagination: { page: p, pageSize: ps, total, totalPages: Math.max(1, Math.ceil(total / ps)) }
    });
  });

  // 统计信息：总数 / 按状态 / 按班级
  fastify.get('/api/students/stats', async (request, reply) => {
    const total = db.prepare('SELECT COUNT(*) AS c FROM students').get().c;
    const byStatus = db
      .prepare('SELECT status, COUNT(*) AS count FROM students GROUP BY status')
      .all();
    const byClass = db
      .prepare('SELECT class_name, COUNT(*) AS count FROM students GROUP BY class_name ORDER BY count DESC')
      .all();
    return reply.send({ total, byStatus, byClass });
  });

  // 班级下拉选项
  fastify.get('/api/classes', async (request, reply) => {
    const rows = db
      .prepare("SELECT DISTINCT class_name FROM students WHERE class_name != '' ORDER BY class_name")
      .all();
    return reply.send(rows.map((r) => r.class_name));
  });

  // 单条详情
  fastify.get('/api/students/:id', async (request, reply) => {
    const row = db.prepare('SELECT * FROM students WHERE id = ?').get(request.params.id);
    if (!row) {
      return reply.code(404).send({ error: 'NOT_FOUND', message: '未找到该学生' });
    }
    return reply.send(row);
  });

  // 新增
  fastify.post('/api/students', { schema: { body: studentBodySchema } }, async (request, reply) => {
    const data = normalizeStudentInput(request.body);

    if (!data.student_no || !data.name) {
      return reply.code(400).send({ error: 'VALIDATION_ERROR', message: '学号和姓名为必填项' });
    }

    const dup = db.prepare('SELECT id FROM students WHERE student_no = ?').get(data.student_no);
    if (dup) {
      return reply.code(409).send({ error: 'DUPLICATE', message: '该学号已存在' });
    }

    const stmt = db.prepare(`
      INSERT INTO students
        (student_no, name, gender, birth_date, class_name, major, phone, email, address, enroll_date, status, remark)
      VALUES
        (@student_no, @name, @gender, @birth_date, @class_name, @major, @phone, @email, @address, @enroll_date, @status, @remark)
    `);
    const info = stmt.run(data);
    const created = db.prepare('SELECT * FROM students WHERE id = ?').get(info.lastInsertRowid);
    return reply.code(201).send(created);
  });

  // 更新
  fastify.put('/api/students/:id', { schema: { body: studentBodySchema } }, async (request, reply) => {
    const existing = db.prepare('SELECT * FROM students WHERE id = ?').get(request.params.id);
    if (!existing) {
      return reply.code(404).send({ error: 'NOT_FOUND', message: '未找到该学生' });
    }

    const data = normalizeStudentInput(request.body);
    if (!data.student_no || !data.name) {
      return reply.code(400).send({ error: 'VALIDATION_ERROR', message: '学号和姓名为必填项' });
    }

    const dup = db
      .prepare('SELECT id FROM students WHERE student_no = ? AND id != ?')
      .get(data.student_no, request.params.id);
    if (dup) {
      return reply.code(409).send({ error: 'DUPLICATE', message: '该学号已被其他学生使用' });
    }

    db.prepare(`
      UPDATE students SET
        student_no = @student_no,
        name = @name,
        gender = @gender,
        birth_date = @birth_date,
        class_name = @class_name,
        major = @major,
        phone = @phone,
        email = @email,
        address = @address,
        enroll_date = @enroll_date,
        status = @status,
        remark = @remark,
        updated_at = datetime('now', 'localtime')
      WHERE id = @id
    `).run({ ...data, id: request.params.id });

    const updated = db.prepare('SELECT * FROM students WHERE id = ?').get(request.params.id);
    return reply.send(updated);
  });

  // 删除
  fastify.delete('/api/students/:id', async (request, reply) => {
    const existing = db.prepare('SELECT id FROM students WHERE id = ?').get(request.params.id);
    if (!existing) {
      return reply.code(404).send({ error: 'NOT_FOUND', message: '未找到该学生' });
    }
    db.prepare('DELETE FROM students WHERE id = ?').run(request.params.id);
    return reply.code(204).send();
  });
}

module.exports = studentRoutes;
