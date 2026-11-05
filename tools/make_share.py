#!/usr/bin/env python3
"""
產生各社區的「分享縮圖」與「分享網址」頁面（給 LINE／Facebook 預覽用）。

讀 config.js 的 COMMUNITIES，每個社區產生：
  og-代碼.jpg       1200x630 分享縮圖（海報上半部＋活動資訊）
  代碼/index.html   分享網址 https://…/community-signup/代碼/
                    內含縮圖、標題、說明（給 LINE／FB 抓），一般人打開會自動進到 ../?c=代碼 報名頁
另外產生 og-default.jpg（沒帶社區的通用縮圖）。

用法：在 repo 根目錄執行  python3 tools/make_share.py
新增社區後（config.js 加一筆、放 poster-代碼.jpg）跑一次再 push。
"""
import html, json, os, re
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE_URL = "https://greenmail1011.github.io/community-signup/"
FONT_BLACK = "/usr/share/fonts/opentype/noto/NotoSansCJK-Black.ttc"
FONT_BOLD = "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc"


SKY, INK, INK2, RING, WHITE = "#EAF4FF", "#0E2A5E", "#3A4D73", "#F26B0F", "#FFFFFF"


def font(path, size):
    # 在 .ttc 裡找 Traditional Chinese 的字面
    for i in range(10):
        try:
            f = ImageFont.truetype(path, size, index=i)
        except OSError:
            break
        if "TC" in " ".join(f.getname()):
            return f
    return ImageFont.truetype(path, size)


def read_config():
    src = open(os.path.join(ROOT, "config.js"), encoding="utf-8").read()
    get = lambda k: re.search(k + r'\s*:\s*"([^"]*)"', src).group(1)
    block = re.search(r"COMMUNITIES\s*:\s*\{(.*?)\n\s*\}\s*\n", src, re.S).group(1)
    comms = {}
    for m in re.finditer(r"(\w+)\s*:\s*\{([^}]*)\}", block):
        code, body = m.group(1), m.group(2)
        d = dict(re.findall(r'(\w+)\s*:\s*"([^"]*)"', body))
        comms[code] = d
    return {"title": get("EVENT_TITLE"), "subtitle": get("EVENT_SUBTITLE"), "org": get("ORG_NAME")}, comms


def wrap(draw, text, f, width):
    lines, cur = [], ""
    for ch in text:
        if draw.textlength(cur + ch, font=f) > width and cur:
            lines.append(cur); cur = ch
        else:
            cur += ch
    if cur: lines.append(cur)
    return lines


def make_image(out, ev, c=None, poster=None):
    W, H = 1200, 630
    im = Image.new("RGB", (W, H), SKY)
    d = ImageDraw.Draw(im)
    left = 560
    if poster and os.path.exists(poster):
        p = Image.open(poster).convert("RGB")
        # 背景：海報放大模糊
        bg = p.resize((left, int(p.height * left / p.width))).crop((0, 0, left, H)).filter(ImageFilter.GaussianBlur(18))
        im.paste(bg, (0, 0))
        # 前景：海報上半部完整寬度
        pw = left - 40
        ph = int(p.height * pw / p.width)
        fg = p.resize((pw, ph)).crop((0, 0, pw, H - 40))
        im.paste(fg, (20, 20))
    else:
        left = 0
    x = left + 48
    tw = W - x - 48
    d.rectangle((0, 0, W, 10), fill="#1F5FD1")
    y = 58
    d.text((x, y), ev["org"], font=font(FONT_BOLD, 26), fill=INK2); y += 52
    d.text((x, y), ev["title"], font=font(FONT_BLACK, 92), fill=INK); y += 120
    d.text((x, y), ev["subtitle"], font=font(FONT_BOLD, 30), fill=INK2); y += 62
    if c:
        f = font(FONT_BLACK, 38)
        for line in wrap(d, c["name"], f, tw):
            d.text((x, y), line, font=f, fill=INK); y += 52
        y += 6
        f2 = font(FONT_BOLD, 28)
        for line in wrap(d, "時間：" + c.get("time", ""), f2, tw) + wrap(d, "地點：" + c.get("place", ""), f2, tw):
            d.text((x, y), line, font=f2, fill=INK); y += 40
    # 橘色按鈕
    fb = font(FONT_BLACK, 34)
    label = "點我線上報名"
    bw = d.textlength(label, font=fb) + 64
    by = H - 58 - 72
    d.rounded_rectangle((x, by, x + bw, by + 72), radius=36, fill=RING)
    d.text((x + 32, by + 12), label, font=fb, fill=WHITE)
    im.save(out, "JPEG", quality=86, optimize=True, progressive=True)


