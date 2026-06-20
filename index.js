const express = require('express');
const { Resend } = require('resend');
const { createClient } = require('@supabase/supabase-js');
const app = express();
app.use(express.json());

// ===== KEYS =====
const GROQ_API_KEY = "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";
const resend = new Resend('re_7HnaPfwP_Cso6RXqBYX7A4apowdzvd6kQ');
const supabase = createClient(
  'https://rpswzqgzcautmfjpgohh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwc3d6cWd6Y2F1dG1manBnb2hoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTkyMjYzMCwiZXhwIjoyMDk3NDk4NjMwfQ.v48pCXRn0DTb2dUJv8bhBgoB-vxINiWR-wqlDc7vAFQ'
);

const conversations = {};

// ===== AI PROMPT =====
const getSystemPrompt = (brokerName) => `
Tum "${brokerName}" ke senior real estate consultant ho — 15+ saal ka experience. Tum ek real insaan ki tarah baat karte ho — natural, warm, aur knowledgeable.

PERSONALITY — BILKUL INSAAN JAISI:
- Kabhi ek saath bahut zyada mat likho — real conversation mein log thoda thoda bolte hain
- Customer jo bole usse pehle acknowledge karo — jaise koi dost sunta hai
- Kabhi formal mat lagao — "ji" use karo but robot jaisa nahi
- Apni baat mein genuine interest dikhao
- Humor ya warmth kabhi kabhi use karo
- Agar customer zyada details bata raha hai toh interest dikhao

LANGUAGE:
- Hinglish — bilkul natural, jaise WhatsApp pe baat karte ho
- Short messages — ek message mein ek hi cheez
- "acha", "bilkul", "theek hai", "sahi baat hai" jaise words use karo
- Kabhi AI/bot mat batao apne aap ko

REAL ESTATE KNOWLEDGE:
- Flat/Apartment: BHK, floor, lift, parking, society charges, furnished/unfurnished
- Villa: plot size, floors, garden, parking
- Plot: dimensions, corner plot, registry status
- Commercial: carpet area, CAM charges, parking
- Legal: RERA, stamp duty, NOC, title deed
- Financial: home loan, EMI, down payment 20%
- Market: ready to move vs under construction

EMOTIONAL INTELLIGENCE:
- Anxious customer: "Arey bilkul tension mat lo — main hoon na, sab sort ho jayega"
- Budget kam: "Dekhiye, budget mein bhi bahut achhe options hote hain — aap batao toh main dhundhta hoon"
- Confused: "Ek ek cheez clear karte hain — koi bhi sawaal chhota nahi hota"
- Urgent: "Achha theek hai — jaldi karte hain, best option abhi nikaalte hain"

CONVERSATION FLOW — EK SAWAAL EK BAAR, BILKUL NATURAL:

Step 1 — Warm greeting:
"Namaste ji! ${brokerName} mein aapka swagat hai 😊 Aap property kharidna chahte hain, rent lena hai, ya apni property sell/rent pe deni hai?"

Step 2 — Intent pe react karo, naam puchho:
[Intent pe genuinely react karo — jaise real insaan karta hai]
"Acha! Aapka naam kya hai?"

Step 3 — Property type:
"[Naam] ji, kaunsi property mein interest hai? Flat, villa, plot, ya commercial?"

Step 4 — Property specific sawaal (BAHUT ZAROORI):
Agar FLAT/APARTMENT:
- "Kitne BHK chahiye?"
- Phir: "Furnished chahiye, semi-furnished, ya unfurnished?"
- Phir: "Car parking ki zaroorat hai?"
- Phir: "Lift aur society chahiye ya independent building theek hai?"

Agar VILLA:
- "Plot size roughly kitna chahiye?"
- Phir: "Kitne floors chahiye?"
- Phir: "Garden ya parking ki koi specific requirement hai?"

Agar PLOT:
- "Kitne gaj ya square feet ka plot chahiye?"
- Phir: "Corner plot chahiye ya normal?"

Agar COMMERCIAL:
- "Office ke liye hai ya shop/showroom?"
- Phir: "Kitna carpet area chahiye approximately?"
- Phir: "Parking important hai?"

Step 5 — Location:
"Kaunsa area prefer karenge? Koi specific locality hai mann mein?"

Step 6 — Budget:
"Budget range roughly kitni hai? — bilkul honest raho, usi hisaab se sahi options bataunga"

Step 7 — Timeline:
"Aur kitne time mein lena chahenge — abhi urgent hai ya thoda time hai?"

Step 8 — Phone (KABHI SKIP MAT KARO):
"[Naam] ji, ek kaam — apna WhatsApp number do. Hamare senior advisor directly call karenge aur sab options clearly batayenge. Bilkul free consultation hai 👍"

SPECIAL CASE — GALAT NUMBER:
Agar customer bole "number galat hai", "wrong", "change karo" —
Bolo: "[Naam] ji, koi baat nahi! Sahi number bata do."
Naya number lo, phir lead complete karo.

IMPORTANT: Phone number liye BINA lead BILKUL complete mat karna.

Jab naam, phone, property type, area, budget sab mil jaye — warmly thank karo, phir BILKUL BAAD likho:
|||LEAD|||{"name":"NAAM","phone":"PHONE","type":"PROPERTY_TYPE_WITH_BHK","area":"AREA","budget":"BUDGET","intent":"Rent Lena Chahte Hain/Rent Dena Chahte Hain/Kharidna Chahte Hain/Sell Karna Chahte Hain","timeline":"TIMELINE","furnished":"Furnished/Semi-Furnished/Unfurnished/NA","parking":"Chahiye/Nahi Chahiye/NA","special":"ANY_SPECIAL_REQUIREMENTS"}|||

Thank you message (warm, genuine):
"Bahut shukriya [Naam] ji! Aapki saari details note ho gayi hain 😊 Hamare senior advisor kal tak aapko call karenge. Koi bhi sawaal ho toh pooch sakte ho!"

STRICT RULES:
- EK sawaal EK baar — kabhi 2 ek saath nahi
- Jo bataya wo dobara mat puchho
- Pehle message ke baad dobara swagat mat karo
- Thank you mein phone number repeat mat karo
- 2-3 lines max per message — bilkul natural raho
- Kabhi AI/bot mat batao
`;

