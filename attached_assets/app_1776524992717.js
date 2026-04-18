const state = {
  user: null,
  preferences: null,
  memos: [],
  dueMemos: [],
  cities: [],
  weather: null,
  holidays: [],
  serverTime: null,
  editingMemoId: null,
  imageDataUrl: null,
  clockTimer: null
};

const authSection = document.getElementById('authSection');
const dashboardSection = document.getElementById('dashboardSection');
const authActions = document.getElementById('authActions');
const userEmail = document.getElementById('userEmail');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const logoutButton = document.getElementById('logoutButton');
const memoForm = document.getElementById('memoForm');
const memoList = document.getElementById('memoList');
const reminderList = document.getElementById('reminderList');
const reminderCount = document.getElementById('reminderCount');
const clock = document.getElementById('clock');
const dateLabel = document.getElementById('dateLabel');
const holidayList = document.getElementById('holidayList');
const citySearchForm = document.getElementById('citySearchForm');
const citySearchInput = document.getElementById('citySearchInput');
const citySearchResults = document.getElementById('citySearchResults');
const savedCities = document.getElementById('savedCities');
const weatherCard = document.getElementById('weatherCard');
const imageInput = document.getElementById('imageInput');
const imagePreviewWrap = document.getElementById('imagePreviewWrap');
const imagePreview = document.getElementById('imagePreview');
const removeImageButton = document.getElementById('removeImageButton');
const cancelEditButton = document.getElementById('cancelEditButton');
const newMemoButton = document.getElementById('newMemoButton');
const toast = document.getElementById('toast');

loginForm.addEventListener('submit', (event) => handleAuthSubmit(event, '/api/auth/login'));
registerForm.addEventListener('submit', (event) => handleAuthSubmit(event, '/api/auth/register', true));
logoutButton.addEventListener('click', logout);
memoForm.addEventListener('submit', saveMemo);
citySearchForm.addEventListener('submit', searchCity);
imageInput.addEventListener('change', handleImageSelection);
removeImageButton.addEventListener('click', clearSelectedImage);
cancelEditButton.addEventListener('click', resetMemoForm);
newMemoButton.addEventListener('click', resetMemoForm);

void initialize();

async function initialize() {
  await refreshApp();
}

async function refreshApp() {
  try {
    const payload = await api('/api/bootstrap');
    Object.assign(state, payload);
    renderAuthenticated();
  } catch (error) {
    renderLoggedOut();
  }
}

async function handleAuthSubmit(event, url, includeTimezone = false) {
  event.preventDefault();
  const form = event.currentTarget;
  const formData = new FormData(form);
  const payload = {
    email: formData.get('email'),
    password: formData.get('password')
  };
  if (includeTimezone) {
    payload.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  }
  try {
    await api(url, { method: 'POST', body: payload });
    form.reset();
    showToast('操作成功');
    await refreshApp();
  } catch (error) {
    showToast(error.message || '操作失败', true);
  }
}

async function logout() {
  await api('/api/auth/logout', { method: 'POST' });
  renderLoggedOut();
}

function renderLoggedOut() {
  state.user = null;
  authSection.classList.remove('hidden');
  dashboardSection.classList.add('hidden');
  authActions.classList.add('hidden');
  if (state.clockTimer) clearInterval(state.clockTimer);
}

function renderAuthenticated() {
  authSection.classList.add('hidden');
  dashboardSection.classList.remove('hidden');
  authActions.classList.remove('hidden');
  userEmail.textContent = state.user.email;
  renderClock();
  renderMemos();
  renderReminders();
  renderCities();
  renderWeather();
  renderHolidays();
}

