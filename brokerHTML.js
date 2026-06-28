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


module.exports = { getBrokerHTML };
