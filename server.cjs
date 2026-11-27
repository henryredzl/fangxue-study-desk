const { createServer } = require('node:http');
const { mkdirSync, readFileSync } = require('node:fs');
const { join, resolve } = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { createHash, randomBytes, scrypt, timingSafeEqual } = require('node:crypto');
const { promisify } = require('node:util');
const { spawn } = require('node:child_process');
const cityQuestions = require('./city-bank.js');

const port = Number(process.env.STUDY_PORT || 4178);
const address = `http://127.0.0.1:${port}`;
const dataDir = resolve(process.env.STUDY_DATA_DIR || join(__dirname, 'data'));
const offlinePage = readFileSync(join(__dirname, 'index.html'), 'utf8');
const bankMatch = offlinePage.match(/<script id="question-bank" type="application\/json">([\s\S]*?)<\/script>/);
const questionBank = JSON.parse(bankMatch[1]);
const questions = new Map(Object.values(questionBank).flatMap(topics => topics.flatMap(topic =>
  topic.questions.map((question, index) => [`${topic.id}-${index + 1}`, question])
)));
for (const question of Object.values(cityQuestions).flat()) questions.set(question.id,question);
const page = offlinePage.replace('</head>', '<link rel="stylesheet" href="/account.css">\n</head>')
  .replace('</body>', '<script src="/account.js"></script>\n</body>');
const resources = new Map([
  ['/', ['text/html; charset=utf-8', page]],
  ['/index.html', ['text/html; charset=utf-8', page]],
  ['/city-bank.js', ['text/javascript; charset=utf-8', readFileSync(join(__dirname, 'city-bank.js'))]],
  ['/account.js', ['text/javascript; charset=utf-8', readFileSync(join(__dirname, 'account.js'))]],
  ['/account.css', ['text/css; charset=utf-8', readFileSync(join(__dirname, 'account.css'))]]
]);

mkdirSync(dataDir, { recursive: true });
const db = new DatabaseSync(join(dataDir, 'study.sqlite'));
db.exec(`
  PRAGMA foreign_keys = ON;
  PRAGMA journal_mode = WAL;
  PRAGMA busy_timeout = 5000;
  CREATE TABLE IF NOT EXISTS accounts (
    id INTEGER PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    salt TEXT NOT NULL,
    password_hash TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS attempts (
    id INTEGER PRIMARY KEY,
    account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    request_id TEXT NOT NULL,
    question_id TEXT NOT NULL,
    result TEXT NOT NULL CHECK(result IN ('correct', 'wrong', 'written')),
    answered_at TEXT NOT NULL,
    UNIQUE(account_id, request_id)
  );
  CREATE INDEX IF NOT EXISTS attempt_by_question ON attempts(account_id, question_id, id);
`);

const accountByName = db.prepare('SELECT * FROM accounts WHERE username = ?');
const addAccount = db.prepare('INSERT INTO accounts (username, salt, password_hash) VALUES (?, ?, ?) ON CONFLICT(username) DO NOTHING');
const addSession = db.prepare('INSERT INTO sessions VALUES (?, ?, ?)');
const clearSession = db.prepare('DELETE FROM sessions WHERE token_hash = ?');
const clearExpired = db.prepare('DELETE FROM sessions WHERE expires_at <= ?');
const findSession = db.prepare(`
  SELECT accounts.id, accounts.username FROM sessions JOIN accounts ON accounts.id = sessions.account_id
  WHERE sessions.token_hash = ? AND sessions.expires_at > ?
`);
const addAttempt = db.prepare(`
  INSERT INTO attempts (account_id, request_id, question_id, result, answered_at)
  VALUES (?, ?, ?, ?, ?) ON CONFLICT(account_id, request_id) DO NOTHING
`);
const findAttempt = db.prepare('SELECT question_id, result FROM attempts WHERE account_id = ? AND request_id = ?');
const exportAttempts = db.prepare(`
  SELECT request_id AS attemptId, question_id AS questionId, result, answered_at AS answeredAt
  FROM attempts WHERE account_id = ? ORDER BY id LIMIT 50001
`);
const getSummary = db.prepare(`
  WITH totals AS (
    SELECT question_id, MIN(id) first_id, MAX(id) last_id,
      SUM(result = 'correct') correct, SUM(result = 'wrong') wrong, SUM(result = 'written') written
    FROM attempts WHERE account_id = ? GROUP BY question_id
  )
  SELECT totals.question_id, totals.correct, totals.wrong, totals.written,
    first.result first_result, latest.result latest_result, latest.answered_at latest_at
  FROM totals JOIN attempts first ON first.id = totals.first_id JOIN attempts latest ON latest.id = totals.last_id
`);

