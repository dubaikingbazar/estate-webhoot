const express = require('express');
const { Resend } = require('resend');
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const app = express();

// Raw body needed for Cashfree webhook signature verification
app.use('/api/payment/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());

// ===== KEYS =====
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const resend = new Resend(process.env.RESEND_API_KEY);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ===== CASHFREE CONFIG =====
const CASHFREE_APP_ID = process.env.CASHFREE_APP_ID;
const CASHFREE_SECRET = process.env.CASHFREE_SECRET;
const CASHFREE_BASE = process.env.CASHFREE_ENV === 'production'
  ? 'https://api.cashfree.com'
  : 'https://sandbox.cashfree.com';

const PLAN_AMOUNT = 2999;

// ===== ADMIN AUTH =====
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'change-me-please';
function adminAuth(req, res, next) {
  const secret = req.headers['x-admin-secret'] || req.query.secret;
  if (!secret || secret !== ADMIN_SECRET) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

const conversations = {};
const tempUploads = {};

// ===== AI PROMPT =====
const getSystemPrompt = (brokerName) => `
Tum "${brokerName}" ke real estate assistant ho.

Tumhara kaam customer se bilkul ek real insaan ki tarah natural Hinglish mein WhatsApp style conversation karna hai, trust banana hai aur complete qualified lead broker tak pahunchana hai.

Kabhi bhi mat batana ki tum AI, chatbot ya bot ho.

GOLDEN RULES:
- Har response mein sirf EK hi sawaal pucho.
- Har response 1-3 lines ka ho.
- Warm, friendly aur natural Hinglish use karo.
- "Ji", "acha", "bilkul", "haan", "samajh gaya" naturally use karo.
- Pehle assistant message ke baad kabhi greeting dobara mat dena.
- Customer ki baat dhyan se padho.
- Jo information customer de chuka hai use dobara kabhi mat puchho.
- Conversation history hamesha prompt ke steps se zyada important hai.
- Agar customer ek message mein multiple details de de to unhe save karo aur repeat mat karo.
- Ek response = Ek hi missing information.

CUSTOMER NAME RULE:
- "${brokerName}" broker ka naam hai. Ye CUSTOMER ka naam nahi hai.
- Jab tak customer apna naam na bataye: kabhi bhi koi naam use mat karo, sirf "ji" use karo.
- Jaise: "Acha ji", "Bilkul ji"
- Naam milne ke baad hi "[CustomerName] ji" use karo.

CONVERSATION PRIORITY:
Har reply se pehle internally check karo:
Intent > Property Type > Property Details > Name > Location > Budget > Timeline > Phone Number > Lead Complete
Flow se zyada conversation history ko follow karo.

FIRST MESSAGE:
- Agar customer ke first message se intent clear hai (jaise "Mujhe flat kharidna hai", "Plot sell karna hai", "Ghar rent pe chahiye") to greeting mat do. Seedha naturally react karo.
  Examples: "Acha ji! Kaunsi property chahiye?" ya "Acha ji! Kaisi property hai aapki?"
- Agar first message se intent clear nahi hai, tab sirf ek greeting do:
  "Namaste ji 😊 Aap property kharidna chahte hain, rent lena hai, ya apni property sell ya rent par deni hai?"

NAME:
- Naam sirf tab pucho jab property ka basic context mil jaye.
- Question: "Aur aapka naam kya hai?"
- Agar naam pehle hi mil gaya ho dobara mat puchho.

PROPERTY TYPE:
Agar customer property type nahi batata, tab pucho: Flat, House, Kothi, Villa, Plot, Shop, Office, Showroom, Industrial, Farm House, PG, ya kuch aur?

PROPERTY QUESTIONS:

BUY / RENT LENA:
- Flat: BHK > Furnished/Unfurnished > Parking > Lift/Society > Family members > Loan ya Cash
- House: Rooms > Area > Floors > Ground floor zaroori?
- Kothi: Area > Rooms > Garden > Loan/Cash
- Villa: Area > Floors > Garden/Parking
- Plot: Size > Corner ya Normal > Registry Ready
- Shop: Area > Main Road ya Andar > Parking
- Office: Carpet Area > Employees > Parking
- Showroom: Area > Main Road
- Industrial: Warehouse/Factory/Shed > Area > Highway > Heavy Power
- Farm House: Area > Construction
- PG: Single/Sharing > Food

SELL / RENT OUT KARNA:
- Flat: BHK > Furnished > Area > Property Age > Negotiable > Registry Ready
- House: Rooms > Area > Floors > Property Age > Registry > Negotiable
- Kothi: Area > Rooms > Property Age > Registry
- Villa: Area > Floors > Property Age
- Plot: Size > Corner > Registry > Kitni jaldi bechna?
- Shop: Area > Main Road > Age > Negotiable
- Office: Carpet Area > Floor Number > Furnished
- Showroom: Area > Main Road
- Industrial: Warehouse/Factory/Shed > Area > Highway Distance
- Farm House: Area > Construction > Registry

SELL/RENT OUT mein KABHI MAT PUCHHO: Lift, Parking, Society

IMPORTANT: Jo property details customer already bata chuka ho dobara mat puchna.

LOCATION:
- Buy/Rent: "Kaunsa area ya locality prefer karenge?"
- Sell/Rent Out: "Property kis area ya locality mein hai?"

BUDGET:
"Approx budget kitna socha hai ji?"
Agar customer bole flexible/negotiable/discuss karenge - wahi save karo, force mat karo.

TIMELINE:
"Kitne time mein lena ya dena chahte hain?" (Urgent/1 Month/3 Months/6 Months/Flexible - jo bole wahi save karo)

PHONE NUMBER (KABHI SKIP MAT KARNA):
- Naam pata ho: "[CustomerName] ji, ek last kaam 😊 Apna WhatsApp number share kar dijiye. Hamari team aapse contact kar legi."
- Naam na pata ho: "Ji, ek last kaam 😊 Apna WhatsApp number share kar dijiye. Hamari team aapse contact kar legi."

PHONE VALIDATION:
Indian mobile number exactly 10 digits hona chahiye.
Agar invalid ho: "Koi baat nahi ji 😊 Lagta hai number complete nahi hai. Sahi 10 digit WhatsApp number bata dijiye."

INDIRECT INTENT - inhe bhi samjho:
- "Makan dekh raha hu" > Buy
- "Ghar kiraye pe chahiye" > Rent
- "Flat nikalna hai" > Sell
- "Tenant chahiye" > Rent Out
- "Office lena hai" > Buy/Rent
- "Buyer chahiye" > Sell

LEAD COMPLETE - tabhi complete hogi jab ye sab mil jaye:
Name, Phone, Intent, Property Type, Location, Budget, Timeline, aur property specific details.
Phone ke bina kabhi lead complete mat karo.

FINAL MESSAGE:
Buy/Rent: "Bahut shukriya [CustomerName] ji 😊 Aapki details note ho gayi hain. Hamari team jaldi hi aapse contact karegi."
Sell/Rent Out: "Bahut shukriya [CustomerName] ji 😊 Aapki property ki details note ho gayi hain. Hamari team jaldi hi aapse contact karegi."

Uske turant baad EXACT format mein output karo:
|||LEAD|||{"name":"NAME","phone":"PHONE","intent":"BUY/SELL/RENT/RENT_OUT","property":"PROPERTY_TYPE","location":"LOCATION","budget":"BUDGET","timeline":"TIMELINE","details":{"bhk":"","area":"","floors":"","rooms":"","furnished":"","parking":"","lift":"","loan":"","registry":"","corner":"","age":"","garden":"","power":"","food":"","sharing":"","special":""}}|||

STRICTLY NEVER:
- Ek response mein ek se zyada sawaal mat puchna.
- Customer ki information repeat mat karna.
- Greeting repeat mat karna.
- Naam assume mat karna.
- Broker ka naam customer ke liye mat use karna.
- AI hone ki baat kabhi mat karna.
- Lead jaldi complete mat karna.
- Missing information ignore mat karna.
- Customer ko force mat karna.
- Agar customer kisi sawaal ka jawab na de aur topic badal de, to naye context ke hisaab se baat continue karo aur baad mein missing information politely collect karo.
`;

// ===== GENERATE SUMMARY =====
async function generateSummary(messages) {
  try {
    const convo = messages.map(m => `${m.role === 'user' ? 'Customer' : 'Bot'}: ${m.content}`).join('\n');
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_API_KEY}` },
      body: JSON.stringify({
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        messages: [{
          role: 'user',
          content: `Ye real estate chat conversation hai. Iska ek concise summary do broker ke liye — 3-5 bullet points mein, Hinglish mein. Sirf important property details aur customer requirements batao. Format:\n• ...\n• ...\n\nConversation:\n${convo}`
        }],
        max_tokens: 300
      })
    });
    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  } catch (e) { return ''; }
}

// ===== SEND LEAD EMAIL =====
async function sendLeadEmail(broker, leadData, conversationMessages) {
  const summary = conversationMessages ? await generateSummary(conversationMessages) : '';
  const summaryHtml = summary ? `
  <tr><td height="12"></td></tr>
  <tr><td style="background:#ffffff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="padding:14px 20px;background:#f8fafc;border-bottom:1px solid #e2e8f0;">
        <p style="margin:0;font-size:11px;font-weight:700;color:#1e3a5f;letter-spacing:2px;text-transform:uppercase;font-family:Arial,sans-serif;">Conversation Summary</p>
      </td></tr>
      <tr><td style="padding:16px 20px;color:#1e293b;font-size:13px;font-family:Arial,sans-serif;line-height:1.7;">
        ${summary.replace(/\n/g, '<br>')}
      </td></tr>
    </table>
  </td></tr>` : '';

  const { error } = await resend.emails.send({
    from: 'EstateBot <leads@estatebotai.in>',
    to: broker.email,
    subject: `Naya Lead — ${leadData.name} | ${broker.name}`,
    html: `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background-color:#f0f4f8;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f4f8;padding:20px 0;">
<tr><td align="center">
<table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;">
  <tr><td style="background:linear-gradient(135deg,#1e3a5f,#2d5a8e);border-radius:14px;padding:32px 24px;text-align:center;">
    <p style="font-size:10px;color:#94a3b8;letter-spacing:3px;text-transform:uppercase;margin:0 0 12px;">${broker.name} &middot; New Lead</p>
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
            <td style="padding:14px 20px;font-weight:700;color:#1e293b;font-size:14px;font-family:Arial,sans-serif;border-bottom:1px solid #f1f5f9;">${leadData.type || leadData.property || '&mdash;'}</td></tr>
          <tr style="background:#f8fafc;"><td style="padding:14px 20px;color:#64748b;font-size:13px;font-family:Arial,sans-serif;border-bottom:1px solid #f1f5f9;">Area / Location</td>
            <td style="padding:14px 20px;font-weight:700;color:#1e293b;font-size:14px;font-family:Arial,sans-serif;border-bottom:1px solid #f1f5f9;">${leadData.area || leadData.location || '&mdash;'}</td></tr>
          <tr><td style="padding:14px 20px;color:#64748b;font-size:13px;font-family:Arial,sans-serif;border-bottom:1px solid #f1f5f9;">Budget</td>
            <td style="padding:14px 20px;font-weight:700;color:#16a34a;font-size:18px;font-family:Arial,sans-serif;border-bottom:1px solid #f1f5f9;">${leadData.budget || '&mdash;'}</td></tr>
          <tr style="background:#f8fafc;"><td style="padding:14px 20px;color:#64748b;font-size:13px;font-family:Arial,sans-serif;border-bottom:1px solid #f1f5f9;">Timeline</td>
            <td style="padding:14px 20px;font-weight:700;color:#1e293b;font-size:14px;font-family:Arial,sans-serif;border-bottom:1px solid #f1f5f9;">${leadData.timeline || 'Not specified'}</td></tr>
          <tr><td style="padding:14px 20px;color:#64748b;font-size:13px;font-family:Arial,sans-serif;">Intent</td>
            <td style="padding:14px 20px;font-weight:700;color:#1e293b;font-size:14px;font-family:Arial,sans-serif;">${leadData.intent || '&mdash;'}</td></tr>
        </table>
      </td></tr>
    </table>
  </td></tr>
  ${summaryHtml}
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
</body></html>`
  });
  if (error) console.error('Email error:', error);
  else console.log(`Email sent to ${broker.email} for lead: ${leadData.name}`);
}

// ===== SEND WELCOME EMAIL =====
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

// ===== BROKER SIGNUP — 7 DAY TRIAL =====
app.post('/api/signup', async (req, res) => {
  const { name, business, city, state, specialty, email, phone, experience, properties, password } = req.body;
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

  // CHANGE 1: Save broker with 'trial' status + trial_start date
  const { error: dbErr } = await supabase.from('brokers').insert([{
    broker_id: finalId,
    name: business,
    email,
    phone,
    city: city + (state ? ', ' + state : ''),
    specialty: specialty || 'Residential',
    status: 'trial',
    trial_start: new Date().toISOString(),
    trial_days: 7,
    password: password || null,
    stats: {
      experience: experience ? experience + ' Yrs' : '5 Yrs',
      properties: properties || '100+'
    }
  }]);
  if (dbErr) {
    console.error('Supabase error:', dbErr);
    return res.status(500).json({ error: 'Database error' });
  }

  // Send welcome email
  await sendWelcomeEmail({ name: business, broker_id: finalId, email });

  res.json({
    success: true,
    broker_id: finalId,
    trial: true,
    trial_days: 7,
    message: '7 din ka free trial shuru ho gaya!'
  });
});

// ===== CASHFREE WEBHOOK — ACTIVATES SUBSCRIPTION =====
app.post('/api/payment/webhook', async (req, res) => {
  try {
    const rawBody = req.body.toString('utf8');
    const signature = req.headers['x-webhook-signature'];
    const timestamp = req.headers['x-webhook-timestamp'];

    if (CASHFREE_SECRET && signature && timestamp) {
      const signedPayload = timestamp + rawBody;
      const expectedSig = crypto
        .createHmac('sha256', CASHFREE_SECRET)
        .update(signedPayload)
        .digest('base64');
      if (expectedSig !== signature) {
        console.error('Webhook signature mismatch');
        return res.status(400).json({ error: 'Invalid signature' });
      }
    }

    const event = JSON.parse(rawBody);
    console.log('Cashfree webhook event:', event.type, JSON.stringify(event).substring(0, 200));

    if (event.type === 'PAYMENT_SUCCESS_WEBHOOK') {
      const order = event.data?.order;
      const payment = event.data?.payment;

      if (!order?.order_id) return res.status(200).json({ status: 'ok' });

      const parts = order.order_id.split('_');
      const brokerId = parts.slice(1, -1).join('_');

      console.log(`Payment SUCCESS for broker: ${brokerId}, order: ${order.order_id}`);

      const validTill = new Date();
      validTill.setMonth(validTill.getMonth() + 1);

      const { data: broker, error: fetchErr } = await supabase
        .from('brokers')
        .select('*')
        .eq('broker_id', brokerId)
        .single();

      if (fetchErr || !broker) {
        console.error('Broker not found for webhook:', brokerId);
        return res.status(200).json({ status: 'ok' });
      }

      await supabase.from('brokers').update({
        status: 'active',
        subscription_start: new Date().toISOString(),
        subscription_valid_till: validTill.toISOString(),
        cashfree_payment_id: payment?.cf_payment_id || null,
        cashfree_order_id: order.order_id
      }).eq('broker_id', brokerId);

      console.log(`Broker ${brokerId} activated till ${validTill.toISOString()}`);

      await sendWelcomeEmail({ name: broker.name, broker_id: brokerId, email: broker.email });
    }

    if (event.type === 'PAYMENT_FAILED_WEBHOOK') {
      const order = event.data?.order;
      if (order?.order_id) {
        const parts = order.order_id.split('_');
        const brokerId = parts.slice(1, -1).join('_');
        await supabase.from('brokers').update({ status: 'payment_failed' }).eq('broker_id', brokerId);
        console.log(`Payment FAILED for broker: ${brokerId}`);
      }
    }

    res.status(200).json({ status: 'ok' });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(200).json({ status: 'ok' });
  }
});

// ===== PAYMENT STATUS PAGE =====
app.get('/payment/status', async (req, res) => {
  const { order_id, broker_id } = req.query;

  if (!order_id || !broker_id) {
    return res.redirect('/');
  }

  try {
    const cfRes = await fetch(`${CASHFREE_BASE}/pg/orders/${order_id}`, {
      headers: {
        'x-client-id': CASHFREE_APP_ID,
        'x-client-secret': CASHFREE_SECRET,
        'x-api-version': '2023-08-01'
      }
    });
    const cfData = await cfRes.json();
    const status = cfData.order_status;

    console.log(`Payment status check: order=${order_id}, status=${status}`);

    if (status === 'PAID') {
      const { data: broker } = await supabase
        .from('brokers').select('status,name,email').eq('broker_id', broker_id).single();

      if (broker && broker.status !== 'active') {
        const validTill = new Date();
        validTill.setMonth(validTill.getMonth() + 1);
        await supabase.from('brokers').update({
          status: 'active',
          subscription_start: new Date().toISOString(),
          subscription_valid_till: validTill.toISOString(),
          cashfree_order_id: order_id
        }).eq('broker_id', broker_id);
        await sendWelcomeEmail({ name: broker.name, broker_id, email: broker.email });
      }

      return res.send(getPaymentStatusHTML('success', broker_id));
    } else if (status === 'ACTIVE') {
      return res.send(getPaymentStatusHTML('pending', broker_id));
    } else {
      return res.send(getPaymentStatusHTML('failed', broker_id));
    }
  } catch (err) {
    console.error('Status check error:', err);
    return res.send(getPaymentStatusHTML('pending', broker_id));
  }
});

// ===== PAYMENT STATUS HTML =====
function getPaymentStatusHTML(status, brokerId) {
  const configs = {
    success: {
      icon: '✓',
      color: '#22c55e',
      bg: 'rgba(34,197,94,0.1)',
      title: 'Payment Successful!',
      msg: 'Aapka EstateBot account activate ho gaya hai. Welcome email check karein.',
      btn: `<a href="https://estatebotai.in/${brokerId}" style="display:inline-flex;align-items:center;gap:8px;background:#c9a84c;color:#000;font-weight:600;padding:13px 28px;border-radius:8px;text-decoration:none;font-family:Inter,sans-serif;font-size:14px;">Apna Bot Dekho →</a>`
    },
    failed: {
      icon: '✕',
      color: '#ef4444',
      bg: 'rgba(239,68,68,0.1)',
      title: 'Payment Failed',
      msg: 'Payment process nahi ho payi. Dobara try karein.',
      btn: `<a href="/#signup" style="display:inline-flex;align-items:center;gap:8px;background:#c9a84c;color:#000;font-weight:600;padding:13px 28px;border-radius:8px;text-decoration:none;font-family:Inter,sans-serif;font-size:14px;">Dobara Try Karein →</a>`
    },
    pending: {
      icon: '⏳',
      color: '#f59e0b',
      bg: 'rgba(245,158,11,0.1)',
      title: 'Payment Processing…',
      msg: 'Aapka payment process ho raha hai. Thodi der mein email aayegi.',
      btn: `<a href="https://estatebotai.in/${brokerId}" style="display:inline-flex;align-items:center;gap:8px;background:#c9a84c;color:#000;font-weight:600;padding:13px 28px;border-radius:8px;text-decoration:none;font-family:Inter,sans-serif;font-size:14px;">Dashboard Check Karein →</a>`
    }
  };
  const c = configs[status];
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Payment ${status} — EstateBot</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>*{margin:0;padding:0;box-sizing:border-box;}body{font-family:Inter,sans-serif;background:#000;color:#ededed;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px;}</style>
</head>
<body>
<div style="text-align:center;max-width:400px;">
  <div style="width:72px;height:72px;border-radius:50%;background:${c.bg};border:1px solid ${c.color};display:flex;align-items:center;justify-content:center;margin:0 auto 24px;font-size:32px;">${c.icon}</div>
  <h1 style="font-size:26px;font-weight:600;letter-spacing:-0.5px;margin-bottom:12px;">${c.title}</h1>
  <p style="color:#8c887e;font-size:14px;line-height:1.7;margin-bottom:28px;">${c.msg}</p>
  ${c.btn}
  <p style="margin-top:20px;font-size:12px;color:#555;">Support: +91 86903 53003 &nbsp;·&nbsp; <a href="mailto:estatebotofficial@gmail.com" style="color:#c9a84c;">estatebotofficial@gmail.com</a></p>
</div>
</body></html>`;
}

// ===== BROKER AUTH =====
app.post('/api/broker-auth', async (req, res) => {
  const { broker_id, password } = req.body;
  if (!broker_id || !password) return res.status(400).json({ error: 'Broker ID aur password dono chahiye' });
  const { data: broker, error } = await supabase.from('brokers').select('*').eq('broker_id', broker_id).single();
  if (error || !broker) return res.status(404).json({ error: 'Broker nahi mila' });
  if (broker.password !== password) return res.status(401).json({ error: 'Password galat hai' });

  // CHANGE 2: Trial days remaining calculate karo
  let trialDaysLeft = null;
  if (broker.status === 'trial' && broker.trial_start) {
    const trialEnd = new Date(broker.trial_start);
    trialEnd.setDate(trialEnd.getDate() + (broker.trial_days || 7));
    trialDaysLeft = Math.max(0, Math.ceil((trialEnd - new Date()) / (1000 * 60 * 60 * 24)));
  }

  res.json({ success: true, broker_id: broker.broker_id, status: broker.status, trial_days_left: trialDaysLeft });
});

app.get('/broker-login', (req, res) => { res.redirect('/dashboard'); });
app.get('/dashboard', (req, res) => { res.sendFile(__dirname + '/broker-dashboard.html'); });

// ===== ADMIN APIs =====
app.get('/api/admin/brokers', adminAuth, async (req, res) => {
  const { data, error } = await supabase.from('brokers').select('*').order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error });
  res.json(data);
});
app.get('/api/admin/leads', adminAuth, async (req, res) => {
  const { data, error } = await supabase.from('leads').select('*').order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error });
  res.json(data);
});
app.patch('/api/admin/brokers/:brokerId', adminAuth, async (req, res) => {
  const { brokerId } = req.params;
  const { status, password } = req.body;
  const updateData = {};
  if (status !== undefined) updateData.status = status;
  if (password !== undefined) updateData.password = password;
  const { error } = await supabase.from('brokers').update(updateData).eq('broker_id', brokerId);
  if (error) return res.status(500).json({ error });
  res.json({ success: true });
});
app.delete('/api/admin/delete/:brokerId', adminAuth, async (req, res) => {
  const { brokerId } = req.params;
  const { error } = await supabase.from('brokers').delete().eq('broker_id', brokerId);
  if (error) return res.status(500).json({ error });
  res.json({ success: true });
});

