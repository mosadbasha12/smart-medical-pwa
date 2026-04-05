const defaultApiBaseUrl = 'http://127.0.0.1:8000/api';
const storageKeys = {
  apiBaseUrl: 'smartMedical.apiBaseUrl',
  token: 'smartMedical.token',
  refreshToken: 'smartMedical.refreshToken',
  user: 'smartMedical.user',
  demoMode: 'smartMedical.demoMode',
  demoState: 'smartMedical.demoState',
};

const state = {
  apiBaseUrl: normalizeBaseUrl(localStorage.getItem(storageKeys.apiBaseUrl) || defaultApiBaseUrl),
  token: localStorage.getItem(storageKeys.token) || '',
  refreshToken: localStorage.getItem(storageKeys.refreshToken) || '',
  user: safeJsonParse(localStorage.getItem(storageKeys.user), null),
  demoMode: localStorage.getItem(storageKeys.demoMode) === 'true',
  doctors: [],
  slots: [],
  appointments: [],
  medicalFile: null,
  visits: [],
  documents: [],
  installPrompt: null,
};

const el = (id) => document.getElementById(id);
const viewAuth = el('auth-view');
const viewApp = el('app-view');

function safeJsonParse(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function normalizeBaseUrl(value) {
  const raw = String(value || '').trim().replace(/\/+$/, '');
  if (!raw) return defaultApiBaseUrl;
  return raw.endsWith('/api') ? raw : `${raw}/api`;
}

function showToast(message, type = 'default') {
  const toast = el('toast');
  toast.textContent = message;
  toast.classList.remove('hidden');
  toast.style.background = type === 'error' ? '#9d1d31' : type === 'success' ? '#0d6b48' : '#13283c';
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.add('hidden'), 2600);
}

