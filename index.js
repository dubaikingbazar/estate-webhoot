const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const { generateSummary, sendLeadEmail, sendWelcomeEmail, sendTrialExpiryEmail } = require('./emails');
const { buildSystemPromptWithState, validateReply, getLeadState, updateLeadState, getMissingFields, leadStates } = require('./ai');
const { getBrokerHTML } = require('./brokerHTML');
const app = express();

app.use('/api/payment/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());
app.use(express.static(__dirname));

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
      sendTrialExpiryEmail(broker).catch(e => console.error('Trial email error:', e));
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
          max_tokens: 150,
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


// ===== CREATE PAYMENT ORDER =====
app.post('/api/create-payment', async (req, res) => {
  const { broker_id } = req.body;
  if (!broker_id) return res.status(400).json({ error: 'broker_id required' });

  const { data: broker, error } = await supabase
    .from('brokers').select('*').eq('broker_id', broker_id).single();
  if (error || !broker) return res.status(404).json({ error: 'Broker not found' });

  try {
    const orderId = 'EB_' + broker_id + '_' + Date.now();
    const cfRes = await fetch(CASHFREE_BASE + '/pg/orders', {
      method: 'POST',
      headers: {
        'x-client-id': CASHFREE_APP_ID,
        'x-client-secret': CASHFREE_SECRET,
        'x-api-version': '2023-08-01',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        order_id: orderId,
        order_amount: PLAN_AMOUNT,
        order_currency: 'INR',
        customer_details: {
          customer_id: broker_id,
          customer_name: broker.name,
          customer_email: broker.email,
          customer_phone: (broker.phone || '9999999999').replace(/\D/g, '').slice(-10)
        },
        order_meta: {
          return_url: 'https://estatebotai.in/payment/status?order_id={order_id}&broker_id=' + broker_id,
          notify_url: 'https://estatebotai.in/api/payment/webhook'
        },
        order_note: 'EstateBot subscription — ' + broker_id
      })
    });

    const cfData = await cfRes.json();
    console.log('Cashfree order:', JSON.stringify(cfData));

    if (!cfData.payment_session_id) {
      console.error('Cashfree error:', cfData);
      return res.status(500).json({ error: 'Payment gateway error. Please try again.' });
    }

    await supabase.from('brokers')
      .update({ cashfree_order_id: orderId })
      .eq('broker_id', broker_id);

    res.json({
      success: true,
      payment_session_id: cfData.payment_session_id,
      order_id: orderId,
      amount: PLAN_AMOUNT
    });

  } catch (err) {
    console.error('Create payment error:', err);
    res.status(500).json({ error: 'Payment gateway unreachable. Please try again.' });
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🏠 EstateBot running on port ${PORT}`));
