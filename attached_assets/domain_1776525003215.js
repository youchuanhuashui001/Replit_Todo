import { ALLOWED_IMAGE_MIME, MAX_IMAGE_BYTES } from './config.js';

export function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

export function validatePassword(password) {
  if (typeof password !== 'string' || password.length < 8) {
    return '密码至少需要 8 位';
  }
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return '密码需要同时包含字母和数字';
  }
  return null;
}

export function validateMemoPayload(payload) {
  const title = String(payload?.title || '').trim();
  const content = String(payload?.content || '').trim();
  const remindAt = payload?.remindAt ? String(payload.remindAt) : null;
  const imageDataUrl = payload?.imageDataUrl ? String(payload.imageDataUrl) : null;

  if (!title) return { ok: false, error: '标题不能为空' };
  if (title.length > 120) return { ok: false, error: '标题不能超过 120 个字符' };
  if (content.length > 5000) return { ok: false, error: '内容不能超过 5000 个字符' };

  if (remindAt && Number.isNaN(Date.parse(remindAt))) {
    return { ok: false, error: '提醒时间格式无效' };
  }

  if (imageDataUrl) {
    const imageCheck = validateImageDataUrl(imageDataUrl);
    if (!imageCheck.ok) return imageCheck;
  }

  return {
    ok: true,
    value: {
      title,
      content,
      remindAt,
      imageDataUrl
    }
  };
}

export function validateImageDataUrl(dataUrl) {
  const match = /^data:([^;]+);base64,(.+)$/u.exec(dataUrl || '');
  if (!match) {
    return { ok: false, error: '图片格式无效' };
  }
  const mime = match[1].toLowerCase();
  if (!ALLOWED_IMAGE_MIME.has(mime)) {
    return { ok: false, error: '仅支持 jpg/png/webp 图片' };
  }
  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length > MAX_IMAGE_BYTES) {
    return { ok: false, error: '图片不能超过 5MB' };
  }
  return { ok: true, bytes: buffer.length, mime };
}

export function isReminderDue(memo, now = Date.now()) {
  if (!memo?.remindAt) return false;
  if (memo?.reminderAcknowledgedAt) return false;
  return Date.parse(memo.remindAt) <= now;
}

export function sortByUpdatedDesc(items) {
  return [...items].sort((a, b) => Date.parse(b.updatedAt || b.createdAt || 0) - Date.parse(a.updatedAt || a.createdAt || 0));
}

export function filterUpcomingHolidays(holidays, now = new Date(), days = 90) {
  const start = startOfDay(now).getTime();
  const end = start + days * 24 * 60 * 60 * 1000;
  return holidays
    .filter((holiday) => {
      const ts = Date.parse(holiday.date);
      return Number.isFinite(ts) && ts >= start && ts <= end;
    })
    .sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
}

export function startOfDay(date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}