const cookieName = 'fangxue_session';
const sessionSeconds = 30 * 24 * 60 * 60;
const passwordHash = promisify(scrypt);
const digest = token => createHash('sha256').update(token).digest('hex');
const cookie = (token, age) => `${cookieName}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}`;
const authRequests = [];

function send(response, status, value, headers = {}) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'X-Frame-Options': 'DENY',
    ...headers
  });
  response.end(value);
}

function json(response, status, data, headers) {
  send(response, status, JSON.stringify(data), headers);
}

function problem(status, message) {
  return Object.assign(new Error(message), { status });
}

async function readJson(request) {
  if (!/^application\/json(?:;|$)/i.test(request.headers['content-type'] || '')) throw problem(415, '请求格式不正确。');
  const chunks = [];
  let length = 0;
  for await (const chunk of request.iterator({ destroyOnReturn: false })) {
    length += chunk.length;
    if (length > 8192) {
      request.resume();
      throw problem(413, '请求内容太长。');
    }
    chunks.push(chunk);
  }
  let value;
  try { value = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw problem(400, '请求内容无法读取。'); }
  if (!value || Array.isArray(value) || typeof value !== 'object') throw problem(400, '请求内容无法读取。');
  return value;
}

function readToken(request) {
  const value = (request.headers.cookie || '').split(/;\s*/).find(part => part.startsWith(`${cookieName}=`));
  const token = value?.slice(cookieName.length + 1);
  return /^[a-f0-9]{64}$/.test(token || '') ? digest(token) : null;
}

function state(user) {
  const records = getSummary.all(user.id).filter(row => questions.has(row.question_id)).map(row => [row.question_id, {
    first: row.first_result === 'written' ? null : row.first_result === 'correct',
    latest: row.latest_result,
    review: row.latest_result === 'wrong',
    correct: row.correct,
    wrong: row.wrong,
    written: row.written,
    at: row.latest_at
  }]);
  return { user, records: Object.fromEntries(records) };
}

async function signIn(request, response, register) {
  const now = Date.now();
  while (authRequests.length && authRequests[0] < now - 60_000) authRequests.shift();
  if (authRequests.length >= 20) throw problem(429, '尝试次数较多，请一分钟后再试。');
  authRequests.push(now);
  const input = await readJson(request);
  const username = typeof input.username === 'string' ? input.username.trim().normalize('NFKC').toLowerCase() : '';
  const password = input.password;
  if (!/^[\p{Script=Han}a-z0-9_-]{3,24}$/u.test(username) || typeof password !== 'string' || password.length < 8 || password.length > 128) {
    throw problem(400, '账号名需为 3–24 个汉字、字母、数字、下划线或短横线，密码需为 8–128 个字符。');
  }
  let account = accountByName.get(username);
  if (register) {
    const salt = randomBytes(16).toString('hex');
    const hash = (await passwordHash(password, salt, 64)).toString('hex');
    if (!addAccount.run(username, salt, hash).changes) throw problem(409, '这个账号名已经使用，请登录或换一个。');
    account = accountByName.get(username);
  } else {
    const hash = await passwordHash(password, account?.salt || '00000000000000000000000000000000', 64);
    if (!account || !timingSafeEqual(hash, Buffer.from(account.password_hash, 'hex'))) throw problem(401, '账号名或密码不正确。');
  }
  const old = readToken(request);
  if (old) clearSession.run(old);
  clearExpired.run(Date.now());
  const token = randomBytes(32).toString('hex');
  addSession.run(digest(token), account.id, Date.now() + sessionSeconds * 1000);
  json(response, register ? 201 : 200, state({ id: account.id, username }), { 'Set-Cookie': cookie(token, sessionSeconds) });
}

