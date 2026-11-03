/**
 * 社區推廣活動報名系統｜Google 試算表後端（Apps Script）
 *
 * 報名網頁 → 這支程式 → 寫進同一份試算表的「報名總表」
 * 後台網頁 → 這支程式 → 依密碼只回傳該社區的資料（管理者密碼看全部）
 *
 * 試算表分頁：
 *   社區設定：每一列一個社區（代碼、名稱、活動時間、活動地點、LINE 群組連結、社區後台密碼、開放報名、名額上限）
 *   報名總表：所有報名（只有你看得到這份試算表；社區負責人只能透過後台網頁看自己的）
 *
 * 第一次使用：上方選單「報名系統」→「① 初始化」。詳細步驟見「使用說明.md」。
 */

const SHEET_CONF = '社區設定';
const SHEET_DATA = '報名總表';
const CONF_HEAD = ['社區代碼', '社區名稱', '活動時間', '活動地點', 'LINE群組連結', '社區後台密碼', '開放報名', '名額上限'];
const DATA_HEAD = ['報名時間', '報名編號', '社區代碼', '社區名稱', '姓名', '性別', '年齡', '手機', 'LINE名稱'];
const GENDERS = ['男', '女', '不便透露'];
const TZ = 'Asia/Taipei';
const PASS_CHARS = 'abcdefghjkmnpqrstuvwxyz23456789'; // 去掉容易看錯的 i l o 0 1
const MAX_FAILS = 30;      // 10 分鐘內密碼錯幾次就暫停登入
const FAIL_WINDOW = 600;   // 秒

/* ---------------- 試算表選單 ---------------- */

function onOpen() {
  SpreadsheetApp.getUi().createMenu('報名系統')
    .addItem('① 初始化（第一次使用）', 'setup')
    .addItem('補上缺少的社區密碼', 'fillPasswords')
    .addItem('查看管理者密碼', 'showAdminKey')
    .addItem('重設管理者密碼', 'resetAdminKey')
    .addToUi();
}

function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const props = PropertiesService.getScriptProperties();
  props.setProperty('SHEET_ID', ss.getId());

  let c = ss.getSheetByName(SHEET_CONF);
  if (!c) {
    c = ss.insertSheet(SHEET_CONF, 0);
    c.getRange(1, 1, 1, CONF_HEAD.length).setValues([CONF_HEAD]).setFontWeight('bold');
    c.setFrozenRows(1);
    c.getRange(2, 1, 2, CONF_HEAD.length).setNumberFormat('@').setValues([
      ['beimen', '北門社區發展協會', '11/6（五）上午 9:30–10:30', '新竹市經國路二段159巷24號', '', '', '是', ''],
      ['jiugang', '舊港社區發展協會', '11/19（四）上午 10:00–11:00', '新竹市北區舊港里舊港54號', '', '', '是', '']
    ]);
  }
  let d = ss.getSheetByName(SHEET_DATA);
  if (!d) {
    d = ss.insertSheet(SHEET_DATA, 1);
    d.getRange(1, 1, 1, DATA_HEAD.length).setValues([DATA_HEAD]).setFontWeight('bold');
    d.setFrozenRows(1);
  }
  if (!props.getProperty('ADMIN_KEY')) props.setProperty('ADMIN_KEY', randomKey_(10));
  fillPasswords(true);
  try {
    SpreadsheetApp.getUi().alert('初始化完成',
      '管理者密碼：' + props.getProperty('ADMIN_KEY') +
      '\n\n請記下來（之後也可以從「報名系統 → 查看管理者密碼」找到）。\n' +
      '接著到「社區設定」貼上各社區的 LINE 群組連結，再依使用說明部署成網頁應用程式。',
      SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (e) { /* 從編輯器執行時沒有 UI，忽略 */ }
}

/** 社區密碼空白的列自動產生一組（不會重複） */
function fillPasswords(silent) {
  const sh = sheet_(SHEET_CONF);
  const v = sh.getDataRange().getDisplayValues();
  const h = v[0].map(function (s) { return String(s).trim(); });
  const iCode = h.indexOf('社區代碼'), iPass = h.indexOf('社區後台密碼');
  if (iCode < 0 || iPass < 0) throw new Error('「社區設定」找不到「社區代碼」或「社區後台密碼」欄');
  const used = {};
  v.slice(1).forEach(function (r) { if (r[iPass]) used[String(r[iPass]).trim()] = 1; });
  let n = 0;
  for (let i = 1; i < v.length; i++) {
    if (String(v[i][iCode]).trim() && !String(v[i][iPass]).trim()) {
      let p; do { p = randomKey_(8); } while (used[p]);
      used[p] = 1;
      sh.getRange(i + 1, iPass + 1).setNumberFormat('@').setValue(p);
      n++;
    }
  }
  if (silent !== true) {
    try { SpreadsheetApp.getUi().alert(n ? '已補上 ' + n + ' 組社區密碼' : '每個社區都已經有密碼了'); } catch (e) {}
  }
}

function showAdminKey() {
  SpreadsheetApp.getUi().alert('管理者密碼', PropertiesService.getScriptProperties().getProperty('ADMIN_KEY') || '（尚未初始化）',
    SpreadsheetApp.getUi().ButtonSet.OK);
}

function resetAdminKey() {
  const ui = SpreadsheetApp.getUi();
  if (ui.alert('重設管理者密碼？', '舊密碼會立刻失效。', ui.ButtonSet.OK_CANCEL) !== ui.Button.OK) return;
  const k = randomKey_(10);
  PropertiesService.getScriptProperties().setProperty('ADMIN_KEY', k);
  ui.alert('新的管理者密碼', k, ui.ButtonSet.OK);
}

/* ---------------- 網頁 API ---------------- */

// GET ?action=community&c=代碼   → 單一社區的公開資訊
// GET ?action=communities        → 開放報名中的社區名稱（沒帶代碼時給報名頁選）
function doGet(e) {
  try {
    const p = (e && e.parameter) || {};
    if (p.action === 'community') {
      const c = findCommunity_(p.c);
      if (!c) return out_({ ok: false, error: 'no_community' });
      return out_({ ok: true, community: publicInfo_(c) });
    }
    if (p.action === 'communities') {
      return out_({ ok: true, communities: communities_().filter(function (c) { return c.open; })
        .map(function (c) { return { code: c.code, name: c.name, time: c.time, place: c.place }; }) });
    }
    return out_({ ok: true, msg: '社區報名系統 API 運作中' });
  } catch (err) {
    return out_({ ok: false, error: 'server', detail: String(err) });
  }
}

// POST {action:'register', ...}  → 報名
// POST {action:'data', key}      → 後台資料（依密碼決定看得到哪些社區）
function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (body.action === 'register') return out_(register_(body));
    if (body.action === 'data') return out_(data_(body));
    return out_({ ok: false, error: 'bad_action' });
  } catch (err) {
    return out_({ ok: false, error: 'server', detail: String(err) });
  }
}

