const express = require('express');
const { Resend } = require('resend');
const { createClient } = require('@supabase/supabase-js');
const app = express();
app.use(express.json());

// ===== KEYS =====
const GROQ_API_KEY = process.env.GROQ_API_KEY || "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";
const resend = new Resend('re_7HnaPfwP_Cso6RXqBYX7A4apowdzvd6kQ');
const supabase = createClient(
  'https://twxtryvauijzxpddapns.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3eHRyeXZhdWlqenhwZGRhcG5zIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjM5OTAwNCwiZXhwIjoyMDk3OTc1MDA0fQ.zkX_8GrePNcZB1YbAb9YmnUO06g_GJ4HeT0wlDkn0rI'
);

const conversations = {};
const tempUploads = {};

// ===== AI PROMPT =====
const getSystemPrompt = (brokerName) => `
Tum "${brokerName}" ke real estate consultant ho. Natural, warm Hinglish mein baat karo \u2014 bilkul WhatsApp jaisi. Kabhi AI/bot mat batao.
Short messages \u2014 ek sawaal ek baar. "ji", "acha", "bilkul" use karo.

CONVERSATION FLOW \u2014 EK SAWAAL EK BAAR, BILKUL NATURAL:

Step 1 \u2014 Warm greeting:
"Namaste ji! ${brokerName} mein aapka swagat hai \ud83d\ude0a Aap property kharidna chahte hain, rent lena hai, ya apni property sell/rent pe deni hai?"

Step 2 \u2014 Intent pe react karo, naam puchho:
[Intent pe genuinely react karo \u2014 jaise real insaan karta hai]
"Acha! Aapka naam kya hai?"

Step 3 \u2014 Property type:
"[Naam] ji, kaunsi property mein interest hai? Flat, House/Makan, Kothi, Villa, Plot/Zameen, Dukan/Shop, Office, Showroom, Industrial, ya Farm House?"

Step 4 \u2014 Property specific sawaal (INTENT KE HISAAB SE):

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

  STRICT RULE \u2014 SELL/RENT DENA mein KABHI MAT PUCHHO:
  - Lift chahiye ya nahi
  - Parking chahiye ya nahi
  - Society chahiye ya nahi

Step 5 \u2014 Location:
"Kaunsa area prefer karenge? Koi specific locality hai mann mein?"

Step 6 \u2014 SELL/RENT DENA wale ke liye PHOTOS (Budget se PEHLE):
Agar intent SELL ya RENT DENA hai \u2014 EXACTLY YE LIKHO:
"[Naam] ji, ek kaam \u2014 apni property ki photos yahan upload karein, jaldi best buyer/tenant milega: |||PHOTO_LINK|||"
Phir customer ka response aane do \u2014 phir budget puchho.

Agar intent KHARIDNA ya RENT LENA hai:
Seedha Step 7 pe jao.

Step 7 \u2014 Budget:
"Budget range roughly kitni hai? \u2014 bilkul honest raho, usi hisaab se sahi options bataunga"

Step 8 \u2014 Timeline:
"Aur kitne time mein lena chahenge \u2014 abhi urgent hai ya thoda time hai?"

Step 9 \u2014 Phone (KABHI SKIP MAT KARO):
"[Naam] ji, ek kaam \u2014 apna WhatsApp number do. Hamare senior advisor directly call karenge aur sab options clearly batayenge. Bilkul free consultation hai \ud83d\udc4d"

SPECIAL CASE \u2014 GALAT NUMBER:
Agar customer bole "number galat hai", "wrong", "change karo" \u2014
Bolo: "[Naam] ji, koi baat nahi! Sahi number bata do."
Naya number lo, phir lead complete karo.

IMPORTANT: Phone number liye BINA lead BILKUL complete mat karna.

Jab naam, phone, property type, area, budget sab mil jaye \u2014 warmly thank karo, phir BILKUL BAAD likho:
|||LEAD|||{"name":"NAAM","phone":"PHONE","type":"PROPERTY_TYPE_WITH_BHK","area":"AREA","budget":"BUDGET","intent":"Rent Lena Chahte Hain/Rent Dena Chahte Hain/Kharidna Chahte Hain/Sell Karna Chahte Hain","timeline":"TIMELINE","furnished":"Furnished/Semi-Furnished/Unfurnished/NA","parking":"Chahiye/Nahi Chahiye/NA","special":"ANY_SPECIAL_REQUIREMENTS"}|||

Agar intent SELL ya RENT DENA hai \u2014 EXACTLY YE LIKHO:
"Bahut shukriya [Naam] ji! Aapki details note ho gayi hain \ud83d\ude0a Apni property ki photos yahan upload karein \u2014 jaldi buyer milega: |||UPLOAD_LINK||| Hamare senior advisor kal tak call karenge!"

Agar intent KHARIDNA ya RENT LENA hai \u2014 EXACTLY YE LIKHO:
"Bahut shukriya [Naam] ji! Aapki saari details note ho gayi hain \ud83d\ude0a Hamare senior advisor kal tak aapko call karenge. Koi bhi sawaal ho toh pooch sakte ho!"

STRICT RULE: |||UPLOAD_LINK||| ko apne words mein mat badlo \u2014 EXACTLY waise hi likho.
STRICT RULES:
- EK sawaal EK baar \u2014 kabhi 2 ek saath nahi
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
    subject: `Naya Lead \u2014 ${leadData.name} | ${broker.name}`,
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
    subject: `EstateBot Setup Complete \u2014 ${broker.name} ka Bot Live Hai!`,
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
  <p style="text-align:center;color:#94a3b8;font-size:11px;margin-top:16px;">Powered by EstateBot \u2022 +91 86903 53003</p>
</div>`
  });
  if (error) console.error('Welcome email error:', error);
  else console.log(`Welcome email sent to ${broker.email}`);
}

