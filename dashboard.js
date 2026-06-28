const SUPABASE_URL = 'https://twxtryvauijzxpddapns.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3eHRyeXZhdWlqenhwZGRhcG5zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzOTkwMDQsImV4cCI6MjA5Nzk3NTAwNH0.o08UXLFnurPhhmgXScdjNsjojyUcKqY9J_SIAwp8T3w';
let currentBroker = null, allLeads = [], filteredLeads = [], filteredLeads2 = [];
let currentPage = 1, currentPage2 = 1;
const PER_PAGE = 10;
let followUps = JSON.parse(localStorage.getItem('eb_followups')||'[]');
let notes = JSON.parse(localStorage.getItem('eb_notes')||'{}');
let callLogs = JSON.parse(localStorage.getItem('eb_calllogs')||'{}');

async function supaFetch(path){
  const r = await fetch(SUPABASE_URL+path,{headers:{'apikey':SUPABASE_KEY,'Authorization':'Bearer '+SUPABASE_KEY}});
  return r.json();
}
async function supaPatch(path,body){
  const r = await fetch(SUPABASE_URL+path,{method:'PATCH',headers:{'apikey':SUPABASE_KEY,'Authorization':'Bearer '+SUPABASE_KEY,'Content-Type':'application/json','Prefer':'return=minimal'},body:JSON.stringify(body)});
  return r.ok;
}

function getGreeting(){const h=new Date().getHours();return h<12?'Good morning':h<17?'Good afternoon':'Good evening';}
function getScore(lead){
  let s=30;if(lead.phone)s+=20;if(lead.budget)s+=15;if(lead.area)s+=10;
  if(lead.timeline){const t=lead.timeline.toLowerCase();if(t.includes('urgent')||t.includes('15')||t.includes('1 month'))s+=20;else if(t.includes('3'))s+=10;else s+=5;}
  if((lead.intent||'').toLowerCase().includes('kharid'))s+=5;return Math.min(s,99);
}
function getScoreType(s){return s>=70?'hot':s>=40?'warm':'cold';}
function getScoreColor(t){return t==='hot'?'#EF4444':t==='warm'?'#F59E0B':'#3B82F6';}
function getInitials(n){return(n||'?').split(' ').map(w=>w[0]).join('').substring(0,2).toUpperCase();}
function getAvColor(n){const c=['linear-gradient(135deg,#F97316,#DC2626)','linear-gradient(135deg,#8B5CF6,#6D28D9)','linear-gradient(135deg,#06B6D4,#0891B2)','linear-gradient(135deg,#EC4899,#BE185D)','linear-gradient(135deg,#10B981,#059669)','linear-gradient(135deg,#F59E0B,#D97706)'];return c[(n||'').charCodeAt(0)%c.length];}
function timeAgo(d){if(!d)return'';const m=Math.floor((Date.now()-new Date(d))/60000);if(m<1)return'Abhi';if(m<60)return m+'m ago';const h=Math.floor(m/60);if(h<24)return h+'h ago';return Math.floor(h/24)+'d ago';}
function showToast(msg,type='success'){const t=document.getElementById('toast');t.textContent=msg;t.style.background=type==='error'?'#EF4444':'#0E1B30';t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2800);}
function toggleSidebar(){document.getElementById('sidebar').classList.toggle('mobile-open');}

async function doLogin(){
  const email=document.getElementById('loginEmail').value.trim();
  const pass=document.getElementById('loginPass').value.trim();
  if(!email||!pass)return;
  const btn=document.querySelector('.login-btn');
  btn.textContent='Checking...';btn.disabled=true;
  const brokers=await supaFetch(`/rest/v1/brokers?email=eq.${encodeURIComponent(email)}&select=*`);
  if(!brokers||!brokers[0]){document.getElementById('loginErr').style.display='block';btn.textContent='Login →';btn.disabled=false;return;}
  const broker=brokers[0];
  if(broker.password!==pass){document.getElementById('loginErr').style.display='block';btn.textContent='Login →';btn.disabled=false;return;}
  sessionStorage.setItem('broker_id',broker.broker_id);
  initDashboard(broker.broker_id);
}
function doLogout(){sessionStorage.removeItem('broker_id');location.reload();}

async function initDashboard(brokerId){
  const brokers=await supaFetch(`/rest/v1/brokers?broker_id=eq.${brokerId}&select=*`);
  if(!brokers||!brokers[0])return;
  currentBroker=brokers[0];
  document.getElementById('loginScreen').style.display='none';
  document.getElementById('sidebar').style.display='flex';
  document.getElementById('mainContent').style.display='flex';
  document.getElementById('brokerAvatar').textContent=getInitials(currentBroker.name);
  document.getElementById('brokerNameTop').textContent=currentBroker.name;
  document.getElementById('greeting').textContent=getGreeting()+', '+currentBroker.name.split(' ')[0]+'! 👋';
  document.getElementById('botLinkText').textContent='estatebotai.in/'+brokerId;
  // Plan info in sidebar
  const broker = currentBroker;
  let planText = '';
  if (broker.status === 'active' && broker.subscription_valid_till) {
    const validTill = new Date(broker.subscription_valid_till);
    const daysLeft = Math.max(0, Math.ceil((validTill - new Date()) / (1000 * 60 * 60 * 24)));
    const activeSince = broker.subscription_start ? Math.floor((new Date() - new Date(broker.subscription_start)) / (1000 * 60 * 60 * 24)) : null;
    planText = '✅ Active' + (activeSince !== null ? ' · ' + activeSince + ' din ho gaye' : '') + '\n⏳ ' + daysLeft + ' din baaki';
  } else if (broker.status === 'active') {
    planText = '✅ Plan: Active';
  } else if (broker.status === 'trial' && broker.trial_start) {
    const trialEnd = new Date(broker.trial_start);
    trialEnd.setDate(trialEnd.getDate() + (broker.trial_days || 7));
    const daysLeft = Math.max(0, Math.ceil((trialEnd - new Date()) / (1000 * 60 * 60 * 24)));
    planText = '🕐 Trial · ' + daysLeft + ' din baaki';
  } else if (broker.status === 'expired') {
    planText = '❌ Expired — Subscribe karo';
  } else {
    planText = 'Plan: ' + broker.status;
  }
  document.getElementById('planInfo').textContent = planText;
  showSubBanner(currentBroker);
  await loadLeads(brokerId);
  checkFollowUpNotifications();
  if(Notification.permission==='granted')setupLeadPolling(brokerId);
  setTimeout(()=>{checkDailySummary();checkAutoFollowUp();},1500);
}

async function loadLeads(brokerId){
  const data=await supaFetch(`/rest/v1/leads?broker_id=eq.${brokerId}&select=*&order=created_at.desc`);
  allLeads=(data||[]).map(l=>({...l,score:getScore(l),scoreType:getScoreType(getScore(l))}));
  const phones={};
  allLeads.forEach(l=>{const p=(l.phone||'').replace(/\s/g,'');if(p){phones[p]=(phones[p]||0)+1;}});
  allLeads=allLeads.map(l=>({...l,isDuplicate:phones[(l.phone||'').replace(/\s/g,'')]>1}));
  updateStats();
  filteredLeads=[...allLeads];
  currentPage=1;
  renderTable();
  document.getElementById('navLeadCount').textContent=allLeads.length;
  document.getElementById('planFill').style.width=Math.min((allLeads.length/500)*100,100)+'%';
}

function updateStats(){
  const today=new Date().toDateString();
  const todayLeads=allLeads.filter(l=>new Date(l.created_at).toDateString()===today);
  document.getElementById('statTotal').textContent=allLeads.length;
  document.getElementById('statHot').textContent=allLeads.filter(l=>l.scoreType==='hot').length;
  document.getElementById('statWarm').textContent=allLeads.filter(l=>l.scoreType==='warm').length;
  document.getElementById('statConverted').textContent=allLeads.filter(l=>l.status==='converted').length;
  document.getElementById('statToday').textContent=todayLeads.length;
  document.getElementById('statTodaySub').textContent='↑ '+todayLeads.length+' aaj';
}

function showPage(page){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  document.getElementById('page-'+page).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n=>{if(n.getAttribute('onclick')&&n.getAttribute('onclick').includes("'"+page+"'"))n.classList.add('active');});
  const titles={dashboard:'Dashboard',leads:'All Leads',analytics:'Analytics',followups:'Follow Ups',settings:'Settings'};
  document.getElementById('pageTitle').textContent=titles[page]||page;
  if(page==='leads')renderLeadsPage();
  if(page==='analytics')renderAnalytics();
  if(page==='followups')renderFollowUps();
  if(page==='settings')renderSettings();
}

const leadStore = {};

