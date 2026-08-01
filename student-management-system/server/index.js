'use strict';

const path = require('node:path');
const Fastify = require('fastify');
const fastifyStatic = require('@fastify/static');
const studentRoutes = require('./routes/students');

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

async function buildServer() {
  const fastify = Fastify({
    logger: { level: 'info' }
  });

  // 托管前端静态资源 (public/)
  fastify.register(fastifyStatic, {
    root: path.join(__dirname, '..', 'public'),
    prefix: '/'
  });

  // 统一 API 错误处理
  fastify.setErrorHandler((error, request, reply) => {
    if (error.validation) {
      reply.code(400).send({
        error: 'VALIDATION_ERROR',
        message: '请求参数不合法',
        details: error.validation
      });
      return;
    }
    request.log.error(error);
    reply.code(500).send({ error: 'INTERNAL_ERROR', message: '服务器内部错误' });
  });

  fastify.register(studentRoutes);

  fastify.get('/api/health', async () => ({ status: 'ok', time: new Date().toISOString() }));

  return fastify;
}

async function start() {
  const fastify = await buildServer();
  try {
    await fastify.listen({ port: PORT, host: HOST });
    fastify.log.info(`学生信息管理系统已启动: http://localhost:${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

start();
