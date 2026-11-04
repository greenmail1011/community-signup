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

  // 管理者 Google 登入的用戶端 ID（Google Cloud 專案 hsinchu-drone）。誰能當管理者在 Code.gs 的 ADMIN_EMAILS 設定。
  GOOGLE_CLIENT_ID: "944428960229-mr558fj6iq5vkccft3mpnm5uf484m6cb.apps.googleusercontent.com",

  // 各社區活動資料：報名頁會「立刻」用這裡的資料顯示，不必等 Google 回應（約 2～5 秒）。
  // 背景仍會向 Google 試算表確認；試算表「社區設定」改了時間地點、截止或額滿，載入後會自動更新。
  // 新增社區時兩邊都加，網頁才會一打開就出現。line 是 LINE 群組邀請連結（試算表沒填時用這裡的）；short 是對外縮網址（PicSee，指向 代碼/ 分享網址），後台會顯示並用在報名訊息與 QR。
  COMMUNITIES: {
    beimen:  { name: "北門社區發展協會", time: "11/6（五）上午 9:30–10:30",   place: "新竹市經國路二段159巷24號", line: "https://line.me/ti/g/8ERJA5ttfh", short: "https://pse.is/9u2v3j" },
    jiugang: { name: "舊港社區發展協會", time: "11/19（四）上午 10:00–11:00", place: "新竹市北區舊港里舊港54號",  line: "https://line.me/ti/g/uSD9HVwXPq", short: "https://pse.is/9u32f3" }
  }
};
// 各社區海報：放在同一層、檔名 poster-社區代碼.jpg（例如 poster-beimen.jpg），沒有就不顯示。