function buildLeadRow(lead, onclick){
  leadStore[lead.id] = lead;
  const score=lead.score,scoreType=lead.scoreType,scoreColor=getScoreColor(scoreType);
  const av=getInitials(lead.name),avColor=getAvColor(lead.name);
  const intentShort=(lead.intent||'').replace(' Chahte Hain','').replace(' Chahte Hai','');
  const statusLabels={new:'New',in_progress:'In Progress',converted:'Converted',not_interested:'Not Interested',follow_up:'Follow Up'};
  const statusColors={new:'#7C3AED',in_progress:'#D97706',converted:'#065F46',not_interested:'#DC2626',follow_up:'#1D4ED8'};
  const statusBg={new:'#EDE9FE',in_progress:'#FEF3C7',converted:'#D1FAE5',not_interested:'#FEE2E2',follow_up:'#DBEAFE'};
  const hasNote=notes[lead.id]?'💬':'';
  const hasLog=callLogs[lead.id]&&callLogs[lead.id].length?'📞':'';
  return `<div class="lead-row${lead.isDuplicate?' duplicate':''}" onclick="openDetail('${lead.id}')">
    <div class="lead-col-badge"><span class="badge ${scoreType}">${scoreType.toUpperCase()}</span></div>
    <div class="lead-av" style="background:${avColor};">${av}</div>
    <div class="lead-main-info">
      <div class="lead-name">${lead.name||'—'}${lead.isDuplicate?'<span class="dup-badge">DUP</span>':''}${hasNote}${hasLog}</div>
      <div class="lead-sub">${lead.phone||'—'}</div>
      <div class="lead-sub">${intentShort} · ${lead.property_type||'—'}</div>
      <div class="lead-sub">${lead.area||'—'}</div>
    </div>
    <div class="lead-right">
      <div class="lead-budget-val">${lead.budget||'—'}</div>
      <div class="lead-score-val" style="color:${scoreColor};">${score}%</div>
      <span style="background:${statusBg[lead.status||'new']};color:${statusColors[lead.status||'new']};padding:2px 6px;border-radius:4px;font-size:9px;font-weight:700;">${statusLabels[lead.status||'new']||'New'}</span>
      <div class="lead-time-val">${timeAgo(lead.created_at)}</div>
    </div>
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#CBD5E0" stroke-width="2" style="flex-shrink:0;"><polyline points="9 18 15 12 9 6"/></svg>
  </div>`;
}

function applyFilter(){
  const type=document.getElementById('filterType').value;
  const search=document.getElementById('searchInput').value.toLowerCase();
  filteredLeads=allLeads.filter(l=>{
    const ms=!search||(l.name||'').toLowerCase().includes(search)||(l.phone||'').includes(search)||(l.area||'').toLowerCase().includes(search);
    let mt=true;
    if(type==='hot')mt=l.scoreType==='hot';
    else if(type==='warm')mt=l.scoreType==='warm';
    else if(type==='cold')mt=l.scoreType==='cold';
    else if(type==='buy')mt=(l.intent||'').toLowerCase().includes('kharid')||(l.intent||'').toLowerCase().includes('buy');
    else if(type==='sell')mt=(l.intent||'').toLowerCase().includes('sell')||(l.intent||'').toLowerCase().includes('bech');
    else if(type==='rent')mt=(l.intent||'').toLowerCase().includes('rent');
    return ms&&mt;
  });
  currentPage=1;renderTable();
}

function renderTable(){
  const start=(currentPage-1)*PER_PAGE;
  const pageLeads=filteredLeads.slice(start,start+PER_PAGE);
  const total=filteredLeads.length;
  if(!total){document.getElementById('leadsBody').innerHTML='<div class="empty-state"><h3>Koi lead nahi mila</h3><p>Filter change karein ya apna bot share karein</p></div>';document.getElementById('paginationWrap').style.display='none';return;}
  document.getElementById('leadsBody').innerHTML=pageLeads.map(l=>buildLeadRow(l)).join('');
  renderPagination('pageInfo','pageBtns',currentPage,total,p=>{currentPage=p;renderTable();});
}

function renderLeadsPage(){filteredLeads2=[...allLeads];currentPage2=1;renderTable2();}

function applyFilter2(){
  const type=document.getElementById('filterType2').value;
  const sort=document.getElementById('sortType').value;
  const search=document.getElementById('searchInput2').value.toLowerCase();
  const budget=document.getElementById('budgetFilter')?.value||'all';
  filteredLeads2=allLeads.filter(l=>{
    const ms=!search||(l.name||'').toLowerCase().includes(search)||(l.phone||'').includes(search)||(l.area||'').toLowerCase().includes(search);
    let mt=true;
    if(type==='hot')mt=l.scoreType==='hot';
    else if(type==='warm')mt=l.scoreType==='warm';
    else if(type==='cold')mt=l.scoreType==='cold';
    else if(type==='buy')mt=(l.intent||'').toLowerCase().includes('kharid');
    else if(type==='sell')mt=(l.intent||'').toLowerCase().includes('sell')||(l.intent||'').toLowerCase().includes('bech');
    else if(type==='rent')mt=(l.intent||'').toLowerCase().includes('rent');
    else if(['new','in_progress','converted','not_interested','follow_up'].includes(type))mt=(l.status||'new')===type;
    let mb=true;
    if(budget!=='all'){const bv=getBudgetValue(l.budget);if(budget==='low')mb=bv>0&&bv<5000000;else if(budget==='mid')mb=bv>=5000000&&bv<=10000000;else if(budget==='high')mb=bv>10000000;}
    return ms&&mt&&mb;
  });
  filteredLeads2.sort((a,b)=>{
    if(sort==='date_asc')return new Date(a.created_at)-new Date(b.created_at);
    if(sort==='score_desc')return b.score-a.score;
    if(sort==='score_asc')return a.score-b.score;
    if(sort==='budget_desc'){const pa=parseInt((a.budget||'0').replace(/[^0-9]/g,''))||0;const pb=parseInt((b.budget||'0').replace(/[^0-9]/g,''))||0;return pb-pa;}
    return new Date(b.created_at)-new Date(a.created_at);
  });
  currentPage2=1;renderTable2();
}

function renderTable2(){
  const start=(currentPage2-1)*PER_PAGE;
  const pageLeads=filteredLeads2.slice(start,start+PER_PAGE);
  const total=filteredLeads2.length;
  if(!total){document.getElementById('leadsBody2').innerHTML='<div class="empty-state"><h3>Koi lead nahi mila</h3><p>Filter change karein</p></div>';document.getElementById('paginationWrap2').style.display='none';return;}
  document.getElementById('leadsBody2').innerHTML=pageLeads.map(l=>buildLeadRow(l)).join('');
  renderPagination('pageInfo2','pageBtns2',currentPage2,total,p=>{currentPage2=p;renderTable2();});
}

function renderPagination(infoId,btnsId,cur,total,cb){
  const totalPages=Math.ceil(total/PER_PAGE);
  const wrapId=infoId.includes('2')?'paginationWrap2':'paginationWrap';
  document.getElementById(wrapId).style.display='flex';
  document.getElementById(infoId).textContent=`Showing ${(cur-1)*PER_PAGE+1}–${Math.min(cur*PER_PAGE,total)} of ${total}`;
  let btns=`<button class="page-btn" ${cur===1?'disabled':''} onclick="(${cb.toString()})(${cur-1})">‹</button>`;
  for(let i=1;i<=Math.min(totalPages,5);i++)btns+=`<button class="page-btn ${i===cur?'active':''}" onclick="(${cb.toString()})(${i})">${i}</button>`;
  if(totalPages>5)btns+=`<span style="font-size:11px;color:var(--muted);padding:0 4px;">...</span>`;
  btns+=`<button class="page-btn" ${cur>=totalPages?'disabled':''} onclick="(${cb.toString()})(${cur+1})">›</button>`;
  document.getElementById(btnsId).innerHTML=btns;
}