// ===== STATE MACHINE =====
const leadStates = {};
function getLeadState(sessionId) {
  if (!leadStates[sessionId]) {
    leadStates[sessionId] = { intent: '', name: '', propertyType: '', location: '', budget: '', timeline: '', phone: '' };
  }
  return leadStates[sessionId];
}
function updateLeadState(sessionId, leadData) {
  const state = getLeadState(sessionId);
  if (leadData.intent) state.intent = leadData.intent;
  if (leadData.name && leadData.name !== 'NAAM' && leadData.name !== 'NAME') state.name = leadData.name;
  if (leadData.property || leadData.propertyType) state.propertyType = leadData.property || leadData.propertyType;
  if (leadData.location) state.location = leadData.location;
  if (leadData.budget) state.budget = leadData.budget;
  if (leadData.timeline) state.timeline = leadData.timeline;
  if (leadData.phone) state.phone = leadData.phone;
}
function getMissingFields(sessionId) {
  const s = getLeadState(sessionId);
  const missing = [];
  if (!s.intent) missing.push('intent (kharidna/bechna/rent)');
  if (!s.propertyType) missing.push('property type');
  if (!s.name) missing.push('customer name');
  if (!s.location) missing.push('location');
  if (!s.budget) missing.push('budget');
  if (!s.timeline) missing.push('timeline');
  if (!s.phone) missing.push('phone number');
  return missing;
}
function buildSystemPromptWithState(brokerName, sessionId) {
  const state = getLeadState(sessionId);
  const missing = getMissingFields(sessionId);
  let stateNote = '\n\nCURRENT LEAD STATE:\n';
  stateNote += `- Intent: ${state.intent || 'NOT YET COLLECTED'}\n`;
  stateNote += `- Customer Name: ${state.name || 'NOT YET COLLECTED'}\n`;
  stateNote += `- Property Type: ${state.propertyType || 'NOT YET COLLECTED'}\n`;
  stateNote += `- Location: ${state.location || 'NOT YET COLLECTED'}\n`;
  stateNote += `- Budget: ${state.budget || 'NOT YET COLLECTED'}\n`;
  stateNote += `- Timeline: ${state.timeline || 'NOT YET COLLECTED'}\n`;
  stateNote += `- Phone: ${state.phone || 'NOT YET COLLECTED'}\n`;
  if (missing.length > 0) {
    stateNote += `\nABHI SIRF YE COLLECT KARNA HAI (ek ek karke): ${missing[0]}\n`;
    stateNote += `IMPORTANT: Jo already collected hai usse DOBARA MAT PUCHHO.\n`;
  }
  return getSystemPrompt(brokerName) + stateNote;
}