function formatDateTime(value) {
  if (!value) return 'غير متاح';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('ar-EG', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function htmlEscape(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function getDemoState() {
  const stored = safeJsonParse(localStorage.getItem(storageKeys.demoState), null);
  if (stored) return stored;
  const now = Date.now();
  return {
    doctors: [
      { id: 1, user: { first_name: 'أحمد', last_name: 'محمود' }, specialization: 'باطنة', years_of_experience: 9, room_name: 'عيادة 1', consultation_fee: '350.00' },
      { id: 2, user: { first_name: 'سارة', last_name: 'علي' }, specialization: 'جلدية', years_of_experience: 7, room_name: 'عيادة 2', consultation_fee: '300.00' },
      { id: 3, user: { first_name: 'كريم', last_name: 'حسن' }, specialization: 'عظام', years_of_experience: 12, room_name: 'عيادة 3', consultation_fee: '400.00' },
    ],
    slots: [
      { id: 101, doctor: { id: 1, user: { first_name: 'أحمد', last_name: 'محمود' }, specialization: 'باطنة', room_name: 'عيادة 1' }, start_time: new Date(now + 86400000).toISOString(), end_time: new Date(now + 90000000).toISOString(), room: 'عيادة 1', status: 'available', notes: '' },
      { id: 102, doctor: { id: 1, user: { first_name: 'أحمد', last_name: 'محمود' }, specialization: 'باطنة', room_name: 'عيادة 1' }, start_time: new Date(now + 2 * 86400000).toISOString(), end_time: new Date(now + 2 * 86400000 + 1800000).toISOString(), room: 'عيادة 1', status: 'available', notes: '' },
      { id: 201, doctor: { id: 2, user: { first_name: 'سارة', last_name: 'علي' }, specialization: 'جلدية', room_name: 'عيادة 2' }, start_time: new Date(now + 86400000 + 7200000).toISOString(), end_time: new Date(now + 86400000 + 9000000).toISOString(), room: 'عيادة 2', status: 'available', notes: '' },
      { id: 301, doctor: { id: 3, user: { first_name: 'كريم', last_name: 'حسن' }, specialization: 'عظام', room_name: 'عيادة 3' }, start_time: new Date(now + 3 * 86400000).toISOString(), end_time: new Date(now + 3 * 86400000 + 1800000).toISOString(), room: 'عيادة 3', status: 'available', notes: '' },
    ],
    appointments: [],
    medicalFile: {
      id: 1,
      chronic_diseases: 'لا يوجد',
      allergies: 'حساسية بسيطة من البنسلين',
      surgical_history: 'لا يوجد',
      family_history: 'ضغط وسكر لدى أحد أفراد العائلة',
      current_medications: 'Vitamin D',
      insurance_number: 'INS-2026-001',
    },
    visits: [
      { id: 1, visit_date: new Date(now - 30 * 86400000).toISOString(), chief_complaint: 'صداع متكرر', diagnosis: 'إجهاد ونقص نوم', treatment_plan: 'تنظيم النوم والمتابعة', prescribed_medications: 'Paracetamol عند الحاجة', notes: 'تحسن بعد أسبوعين' }
    ],
    documents: [
      { id: 1, doc_type: 'report', title: 'تقرير متابعة', notes: 'نتيجة مطمئنة', uploaded_at: new Date(now - 28 * 86400000).toISOString() },
      { id: 2, doc_type: 'lab', title: 'تحليل صورة دم', notes: 'ضمن المعدلات الطبيعية', uploaded_at: new Date(now - 26 * 86400000).toISOString() },
    ],
  };
}

function saveDemoState(data) {
  localStorage.setItem(storageKeys.demoState, JSON.stringify(data));
}

async function apiRequest(path, options = {}) {
  const url = `${state.apiBaseUrl}${path}`;
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  const response = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const text = await response.text();
  const data = text ? safeJsonParse(text, text) : null;
  if (!response.ok) {
    const detail = data?.detail || (typeof data === 'string' ? data : JSON.stringify(data));
    throw new Error(detail || 'فشل الاتصال بالسيرفر');
  }
  return data;
}

function persistSession({ access = '', refresh = '', user = null, demoMode = false }) {
  state.token = access;
  state.refreshToken = refresh;
  state.user = user;
  state.demoMode = demoMode;
  localStorage.setItem(storageKeys.token, access || '');
  localStorage.setItem(storageKeys.refreshToken, refresh || '');
  localStorage.setItem(storageKeys.user, JSON.stringify(user || null));
  localStorage.setItem(storageKeys.demoMode, demoMode ? 'true' : 'false');
}

function clearSession() {
  persistSession({ access: '', refresh: '', user: null, demoMode: false });
}

function triageMessage(message) {
  const normalized = (message || '').toLowerCase().trim();
  const emergencies = ['chest pain', 'stroke', 'unconscious', 'fainting', 'severe bleeding', 'difficulty breathing', 'shortness of breath', 'seizure', 'heart attack', 'sudden weakness'];
  for (const word of emergencies) {
    if (normalized.includes(word)) {
      return {
        urgency: 'high',
        recommended_specialty: 'Emergency Department',
        guidance: 'الأعراض المذكورة قد تحتاج تدخلًا عاجلًا. توجهي فورًا إلى أقرب طوارئ أو اتصلي بالإسعاف.',
        disclaimer: 'هذه الاستشارة الأولية لا تغني عن الكشف الطبي أو الطوارئ.',
      };
    }
  }
  const rules = [
    ['skin', 'Dermatology'],
    ['rash', 'Dermatology'],
    ['tooth', 'Dentistry'],
    ['pregnancy', 'Obstetrics & Gynecology'],
    ['baby', 'Pediatrics'],
    ['child', 'Pediatrics'],
    ['fever', 'Internal Medicine'],
    ['cough', 'Chest / Internal Medicine'],
    ['headache', 'Neurology or Internal Medicine'],
    ['bone', 'Orthopedics'],
    ['knee', 'Orthopedics'],
    ['heart', 'Cardiology'],
    ['vision', 'Ophthalmology'],
  ];
  let recommended = 'General Practice';
  for (const [keyword, specialty] of rules) {
    if (normalized.includes(keyword)) {
      recommended = specialty;
      break;
    }
  }
  return {
    urgency: 'medium',
    recommended_specialty: recommended,
    guidance: 'بناءً على الأعراض المكتوبة، يفضّل حجز موعد مع التخصص المقترح. إذا زادت الأعراض أو ظهرت علامات خطر، اذهبي إلى رعاية عاجلة.',
    disclaimer: 'هذه النتيجة استرشادية فقط وليست تشخيصًا نهائيًا.',
  };
}

function renderAuthState() {
  const loggedIn = Boolean(state.user);
  viewAuth.classList.toggle('active', !loggedIn);
  viewApp.classList.toggle('active', loggedIn);
  if (!loggedIn) return;
  const fullName = [state.user.first_name, state.user.last_name].filter(Boolean).join(' ').trim() || state.user.username || 'المستخدم';
  el('welcome-name').textContent = fullName;
  el('welcome-summary').textContent = state.demoMode ? 'أنتِ الآن داخل وضع العرض التقديمي بدون سيرفر.' : 'التطبيق متصل بالسيرفر ويعرض بيانات الحساب الحالي.';
  el('connection-pill').textContent = state.apiBaseUrl;
  el('mode-pill').textContent = state.demoMode ? 'وضع العرض' : 'متصل بالسيرفر';
  el('mode-pill').className = `pill ${state.demoMode ? 'warning' : 'success'}`;
  el('api-base-url').value = state.apiBaseUrl;
}

function doctorLabel(doctor) {
  const first = doctor?.user?.first_name || '';
  const last = doctor?.user?.last_name || '';
  return `د. ${[first, last].filter(Boolean).join(' ').trim() || 'غير محدد'}`;
}

function renderDoctors() {
  const list = el('doctors-list');
  const filter = el('slot-filter-doctor');
  filter.innerHTML = `<option value="">كل الأطباء</option>` + state.doctors.map((doc) => `<option value="${doc.id}">${htmlEscape(doctorLabel(doc))} - ${htmlEscape(doc.specialization || 'عام')}</option>`).join('');
  list.innerHTML = state.doctors.length ? state.doctors.map((doctor) => `
    <article class="item-card">
      <h4>${htmlEscape(doctorLabel(doctor))}</h4>
      <div class="badge-row">
        <span class="pill">${htmlEscape(doctor.specialization || 'عام')}</span>
        <span class="pill">${htmlEscape(String(doctor.years_of_experience || '0'))} سنة خبرة</span>
        <span class="pill">${htmlEscape(doctor.room_name || doctor.room || 'بدون غرفة')}</span>
      </div>
      <div class="item-meta">رسوم الكشف: ${htmlEscape(String(doctor.consultation_fee || 'غير محددة'))}</div>
    </article>
  `).join('') : '<div class="empty-hint">لا توجد بيانات أطباء حالياً.</div>';
}

function renderSlots() {
  const list = el('slots-list');
  const selectedDoctor = el('slot-filter-doctor').value;
  const slots = state.slots.filter((slot) => !selectedDoctor || String(slot.doctor?.id || slot.doctor) === selectedDoctor);
  list.innerHTML = slots.length ? slots.map((slot) => `
    <article class="item-card">
      <h4>${htmlEscape(doctorLabel(slot.doctor || {}))}</h4>
      <div class="badge-row">
        <span class="pill">${htmlEscape(slot.doctor?.specialization || 'تخصص')}</span>
        <span class="pill ${slot.status === 'available' ? 'success' : 'danger'}">${slot.status === 'available' ? 'متاح' : 'غير متاح'}</span>
      </div>
      <div class="item-meta">الموعد: ${htmlEscape(formatDateTime(slot.start_time))}</div>
      <div class="item-meta">الغرفة: ${htmlEscape(slot.room || slot.doctor?.room_name || 'غير محددة')}</div>
      <div class="actions-row">
        <button class="primary-btn" ${slot.status !== 'available' ? 'disabled' : ''} onclick="bookSlot(${slot.id})">حجز الموعد</button>
      </div>
    </article>
  `).join('') : '<div class="empty-hint">لا توجد مواعيد متاحة حالياً.</div>';
}

function renderAppointments() {
  const list = el('appointments-list');
  list.innerHTML = state.appointments.length ? state.appointments.map((appointment) => `
    <article class="item-card">
      <h4>${htmlEscape(doctorLabel(appointment.doctor || appointment.slot?.doctor || {}))}</h4>
      <div class="badge-row">
        <span class="pill ${appointment.status === 'confirmed' ? 'success' : 'warning'}">${htmlEscape(appointment.status || 'confirmed')}</span>
      </div>
      <div class="item-meta">الموعد: ${htmlEscape(formatDateTime(appointment.slot?.start_time || appointment.booked_at))}</div>
      <div class="item-meta">السبب: ${htmlEscape(appointment.reason || 'كشف عام')}</div>
      <div class="item-meta">الأعراض: ${htmlEscape(appointment.symptoms || 'غير مذكورة')}</div>
      <div class="actions-row">
        <button class="danger-btn" ${appointment.status !== 'confirmed' ? 'disabled' : ''} onclick="cancelAppointment(${appointment.id})">إلغاء الحجز</button>
      </div>
    </article>
  `).join('') : '<div class="empty-hint">لا توجد مواعيد مسجلة بعد.</div>';

  const upcoming = state.appointments.filter((a) => a.status === 'confirmed').sort((a, b) => new Date(a.slot?.start_time || 0) - new Date(b.slot?.start_time || 0));
  el('metric-upcoming').textContent = String(upcoming.length);
  el('next-appointment-content').innerHTML = upcoming.length ? `
    <div class="item-card">
      <h4>${htmlEscape(doctorLabel(upcoming[0].doctor || upcoming[0].slot?.doctor || {}))}</h4>
      <div class="item-meta">${htmlEscape(formatDateTime(upcoming[0].slot?.start_time))}</div>
      <div class="item-meta">${htmlEscape(upcoming[0].reason || 'كشف')}</div>
    </div>
  ` : '<div class="empty-hint">لا يوجد موعد محجوز حاليًا.</div>';
}

function renderMedical() {
  const summary = el('medical-summary');
  const file = state.medicalFile;
  summary.innerHTML = file ? `
    <div class="kv-list">
      <div class="kv-row"><span>الأمراض المزمنة</span><strong>${htmlEscape(file.chronic_diseases || 'لا يوجد')}</strong></div>
      <div class="kv-row"><span>الحساسية</span><strong>${htmlEscape(file.allergies || 'لا يوجد')}</strong></div>
      <div class="kv-row"><span>التاريخ الجراحي</span><strong>${htmlEscape(file.surgical_history || 'لا يوجد')}</strong></div>
      <div class="kv-row"><span>الأدوية الحالية</span><strong>${htmlEscape(file.current_medications || 'لا يوجد')}</strong></div>
      <div class="kv-row"><span>رقم التأمين</span><strong>${htmlEscape(file.insurance_number || 'غير متاح')}</strong></div>
    </div>
  ` : '<div class="empty-hint">لم يتم العثور على ملف طبي.</div>';

  el('visits-list').innerHTML = state.visits.length ? state.visits.map((visit) => `
    <article class="item-card">
      <h4>${htmlEscape(formatDateTime(visit.visit_date))}</h4>
      <div class="item-meta">الشكوى: ${htmlEscape(visit.chief_complaint || 'غير محددة')}</div>
      <div class="item-meta">التشخيص: ${htmlEscape(visit.diagnosis || 'غير محدد')}</div>
      <div class="item-meta">الخطة العلاجية: ${htmlEscape(visit.treatment_plan || 'غير متاحة')}</div>
      <div class="item-meta">الأدوية: ${htmlEscape(visit.prescribed_medications || 'غير متاحة')}</div>
      <div class="item-meta">ملاحظات: ${htmlEscape(visit.notes || 'لا يوجد')}</div>
    </article>
  `).join('') : '<div class="empty-hint">لا توجد زيارات مسجلة.</div>';

  el('documents-list').innerHTML = state.documents.length ? state.documents.map((doc) => `
    <article class="item-card">
      <h4>${htmlEscape(doc.title || 'مستند طبي')}</h4>
      <div class="item-meta">النوع: ${htmlEscape(doc.doc_type || 'other')}</div>
      <div class="item-meta">تاريخ الرفع: ${htmlEscape(formatDateTime(doc.uploaded_at))}</div>
      <div class="item-meta">ملاحظات: ${htmlEscape(doc.notes || 'لا يوجد')}</div>
    </article>
  `).join('') : '<div class="empty-hint">لا توجد ملفات مرفوعة.</div>';

  el('metric-visits').textContent = String(state.visits.length);
  el('metric-docs').textContent = String(state.documents.length);
}

function renderProfile() {
  const profile = el('profile-data');
  const user = state.user || {};
  const patient = user.patient_profile || {};
  profile.innerHTML = `
    <div class="kv-list">
      <div class="kv-row"><span>اسم المستخدم</span><strong>${htmlEscape(user.username || 'غير متاح')}</strong></div>
      <div class="kv-row"><span>الاسم</span><strong>${htmlEscape(([user.first_name, user.last_name].filter(Boolean).join(' ') || '-'))}</strong></div>
      <div class="kv-row"><span>البريد</span><strong>${htmlEscape(user.email || '-')}</strong></div>
      <div class="kv-row"><span>الموبايل</span><strong>${htmlEscape(user.phone_number || '-')}</strong></div>
      <div class="kv-row"><span>النوع</span><strong>${htmlEscape(user.gender || '-')}</strong></div>
      <div class="kv-row"><span>العمر</span><strong>${htmlEscape(String(patient.age || '-'))}</strong></div>
      <div class="kv-row"><span>فصيلة الدم</span><strong>${htmlEscape(patient.blood_type || '-')}</strong></div>
      <div class="kv-row"><span>شركة التأمين</span><strong>${htmlEscape(patient.insurance_provider || '-')}</strong></div>
    </div>
  `;
}

function renderHomeMetrics() {
  el('metric-doctors').textContent = String(state.doctors.length);
}

function renderAll() {
  renderAuthState();
  if (!state.user) return;
  renderHomeMetrics();
  renderDoctors();
  renderSlots();
  renderAppointments();
  renderMedical();
  renderProfile();
}

async function loadData() {
  if (!state.user) return;
  if (state.demoMode) {
    const demo = getDemoState();
    state.doctors = demo.doctors;
    state.slots = demo.slots;
    state.appointments = demo.appointments;
    state.medicalFile = demo.medicalFile;
    state.visits = demo.visits;
    state.documents = demo.documents;
    renderAll();
    return;
  }
  try {
    const [doctors, slots, appointments, medicalFile] = await Promise.all([
      apiRequest('/auth/doctors/'),
      apiRequest('/slots/'),
      apiRequest('/appointments/'),
      apiRequest('/medical-files/mine/'),
    ]);
    state.doctors = Array.isArray(doctors) ? doctors : doctors.results || [];
    state.slots = Array.isArray(slots) ? slots : slots.results || [];
    state.appointments = Array.isArray(appointments) ? appointments : appointments.results || [];
    state.medicalFile = medicalFile;
    state.visits = medicalFile?.visits || [];
    state.documents = medicalFile?.documents || [];
    renderAll();
  } catch (error) {
    showToast(`تعذر تحميل البيانات: ${error.message}`, 'error');
  }
}

async function login() {
  const username = el('login-username').value.trim();
  const password = el('login-password').value;
  if (!username || !password) {
    showToast('أدخلي اسم المستخدم وكلمة المرور', 'error');
    return;
  }
  try {
    el('auth-status').textContent = 'جارٍ تسجيل الدخول...';
    const data = await apiRequest('/auth/login/', { method: 'POST', body: { username, password } });
    persistSession({ access: data.access, refresh: data.refresh, user: data.user, demoMode: false });
    el('auth-status').textContent = 'تم تسجيل الدخول بنجاح.';
    renderAll();
    await loadData();
    showToast('تم تسجيل الدخول', 'success');
  } catch (error) {
    el('auth-status').textContent = `فشل الدخول: ${error.message}`;
    showToast(`فشل الدخول: ${error.message}`, 'error');
  }
}

async function register() {
  const payload = {
    username: el('reg-username').value.trim(),
    password: el('reg-password').value,
    first_name: el('reg-firstname').value.trim(),
    last_name: el('reg-lastname').value.trim(),
    email: el('reg-email').value.trim(),
    phone_number: el('reg-phone').value.trim(),
    gender: el('reg-gender').value.trim(),
    address: el('reg-address').value.trim(),
    age: Number(el('reg-age').value || '18'),
    blood_type: el('reg-blood').value.trim(),
  };
  if (!payload.username || !payload.password) {
    showToast('اسم المستخدم وكلمة المرور مطلوبان', 'error');
    return;
  }
  try {
    await apiRequest('/auth/register/', { method: 'POST', body: payload });
    showToast('تم إنشاء الحساب. سيتم تسجيل الدخول الآن.', 'success');
    el('login-username').value = payload.username;
    el('login-password').value = payload.password;
    await login();
  } catch (error) {
    showToast(`تعذر إنشاء الحساب: ${error.message}`, 'error');
  }
}

function startDemoMode() {
  const demoUser = {
    username: 'patient_demo',
    first_name: 'بسنت',
    last_name: 'أحمد',
    email: 'patient.demo@example.com',
    role: 'patient',
    phone_number: '01000000000',
    gender: 'female',
    address: 'Cairo, Egypt',
    patient_profile: {
      age: 22,
      blood_type: 'A+',
      insurance_provider: 'Demo Insurance',
    },
  };
  persistSession({ access: 'demo-token', refresh: 'demo-refresh', user: demoUser, demoMode: true });
  renderAll();
  loadData();
  showToast('تم تشغيل وضع العرض التقديمي', 'success');
}

window.bookSlot = async function bookSlot(slotId) {
  if (state.demoMode) {
    const demo = getDemoState();
    const slot = demo.slots.find((item) => item.id === slotId);
    if (!slot || slot.status !== 'available') {
      showToast('هذا الموعد غير متاح', 'error');
      return;
    }
    slot.status = 'booked';
    demo.appointments.unshift({
      id: Date.now(),
      doctor: slot.doctor,
      slot,
      status: 'confirmed',
      reason: 'كشف عام',
      symptoms: 'عرض توضيحي',
      booked_at: new Date().toISOString(),
    });
    saveDemoState(demo);
    await loadData();
    showToast('تم حجز الموعد في وضع العرض', 'success');
    return;
  }
  try {
    await apiRequest('/appointments/book/', { method: 'POST', body: { slot_id: slotId, reason: 'Booked from mobile PWA' } });
    await loadData();
    showToast('تم حجز الموعد بنجاح', 'success');
  } catch (error) {
    showToast(`تعذر الحجز: ${error.message}`, 'error');
  }
};

window.cancelAppointment = async function cancelAppointment(appointmentId) {
  if (state.demoMode) {
    const demo = getDemoState();
    const appointment = demo.appointments.find((item) => item.id === appointmentId);
    if (!appointment) return;
    appointment.status = 'canceled';
    const slot = demo.slots.find((item) => item.id === appointment.slot?.id);
    if (slot) slot.status = 'available';
    saveDemoState(demo);
    await loadData();
    showToast('تم إلغاء الحجز في وضع العرض', 'success');
    return;
  }
  try {
    await apiRequest(`/appointments/${appointmentId}/cancel/`, { method: 'POST', body: { cancel_reason: 'Canceled from mobile PWA' } });
    await loadData();
    showToast('تم إلغاء الموعد', 'success');
  } catch (error) {
    showToast(`تعذر الإلغاء: ${error.message}`, 'error');
  }
};

async function runChatbot() {
  const message = el('chatbot-message').value.trim();
  if (!message) {
    showToast('اكتبي الأعراض أولاً', 'error');
    return;
  }
  let result;
  if (state.demoMode) {
    result = triageMessage(message);
  } else {
    try {
      result = await apiRequest('/chatbot/triage/', { method: 'POST', body: { message } });
    } catch (error) {
      showToast(`تعذر الوصول للشات بوت: ${error.message}`, 'error');
      return;
    }
  }
  const urgencyClass = result.urgency === 'high' ? 'danger' : result.urgency === 'medium' ? 'warning' : 'success';
  el('chatbot-result').innerHTML = `
    <div class="item-card">
      <div class="badge-row">
        <span class="pill ${urgencyClass}">درجة الأهمية: ${htmlEscape(result.urgency || 'unknown')}</span>
        <span class="pill">التخصص المقترح: ${htmlEscape(result.recommended_specialty || 'General Practice')}</span>
      </div>
      <div class="item-meta">${htmlEscape(result.guidance || '')}</div>
      <div class="item-meta">${htmlEscape(result.disclaimer || '')}</div>
    </div>
  `;
}

function activateTab(tabName) {
  document.querySelectorAll('.tab').forEach((tab) => tab.classList.toggle('active', tab.dataset.tab === tabName));
  document.querySelectorAll('.tab-panel').forEach((panel) => panel.classList.toggle('active', panel.id === `tab-${tabName}`));
}

function saveApiBaseUrl() {
  state.apiBaseUrl = normalizeBaseUrl(el('api-base-url').value);
  localStorage.setItem(storageKeys.apiBaseUrl, state.apiBaseUrl);
  renderAuthState();
  showToast('تم حفظ رابط السيرفر', 'success');
}

function resetApiBaseUrl() {
  state.apiBaseUrl = defaultApiBaseUrl;
  localStorage.setItem(storageKeys.apiBaseUrl, state.apiBaseUrl);
  el('api-base-url').value = state.apiBaseUrl;
  renderAuthState();
  showToast('تمت إعادة الرابط الافتراضي', 'success');
}

function signOut() {
  clearSession();
  renderAuthState();
  showToast('تم تسجيل الخروج', 'success');
}

function bindEvents() {
  el('login-btn').addEventListener('click', login);
  el('register-btn').addEventListener('click', register);
  el('demo-btn').addEventListener('click', startDemoMode);
  el('chatbot-send-btn').addEventListener('click', runChatbot);
  el('save-url-btn').addEventListener('click', saveApiBaseUrl);
  el('reset-url-btn').addEventListener('click', resetApiBaseUrl);
  el('reload-all-btn').addEventListener('click', loadData);
  el('refresh-doctors-btn').addEventListener('click', loadData);
  el('refresh-slots-btn').addEventListener('click', renderSlots);
  el('refresh-appointments-btn').addEventListener('click', loadData);
  el('refresh-medical-btn').addEventListener('click', loadData);
  el('signout-btn').addEventListener('click', signOut);
  el('slot-filter-doctor').addEventListener('change', renderSlots);
  document.querySelectorAll('.tab').forEach((tab) => tab.addEventListener('click', () => activateTab(tab.dataset.tab)));
  document.querySelectorAll('.jump-btn').forEach((btn) => btn.addEventListener('click', () => activateTab(btn.dataset.jump)));

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    state.installPrompt = event;
    el('install-btn').classList.remove('hidden');
  });

  el('install-btn').addEventListener('click', async () => {
    if (state.installPrompt) {
      state.installPrompt.prompt();
      await state.installPrompt.userChoice;
      state.installPrompt = null;
      el('install-btn').classList.add('hidden');
      return;
    }
    showToast('يمكنك تثبيت التطبيق من خيارات المتصفح على الهاتف.', 'success');
  });
}

function initServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./service-worker.js').catch(() => {});
  }
}

function init() {
  bindEvents();
  renderAuthState();
  initServiceWorker();
  if (state.user) {
    loadData();
  }
}

document.addEventListener('DOMContentLoaded', init);