function openDetail(leadId){
  const lead = leadStore[leadId];
  if(!lead) return;
  const score=lead.score||getScore(lead);
  const scoreType=lead.scoreType||getScoreType(score);
  const scoreColor=getScoreColor(scoreType);
  const av=getInitials(lead.name),avColor=getAvColor(lead.name);
  const phone=(lead.phone||'').replace(/\s/g,'');
  const savedNote=notes[lead.id]||'';
  const logs=callLogs[lead.id]||[];
  const brokerName=currentBroker?.name||'Broker';
  const templates=[
    `Namaste ${lead.name||'ji'}! Main ${brokerName} hoon. Aapne ${lead.property_type||'property'} ke baare mein enquiry ki thi. Kya aap abhi baat kar sakte hain?`,
    `Namaste ${lead.name||'ji'}! Aapke budget (${lead.budget||'—'}) ke hisaab se ${lead.area||'aapke area'} mein kuch achhe options hain. Interested hain?`,
    `Hi ${lead.name||'ji'}, koi update hai ${lead.property_type||'property'} ke baare mein? Hamare paas kuch naye options aaye hain.`,
    `Namaste ${lead.name||'ji'}, bas ek baar check karna tha — kya aap abhi bhi ${lead.property_type||'property'} dhundh rahe hain?`
  ];
  document.getElementById('detailBody').innerHTML=`
    <div style="margin-bottom:12px;"><span class="badge ${scoreType}" style="font-size:11px;padding:4px 10px;">${scoreType.toUpperCase()} LEAD</span>${lead.isDuplicate?'<span class="dup-badge" style="margin-left:6px;">⚠️ Duplicate Number</span>':''}</div>
    <div class="detail-top">
      <div class="detail-av" style="background:${avColor};">${av}</div>
      <div style="flex:1;min-width:0;"><div class="detail-name">${lead.name||'—'}</div><div class="detail-phone">${lead.phone||'—'}</div></div>
      <div class="score-wrap"><div class="score-num" style="color:${scoreColor};">${score}%</div><div class="score-lbl">Score</div><div class="score-bar" style="width:50px;margin-top:4px;"><div class="score-bar-fill" style="width:${score}%;background:${scoreColor};"></div></div></div>
    </div>
    <div class="detail-section">
      <div class="detail-section-title">Property Details</div>
      <div class="detail-row"><span class="detail-key">Intent</span><span class="detail-val">${(lead.intent||'—').replace(' Chahte Hain','')}</span></div>
      <div class="detail-row"><span class="detail-key">Property</span><span class="detail-val">${lead.property_type||'—'}</span></div>
      <div class="detail-row"><span class="detail-key">Location</span><span class="detail-val">${lead.area||'—'}</span></div>
      <div class="detail-row"><span class="detail-key">Budget</span><span class="detail-val" style="color:#10B981;font-weight:700;">${lead.budget||'—'}</span></div>
      <div class="detail-row"><span class="detail-key">Timeline</span><span class="detail-val">${lead.timeline||'—'}</span></div>
      ${lead.furnished&&lead.furnished!=='NA'?`<div class="detail-row"><span class="detail-key">Furnished</span><span class="detail-val">${lead.furnished}</span></div>`:''}
      ${lead.parking&&lead.parking!=='NA'?`<div class="detail-row"><span class="detail-key">Parking</span><span class="detail-val">${lead.parking}</span></div>`:''}
      ${lead.special_requirements?`<div class="detail-row"><span class="detail-key">Special</span><span class="detail-val">${lead.special_requirements}</span></div>`:''}
      <div class="detail-row"><span class="detail-key">Added</span><span class="detail-val">${new Date(lead.created_at).toLocaleString('en-IN',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</span></div>
    </div>
    <div class="detail-section">
      <div class="detail-section-title">Score Breakdown (${score}%)</div>
      <div style="margin-bottom:6px;"><div class="score-bar"><div class="score-bar-fill" style="width:${score}%;background:${scoreColor};"></div></div></div>
      ${getScoreExplain(lead).map(r=>`<div style="font-size:11px;color:var(--muted);padding:3px 0;">${r}</div>`).join('')}
    </div>
    <div class="detail-section">
      <div class="detail-section-title">Lead Status</div>
      <select class="status-select" id="statusSelect_${lead.id}" onchange="updateStatus('${lead.id}',this.value)" onclick="event.stopPropagation()">
        <option value="new" ${(lead.status||'new')==='new'?'selected':''}>🔵 New</option>
        <option value="in_progress" ${lead.status==='in_progress'?'selected':''}>🟡 In Progress</option>
        <option value="converted" ${lead.status==='converted'?'selected':''}>🟢 Converted</option>
        <option value="not_interested" ${lead.status==='not_interested'?'selected':''}>🔴 Not Interested</option>
        <option value="follow_up" ${lead.status==='follow_up'?'selected':''}>🔵 Follow Up</option>
      </select>
    </div>
    <div class="detail-section">
      <div class="detail-section-title">Private Note</div>
      <textarea class="notes-area" id="noteArea_${lead.id}" placeholder="Kuch note karo is lead ke baare mein...">${savedNote}</textarea>
      <button class="save-note-btn" onclick="saveNote('${lead.id}')">💾 Save Note</button>
    </div>
    <div class="detail-section">
      <div class="detail-section-title">Call Log</div>
      <div id="callLogDisplay_${lead.id}" style="margin-bottom:8px;">${logs.length?logs.slice(-3).map(l=>`<div style="font-size:11px;color:var(--muted);padding:4px 0;border-bottom:1px solid #F1F5F9;">${l}</div>`).join(''):'<div style="font-size:12px;color:var(--muted);">No calls logged yet</div>'}</div>
      <button class="save-note-btn" onclick="logCall('${lead.id}','${lead.name||''}')" style="color:var(--green);border-color:rgba(16,185,129,0.3);">📞 Log a Call</button>
    </div>
    <div class="action-btns">
      <button class="btn-call" onclick="makeCall('${phone}','${lead.id}','${lead.name||''}')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 8.63 19.79 19.79 0 01.12 2.18 2 2 0 012.11 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.91a16 16 0 006.18 6.18l.46-.46a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
        Call Now
      </button>
      <button class="btn-wa" onclick="sendWhatsApp('${phone}','${templates[0].replace(/'/g,"\\'")}')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
        WhatsApp
      </button>
      <button class="btn-gold" onclick="openAddFollowUp('${lead.id}','${lead.name||''}')">⏰ Set Follow Up Reminder</button>
      <button class="btn-secondary" style="color:#EF4444;border-color:rgba(239,68,68,0.3);" onclick="if(confirm('Is lead ko archive karo?'))archiveLead('${lead.id}')">🗄 Archive Lead</button>
    </div>
    ${renderTagsSection(lead.id)}
    <div class="detail-section" style="margin-top:14px;">
      <div class="detail-section-title">WhatsApp Templates</div>
      <div class="wa-templates">${templates.map((t,i)=>`<div class="wa-tpl" onclick="sendWhatsApp('${phone}','${t.replace(/'/g,"\\'").replace(/\n/g,' ')}')">${t.substring(0,80)}${t.length>80?'...':''}</div>`).join('')}</div>
    </div>`;
  document.getElementById('detailPanel').classList.add('open');
  document.getElementById('overlay').classList.add('show');
}

function closeDetail(){document.getElementById('detailPanel').classList.remove('open');document.getElementById('overlay').classList.remove('show');}
function makeCall(phone,leadId,leadName){window.location='tel:'+phone;setTimeout(()=>{const now=new Date().toLocaleString('en-IN',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});if(!callLogs[leadId])callLogs[leadId]=[];callLogs[leadId].push(`📞 Called ${now}`);localStorage.setItem('eb_calllogs',JSON.stringify(callLogs));showToast('Call logged!');},2000);}
function sendWhatsApp(phone,msg){window.open(`https://wa.me/91${phone}?text=${encodeURIComponent(msg)}`,'_blank');}
function saveNote(leadId){const note=document.getElementById('noteArea_'+leadId)?.value||'';notes[leadId]=note;localStorage.setItem('eb_notes',JSON.stringify(notes));showToast('Note saved!');}
function logCall(leadId,leadName){const now=new Date().toLocaleString('en-IN',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});const result=prompt('Call result likho');if(result===null)return;if(!callLogs[leadId])callLogs[leadId]=[];callLogs[leadId].push(`📞 ${now} — ${result||'Called'}`);localStorage.setItem('eb_calllogs',JSON.stringify(callLogs));const el=document.getElementById('callLogDisplay_'+leadId);if(el)el.innerHTML=callLogs[leadId].slice(-3).map(l=>`<div style="font-size:11px;color:var(--muted);padding:4px 0;border-bottom:1px solid #F1F5F9;">${l}</div>`).join('');showToast('Call logged!');}

async function updateStatus(leadId,newStatus){
  const ok=await supaPatch(`/rest/v1/leads?id=eq.${leadId}`,{status:newStatus});
  if(ok){allLeads=allLeads.map(l=>l.id===leadId?{...l,status:newStatus}:l);filteredLeads=filteredLeads.map(l=>l.id===leadId?{...l,status:newStatus}:l);filteredLeads2=filteredLeads2.map(l=>l.id===leadId?{...l,status:newStatus}:l);updateStats();renderTable();const labels={new:'New',in_progress:'In Progress',converted:'Converted ✅',not_interested:'Not Interested',follow_up:'Follow Up'};showToast('Status: '+(labels[newStatus]||newStatus));}
  else showToast('Update fail hua','error');
}

