const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);
const GROQ_API_KEY = process.env.GROQ_API_KEY;

const EMAIL_STYLE = `
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
  </style>
`;

const LOGO_HTML = `
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:32px 0 24px;">
        <div style="display:inline-block;background:#0E1B30;border-radius:14px;padding:12px 24px;">
          <span style="font-family:Arial,sans-serif;font-size:18px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">Estate<span style="color:#C8952A;">Bot</span> <span style="color:#C8952A;">AI</span></span>
        </div>
      </td>
    </tr>
  </table>
`;

const FOOTER_HTML = `
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:28px 0 12px;border-top:1px solid #1e2d45;">
        <p style="margin:0;font-family:Arial,sans-serif;font-size:11px;color:#4a5568;letter-spacing:1px;">ESTATEBOT AI &nbsp;&middot;&nbsp; AI LEAD INTELLIGENCE</p>
        <p style="margin:6px 0 0;font-family:Arial,sans-serif;font-size:11px;color:#2d3748;">
          <a href="mailto:estatebotofficial@gmail.com" style="color:#C8952A;text-decoration:none;">estatebotofficial@gmail.com</a>
          &nbsp;&middot;&nbsp;
          <a href="tel:+918690353003" style="color:#C8952A;text-decoration:none;">+91 86903 53003</a>
        </p>
        <p style="margin:6px 0 0;font-family:Arial,sans-serif;font-size:10px;color:#2d3748;">© 2026 EstateBot AI. All rights reserved.</p>
      </td>
    </tr>
  </table>
`;

