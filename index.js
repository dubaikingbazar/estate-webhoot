const express = require('express');
const { Resend } = require('resend');
const { createClient } = require('@supabase/supabase-js');
const app = express();
app.use(express.json());

// ===== KEYS =====
const GROQ_API_KEY = process.env.GROQ_API_KEY || "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";
const resend = new Resend('re_7HnaPfwP_Cso6RXqBYX7A4apowdzvd6kQ');
const supabase = createClient(
  'https://rpswzqgzcautmfjpgohh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwc3d6cWd6Y2F1dG1manBnb2hoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTkyMjYzMCwiZXhwIjoyMDk3NDk4NjMwfQ.v48pCXRn0DTb2dUJv8bhBgoB-vxINiWR-wqlDc7vAFQ'
);

const conversations = {};
const tempUploads = {};

// ===== AI PROMPT =====
const getSystemPrompt = (brokerName) => `
Tum "${brokerName}" ke real estate consultant ho. Natural, warm Hinglish mein baat karo — bilkul WhatsApp jaisi. Kabhi AI/bot mat batao.
Short messages — ek sawaal ek baar. "ji", "acha", "bilkul" use karo.

CONVERSATION FLOW — EK SAWAAL EK BAAR, BILKUL NATURAL:

Step 1 — Warm greeting:
"Namaste ji! ${brokerName} mein aapka swagat hai 😊 Aap property kharidna chahte hain, rent lena hai, ya apni property sell/rent pe deni hai?"

Step 2 — Intent pe react karo, naam puchho:
[Intent pe genuinely react karo — jaise real insaan karta hai]
"Acha! Aapka naam kya hai?"

Step 3 — Property type:
"[Naam] ji, kaunsi property mein interest hai? Flat, House/Makan, Kothi, Villa, Plot/Zameen, Dukan/Shop, Office, Showroom, Industrial, ya Farm House?"

Step 4 — Property specific sawaal (INTENT KE HISAAB SE):

AGAR INTENT = KHARIDNA ya RENT LENA (buyer/tenant):

  Agar FLAT/APARTMENT:
  - "Kitne BHK chahiye?"
  - Phir: "Furnished chahiye, semi-furnished, ya unfurnished?"
  - Phir: "Car parking ki zaroorat hai?"
  - Phir: "Lift aur society chahiye ya independent building theek hai?"
  - Phir: "Kitne family members ke liye hai?"
  - Phir: "Loan lena hai ya cash payment?"

  Agar HOUSE/MAKAN:
  - "Kitne kamre chahiye?"
  - Phir: "Plot size roughly kitna chahiye? (gaj mein)"
  - Phir: "Kitni manzil chahiye?"
  - Phir: "Ground floor zaroori hai?"

  Agar KOTHI:
  - "Plot size roughly kitna chahiye? (gaj mein)"
  - Phir: "Kitne kamre chahiye?"
  - Phir: "Garden chahiye?"
  - Phir: "Loan lena hai ya cash?"

  Agar VILLA:
  - "Plot size roughly kitna chahiye?"
  - Phir: "Kitne floors chahiye?"
  - Phir: "Garden ya parking ki koi specific requirement hai?"

  Agar PLOT/ZAMEEN ya AGRICULTURAL LAND/KHET:
  - "Kitne gaj ya acre ka plot chahiye?"
  - Phir: "Corner plot chahiye ya normal?"
  - Phir: "Registry ready chahiye?"

  Agar DUKAN/SHOP:
  - "Kitna area chahiye? (sq ft mein)"
  - Phir: "Main road pe chahiye ya andar?"
  - Phir: "Parking important hai?"

  Agar OFFICE:
  - "Kitna carpet area chahiye?"
  - Phir: "Kitne logo ke liye hai?"
  - Phir: "Parking chahiye?"

  Agar SHOWROOM:
  - "Kitna area chahiye?"
  - Phir: "Main road/highway pe chahiye?"

  Agar INDUSTRIAL (warehouse/factory/shed):
  - "Warehouse chahiye, factory, ya shed?"
  - Phir: "Kitna area chahiye? (sq ft/acre)"
  - Phir: "Highway ke paas chahiye?"
  - Phir: "Heavy power supply ki zaroorat hai?"

  Agar FARM HOUSE:
  - "Kitne acre ki zameen chahiye?"
  - Phir: "Construction chahiye saath mein?"

  Agar PG/HOSTEL:
  - "Single room chahiye ya sharing?"
  - Phir: "Khana chahiye saath mein?"

AGAR INTENT = SELL ya RENT DENA (seller/landlord):

  Agar FLAT/APARTMENT:
  - "Kitne BHK ka flat hai?"
  - Phir: "Furnished hai, semi-furnished, ya unfurnished?"
  - Phir: "Flat ka approximate area kitna hai?"
  - Phir: "Kitne saal purana hai?"
  - Phir: "Price negotiable hai?"
  - Phir: "Documents/Registry ready hai?"

  Agar HOUSE/MAKAN:
  - "Kitne kamre hain?"
  - Phir: "Plot size kitna hai? (gaj mein)"
  - Phir: "Kitni manzil hai?"
  - Phir: "Kitne saal purana hai?"
  - Phir: "Registry complete hai?"
  - Phir: "Price negotiable hai?"

  Agar KOTHI:
  - "Plot size kitna hai? (gaj mein)"
  - Phir: "Kitne kamre hain?"
  - Phir: "Kitne saal purani hai?"
  - Phir: "Registry ready hai?"

  Agar VILLA:
  - "Plot size kitna hai?"
  - Phir: "Kitne floors hain?"
  - Phir: "Kitne saal purana hai?"

  Agar PLOT/ZAMEEN ya AGRICULTURAL LAND/KHET:
  - "Kitne gaj ya acre ka plot hai?"
  - Phir: "Corner plot hai ya normal?"
  - Phir: "Registry complete hai?"
  - Phir: "Kitni jaldi bechna hai?"

  Agar DUKAN/SHOP:
  - "Kitna area hai?"
  - Phir: "Main road pe hai ya andar?"
  - Phir: "Kitne saal purani hai?"
  - Phir: "Price negotiable hai?"

  Agar OFFICE:
  - "Carpet area kitna hai?"
  - Phir: "Floor number kya hai?"
  - Phir: "Furnished hai?"

  Agar SHOWROOM:
  - "Kitna area hai?"
  - Phir: "Main road pe hai?"

  Agar INDUSTRIAL:
  - "Warehouse hai, factory, ya shed?"
  - Phir: "Area kitna hai?"
  - Phir: "Highway se kitni door hai?"

  Agar FARM HOUSE:
  - "Kitne acre ka hai?"
  - Phir: "Construction hai saath mein?"
  - Phir: "Registry ready hai?"

  STRICT RULE — SELL/RENT DENA mein KABHI MAT PUCHHO:
  - Lift chahiye ya nahi
  - Parking chahiye ya nahi
  - Society chahiye ya nahi

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

Thank you message — BILKUL EXACTLY YE LIKHO:
"Bahut shukriya [Naam] ji! Aapki saari details note ho gayi hain 😊 Hamare senior advisor kal tak aapko call karenge. Koi bhi sawaal ho toh pooch sakte ho!"
STRICT RULES:
- EK sawaal EK baar — kabhi 2 ek saath nahi
- Jo bataya wo dobara mat puchho
- Pehle message ke baad dobara swagat mat karo
- 2-3 lines max per message
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
<head><meta charset="UTF-8"><meta name="color-scheme" content="light"></head>
<body style="margin:0;padding:0;background-color:#f0f4f8;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f4f8;padding:20px 0;">
<tr><td align="center">
<table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;">
  <tr><td style="background:linear-gradient(135deg,#1e3a5f,#2d5a8e);border-radius:14px;padding:32px 24px;text-align:center;" align="center">
    <p style="font-size:10px;color:#94a3b8;letter-spacing:3px;text-transform:uppercase;margin:0 0 12px;">${broker.name} &middot; New Lead</p>
    <div style="width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,#f59e0b,#d97706);margin:0 auto 14px;line-height:64px;text-align:center;">
      <span style="font-size:28px;line-height:64px;">&#128100;</span>
    </div>
    <h2 style="color:#ffffff;margin:0 0 6px;font-size:28px;font-weight:700;font-family:Arial,sans-serif;">${leadData.name}</h2>
    <p style="margin:0 0 16px;color:#94a3b8;font-size:13px;">${leadData.intent || 'Property Enquiry'}</p>
    <a href="tel:${leadData.phone}" style="background:#f59e0b;color:#000000;padding:13px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:16px;display:inline-block;font-family:Arial,sans-serif;">&#128222; ${leadData.phone}</a>
  </td></tr>
  <tr><td height="16"></td></tr>
  <tr><td style="background:#ffffff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="padding:14px 20px;background:#f8fafc;border-bottom:1px solid #e2e8f0;">
        <p style="margin:0;font-size:11px;font-weight:700;color:#1e3a5f;letter-spacing:2px;text-transform:uppercase;font-family:Arial,sans-serif;">Property Requirements</p>
      </td></tr>
      <tr><td>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="padding:14px 20px;width:44%;color:#64748b;font-size:13px;font-family:Arial,sans-serif;border-bottom:1px solid #f1f5f9;">Property Type</td>
            <td style="padding:14px 20px;font-weight:700;color:#1e293b;font-size:14px;font-family:Arial,sans-serif;border-bottom:1px solid #f1f5f9;">${leadData.type || '&mdash;'}</td></tr>
          <tr style="background:#f8fafc;"><td style="padding:14px 20px;color:#64748b;font-size:13px;font-family:Arial,sans-serif;border-bottom:1px solid #f1f5f9;">Preferred Area</td>
            <td style="padding:14px 20px;font-weight:700;color:#1e293b;font-size:14px;font-family:Arial,sans-serif;border-bottom:1px solid #f1f5f9;">${leadData.area || '&mdash;'}</td></tr>
          <tr><td style="padding:14px 20px;color:#64748b;font-size:13px;font-family:Arial,sans-serif;border-bottom:1px solid #f1f5f9;">Budget</td>
            <td style="padding:14px 20px;font-weight:700;color:#16a34a;font-size:18px;font-family:Arial,sans-serif;border-bottom:1px solid #f1f5f9;">${leadData.budget || '&mdash;'}</td></tr>
          <tr style="background:#f8fafc;"><td style="padding:14px 20px;color:#64748b;font-size:13px;font-family:Arial,sans-serif;border-bottom:1px solid #f1f5f9;">Car Parking</td>
            <td style="padding:14px 20px;font-weight:700;color:#1e293b;font-size:14px;font-family:Arial,sans-serif;border-bottom:1px solid #f1f5f9;">${leadData.parking || 'Not specified'}</td></tr>
          <tr><td style="padding:14px 20px;color:#64748b;font-size:13px;font-family:Arial,sans-serif;">Timeline</td>
            <td style="padding:14px 20px;font-weight:700;color:#1e293b;font-size:14px;font-family:Arial,sans-serif;">${leadData.timeline || 'Not specified'}</td></tr>
        </table>
      </td></tr>
    </table>
  </td></tr>
  <tr><td height="12"></td></tr>
  <tr><td style="background:#ffffff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="padding:14px 20px;background:#f8fafc;border-bottom:1px solid #e2e8f0;">
        <p style="margin:0;font-size:11px;font-weight:700;color:#1e3a5f;letter-spacing:2px;text-transform:uppercase;font-family:Arial,sans-serif;">Contact Details</p>
      </td></tr>
      <tr><td>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="padding:14px 20px;width:44%;color:#64748b;font-size:13px;font-family:Arial,sans-serif;border-bottom:1px solid #f1f5f9;">Name</td>
            <td style="padding:14px 20px;font-weight:700;color:#1e293b;font-size:15px;font-family:Arial,sans-serif;border-bottom:1px solid #f1f5f9;">${leadData.name}</td></tr>
          <tr><td style="padding:14px 20px;color:#64748b;font-size:13px;font-family:Arial,sans-serif;">Phone / WhatsApp</td>
            <td style="padding:14px 20px;font-weight:700;color:#1e293b;font-size:22px;font-family:Arial,sans-serif;">${leadData.phone}</td></tr>
        </table>
      </td></tr>
    </table>
  </td></tr>
  <tr><td height="16"></td></tr>
  <tr><td align="center">
    <a href="tel:${leadData.phone}" style="background:linear-gradient(135deg,#1e3a5f,#2d5a8e);color:#ffffff;padding:16px 48px;border-radius:10px;text-decoration:none;font-weight:700;font-size:16px;display:inline-block;font-family:Arial,sans-serif;">&#128222; Call Now &mdash; ${leadData.phone}</a>
  </td></tr>
  <tr><td height="16"></td></tr>
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
      <a href="https://estatebotai.in/${broker.broker_id}" style="color:#1e3a5f;font-size:15px;font-weight:700;">
        https://estatebotai.in/${broker.broker_id}
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
  const { name, business, city, state, specialty, email, phone, experience, properties, password } = req.body;
  if (!name || !business || !city || !email || !phone || !password) {
    return res.status(400).json({ error: 'Saari details bharo' });
  }
  const broker_id = business.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 30);
  const { data: existing } = await supabase
    .from('brokers')
    .select('broker_id')
    .eq('broker_id', broker_id)
    .single();
  const finalId = existing ? `${broker_id}-${Date.now().toString().slice(-4)}` : broker_id;
  const { error } = await supabase.from('brokers').insert([{
    broker_id: finalId,
    name: business,
    email,
    phone,
    password,
    city: city + (state ? ', ' + state : ''),
    specialty: specialty || 'Residential',
    status: 'trial',
    stats: {
      experience: experience ? experience + ' Yrs' : '5 Yrs',
      properties: properties || '100+'
    }
  }]);
  if (error) {
    console.error('Supabase error:', error);
    return res.status(500).json({ error: 'Database error' });
  }
  await sendWelcomeEmail({ name, broker_id: finalId, email });
  res.json({ success: true, broker_id: finalId, url: `https://estatebotai.in/${finalId}` });
});