function exportCSV(){
  const leads=filteredLeads2.length?filteredLeads2:allLeads;
  const headers=['Name','Phone','Intent','Property','Location','Budget','Timeline','Score','Status','Added'];
  const rows=leads.map(l=>[l.name,l.phone,(l.intent||'').replace(' Chahte Hain',''),l.property_type,l.area,l.budget,l.timeline,l.score+'%',l.status||'new',new Date(l.created_at).toLocaleDateString('en-IN')].map(v=>`"${v||''}"`).join(','));
  const csv=[headers.join(','),...rows].join('\n');
  const blob=new Blob([csv],{type:'text/csv'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`leads_${new Date().toISOString().split('T')[0]}.csv`;a.click();
  showToast('CSV export ho gaya!');
}

function renderAnalytics(){
  const converted=allLeads.filter(l=>l.status==='converted').length;
  const convRate=allLeads.length?Math.round((converted/allLeads.length)*100):0;
  const today=new Date().toDateString();
  const todayLeads=allLeads.filter(l=>new Date(l.created_at).toDateString()===today);
  document.getElementById('analyticsStats').innerHTML=`<div style="background:#fff;border:1px solid var(--border);border-radius:10px;padding:14px;"><div style="font-size:20px;font-weight:800;color:var(--navy);">${allLeads.length}</div><div style="font-size:11px;color:var(--muted);margin-top:3px;">Total Leads</div></div><div style="background:#fff;border:1px solid var(--border);border-radius:10px;padding:14px;"><div style="font-size:20px;font-weight:800;color:#10B981;">${converted}</div><div style="font-size:11px;color:var(--muted);margin-top:3px;">Converted</div></div><div style="background:#fff;border:1px solid var(--border);border-radius:10px;padding:14px;"><div style="font-size:20px;font-weight:800;color:var(--gold);">${convRate}%</div><div style="font-size:11px;color:var(--muted);margin-top:3px;">Conversion Rate</div></div><div style="background:#fff;border:1px solid var(--border);border-radius:10px;padding:14px;"><div style="font-size:20px;font-weight:800;color:#7C3AED;">${todayLeads.length}</div><div style="font-size:11px;color:var(--muted);margin-top:3px;">Today's Leads</div></div>`;
  const days=[],counts=[];
  for(let i=6;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);days.push(d.toLocaleDateString('en-IN',{weekday:'short'}));counts.push(allLeads.filter(l=>new Date(l.created_at).toDateString()===d.toDateString()).length);}
  const maxC=Math.max(...counts,1);
  document.getElementById('chartLeadsDay').innerHTML=counts.map(c=>`<div class="bar-wrap"><div class="bar" style="height:${Math.max((c/maxC)*95,4)}px;" title="${c}"></div></div>`).join('');
  document.getElementById('chartDayLabels').innerHTML=days.map(d=>`<div class="bar-lbl" style="flex:1;text-align:center;">${d}</div>`).join('');
  const props={};allLeads.forEach(l=>{const p=l.property_type||'Other';props[p]=(props[p]||0)+1;});
  const sp=Object.entries(props).sort((a,b)=>b[1]-a[1]).slice(0,6);
  const maxP=Math.max(...sp.map(x=>x[1]),1);
  const pc=['#5B3DF5','#10B981','#F59E0B','#EF4444','#06B6D4','#EC4899'];
  document.getElementById('propTypeSplit').innerHTML=sp.map(([p,n],i)=>`<div class="split-row"><div class="split-label">${p}</div><div class="split-count">${n}</div><div class="split-bar-bg"><div class="split-bar-fill" style="width:${(n/maxP)*100}%;background:${pc[i%pc.length]};"></div></div></div>`).join('')||'<div style="color:var(--muted);font-size:13px;">No data</div>';
  const intents={Kharidna:0,Bechna:0,'Rent Lena':0,'Rent Dena':0};
  allLeads.forEach(l=>{const i=(l.intent||'').toLowerCase();if(i.includes('kharid')||i.includes('buy'))intents.Kharidna++;else if(i.includes('sell')||i.includes('bech'))intents.Bechna++;else if(i.includes('rent lena'))intents['Rent Lena']++;else if(i.includes('rent dena'))intents['Rent Dena']++;});
  const ic={Kharidna:'#5B3DF5',Bechna:'#10B981','Rent Lena':'#F59E0B','Rent Dena':'#EF4444'};
  const ti=Object.values(intents).reduce((a,b)=>a+b,1);
  document.getElementById('intentSplit').innerHTML=Object.entries(intents).map(([k,v])=>`<div class="split-row"><div style="width:9px;height:9px;border-radius:50%;background:${ic[k]};flex-shrink:0;"></div><div class="split-label">${k}</div><div class="split-count">${Math.round((v/ti)*100)}%</div><div class="split-bar-bg"><div class="split-bar-fill" style="width:${(v/ti)*100}%;background:${ic[k]};"></div></div></div>`).join('');
  const locs={};allLeads.forEach(l=>{const a=(l.area||'').split(',')[0].trim()||'Unknown';locs[a]=(locs[a]||0)+1;});
  const sl=Object.entries(locs).sort((a,b)=>b[1]-a[1]).slice(0,6);
  const maxL=Math.max(...sl.map(x=>x[1]),1);
  document.getElementById('topLocations').innerHTML=sl.map(([l,n])=>`<div class="split-row"><div class="split-label">📍 ${l}</div><div class="split-count">${n}</div><div class="split-bar-bg"><div class="split-bar-fill" style="width:${(n/maxL)*100}%;background:var(--navy);"></div></div></div>`).join('')||'<div style="color:var(--muted);font-size:13px;">No data</div>';
}

function renderFollowUps(){
  const brokerId=currentBroker?.broker_id;
  const myFU=followUps.filter(f=>f.brokerId===brokerId);
  const todayStr=new Date().toISOString().split('T')[0];
  const upcoming=myFU.filter(f=>!f.done).sort((a,b)=>a.date.localeCompare(b.date));
  const done=myFU.filter(f=>f.done);
  const overdue=upcoming.filter(f=>f.date<todayStr).length;
  const todayCount=upcoming.filter(f=>f.date===todayStr).length;
  const badge=document.getElementById('navFollowCount');
  const urgentCount=overdue+todayCount;
  if(urgentCount>0){badge.style.display='';badge.textContent=urgentCount;}else badge.style.display='none';
  if(!upcoming.length&&!done.length){document.getElementById('followUpsContainer').innerHTML=`<div style="text-align:center;padding:48px;color:var(--muted);"><div style="font-size:32px;margin-bottom:12px;">⏰</div><div style="font-size:15px;font-weight:600;color:var(--text);margin-bottom:6px;">Koi follow up nahi hai</div></div>`;return;}
  let html='';
  if(upcoming.length){html+=`<div style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">Upcoming (${upcoming.length})</div>`;html+=upcoming.map(f=>{const d=new Date(f.date+'T00:00:00');const isOverdue=f.date<todayStr,isToday=f.date===todayStr;return `<div class="fu-card" style="${isOverdue?'border-color:#EF4444;':isToday?'border-color:var(--gold);':''}"><div class="fu-date" style="background:${isOverdue?'#EF4444':isToday?'var(--gold)':'var(--navy)'}"><div class="day">${d.getDate()}</div><div>${d.toLocaleString('en-IN',{month:'short'})}</div></div><div style="flex:1;min-width:0;"><div class="fu-name">${f.leadName}</div><div class="fu-note">${f.note||'No note'}</div>${isOverdue?'<div style="font-size:10px;color:#EF4444;font-weight:700;">OVERDUE</div>':isToday?'<div style="font-size:10px;color:var(--gold);font-weight:700;">TODAY</div>':''}</div><button class="fu-done-btn" onclick="markFollowUpDone('${f.id}')">✓ Done</button></div>`;}).join('');}
  if(done.length){html+=`<div style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin:14px 0 10px;">Completed (${done.length})</div>`;html+=done.slice(0,5).map(f=>`<div class="fu-card" style="opacity:0.5;"><div class="fu-date"><div class="day">${new Date(f.date+'T00:00:00').getDate()}</div><div>${new Date(f.date+'T00:00:00').toLocaleString('en-IN',{month:'short'})}</div></div><div><div class="fu-name" style="text-decoration:line-through;">${f.leadName}</div><div class="fu-note">${f.note||''}</div></div><div style="margin-left:auto;font-size:11px;color:var(--green);font-weight:600;">✓ Done</div></div>`).join('');}
  document.getElementById('followUpsContainer').innerHTML=html;
}

function openAddFollowUp(leadId,leadName){
  const sel=document.getElementById('fuLeadSelect');
  sel.innerHTML='<option value="">-- Lead Select Karo --</option>'+allLeads.map(l=>`<option value="${l.id}|${l.name}" ${l.id===leadId?'selected':''}>${l.name} — ${l.phone||''}</option>`).join('');
  if(leadId)sel.value=leadId+'|'+leadName;
  document.getElementById('fuDate').value=new Date().toISOString().split('T')[0];
  document.getElementById('fuNote').value='';
  document.getElementById('fuModal').classList.add('show');
}
function closeFuModal(){document.getElementById('fuModal').classList.remove('show');}
function saveFollowUp(){
  const sel=document.getElementById('fuLeadSelect').value;
  const date=document.getElementById('fuDate').value;
  const note=document.getElementById('fuNote').value.trim();
  if(!sel||!date){showToast('Lead aur date select karo','error');return;}
  const[leadId,leadName]=sel.split('|');
  followUps.push({id:Date.now().toString(),brokerId:currentBroker?.broker_id,leadId,leadName,date,note,done:false});
  localStorage.setItem('eb_followups',JSON.stringify(followUps));
  closeFuModal();renderFollowUps();showToast('Follow up set ho gaya!');
}
function markFollowUpDone(id){followUps=followUps.map(f=>f.id===id?{...f,done:true}:f);localStorage.setItem('eb_followups',JSON.stringify(followUps));renderFollowUps();showToast('Follow up complete! ✅');}
function checkFollowUpNotifications(){const brokerId=currentBroker?.broker_id;const today=new Date().toISOString().split('T')[0];const todayFUs=followUps.filter(f=>f.brokerId===brokerId&&!f.done&&f.date<=today);if(todayFUs.length>0){const badge=document.getElementById('navFollowCount');badge.style.display='';badge.textContent=todayFUs.length;}}

function renderSettings(){
  if(!currentBroker)return;
  document.getElementById('settingsBotLink').textContent='https://estatebotai.in/'+currentBroker.broker_id;
  document.getElementById('settingsAccountInfo').innerHTML=`<div style="display:flex;flex-direction:column;gap:8px;">${[['Name',currentBroker.name],['Email',currentBroker.email||'—'],['Phone',currentBroker.phone||'—'],['City',currentBroker.city||'—'],['Plan',currentBroker.status?.toUpperCase()]].map(([k,v])=>`<div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--border);font-size:12px;"><span style="color:var(--muted);">${k}</span><span style="font-weight:600;">${v}</span></div>`).join('')}</div>`;
  if(Notification.permission==='granted')document.getElementById('notifBtn').textContent='✓ Enabled';
}

