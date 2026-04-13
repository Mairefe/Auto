require("dotenv").config();

// index.js'deki runRadar fonksiyonunu direkt çalıştırır
// Kullanım: node src/test.js

const Anthropic = require("@anthropic-ai/sdk");
const nodemailer = require("nodemailer");

async function test() {
  console.log("─── Bağlantı Testi ───\n");

  // 1. Anthropic test
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const res = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 50,
      messages: [{ role: "user", content: "Say: TREND RADAR OK" }],
    });
    console.log("✓ Anthropic API:", res.content[0].text);
  } catch (e) {
    console.error("✗ Anthropic API hatası:", e.message);
  }

  // 2. Gmail test
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });
    await transporter.verify();
    console.log("✓ Gmail SMTP: Bağlantı başarılı");
  } catch (e) {
    console.error("✗ Gmail hatası:", e.message);
  }

  console.log("\nTam radar testi için: uncomment aşağıdaki satırı");
  // const { runRadar } = require("./index"); await runRadar();
}

test();
