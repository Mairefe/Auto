# Trend Radar — Kurulum Rehberi

Her sabah 08:00'de audio ve psikoloji trendlerini e-posta ile gönderir.

---

## 1. Gmail App Password Al

Normal Gmail şifreni kullanma — App Password gerekiyor:

1. Google hesabın → **Security** → **2-Step Verification** (açık olmalı)
2. Aşağı in → **App Passwords**
3. App adı yaz (ör: "Trend Radar") → **Create**
4. 16 haneli kodu kopyala → `.env`'e yapıştır

---

## 2. Railway'e Deploy Et

1. [railway.app](https://railway.app) → GitHub ile giriş yap
2. **New Project** → **Deploy from GitHub repo**
3. Bu klasörü bir GitHub repo'ya yükle, Railway'e bağla
4. **Variables** sekmesine git, şunları ekle:

```
ANTHROPIC_API_KEY    →  sk-ant-...
GMAIL_USER           →  senin@gmail.com
GMAIL_APP_PASSWORD   →  xxxx-xxxx-xxxx-xxxx
TARGET_EMAIL         →  senin@gmail.com
```

5. Deploy. Bitti.

---

## 3. Test Et (lokal)

```bash
npm install
cp .env.example .env
# .env dosyasını doldur
node src/test.js     # bağlantı testi
```

---

## Zamanlama

Şu an her gün UTC 05:00 = Istanbul 08:00 çalışır.
Değiştirmek için `src/index.js` içindeki cron satırına bak:
```js
cron.schedule("0 5 * * *", ...)
```

---

## Sonraki Aşamalar

- Aşama 2: Sima için makale üretici
- Aşama 3: Mobileaudiophile editorial
- Aşama 4: Görsel üretimi
- Aşama 5: YouTube script
- Aşama 6: Tek dashboard