// ===== RESPONSE VALIDATOR =====
function validateReply(reply, brokerName) {
  const questionCount = (reply.match(/\?/g) || []).length;
  if (questionCount > 1) return false;
  if (/\b(AI|artificial intelligence|chatbot|bot|language model)\b/i.test(reply)) return false;
  const brokerFirstName = brokerName.split(' ')[0].toLowerCase();
  const lines = reply.toLowerCase();
  if (lines.includes(brokerFirstName + ' ji') && lines.indexOf(brokerFirstName + ' ji') < 50) return false;
  return true;
}

// ===== CHAT API =====
app.post('/api/chat/:brokerId', async (req, res) => {
  const { brokerId } = req.params;
  const { message, sessionId } = req.body;

  const { data: broker, error } = await supabase.from('brokers').select('*').eq('broker_id', brokerId).single();
  if (error || !broker) return res.status(404).json({ error: 'Broker not found' });

  // Block if inactive/failed
  if (broker.status === 'inactive' || broker.status === 'pending_payment' || broker.status === 'payment_failed' || broker.status === 'expired') {
    return res.status(403).json({ error: 'Subscription not active' });
  }

  // CHANGE 3: Trial expire check
  if (broker.status === 'trial' && broker.trial_start) {
    const trialEnd = new Date(broker.trial_start);
    trialEnd.setDate(trialEnd.getDate() + (broker.trial_days || 7));
    if (new Date() > trialEnd) {
      await supabase.from('brokers').update({ status: 'expired' }).eq('broker_id', brokerId);
      return res.status(403).json({ error: 'Trial expired', trial_expired: true });
    }
  }

  if (!conversations[sessionId]) conversations[sessionId] = [];
  conversations[sessionId].push({ role: 'user', content: message });

  try {
    let reply = '';
    let attempts = 0;
    while (attempts < 3) {
      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_API_KEY}` },
        body: JSON.stringify({
          model: 'meta-llama/llama-4-scout-17b-16e-instruct',
          messages: [
            { role: 'system', content: buildSystemPromptWithState(broker.name, sessionId) },
            ...conversations[sessionId]
          ]
        })
      });
      const data = await groqRes.json();
      if (!data.choices || !data.choices[0]) { console.error('Groq error:', JSON.stringify(data)); break; }
      reply = data.choices[0].message.content || '';
      if (validateReply(reply, broker.name)) break;
      attempts++;
    }
    if (!reply) reply = 'Kuch gadbad ho gayi, dobara try karein.';
    conversations[sessionId].push({ role: 'assistant', content: reply });

    let leadComplete = false;
    let leadData = null;

    if (reply.includes('|||LEAD|||')) {
      const match = reply.match(/\|\|\|LEAD\|\|\|(.+?)\|\|\|/s);
      if (match) {
        try {
          leadData = JSON.parse(match[1]);
          updateLeadState(sessionId, leadData);
          const phoneDigits = (leadData.phone || '').replace(/\D/g, '');
          if (!leadData.phone || phoneDigits.length < 10) {
            reply = reply.replace(/\|\|\|LEAD\|\|\|.+?\|\|\|/s, '').trim();
            leadComplete = false; leadData = null;
          } else {
            reply = reply.replace(/\|\|\|LEAD\|\|\|.+?\|\|\|/s, '').trim();
            const state = getLeadState(sessionId);
            const missing = getMissingFields(sessionId);
            const criticalMissing = missing.filter(f => !f.includes('timeline'));
            if (criticalMissing.length > 1) {
              leadComplete = false; leadData = null;
            } else {
              const uploadToken = Math.random().toString(36).substr(2,12) + Date.now().toString(36);
              await supabase.from('leads').insert([{
                broker_id: brokerId,
                name: leadData.name || state.name,
                phone: leadData.phone || state.phone,
                property_type: leadData.property || leadData.type || state.propertyType,
                area: leadData.location || state.location,
                budget: leadData.budget || state.budget,
                intent: leadData.intent || state.intent,
                timeline: leadData.timeline || state.timeline || null,
                furnished: leadData.details?.furnished || null,
                parking: leadData.details?.parking || null,
                special_requirements: leadData.details?.special || null,
                upload_token: uploadToken
              }]);
              await sendLeadEmail(broker, {
                name: leadData.name || state.name,
                phone: leadData.phone || state.phone,
                type: leadData.property || state.propertyType,
                area: leadData.location || state.location,
                budget: leadData.budget || state.budget,
                intent: leadData.intent || state.intent,
                timeline: leadData.timeline || state.timeline
              }, conversations[sessionId]);
              leadComplete = true;
              delete leadStates[sessionId];
            }
          }
        } catch (e) { console.error('Lead parse error:', e); }
      }
    } else {
      const state = getLeadState(sessionId);
      const msgLower = message.toLowerCase();
      if (!state.intent) {
        if (msgLower.includes('kharid') || msgLower.includes('lena') || msgLower.includes('buy')) state.intent = 'BUY';
        else if (msgLower.includes('sell') || msgLower.includes('bech') || msgLower.includes('nikalna')) state.intent = 'SELL';
        else if (msgLower.includes('rent') && (msgLower.includes('lena') || msgLower.includes('chahiye'))) state.intent = 'RENT';
        else if (msgLower.includes('rent') && (msgLower.includes('dena') || msgLower.includes('tenant'))) state.intent = 'RENT_OUT';
      }
    }
    res.json({ reply, leadComplete, leadData });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ===== STATIC PAGES =====
app.get("/privacy", (req, res) => { res.sendFile(__dirname + "/privacy.html"); });
app.get("/terms", (req, res) => { res.sendFile(__dirname + "/terms.html"); });
app.get('/admin', (req, res) => { res.sendFile(__dirname + '/admin.html'); });
app.get('/', (req, res) => { res.sendFile(__dirname + '/landing.html'); });

// ===== BROKER PAGE =====
app.get('/:brokerId', async (req, res) => {
  const { brokerId } = req.params;
  const reserved = ['upload', 'privacy', 'terms', 'admin', 'dashboard', 'broker-login', 'api', 'payment'];
  if (reserved.includes(brokerId)) return res.status(404).send('<h1 style="font-family:Arial;text-align:center;margin-top:100px;">Page not found</h1>');
  const { data: broker } = await supabase.from('brokers').select('*').eq('broker_id', brokerId).single();
  if (!broker) return res.status(404).send('<h1 style="font-family:Arial;text-align:center;margin-top:100px;">Page not found</h1>');
  res.send(getBrokerHTML(broker, brokerId));
});

// ===== BROKER HTML TEMPLATE (unchanged) =====
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
<title>${broker.name} — EstateBot</title>
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
.chat-wrap-inner{background:#F7F4ED;padding:20px 16px 16px;position:relative;z-index:1;}
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
.msg.bot{align-self:flex-start;}.msg.user{align-self:flex-end;}
.bubble{font-size:12.5px;line-height:1.5;color:#2A2A2A;}
.bot .bubble{background:#fff;border-left:3px solid #D4A24C;border-radius:4px 16px 16px 16px;padding:14px 16px;box-shadow:0 2px 12px rgba(14,27,48,.06);}
.user .bubble{background:#0E1B30;color:#F4EFE6;border-radius:16px 16px 4px 16px;padding:10px 14px;}
.ts{font-size:9.5px;color:#A39B89;margin-top:5px;margin-left:4px;}
.user .ts{align-self:flex-end;color:#A39B89;}
.typing{display:flex;align-items:center;gap:4px;padding:12px 16px;background:#fff;border-left:3px solid #D4A24C;border-radius:4px 16px 16px 16px;box-shadow:0 2px 12px rgba(14,27,48,.06);width:fit-content;position:relative;z-index:1;}
.typing span{width:6px;height:6px;background:#D4A24C;border-radius:50%;animation:bounce 1.2s infinite;}
.typing span:nth-child(2){animation-delay:0.2s;}.typing span:nth-child(3){animation-delay:0.4s;}
@keyframes bounce{0%,60%,100%{transform:translateY(0);}30%{transform:translateY(-5px);}}
.chat-footer{padding:14px 16px 18px;border-top:1px solid #EDE7D8;display:flex;gap:10px;align-items:center;background:#F7F4ED;position:relative;z-index:1;}
.chat-footer input{flex:1;background:#fff;border:1.5px solid #D4A24C;border-radius:100px;padding:11px 16px;font-family:'Manrope',sans-serif;font-size:11.7px;color:#2A2A2A;outline:none;}
.chat-footer input:focus{border-color:#0E1B30;}
.send-btn{width:44px;height:44px;background:#0E1B30;border:none;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.powered{width:100%;max-width:100%;background:#F7F4ED;border-top:1px solid #EDE7D8;padding:13px;display:flex;align-items:center;justify-content:center;gap:6px;font-size:10px;color:#6B6354;font-weight:700;}
.chat-body{background:transparent;padding:0;min-height:180px;display:flex;flex-direction:column;gap:10px;overflow-y:auto;max-height:360px;}
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
      <div class="stat-circle"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#c8a96e" stroke-width="1.5"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg></div>
      <div class="stat-val">${(broker.stats && broker.stats.properties) ? broker.stats.properties : '100+'}</div>
      <div class="stat-lbl">Properties</div>
    </div>
    <div class="stat-item">
      <div class="stat-circle"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#c8a96e" stroke-width="1.5"><circle cx="12" cy="8" r="3"/><path d="M6.5 20c0-3 2.5-5 5.5-5s5.5 2 5.5 5"/></svg></div>
      <div class="stat-val">${(broker.stats && broker.stats.experience) ? broker.stats.experience : '5 Yrs'}</div>
      <div class="stat-lbl">Experience</div>
    </div>
    <div class="stat-item">
      <div class="stat-circle"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#c8a96e" stroke-width="1.5"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/></svg></div>
      <div class="stat-val">24/7</div>
      <div class="stat-lbl">Active</div>
    </div>
  </div>
  <div class="badges-row">
    <div class="badge-dark"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c8a96e" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>Trusted Agent</div>
    <div class="badge-gold"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0a0a0a" stroke-width="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 8.63 19.79 19.79 0 01.12 2.18 2 2 0 012.11 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.91a16 16 0 006.18 6.18l.46-.46a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>Free Consultation</div>
  </div>
</div>
<div class="specialties">
  ${specialties.map((s, i) => `<div class="spec-card">${specIcons[i % specIcons.length]}<div class="spec-name">${s.trim()}</div><div class="spec-line"></div></div>`).join('')}
</div>
<div class="chat-wrap">
  <div class="chat-wrap-inner">
    <svg class="skyline-wm" viewBox="0 0 400 140" preserveAspectRatio="xMidYMax slice">
      <rect x="0" y="95" width="22" height="45" fill="#C9A35E"/><rect x="24" y="100" width="18" height="40" fill="#C9A35E"/>
      <rect x="358" y="90" width="20" height="50" fill="#C9A35E"/><rect x="380" y="100" width="20" height="40" fill="#C9A35E"/>
      <rect x="46" y="78" width="26" height="62" fill="#C9A35E"/><rect x="82" y="38" width="30" height="102" fill="#C9A35E"/>
      <polygon points="97,18 91,38 103,38" fill="#C9A35E"/>
      <rect x="118" y="64" width="24" height="76" fill="#C9A35E"/><rect x="148" y="100" width="26" height="40" fill="#C9A35E"/>
      <polygon points="161,86 146,100 176,100" fill="#C9A35E"/>
      <rect x="180" y="50" width="22" height="90" fill="#C9A35E"/><rect x="206" y="72" width="28" height="68" fill="#C9A35E"/>
      <rect x="238" y="44" width="26" height="96" fill="#C9A35E"/><rect x="268" y="92" width="24" height="48" fill="#C9A35E"/>
      <rect x="296" y="56" width="24" height="84" fill="#C9A35E"/><rect x="324" y="74" width="30" height="66" fill="#C9A35E"/>
    </svg>
    <div class="agent-card">
      <div class="agent-av">${initials}</div>
      <div>
        <div class="agent-name">${broker.name}<br>Assistant</div>
        <div class="agent-status"><span class="online-dot"></span> Online</div>
      </div>
      <div class="agent-meta"><div class="badge1">24x7 Active</div><div class="badge2">AI Powered</div></div>
    </div>
    <div class="day-chip"><span>Aaj</span></div>
    <div class="chat-body" id="chatBody">
      <div class="msg bot"><div class="bubble">Namaste ji! 😊 Aap property kharidna chahte hain, rent lena hai, ya apni property sell/rent pe deni hai?</div><div class="ts">Abhi</div></div>
    </div>
  </div>
  <div class="chat-footer">
    <input type="text" id="msgInput" placeholder="Apna message yahan likhein…" onkeypress="if(event.key==='Enter')sendMsg()"/>
    <button class="send-btn" onclick="sendMsg()">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="#D4A24C"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
    </button>
  </div>
</div>
<div class="powered">
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M3 10.5L12 3L21 10.5V20C21 20.5523 20.5523 21 20 21H4C3.44772 21 3 20.5523 3 20V10.5Z" fill="#0E1B30"/><circle cx="12" cy="14.5" r="3.8" fill="#D4A24C"/><circle cx="10.8" cy="14.5" r="0.9" fill="white"/><circle cx="12" cy="14.5" r="0.9" fill="white"/><circle cx="13.2" cy="14.5" r="0.9" fill="white"/><path d="M10.2 17.2L9.2 19L11.5 18.1" fill="#D4A24C"/></svg>
  EstateBot · AI Lead Assistant
</div>
<script>
const sessionId=Math.random().toString(36).substr(2,9);
const brokerId='${brokerId}';
let leadDone=false;
function getTime(){const n=new Date();return n.getHours()+':'+String(n.getMinutes()).padStart(2,'0');}
function addMsg(text,role){const body=document.getElementById('chatBody');const d=document.createElement('div');d.className='msg '+role;d.innerHTML='<div class="bubble">'+text+'</div><div class="ts">'+getTime()+'</div>';body.appendChild(d);body.scrollTop=body.scrollHeight;}
function showTyping(){const body=document.getElementById('chatBody');const d=document.createElement('div');d.className='msg bot';d.id='typing';d.innerHTML='<div class="typing"><span></span><span></span><span></span></div>';body.appendChild(d);body.scrollTop=body.scrollHeight;}
function removeTyping(){const t=document.getElementById('typing');if(t)t.remove();}
function typeMsg(text,role){const body=document.getElementById('chatBody');const d=document.createElement('div');d.className='msg '+role;const bubble=document.createElement('div');bubble.className='bubble';bubble.innerHTML='';const ts=document.createElement('div');ts.className='ts';ts.textContent=getTime();d.appendChild(bubble);d.appendChild(ts);body.appendChild(d);body.scrollTop=body.scrollHeight;let i=0;function typeNext(){if(i<text.length){bubble.innerHTML+=text.charAt(i);i++;body.scrollTop=body.scrollHeight;setTimeout(typeNext,20);}}typeNext();}
function disableChat(){const inp=document.getElementById('msgInput');const sendBtn=document.querySelector('.send-btn');inp.disabled=true;inp.placeholder='Shukriya! Hamari team jald contact karegi.';inp.style.background='#f0fdf4';inp.style.borderColor='#22c55e';inp.style.color='#15803d';if(sendBtn)sendBtn.style.display='none';}
async function sendMsg(){const input=document.getElementById('msgInput');const msg=input.value.trim();if(!msg)return;if(leadDone)return;input.value='';addMsg(msg,'user');showTyping();try{const res=await fetch('/api/chat/'+brokerId,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:msg,sessionId})});const data=await res.json();removeTyping();typeMsg(data.reply,'bot');if(data.leadComplete){leadDone=true;disableChat();}}catch(e){removeTyping();addMsg('Kuch gadbad ho gayi, dobara try karein.','bot');}}
</script>
</body></html>`;
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🏠 EstateBot running on port ${PORT}`));