function renderClock() {
  const update = () => {
    const now = new Date();
    clock.textContent = now.toLocaleTimeString('zh-CN', { hour12: false });
    dateLabel.textContent = now.toLocaleDateString('zh-CN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };
  update();
  if (state.clockTimer) clearInterval(state.clockTimer);
  state.clockTimer = setInterval(update, 1000);
}

function renderMemos() {
  if (!state.memos.length) {
    memoList.innerHTML = '<div class="empty-state">还没有备忘录，先创建一条吧。</div>';
    return;
  }

  memoList.innerHTML = state.memos.map((memo) => `
    <article class="memo-card">
      <h3>${escapeHtml(memo.title)}</h3>
      <div class="memo-meta">更新于 ${formatDateTime(memo.updatedAt)}${memo.remindAt ? ` · 提醒 ${formatDateTime(memo.remindAt)}` : ''}</div>
      <p>${escapeHtml(memo.content || '（无内容）').replace(/\n/g, '<br/>')}</p>
      ${memo.imageDataUrl ? `<img class="image-thumb" src="${memo.imageDataUrl}" alt="备忘录图片" />` : ''}
      <div class="memo-actions">
        <button type="button" class="ghost small" data-action="edit" data-id="${memo.id}">编辑</button>
        <button type="button" class="ghost small" data-action="delete" data-id="${memo.id}">删除</button>
        ${memo.remindAt && !memo.reminderAcknowledgedAt ? `<button type="button" class="ghost small" data-action="ack" data-id="${memo.id}">确认提醒</button>` : ''}
      </div>
    </article>
  `).join('');

  memoList.querySelectorAll('button[data-action]').forEach((button) => {
    button.addEventListener('click', () => handleMemoAction(button.dataset.action, button.dataset.id));
  });
}

function renderReminders() {
  const dueMemos = state.memos.filter((memo) => memo.remindAt && !memo.reminderAcknowledgedAt && new Date(memo.remindAt) <= new Date());
  state.dueMemos = dueMemos;
  reminderCount.textContent = String(dueMemos.length);
  if (!dueMemos.length) {
    reminderList.innerHTML = '<div class="empty-state">暂无到点提醒</div>';
    return;
  }
  reminderList.innerHTML = dueMemos.map((memo) => `
    <article class="reminder-card">
      <h3>${escapeHtml(memo.title)}</h3>
      <div class="memo-meta">到点时间：${formatDateTime(memo.remindAt)}</div>
      <p>${escapeHtml(memo.content || '（无内容）')}</p>
      <button type="button" class="small" data-ack-id="${memo.id}">我知道了</button>
    </article>
  `).join('');
  reminderList.querySelectorAll('[data-ack-id]').forEach((button) => {
    button.addEventListener('click', async () => {
      await api(`/api/memos/${button.dataset.ackId}/ack-reminder`, { method: 'POST' });
      await refreshApp();
    });
  });
}

function renderCities() {
  if (!state.cities.length) {
    savedCities.innerHTML = '<div class="empty-state">暂无常用城市</div>';
    return;
  }
  savedCities.innerHTML = state.cities.map((city) => `
    <span class="city-chip ${city.isDefault ? 'default' : ''}">
      <span>${escapeHtml(city.name)}${city.country ? ` · ${escapeHtml(city.country)}` : ''}</span>
      ${city.isDefault ? '<strong>默认</strong>' : `<button type="button" class="ghost small" data-set-default="${city.id}">设为默认</button>`}
      <button type="button" class="ghost small" data-delete-city="${city.id}">删除</button>
    </span>
  `).join('');
  savedCities.querySelectorAll('[data-set-default]').forEach((button) => {
    button.addEventListener('click', async () => {
      await api(`/api/cities/${button.dataset.setDefault}/default`, { method: 'POST' });
      await refreshApp();
    });
  });
  savedCities.querySelectorAll('[data-delete-city]').forEach((button) => {
    button.addEventListener('click', async () => {
      await api(`/api/cities/${button.dataset.deleteCity}`, { method: 'DELETE' });
      await refreshApp();
    });
  });
}

function renderWeather() {
  if (!state.weather) {
    weatherCard.innerHTML = '<div class="empty-state">先添加城市后即可查看天气。</div>';
    return;
  }
  weatherCard.innerHTML = `
    <h3>${escapeHtml(state.weather.cityName)}</h3>
    <div class="clock">${state.weather.temperature ?? '--'}°C</div>
    <div class="weather-meta">${escapeHtml(state.weather.weatherLabel)} · 湿度 ${state.weather.humidity ?? '--'}% · 风速 ${state.weather.windSpeed ?? '--'} km/h</div>
    <div class="weather-meta">观测时间：${state.weather.observedAt ? formatDateTime(state.weather.observedAt) : '--'}</div>
  `;
}

function renderHolidays() {
  if (!state.holidays?.length) {
    holidayList.innerHTML = '<div class="empty-state">假期数据暂时不可用或未来 90 天没有法定节假日。</div>';
    return;
  }
  holidayList.innerHTML = state.holidays.map((holiday) => `
    <article class="holiday-card">
      <strong>${escapeHtml(holiday.localName || holiday.name)}</strong>
      <div class="holiday-meta">${formatDate(holiday.date)} · ${escapeHtml((holiday.types || []).join(' / ') || 'Holiday')}</div>
    </article>
  `).join('');
}

async function saveMemo(event) {
  event.preventDefault();
  const formData = new FormData(memoForm);
  const payload = {
    title: formData.get('title'),
    content: formData.get('content'),
    remindAt: formData.get('remindAt') ? new Date(formData.get('remindAt')).toISOString() : null,
    imageDataUrl: state.imageDataUrl
  };
  const memoId = formData.get('memoId');
  if (memoId) {
    await api(`/api/memos/${memoId}`, { method: 'PUT', body: payload });
    showToast('备忘录已更新');
  } else {
    await api('/api/memos', { method: 'POST', body: payload });
    showToast('备忘录已创建');
  }
  resetMemoForm();
  await refreshApp();
}

async function handleMemoAction(action, memoId) {
  const memo = state.memos.find((item) => item.id === memoId);
  if (!memo) return;
  if (action === 'edit') {
    state.editingMemoId = memo.id;
    state.imageDataUrl = memo.imageDataUrl;
    memoForm.memoId.value = memo.id;
    memoForm.title.value = memo.title;
    memoForm.content.value = memo.content || '';
    memoForm.remindAt.value = memo.remindAt ? toDateTimeLocal(memo.remindAt) : '';
    cancelEditButton.classList.remove('hidden');
    if (memo.imageDataUrl) {
      imagePreview.src = memo.imageDataUrl;
      imagePreviewWrap.classList.remove('hidden');
    }
    memoForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }
  if (action === 'delete') {
    await api(`/api/memos/${memoId}`, { method: 'DELETE' });
    showToast('备忘录已删除');
    await refreshApp();
    return;
  }
  if (action === 'ack') {
    await api(`/api/memos/${memoId}/ack-reminder`, { method: 'POST' });
    showToast('已确认提醒');
    await refreshApp();
  }
}

async function searchCity(event) {
  event.preventDefault();
  const query = citySearchInput.value.trim();
  if (!query) return;
  citySearchResults.innerHTML = '<div class="empty-state">正在搜索...</div>';
  try {
    const { results } = await api('/api/cities/search', { method: 'POST', body: { query } });
    if (!results.length) {
      citySearchResults.innerHTML = '<div class="empty-state">没有找到匹配城市</div>';
      return;
    }
    citySearchResults.innerHTML = results.map((city, index) => `
      <div class="search-result-item">
        <div>
          <strong>${escapeHtml(city.name)}</strong>
          <div class="memo-meta">${escapeHtml([city.admin1, city.country].filter(Boolean).join(' · '))}</div>
        </div>
        <button type="button" data-add-city='${JSON.stringify(city).replace(/'/g, '&apos;')}'>保存</button>
      </div>
    `).join('');
    citySearchResults.querySelectorAll('[data-add-city]').forEach((button) => {
      button.addEventListener('click', async () => {
        const city = JSON.parse(button.dataset.addCity.replace(/&apos;/g, "'"));
        await api('/api/cities', { method: 'POST', body: { ...city, isDefault: !state.cities.length } });
        showToast('已保存常用城市');
        citySearchInput.value = '';
        citySearchResults.innerHTML = '<div class="empty-state">搜索后可保存常用城市</div>';
        await refreshApp();
      });
    });
  } catch (error) {
    citySearchResults.innerHTML = `<div class="empty-state error">${escapeHtml(error.message || '搜索失败')}</div>`;
  }
}

async function handleImageSelection(event) {
  const [file] = event.target.files;
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) {
    showToast('图片不能超过 5MB', true);
    event.target.value = '';
    return;
  }
  state.imageDataUrl = await readFileAsDataUrl(file);
  imagePreview.src = state.imageDataUrl;
  imagePreviewWrap.classList.remove('hidden');
}

function clearSelectedImage() {
  state.imageDataUrl = null;
  imageInput.value = '';
  imagePreview.src = '';
  imagePreviewWrap.classList.add('hidden');
}

function resetMemoForm() {
  memoForm.reset();
  memoForm.memoId.value = '';
  state.editingMemoId = null;
  cancelEditButton.classList.add('hidden');
  clearSelectedImage();
}

async function api(url, options = {}) {
  const response = await fetch(url, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || '请求失败');
  }
  return payload;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('图片读取失败'));
    reader.readAsDataURL(file);
  });
}

function formatDateTime(value) {
  return new Date(value).toLocaleString('zh-CN', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}

function formatDate(value) {
  return new Date(value).toLocaleDateString('zh-CN', {
    year: 'numeric', month: 'short', day: 'numeric', weekday: 'short'
  });
}

function toDateTimeLocal(value) {
  const date = new Date(value);
  const pad = (num) => String(num).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function showToast(message, isError = false) {
  toast.textContent = message;
  toast.classList.remove('hidden');
  toast.style.background = isError ? 'rgba(127, 29, 29, 0.95)' : 'rgba(15, 23, 42, 0.92)';
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => toast.classList.add('hidden'), 2800);
}