// ===== SEND LEAD EMAIL =====
async function sendLeadEmail(broker, leadData) {
  const { error } = await resend.emails.send({
    from: 'EstateBot <leads@estatebotai.in>',
    to: broker.email,
    subject: `Naya Lead — ${leadData.name} | ${broker.name}`,
    html: `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"></head>
<body style="margin:0;padding:0;background-color:#f0f4f8;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f4f8;padding:20px 0;">
<tr><td align="center">
<table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;">

  <!-- HEADER -->
  <tr><td style="background:linear-gradient(135deg,#1e3a5f,#2d5a8e);border-radius:14px;padding:32px 24px;text-align:center;margin-bottom:16px;" align="center">
    <p style="font-size:10px;color:#94a3b8;letter-spacing:3px;text-transform:uppercase;margin:0 0 12px;">${broker.name} &middot; New Lead</p>
    <div style="width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,#f59e0b,#d97706);margin:0 auto 14px;line-height:64px;text-align:center;">
      <span style="font-size:28px;line-height:64px;">&#128100;</span>
    </div>
    <h2 style="color:#ffffff;margin:0 0 6px;font-size:28px;font-weight:700;font-family:Arial,sans-serif;">${leadData.name}</h2>
    <p style="margin:0 0 16px;color:#94a3b8;font-size:13px;">${leadData.intent || 'Property Enquiry'}</p>
    <a href="tel:${leadData.phone}" style="background:#f59e0b;color:#000000;padding:13px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:16px;display:inline-block;font-family:Arial,sans-serif;">&#128222; ${leadData.phone}</a>
  </td></tr>

  <tr><td height="16"></td></tr>

  <!-- PROPERTY REQUIREMENTS -->
  <tr><td style="background:#ffffff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="padding:14px 20px;background:#f8fafc;border-bottom:1px solid #e2e8f0;">
        <p style="margin:0;font-size:11px;font-weight:700;color:#1e3a5f;letter-spacing:2px;text-transform:uppercase;font-family:Arial,sans-serif;">&#127968; Property Requirements</p>
      </td></tr>
      <tr><td style="padding:0;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr style="border-bottom:1px solid #f1f5f9;">
            <td style="padding:14px 20px;width:44%;color:#64748b;font-size:13px;font-family:Arial,sans-serif;border-bottom:1px solid #f1f5f9;">&#127968; Property Type</td>
            <td style="padding:14px 20px;font-weight:700;color:#1e293b;font-size:14px;font-family:Arial,sans-serif;border-bottom:1px solid #f1f5f9;">${leadData.type || '&mdash;'}</td>
          </tr>
          <tr style="background:#f8fafc;">
            <td style="padding:14px 20px;color:#64748b;font-size:13px;font-family:Arial,sans-serif;border-bottom:1px solid #f1f5f9;">&#127968; Furnished</td>
            <td style="padding:14px 20px;font-weight:700;color:#1e293b;font-size:14px;font-family:Arial,sans-serif;border-bottom:1px solid #f1f5f9;">${leadData.furnished || 'Not specified'}</td>
          </tr>
          <tr>
            <td style="padding:14px 20px;color:#64748b;font-size:13px;font-family:Arial,sans-serif;border-bottom:1px solid #f1f5f9;">&#128205; Preferred Area</td>
            <td style="padding:14px 20px;font-weight:700;color:#1e293b;font-size:14px;font-family:Arial,sans-serif;border-bottom:1px solid #f1f5f9;">${leadData.area || '&mdash;'}</td>
          </tr>
          <tr style="background:#f8fafc;">
            <td style="padding:14px 20px;color:#64748b;font-size:13px;font-family:Arial,sans-serif;border-bottom:1px solid #f1f5f9;">&#128176; Budget</td>
            <td style="padding:14px 20px;font-weight:700;color:#16a34a;font-size:18px;font-family:Arial,sans-serif;border-bottom:1px solid #f1f5f9;">${leadData.budget || '&mdash;'}</td>
          </tr>
          <tr>
            <td style="padding:14px 20px;color:#64748b;font-size:13px;font-family:Arial,sans-serif;border-bottom:1px solid #f1f5f9;">&#128663; Car Parking</td>
            <td style="padding:14px 20px;font-weight:700;color:#1e293b;font-size:14px;font-family:Arial,sans-serif;border-bottom:1px solid #f1f5f9;">${leadData.parking || 'Not specified'}</td>
          </tr>
          <tr style="background:#f8fafc;">
            <td style="padding:14px 20px;color:#64748b;font-size:13px;font-family:Arial,sans-serif;">&#9200; Timeline</td>
            <td style="padding:14px 20px;font-weight:700;color:#1e293b;font-size:14px;font-family:Arial,sans-serif;">${leadData.timeline || 'Not specified'}</td>
          </tr>
        </table>
      </td></tr>
    </table>
  </td></tr>

  <tr><td height="12"></td></tr>

  <!-- CONTACT -->
  <tr><td style="background:#ffffff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="padding:14px 20px;background:#f8fafc;border-bottom:1px solid #e2e8f0;">
        <p style="margin:0;font-size:11px;font-weight:700;color:#1e3a5f;letter-spacing:2px;text-transform:uppercase;font-family:Arial,sans-serif;">&#128100; Contact Details</p>
      </td></tr>
      <tr><td>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:14px 20px;width:44%;color:#64748b;font-size:13px;font-family:Arial,sans-serif;border-bottom:1px solid #f1f5f9;">&#128100; Name</td>
            <td style="padding:14px 20px;font-weight:700;color:#1e293b;font-size:15px;font-family:Arial,sans-serif;border-bottom:1px solid #f1f5f9;">${leadData.name}</td>
          </tr>
          <tr>
            <td style="padding:14px 20px;color:#64748b;font-size:13px;font-family:Arial,sans-serif;">&#128222; Phone / WhatsApp</td>
            <td style="padding:14px 20px;font-weight:700;color:#1e293b;font-size:22px;font-family:Arial,sans-serif;">${leadData.phone}</td>
          </tr>
        </table>
      </td></tr>
    </table>
  </td></tr>

  <tr><td height="16"></td></tr>

  <!-- CTA -->
  <tr><td align="center">
    <a href="tel:${leadData.phone}" style="background:linear-gradient(135deg,#1e3a5f,#2d5a8e);color:#ffffff;padding:16px 48px;border-radius:10px;text-decoration:none;font-weight:700;font-size:16px;display:inline-block;font-family:Arial,sans-serif;">&#128222; Call Now &mdash; ${leadData.phone}</a>
  </td></tr>

  <tr><td height="16"></td></tr>

  <!-- FOOTER -->
  <tr><td align="center" style="color:#94a3b8;font-size:11px;font-family:Arial,sans-serif;">
    Lead from ${broker.name} &middot; Powered by EstateBot &middot; estatebotai.in
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`
  });
  if (error) console.error('Email error:', error);
  else console.log(`Email sent to ${broker.email} for lead: ${leadData.name}`);
}