async function changePassword(){
  const p1=document.getElementById('newPass1').value;
  const p2=document.getElementById('newPass2').value;
  if(!p1||!p2){showToast('Password dono fields mein likho','error');return;}
  if(p1!==p2){showToast('Passwords match nahi kar rahe','error');return;}
  if(p1.length<6){showToast('Password kam se kam 6 characters ka hona chahiye','error');return;}
  const ok=await supaPatch(`/rest/v1/brokers?broker_id=eq.${currentBroker.broker_id}`,{password:p1});
  if(ok){showToast('Password update ho gaya! ✅');document.getElementById('newPass1').value='';document.getElementById('newPass2').value='';}
  else showToast('Update fail hua','error');
}

function copyBotLink(){if(!currentBroker)return;navigator.clipboard.writeText('https://estatebotai.in/'+currentBroker.broker_id);showToast('Link copy ho gaya! 📋');}
function previewBot(){if(!currentBroker)return;window.open('https://estatebotai.in/'+currentBroker.broker_id,'_blank');}
function requestNotifPermission(){Notification.requestPermission().then(p=>{if(p==='granted'){showToast('Notifications enabled! ✅');document.getElementById('notifBtn').textContent='✓ Enabled';setupLeadPolling(currentBroker.broker_id);}else showToast('Notifications blocked','error');});}

let lastLeadCount=0;
function setupLeadPolling(brokerId){
  lastLeadCount=allLeads.length;
  setInterval(async()=>{
    const data=await supaFetch(`/rest/v1/leads?broker_id=eq.${brokerId}&select=id,name,phone,created_at&order=created_at.desc&limit=1`);
    if(data&&data[0]&&allLeads.length>0){const latestId=data[0].id;const found=allLeads.find(l=>l.id===latestId);if(!found){const lead=data[0];if(Notification.permission==='granted'){new Notification('🔥 Naya Lead!',{body:`${lead.name||'New lead'} — ${lead.phone||''}`,icon:'/favicon.ico'});}showToast('🔥 Naya lead aaya — '+(lead.name||'Unknown'));await loadLeads(brokerId);}}
  },30000);
}

function getScoreExplain(lead){
  const reasons=[];
  if(lead.phone)reasons.push('✅ Phone number mila');else reasons.push('❌ Phone number missing');
  if(lead.budget)reasons.push('✅ Budget bataya: '+lead.budget);else reasons.push('❌ Budget nahi bataya');
  if(lead.area)reasons.push('✅ Location bataya: '+lead.area);else reasons.push('❌ Location nahi bataya');
  if(lead.timeline){const t=lead.timeline.toLowerCase();if(t.includes('urgent')||t.includes('15')||t.includes('1 month'))reasons.push('✅ Timeline urgent hai');else reasons.push('⚠️ Timeline: '+lead.timeline);}else reasons.push('❌ Timeline nahi bataya');
  if((lead.intent||'').toLowerCase().includes('kharid'))reasons.push('✅ Kharidna chahta hai (buyer)');
  return reasons;
}

let currentLeadsTab='active';
function switchLeadsTab(tab){
  currentLeadsTab=tab;
  document.getElementById('tab-active').style.background=tab==='active'?'var(--navy)':'#fff';
  document.getElementById('tab-active').style.color=tab==='active'?'#fff':'var(--muted)';
  document.getElementById('tab-archived').style.background=tab==='archived'?'var(--navy)':'#fff';
  document.getElementById('tab-archived').style.color=tab==='archived'?'#fff':'var(--muted)';
  if(tab==='active')renderLeadsPage();else renderArchivedLeads();
}

let archivedLeads=JSON.parse(localStorage.getItem('eb_archived')||'[]');

function renderArchivedLeads(){
  const archived=Object.values(leadStore).filter(l=>archivedLeads.includes(l.id));
  const body=document.getElementById('leadsBody2');
  const wrap=document.getElementById('paginationWrap2');
  if(!archived.length){body.innerHTML='<div class="empty-state"><h3>Koi archived lead nahi hai</h3></div>';wrap.style.display='none';return;}
  body.innerHTML=archived.map(lead=>{
    const score=lead.score||getScore(lead);const scoreType=lead.scoreType||getScoreType(score);const scoreColor=getScoreColor(scoreType);
    const av=getInitials(lead.name),avColor=getAvColor(lead.name);
    const intentShort=(lead.intent||'').replace(' Chahte Hain','').replace(' Chahte Hai','');
    return `<div class="lead-row" style="opacity:0.6;"><div class="lead-col-badge"><span class="badge ${scoreType}">${scoreType.toUpperCase()}</span></div><div class="lead-av" style="background:${avColor};">${av}</div><div class="lead-main-info"><div class="lead-name">${lead.name||'—'} <span style="font-size:9px;background:#F3F4F6;color:var(--muted);padding:2px 6px;border-radius:4px;font-weight:600;">ARCHIVED</span></div><div class="lead-sub">${lead.phone||'—'}</div><div class="lead-sub">${intentShort} · ${lead.property_type||'—'}</div></div><div class="lead-right"><div class="lead-budget-val">${lead.budget||'—'}</div><div class="lead-score-val" style="color:${scoreColor};">${score}%</div></div><button onclick="unarchiveLead('${lead.id}')" style="background:rgba(16,185,129,0.1);color:#10B981;border:1px solid rgba(16,185,129,0.2);padding:5px 10px;border-radius:7px;font-size:11px;font-weight:600;cursor:pointer;font-family:'Inter',sans-serif;flex-shrink:0;">Restore</button></div>`;
  }).join('');
  wrap.style.display='none';
}

function unarchiveLead(leadId){
  archivedLeads=archivedLeads.filter(id=>id!==leadId);
  localStorage.setItem('eb_archived',JSON.stringify(archivedLeads));
  const lead=leadStore[leadId];
  if(lead&&!allLeads.find(l=>l.id===leadId)){allLeads.unshift(lead);filteredLeads=[...allLeads];filteredLeads2=[...allLeads];updateStats();}
  showToast('Lead restore ho gaya!');renderArchivedLeads();
}

let leadTags=JSON.parse(localStorage.getItem('eb_tags')||'{}');
const TAG_OPTIONS=['🔥 VIP','⚡ Urgent','🏡 Site Visit Done','📞 Callback','💰 High Budget','🤝 Negotiating','❌ Not Reachable'];
function saveTags(leadId){localStorage.setItem('eb_tags',JSON.stringify(leadTags));}
function renderTagsSection(leadId){
  const currentTags=leadTags[leadId]||[];
  return `<div class="detail-section"><div class="detail-section-title">Tags</div><div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:8px;" id="tagDisplay_${leadId}">${currentTags.length?currentTags.map(t=>`<span style="background:#EDE9FE;color:#5B3DF5;padding:3px 9px;border-radius:100px;font-size:11px;font-weight:600;cursor:pointer;" onclick="removeTag('${leadId}','${t}')">${t} ×</span>`).join(''):'<span style="font-size:12px;color:var(--muted);">No tags yet</span>'}</div><select onchange="addTag('${leadId}',this.value);this.value='';" style="width:100%;border:1.5px solid var(--border);border-radius:8px;padding:7px 10px;font-size:12px;font-family:'Inter',sans-serif;outline:none;color:var(--text);"><option value="">+ Add Tag</option>${TAG_OPTIONS.map(t=>`<option value="${t}">${t}</option>`).join('')}</select></div>`;
}
function addTag(leadId,tag){if(!tag)return;if(!leadTags[leadId])leadTags[leadId]=[];if(!leadTags[leadId].includes(tag))leadTags[leadId].push(tag);saveTags(leadId);const el=document.getElementById('tagDisplay_'+leadId);if(el)el.innerHTML=leadTags[leadId].map(t=>`<span style="background:#EDE9FE;color:#5B3DF5;padding:3px 9px;border-radius:100px;font-size:11px;font-weight:600;cursor:pointer;" onclick="removeTag('${leadId}','${t}')">${t} ×</span>`).join('');showToast('Tag added!');}
function removeTag(leadId,tag){if(!leadTags[leadId])return;leadTags[leadId]=leadTags[leadId].filter(t=>t!==tag);saveTags(leadId);const el=document.getElementById('tagDisplay_'+leadId);if(el)el.innerHTML=leadTags[leadId].length?leadTags[leadId].map(t=>`<span style="background:#EDE9FE;color:#5B3DF5;padding:3px 9px;border-radius:100px;font-size:11px;font-weight:600;cursor:pointer;" onclick="removeTag('${leadId}','${t}')">${t} ×</span>`).join(''):'<span style="font-size:12px;color:var(--muted);">No tags yet</span>';}

function archiveLead(leadId){
  if(!archivedLeads.includes(leadId)){archivedLeads.push(leadId);localStorage.setItem('eb_archived',JSON.stringify(archivedLeads));}
  allLeads=allLeads.filter(l=>l.id!==leadId);filteredLeads=filteredLeads.filter(l=>l.id!==leadId);filteredLeads2=filteredLeads2.filter(l=>l.id!==leadId);
  updateStats();renderTable();closeDetail();showToast('Lead archived!');
}