function register_(b) {
  if (b.website) return { ok: true, no: 0 }; // 機器人陷阱欄位，有填就假裝成功
  const c = findCommunity_(b.c);
  if (!c) return { ok: false, error: 'no_community' };
  if (!c.open) return { ok: false, error: 'closed' };

  const name = clean_(b.name, 30);
  const gender = String(b.gender || '').trim();
  const age = Number(String(b.age || '').trim());
  const phone = String(b.phone || '').replace(/[^\d]/g, '');
  const lineName = clean_(b.lineName, 30);
  const bad = [];
  if (!name) bad.push('name');
  if (GENDERS.indexOf(gender) < 0) bad.push('gender');
  if (!(age >= 1 && age <= 120 && Math.floor(age) === age)) bad.push('age');
  if (!/^09\d{8}$/.test(phone)) bad.push('phone');
  if (b.consent !== true) bad.push('consent');
  if (bad.length) return { ok: false, error: 'invalid', fields: bad };

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sh = sheet_(SHEET_DATA);
    const rows = readRows_();
    const mine = rows.filter(function (r) { return r.code === c.code; });
    const dup = mine.filter(function (r) { return r.phone === phone && r.name === name; })[0];
    if (dup) return { ok: true, dup: true, no: dup.no, community: publicInfo_(c, mine.length) };
    if (c.cap > 0 && mine.length >= c.cap) return { ok: false, error: 'full' };

    const no = mine.reduce(function (m, r) { return Math.max(m, Number(r.no) || 0); }, 0) + 1;
    const now = Utilities.formatDate(new Date(), TZ, 'yyyy/MM/dd HH:mm:ss');
    const rec = { time: now, no: String(no), code: c.code, cname: c.name, name: name, gender: gender, age: String(age), phone: phone, lineName: lineName };
    const h = header_(sh, DATA_HEAD);
    const row = h.map(function (k) { return rec[KEYMAP[k]] !== undefined ? rec[KEYMAP[k]] : ''; });
    sh.getRange(sh.getLastRow() + 1, 1, 1, row.length).setNumberFormat('@').setValues([row]);
    return { ok: true, no: no, community: publicInfo_(c, mine.length + 1) };
  } finally {
    lock.releaseLock();
  }
}

