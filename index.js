require("dotenv").config();
const Anthropic = require("@anthropic-ai/sdk");
const nodemailer = require("nodemailer");
const cron = require("node-cron");

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const DOMAINS = [
  {
    id: "audio",
    label: "Mobile Audio",
    icon: "◈",
    query:
      "What are the latest discussions, releases, and trends in portable audio, IEMs, DACs, DAPs, and audiophile gear right now? Include notable new products, community buzz on Head-Fi and Reddit, and any emerging driver technologies like MEMS or EST.",
  },
  {
    id: "psych",
    label: "Psikoloji & Koçluk",
    icon: "◉",
    query:
      "What are the latest trends, discussions, and notable content in psychology, mental health, solution-focused coaching, Schema Therapy, EMDR, and behavioral science right now? Include research findings, social media discussions, and professional community topics.",
  },
];

// ─── Trend Fetcher ────────────────────────────────────────────────────────────

async function fetchTrend(domain) {
  console.log(`[${domain.label}] Taranıyor...`);

  const response = await client.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 1000,
    tools: [{ type: "web_search_20250305", name: "web_search" }],
    system: `You are a trend intelligence analyst. Search the web and provide a concise, insightful daily briefing.

Structure your response exactly like this:
OVERVIEW: [2 sentences summarizing the current landscape]

TOP SIGNALS:
1. [Item name/topic] — [1-2 sentence context]
2. [Item name/topic] — [1-2 sentence context]  
3. [Item name/topic] — [1-2 sentence context]
4. [Item name/topic] — [1-2 sentence context]

WATCH: [1 emerging thing to keep an eye on, 1-2 sentences]

Be specific with names, products, researchers. No fluff. Write in English.`,
    messages: [{ role: "user", content: domain.query }],
  });

  const textBlocks = response.content.filter((b) => b.type === "text");
  return textBlocks.map((b) => b.text).join("\n").trim();
}

// ─── Email Builder ─────────────────────────────────────────────────────────────

function buildEmailHTML(results, date) {
  const sections = results
    .map(
      (r) => `
    <div style="margin-bottom:36px; padding:28px; background:#1a1917; border-radius:4px; border-left:3px solid ${r.color}">
      <div style="font-family:monospace; font-size:11px; letter-spacing:3px; color:${r.color}; text-transform:uppercase; margin-bottom:16px">
        ${r.icon} ${r.label}
      </div>
      <div style="font-family:Georgia,serif; font-size:15px; line-height:1.9; color:#c8c4bc; white-space:pre-wrap">${r.content
        .replace(/\*\*(.*?)\*\*/g, '<strong style="color:#e8e4dc">$1</strong>')
        .replace(/^OVERVIEW:/gm, `<span style="color:${r.color};font-family:monospace;font-size:10px;letter-spacing:2px">OVERVIEW</span><br>`)
        .replace(/^TOP SIGNALS:/gm, `<br><span style="color:${r.color};font-family:monospace;font-size:10px;letter-spacing:2px">TOP SIGNALS</span><br>`)
        .replace(/^WATCH:/gm, `<br><span style="color:${r.color};font-family:monospace;font-size:10px;letter-spacing:2px">WATCH</span><br>`)}</div>
    </div>`
    )
    .join("");

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0; padding:0; background:#0e0d0c; color:#e8e4dc">
  <div style="max-width:640px; margin:0 auto; padding:40px 24px">
    
    <div style="border-bottom:1px solid #2a2825; padding-bottom:20px; margin-bottom:32px">
      <div style="font-family:monospace; font-size:9px; letter-spacing:4px; color:#444; text-transform:uppercase; margin-bottom:8px">
        TREND RADAR · ${date}
      </div>
      <h1 style="margin:0; font-family:monospace; font-weight:300; font-size:20px; letter-spacing:1px; color:#e8e4dc">
        Günlük İstihbarat
      </h1>
    </div>

    ${sections}

    <div style="border-top:1px solid #1e1d1b; padding-top:16px; margin-top:8px; font-family:monospace; font-size:9px; letter-spacing:2px; color:#333; text-transform:uppercase; display:flex; justify-content:space-between">
      <span>Mahir · Operasyon Sistemi v0.1</span>
      <span>Aşama 1 / 6</span>
    </div>

  </div>
</body>
</html>`;
}

// ─── Email Sender ──────────────────────────────────────────────────────────────

async function sendEmail(htmlContent, date) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  await transporter.sendMail({
    from: `"Trend Radar" <${process.env.GMAIL_USER}>`,
    to: process.env.TARGET_EMAIL,
    subject: `◈ Günlük İstihbarat — ${date}`,
    html: htmlContent,
  });

  console.log(`✓ E-posta gönderildi: ${process.env.TARGET_EMAIL}`);
}

// ─── Main Runner ───────────────────────────────────────────────────────────────

async function runRadar() {
  const date = new Date().toLocaleDateString("tr-TR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  console.log(`\n═══ TREND RADAR BAŞLADI — ${date} ═══\n`);

  const colors = { audio: "#C8A97E", psych: "#7EB5C8" };
  const icons = { audio: "◈", psych: "◉" };

  const results = [];

  for (const domain of DOMAINS) {
    try {
      const content = await fetchTrend(domain);
      results.push({
        ...domain,
        content,
        color: colors[domain.id],
        icon: icons[domain.id],
      });
      console.log(`✓ ${domain.label} tamamlandı\n`);
    } catch (err) {
      console.error(`✗ ${domain.label} hatası:`, err.message);
      results.push({
        ...domain,
        content: `Hata oluştu: ${err.message}`,
        color: colors[domain.id],
        icon: icons[domain.id],
      });
    }
  }

  const html = buildEmailHTML(results, date);

  try {
    await sendEmail(html, date);
  } catch (err) {
    console.error("✗ E-posta hatası:", err.message);
  }

  console.log("\n═══ TAMAMLANDI ═══\n");
}

// ─── Scheduler ────────────────────────────────────────────────────────────────

// Her gün saat 08:00'de çalışır (Istanbul = UTC+3, yani UTC 05:00)
cron.schedule("0 5 * * *", () => {
  runRadar();
});

console.log("Trend Radar aktif. Her gün 08:00 Istanbul saatinde çalışır.");
console.log("Manuel test için: node src/test.js\n");