function wrapEmail(content) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">${EMAIL_STYLE}</head>
<body style="margin:0;padding:0;background:#060d18;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#060d18;padding:20px 0;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
  <tr><td>${LOGO_HTML}</td></tr>
  <tr><td style="background:#0b1628;border-radius:16px;border:1px solid #1e2d45;overflow:hidden;padding:32px;">
    ${content}
  </td></tr>
  <tr><td>${FOOTER_HTML}</td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

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
          content: `Ye real estate chat conversation hai. Broker ke liye ek detailed summary banao. Niche diye format mein likho, Hinglish mein:\n\n1. Customer Intent (kya chahiye - buy/sell/rent)\n2. Property Details (type, BHK, area, floor, furnished, parking, lift)\n3. Location (city, locality, preferred area)\n4. Budget (exact amount ya range)\n5. Timeline (kab chahiye)\n6. Loan ya Cash\n7. Special Requirements (koi bhi important cheez jo customer ne boli)\n8. Self Use ya Investment (purpose kya hai)\n9. Loan ya Cash (payment method)\n10. Special Requirements (koi specific zaroorat)\n11. Customer Mood (serious/exploring/urgent)\n\nHar point ke liye jo bhi information mili woh likho. Agar koi information nahi mili toh "Not mentioned" likho.\n\nConversation:\n${convo}`
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
    <tr><td height="16"></td></tr>
    <tr><td style="background:#0f1f35;border-radius:10px;border:1px solid #1e2d45;overflow:hidden;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="padding:12px 18px;border-bottom:1px solid #1e2d45;">
          <p style="margin:0;font-size:10px;font-weight:700;color:#C8952A;letter-spacing:2px;text-transform:uppercase;font-family:Arial,sans-serif;">Conversation Summary</p>
        </td></tr>
        <tr><td style="padding:16px 18px;color:#94a3b8;font-size:13px;font-family:Arial,sans-serif;line-height:1.8;">
          ${summary.replace(/\n/g, '<br>')}
        </td></tr>
      </table>
    </td></tr>` : '';

  const { error } = await resend.emails.send({
    from: 'EstateBot <leads@estatebotai.in>',
    to: broker.email,
    subject: `New Lead — ${leadData.name} | ${broker.name}`,
    html: wrapEmail(`
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="text-align:center;padding-bottom:24px;border-bottom:1px solid #1e2d45;">
          <p style="margin:0 0 6px;font-size:10px;color:#4a5568;letter-spacing:3px;text-transform:uppercase;font-family:Arial,sans-serif;">${broker.name} &middot; New Lead Alert</p>
          <h1 style="margin:0 0 6px;font-size:26px;font-weight:700;color:#ffffff;font-family:Arial,sans-serif;">${leadData.name}</h1>
          <p style="margin:0 0 18px;color:#64748b;font-size:13px;font-family:Arial,sans-serif;">${leadData.intent || 'Property Enquiry'}</p>
          <a href="tel:${leadData.phone}" style="background:#C8952A;color:#000000;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block;font-family:Arial,sans-serif;">&#128222; ${leadData.phone}</a>
        </td></tr>
        <tr><td height="20"></td></tr>
        <tr><td style="background:#0f1f35;border-radius:10px;border:1px solid #1e2d45;overflow:hidden;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:12px 18px;border-bottom:1px solid #1e2d45;">
              <p style="margin:0;font-size:10px;font-weight:700;color:#C8952A;letter-spacing:2px;text-transform:uppercase;font-family:Arial,sans-serif;">Property Requirements</p>
            </td></tr>
            <tr><td style="padding:12px 18px;border-bottom:1px solid #1a2840;display:flex;justify-content:space-between;"><span style="color:#64748b;font-size:13px;font-family:Arial,sans-serif;">Property Type</span><span style="color:#e2e8f0;font-weight:600;font-size:13px;font-family:Arial,sans-serif;">${leadData.type || leadData.property || '—'}</span></td></tr>
            <tr><td style="padding:12px 18px;border-bottom:1px solid #1a2840;">
              <table width="100%"><tr><td style="color:#64748b;font-size:13px;font-family:Arial,sans-serif;">Location</td><td align="right" style="color:#e2e8f0;font-weight:600;font-size:13px;font-family:Arial,sans-serif;">${leadData.area || leadData.location || '—'}</td></tr></table>
            </td></tr>
            <tr><td style="padding:12px 18px;border-bottom:1px solid #1a2840;">
              <table width="100%"><tr><td style="color:#64748b;font-size:13px;font-family:Arial,sans-serif;">Budget</td><td align="right" style="color:#22c55e;font-weight:700;font-size:16px;font-family:Arial,sans-serif;">${leadData.budget || '—'}</td></tr></table>
            </td></tr>
            <tr><td style="padding:12px 18px;border-bottom:1px solid #1a2840;">
              <table width="100%"><tr><td style="color:#64748b;font-size:13px;font-family:Arial,sans-serif;">Timeline</td><td align="right" style="color:#e2e8f0;font-weight:600;font-size:13px;font-family:Arial,sans-serif;">${leadData.timeline || 'Not specified'}</td></tr></table>
            </td></tr>
            <tr><td style="padding:12px 18px;border-bottom:1px solid #1a2840;">
              <table width="100%"><tr><td style="color:#64748b;font-size:13px;font-family:Arial,sans-serif;">Loan / Cash</td><td align="right" style="color:#e2e8f0;font-weight:600;font-size:13px;font-family:Arial,sans-serif;">${leadData.details && leadData.details.loan ? leadData.details.loan : '—'}</td></tr></table>
            </td></tr>
            <tr><td style="padding:12px 18px;">
              <table width="100%"><tr><td style="color:#64748b;font-size:13px;font-family:Arial,sans-serif;">Special Requirements</td><td align="right" style="color:#e2e8f0;font-weight:600;font-size:13px;font-family:Arial,sans-serif;">${leadData.details && leadData.details.special ? leadData.details.special : leadData.special_requirements || '—'}</td></tr></table>
            </td></tr>
          </table>
        </td></tr>
        ${summaryHtml}
        <tr><td height="24"></td></tr>
        <tr><td align="center">
          <a href="tel:${leadData.phone}" style="background:#0E1B30;border:1px solid #C8952A;color:#C8952A;padding:14px 40px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block;font-family:Arial,sans-serif;">&#128222; Call ${leadData.name}</a>
        </td></tr>
      </table>
    `)
  });
  if (error) console.error('Email error:', error);
  else console.log(`Lead email sent to ${broker.email}`);
}

// ===== SEND WELCOME EMAIL (TRIAL) =====
async function sendWelcomeEmail(broker) {
  const trialEnd = new Date();
  trialEnd.setDate(trialEnd.getDate() + 7);
  const trialEndStr = trialEnd.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  const { error } = await resend.emails.send({
    from: 'EstateBot <welcome@estatebotai.in>',
    to: broker.email,
    subject: `Welcome to EstateBot AI — Your Free Trial Begins Today`,
    html: wrapEmail(`
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="text-align:center;padding-bottom:28px;border-bottom:1px solid #1e2d45;">
          <div style="width:56px;height:56px;background:rgba(200,149,42,0.1);border:1px solid rgba(200,149,42,0.3);border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px;font-size:24px;">🎉</div>
          <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#ffffff;font-family:Arial,sans-serif;">Your Free Trial is Active</h1>
          <p style="margin:0;color:#64748b;font-size:14px;font-family:Arial,sans-serif;">Welcome to EstateBot AI, ${broker.name}</p>
        </td></tr>
        <tr><td height="24"></td></tr>
        <tr><td>
          <p style="margin:0 0 16px;color:#94a3b8;font-size:14px;line-height:1.8;font-family:Arial,sans-serif;">Your AI lead agent is now live and ready to engage every visitor on your page — 24 hours a day, 7 days a week. Every qualified lead will be sent directly to your inbox.</p>
        </td></tr>
        <tr><td style="background:#0f1f35;border-radius:10px;border:1px solid #1e2d45;padding:18px;margin-bottom:20px;">
          <p style="margin:0 0 6px;font-size:10px;font-weight:700;color:#C8952A;letter-spacing:2px;text-transform:uppercase;font-family:Arial,sans-serif;">Your Bot Link</p>
          <a href="https://estatebotai.in/${broker.broker_id}" style="color:#ffffff;font-size:14px;font-weight:600;font-family:Arial,sans-serif;text-decoration:none;word-break:break-all;">https://estatebotai.in/${broker.broker_id}</a>
          <p style="margin:10px 0 0;font-size:12px;color:#4a5568;font-family:Arial,sans-serif;">Share this link on Instagram, WhatsApp, or your website to start capturing leads.</p>
        </td></tr>
        <tr><td height="16"></td></tr>
        <tr><td style="background:#0f1f35;border-radius:10px;border:1px solid #1e2d45;overflow:hidden;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:12px 18px;border-bottom:1px solid #1e2d45;">
              <p style="margin:0;font-size:10px;font-weight:700;color:#C8952A;letter-spacing:2px;text-transform:uppercase;font-family:Arial,sans-serif;">Trial Details</p>
            </td></tr>
            <tr><td style="padding:12px 18px;border-bottom:1px solid #1a2840;">
              <table width="100%"><tr><td style="color:#64748b;font-size:13px;font-family:Arial,sans-serif;">Plan</td><td align="right" style="color:#e2e8f0;font-weight:600;font-size:13px;font-family:Arial,sans-serif;">7-Day Free Trial</td></tr></table>
            </td></tr>
            <tr><td style="padding:12px 18px;border-bottom:1px solid #1a2840;">
              <table width="100%"><tr><td style="color:#64748b;font-size:13px;font-family:Arial,sans-serif;">Trial Ends</td><td align="right" style="color:#C8952A;font-weight:600;font-size:13px;font-family:Arial,sans-serif;">${trialEndStr}</td></tr></table>
            </td></tr>
            <tr><td style="padding:12px 18px;">
              <table width="100%"><tr><td style="color:#64748b;font-size:13px;font-family:Arial,sans-serif;">After Trial</td><td align="right" style="color:#e2e8f0;font-weight:600;font-size:13px;font-family:Arial,sans-serif;">₹2,999 / month</td></tr></table>
            </td></tr>
          </table>
        </td></tr>
        <tr><td height="24"></td></tr>
        <tr><td align="center">
          <a href="https://estatebotai.in/dashboard" style="background:#C8952A;color:#000000;padding:14px 40px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block;font-family:Arial,sans-serif;">Open Dashboard →</a>
        </td></tr>
      </table>
    `)
  });
  if (error) console.error('Welcome email error:', error);
  else console.log(`Welcome email sent to ${broker.email}`);
}

// ===== SEND SUBSCRIPTION SUCCESS EMAIL =====
async function sendSubscriptionEmail(broker) {
  const validTill = broker.subscription_valid_till
    ? new Date(broker.subscription_valid_till).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : '—';

  const { error } = await resend.emails.send({
    from: 'EstateBot <welcome@estatebotai.in>',
    to: broker.email,
    subject: `Payment Confirmed — EstateBot AI Pro is Active`,
    html: wrapEmail(`
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="text-align:center;padding-bottom:28px;border-bottom:1px solid #1e2d45;">
          <div style="width:56px;height:56px;background:rgba(34,197,94,0.1);border:1px solid rgba(34,197,94,0.3);border-radius:50%;display:inline-block;margin-bottom:16px;line-height:56px;font-size:24px;">✅</div>
          <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#ffffff;font-family:Arial,sans-serif;">Payment Confirmed</h1>
          <p style="margin:0;color:#64748b;font-size:14px;font-family:Arial,sans-serif;">Your EstateBot AI Pro subscription is now active</p>
        </td></tr>
        <tr><td height="24"></td></tr>
        <tr><td>
          <p style="margin:0 0 16px;color:#94a3b8;font-size:14px;line-height:1.8;font-family:Arial,sans-serif;">Thank you, ${broker.name}. Your AI lead agent is now working around the clock — capturing, qualifying, and forwarding every serious buyer directly to your inbox.</p>
        </td></tr>
        <tr><td style="background:#0f1f35;border-radius:10px;border:1px solid #1e2d45;overflow:hidden;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:12px 18px;border-bottom:1px solid #1e2d45;">
              <p style="margin:0;font-size:10px;font-weight:700;color:#C8952A;letter-spacing:2px;text-transform:uppercase;font-family:Arial,sans-serif;">Subscription Details</p>
            </td></tr>
            <tr><td style="padding:12px 18px;border-bottom:1px solid #1a2840;">
              <table width="100%"><tr><td style="color:#64748b;font-size:13px;font-family:Arial,sans-serif;">Plan</td><td align="right" style="color:#e2e8f0;font-weight:600;font-size:13px;font-family:Arial,sans-serif;">EstateBot AI Pro</td></tr></table>
            </td></tr>
            <tr><td style="padding:12px 18px;border-bottom:1px solid #1a2840;">
              <table width="100%"><tr><td style="color:#64748b;font-size:13px;font-family:Arial,sans-serif;">Amount Paid</td><td align="right" style="color:#22c55e;font-weight:700;font-size:15px;font-family:Arial,sans-serif;">₹2,999</td></tr></table>
            </td></tr>
            <tr><td style="padding:12px 18px;border-bottom:1px solid #1a2840;">
              <table width="100%"><tr><td style="color:#64748b;font-size:13px;font-family:Arial,sans-serif;">Valid Until</td><td align="right" style="color:#C8952A;font-weight:600;font-size:13px;font-family:Arial,sans-serif;">${validTill}</td></tr></table>
            </td></tr>
            <tr><td style="padding:12px 18px;">
              <table width="100%"><tr><td style="color:#64748b;font-size:13px;font-family:Arial,sans-serif;">Status</td><td align="right" style="color:#22c55e;font-weight:700;font-size:13px;font-family:Arial,sans-serif;">● Active</td></tr></table>
            </td></tr>
          </table>
        </td></tr>
        <tr><td height="24"></td></tr>
        <tr><td align="center">
          <a href="https://estatebotai.in/dashboard" style="background:#C8952A;color:#000000;padding:14px 40px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block;font-family:Arial,sans-serif;">Open Dashboard →</a>
        </td></tr>
      </table>
    `)
  });
  if (error) console.error('Subscription email error:', error);
  else console.log(`Subscription email sent to ${broker.email}`);
}

// ===== SEND TRIAL EXPIRY REMINDER EMAIL =====
async function sendTrialExpiryEmail(broker, daysLeft = 0) {
  let subject, heading, subheading, bodyText, urgencyColor;

  if (daysLeft === 3) {
    subject = 'Your EstateBot Trial Ends in 3 Days';
    heading = '3 Days Remaining';
    subheading = 'Your free trial is ending soon';
    bodyText = 'Your 7-day free trial ends in 3 days. After that, your AI lead agent will stop responding to potential buyers. Subscribe now to keep your bot running without interruption.';
    urgencyColor = '#F59E0B';
  } else if (daysLeft === 2) {
    subject = '2 Days Left — Don\'t Lose Your Leads';
    heading = '2 Days Left';
    subheading = 'Your leads are counting on you';
    bodyText = 'Only 2 days remain on your free trial. Every day your bot is offline is a lead you\'re missing. Subscribe today and keep your AI agent working 24/7.';
    urgencyColor = '#F97316';
  } else if (daysLeft === 1) {
    subject = 'Last Day — Your Trial Expires Tomorrow';
    heading = 'Trial Expires Tomorrow';
    subheading = 'This is your final reminder';
    bodyText = 'Your free trial expires tomorrow. Your bot will stop responding after tonight. Subscribe now to ensure zero downtime and keep every lead coming through.';
    urgencyColor = '#EF4444';
  } else {
    subject = 'Your EstateBot Trial Has Expired';
    heading = 'Trial Expired';
    subheading = 'Your bot has been paused';
    bodyText = 'Your free trial has ended and your bot is no longer active. Subscribe now to reactivate your AI lead agent and start capturing leads again.';
    urgencyColor = '#EF4444';
  }

  const { error } = await resend.emails.send({
    from: 'EstateBot <welcome@estatebotai.in>',
    to: broker.email,
    subject,
    html: wrapEmail(`
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="text-align:center;padding-bottom:28px;border-bottom:1px solid #1e2d45;">
          <div style="display:inline-block;background:rgba(200,149,42,0.08);border:1px solid ${urgencyColor}33;border-radius:10px;padding:10px 20px;margin-bottom:16px;">
            <span style="font-family:Arial,sans-serif;font-size:12px;font-weight:700;color:${urgencyColor};letter-spacing:2px;text-transform:uppercase;">${daysLeft > 0 ? daysLeft + ' DAY' + (daysLeft > 1 ? 'S' : '') + ' LEFT' : 'EXPIRED'}</span>
          </div>
          <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#ffffff;font-family:Arial,sans-serif;">${heading}</h1>
          <p style="margin:0;color:#64748b;font-size:14px;font-family:Arial,sans-serif;">${subheading}</p>
        </td></tr>
        <tr><td height="24"></td></tr>
        <tr><td>
          <p style="margin:0 0 20px;color:#94a3b8;font-size:14px;line-height:1.8;font-family:Arial,sans-serif;">${bodyText}</p>
        </td></tr>
        <tr><td style="background:#0f1f35;border-radius:10px;border:1px solid #1e2d45;overflow:hidden;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:12px 18px;border-bottom:1px solid #1e2d45;">
              <p style="margin:0;font-size:10px;font-weight:700;color:#C8952A;letter-spacing:2px;text-transform:uppercase;font-family:Arial,sans-serif;">EstateBot AI Pro</p>
            </td></tr>
            <tr><td style="padding:14px 18px;border-bottom:1px solid #1a2840;">
              <table width="100%"><tr><td style="color:#94a3b8;font-size:13px;font-family:Arial,sans-serif;">✓ &nbsp;Unlimited AI lead conversations</td></tr></table>
            </td></tr>
            <tr><td style="padding:14px 18px;border-bottom:1px solid #1a2840;">
              <table width="100%"><tr><td style="color:#94a3b8;font-size:13px;font-family:Arial,sans-serif;">✓ &nbsp;Instant email on every qualified lead</td></tr></table>
            </td></tr>
            <tr><td style="padding:14px 18px;border-bottom:1px solid #1a2840;">
              <table width="100%"><tr><td style="color:#94a3b8;font-size:13px;font-family:Arial,sans-serif;">✓ &nbsp;Full broker dashboard & analytics</td></tr></table>
            </td></tr>
            <tr><td style="padding:14px 18px;">
              <table width="100%"><tr><td style="color:#94a3b8;font-size:13px;font-family:Arial,sans-serif;">✓ &nbsp;24/7 bot — never miss a lead</td></tr></table>
            </td></tr>
          </table>
        </td></tr>
        <tr><td height="8"></td></tr>
        <tr><td style="text-align:center;padding:16px 0;">
          <p style="margin:0;font-size:28px;font-weight:700;color:#ffffff;font-family:Arial,sans-serif;">₹2,999<span style="font-size:14px;font-weight:400;color:#64748b;"> / month</span></p>
        </td></tr>
        <tr><td align="center">
          <a href="https://estatebotai.in/dashboard" style="background:#C8952A;color:#000000;padding:14px 40px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block;font-family:Arial,sans-serif;">Subscribe Now →</a>
        </td></tr>
      </table>
    `)
  });
  if (error) console.error('Trial expiry email error:', error);
  else console.log(`Trial expiry email (${daysLeft} days left) sent to ${broker.email}`);
}

module.exports = { generateSummary, sendLeadEmail, sendWelcomeEmail, sendTrialExpiryEmail, sendSubscriptionEmail };
