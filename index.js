require("dotenv").config();
const Anthropic = require("@anthropic-ai/sdk");
const nodemailer = require("nodemailer");
const cron = require("node-cron");

const client = new Anthropic({ apiKey: process.env.AI_AUTH });

const DOMAINS = [
  {
    id: "audio",
    label: "Mobile Audio",
    icon: "◈",
    color: "#C8A97E",
    query: "What are the latest discussions, releases, and trends in portable audio, IEMs, DACs, DAPs, and audiophile gear right now? Include notable new products, community buzz on Head-Fi and Reddit, and any emerging driver technologies.",
  },
  {
    id: "psych",
    label: "Psikoloji & Koçluk",
    icon: "◉",
    color: "#7EB5C8",
    query: "What are the latest trends, discussions, and notable content in psychology, mental health, solution-focused coaching, Schema Therapy, EMDR, and behavioral science right now?",
  },
];

async function fetchTrend(domain) {
  console.log(`[${domain.label}] Taranıyor...`);
  const response = await client.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 1000,
    tools: [{ type: "web_search_20250305", name: "web_search" }],
    system: `You are a trend intelligence analyst. Search the web and provide a concise daily briefing.

Structure your response exactly like this:
OVERVIEW: [2 sentences]

TOP SIGNALS:
1. [Item] — [context]
2. [Item] — [context]
3. [Item] — [context]

WATCH: [1 emerging thing]

Write in English. Be specific, no fluff.`,
    messages: [{ role: "user", content: domain.query }],
  });
  const textBlocks = response.content.filter((b) => b.type === "text");
  return textBlocks.map((b) => b.text).join("\n").trim();
}

function buildEmailHTML(results, date) {
  const sections = results.map((r) => `
    <div style="margin-bottom:32px;padding:24px;background:#1a1917;border-radius:4px;border-left:3px solid ${r.color}">
      <div style="font-family:monospace;font-size:11px;letter-spacing:3px;color:${r.color};text-transform:uppercase;margin-bottom:12px">${r.icon} ${r.label}</div>
      <div style="font-family:Georgia,serif;font-size:15px;line-height:1.8;color:#c8c4bc;white-space:pre-wrap">${r.content}</div>
    </div>`).join("");

  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0e0d0c;color:#e8e4dc">
<div style="max-width:640px;margin:0 auto;padding:40px 24px">
  <div style="border-bottom:1px solid #2a2825;padding-bottom:20px;margin-bottom:32px">
    <div style="font-family:monospace;font-size:9px;letter-spacing:4px;color:#444;text-transform:uppercase;margin-bottom:8px">TREND RADAR · ${date}</div>
    <h1 style="margin:0;font-family:monospace;font-weight:300;font-size:20px;color:#e8e4dc">Günlük İstihbarat</h1>
  </div>
  ${sections}
</div></body></html>`;
}

async function sendEmail(html, date) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.MAIL_FROM,
      pass: process.env.MAIL_TOKEN,
    },
  });
  await transporter.sendMail({
    from: `"Trend Radar" <${process.env.MAIL_FROM}>`,
    to: process.env.MAIL_TO,
    subject: `◈ Günlük İstihbarat — ${date}`,
    html,
  });
  console.log(`✓ Mail gönderildi: ${process.env.MAIL_TO}`);
}

async function runRadar() {
  const date = new Date().toLocaleDateString("tr-TR", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  console.log(`\n═══ TREND RADAR — ${date} ═══\n`);
  const results = [];
  for (const domain of DOMAINS) {
    try {
      const content = await fetchTrend(domain);
      results.push({ ...domain, content });
      console.log(`✓ ${domain.label} tamamlandı`);
    } catch (err) {
      console.error(`✗ ${domain.label}:`, err.message);
      results.push({ ...domain, content: `Hata: ${err.message}` });
    }
  }
  await sendEmail(buildEmailHTML(results, date), date);
  console.log("\n═══ TAMAMLANDI ═══\n");
}

// Her gün 08:00 Istanbul (UTC+3) = UTC 05:00
cron.schedule("0 5 * * *", runRadar);

console.log("Trend Radar aktif. Her gün 08:00 Istanbul saatinde çalışır.");
