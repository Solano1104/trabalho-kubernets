const express = require('express');
const mysql = require('mysql2/promise');
const { createClient } = require('redis');
const { setTimeout: delay } = require('node:timers/promises');
const path = require('node:path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  connectionLimit: 8,
  connectTimeout: 3000,
  queueLimit: 32
});

const redis = createClient({
  url: process.env.REDIS_URL || `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT || 6379}`,
  disableOfflineQueue: true,
  socket: { connectTimeout: 3000 }
});
redis.on('error', error => console.error('Redis:', error.message));

const route = handler => (req, res, next) => Promise.resolve(handler(req, res)).catch(next);

app.get('/health', (req, res) => res.json({ status: 'ok', versao: '1.0' }));

app.get('/ready', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    await redis.ping();
    res.json({ status: 'pronto' });
  } catch {
    res.status(503).json({ status: 'dependencias indisponiveis' });
  }
});

app.post('/produtos', route(async (req, res) => {
  const { nome, preco } = req.body || {};
  if (typeof nome !== 'string' || !nome.trim() || nome.trim().length > 100 ||
    typeof preco !== 'number' || !Number.isFinite(preco) || preco < 0 ||
    preco > 99999999.99 || Number(preco.toFixed(2)) !== preco) {
    return res.status(400).json({ erro: 'Informe nome de ate 100 caracteres e preco numerico com ate duas casas decimais.' });
  }
  const [result] = await pool.execute('INSERT INTO produtos (nome, preco) VALUES (?, ?)', [nome.trim(), preco]);
  res.location(`/produtos/${result.insertId}`).status(201).json({ id: result.insertId, nome: nome.trim(), preco });
}));

app.get('/produtos', route(async (req, res) => {
  const [rows] = await pool.execute('SELECT id, nome, preco FROM produtos ORDER BY id DESC LIMIT 100');
  res.json(rows);
}));

app.get('/produtos/:id', route(async (req, res) => {
  const id = Number(req.params.id);
  if (!/^[1-9]\d*$/.test(req.params.id) || id > 4294967295) {
    return res.status(400).json({ erro: 'ID invalido' });
  }
  const key = `loja:produto:${id}`;
  const cached = await redis.get(key);
  if (cached !== null) {
    return res.set('X-Cache', 'HIT').json(JSON.parse(cached));
  }
  const [[produto]] = await pool.execute('SELECT id, nome, preco FROM produtos WHERE id = ?', [id]);
  if (!produto) return res.status(404).json({ erro: 'Produto nao encontrado' });
  await redis.setEx(key, 60, JSON.stringify(produto));
  res.set('X-Cache', 'MISS').json(produto);
}));

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (error.type === 'entity.parse.failed') return res.status(400).json({ erro: 'JSON invalido' });
  if (error.type === 'entity.too.large') return res.status(413).json({ erro: 'Corpo da requisicao muito grande' });
  console.error(error.message);
  res.status(503).json({ erro: 'Servico temporariamente indisponivel' });
});

async function start() {
  for (let attempt = 1; ; attempt++) {
    try {
      await pool.execute(`CREATE TABLE IF NOT EXISTS produtos (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        nome VARCHAR(100) NOT NULL,
        preco DECIMAL(10,2) NOT NULL
      )`);
      break;
    } catch (error) {
      if (attempt === 30) throw error;
      console.error('Aguardando MySQL:', error.message);
      await delay(2000);
    }
  }

  redis.connect().catch(error => {
    console.error('Falha ao iniciar Redis:', error.message);
    process.exit(1);
  });

  const port = Number(process.env.PORT || 3000);
  app.listen(port, '0.0.0.0', () => console.log(`Loja N3 na porta ${port}`));
}

start().catch(error => {
  console.error(error);
  process.exit(1);
});