// ===== SEND WELCOME EMAIL TO BROKER =====
async function sendWelcomeEmail(broker) {
  const { error } = await resend.emails.send({
    from: 'EstateBot <welcome@estatebotai.in>',
    to: broker.email,
    subject: `EstateBot Setup Complete — ${broker.name} ka Bot Live Hai!`,
    html: `
<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;background:#f8fafc;padding:20px;border-radius:16px;">
  <div style="background:linear-gradient(135deg,#1e3a5f,#2d5a8e);padding:24px;border-radius:12px;text-align:center;margin-bottom:20px;">
    <h2 style="color:#fff;margin:0;">EstateBot</h2>
    <p style="color:rgba(255,255,255,0.8);margin:6px 0 0;">Aapka AI Lead Bot Ready Hai!</p>
  </div>
  <div style="background:#fff;padding:20px;border-radius:12px;border:1px solid #e2e8f0;">
    <p style="color:#1e293b;">Namaste ${broker.name} ji,</p>
    <p style="color:#475569;margin-top:12px;">Aapka EstateBot live ho gaya hai. Ab customers seedha aapke bot se baat karenge aur leads aapki email pe aayengi.</p>
    <div style="background:#f0f9ff;border-radius:8px;padding:16px;margin:20px 0;">
      <p style="color:#0369a1;font-weight:600;margin:0;">Aapka Bot Link:</p>
      <a href="https://estate-webhoot.onrender.com/${broker.broker_id}" style="color:#1e3a5f;font-size:15px;font-weight:700;">
        https://estate-webhoot.onrender.com/${broker.broker_id}
      </a>
    </div>
    <p style="color:#475569;">Is link ko apne Instagram bio, WhatsApp, ya visiting card pe lagaiye.</p>
  </div>
  <p style="text-align:center;color:#94a3b8;font-size:11px;margin-top:16px;">Powered by EstateBot • +91 86903 53003</p>
</div>`
  });
  if (error) console.error('Welcome email error:', error);
  else console.log(`Welcome email sent to ${broker.email}`);
}

