const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);
const GROQ_API_KEY = process.env.GROQ_API_KEY;

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
          content: `Ye real estate chat conversation hai. Broker ke liye ek detailed summary banao. Niche diye format mein likho, Hinglish mein:\n\n1. Customer Intent (kya chahiye - buy/sell/rent)\n2. Property Details (type, BHK, area, floor, furnished, parking, lift)\n3. Location (city, locality, preferred area)\n4. Budget (exact amount ya range)\n5. Timeline (kab chahiye)\n6. Loan ya Cash\n7. Special Requirements (koi bhi important cheez jo customer ne boli)\n8. Self Use ya Investment (purpose kya hai)
9. Loan ya Cash (payment method)
10. Special Requirements (koi specific zaroorat)
11. Customer Mood (serious/exploring/urgent)\n\nHar point ke liye jo bhi information mili woh likho. Agar koi information nahi mili toh "Not mentioned" likho.\n\nConversation:\n${convo}`
        }],
        max_tokens: 600
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
          <tr><td style="padding:14px 20px;color:#64748b;font-size:13px;font-family:Arial,sans-serif;border-bottom:1px solid #f1f5f9;">Intent</td>
            <td style="padding:14px 20px;font-weight:700;color:#1e293b;font-size:14px;font-family:Arial,sans-serif;border-bottom:1px solid #f1f5f9;">${leadData.intent || '&mdash;'}</td></tr>
          <tr style="background:#f8fafc;"><td style="padding:14px 20px;color:#64748b;font-size:13px;font-family:Arial,sans-serif;border-bottom:1px solid #f1f5f9;">Self Use / Investment</td>
            <td style="padding:14px 20px;font-weight:700;color:#1e293b;font-size:14px;font-family:Arial,sans-serif;border-bottom:1px solid #f1f5f9;">${leadData.details && leadData.details.purpose ? leadData.details.purpose : '&mdash;'}</td></tr>
          <tr><td style="padding:14px 20px;color:#64748b;font-size:13px;font-family:Arial,sans-serif;border-bottom:1px solid #f1f5f9;">Loan / Cash</td>
            <td style="padding:14px 20px;font-weight:700;color:#1e293b;font-size:14px;font-family:Arial,sans-serif;border-bottom:1px solid #f1f5f9;">${leadData.details && leadData.details.loan ? leadData.details.loan : '&mdash;'}</td></tr>
          <tr style="background:#f8fafc;"><td style="padding:14px 20px;color:#64748b;font-size:13px;font-family:Arial,sans-serif;border-bottom:1px solid #f1f5f9;">Locality / Area</td>
            <td style="padding:14px 20px;font-weight:700;color:#1e293b;font-size:14px;font-family:Arial,sans-serif;border-bottom:1px solid #f1f5f9;">${leadData.details && leadData.details.locality ? leadData.details.locality : leadData.area || '&mdash;'}</td></tr>
          <tr><td style="padding:14px 20px;color:#64748b;font-size:13px;font-family:Arial,sans-serif;">Special Requirements</td>
            <td style="padding:14px 20px;font-weight:700;color:#1e293b;font-size:14px;font-family:Arial,sans-serif;">${leadData.details && leadData.details.special ? leadData.details.special : leadData.special_requirements || '&mdash;'}</td></tr>
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


// ===== SEND TRIAL EXPIRY EMAIL =====
async function sendTrialExpiryEmail(broker) {
  const { error } = await resend.emails.send({
    from: 'EstateBot <welcome@estatebotai.in>',
    to: broker.email,
    subject: 'Aapka EstateBot Trial Khatam Ho Gaya — Subscribe Karein',
    html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;background:#f8fafc;padding:20px;border-radius:16px;"><div style="background:linear-gradient(135deg,#ef4444,#dc2626);padding:24px;border-radius:12px;text-align:center;margin-bottom:20px;"><h2 style="color:#fff;margin:0;">EstateBot</h2><p style="color:rgba(255,255,255,0.9);margin:6px 0 0;">Aapka 7 din ka free trial khatam ho gaya</p></div><div style="background:#fff;padding:20px;border-radius:12px;border:1px solid #e2e8f0;"><p style="color:#1e293b;">Namaste ${broker.name} ji,</p><p style="color:#475569;margin-top:12px;">Aapka bot band ho gaya hai. Subscribe karein — sirf <b>&#8377;2,999/month</b>.</p><div style="text-align:center;margin:24px 0;"><a href="https://estatebotai.in/dashboard" style="background:#c9a84c;color:#000;font-weight:700;padding:14px 32px;border-radius:8px;text-decoration:none;font-size:16px;display:inline-block;">Subscribe Now &#8594;</a></div></div></div>`
  });
  if (error) console.error('Trial expiry email error:', error);
  else console.log(`Trial expiry email sent to ${broker.email}`);
}

module.exports = { generateSummary, sendLeadEmail, sendWelcomeEmail, sendTrialExpiryEmail };