let selectedLeads=new Set();
function toggleBulkMode(){
  const isBulk=document.getElementById('bulkBar').style.display==='flex';
  if(isBulk){selectedLeads.clear();document.getElementById('bulkBar').style.display='none';}
  else document.getElementById('bulkBar').style.display='flex';
}
async function bulkUpdateStatus(status){
  if(!selectedLeads.size){showToast('Pehle leads select karo','error');return;}
  const promises=[...selectedLeads].map(id=>supaPatch(`/rest/v1/leads?id=eq.${id}`,{status}));
  await Promise.all(promises);
  allLeads=allLeads.map(l=>selectedLeads.has(l.id)?{...l,status}:l);filteredLeads=filteredLeads.map(l=>selectedLeads.has(l.id)?{...l,status}:l);filteredLeads2=filteredLeads2.map(l=>selectedLeads.has(l.id)?{...l,status}:l);
  updateStats();renderTable();showToast(`${selectedLeads.size} leads updated! ✅`);selectedLeads.clear();document.getElementById('bulkBar').style.display='none';
}

function showMonthlyReport(){
  const now=new Date();const monthStart=new Date(now.getFullYear(),now.getMonth(),1);
  const monthLeads=allLeads.filter(l=>new Date(l.created_at)>=monthStart);
  const converted=monthLeads.filter(l=>l.status==='converted').length;
  const hot=monthLeads.filter(l=>l.scoreType==='hot').length;
  const dayCounts={};monthLeads.forEach(l=>{const d=new Date(l.created_at).toLocaleDateString('en-IN',{weekday:'long'});dayCounts[d]=(dayCounts[d]||0)+1;});
  const bestDay=Object.entries(dayCounts).sort((a,b)=>b[1]-a[1])[0];
  const revEst=converted*15000;
  document.getElementById('reportContent').innerHTML=`<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;"><div style="background:#F8FAFC;border-radius:10px;padding:14px;text-align:center;"><div style="font-size:28px;font-weight:800;color:var(--navy);">${monthLeads.length}</div><div style="font-size:11px;color:var(--muted);margin-top:3px;">Total Leads</div></div><div style="background:#F8FAFC;border-radius:10px;padding:14px;text-align:center;"><div style="font-size:28px;font-weight:800;color:#10B981;">${converted}</div><div style="font-size:11px;color:var(--muted);margin-top:3px;">Converted</div></div><div style="background:#F8FAFC;border-radius:10px;padding:14px;text-align:center;"><div style="font-size:28px;font-weight:800;color:#EF4444;">${hot}</div><div style="font-size:11px;color:var(--muted);margin-top:3px;">Hot Leads</div></div><div style="background:#F8FAFC;border-radius:10px;padding:14px;text-align:center;"><div style="font-size:28px;font-weight:800;color:var(--gold);">${monthLeads.length?Math.round((converted/monthLeads.length)*100):0}%</div><div style="font-size:11px;color:var(--muted);margin-top:3px;">Conversion Rate</div></div></div><div style="background:#F8FAFC;border-radius:10px;padding:14px;margin-bottom:12px;"><div style="font-size:12px;font-weight:700;margin-bottom:8px;">📅 ${now.toLocaleString('en-IN',{month:'long',year:'numeric'})} Summary</div><div style="font-size:13px;color:var(--text2);line-height:1.8;">${bestDay?`🏆 Best day: <b>${bestDay[0]}</b> (${bestDay[1]} leads)<br>`:''}💰 Est. Commission: <b>₹${revEst.toLocaleString('en-IN')}</b><br>📊 Avg per day: <b>${(monthLeads.length/now.getDate()).toFixed(1)} leads</b></div></div><button onclick="exportMonthlyReport()" style="width:100%;background:var(--navy);color:#fff;border:none;padding:10px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;font-family:'Inter',sans-serif;">📥 Download Report</button>`;
  document.getElementById('reportModal').classList.add('show');
}