STUB = """<!doctype html>
<html lang="zh-Hant-TW">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{title}</title>
<meta name="description" content="{desc}">
<link rel="canonical" href="{url}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="{org}">
<meta property="og:locale" content="zh_TW">
<meta property="og:url" content="{url}">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:image" content="{img}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="{title}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{title}">
<meta name="twitter:description" content="{desc}">
<meta name="twitter:image" content="{img}">
<script>location.replace("../?c={code}" + location.hash);</script>
<style>body{{margin:0;background:#EAF4FF;color:#0E2A5E;font:20px/1.6 system-ui,"PingFang TC","Microsoft JhengHei",sans-serif;display:grid;place-items:center;min-height:100vh;text-align:center}}a{{color:#C24F00;font-weight:700}}</style>
</head>
<body>
<p>正在開啟報名頁…<br><a href="../?c={code}">沒有自動跳轉請點這裡</a></p>
</body>
</html>
"""


def make_admin_image(out, ev, posters):
    """報名後台的分享縮圖：左邊各社區海報疊放，右邊「報名後台」"""
    W, H = 1200, 630
    im = Image.new("RGB", (W, H), "#0E2A5E")
    d = ImageDraw.Draw(im)
    left = 560
    ps = [Image.open(p).convert("RGB") for p in posters if os.path.exists(p)][:3]
    if ps:
        bg = ps[0].resize((left, int(ps[0].height * left / ps[0].width))).crop((0, 0, left, H)).filter(ImageFilter.GaussianBlur(20))
        im.paste(bg, (0, 0))
        pw = 360 if len(ps) > 1 else 420
        step = (left - 40 - pw) // max(1, len(ps) - 1) if len(ps) > 1 else 0
        for i, p in enumerate(ps):
            t = p.resize((pw, int(p.height * pw / p.width)))
            x0 = 20 + i * step
            y0 = 36 + i * 64
            im.paste(t.crop((0, 0, t.width, min(t.height, H - y0 - 20))), (x0, y0))
    x = left + 48
    d.rectangle((0, 0, W, 10), fill=RING)
    y = 70
    d.text((x, y), ev["org"], font=font(FONT_BOLD, 26), fill="#C9DCF7"); y += 56
    d.text((x, y), ev["title"], font=font(FONT_BLACK, 84), fill=WHITE); y += 112
    d.text((x, y), "報名後台", font=font(FONT_BLACK, 64), fill="#FFD84A"); y += 96
    f2 = font(FONT_BOLD, 28)
    for line in ["看各社區報名名單與人數", "複製報名連結、縮網址、DM 圖"]:
        d.text((x, y), "・" + line, font=f2, fill=WHITE); y += 42
    fb = font(FONT_BLACK, 32)
    label = "協會成員 Google 登入"
    bw = d.textlength(label, font=fb) + 64
    by = H - 58 - 70
    d.rounded_rectangle((x, by, x + bw, by + 70), radius=35, fill=RING)
    d.text((x + 32, by + 12), label, font=fb, fill=WHITE)
    im.save(out, "JPEG", quality=86, optimize=True, progressive=True)


def main():
    ev, comms = read_config()
    first_poster = None
    for code, c in comms.items():
        poster = os.path.join(ROOT, "poster-%s.jpg" % code)
        first_poster = first_poster or (poster if os.path.exists(poster) else None)
        # 社區可以有自己的 title／subtitle（例如師訓），蓋過 EVENT_TITLE；title 裡的 | 只是網頁上分色用
        ev_c = dict(ev, title=(c.get("title") or ev["title"]).replace("|", ""), subtitle=c.get("subtitle") or ev["subtitle"])
        make_image(os.path.join(ROOT, "og-%s.jpg" % code), ev_c, c, poster)
        os.makedirs(os.path.join(ROOT, code), exist_ok=True)
        title = "%s報名｜%s" % (ev_c["title"], c["name"])
        desc = "%s。時間：%s；地點：%s。線上填姓名、年齡、手機就完成報名。" % (ev_c["subtitle"], c.get("time", ""), c.get("place", ""))
        page = STUB.format(title=html.escape(title), desc=html.escape(desc), org=html.escape(ev["org"]),
                           url=BASE_URL + code + "/", img=BASE_URL + "og-%s.jpg" % code, code=code)
        open(os.path.join(ROOT, code, "index.html"), "w", encoding="utf-8").write(page)
        print("ok", code)
    make_image(os.path.join(ROOT, "og-default.jpg"), ev, None, None)
    make_admin_image(os.path.join(ROOT, "og-admin.jpg"), ev, [os.path.join(ROOT, "poster-%s.jpg" % c) for c in comms])
    print("ok admin")  # 通用縮圖不放特定社區海報
    print("ok default")


if __name__ == "__main__":
    main()