function data_(b) {
  const cache = CacheService.getScriptCache();
  const fails = Number(cache.get('fails') || 0);
  if (fails >= MAX_FAILS) return { ok: false, error: 'locked' };

  const key = String(b.key || '').trim();
  const admin = PropertiesService.getScriptProperties().getProperty('ADMIN_KEY');
  const all = communities_();
  let role, codes;
  if (key && admin && key === admin) {
    role = 'admin';
  } else if (key) {
    codes = all.filter(function (c) { return c.pass && c.pass === key; }).map(function (c) { return c.code; });
    if (codes.length) role = 'community';
  }
  if (!role) {
    cache.put('fails', String(fails + 1), FAIL_WINDOW);
    return { ok: false, error: 'wrong_key' };
  }

  let rows = readRows_();
  let comms = all;
  if (role === 'community') {
    rows = rows.filter(function (r) { return codes.indexOf(r.code) >= 0; });
    comms = all.filter(function (c) { return codes.indexOf(c.code) >= 0; });
  }
  const count = {};
  rows.forEach(function (r) { count[r.code] = (count[r.code] || 0) + 1; });
  return {
    ok: true,
    role: role,
    communities: comms.map(function (c) {
      const o = { code: c.code, name: c.name, time: c.time, place: c.place, line: c.line, open: c.open, cap: c.cap, count: count[c.code] || 0 };
      if (role === 'admin') o.pass = c.pass; // 只有管理者拿得到社區密碼（方便轉交社區負責人）
      return o;
    }),
    rows: rows.map(function (r) {
      return { time: r.time, no: r.no, code: r.code, cname: r.cname, name: r.name, gender: r.gender, age: r.age, phone: r.phone, lineName: r.lineName };
    })
  };
}

/* ---------------- 工具 ---------------- */

const KEYMAP = { '報名時間': 'time', '報名編號': 'no', '社區代碼': 'code', '社區名稱': 'cname', '姓名': 'name', '性別': 'gender', '年齡': 'age', '手機': 'phone', 'LINE名稱': 'lineName' };

function ss_() {
  let ss = null;
  try { ss = SpreadsheetApp.getActiveSpreadsheet(); } catch (e) {}
  if (!ss) ss = SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('SHEET_ID'));
  return ss;
}

function sheet_(name) {
  const sh = ss_().getSheetByName(name);
  if (!sh) throw new Error('找不到分頁「' + name + '」，請先執行「報名系統 → ① 初始化」');
  return sh;
}

function header_(sh, fallback) {
  if (sh.getLastRow() < 1) return fallback;
  return sh.getRange(1, 1, 1, sh.getLastColumn()).getDisplayValues()[0].map(function (s) { return String(s).trim(); });
}

function communities_() {
  const v = sheet_(SHEET_CONF).getDataRange().getDisplayValues();
  const h = v[0].map(function (s) { return String(s).trim(); });
  const g = function (r, k) { const i = h.indexOf(k); return i < 0 ? '' : String(r[i]).trim(); };
  return v.slice(1).filter(function (r) { return g(r, '社區代碼'); }).map(function (r) {
    return {
      code: g(r, '社區代碼').toLowerCase(),
      name: g(r, '社區名稱') || g(r, '社區代碼'),
      time: g(r, '活動時間'),
      place: g(r, '活動地點'),
      line: g(r, 'LINE群組連結'),
      pass: g(r, '社區後台密碼'),
      open: !/^(否|不|關|關閉|停止|no|n|false|0)$/i.test(g(r, '開放報名')),
      cap: parseInt(g(r, '名額上限'), 10) || 0
    };
  });
}

function findCommunity_(code) {
  code = String(code || '').trim().toLowerCase();
  if (!code) return null;
  return communities_().filter(function (c) { return c.code === code; })[0] || null;
}

function publicInfo_(c, count) {
  if (count === undefined) count = readRows_().filter(function (r) { return r.code === c.code; }).length;
  return { code: c.code, name: c.name, time: c.time, place: c.place, line: c.line, open: c.open, full: c.cap > 0 && count >= c.cap };
}

function readRows_() {
  const sh = sheet_(SHEET_DATA);
  if (sh.getLastRow() < 2) return [];
  const v = sh.getDataRange().getDisplayValues();
  const h = v[0].map(function (s) { return String(s).trim(); });
  return v.slice(1).filter(function (r) { return r.join('').trim(); }).map(function (r) {
    const o = {};
    h.forEach(function (k, i) { if (KEYMAP[k]) o[KEYMAP[k]] = String(r[i]).trim(); });
    o.code = String(o.code || '').toLowerCase();
    if (o.phone && /^9\d{8}$/.test(o.phone)) o.phone = '0' + o.phone; // 手動輸入被當成數字時補回 0
    return o;
  });
}

function clean_(s, max) {
  return String(s || '').replace(/[\u0000-\u001f]/g, ' ').trim().replace(/^[=+\-@]+/, '').trim().slice(0, max);
}

function randomKey_(n) {
  let s = '';
  for (let i = 0; i < n; i++) s += PASS_CHARS.charAt(Math.floor(Math.random() * PASS_CHARS.length));
  return s;
}

function out_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