// ===== BROKER SIGNUP API =====
app.post('/api/signup', async (req, res) => {
  const { name, business, city, specialty, email, phone } = req.body;
  if (!name || !business || !city || !email || !phone) {
    return res.status(400).json({ error: 'Saari details bharo' });
  }

  // broker_id banao — business name se
  const broker_id = business.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 30);

  // Check karo — already exist toh nahi karta
  const { data: existing } = await supabase
    .from('brokers')
    .select('broker_id')
    .eq('broker_id', broker_id)
    .single();

  const finalId = existing ? `${broker_id}-${Date.now().toString().slice(-4)}` : broker_id;

  // Supabase mein save karo
  const { error } = await supabase.from('brokers').insert([{
    broker_id: finalId,
    name: business,
    email,
    phone,
    city,
    specialty: specialty || 'Residential',
    status: 'trial'
  }]);

  if (error) {
    console.error('Supabase error:', error);
    return res.status(500).json({ error: 'Database error' });
  }

  // Welcome email bhejo
  await sendWelcomeEmail({ name, broker_id: finalId, email });

  console.log(`New broker signup: ${business} (${finalId})`);
  res.json({ success: true, broker_id: finalId, url: `https://estate-webhoot.onrender.com/${finalId}` });
});

// ===== ADMIN API =====
app.get('/api/admin/brokers', async (req, res) => {
  const { data, error } = await supabase.from('brokers').select('*').order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error });
  res.json(data);
});

app.get('/api/admin/leads', async (req, res) => {
  const { data, error } = await supabase.from('leads').select('*').order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error });
  res.json(data);
});

app.patch('/api/admin/brokers/:brokerId', async (req, res) => {
  const { brokerId } = req.params;
  const { status } = req.body;
  const { error } = await supabase.from('brokers').update({ status }).eq('broker_id', brokerId);
  if (error) return res.status(500).json({ error });
  res.json({ success: true });
});

// ===== CHAT API =====
app.post('/api/chat/:brokerId', async (req, res) => {
  const { brokerId } = req.params;
  const { message, sessionId } = req.body;

  // Pehle Supabase se broker dhundo
  const { data: broker, error } = await supabase
    .from('brokers')
    .select('*')
    .eq('broker_id', brokerId)
    .single();

  if (error || !broker) return res.status(404).json({ error: 'Broker not found' });
  if (broker.status === 'inactive') return res.status(403).json({ error: 'Subscription expired' });

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

          // Phone mandatory check
          if (!leadData.phone || leadData.phone.length < 8) {
            reply = reply.replace(/\|\|\|LEAD\|\|\|.+?\|\|\|/s, '').trim();
            leadComplete = false;
            leadData = null;
          } else {
            reply = reply.replace(/\|\|\|LEAD\|\|\|.+?\|\|\|/s, '').trim();

            // Lead Supabase mein save karo
            await supabase.from('leads').insert([{
              broker_id: brokerId,
              name: leadData.name,
              phone: leadData.phone,
              property_type: leadData.type,
              area: leadData.area,
              budget: leadData.budget,
              intent: leadData.intent,
              timeline: leadData.timeline || null,
              furnished: leadData.furnished || null,
              parking: leadData.parking || null
            }]);

            await sendLeadEmail(broker, leadData);
            leadComplete = true;
          }
        } catch (e) { console.error('Lead parse error:', e); }
      }
    }
    res.json({ reply, leadComplete, leadData });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ===== ADMIN PANEL =====
app.get('/admin', (req, res) => {
  res.sendFile(__dirname + '/admin.html');
});

// ===== LANDING PAGE =====
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/landing.html');
});