function grade(question, answer) {
  const { type } = question;
  if (type === 'fill' || type === 'write') {
    if (typeof answer !== 'string' || !answer.trim() || answer.length > (type === 'write' ? 600 : 80)) throw problem(400, '请填写有效答案。');
    if (type === 'write') return 'written';
    const normalize = value => {
      const clean = value.normalize('NFKC').trim().replace(/\s+/g, '').replace(/[。.!！]$/, '');
      return question.caseSensitive ? clean : clean.toLowerCase();
    };
    return question.answer.some(value => normalize(value) === normalize(answer)) ? 'correct' : 'wrong';
  }
  const valid = index => Number.isInteger(index) && index >= 0 && index < question.choices.length;
  if (type === 'pick') {
    if (!valid(answer)) throw problem(400, '请选择有效选项。');
    return answer === question.answer ? 'correct' : 'wrong';
  }
  if (!Array.isArray(answer) || !answer.length || answer.length > question.choices.length ||
      new Set(answer).size !== answer.length || !answer.every(valid) ||
      (type === 'order' && answer.length !== question.choices.length)) throw problem(400, '请检查所选选项。');
  const correct = question.answer.length === answer.length && question.answer.every((item, index) =>
    type === 'order' ? item === answer[index] : answer.includes(item));
  return correct ? 'correct' : 'wrong';
}

async function handle(request, response) {
  const host = request.headers.host;
  if (![ `127.0.0.1:${port}`, `localhost:${port}` ].includes(host)) throw problem(403, '请通过本机学习地址访问。');
  const path = request.url;
  const method = request.method;
  const origin = request.headers.origin;
  if (path.startsWith('/api/') && ((origin && origin !== `http://${host}`) || request.headers['sec-fetch-site'] === 'cross-site')) {
    throw problem(403, '请求来源不正确。');
  }
  if ((method === 'GET' || method === 'HEAD') && resources.has(path)) {
    const [contentType, body] = resources.get(path);
    return send(response, 200, method === 'HEAD' ? undefined : body, { 'Content-Type': contentType });
  }
  if (method === 'GET' && path === '/favicon.ico') return send(response, 204);
  if (method === 'POST' && path === '/api/register') return signIn(request, response, true);
  if (method === 'POST' && path === '/api/login') return signIn(request, response, false);
  const token = readToken(request);
  const user = token && findSession.get(token, Date.now());
  if (method === 'GET' && path === '/api/state') return json(response, 200, user ? state(user) : { user: null });
  if (method === 'GET' && path === '/api/export-records') {
    if (!user) throw problem(401, '请登录要导出记录的账号。');
    const attempts = exportAttempts.all(user.id).filter(item => questions.has(item.questionId));
    if (attempts.length > 50_000) throw problem(413, '作答记录超过一次可迁移的数量。');
    return json(response, 200, { format: 'fangxue-study-records-v1', username: user.username, attempts });
  }
  if (method === 'POST' && path === '/api/logout') {
    if (token) clearSession.run(token);
    return json(response, 200, { user: null }, { 'Set-Cookie': cookie('', 0) });
  }
  if (method === 'POST' && path === '/api/attempts') {
    if (!user) throw problem(401, '登录已过期，请重新登录后提交。');
    const { accountId, attemptId, questionId, answer } = await readJson(request);
    if (accountId !== user.id) throw problem(409, '当前账号已切换，请刷新页面后继续。');
    const question = questions.get(questionId);
    if (!question || typeof attemptId !== 'string' || !/^[a-f0-9-]{36}$/.test(attemptId)) throw problem(400, '题目或作答编号不正确。');
    const result = grade(question, answer);
    addAttempt.run(user.id, attemptId, questionId, result, new Date().toISOString());
    const stored = findAttempt.get(user.id, attemptId);
    if (stored.question_id !== questionId || stored.result !== result) throw problem(409, '这条作答编号已使用，请重新开始本题。');
    return json(response, 200, { ...state(user), result: stored.result });
  }
  throw problem(404, '找不到这个页面。');
}

const server = createServer({ requestTimeout: 15_000 }, (request, response) => {
  handle(request, response).catch(error => {
    if (!error.status) console.error(error);
    if (!response.headersSent) json(response, error.status || 500, { error: error.status ? error.message : '暂时无法保存，请稍后重试。' });
  });
});
server.listen(port, '127.0.0.1', () => {
  console.log(`Study desk: ${address}/`);
  console.log(`Database: ${join(dataDir, 'study.sqlite')}`);
  if (process.argv.includes('--open') && process.platform === 'win32') {
    const browser = spawn('explorer.exe', [`${address}/`], { windowsHide: true, detached: true, stdio: 'ignore' });
    browser.on('error', () => console.log(`Open ${address}/ in your browser.`));
    browser.unref();
  }
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => server.close(() => db.close()));
}