// ===== BROKER AUTH API =====
app.post('/api/broker-auth', async (req, res) => {
  const { broker_id, password } = req.body;
  if (!broker_id || !password) {
    return res.status(400).json({ error: 'Broker ID aur password dono chahiye' });
  }
  const { data: broker, error } = await supabase
    .from('brokers')
    .select('*')
    .eq('broker_id', broker_id)
    .single();
  if (error || !broker) {
    return res.status(404).json({ error: 'Broker nahi mila' });
  }
  if (broker.password !== password) {
    return res.status(401).json({ error: 'Password galat hai' });
  }
  res.json({ success: true, broker_id: broker.broker_id });
});

app.get('/broker-login', (req, res) => {
  res.sendFile(__dirname + '/broker-login.html');
});

app.get('/dashboard', (req, res) => {
  res.sendFile(__dirname + '/broker-dashboard.html');
});

// ===== TEMP UPLOAD TOKEN API =====
app.post('/api/temp-upload-token', (req, res) => {
  const { sessionId } = req.body;
  if (!sessionId) return res.status(400).json({ error: 'Session ID chahiye' });
  const token = 'tmp_' + Math.random().toString(36).substr(2,12) + Date.now().toString(36);
  tempUploads[token] = { sessionId, photos: [], createdAt: Date.now() };
  const now = Date.now();
  Object.keys(tempUploads).forEach(k => {
    if (now - tempUploads[k].createdAt > 7200000) delete tempUploads[k];
  });
  res.json({ success: true, token, uploadUrl: 'https://estatebotai.in/upload/' + token });
});

