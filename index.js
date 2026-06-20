const express = require('express');
const nodemailer = require('nodemailer');
const app = express();
app.use(express.json());

const GROQ_API_KEY = "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";
const GMAIL_USER = "estatebotofficial@gmail.com";
const GMAIL_PASS = "aueaawcazrmvjiqb";

// ===== BROKER DATABASE =====
const brokers = {
  "test": {
    name: "EstateBot Demo",
    location: "Mumbai",
    email: "estatebotofficial@gmail.com",
    stats: { properties: "500+", experience: "10 Yrs", rating: "4.8★" },
    specialties: ["🏢 Residential", "🏬 Commercial", "🏗️ New Projects", "🔑 Rental"]
  }
};

const conversations = {};

// ===== EMAIL SETUP =====
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: GMAIL_USER, pass: GMAIL_PASS }
});

// ===== AI PROMPT =====
const getSystemPrompt = (brokerName) => `
Tum ek friendly AI assistant ho "${brokerName}" real estate ke liye.
Hinglish mein baat karo (Hindi + English mix). Warm aur professional raho.
EK BAAR MEIN SIRF EK SAWAAL PUCHHO.

Ye info collect karo step by step:
1. Intent: "Namaste! 😊 ${brokerName} mein aapka swagat hai. Aap kya dhundh rahe hain — kharidna, rent lena, ya property sell/rent-out karni hai?"
2. Naam puchho
3. Property type: flat/plot/villa/office
4. Area/location
5. Budget
6. Timeline
7. Phone: "Aapka phone number dijiye — hamare team member seedha aapse baat karenge 📞"

Jab naam, phone, property type, area, budget sab mil jaye — thank you message ke BILKUL BAAD ye EXACTLY likho:
|||LEAD|||{"name":"NAAM","phone":"PHONE","type":"PROPERTY_TYPE","area":"AREA","budget":"BUDGET","intent":"INTENT"}|||

RULES:
- Ek sawaal ek baar
- Jo already bataya wo dobara mat puchho
- Short friendly replies
- Kabhi mat batao ki AI/bot ho
- Hinglish only
`;

// ===== SEND EMAIL =====
async function sendLeadEmail(broker, leadData) {
  const mail = {
    from: `EstateBot 🏠 <${GMAIL_USER}>`,
    to: broker.email,
    subject: `🏠 Naya Lead — ${leadData.name} | ${broker.name}`,
    html: `
<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;background:#f8fafc;padding:20px;border-radius:16px;">
  <div style="background:linear-gradient(135deg,#1e3a5f,#2d5a8e);padding:24px;border-radius:12px;text-align:center;margin-bottom:20px;">
    <h2 style="color:#fff;margin:0;font-size:24px;">🏠 EstateBot</h2>
    <p style="color:rgba(255,255,255,0.8);margin:6px 0 0;font-size:14px;">Naya Lead Aaya!</p>
  </div>
  <div style="background:#fff;padding:20px;border-radius:12px;border:1px solid #e2e8f0;margin-bottom:16px;">
    <h3 style="color:#1e3a5f;margin:0 0 16px;font-size:16px;">📋 Lead Details</h3>
    <table style="width:100%;border-collapse:collapse;">
      <tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:10px 0;color:#64748b;font-size:13px;width:40%;">👤 Naam</td><td style="padding:10px 0;font-weight:600;color:#1e293b;">${leadData.name}</td></tr>
      <tr style="border-bottom:1px solid #f1f5f9;background:#f8fafc;"><td style="padding:10px;color:#64748b;font-size:13px;">📱 Phone</td><td style="padding:10px;font-weight:600;color:#1e293b;font-size:16px;">${leadData.phone}</td></tr>
      <tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:10px 0;color:#64748b;font-size:13px;">🏡 Property</td><td style="padding:10px 0;font-weight:600;color:#1e293b;">${leadData.type}</td></tr>
      <tr style="border-bottom:1px solid #f1f5f9;background:#f8fafc;"><td style="padding:10px;color:#64748b;font-size:13px;">📍 Area</td><td style="padding:10px;font-weight:600;color:#1e293b;">${leadData.area}</td></tr>
      <tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:10px 0;color:#64748b;font-size:13px;">💰 Budget</td><td style="padding:10px 0;font-weight:600;color:#1e293b;">${leadData.budget}</td></tr>
      <tr style="background:#f8fafc;"><td style="padding:10px;color:#64748b;font-size:13px;">🎯 Intent</td><td style="padding:10px;font-weight:600;color:#1e293b;">${leadData.intent}</td></tr>
    </table>
  </div>
  <div style="text-align:center;margin-bottom:16px;">
    <a href="tel:${leadData.phone}" style="background:linear-gradient(135deg,#1e3a5f,#2d5a8e);color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;display:inline-block;">📞 Abhi Call Karein</a>
  </div>
  <p style="text-align:center;color:#94a3b8;font-size:11px;margin:0;">Powered by EstateBot • AI Lead Assistant</p>
</div>`
  };
  await transporter.sendMail(mail);
  console.log(`✅ Email sent to ${broker.email} for lead: ${leadData.name}`);
}

