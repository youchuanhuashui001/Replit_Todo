import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JsonStore } from './src/store.js';
import { SESSION_COOKIE, LOGIN_RATE_LIMIT_MAX, LOGIN_RATE_LIMIT_WINDOW_MS } from './src/config.js';
import { hashPassword, verifyPassword, createSessionToken } from './src/auth.js';
import { isReminderDue, normalizeEmail, validateMemoPayload, validatePassword } from './src/domain.js';
import { getUpcomingHolidays, getWeather, searchCities } from './src/providers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, 'public');
const store = new JsonStore();
const rateLimitBuckets = new Map();

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const user = getAuthenticatedUser(req);

    if (url.pathname.startsWith('/api/')) {
      await handleApi(req, res, url, user);
      return;
    }

    await serveStatic(res, url.pathname);
  } catch (error) {
    console.error('server_error', error);
    sendJson(res, 500, { error: '服务器内部错误' });
  }
});

const port = Number(process.env.PORT || 3000);
server.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});

function getAuthenticatedUser(req) {
  const cookies = parseCookies(req.headers.cookie || '');
  const token = cookies[SESSION_COOKIE];
  if (!token) return null;
  return store.getUserFromSession(token);
}

async function handleApi(req, res, url, user) {
  if (req.method === 'POST' && url.pathname === '/api/auth/register') {
    enforceRateLimit(req, res, 'register');
    const body = await readJsonBody(req);
    const email = normalizeEmail(body.email);
    const passwordError = validatePassword(body.password);
    if (!email || passwordError) {
      sendJson(res, 400, { error: passwordError || '邮箱不能为空' });
      return;
    }

    try {
      const createdUser = store.createUser({
        email,
        passwordHash: hashPassword(body.password),
        timezone: body.timezone || 'Asia/Shanghai'
      });
      const token = createSessionToken();
      store.createSession(createdUser.id, token);
      setSessionCookie(res, token);
      sendJson(res, 201, { user: createdUser });
    } catch (error) {
      if (error.message === 'EMAIL_EXISTS') {
        sendJson(res, 409, { error: '该邮箱已注册' });
        return;
      }
      throw error;
    }
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/auth/login') {
    enforceRateLimit(req, res, 'login');
    const body = await readJsonBody(req);
    const userRecord = store.findUserByEmail(body.email);
    if (!userRecord || !verifyPassword(body.password, userRecord.passwordHash)) {
      sendJson(res, 401, { error: '邮箱或密码错误' });
      return;
    }
    const token = createSessionToken();
    store.createSession(userRecord.id, token);
    setSessionCookie(res, token);
    sendJson(res, 200, { user: { id: userRecord.id, email: userRecord.email } });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/auth/logout') {
    const cookies = parseCookies(req.headers.cookie || '');
    if (cookies[SESSION_COOKIE]) {
      store.deleteSessionByToken(cookies[SESSION_COOKIE]);
    }
    clearSessionCookie(res);
    sendJson(res, 200, { ok: true });
    return;
  }

  if (!user) {
    sendJson(res, 401, { error: '请先登录' });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/bootstrap') {
    const payload = await buildBootstrapPayload(user);
    sendJson(res, 200, payload);
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/memos') {
    sendJson(res, 200, { memos: store.listMemos(user.id) });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/memos') {
    const body = await readJsonBody(req);
    const validated = validateMemoPayload(body);
    if (!validated.ok) {
      sendJson(res, 400, { error: validated.error });
      return;
    }
    const memo = store.saveMemo(user.id, validated.value);
    sendJson(res, 201, { memo });
    return;
  }

  if (req.method === 'PUT' && /^\/api\/memos\/[^/]+$/u.test(url.pathname)) {
    const memoId = url.pathname.split('/').pop();
    const body = await readJsonBody(req);
    const validated = validateMemoPayload(body);
    if (!validated.ok) {
      sendJson(res, 400, { error: validated.error });
      return;
    }
    try {
      const memo = store.saveMemo(user.id, validated.value, memoId);
      sendJson(res, 200, { memo });
    } catch (error) {
      if (error.message === 'MEMO_NOT_FOUND') {
        sendJson(res, 404, { error: '备忘录不存在' });
        return;
      }
      throw error;
    }
    return;
  }

  if (req.method === 'DELETE' && /^\/api\/memos\/[^/]+$/u.test(url.pathname)) {
    const memoId = url.pathname.split('/').pop();
    try {
      store.deleteMemo(user.id, memoId);
      sendJson(res, 200, { ok: true });
    } catch (error) {
      if (error.message === 'MEMO_NOT_FOUND') {
        sendJson(res, 404, { error: '备忘录不存在' });
        return;
      }
      throw error;
    }
    return;
  }

  if (req.method === 'POST' && /^\/api\/memos\/[^/]+\/ack-reminder$/u.test(url.pathname)) {
    const parts = url.pathname.split('/');
    const memoId = parts[3];
    try {
      const memo = store.acknowledgeReminder(user.id, memoId);
      sendJson(res, 200, { memo });
    } catch (error) {
      if (error.message === 'MEMO_NOT_FOUND') {
        sendJson(res, 404, { error: '备忘录不存在' });
        return;
      }
      throw error;
    }
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/cities/search') {
    const body = await readJsonBody(req);
    try {
      const results = await searchCities(body.query);
      sendJson(res, 200, { results });
    } catch (error) {
      sendJson(res, 502, { error: '城市搜索失败，请稍后重试' });
    }
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/cities') {
    sendJson(res, 200, { cities: store.listCities(user.id) });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/cities') {
    const body = await readJsonBody(req);
    if (!body?.name || body?.latitude == null || body?.longitude == null) {
      sendJson(res, 400, { error: '城市信息不完整' });
      return;
    }
    const city = store.addCity(user.id, {
      name: body.name,
      country: body.country,
      latitude: Number(body.latitude),
      longitude: Number(body.longitude),
      timezone: body.timezone,
      isDefault: Boolean(body.isDefault)
    });
    sendJson(res, 201, { city, cities: store.listCities(user.id) });
    return;
  }

  if (req.method === 'POST' && /^\/api\/cities\/[^/]+\/default$/u.test(url.pathname)) {
    const cityId = url.pathname.split('/')[3];
    try {
      store.setDefaultCity(user.id, cityId);
      sendJson(res, 200, { cities: store.listCities(user.id) });
    } catch (error) {
      if (error.message === 'CITY_NOT_FOUND') {
        sendJson(res, 404, { error: '城市不存在' });
        return;
      }
      throw error;
    }
    return;
  }

  if (req.method === 'DELETE' && /^\/api\/cities\/[^/]+$/u.test(url.pathname)) {
    const cityId = url.pathname.split('/').pop();
    try {
      store.deleteCity(user.id, cityId);
      sendJson(res, 200, { cities: store.listCities(user.id) });
    } catch (error) {
      if (error.message === 'CITY_NOT_FOUND') {
        sendJson(res, 404, { error: '城市不存在' });
        return;
      }
      throw error;
    }
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/weather') {
    const cities = store.listCities(user.id);
    const cityId = url.searchParams.get('cityId');
    const city = cityId ? cities.find((item) => item.id === cityId) : cities.find((item) => item.isDefault) || cities[0];
    if (!city) {
      sendJson(res, 200, { weather: null });
      return;
    }
    try {
      const weather = await getWeather(city);
      sendJson(res, 200, { weather, city });
    } catch (error) {
      sendJson(res, 502, { error: '天气数据暂时不可用', weather: null, city });
    }
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/holidays') {
    const preferences = store.getPreferences(user.id);
    try {
      const holidays = await getUpcomingHolidays(preferences.holidayRegion, preferences.holidayWindowDays);
      sendJson(res, 200, { holidays });
    } catch (error) {
      sendJson(res, 502, { error: '假期数据暂时不可用', holidays: [] });
    }
    return;
  }

  sendJson(res, 404, { error: '接口不存在' });
}