// ===== BROKER SIGNUP API =====
app.post('/api/signup', async (req, res) => {
  const { name, business, city, state, specialty, email, phone, experience, properties } = req.body;
  if (!name || !business || !city || !email || !phone) {
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

  if (!Object.values(tempUploads).find(t => t.sessionId === sessionId)) {
    const tempToken = 'tmp_' + Math.random().toString(36).substr(2,12) + Date.now().toString(36);
    tempUploads[tempToken] = { sessionId, photos: [], createdAt: Date.now() };
  }
  const sessionToken = Object.keys(tempUploads).find(k => tempUploads[k].sessionId === sessionId);
  const photoUploadUrl = sessionToken ? 'https://estatebotai.in/upload/' + sessionToken : '';

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
    reply = reply.replace('|||PHOTO_LINK|||', photoUploadUrl);
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
            const uploadToken = Math.random().toString(36).substr(2,12) + Date.now().toString(36);
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
              upload_token: uploadToken
            }]).select().single();
            if (insertError) console.error('Lead insert error:', JSON.stringify(insertError));
            if (sessionToken && tempUploads[sessionToken]) {
              delete tempUploads[sessionToken];
            }
            const uploadUrl = 'https://estatebotai.in/upload/' + uploadToken;
            reply = reply.replace('|||UPLOAD_LINK|||', uploadUrl);
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
  const specialties = broker.specialty ? broker.specialty.split(',') : [];
  const specIcons = [
    '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1e3a5f" stroke-width="1.5"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
    '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1e3a5f" stroke-width="1.5"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>',
    '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1e3a5f" stroke-width="1.5"><path d="M2 20h20M4 20V8l8-6 8 6v12"/><path d="M9 20v-6h6v6"/></svg>',
    '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1e3a5f" stroke-width="1.5"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>'
  ];
  const initials = broker.name.split(' ').map(w => w[0]).join('').substring(0,2).toUpperCase();

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${broker.name} \u2014 EstateBot</title>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=Poppins:wght@300;400;500;600;700&family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:'Poppins',sans-serif;background:#0a0a0a;display:flex;flex-direction:column;align-items:center;min-height:100vh;}
.hero{width:100%;max-width:480px;position:relative;overflow:hidden;min-height:620px;display:flex;flex-direction:column;}
.hero-bg{position:absolute;inset:0;background:#1a1a2e;background-size:cover;background-position:center top;}
.hero-overlay{position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,0.35) 0%,rgba(0,0,0,0.2) 20%,rgba(0,0,0,0.45) 50%,rgba(0,0,0,0.85) 72%,rgba(0,0,0,0.97) 100%);}
.hero-top{position:relative;z-index:2;padding:24px 20px 0;display:flex;align-items:center;gap:12px;}
.logo-name{font-family:'Poppins',sans-serif;font-size:15px;font-weight:700;color:#fff;letter-spacing:2.5px;text-transform:uppercase;line-height:1;}
.logo-sub{font-size:9px;color:#c8a96e;letter-spacing:4px;text-transform:uppercase;margin-top:4px;}
.hero-content{position:relative;z-index:2;padding:0 20px 4px;margin-top:auto;}
.broker-big-name{font-family:'Playfair Display',serif;font-size:54px;font-weight:800;color:#fff;line-height:1.0;letter-spacing:-1.5px;}
.broker-big-name span{color:#c8a96e;}
.broker-location-row{display:flex;align-items:center;gap:6px;margin-top:10px;margin-bottom:8px;}
.broker-loc-text{font-size:13px;color:rgba(255,255,255,0.8);font-weight:400;}
.gold-line{width:42px;height:2px;background:linear-gradient(90deg,#c8a96e,transparent);margin-bottom:18px;}
.stats-bar{position:relative;z-index:2;margin:0 14px 12px;background:rgba(8,8,18,0.82);backdrop-filter:blur(16px);border:1px solid rgba(200,169,110,0.18);border-radius:16px;display:flex;overflow:hidden;}
.stat-item{flex:1;padding:18px 8px;text-align:center;border-right:1px solid rgba(200,169,110,0.12);}
.stat-item:last-child{border-right:none;}
.stat-circle{width:40px;height:40px;border-radius:50%;border:1px solid rgba(200,169,110,0.3);display:flex;align-items:center;justify-content:center;margin:0 auto 10px;}
.stat-val{font-size:21px;font-weight:700;color:#c8a96e;line-height:1;}
.stat-lbl{font-size:10px;color:rgba(255,255,255,0.4);margin-top:3px;letter-spacing:0.5px;}
.badges-row{position:relative;z-index:2;display:flex;gap:10px;padding:0 14px 24px;}
.badge-dark{flex:1;display:flex;align-items:center;justify-content:center;gap:8px;padding:14px;border-radius:12px;font-size:13px;font-weight:600;background:rgba(8,8,18,0.85);border:1px solid rgba(200,169,110,0.3);color:#fff;backdrop-filter:blur(8px);}
.badge-gold{flex:1;display:flex;align-items:center;justify-content:center;gap:8px;padding:14px;border-radius:12px;font-size:13px;font-weight:600;background:linear-gradient(135deg,#c8a96e,#a07840);border:none;color:#0a0a0a;}
.specialties{width:100%;max-width:480px;display:grid;grid-template-columns:repeat(4,1fr);gap:8px;padding:12px;background:#fff;}
.spec-card{background:#fff;border:1px solid #f0ede8;border-radius:10px;padding:14px 6px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:8px;}
.spec-name{font-size:10px;font-weight:600;color:#1e293b;}
.spec-line{width:24px;height:2px;background:#c8a96e;border-radius:2px;}
.chat-wrap{width:100%;max-width:100%;background:#F7F4ED;display:flex;flex-direction:column;position:relative;overflow:hidden;}
.chat-wrap-inner{background:#F7F4ED;padding:20px 16px 16px;position:relative;z-index:1;background-image:radial-gradient(circle at 50% 100%,rgba(212,162,76,.07),transparent 60%);}
.skyline-wm{position:absolute;bottom:0;left:0;right:0;height:130px;opacity:.15;pointer-events:none;z-index:0;}
.agent-card{width:calc(100% + 32px);margin-left:-16px;margin-right:-16px;margin-bottom:16px;background:#fff;border-radius:0;padding:14px 20px;display:flex;align-items:center;gap:10px;box-shadow:0 2px 16px rgba(14,27,48,.08);border-top:1px solid #EDE7D8;border-bottom:1px solid #EDE7D8;position:relative;z-index:1;}
.agent-av{width:38px;height:38px;border-radius:10px;background:#0E1B30;display:flex;align-items:center;justify-content:center;flex-shrink:0;color:#D4A24C;font-family:'Fraunces',serif;font-weight:700;font-size:16px;}
.agent-name{color:#0E1B30;font-weight:800;font-size:10px;font-family:'Fraunces',serif;line-height:1.3;}
.agent-status{display:flex;align-items:center;gap:5px;font-size:9px;color:#5A6B52;margin-top:3px;}
.online-dot{width:6px;height:6px;border-radius:50%;background:#4CAF6D;animation:pulse 2s infinite;}
@keyframes pulse{0%,100%{opacity:1;}50%{opacity:0.4;}}
.agent-meta{margin-left:auto;text-align:right;}
.badge1{font-size:9.5px;color:#2F8F4E;font-weight:800;}
.badge2{font-size:8.2px;color:#B89456;font-weight:700;margin-top:1px;}
.day-chip{text-align:center;margin:14px 0 12px;position:relative;z-index:1;}
.day-chip span{background:#EDE7D8;color:#6B6354;font-size:10px;padding:5px 14px;border-radius:100px;font-weight:600;}
.msg{display:flex;flex-direction:column;max-width:88%;position:relative;z-index:1;}
.msg.bot{align-self:flex-start;}
.msg.user{align-self:flex-end;}
.bubble{font-size:12.5px;line-height:1.5;color:#2A2A2A;}
.bot .bubble{background:#fff;border-left:3px solid #D4A24C;border-radius:4px 16px 16px 16px;padding:14px 16px;box-shadow:0 2px 12px rgba(14,27,48,.06);}
.user .bubble{background:#0E1B30;color:#F4EFE6;border-radius:16px 16px 4px 16px;padding:10px 14px;}
.ts{font-size:9.5px;color:#A39B89;margin-top:5px;margin-left:4px;}
.user .ts{align-self:flex-end;color:#A39B89;}
.typing{display:flex;align-items:center;gap:4px;padding:12px 16px;background:#fff;border-left:3px solid #D4A24C;border-radius:4px 16px 16px 16px;box-shadow:0 2px 12px rgba(14,27,48,.06);width:fit-content;position:relative;z-index:1;}
.typing span{width:6px;height:6px;background:#D4A24C;border-radius:50%;animation:bounce 1.2s infinite;}
.typing span:nth-child(2){animation-delay:0.2s;}
.typing span:nth-child(3){animation-delay:0.4s;}
@keyframes bounce{0%,60%,100%{transform:translateY(0);}30%{transform:translateY(-5px);}}
.quick-replies{padding:14px 16px;display:flex;gap:8px;flex-wrap:wrap;background:#F7F4ED;border-top:1px solid #EDE7D8;position:relative;z-index:1;}
.qr-label{width:100%;font-size:10.8px;color:#8A8270;margin-bottom:6px;}
.qr-btn{background:#fff;border:1.5px solid #D4A24C;color:#0E1B30;font-size:11.2px;font-weight:700;padding:9px 15px;border-radius:100px;cursor:pointer;font-family:'Manrope',sans-serif;display:flex;align-items:center;gap:5px;transition:all 0.2s;}
.qr-btn:hover{background:#D4A24C;color:#fff;}
.chat-footer{padding:14px 16px 18px;border-top:1px solid #EDE7D8;display:flex;gap:10px;align-items:center;background:#F7F4ED;position:relative;z-index:1;}
.chat-footer input{flex:1;background:#fff;border:1.5px solid #D4A24C;border-radius:100px;padding:11px 16px;font-family:'Manrope',sans-serif;font-size:11.7px;color:#2A2A2A;outline:none;}
.chat-footer input:focus{border-color:#0E1B30;}
.send-btn{width:44px;height:44px;background:#0E1B30;border:none;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.powered{width:100%;max-width:100%;background:#F7F4ED;border-top:1px solid #EDE7D8;padding:13px;display:flex;align-items:center;justify-content:center;gap:6px;font-size:10px;color:#6B6354;font-weight:700;}
.chat-body{background:transparent;padding:0;min-height:180px;display:flex;flex-direction:column;gap:10px;overflow-y:auto;max-height:360px;}
.date-label{align-self:center;background:#EDE7D8;color:#6B6354;font-size:10px;padding:5px 14px;border-radius:100px;font-weight:600;}
</style>
</head>
<body>
<div class="hero">
  <div class="hero-bg"></div>
  <div class="hero-overlay"></div>
  <div class="hero-top">
    <svg width="36" height="44" viewBox="0 0 36 44" fill="none">
      <line x1="18" y1="0" x2="18" y2="5" stroke="#c8a96e" stroke-width="1.2" stroke-linecap="round"/>
      <circle cx="18" cy="0" r="1.2" fill="#c8a96e"/>
      <polygon points="18,3 14,10 22,10" fill="rgba(200,169,110,0.2)" stroke="#c8a96e" stroke-width="0.8"/>
      <rect x="14" y="10" width="8" height="7" fill="rgba(200,169,110,0.1)" stroke="#c8a96e" stroke-width="0.8" rx="0.3"/>
      <rect x="15.5" y="11.5" width="2" height="2" fill="#c8a96e" opacity="0.7"/>
      <rect x="18.5" y="11.5" width="2" height="2" fill="#c8a96e" opacity="0.4"/>
      <rect x="15.5" y="14.5" width="2" height="1.5" fill="#c8a96e" opacity="0.4"/>
      <rect x="18.5" y="14.5" width="2" height="1.5" fill="#c8a96e" opacity="0.7"/>
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
      <rect x="4" y="43" width="28" height="1" fill="#c8a96e" opacity="0.4" rx="0.5"/>
    </svg>
    <div>
      <div class="logo-name">${broker.name.split(' ')[0]}</div>
      <div class="logo-sub">${broker.name.split(' ').slice(1).join(' ') || 'Realstate'}</div>
    </div>
  </div>
  <div class="hero-content">
    <div class="broker-big-name">
      ${broker.name.split(' ')[0]}<br>
      <span>${broker.name.split(' ').slice(1).join(' ') || ''}</span>
    </div>
    <div class="broker-location-row">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c8a96e" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
      <span class="broker-loc-text">${broker.city}</span>
    </div>
    <div class="gold-line"></div>
  </div>
  <div class="stats-bar">
    <div class="stat-item">
      <div class="stat-circle">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#c8a96e" stroke-width="1.5"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
      </div>
      <div class="stat-val">${(broker.stats && broker.stats.properties) ? broker.stats.properties : '100+'}</div>
      <div class="stat-lbl">Properties</div>
    </div>
    <div class="stat-item">
      <div class="stat-circle">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#c8a96e" stroke-width="1.5"><circle cx="12" cy="8" r="3"/><path d="M6.5 20c0-3 2.5-5 5.5-5s5.5 2 5.5 5"/></svg>
      </div>
      <div class="stat-val">${(broker.stats && broker.stats.experience) ? broker.stats.experience : '5 Yrs'}</div>
      <div class="stat-lbl">Experience</div>
    </div>
    <div class="stat-item">
      <div class="stat-circle">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#c8a96e" stroke-width="1.5"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/></svg>
      </div>
      <div class="stat-val">24/7</div>
      <div class="stat-lbl">Active</div>
    </div>
  </div>
  <div class="badges-row">
    <div class="badge-dark">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c8a96e" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
      Trusted Agent
    </div>
    <div class="badge-gold">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0a0a0a" stroke-width="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 8.63 19.79 19.79 0 01.12 2.18 2 2 0 012.11 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.91a16 16 0 006.18 6.18l.46-.46a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
      Free Consultation
    </div>
  </div>
</div>
<div class="specialties">
  ${specialties.map((s, i) => `
  <div class="spec-card">
    ${specIcons[i % specIcons.length]}
    <div class="spec-name">${s.trim()}</div>
    <div class="spec-line"></div>
  </div>`).join('')}
</div>
<div class="chat-wrap">
  <div class="chat-wrap-inner">
    <svg class="skyline-wm" viewBox="0 0 400 140" preserveAspectRatio="xMidYMax slice">
      <rect x="0" y="95" width="22" height="45" fill="#C9A35E"/><rect x="24" y="100" width="18" height="40" fill="#C9A35E"/>
      <rect x="358" y="90" width="20" height="50" fill="#C9A35E"/><rect x="380" y="100" width="20" height="40" fill="#C9A35E"/>
      <rect x="46" y="78" width="26" height="62" fill="#C9A35E"/>
      <rect x="82" y="38" width="30" height="102" fill="#C9A35E"/>
      <polygon points="97,18 91,38 103,38" fill="#C9A35E"/>
      <rect x="118" y="64" width="24" height="76" fill="#C9A35E"/>
      <rect x="148" y="100" width="26" height="40" fill="#C9A35E"/>
      <polygon points="161,86 146,100 176,100" fill="#C9A35E"/>
      <rect x="180" y="50" width="22" height="90" fill="#C9A35E"/>
      <rect x="206" y="72" width="28" height="68" fill="#C9A35E"/>
      <rect x="238" y="44" width="26" height="96" fill="#C9A35E"/>
      <rect x="268" y="92" width="24" height="48" fill="#C9A35E"/>
      <rect x="296" y="56" width="24" height="84" fill="#C9A35E"/>
      <rect x="324" y="74" width="30" height="66" fill="#C9A35E"/>
    </svg>
    <div class="agent-card">
      <div class="agent-av">${initials}</div>
      <div>
        <div class="agent-name">${broker.name}<br>Assistant</div>
        <div class="agent-status"><span class="online-dot"></span> Online</div>
      </div>
      <div class="agent-meta">
        <div class="badge1">24x7 Active</div>
        <div class="badge2">AI Powered</div>
      </div>
    </div>
    <div class="day-chip"><span>Aaj</span></div>
    <div class="chat-body" id="chatBody">
      <div class="msg bot"><div class="bubble">Namaste! ${broker.name} mein aapka swagat hai \ud83d\ude0a Aap kya dhundh rahe hain \u2014 kharidna, rent lena, ya apni property sell/rent\u2011out karni hai?</div><div class="ts">Abhi</div></div>
    </div>
  </div>
  <div class="quick-replies" id="quickReplies">
    <div class="qr-label">Jaldi select karein:</div>
    <button class="qr-btn" onclick="quickSelect(this,'Kharidna chahta hoon')">\ud83c\udfe0 Kharidna Hai</button>
    <button class="qr-btn" onclick="quickSelect(this,'Rent lena chahta hoon')">\ud83d\udd11 Rent Lena Hai</button>
    <button class="qr-btn" onclick="quickSelect(this,'Property sell karni hai')">\ud83d\udcb0 Sell Karna Hai</button>
    <button class="qr-btn" onclick="quickSelect(this,'Property rent pe deni hai')">\ud83d\udccb Rent Dena Hai</button>
  </div>
  <div class="chat-footer">
    <input type="text" id="msgInput" placeholder="Apna message yahan likhein\u2026" onkeypress="if(event.key==='Enter')sendMsg()"/>
    <button class="send-btn" onclick="sendMsg()">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="#D4A24C"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
    </button>
  </div>
</div>
<div class="powered">
  <svg width="20" height="20" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="12" fill="#0E1B30"/>
    <path d="M7 12.5L12 8L17 12.5V17C17 17.5523 16.5523 18 16 18H8C7.44772 18 7 17.5523 7 17V12.5Z" fill="#FFFFFF"/>
    <rect x="10.7" y="13.5" width="2.6" height="2.6" rx="0.5" fill="#D4A24C"/>
  </svg>
  EstateBot \u00b7 AI Lead Assistant
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
  function typeNext(){
    if(i<text.length){bubble.innerHTML+=text.charAt(i);i++;body.scrollTop=body.scrollHeight;setTimeout(typeNext,20);}
  }
  typeNext();
}

function quickSelect(btn, text){
  document.getElementById('quickReplies').style.display='none';
  addMsg(text,'user');
  showTyping();
  fetch('/api/chat/'+brokerId,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:text,sessionId})})
  .then(r=>r.json()).then(data=>{
    removeTyping();typeMsg(data.reply,'bot');
    if(data.leadComplete){leadDone=true;disableChat();}
  }).catch(e=>{removeTyping();addMsg('Dobara try karein.','bot');});
}

function disableChat(){
  const inp=document.getElementById('msgInput');
  const sendBtn=document.querySelector('.send-btn');
  inp.disabled=true;
  inp.placeholder='Shukriya! Hamari team jald contact karegi.';
  inp.style.background='#f0fdf4';inp.style.borderColor='#22c55e';inp.style.color='#15803d';
  if(sendBtn)sendBtn.style.display='none';
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
app.listen(PORT, () => console.log(`\ud83c\udfe0 EstateBot running on port ${PORT}`));
