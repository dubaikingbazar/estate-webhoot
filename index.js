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
|||LEAD|||{"name":"NAAM","phone":"PHONE","type":"PROPERTY_TYPE_WITH_BHK","area":"AREA","budget":"BUDGET","intent":"RENT_LENA/RENT_DENA/KHARIDNA/SELL","timeline":"TIMELINE","furnished":"FURNISHED/UNFURNISHED/NA","parking":"YES/NO/NA","special":"ANY_SPECIAL_REQUIREMENTS"}|||

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

- Har reply mein customer ki baat ko acknowledge karo pehle — ek line mein
- Kabhi mat batao ki AI/bot ho — tum broker team ho
- Agar koi property knowledge ka sawaal poochen — genuinely answer karo, lead collection baad mein
- Pressure nahi, trust banao
- Replies short rakho — 2-3 lines max
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
              furnished: leadData.furnished || null
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
  const specialties = broker.specialty ? broker.specialty.split(',').map(s => `<span class="ptag">${s.trim()}</span>`).join('') : '';
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
.lc-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;}
.lc-item{background:#f0fdf4;border-radius:8px;padding:8px 10px;}
.li{font-size:10px;color:#86efac;font-weight:600;text-transform:uppercase;}
.lv{font-size:13px;color:#15803d;font-weight:600;margin-top:1px;}
.lc-email{margin-top:10px;background:#16a34a;color:#fff;font-size:12px;font-weight:600;padding:9px;border-radius:8px;text-align:center;}
.chat-footer{padding:12px 14px;border-top:1px solid #e2e8f0;display:flex;gap:8px;align-items:center;}
.chat-footer input{flex:1;background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:24px;padding:10px 16px;font-family:'Poppins',sans-serif;font-size:13px;color:#334155;outline:none;}
.chat-footer input:focus{border-color:#1e3a5f;}
.chat-footer input::placeholder{color:#94a3b8;}
.send{width:42px;height:42px;background:linear-gradient(135deg,#1e3a5f,#2d5a8e);border:none;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
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
  <div class="nav-badge">Live</div>
</div>
<div class="hero">
  <svg viewBox="0 0 90 120" width="75" height="100" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#1a2a4a"/><stop offset="0.5" stop-color="#2d4a7a"/><stop offset="1" stop-color="#1a2a4a"/></linearGradient>
      <linearGradient id="gl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7eb8f7" stop-opacity="0.9"/><stop offset="1" stop-color="#3a78c9" stop-opacity="0.5"/></linearGradient>
    </defs>
    <line x1="45" y1="0" x2="45" y2="16" stroke="#f59e0b" stroke-width="2.5" stroke-linecap="round"/>
    <polygon points="45,8 37,26 53,26" fill="url(#bg)"/>
    <rect x="39" y="26" width="12" height="18" fill="url(#bg)" rx="1"/>
    <rect x="35" y="44" width="20" height="26" fill="url(#bg)" rx="1"/>
    <rect x="29" y="70" width="32" height="38" fill="url(#bg)" rx="1"/>
    <ellipse cx="45" cy="116" rx="28" ry="3" fill="rgba(245,158,11,0.1)"/>
  </svg>
  <div class="broker-name-h">${broker.name}</div>
  <div class="broker-loc">${broker.city}</div>
  <div class="broker-stats">
    <div class="stat"><div class="sv">24/7</div><div class="sl">Active</div></div>
    <div class="stat"><div class="sv">AI</div><div class="sl">Powered</div></div>
    <div class="stat"><div class="sv">Fast</div><div class="sl">Response</div></div>
  </div>
</div>
<div class="prop-tags">${specialties}</div>
<div class="chat-wrap">
  <div class="chat-header">
    <div class="chat-av"><svg viewBox="0 0 24 24" width="22" height="22"><path d="M12 2.8L20.8 10V19.6a1.1 1.1 0 01-1.1 1.1H4.3a1.1 1.1 0 01-1.1-1.1V10Z" fill="#fff"/><circle cx="12" cy="13.6" r="2.2" fill="#f59e0b"/></svg></div>
    <div><div class="ci-name">${broker.name} Assistant</div><div class="ci-sub"><span class="online"></span> Online</div></div>
    <div class="ch-right"><div class="cr1">24x7 Active</div><div class="cr2">AI Powered</div></div>
  </div>
  <div class="chat-body" id="chatBody">
    <div class="date-label">Aaj</div>
    <div class="msg bot"><div class="bubble">Namaste! ${broker.name} mein aapka swagat hai. Aap kya dhundh rahe hain — kharidna, rent lena, ya apni property sell/rent-out karni hai?</div><div class="ts">Abhi</div></div>
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
function addMsg(text,role){
  const body=document.getElementById('chatBody');
  const d=document.createElement('div');d.className='msg '+role;
  d.innerHTML='<div class="bubble">'+text+'</div><div class="ts">'+getTime()+'</div>';
  body.appendChild(d);
  body.scrollTop=body.scrollHeight;
}
function showTyping(){
  const body=document.getElementById('chatBody');
  const d=document.createElement('div');
  d.className='msg bot';d.id='typing';
  d.innerHTML='<div class="typing"><span></span><span></span><span></span></div>';
  body.appendChild(d);
  body.scrollTop=body.scrollHeight;
}
function removeTyping(){const t=document.getElementById('typing');if(t)t.remove();}

function typeMsg(text, role) {
  const body = document.getElementById('chatBody');
  const d = document.createElement('div');
  d.className = 'msg ' + role;
  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.textContent = '';
  const ts = document.createElement('div');
  ts.className = 'ts';
  ts.textContent = getTime();
  d.appendChild(bubble);
  d.appendChild(ts);
  body.appendChild(d);
  body.scrollTop = body.scrollHeight;

  let i = 0;
  const chars = text.split('');
  const interval = setInterval(() => {
    if (i < chars.length) {
      bubble.textContent += chars[i];
      i++;
      body.scrollTop = body.scrollHeight;
    } else {
      clearInterval(interval);
    }
  }, 18);
}
async function sendMsg(){
  const input=document.getElementById('msgInput');
  const msg=input.value.trim();if(!msg)return;

  // Agar lead done hai but user number correction kar raha hai
  if(leadDone){
    const correction = msg.toLowerCase();
    if(correction.includes('galat') || correction.includes('wrong') || correction.includes('change') || correction.includes('correct') || correction.includes('sahi') || correction.includes('galti')){
      leadDone=false;
      input.disabled=false;
      input.placeholder='Apna message yahan likhein...';
      input.style.background='';
      input.style.borderColor='';
      input.style.color='';
      const sendBtn=document.querySelector('.send');
      if(sendBtn) sendBtn.style.display='flex';
    } else {
      return;
    }
  }

  input.value='';addMsg(msg,'user');showTyping();
  try{
    const res=await fetch('/api/chat/'+brokerId,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:msg,sessionId})});
    const data=await res.json();removeTyping();
    typeMsg(data.reply,'bot');
    if(data.leadComplete){
      leadDone=true;
      const inp=document.getElementById('msgInput');
      const sendBtn=document.querySelector('.send');
      inp.disabled=true;
      inp.placeholder='Shukriya! Hamari team jald contact karegi.';
      inp.style.background='#f0fdf4';
      inp.style.borderColor='#22c55e';
      inp.style.color='#15803d';
      if(sendBtn) sendBtn.style.display='none';
    }
  }catch(e){removeTyping();addMsg('Kuch gadbad ho gayi, dobara try karein.','bot');}
}
</script>
</body></html>`;
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🏠 EstateBot running on port ${PORT}`));