async function buildBootstrapPayload(user) {
  const memos = store.listMemos(user.id);
  const preferences = store.getPreferences(user.id);
  const cities = store.listCities(user.id);
  const dueMemos = memos.filter((memo) => isReminderDue(memo));
  const currentCity = cities.find((city) => city.isDefault) || cities[0] || null;

  let weather = null;
  let weatherError = null;
  let holidays = [];
  let holidayError = null;

  if (currentCity) {
    try {
      weather = await getWeather(currentCity);
    } catch {
      weatherError = '天气数据暂时不可用';
    }
  }

  try {
    holidays = await getUpcomingHolidays(preferences.holidayRegion, preferences.holidayWindowDays);
  } catch {
    holidayError = '假期数据暂时不可用';
  }

  return {
    user,
    preferences,
    memos,
    dueMemos,
    cities,
    weather,
    weatherError,
    holidays,
    holidayError,
    serverTime: new Date().toISOString()
  };
}

function enforceRateLimit(req, res, scope) {
  const key = `${scope}:${req.socket.remoteAddress || 'local'}`;
  const now = Date.now();
  const bucket = rateLimitBuckets.get(key) || [];
  const active = bucket.filter((entry) => entry > now - LOGIN_RATE_LIMIT_WINDOW_MS);
  active.push(now);
  rateLimitBuckets.set(key, active);
  if (active.length > LOGIN_RATE_LIMIT_MAX) {
    sendJson(res, 429, { error: '操作过于频繁，请稍后再试' });
    throw new Error('RATE_LIMITED');
  }
}

async function serveStatic(res, pathname) {
  const safePath = pathname === '/' ? '/index.html' : pathname;
  const filePath = path.join(publicDir, safePath);
  if (!filePath.startsWith(publicDir) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    sendText(res, 404, 'Not Found');
    return;
  }
  const extension = path.extname(filePath);
  const contentType = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8'
  }[extension] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': contentType });
  fs.createReadStream(filePath).pipe(res);
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

function parseCookies(cookieHeader) {
  return Object.fromEntries(
    cookieHeader
      .split(';')
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((pair) => {
        const index = pair.indexOf('=');
        return [pair.slice(0, index), decodeURIComponent(pair.slice(index + 1))];
      })
  );
}

function setSessionCookie(res, token) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${30 * 24 * 60 * 60}${secure}`);
}

function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`);
}

function sendJson(res, statusCode, payload) {
  if (res.writableEnded) return;
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function sendText(res, statusCode, payload) {
  if (res.writableEnded) return;
  res.writeHead(statusCode, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(payload);
}
