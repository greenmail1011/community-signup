#!/usr/bin/env node
/*
 * 產生各社區的「紙本報名表」PDF（給不會用手機報名的長輩，工作人員代填後再登錄）
 *
 * 讀 config.js 的 COMMUNITIES，每個社區產生 paper-代碼.pdf（A4 直式）：
 *   活動資訊、大格子名單（姓名／性別／年齡／手機／已登錄）、線上報名 QR、體驗課程 LINE 群組 QR
 *
 * 用法（repo 根目錄）：node tools/make_paper.js
 * 需要：playwright（Chromium）與 Noto Sans CJK TC 字型（雲端工作環境都有）
 * 新增社區或改時間地點、縮網址、LINE 群組後，跑一次再 push。
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { chromium } = require("playwright");

const ROOT = path.resolve(__dirname, "..");
const BASE_URL = "https://greenmail1011.github.io/community-signup/";
const ROWS = 10;          // 第 1 頁格數（上面有活動資訊與 QR）
const MORE_PAGES = 2;     // 第 2 頁之後：只有接續編號的名單，共幾頁
const MORE_ROWS = 18;     // 第 2 頁之後每頁格數

function readConfig() {
  const ctx = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, "config.js"), "utf8"), ctx);
  return ctx.window.APP_CONFIG;
}

const esc = s => String(s || "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

function page(cfg, code, c) {
  // 社區可以有自己的 title／subtitle（例如師訓）；| 只是網頁上分色用
  cfg = Object.assign({}, cfg, { EVENT_TITLE: (c.title || cfg.EVENT_TITLE || "").replace("|", ""), EVENT_SUBTITLE: c.subtitle || cfg.EVENT_SUBTITLE });
  const signup = c.short || BASE_URL + code + "/";
  const total = 1 + MORE_PAGES;
  const rowsHtml = (from, n) => Array.from({ length: n }, (_, i) => `
    <tr><td class="no">${from + i}</td><td></td>
      <td class="sex"><span class="box"></span>男　<span class="box"></span>女</td>
      <td></td><td></td><td class="done"></td></tr>`).join("");
  const head = `<colgroup><col style="width:8%"><col style="width:22%"><col style="width:19%"><col style="width:10%"><col style="width:29%"><col style="width:12%"></colgroup>
  <tr><th>編號</th><th>姓名</th><th>性別</th><th>年齡</th><th>手機</th><th>已登錄<div style="font-size:8.5pt;font-weight:700">工作人員勾</div></th></tr>`;
  const rows = rowsHtml(1, ROWS);
  // 第 2 頁之後：只有一行小字（社區＋頁數，避免紙張混在一起）＋接續編號的名單
  let more = "";
  for (let pg = 2, start = ROWS + 1; pg <= total; pg++, start += MORE_ROWS) {
    more += `<section class="more"><div class="pghead"><span>${esc(c.name)}｜${esc(cfg.EVENT_TITLE)} 紙本報名表（續）</span><span>第 ${pg}／${total} 頁</span></div>
<table>${head}${rowsHtml(start, MORE_ROWS)}</table></section>`;
  }
  return `<!doctype html><html lang="zh-Hant-TW"><head><meta charset="utf-8">
<style>
@page { size: A4; margin: 12mm 12mm 10mm; }
* { box-sizing: border-box; }
body { margin: 0; font-family: "Noto Sans CJK TC", "Noto Sans TC", sans-serif; color: #0E2A5E; }
.top { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 3px solid #1F5FD1; padding-bottom: 6px; }
.org { font-size: 12pt; font-weight: 700; color: #3A4D73; }
h1 { margin: 2px 0 0; font-size: 28pt; font-weight: 900; letter-spacing: .04em; }
h1 small { font-size: 16pt; font-weight: 700; margin-left: 8px; }
.free { background: #F26B0F; color: #fff; font-weight: 900; font-size: 14pt; padding: 4px 14px; border-radius: 999px; white-space: nowrap; }
.info { margin: 6px 0 0; display: grid; grid-template-columns: auto 1fr; gap: 2px 10px; font-size: 14pt; }
.info dt { font-weight: 900; } .info dd { margin: 0; font-weight: 700; }
.note { margin: 8px 0 6px; font-size: 11.5pt; color: #3A4D73; }
table { width: 100%; border-collapse: collapse; table-layout: fixed; }
th { background: #EAF4FF; font-size: 13pt; padding: 4px 4px; border: 1.5px solid #0E2A5E; }
td { border: 1.5px solid #0E2A5E; height: 14mm; font-size: 13pt; text-align: center; }
td.no { font-weight: 900; color: #3A4D73; }
td.sex { font-size: 13pt; white-space: nowrap; }
.box { display: inline-block; width: 4.5mm; height: 4.5mm; border: 1.5px solid #0E2A5E; vertical-align: -0.6mm; margin-left: 4px; }
td.done { background: #F6F8FB; }

.bottom { margin-top: 6px; display: flex; gap: 14px; align-items: stretch; }
.qr { display: flex; gap: 10px; align-items: center; border: 1.5px solid #C9DCF7; border-radius: 10px; padding: 8px 10px; flex: 1; }
.qr svg { width: 24mm; height: 24mm; flex: 0 0 24mm; }
.qr b { display: block; font-size: 13pt; }
.qr span { font-size: 10pt; color: #3A4D73; word-break: break-all; }
.more { break-before: page; }
.pghead { display: flex; justify-content: space-between; font-size: 11pt; font-weight: 700; color: #3A4D73; border-bottom: 2px solid #1F5FD1; padding-bottom: 4px; margin-bottom: 6px; }
.foot { margin-top: 6px; display: flex; justify-content: space-between; font-size: 10.5pt; color: #3A4D73; font-weight: 700; }
</style></head><body>
<div class="top">
  <div><div class="org">${esc(cfg.ORG_NAME)} × ${esc(c.name)}</div>
  <h1>${esc(cfg.EVENT_TITLE)}<small>紙本報名表</small></h1></div>
  <div class="free">免費參加</div>
</div>
<dl class="info">
  <dt>課程</dt><dd>${esc(cfg.EVENT_SUBTITLE)}</dd>
  <dt>社區</dt><dd>${esc(c.name)}</dd>
  <dt>時間</dt><dd>${esc(c.time)}</dd>
  <dt>地點</dt><dd>${esc(c.place)}</dd>
</dl>
<p class="note">請用正楷填寫，填好交給社區或協會工作人員，我們會幫您完成線上登記。手機請寫 09 開頭 10 碼。</p>
<table>${head}${rows}</table>
<div class="bottom">
  <div class="qr"><div id="q1"></div><div><b>手機掃描線上報名</b><span>${esc(signup)}</span></div></div>
  ${c.line ? `<div class="qr"><div id="q2"></div><div><b>加入體驗課程 LINE 群組</b><span>活動通知、臨時異動都會在群組公告</span></div></div>` : ""}
</div>
<div class="foot"><span>報名問題請來電：${esc(cfg.ORG_PHONE)}</span><span>第 1／${total} 頁</span></div>
${more}
<script>${fs.readFileSync(path.join(__dirname, "vendor", "qrcode-generator-1.4.4.js"), "utf8")}</script>
<script>
function qr(id, text){ var el=document.getElementById(id); if(!el) return; var q=qrcode(0,"M"); q.addData(text); q.make(); el.innerHTML=q.createSvgTag({cellSize:4,margin:0,scalable:true}); }
qr("q1", ${JSON.stringify(signup)});
qr("q2", ${JSON.stringify(c.line || "")});
</script>
</body></html>`;
}

(async () => {
  const cfg = readConfig();
  const browser = await chromium.launch();
  const p = await browser.newPage();
  for (const [code, c] of Object.entries(cfg.COMMUNITIES || {})) {
    await p.setContent(page(cfg, code, c), { waitUntil: "load" });
    const out = path.join(ROOT, "paper-" + code + ".pdf");
    await p.pdf({ path: out, format: "A4", printBackground: true, preferCSSPageSize: true });
    console.log("ok", path.basename(out));
  }
  await browser.close();
})();