// ===== CHAT API =====
app.post('/api/chat/:brokerId', async (req, res) => {
  const { brokerId } = req.params;
  const { message, sessionId } = req.body;
  const broker = brokers[brokerId];
  if (!broker) return res.status(404).json({ error: 'Broker not found' });
  if (!conversations[sessionId]) conversations[sessionId] = [];
  conversations[sessionId].push({ role: 'user', content: message });
  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_API_KEY}` },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'system', content: getSystemPrompt(broker.name) }, ...conversations[sessionId]]
      })
    });
    const data = await groqRes.json();
    let reply = data.choices?.[0]?.message?.content || 'Kuch gadbad ho gayi, dobara try karein.';
    conversations[sessionId].push({ role: 'assistant', content: reply });
    let leadComplete = false;
    let leadData = null;
    if (reply.includes('|||LEAD|||')) {
      const match = reply.match(/\|\|\|LEAD\|\|\|(.+?)\|\|\|/);
      if (match) {
        try {
          leadData = JSON.parse(match[1]);
          reply = reply.replace(/\|\|\|LEAD\|\|\|.+?\|\|\|/s, '').trim();
          await sendLeadEmail(broker, leadData);
          leadComplete = true;
        } catch (e) { console.error('Lead parse error:', e); }
      }
    }
    res.json({ reply, leadComplete, leadData });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ===== BROKER PAGE =====
app.get('/:brokerId', (req, res) => {
  const broker = brokers[req.params.brokerId];
  if (!broker) return res.status(404).send('<h1 style="font-family:Arial;text-align:center;margin-top:100px;">Page not found</h1>');
  res.send(getBrokerHTML(broker, req.params.brokerId));
});

app.get('/', (req, res) => {
  res.send(`<html><body style="font-family:Arial;text-align:center;padding:50px;background:#0f172a;color:#fff;"><h1 style="color:#f59e0b;">🏠 EstateBot</h1><p>AI Lead Assistant for Real Estate</p></body></html>`);
});

// ===== HTML TEMPLATE =====
function getBrokerHTML(broker, brokerId) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${broker.name} — EstateBot</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:'Poppins',sans-serif;min-height:100vh;background:#f0f4f8;display:flex;flex-direction:column;align-items:center;}
.navbar{width:100%;max-width:480px;background:#fff;border-bottom:1px solid #e2e8f0;padding:14px 24px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:10;box-shadow:0 2px 8px rgba(0,0,0,0.06);}
.nav-brand{display:flex;align-items:center;gap:10px;}
.nav-logo{width:38px;height:38px;border-radius:10px;background:linear-gradient(135deg,#1e3a5f,#2d5a8e);display:flex;align-items:center;justify-content:center;}
.nav-name{font-size:18px;font-weight:700;color:#1e3a5f;}
.nav-name b{color:#f59e0b;}
.nav-badge{background:#f0f9ff;border:1px solid #bae6fd;color:#0369a1;font-size:11px;font-weight:600;padding:4px 10px;border-radius:20px;}
.hero{width:100%;max-width:480px;background:linear-gradient(135deg,#1e3a5f,#2d5a8e);padding:28px 24px;text-align:center;}
.broker-name-h{font-size:22px;font-weight:700;color:#fff;margin-top:12px;}
.broker-loc{color:rgba(255,255,255,0.7);font-size:13px;margin-top:4px;}
.broker-stats{display:flex;justify-content:center;gap:28px;margin-top:18px;}
.stat .sv{font-size:20px;font-weight:700;color:#f59e0b;}
.stat .sl{font-size:11px;color:rgba(255,255,255,0.6);margin-top:2px;}
.prop-tags{width:100%;max-width:480px;display:flex;gap:8px;padding:12px 16px;background:#fff;border-bottom:1px solid #e2e8f0;flex-wrap:wrap;justify-content:center;}
.ptag{background:#f8fafc;border:1px solid #e2e8f0;color:#475569;font-size:11px;font-weight:600;padding:5px 12px;border-radius:20px;}
.chat-wrap{width:100%;max-width:480px;display:flex;flex-direction:column;background:#fff;flex:1;}
.chat-header{padding:14px 16px;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;gap:10px;}
.chat-av{width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#1e3a5f,#2d5a8e);display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.ci-name{font-size:14px;font-weight:600;color:#1e293b;}
.ci-sub{font-size:12px;color:#64748b;display:flex;align-items:center;gap:5px;margin-top:1px;}
.online{width:7px;height:7px;background:#22c55e;border-radius:50%;}
.ch-right{margin-left:auto;text-align:right;}
.cr1{font-size:11px;color:#22c55e;font-weight:600;}
.cr2{font-size:10px;color:#94a3b8;margin-top:1px;}
.chat-body{background:#f8fafc;padding:16px;min-height:380px;max-height:420px;overflow-y:auto;display:flex;flex-direction:column;gap:10px;}
.msg{display:flex;flex-direction:column;max-width:80%;}
.msg.bot{align-self:flex-start;}
.msg.user{align-self:flex-end;}
.date-label{align-self:center;background:#e2e8f0;color:#64748b;font-size:11px;padding:4px 12px;border-radius:20px;margin:4px 0;}
.bubble{padding:10px 14px;font-size:13.5px;line-height:1.55;border-radius:16px;}
.bot .bubble{background:#fff;color:#334155;border-bottom-left-radius:4px;box-shadow:0 1px 4px rgba(0,0,0,0.06);border:1px solid #f1f5f9;}
.user .bubble{background:linear-gradient(135deg,#1e3a5f,#2d5a8e);color:#fff;border-bottom-right-radius:4px;}
.ts{font-size:10px;color:#94a3b8;margin-top:3px;}
.user .ts{align-self:flex-end;}
.typing{display:flex;align-items:center;gap:4px;padding:10px 14px;background:#fff;border-radius:16px;border-bottom-left-radius:4px;border:1px solid #f1f5f9;width:fit-content;}
.typing span{width:7px;height:7px;background:#1e3a5f;border-radius:50%;animation:bounce 1.2s infinite;}
.typing span:nth-child(2){animation-delay:0.2s;}
.typing span:nth-child(3){animation-delay:0.4s;}
@keyframes bounce{0%,60%,100%{transform:translateY(0);}30%{transform:translateY(-5px);}}
.lead-card{align-self:center;width:96%;background:#fff;border:1.5px solid #22c55e;border-radius:14px;padding:14px;margin-top:4px;}
.lc-top{display:flex;align-items:center;gap:8px;margin-bottom:10px;}
.lc-title{font-size:13px;font-weight:700;color:#15803d;}
.lc-sub{font-size:11px;color:#4ade80;}
.lc-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;}
.lc-item{background:#f0fdf4;border-radius:8px;padding:8px 10px;}
.li{font-size:10px;color:#86efac;font-weight:600;text-transform:uppercase;}
.lv{font-size:13px;color:#15803d;font-weight:600;margin-top:1px;}
.lc-email{margin-top:10px;background:#16a34a;color:#fff;font-size:12px;font-weight:600;padding:9px;border-radius:8px;text-align:center;}
.chat-footer{padding:12px 14px;border-top:1px solid #e2e8f0;display:flex;gap:8px;align-items:center;}
.chat-footer input{flex:1;background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:24px;padding:10px 16px;font-family:'Poppins',sans-serif;font-size:13px;color:#334155;outline:none;}
.chat-footer input:focus{border-color:#1e3a5f;}
.chat-footer input::placeholder{color:#94a3b8;}
.send{width:42px;height:42px;background:linear-gradient(135deg,#1e3a5f,#2d5a8e);border:none;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 4px 10px rgba(30,58,95,0.25);}
.send svg{width:18px;height:18px;fill:#fff;}
.bottom-strip{width:100%;max-width:480px;background:#fff;border-top:1px solid #e2e8f0;padding:10px;display:flex;align-items:center;justify-content:center;gap:5px;font-size:11px;color:#94a3b8;}
</style>
</head>
<body>
<div class="navbar">
  <div class="nav-brand">
    <div class="nav-logo"><svg viewBox="0 0 24 24" width="22" height="22"><path d="M12 2.8L20.8 10V19.6a1.1 1.1 0 01-1.1 1.1H4.3a1.1 1.1 0 01-1.1-1.1V10Z" fill="#fff"/><circle cx="12" cy="13.6" r="2.2" fill="#f59e0b"/></svg></div>
    <div class="nav-name">Estate<b>Bot</b></div>
  </div>
  <div class="nav-badge">🟢 Live</div>
</div>

<div class="hero">
  <svg viewBox="0 0 90 120" width="75" height="100" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#1a2a4a"/><stop offset="0.5" stop-color="#2d4a7a"/><stop offset="1" stop-color="#1a2a4a"/></linearGradient>
      <linearGradient id="gl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7eb8f7" stop-opacity="0.9"/><stop offset="1" stop-color="#3a78c9" stop-opacity="0.5"/></linearGradient>
    </defs>
    <line x1="45" y1="0" x2="45" y2="16" stroke="#f59e0b" stroke-width="2.5" stroke-linecap="round"/>
    <circle cx="45" cy="0" r="2" fill="#f59e0b"/>
    <polygon points="45,8 37,26 53,26" fill="url(#bg)"/>
    <rect x="39" y="26" width="12" height="18" fill="url(#bg)" rx="1"/>
    <rect x="41" y="29" width="2.5" height="2.5" fill="url(#gl)" rx="0.3"/><rect x="46.5" y="29" width="2.5" height="2.5" fill="url(#gl)" rx="0.3"/>
    <rect x="41" y="34" width="2.5" height="2.5" fill="rgba(255,220,100,0.8)" rx="0.3"/><rect x="46.5" y="34" width="2.5" height="2.5" fill="url(#gl)" rx="0.3"/>
    <rect x="35" y="44" width="20" height="4" fill="rgba(255,255,255,0.08)" rx="1"/>
    <rect x="35" y="48" width="20" height="22" fill="url(#bg)" rx="1"/>
    <rect x="37" y="51" width="2.8" height="2.8" fill="url(#gl)" rx="0.3"/><rect x="42" y="51" width="2.8" height="2.8" fill="rgba(255,220,100,0.8)" rx="0.3"/><rect x="47" y="51" width="2.8" height="2.8" fill="url(#gl)" rx="0.3"/><rect x="52" y="51" width="2.8" height="2.8" fill="url(#gl)" rx="0.3"/>
    <rect x="37" y="57" width="2.8" height="2.8" fill="url(#gl)" rx="0.3"/><rect x="42" y="57" width="2.8" height="2.8" fill="url(#gl)" rx="0.3"/><rect x="47" y="57" width="2.8" height="2.8" fill="rgba(255,220,100,0.8)" rx="0.3"/><rect x="52" y="57" width="2.8" height="2.8" fill="url(#gl)" rx="0.3"/>
    <rect x="29" y="70" width="32" height="4" fill="rgba(255,255,255,0.08)" rx="1"/>
    <rect x="29" y="74" width="32" height="34" fill="url(#bg)" rx="1"/>
    <rect x="31" y="77" width="3" height="3" fill="url(#gl)" rx="0.3"/><rect x="36" y="77" width="3" height="3" fill="rgba(255,220,100,0.8)" rx="0.3"/><rect x="41" y="77" width="3" height="3" fill="url(#gl)" rx="0.3"/><rect x="46" y="77" width="3" height="3" fill="url(#gl)" rx="0.3"/><rect x="51" y="77" width="3" height="3" fill="rgba(255,220,100,0.8)" rx="0.3"/><rect x="56" y="77" width="3" height="3" fill="url(#gl)" rx="0.3"/>
    <rect x="31" y="83" width="3" height="3" fill="rgba(255,220,100,0.8)" rx="0.3"/><rect x="36" y="83" width="3" height="3" fill="url(#gl)" rx="0.3"/><rect x="41" y="83" width="3" height="3" fill="url(#gl)" rx="0.3"/><rect x="46" y="83" width="3" height="3" fill="rgba(255,220,100,0.8)" rx="0.3"/><rect x="51" y="83" width="3" height="3" fill="url(#gl)" rx="0.3"/><rect x="56" y="83" width="3" height="3" fill="url(#gl)" rx="0.3"/>
    <rect x="31" y="89" width="3" height="3" fill="url(#gl)" rx="0.3"/><rect x="36" y="89" width="3" height="3" fill="rgba(255,220,100,0.8)" rx="0.3"/><rect x="41" y="89" width="3" height="3" fill="url(#gl)" rx="0.3"/><rect x="46" y="89" width="3" height="3" fill="url(#gl)" rx="0.3"/><rect x="51" y="89" width="3" height="3" fill="rgba(255,220,100,0.8)" rx="0.3"/><rect x="56" y="89" width="3" height="3" fill="url(#gl)" rx="0.3"/>
    <rect x="37" y="108" width="16" height="6" fill="rgba(255,255,255,0.1)" rx="1"/>
    <rect x="21" y="113" width="48" height="4" fill="rgba(255,255,255,0.05)" rx="2"/>
    <ellipse cx="45" cy="116" rx="28" ry="3" fill="rgba(245,158,11,0.1)"/>
  </svg>
  <div class="broker-name-h">${broker.name}</div>
  <div class="broker-loc">📍 ${broker.location}</div>
  <div class="broker-stats">
    <div class="stat"><div class="sv">${broker.stats.properties}</div><div class="sl">Properties</div></div>
    <div class="stat"><div class="sv">${broker.stats.experience}</div><div class="sl">Experience</div></div>
    <div class="stat"><div class="sv">${broker.stats.rating}</div><div class="sl">Rating</div></div>
  </div>
</div>

<div class="prop-tags">${broker.specialties.map(s=>`<span class="ptag">${s}</span>`).join('')}</div>

<div class="chat-wrap">
  <div class="chat-header">
    <div class="chat-av"><svg viewBox="0 0 24 24" width="22" height="22"><path d="M12 2.8L20.8 10V19.6a1.1 1.1 0 01-1.1 1.1H4.3a1.1 1.1 0 01-1.1-1.1V10Z" fill="#fff"/><circle cx="12" cy="13.6" r="2.2" fill="#f59e0b"/></svg></div>
    <div><div class="ci-name">${broker.name} Assistant</div><div class="ci-sub"><span class="online"></span> Online · Turant reply karta hai</div></div>
    <div class="ch-right"><div class="cr1">24×7 Active</div><div class="cr2">AI Powered</div></div>
  </div>
  <div class="chat-body" id="chatBody">
    <div class="date-label">Aaj</div>
    <div class="msg bot"><div class="bubble">Namaste! 😊 ${broker.name} mein aapka swagat hai. Aap kya dhundh rahe hain — kharidna, rent lena, ya apni property sell/rent-out karni hai?</div><div class="ts">Abhi</div></div>
  </div>
  <div class="chat-footer">
    <input type="text" id="msgInput" placeholder="Apna message yahan likhein..." onkeypress="if(event.key==='Enter')sendMsg()"/>
    <button class="send" onclick="sendMsg()"><svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg></button>
  </div>
</div>

<div class="bottom-strip">
  <svg viewBox="0 0 24 24" width="14" height="14"><path d="M12 2.8L20.8 10V19.6a1.1 1.1 0 01-1.1 1.1H4.3a1.1 1.1 0 01-1.1-1.1V10Z" fill="#1e3a5f"/></svg>
  <span style="font-weight:700;color:#1e3a5f;">EstateBot</span> · AI Lead Assistant
</div>

<script>
const sessionId = Math.random().toString(36).substr(2,9);
const brokerId = '${brokerId}';
let leadDone = false;

function getTime(){const n=new Date();return n.getHours()+':'+String(n.getMinutes()).padStart(2,'0');}

function addMsg(text,role,leadData){
  const body=document.getElementById('chatBody');
  if(role==='lead'){
    const d=document.createElement('div');
    d.className='lead-card';
    d.innerHTML=\`<div class="lc-top"><span style="font-size:24px;">✅</span><div><div class="lc-title">Lead Successfully Captured!</div><div class="lc-sub">📧 Email notification bhej di</div></div></div>
    <div class="lc-grid">
      <div class="lc-item"><div class="li">Naam</div><div class="lv">\${leadData.name||'—'}</div></div>
      <div class="lc-item"><div class="li">Phone</div><div class="lv">\${leadData.phone||'—'}</div></div>
      <div class="lc-item"><div class="li">Property</div><div class="lv">\${leadData.type||'—'}</div></div>
      <div class="lc-item"><div class="li">Area</div><div class="lv">\${leadData.area||'—'}</div></div>
    </div>
    <div class="lc-email">📧 Agent ko email notification bhej di!</div>\`;
    body.appendChild(d);
  } else {
    const d=document.createElement('div');
    d.className='msg '+role;
    d.innerHTML=\`<div class="bubble">\${text}</div><div class="ts">\${getTime()}</div>\`;
    body.appendChild(d);
  }
  body.scrollTop=body.scrollHeight;
}

function showTyping(){
  const body=document.getElementById('chatBody');
  const d=document.createElement('div');
  d.className='msg bot';d.id='typing';
  d.innerHTML='<div class="typing"><span></span><span></span><span></span></div>';
  body.appendChild(d);body.scrollTop=body.scrol
