// ===== 報名系統設定（報名頁、後台共用；改這裡就好） =====
window.APP_CONFIG = {
  // Google Apps Script「網頁應用程式網址」（…/exec 結尾）。部署完貼進引號中間。
  API_URL: "https://script.google.com/macros/s/AKfycbztSpVfSXbLdHdzgAc5ja1SuEqCwiPD7xJvc5qI09tBF5g6QOyFtTIkivUhDazf-g9xOw/exec",

  // 報名頁大標題與副標
  EVENT_TITLE: "青銀飛行趣",
  EVENT_SUBTITLE: "青銀無人機體驗課程｜免費參加",

  // 主辦單位與聯絡電話（顯示在頁尾；報名者有問題可以打）
  ORG_NAME: "新竹市無人機創新科技協會",
  ORG_PHONE: "03-540-3463",

  // 後台「複製 DM」的宣傳文字（一鍵貼到 LINE／FB）。可直接改文字；這些代號會自動換成各社區資料：
  // {社區} {時間} {地點} {報名網址}（有縮網址用縮網址）{電話} {主辦}
  DM_TEMPLATE: [
    "🚁【青銀飛行趣｜青銀無人機體驗課程】免費參加！",
    "誰說無人機只有年輕人會玩？這次換阿公、阿嬤也來當飛行員！",
    "{主辦} ✕ {社區}",
    "",
    "📅 時間：{時間}",
    "📍 地點：{地點}",
    "💰 費用：免費",
    "",
    "✨ 活動內容",
    "・第一次飛行：親手操控足球無人機，體驗起飛、懸停與移動",
    "・趣味飛行挑戰：完成簡單任務，穩穩飛、輕鬆過關",
    "・穿越環射門：操控足球無人機，穿越圓環完成挑戰",
    "",
    "👍 零經驗也能玩！動動手・動動腦・交朋友",
    "促進手眼協調、青銀同樂、社區交流更有趣",
    "",
    "📝 線上報名（填姓名、年齡、手機就完成）",
    "👉 {報名網址}",
    "",
    "☎️ 報名問題請來電：{電話}",
    "活動企劃｜{主辦}"
  ],

  // 管理者 Google 登入的用戶端 ID（Google Cloud 專案 hsinchu-drone）。誰能當管理者在 Code.gs 的 ADMIN_EMAILS 設定。
  GOOGLE_CLIENT_ID: "944428960229-mr558fj6iq5vkccft3mpnm5uf484m6cb.apps.googleusercontent.com",

  // 各社區活動資料：報名頁會「立刻」用這裡的資料顯示，不必等 Google 回應（約 2～5 秒）。
  // 背景仍會向 Google 試算表確認；試算表「社區設定」改了時間地點、截止或額滿，載入後會自動更新。
  // 新增社區時兩邊都加，網頁才會一打開就出現。line 是 LINE 群組邀請連結（試算表沒填時用這裡的）；short 是對外縮網址（PicSee，指向 代碼/ 分享網址），後台會顯示並用在報名訊息與 QR。
  COMMUNITIES: {
    beimen:  { name: "北門社區發展協會", time: "11/6（五）上午 9:30–10:30",   place: "新竹市經國路二段159巷24號", line: "https://line.me/ti/g/8ERJA5ttfh", short: "https://pse.is/9u2v3j" },
    jiugang: { name: "舊港社區發展協會", time: "11/19（四）上午 10:00–11:00", place: "新竹市北區舊港里舊港54號",  line: "https://line.me/ti/g/uSD9HVwXPq", short: "https://pse.is/9u3ck2" }
  }
};
// 各社區海報：放在同一層、檔名 poster-社區代碼.jpg（例如 poster-beimen.jpg），沒有就不顯示。