function exportMonthlyReport(){
  const now=new Date();const monthStart=new Date(now.getFullYear(),now.getMonth(),1);
  const monthLeads=allLeads.filter(l=>new Date(l.created_at)>=monthStart);
  const headers=['Name','Phone','Intent','Property','Location','Budget','Status','Score','Added'];
  const rows=monthLeads.map(l=>[l.name,l.phone,(l.intent||'').replace(' Chahte Hain',''),l.property_type,l.area,l.budget,l.status||'new',l.score+'%',new Date(l.created_at).toLocaleDateString('en-IN')].map(v=>`"${v||''}"`).join(','));
  const csv=[headers.join(','),...rows].join('\n');
  const blob=new Blob([csv],{type:'text/csv'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`report_${now.toLocaleString('en-IN',{month:'short',year:'numeric'}).replace(' ','_')}.csv`;a.click();
  showToast('Report download ho gaya!');
}

function getBudgetValue(budget){
  if(!budget)return 0;const n=parseFloat(budget.replace(/[^0-9.]/g,''))||0;
  if(budget.toLowerCase().includes('cr'))return n*10000000;
  if(budget.toLowerCase().includes('lakh')||budget.toLowerCase().includes('lac')||budget.toLowerCase().includes('l'))return n*100000;
  return n;
}

let shortcutEnabled=true;
document.addEventListener('keydown',e=>{
  if(!shortcutEnabled)return;
  if(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA'||e.target.tagName==='SELECT')return;
  if(e.key==='1')showPage('dashboard');
  else if(e.key==='2')showPage('leads');
  else if(e.key==='3')showPage('analytics');
  else if(e.key==='4')showPage('followups');
  else if(e.key==='5')showPage('settings');
  else if(e.key==='Escape')closeDetail();
  else if(e.key==='r'||e.key==='R'){if(currentBroker){loadLeads(currentBroker.broker_id);showToast('Refreshed! 🔄');}}
});

function checkDailySummary(){
  const lastShown=localStorage.getItem('eb_summary_date');const today=new Date().toDateString();
  if(lastShown===today)return;
  const brokerId=currentBroker?.broker_id;
  const todayFUs=followUps.filter(f=>f.brokerId===brokerId&&!f.done&&f.date<=new Date().toISOString().split('T')[0]);
  const todayLeads=allLeads.filter(l=>new Date(l.created_at).toDateString()===today);
  if(todayFUs.length===0&&todayLeads.length===0)return;
  document.getElementById('summaryContent').innerHTML=`<div style="font-size:28px;margin-bottom:12px;">☀️</div><div style="font-size:18px;font-weight:800;color:var(--navy);margin-bottom:6px;">Good morning, ${currentBroker?.name?.split(' ')[0]||''}!</div><div style="font-size:13px;color:var(--muted);margin-bottom:20px;">Aaj ka summary</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:18px;"><div style="background:#FEF3C7;border-radius:10px;padding:14px;text-align:center;"><div style="font-size:24px;font-weight:800;color:#D97706;">${todayFUs.length}</div><div style="font-size:11px;color:#92400E;margin-top:3px;">Follow Ups Today</div></div><div style="background:#EDE9FE;border-radius:10px;padding:14px;text-align:center;"><div style="font-size:24px;font-weight:800;color:#5B3DF5;">${todayLeads.length}</div><div style="font-size:11px;color:#3730A3;margin-top:3px;">New Leads Today</div></div></div>${todayFUs.length>0?`<div style="background:#FEE2E2;border-radius:8px;padding:10px 12px;margin-bottom:12px;font-size:12px;color:#DC2626;font-weight:600;">⚠️ ${todayFUs.length} follow up pending!</div>`:''}<button onclick="document.getElementById('summaryModal').classList.remove('show');showPage('followups');" style="width:100%;background:var(--navy);color:#fff;border:none;padding:10px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;font-family:'Inter',sans-serif;margin-bottom:8px;">View Follow Ups</button><button onclick="document.getElementById('summaryModal').classList.remove('show');" style="width:100%;background:transparent;color:var(--muted);border:1px solid var(--border);padding:10px;border-radius:8px;font-size:13px;cursor:pointer;font-family:'Inter',sans-serif;">Dismiss</button>`;
  document.getElementById('summaryModal').classList.add('show');
  localStorage.setItem('eb_summary_date',today);
}

function checkAutoFollowUp(){
  const brokerId=currentBroker?.broker_id;const threeDaysAgo=new Date();threeDaysAgo.setDate(threeDaysAgo.getDate()-3);
  const existingFULeadIds=new Set(followUps.filter(f=>f.brokerId===brokerId&&!f.done).map(f=>f.leadId));
  const needsFollowUp=allLeads.filter(l=>{if(existingFULeadIds.has(l.id))return false;if(l.status==='converted'||l.status==='not_interested')return false;if(!l.created_at)return false;const logsForLead=callLogs[l.id]||[];const daysSince=(Date.now()-new Date(l.created_at))/(1000*60*60*24);return daysSince>=3&&logsForLead.length===0;});
  if(needsFollowUp.length>0){const tomorrow=new Date();tomorrow.setDate(tomorrow.getDate()+1);const tomorrowStr=tomorrow.toISOString().split('T')[0];let added=0;needsFollowUp.slice(0,5).forEach(l=>{if(!followUps.find(f=>f.leadId===l.id&&!f.done)){followUps.push({id:Date.now().toString()+Math.random(),brokerId,leadId:l.id,leadName:l.name||'Lead',date:tomorrowStr,note:'Auto: 3 din se call nahi hua',done:false});added++;}});if(added>0){localStorage.setItem('eb_followups',JSON.stringify(followUps));showToast(`${added} auto follow up set ho gaye!`);}}
}

document.getElementById('fuModal').onclick=e=>{if(e.target===document.getElementById('fuModal'))closeFuModal();};
document.getElementById('reportModal').onclick=e=>{if(e.target===document.getElementById('reportModal'))e.target.classList.remove('show');};
document.getElementById('summaryModal').onclick=e=>{if(e.target===document.getElementById('summaryModal'))e.target.classList.remove('show');};
document.getElementById('propModal').onclick=e=>{if(e.target===document.getElementById('propModal'))e.target.classList.remove('show');};
document.getElementById('visitModal').onclick=e=>{if(e.target===document.getElementById('visitModal'))e.target.classList.remove('show');};

let properties=JSON.parse(localStorage.getItem('eb_properties')||'[]');
function openAddProperty(){document.getElementById('propModal').classList.add('show');}
function saveProperty(){const title=document.getElementById('propTitle').value.trim(),type=document.getElementById('propType').value,location=document.getElementById('propLocation').value.trim(),price=document.getElementById('propPrice').value.trim(),status=document.getElementById('propStatus').value,details=document.getElementById('propDetails').value.trim();if(!title||!location||!price){showToast('Title, location aur price zaroori hai','error');return;}properties.push({id:Date.now().toString(),title,type,location,price,status,details,addedOn:new Date().toISOString()});localStorage.setItem('eb_properties',JSON.stringify(properties));document.getElementById('propModal').classList.remove('show');['propTitle','propLocation','propPrice','propDetails'].forEach(id=>document.getElementById(id).value='');renderProperties();showToast('Property add ho gayi!');}
function renderProperties(){
  const filter=document.getElementById('propFilter')?.value||'all',typeFilter=document.getElementById('propTypeFilter')?.value||'all';
  const filtered=properties.filter(p=>(filter==='all'||p.status===filter)&&(typeFilter==='all'||p.type===typeFilter));
  document.getElementById('propStats').innerHTML=`<div style="background:#fff;border:1px solid var(--border);border-radius:10px;padding:14px;text-align:center;"><div style="font-size:20px;font-weight:800;color:var(--navy);">${properties.length}</div><div style="font-size:11px;color:var(--muted);">Total</div></div><div style="background:#fff;border:1px solid var(--border);border-radius:10px;padding:14px;text-align:center;"><div style="font-size:20px;font-weight:800;color:#10B981;">${properties.filter(p=>p.status==='available').length}</div><div style="font-size:11px;color:var(--muted);">Available</div></div><div style="background:#fff;border:1px solid var(--border);border-radius:10px;padding:14px;text-align:center;"><div style="font-size:20px;font-weight:800;color:#5B3DF5;">${properties.filter(p=>p.status==='sold').length}</div><div style="font-size:11px;color:var(--muted);">Sold</div></div>`;
  if(!filtered.length){document.getElementById('propList').innerHTML='<div class="table-loading">Koi property nahi mili — Add karo!</div>';return;}
  const sc={available:'#10B981',sold:'#EF4444',rented:'#F59E0B'},sb={available:'#D1FAE5',sold:'#FEE2E2',rented:'#FEF3C7'};
  document.getElementById('propList').innerHTML=filtered.map(p=>`<div style="display:flex;align-items:center;gap:12px;padding:12px 14px;border-bottom:1px solid var(--border);"><div style="width:36px;height:36px;border-radius:9px;background:#EDE9FE;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;">${p.type==='flat'?'🏢':p.type==='house'?'🏠':p.type==='plot'?'🌍':'🏪'}</div><div style="flex:1;min-width:0;"><div style="font-size:13px;font-weight:600;">${p.title}</div><div style="font-size:11px;color:var(--muted);">📍 ${p.location} · ${p.type}${p.details?' · '+p.details:''}</div></div><div style="text-align:right;flex-shrink:0;"><div style="font-size:13px;font-weight:700;">₹${p.price}</div><span style="background:${sb[p.status]};color:${sc[p.status]};padding:2px 7px;border-radius:4px;font-size:9px;font-weight:700;">${p.status.toUpperCase()}</span></div><select onchange="updatePropStatus('${p.id}',this.value)" style="border:1px solid var(--border);border-radius:7px;padding:5px 7px;font-size:11px;font-family:'Inter',sans-serif;outline:none;"><option value="available" ${p.status==='available'?'selected':''}>Available</option><option value="sold" ${p.status==='sold'?'selected':''}>Sold</option><option value="rented" ${p.status==='rented'?'selected':''}>Rented</option></select><button onclick="if(confirm('Delete?')){properties=properties.filter(x=>x.id!=='${p.id}');localStorage.setItem('eb_properties',JSON.stringify(properties));renderProperties();showToast('Deleted!')}" style="background:none;border:none;color:#EF4444;cursor:pointer;font-size:14px;">🗑</button></div>`).join('');
}
function updatePropStatus(id,status){properties=properties.map(p=>p.id===id?{...p,status}:p);localStorage.setItem('eb_properties',JSON.stringify(properties));renderProperties();showToast('Updated!');}

let siteVisits=JSON.parse(localStorage.getItem('eb_visits')||'[]');
function openAddVisit(){document.getElementById('visitModal').classList.add('show');document.getElementById('visitLeadSelect').innerHTML='<option value="">-- Lead Select Karo --</option>'+allLeads.map(l=>`<option value="${l.id}|${l.name}|${l.phone||''}">${l.name} — ${l.phone||''}</option>`).join('');}
function saveVisit(){const lv=document.getElementById('visitLeadSelect').value,property=document.getElementById('visitProperty').value.trim(),date=document.getElementById('visitDate').value,time=document.getElementById('visitTime').value,notes=document.getElementById('visitNotes').value.trim();if(!lv||!property||!date){showToast('Lead, property aur date zaroori hai','error');return;}const[leadId,leadName,leadPhone]=lv.split('|');siteVisits.push({id:Date.now().toString(),leadId,leadName,leadPhone,property,date,time,notes,status:'scheduled',feedback:''});localStorage.setItem('eb_visits',JSON.stringify(siteVisits));document.getElementById('visitModal').classList.remove('show');renderVisits();showToast('Site visit schedule ho gayi!');}
function renderVisits(){
  const filter=document.getElementById('visitFilter')?.value||'all';
  const filtered=filter==='all'?siteVisits:siteVisits.filter(v=>v.status===filter);
  const today=new Date().toDateString();
  document.getElementById('visitStats').innerHTML=`<div style="background:#fff;border:1px solid var(--border);border-radius:10px;padding:14px;text-align:center;"><div style="font-size:20px;font-weight:800;color:var(--navy);">${siteVisits.length}</div><div style="font-size:11px;color:var(--muted);">Total</div></div><div style="background:#fff;border:1px solid var(--border);border-radius:10px;padding:14px;text-align:center;"><div style="font-size:20px;font-weight:800;color:var(--gold);">${siteVisits.filter(v=>new Date(v.date+'T00:00:00').toDateString()===today).length}</div><div style="font-size:11px;color:var(--muted);">Aaj</div></div><div style="background:#fff;border:1px solid var(--border);border-radius:10px;padding:14px;text-align:center;"><div style="font-size:20px;font-weight:800;color:#5B3DF5;">${siteVisits.filter(v=>v.status==='scheduled').length}</div><div style="font-size:11px;color:var(--muted);">Scheduled</div></div><div style="background:#fff;border:1px solid var(--border);border-radius:10px;padding:14px;text-align:center;"><div style="font-size:20px;font-weight:800;color:#10B981;">${siteVisits.filter(v=>v.status==='completed').length}</div><div style="font-size:11px;color:var(--muted);">Completed</div></div>`;
  if(!filtered.length){document.getElementById('visitList').innerHTML='<div class="table-loading">Koi visit nahi hai</div>';return;}
  const sc={scheduled:'#5B3DF5',completed:'#10B981',cancelled:'#EF4444'},sb={scheduled:'#EDE9FE',completed:'#D1FAE5',cancelled:'#FEE2E2'};
  document.getElementById('visitList').innerHTML=filtered.sort((a,b)=>a.date.localeCompare(b.date)).map(v=>`<div style="padding:12px 14px;border-bottom:1px solid var(--border);"><div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:8px;"><div style="flex:1;"><div style="font-size:13px;font-weight:600;">${v.leadName} <span style="background:${sb[v.status]};color:${sc[v.status]};padding:2px 7px;border-radius:4px;font-size:9px;font-weight:700;">${v.status.toUpperCase()}</span></div><div style="font-size:11px;color:var(--muted);">📞 ${v.leadPhone} · 🏠 ${v.property}</div><div style="font-size:11px;color:var(--muted);">📅 ${new Date(v.date+'T00:00:00').toLocaleDateString('en-IN',{day:'numeric',month:'short'})} ${v.time?'⏰ '+v.time:''}</div>${v.feedback?`<div style="font-size:11px;color:#10B981;">💬 ${v.feedback}</div>`:''}</div><button onclick="if(confirm('Delete?')){siteVisits=siteVisits.filter(x=>x.id!=='${v.id}');localStorage.setItem('eb_visits',JSON.stringify(siteVisits));renderVisits();}" style="background:none;border:none;color:#EF4444;cursor:pointer;font-size:13px;">🗑</button></div>${v.status==='scheduled'?`<div style="display:flex;gap:6px;"><button onclick="siteVisits=siteVisits.map(x=>x.id==='${v.id}'?{...x,status:'completed'}:x);localStorage.setItem('eb_visits',JSON.stringify(siteVisits));renderVisits();showToast('✅ Completed!')" style="background:#D1FAE5;color:#065F46;border:none;padding:5px 10px;border-radius:7px;font-size:11px;font-weight:600;cursor:pointer;font-family:'Inter',sans-serif;">✓ Done</button><button onclick="const fb=prompt('Feedback:');if(fb){siteVisits=siteVisits.map(x=>x.id==='${v.id}'?{...x,feedback:fb}:x);localStorage.setItem('eb_visits',JSON.stringify(siteVisits));renderVisits();}" style="background:#EDE9FE;color:#5B3DF5;border:none;padding:5px 10px;border-radius:7px;font-size:11px;font-weight:600;cursor:pointer;font-family:'Inter',sans-serif;">💬 Feedback</button><button onclick="siteVisits=siteVisits.map(x=>x.id==='${v.id}'?{...x,status:'cancelled'}:x);localStorage.setItem('eb_visits',JSON.stringify(siteVisits));renderVisits();" style="background:#FEE2E2;color:#DC2626;border:none;padding:5px 10px;border-radius:7px;font-size:11px;font-weight:600;cursor:pointer;font-family:'Inter',sans-serif;">✕ Cancel</button></div>`:''}</div>`).join('');
}

let deals=JSON.parse(localStorage.getItem('eb_deals')||'[]');
function addDeal(){const client=document.getElementById('dealClient').value.trim(),property=document.getElementById('dealProperty').value.trim(),amount=document.getElementById('dealAmount').value.trim(),commPct=parseFloat(document.getElementById('dealCommission').value)||2,date=document.getElementById('dealDate').value||new Date().toISOString().split('T')[0];if(!client||!property||!amount){showToast('Client, property aur amount zaroori hai','error');return;}const n=parseFloat(amount.replace(/[^0-9.]/g,''))||0;const amtRs=amount.toLowerCase().includes('lakh')||amount.toLowerCase().includes('lac')?n*100000:amount.toLowerCase().includes('cr')?n*10000000:n;const comm=Math.round(amtRs*(commPct/100));deals.push({id:Date.now().toString(),client,property,amount,amtRs,commPct,commission:comm,date});localStorage.setItem('eb_deals',JSON.stringify(deals));['dealClient','dealProperty','dealAmount','dealCommission'].forEach(id=>document.getElementById(id).value='');renderRevenue();showToast('Deal save ho gayi! 💰');}
function saveTarget(){const t=document.getElementById('monthlyTarget').value;if(!t)return;localStorage.setItem('eb_target',t);renderRevenue();showToast('Target set!');}
function renderRevenue(){const now=new Date(),ms=new Date(now.getFullYear(),now.getMonth(),1);const md=deals.filter(d=>new Date(d.date)>=ms);const tc=deals.reduce((s,d)=>s+(d.commission||0),0),mc=md.reduce((s,d)=>s+(d.commission||0),0),target=parseInt(localStorage.getItem('eb_target'))||0;document.getElementById('revenueStats').innerHTML=`<div style="background:#fff;border:1px solid var(--border);border-radius:10px;padding:14px;text-align:center;"><div style="font-size:20px;font-weight:800;color:var(--navy);">${deals.length}</div><div style="font-size:11px;color:var(--muted);">Total Deals</div></div><div style="background:#fff;border:1px solid var(--border);border-radius:10px;padding:14px;text-align:center;"><div style="font-size:20px;font-weight:800;color:#10B981;">₹${(tc/100000).toFixed(1)}L</div><div style="font-size:11px;color:var(--muted);">Total Earnings</div></div><div style="background:#fff;border:1px solid var(--border);border-radius:10px;padding:14px;text-align:center;"><div style="font-size:20px;font-weight:800;color:var(--gold);">₹${(mc/100000).toFixed(1)}L</div><div style="font-size:11px;color:var(--muted);">This Month</div></div><div style="background:#fff;border:1px solid var(--border);border-radius:10px;padding:14px;text-align:center;"><div style="font-size:20px;font-weight:800;color:#5B3DF5;">${md.length}</div><div style="font-size:11px;color:var(--muted);">Deals This Month</div></div>`;if(target>0){const pct=Math.min((mc/target)*100,100);document.getElementById('targetProgress').innerHTML=`<div style="font-size:12px;color:var(--muted);margin-bottom:6px;">${mc.toLocaleString('en-IN')} / ₹${target.toLocaleString('en-IN')}</div><div style="height:8px;background:var(--border);border-radius:100px;overflow:hidden;"><div style="height:100%;width:${pct}%;background:${pct>=100?'#10B981':'#5B3DF5'};border-radius:100px;"></div></div><div style="font-size:12px;font-weight:700;color:${pct>=100?'#10B981':'#5B3DF5'};margin-top:6px;">${pct.toFixed(0)}% of target</div>`;}document.getElementById('dealsList').innerHTML=deals.length?deals.slice().reverse().map(d=>`<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border);"><div style="flex:1;"><div style="font-size:13px;font-weight:600;">${d.client}</div><div style="font-size:11px;color:var(--muted);">${d.property} · ${new Date(d.date).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</div></div><div style="text-align:right;"><div style="font-size:13px;font-weight:700;color:#10B981;">+₹${d.commission.toLocaleString('en-IN')}</div><div style="font-size:10px;color:var(--muted);">${d.commPct}% of ${d.amount}</div></div><button onclick="deals=deals.filter(x=>x.id!=='${d.id}');localStorage.setItem('eb_deals',JSON.stringify(deals));renderRevenue();" style="background:none;border:none;color:#EF4444;cursor:pointer;font-size:13px;">🗑</button></div>`).join(''):'<div style="color:var(--muted);text-align:center;padding:20px;font-size:13px;">Koi deal nahi — Add karo!</div>';}

showPage = function(page){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  const el=document.getElementById('page-'+page);
  if(el)el.classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n=>{if(n.getAttribute('onclick')&&n.getAttribute('onclick').includes("'"+page+"'"))n.classList.add('active');});
  const titles={dashboard:'Dashboard',leads:'All Leads',analytics:'Analytics',followups:'Follow Ups',settings:'Settings',properties:'Property Inventory',visits:'Site Visits',revenue:'Revenue'};
  document.getElementById('pageTitle').textContent=titles[page]||page;
  if(page==='leads')renderLeadsPage();
  if(page==='analytics')renderAnalytics();
  if(page==='followups')renderFollowUps();
  if(page==='settings')renderSettings();
  if(page==='properties')renderProperties();
  if(page==='visits')renderVisits();
  if(page==='revenue')renderRevenue();
};

// ===== SUBSCRIPTION BANNER =====
function showSubBanner(broker) {
  const banner = document.getElementById('subBanner');
  const text = document.getElementById('subBannerText');
  const btn = document.getElementById('subBannerBtn');
  if (!banner) return;
  if (broker.status === 'trial' && broker.trial_start) {
    const trialEnd = new Date(broker.trial_start);
    trialEnd.setDate(trialEnd.getDate() + (broker.trial_days || 7));
    const daysLeft = Math.max(0, Math.ceil((trialEnd - new Date()) / (1000 * 60 * 60 * 24)));
    banner.className = 'sub-banner trial';
    text.textContent = '🕐 Free Trial: ' + daysLeft + ' din bache hain';
    btn.style.display = 'block';
    banner.style.display = 'flex';
  } else if (broker.status === 'active') {
    let daysText = '';
    if (broker.subscription_valid_till) {
      const validTill = new Date(broker.subscription_valid_till);
      const daysLeft = Math.max(0, Math.ceil((validTill - new Date()) / (1000 * 60 * 60 * 24)));
      daysText = ': ' + daysLeft + ' din bache hain';
    }
    banner.className = 'sub-banner active';
    text.textContent = '✅ Subscription Active' + daysText;
    btn.style.display = 'none';
    banner.style.display = 'flex';
  } else if (broker.status === 'expired') {
    banner.className = 'sub-banner expired';
    text.textContent = '❌ Subscription expire ho gayi — Bot band hai';
    btn.style.display = 'block';
    banner.style.display = 'flex';
  }
}

function openSubscribeModal() {
  document.getElementById('subscribeModal').classList.add('show');
}

async function startPayment() {
  const btn = document.getElementById('payNowBtn');
  btn.textContent = 'Processing...';
  btn.disabled = true;
  try {
    const res = await fetch('/api/create-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ broker_id: currentBroker.broker_id })
    });
    const data = await res.json();
    if (data.payment_session_id) {
      const cashfree = await loadCashfree();
      cashfree.checkout({ paymentSessionId: data.payment_session_id });
    } else {
      showToast('Payment error: ' + (data.error || 'Try again'), 'error');
      btn.textContent = 'Pay ₹2,999 →';
      btn.disabled = false;
    }
  } catch(e) {
    showToast('Network error', 'error');
    btn.textContent = 'Pay ₹2,999 →';
    btn.disabled = false;
  }
}

async function loadCashfree() {
  return new Promise((resolve) => {
    if (window.Cashfree) { resolve(window.Cashfree({ mode: 'sandbox' })); return; }
    const s = document.createElement('script');
    s.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
    s.onload = () => resolve(window.Cashfree({ mode: 'sandbox' }));
    document.head.appendChild(s);
  });
}

document.getElementById('subscribeModal').onclick = e => {
  if (e.target === document.getElementById('subscribeModal'))
    e.target.classList.remove('show');
};

const savedId=sessionStorage.getItem('broker_id');
if(savedId)initDashboard(savedId);