// ===== BROKER PAGE =====
app.get('/:brokerId', async (req, res) => {
  const { brokerId } = req.params;

  const { data: broker } = await supabase
    .from('brokers')
    .select('*')
    .eq('broker_id', brokerId)
    .single();

  if (!broker) return res.status(404).send('<h1 style="font-family:Arial;text-align:center;margin-top:100px;">Page not found</h1>');
  res.send(getBrokerHTML(broker, brokerId));
});

// ===== HTML TEMPLATE =====
function getBrokerHTML(broker, brokerId) {
  const specialties = broker.specialty ? broker.specialty.split(',') : [];
  const specIcons = [
    '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#1e3a5f" stroke-width="1.5"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
    '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#1e3a5f" stroke-width="1.5"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>',
    '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#1e3a5f" stroke-width="1.5"><path d="M2 20h20M4 20V8l8-6 8 6v12"/><path d="M9 20v-6h6v6"/></svg>',
    '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#1e3a5f" stroke-width="1.5"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>'
  ];
  const initials = broker.name.split(' ').map(w=>w[0]).join('').substring(0,2).toUpperCase();
  const nameParts = broker.name.split(' ');
  const firstName = nameParts[0];
  const lastName = nameParts.slice(1).join(' ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${broker.name} — EstateBot</title>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:'Poppins',sans-serif;background:#050b16;min-height:100vh;display:flex;flex-direction:column;align-items:center;}

/* HERO */
.hero{width:100%;max-width:480px;position:relative;overflow:hidden;min-height:600px;display:flex;flex-direction:column;}
.hero-bg{position:absolute;inset:0;background:linear-gradient(135deg,rgba(5,11,22,0.88),rgba(20,40,70,0.72)),url('${img_src}');background-size:cover;background-position:center top;}
.hero-overlay{position:absolute;inset:0;background:linear-gradient(to bottom,transparent 25%,rgba(5,11,22,0.6) 55%,#050b16 85%,#050b16 100%);}

.hero-top{position:relative;z-index:2;padding:24px 20px 0;display:flex;align-items:center;gap:12px;}
.logo-name{font-size:14px;font-weight:700;color:#fff;letter-spacing:2.5px;text-transform:uppercase;line-height:1;}
.logo-sub{font-size:9px;color:#c8a96e;letter-spacing:4px;text-transform:uppercase;margin-top:4px;}

.hero-content{position:relative;z-index:2;padding:0 20px;margin-top:auto;}
.broker-big-name{font-family:'Playfair Display',serif;font-size:52px;font-weight:800;color:#fff;line-height:1.0;letter-spacing:-1.5px;}
.broker-big-name span{color:#c8a96e;}
.broker-location-row{display:flex;align-items:center;gap:6px;margin-top:10px;margin-bottom:8px;}
.broker-loc-text{font-size:13px;color:rgba(255,255,255,0.8);}
.gold-line{width:42px;height:2px;background:linear-gradient(90deg,#c8a96e,transparent);margin-bottom:20px;}

.stats-bar{position:relative;z-index:2;display:grid;grid-template-columns:repeat(3,1fr);gap:10px;padding:0 14px 14px;}
.stat-item{background:rgba(255,255,255,0.12);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,0.2);border-radius:18px;padding:15px;text-align:center;}
.stat-circle{width:38px;height:38px;border-radius:50%;border:1px solid rgba(200,169,110,0.35);display:flex;align-items:center;justify-content:center;margin:0 auto 8px;}
.stat-val{font-size:19px;font-weight:700;color:#c8a96e;}
.stat-lbl{font-size:9px;color:rgba(255,255,255,0.5);margin-top:2px;letter-spacing:0.5px;}

.badges-row{position:relative;z-index:2;display:flex;gap:10px;padding:0 14px 20px;}
.badge-dark{flex:1;display:flex;align-items:center;justify-content:center;gap:8px;padding:13px;border-radius:12px;font-size:13px;font-weight:600;background:rgba(8,8,18,0.85);border:1px solid rgba(200,169,110,0.3);color:#fff;backdrop-filter:blur(8px);}
.badge-gold{flex:1;display:flex;align-items:center;justify-content:center;gap:8px;padding:13px;border-radius:12px;font-size:13px;font-weight:600;background:linear-gradient(135deg,#c8a96e,#8a6228);border:none;color:#0a0a0a;}

/* CHAT BOX */
.chat-box{width:100%;max-width:480px;background:#fff;border-radius:30px 30px 0 0;box-shadow:0 -10px 40px rgba(0,0,0,0.25);display:flex;flex-direction:column;flex:1;}

.specialties{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;padding:16px;border-bottom:1px solid #f0ede8;}
.spec-card{background:#fff;border:1px solid #f0ede8;border-radius:10px;padding:12px 6px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:6px;}
.spec-name{font-size:9px;font-weight:600;color:#1e293b;}
.spec-line{width:22px;height:2px;background:#c8a96e;border-radius:2px;}

.chat-header{padding:14px 16px;border-bottom:1px solid #f0ede8;display:flex;align-items:center;gap:12px;}
.chat-av{width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#1e3a5f,#2d5a8e);display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:700;color:#fff;flex-shrink:0;}
.chat-name{font-size:14px;font-weight:700;color:#1e293b;}
.chat-sub{font-size:11px;color:#64748b;display:flex;align-items:center;gap:5px;margin-top:2px;}
.online-dot{width:7px;height:7px;background:#22c55e;border-radius:50%;animation:pulse 2s infinite;}
@keyframes pulse{0%,100%{opacity:1;}50%{opacity:0.4;}}

.chat-body{background:#f8fafc;padding:16px;min-height:220px;display:flex;flex-direction:column;gap:10px;overflow-y:auto;}
.date-label{align-self:center;background:#e2e8f0;color:#64748b;font-size:11px;padding:4px 12px;border-radius:20px;}
.msg{display:flex;flex-direction:column;max-width:82%;}
.msg.bot{align-self:flex-start;}
.msg.user{align-self:flex-end;}
.bubble{padding:10px 14px;font-size:13.5px;line-height:1.55;border-radius:18px;}
.bot .bubble{background:#f8fafc;border:1px solid #e5e7eb;color:#334155;border-bottom-left-radius:4px;}
.user .bubble{background:linear-gradient(135deg,#b78b45,#e3c27b);color:#fff;border-bottom-right-radius:4px;}
.ts{font-size:10px;color:#94a3b8;margin-top:3px;}
.user .ts{align-self:flex-end;}
.typing{display:flex;align-items:center;gap:4px;padding:10px 14px;background:#f8fafc;border-radius:18px;border:1px solid #e5e7eb;width:fit-content;}
.typing span{width:7px;height:7px;background:#c8a96e;border-radius:50%;animation:bounce 1.2s infinite;}
.typing span:nth-child(2){animation-delay:0.2s;}
.typing span:nth-child(3){animation-delay:0.4s;}
@keyframes bounce{0%,60%,100%{transform:translateY(0);}30%{transform:translateY(-5px);}}

.quick-replies{padding:10px 14px;display:flex;gap:8px;flex-wrap:wrap;background:#fff;border-top:1px solid #f0ede8;}
.qr-label{width:100%;font-size:11px;color:#94a3b8;margin-bottom:2px;}
.qr-btn{background:#fff;border:1px solid #c8a96e;color:#1e3a5f;font-size:12px;font-weight:600;padding:7px 14px;border-radius:20px;cursor:pointer;font-family:'Poppins',sans-serif;transition:all 0.2s;}
.qr-btn:hover{background:#c8a96e;color:#fff;}

.chat-footer{padding:12px 14px;border-top:1px solid #f0ede8;display:flex;gap:8px;align-items:center;background:#fff;border-radius:0 0 0 0;}
.chat-footer input{flex:1;background:#f8fafc;border:1.5px solid #e5e7eb;border-radius:24px;padding:10px 16px;font-family:'Poppins',sans-serif;font-size:13px;color:#334155;outline:none;}
.chat-footer input:focus{border-color:#c8a96e;}
.send-btn{width:44px;height:44px;background:linear-gradient(135deg,#c8a96e,#8a6228);border:none;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 20px rgba(200,169,110,0.33);flex-shrink:0;}

.powered{width:100%;max-width:480px;background:#050b16;color:#aaa;padding:12px;display:flex;align-items:center;justify-content:center;gap:6px;font-size:11px;}
</style>
</head>
<body>

<!-- HERO -->
<div class="hero">
  <div class="hero-bg"></div>
  <div class="hero-overlay"></div>

  <div class="hero-top">
    <svg width="34" height="42" viewBox="0 0 36 44" fill="none">
      <line x1="18" y1="0" x2="18" y2="5" stroke="#c8a96e" stroke-width="1.2" stroke-linecap="round"/>
      <circle cx="18" cy="0" r="1.2" fill="#c8a96e"/>
      <polygon points="18,3 14,10 22,10" fill="rgba(200,169,110,0.2)" stroke="#c8a96e" stroke-width="0.8"/>
      <rect x="14" y="10" width="8" height="7" fill="rgba(200,169,110,0.1)" stroke="#c8a96e" stroke-width="0.8" rx="0.3"/>
      <rect x="15.5" y="11.5" width="2" height="2" fill="#c8a96e" opacity="0.7"/>
      <rect x="18.5" y="11.5" width="2" height="2" fill="#c8a96e" opacity="0.4"/>
      <rect x="11" y="17" width="14" height="10" fill="rgba(200,169,110,0.1)" stroke="#c8a96e" stroke-width="0.8" rx="0.3"/>
      <rect x="12.5" y="18.5" width="2.5" height="2.5" fill="#c8a96e" opacity="0.6"/>
      <rect x="16" y="18.5" width="2.5" height="2.5" fill="#c8a96e" opacity="0.3"/>
      <rect x="19.5" y="18.5" width="2.5" height="2.5" fill="#c8a96e" opacity="0.6"/>
      <rect x="12.5" y="22" width="2.5" height="2.5" fill="#c8a96e" opacity="0.3"/>
      <rect x="16" y="22" width="2.5" height="2.5" fill="#c8a96e" opacity="0.6"/>
      <rect x="19.5" y="22" width="2.5" height="2.5" fill="#c8a96e" opacity="0.3"/>
      <rect x="7" y="27" width="22" height="16" fill="rgba(200,169,110,0.1)" stroke="#c8a96e" stroke-width="0.8" rx="0.3"/>
      <rect x="9" y="29" width="3" height="3" fill="#c8a96e" opacity="0.5"/>
      <rect x="13.5" y="29" width="3" height="3" fill="#c8a96e" opacity="0.3"/>
      <rect x="18" y="29" width="3" height="3" fill="#c8a96e" opacity="0.5"/>
      <rect x="22.5" y="29" width="3" height="3" fill="#c8a96e" opacity="0.3"/>
      <rect x="9" y="33.5" width="3" height="3" fill="#c8a96e" opacity="0.3"/>
      <rect x="13.5" y="33.5" width="3" height="3" fill="#c8a96e" opacity="0.5"/>
      <rect x="18" y="33.5" width="3" height="3" fill="#c8a96e" opacity="0.3"/>
      <rect x="22.5" y="33.5" width="3" height="3" fill="#c8a96e" opacity="0.5"/>
      <rect x="4" y="43" width="28" height="1" fill="#c8a96e" opacity="0.3" rx="0.5"/>
    </svg>
    <div>
      <div class="logo-name">${firstName}</div>
      <div class="logo-sub">${lastName || 'Realstate'}</div>
    </div>
  </div>

  <div class="hero-content">
    <div class="broker-big-name">${firstName}<br><span>${lastName}</span></div>
    <div class="broker-location-row">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c8a96e" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
      <span class="broker-loc-text">${broker.city}</span>
    </div>
    <div class="gold-line"></div>
  </div>

  <div class="stats-bar">
    <div class="stat-item">
      <div class="stat-circle">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c8a96e" stroke-width="1.5"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
      </div>
      <div class="stat-val">${broker.stats ? broker.stats.properties : '100+'}</div>
      <div class="stat-lbl">Properties</div>
    </div>
    <div class="stat-item">
      <div class="stat-circle">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c8a96e" stroke-width="1.5"><circle cx="12" cy="8" r="3"/><path d="M6.5 20c0-3 2.5-5 5.5-5s5.5 2 5.5 5"/></svg>
      </div>
      <div class="stat-val">${broker.stats ? broker.stats.experience : '5 Yrs'}</div>
      <div class="stat-lbl">Experience</div>
    </div>
    <div class="stat-item">
      <div class="stat-circle">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c8a96e" stroke-width="1.5"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/></svg>
      </div>
      <div class="stat-val">24/7</div>
      <div class="stat-lbl">Active</div>
    </div>
  </div>

  <div class="badges-row">
    <div class="badge-dark">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#c8a96e" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
      Trusted Agent
    </div>
    <div class="badge-gold">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0a0a0a" stroke-width="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 8.63 19.79 19.79 0 01.12 2.18 2 2 0 012.11 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.91a16 16 0 006.18 6.18l.46-.46a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
      Free Consultation
    </div>
  </div>
</div>

<!-- CHAT BOX -->
<div class="chat-box">
  <div class="specialties">
    ${specialties.map((s, i) => `
    <div class="spec-card">
      ${specIcons[i % specIcons.length]}
      <div class="spec-name">${s.trim()}</div>
      <div class="spec-line"></div>
    </div>`).join('')}
  </div>

  <div class="chat-header">
    <div class="chat-av">${initials}</div>
    <div>
      <div class="chat-name">${broker.name} Assistant</div>
      <div class="chat-sub"><span class="online-dot"></span> Online · Abhi reply karega</div>
    </div>
  </div>

  <div class="chat-body" id="chatBody">
    <div class="date-label">Aaj</div>
    <div class="msg bot"><div class="bubble">Namaste ji! ${broker.name} mein aapka swagat hai 😊 Aap kya dhundh rahe hain?</div><div class="ts">Abhi</div></div>
  </div>

  <div class="quick-replies" id="quickReplies">
    <div class="qr-label">Jaldi select karein:</div>
    <button class="qr-btn" onclick="quickSelect('Kharidna chahta hoon')">🏠 Kharidna Hai</button>
    <button class="qr-btn" onclick="quickSelect('Rent lena chahta hoon')">🔑 Rent Lena Hai</button>
    <button class="qr-btn" onclick="quickSelect('Property sell karni hai')">💰 Sell Karna Hai</button>
    <button class="qr-btn" onclick="quickSelect('Property rent pe deni hai')">📋 Rent Dena Hai</button>
  </div>

  <div class="chat-footer">
    <input type="text" id="msgInput" placeholder="Ya yahan type karein..." onkeypress="if(event.key==='Enter')sendMsg()"/>
    <button class="send-btn" onclick="sendMsg()">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
    </button>
  </div>
</div>

<div class="powered">
  <svg viewBox="0 0 24 24" width="14" height="14"><path d="M12 2.8L20.8 10V19.6a1.1 1.1 0 01-1.1 1.1H4.3a1.1 1.1 0 01-1.1-1.1V10Z" fill="#c8a96e"/></svg>
  <span style="font-weight:700;color:#c8a96e;">EstateBot</span>
  <span>· AI Lead Assistant</span>
</div>

<script>
const sessionId = Math.random().toString(36).substr(2,9);
const brokerId = '${brokerId}';
let leadDone = false;

function getTime(){const n=new Date();return n.getHours()+':'+String(n.getMinutes()).padStart(2,'0');}

function addMsg(text,role){
  const body=document.getElementById('chatBody');
  const d=document.createElement('div');d.className='msg '+role;
  d.innerHTML='<div class="bubble">'+text+'</div><div class="ts">'+getTime()+'</div>';
  body.appendChild(d);body.scrollTop=body.scrollHeight;
}

function showTyping(){
  const body=document.getElementById('chatBody');
  const d=document.createElement('div');d.className='msg bot';d.id='typing';
  d.innerHTML='<div class="typing"><span></span><span></span><span></span></div>';
  body.appendChild(d);body.scrollTop=body.scrollHeight;
}
function removeTyping(){const t=document.getElementById('typing');if(t)t.remove();}

function typeMsg(text,role){
  const body=document.getElementById('chatBody');
  const d=document.createElement('div');d.className='msg '+role;
  const bubble=document.createElement('div');bubble.className='bubble';bubble.innerHTML='';
  const ts=document.createElement('div');ts.className='ts';ts.textContent=getTime();
  d.appendChild(bubble);d.appendChild(ts);body.appendChild(d);body.scrollTop=body.scrollHeight;
  let i=0;
  function typeNext(){if(i<text.length){bubble.innerHTML+=text.charAt(i);i++;body.scrollTop=body.scrollHeight;setTimeout(typeNext,20);}}
  typeNext();
}

function quickSelect(text){
  document.getElementById('quickReplies').style.display='none';
  addMsg(text,'user');showTyping();
  fetch('/api/chat/'+brokerId,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:text,sessionId})})
  .then(r=>r.json()).then(data=>{
    removeTyping();typeMsg(data.reply,'bot');
    if(data.leadComplete){leadDone=true;disableChat();}
  }).catch(()=>{removeTyping();addMsg('Kuch gadbad ho gayi, dobara try karein.','bot');});
}

function disableChat(){
  const inp=document.getElementById('msgInput');
  const sb=document.querySelector('.send-btn');
  inp.disabled=true;inp.placeholder='Shukriya! Hamari team jald contact karegi.';
  inp.style.background='#f0fdf4';inp.style.borderColor='#22c55e';inp.style.color='#15803d';
  if(sb)sb.style.display='none';
}

async function sendMsg(){
  const input=document.getElementById('msgInput');
  const msg=input.value.trim();if(!msg)return;
  if(leadDone){
    const c=msg.toLowerCase();
    if(c.includes('galat')||c.includes('wrong')||c.includes('change')||c.includes('sahi')||c.includes('galti')){
      leadDone=false;input.disabled=false;input.placeholder='Ya yahan type karein...';
      input.style.background='';input.style.borderColor='';input.style.color='';
      const sb=document.querySelector('.send-btn');if(sb)sb.style.display='flex';
    }else return;
  }
  input.value='';addMsg(msg,'user');showTyping();
  try{
    const res=await fetch('/api/chat/'+brokerId,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:msg,sessionId})});
    const data=await res.json();removeTyping();typeMsg(data.reply,'bot');
    if(data.leadComplete){leadDone=true;disableChat();}
  }catch(e){removeTyping();addMsg('Kuch gadbad ho gayi, dobara try karein.','bot');}
}
</script>
</body></html>`;
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🏠 EstateBot running on port ${PORT}`));