app.get('/upload/:token', (req, res) => {
  res.sendFile(__dirname + '/upload.html');
});

app.post('/api/upload/:token', async (req, res) => {
  const { token } = req.params;
  if (token.startsWith('tmp_') && tempUploads[token]) {
    return res.json({ success: true, temp: true, token });
  }
  const { data: lead, error } = await supabase
    .from('leads')
    .select('*')
    .eq('upload_token', token)
    .single();
  if (error || !lead) return res.status(404).json({ error: 'Invalid link' });
  res.json({ success: true, lead_id: lead.id, broker_id: lead.broker_id });
});

app.post('/api/upload-image/:token', async (req, res) => {
  const { token } = req.params;
  const { fileName, fileType } = req.body;
  let folderPath;
  if (token.startsWith('tmp_') && tempUploads[token]) {
    folderPath = token;
  } else {
    const { data: lead } = await supabase
      .from('leads')
      .select('id')
      .eq('upload_token', token)
      .single();
    if (!lead) return res.status(404).json({ error: 'Invalid token' });
    folderPath = lead.id;
  }
  const filePath = folderPath + '/' + Date.now() + '-' + fileName;
  const { data, error } = await supabase.storage
    .from('property-images')
    .createSignedUploadUrl(filePath);
  if (error) return res.status(500).json({ error: error.message });
  if (token.startsWith('tmp_') && tempUploads[token]) {
    tempUploads[token].photos.push(filePath);
  }
  res.json({ signedUrl: data.signedUrl, path: filePath });
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
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        messages: [{ role: 'system', content: getSystemPrompt(broker.name) }, ...conversations[sessionId]]
      })
    });
    const data = await groqRes.json();
    console.log('Groq response status:', groqRes.status);
    if (!data.choices || !data.choices[0]) {
      console.error('Groq error response:', JSON.stringify(data));
    }
    let reply = data.choices?.[0]?.message?.content || 'Kuch gadbad ho gayi, dobara try karein.';
    conversations[sessionId].push({ role: 'assistant', content: reply });

    let leadComplete = false;
    let leadData = null;

    if (reply.includes('|||LEAD|||')) {
      const match = reply.match(/\|\|\|LEAD\|\|\|(.+?)\|\|\|/);
      if (match) {
        try {
          leadData = JSON.parse(match[1]);
          if (!leadData.phone || leadData.phone.length < 8) {
            reply = reply.replace(/\|\|\|LEAD\|\|\|.+?\|\|\|/s, '').trim();
            leadComplete = false;
            leadData = null;
          } else {
            reply = reply.replace(/\|\|\|LEAD\|\|\|.+?\|\|\|/s, '').trim();
            const { data: insertedLead, error: insertError } = await supabase.from('leads').insert([{
              broker_id: brokerId,
              name: leadData.name,
              phone: leadData.phone,
              property_type: leadData.type,
              area: leadData.area,
              budget: leadData.budget,
              intent: leadData.intent,
              timeline: leadData.timeline || null,
              furnished: leadData.furnished || null,
              parking: leadData.parking || null,
              special_requirements: leadData.special || null,
              upload_token: null
            }]).select().single();
            if (insertError) console.error('Lead insert error:', JSON.stringify(insertError));
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

// ===== LEGAL PAGES =====
app.get("/privacy", (req, res) => { res.sendFile(__dirname + "/privacy.html"); });
app.get("/terms", (req, res) => { res.sendFile(__dirname + "/terms.html"); });
app.get('/admin', (req, res) => { res.sendFile(__dirname + '/admin.html'); });
app.get('/', (req, res) => { res.sendFile(__dirname + '/landing.html'); });

// ===== BROKER PAGE =====
app.get('/:brokerId', async (req, res) => {
  const { brokerId } = req.params;
  const reserved = ['upload', 'privacy', 'terms', 'admin', 'dashboard', 'broker-login', 'api'];
  if (reserved.includes(brokerId)) return res.status(404).send('<h1 style="font-family:Arial;text-align:center;margin-top:100px;">Page not found</h1>');
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
  const specialties = broker.specialty ? broker.specialty.split(',') : ['Residential'];
  const initials = broker.name.split(' ').map(w => w[0]).join('').substring(0,2).toUpperCase();
  const experience = (broker.stats && broker.stats.experience) ? broker.stats.experience : '5 Yrs';
  const properties = (broker.stats && broker.stats.properties) ? broker.stats.properties : '100+';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${broker.name} — EstateBotAI</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box;}
:root{
  --bg:#0f0f0d;--card:#1a1a16;--secondary:#222220;
  --gold:#c9a84c;--gold2:#e2c46e;--gold-soft:rgba(201,168,76,0.12);--gold-fg:#0a0a0a;
  --fg:#f0ede6;--muted:#7a776e;--online:#4ade80;
  --border:rgba(201,168,76,0.12);--border2:rgba(255,255,255,0.06);
}
html,body{height:100%;font-family:'Inter',sans-serif;background:var(--bg);color:var(--fg);overflow:hidden;}
.page{display:flex;flex-direction:column;height:100vh;max-width:480px;margin:0 auto;}

/* PROFILE — compact */
.profile{border-bottom:1px solid var(--border);flex-shrink:0;position:relative;overflow:hidden;}
.profile-glow{position:absolute;top:-80px;left:50%;transform:translateX(-50%);width:360px;height:200px;background:radial-gradient(ellipse,rgba(201,168,76,0.08),transparent 65%);pointer-events:none;}
.profile-main{position:relative;display:flex;align-items:center;gap:14px;padding:16px 16px 12px;}
.av-wrap{position:relative;flex-shrink:0;}
.av{width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,var(--gold2),var(--gold),#8a6820);display:flex;align-items:center;justify-content:center;font-family:'Playfair Display',serif;font-size:22px;font-weight:700;color:var(--gold-fg);box-shadow:0 0 20px rgba(201,168,76,0.2);}
.av-dot{position:absolute;bottom:1px;right:1px;width:14px;height:14px;border-radius:50%;background:var(--online);border:2px solid var(--bg);}
.profile-info{flex:1;min-width:0;}
.broker-name{font-family:'Playfair Display',serif;font-size:18px;font-weight:700;letter-spacing:-0.2px;margin-bottom:3px;}
.broker-loc{display:flex;align-items:center;gap:4px;font-size:12px;color:var(--muted);margin-bottom:8px;}
.specs{display:flex;flex-wrap:wrap;gap:5px;}
.spec{font-size:11px;font-weight:500;color:var(--gold);background:var(--gold-soft);border:1px solid rgba(201,168,76,0.2);border-radius:100px;padding:3px 10px;}

/* Stats — single row compact */
.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:var(--border);border-top:1px solid var(--border);}
.stat{background:var(--card);padding:10px 8px;display:flex;flex-direction:column;align-items:center;gap:2px;}
.stat svg{color:var(--gold);}
.stat-val{font-size:13px;font-weight:600;color:var(--fg);}
.stat-lbl{font-size:9px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);}

/* CHAT — takes remaining space */
.chat{display:flex;flex-direction:column;flex:1;min-height:0;}
.chat-bar{display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid var(--border);background:rgba(26,26,22,0.8);backdrop-filter:blur(12px);flex-shrink:0;}
.chat-bar-av{width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,var(--gold2),var(--gold));display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:var(--gold-fg);position:relative;flex-shrink:0;}
.chat-bar-dot{position:absolute;bottom:-1px;right:-1px;width:10px;height:10px;border-radius:50%;background:var(--online);border:2px solid var(--card);}
.chat-bar-name{font-size:13px;font-weight:600;}
.chat-bar-status{font-size:11px;color:var(--online);display:flex;align-items:center;gap:4px;margin-top:1px;}
.chat-bar-pulse{width:5px;height:5px;border-radius:50%;background:var(--online);}

.msgs{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px;}
.msgs::-webkit-scrollbar{width:3px;}
.msgs::-webkit-scrollbar-thumb{background:var(--border);border-radius:2px;}
.msg-row{display:flex;align-items:flex-end;gap:8px;}
.msg-row.user{flex-direction:row-reverse;}
.msg-av{width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,var(--gold2),var(--gold));display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:var(--gold-fg);flex-shrink:0;}
.bubble{max-width:80%;padding:10px 14px;border-radius:16px;font-size:13px;line-height:1.6;}
.bubble.ai{background:var(--card);color:var(--fg);border:1px solid var(--border2);border-bottom-left-radius:4px;}
.bubble.ai .hi{color:var(--gold);font-weight:600;}
.bubble.user{background:linear-gradient(135deg,var(--gold2),var(--gold));color:var(--gold-fg);font-weight:500;border-bottom-right-radius:4px;}
.typing{display:flex;align-items:center;gap:4px;padding:10px 14px;background:var(--card);border:1px solid var(--border2);border-radius:16px;border-bottom-left-radius:4px;width:fit-content;}
.typing span{width:5px;height:5px;border-radius:50%;background:var(--muted);animation:td 1.2s infinite ease-in-out;}
.typing span:nth-child(2){animation-delay:0.2s;}
.typing span:nth-child(3){animation-delay:0.4s;}
@keyframes td{0%,60%,100%{transform:translateY(0);opacity:0.4;}30%{transform:translateY(-4px);opacity:1;}}

.qrs{display:flex;flex-wrap:wrap;gap:7px;padding:8px 14px 4px;flex-shrink:0;}
.qr{font-size:12px;font-weight:500;color:var(--gold);background:var(--gold-soft);border:1px solid rgba(201,168,76,0.22);border-radius:100px;padding:7px 14px;cursor:pointer;transition:all 0.2s;white-space:nowrap;}
.qr:hover{background:var(--gold);color:var(--gold-fg);}

.input-bar{display:flex;align-items:center;gap:10px;padding:10px 14px 14px;border-top:1px solid var(--border);background:rgba(26,26,22,0.8);backdrop-filter:blur(12px);flex-shrink:0;}
.msg-input{flex:1;background:var(--secondary);border:1px solid var(--border2);border-radius:100px;padding:11px 16px;font-family:'Inter',sans-serif;font-size:13px;color:var(--fg);outline:none;transition:border-color 0.2s;}
.msg-input:focus{border-color:rgba(201,168,76,0.4);}
.msg-input::placeholder{color:var(--muted);}
.send{width:42px;height:42px;border-radius:50%;background:linear-gradient(135deg,var(--gold2),var(--gold));border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 4px 14px rgba(201,168,76,0.3);transition:all 0.2s;}
.send:hover{transform:scale(1.05);}
.send:disabled{opacity:0.5;cursor:not-allowed;transform:none;}
.powered{text-align:center;padding:7px;font-size:11px;color:var(--muted);border-top:1px solid var(--border);flex-shrink:0;}
.powered strong{color:var(--fg);font-weight:600;}
.lead-done{background:rgba(74,222,128,0.05)!important;border-color:rgba(74,222,128,0.2)!important;color:#4ade80!important;}
</style>
</head>
<body>
<div class="page">
  <div class="profile">
    <div class="profile-glow"></div>
    <div class="profile-main">
      <div class="av-wrap">
        <div class="av">${initials}</div>
        <div class="av-dot"></div>
      </div>
      <div class="profile-info">
        <div class="broker-name">${broker.name}</div>
        <div class="broker-loc">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#c9a84c" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
          ${broker.city}
        </div>
        <div class="specs">${specialties.map(s => `<span class="spec">${s.trim()}</span>`).join('')}</div>
      </div>
    </div>
    <div class="stats">
      <div class="stat">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/></svg>
        <span class="stat-val">${experience}</span>
        <span class="stat-lbl">Experience</span>
      </div>
      <div class="stat">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>
        <span class="stat-val">${properties}</span>
        <span class="stat-lbl">Deals</span>
      </div>
      <div class="stat">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
        <span class="stat-val">Verified</span>
        <span class="stat-lbl">Status</span>
      </div>
    </div>
  </div>

  <div class="chat">
    <div class="chat-bar">
      <div class="chat-bar-av">${initials}<div class="chat-bar-dot"></div></div>
      <div>
        <div class="chat-bar-name">${broker.name} AI</div>
        <div class="chat-bar-status"><span class="chat-bar-pulse"></span>Online · replies instantly</div>
      </div>
    </div>
    <div class="msgs" id="msgs">
      <div class="msg-row">
        <div class="msg-av">${initials}</div>
        <div class="bubble ai"><span class="hi">Namaste! 🙏</span><br>I'm ${broker.name.split(' ')[0]}'s AI assistant. Looking to buy, sell, or rent in ${broker.city}? Tap below to get started.</div>
      </div>
    </div>
    <div class="qrs" id="qrs">
      <button class="qr" onclick="quickSend(this,'Kharidna Hai')">🏠 Kharidna Hai</button>
      <button class="qr" onclick="quickSend(this,'Rent Lena Hai')">🔑 Rent Lena Hai</button>
      <button class="qr" onclick="quickSend(this,'Sell Karna Hai')">💰 Sell Karna Hai</button>
      <button class="qr" onclick="quickSend(this,'Rent Dena Hai')">📋 Rent Dena Hai</button>
    </div>
    <div class="input-bar">
      <input class="msg-input" id="msgInput" placeholder="Type your message…" onkeypress="if(event.key==='Enter')sendMsg()"/>
      <button class="send" id="sendBtn" onclick="sendMsg()">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#0a0a0a" stroke-width="2.5"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
      </button>
    </div>
  </div>
  <div class="powered">Powered by <strong>EstateBotAI</strong></div>
</div>
<script>
const sessionId=Math.random().toString(36).substr(2,9);
const brokerId='${brokerId}';
const ini='${initials}';
let leadDone=false;
function addMsg(text,role){
  const body=document.getElementById('msgs');
  const row=document.createElement('div');
  row.className='msg-row'+(role==='user'?' user':'');
  if(role==='ai'){row.innerHTML='<div class="msg-av">'+ini+'</div><div class="bubble ai">'+text+'</div>';}
  else{row.innerHTML='<div class="bubble user">'+text+'</div>';}
  body.appendChild(row);body.scrollTop=body.scrollHeight;
}
function showTyping(){
  const body=document.getElementById('msgs');
  const row=document.createElement('div');row.className='msg-row';row.id='typing';
  row.innerHTML='<div class="msg-av">'+ini+'</div><div class="typing"><span></span><span></span><span></span></div>';
  body.appendChild(row);body.scrollTop=body.scrollHeight;
}
function removeTyping(){const t=document.getElementById('typing');if(t)t.remove();}
function typeMsg(text,role){
  const body=document.getElementById('msgs');
  const row=document.createElement('div');
  row.className='msg-row'+(role==='user'?' user':'');
  if(role==='ai'){row.innerHTML='<div class="msg-av">'+ini+'</div><div class="bubble ai"></div>';}
  else{row.innerHTML='<div class="bubble user"></div>';}
  body.appendChild(row);
  const bubble=row.querySelector('.bubble');
  let i=0;function next(){if(i<text.length){bubble.innerHTML+=text.charAt(i);i++;body.scrollTop=body.scrollHeight;setTimeout(next,18);}}
  next();
}
function quickSend(btn,text){
  document.getElementById('qrs').style.display='none';
  addMsg(text,'user');showTyping();
  fetch('/api/chat/'+brokerId,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:text,sessionId})})
  .then(r=>r.json()).then(data=>{removeTyping();typeMsg(data.reply,'ai');if(data.leadComplete){leadDone=true;disableChat();}})
  .catch(()=>{removeTyping();addMsg('Dobara try karein.','ai');});
}
function disableChat(){
  const inp=document.getElementById('msgInput');
  inp.disabled=true;inp.placeholder='Shukriya! Hamare advisor jald contact karenge.';
  inp.classList.add('lead-done');document.getElementById('sendBtn').disabled=true;
}
async function sendMsg(){
  const input=document.getElementById('msgInput');
  const msg=input.value.trim();if(!msg||input.disabled)return;
  if(leadDone){
    const c=msg.toLowerCase();
    if(c.includes('galat')||c.includes('wrong')||c.includes('change')||c.includes('sahi')){
      leadDone=false;input.disabled=false;input.placeholder='Type your message…';
      input.classList.remove('lead-done');document.getElementById('sendBtn').disabled=false;
    }else return;
  }
  input.value='';addMsg(msg,'user');showTyping();
  try{
    const res=await fetch('/api/chat/'+brokerId,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:msg,sessionId})});
    const data=await res.json();removeTyping();typeMsg(data.reply,'ai');
    if(data.leadComplete){leadDone=true;disableChat();}
  }catch(e){removeTyping();addMsg('Kuch gadbad ho gayi, dobara try karein.','ai');}
}
</script>
</body></html>`;
}


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🏠 EstateBot running on port ${PORT}`));
