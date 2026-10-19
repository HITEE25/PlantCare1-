const page=document.body.dataset.page, $=s=>document.querySelector(s);

// ---------- HOME: search, filters, summary ----------
if(page==='home'){
  let filter='all';
  const draw=()=>{
    const q=$('#q').value.trim().toLowerCase();
    const favs=Store.get('plants',[]).map(x=>x.plantId);
    const res=PLANTS.filter(p=>(!q||(p.commonName+p.category+p.scientificName).toLowerCase().includes(q))&&
      (filter==='all'||(filter==='low'&&p.sunlight==='low')||(filter==='pet'&&p.petSafe)||(filter==='fav'&&favs.includes(p.id))));
    $('#grid').innerHTML=res.length?res.map(plantCard).join(''):'<div class="empty">No plants match your search.</div>';
    const rem=Store.get('reminders',[]);
    $('#summary').innerHTML=`<strong>${Store.get('plants',[]).length}</strong> saved plants · <strong>${rem.filter(r=>r.due<=today()).length}</strong> tasks due · <a href="care-reminders.html"><u>View care</u></a>`;
  };
  $('#q').addEventListener('input',draw);
  document.querySelectorAll('.chip').forEach(c=>c.onclick=()=>{filter=filter===c.dataset.filter&&filter!=='all'?'all':c.dataset.filter;document.querySelectorAll('.chip').forEach(x=>x.classList.toggle('on',x.dataset.filter===filter&&filter!=='all'));draw()});
  draw();
}

// ---------- IDENTIFY: upload + DEMO result ----------
if(page==='identify'){
  let chosen=null;
  const show=f=>{
    if(!f||!f.type.startsWith('image/')){$('#err').textContent='Please choose an image file.';return}
    $('#err').textContent='';chosen=f;const r=new FileReader();
    r.onload=e=>{$('#preview').src=e.target.result;$('#preview').hidden=false};r.readAsDataURL(f);
  };
  $('#drop').onclick=()=>$('#file').click();
  $('#file').onchange=e=>show(e.target.files[0]);
  ['dragover','dragleave','drop'].forEach(ev=>$('#drop').addEventListener(ev,e=>{e.preventDefault();$('#drop').classList.toggle('over',ev==='dragover');if(ev==='drop')show(e.dataTransfer.files[0])}));
  // identifyPlant() is the single place to swap in a real API later (send `file`, return {plantId, confidence}).
  const identifyPlant=async file=>({plantId:PLANTS[(file.size+file.name.length)%PLANTS.length].id,confidence:null,demo:true});
  $('#go').onclick=async()=>{
    if(!chosen){$('#err').textContent='Upload a photo first.';return}
    const r=await identifyPlant(chosen),p=plantById(r.plantId);
    $('#result').innerHTML=`<div class="panel"><span class="tag">DEMO RESULT – not a real identification</span><h2>${p.emoji} ${p.commonName}</h2><p>${p.description}</p><div class="pill-row"><a class="btn soft" href="plant-info.html?id=${p.id}">View details</a><button class="btn" data-save="${p.id}">Save to my plants</button></div></div>`;
  };
}

// ---------- PLANT INFO ----------
if(page==='info'){
  const p=plantById(new URLSearchParams(location.search).get('id'));
  $('#info').innerHTML=!p?'<div class="empty">Plant not found. <a href="index.html"><u>Back to plants</u></a></div>':`
  <div class="hero" style="grid-template-columns:1fr"><div class="art" style="font-size:6rem;text-align:center">${p.emoji}</div></div>
  <h1>${p.commonName}</h1><div style="color:var(--muted)"><em>${p.scientificName}</em> · ${p.category}</div><p>${p.description}</p>
  <h3>Care Tips</h3><div class="chips"><div class="chip"><span>💧</span>Every ${p.wateringDays} days</div><div class="chip"><span>☀</span>${p.sunlight} light</div><div class="chip"><span>🐾</span>${p.petSafe?'Pet friendly':'Not pet safe'}</div><div class="chip"><span>💨</span>${p.humidity} humidity</div></div>
  <div class="panel"><p><b>Temperature:</b> ${p.temperatureRange}<br><b>Soil:</b> ${p.soilType}<br><b>Difficulty:</b> ${p.difficulty} · <b>Indoor:</b> ${p.indoorSuitability}<br><b>Tip:</b> ${p.careTip}</p>
  <p><b>Common problem:</b> ${p.problem.symptom} – likely <i>${p.problem.cause}</i>. <b>Fix:</b> ${p.problem.fix}.</p></div>
  <button class="btn wide" data-save="${p.id}">Save &amp; Customize Care Schedule</button>`;
}

// ---------- MY PLANTS: edit / delete / filter ----------
if(page==='mine'){
  const draw=()=>{
    const all=Store.get('plants',[]),rooms=[...new Set(all.map(x=>x.room))],sel=$('#room'),cur=sel.value;
    sel.innerHTML='<option value="">All rooms</option>'+rooms.map(r=>`<option ${r===cur?'selected':''}>${r}</option>`).join('');
    const list=all.filter(x=>!cur||x.room===cur);
    $('#list').innerHTML=list.length?list.map(x=>{const p=plantById(x.plantId),nx=Store.get('reminders',[]).filter(r=>r.uid===x.uid&&r.type==='Water')[0];
      const st=!nx?'No schedule':nx.due<today()?'<span class="over">Needs water</span>':'Healthy';
      return `<article class="card"><div class="ph">${p.emoji}</div><h3>${x.nickname}</h3><div style="color:var(--muted);font-size:.85rem">${p.commonName} · ${x.room}</div><p>Next water: <b>${nx?fmt(nx.due):'–'}</b><br>${st}</p><div class="pill-row"><a class="btn soft" href="plant-info.html?id=${p.id}">Info</a><button class="btn soft" data-edit="${x.uid}">Edit</button><button class="btn danger" data-del="${x.uid}">Delete</button></div></article>`}).join(''):'<div class="empty">No plants yet. <a href="index.html"><u>Browse plants</u></a> to add some 🌱</div>';
  };
  $('#room').onchange=draw;
  $('#list').onclick=e=>{
    const d=e.target.dataset;let all=Store.get('plants',[]);
    if(d.del&&confirm('Delete this plant and its reminders?')){Store.set('plants',all.filter(x=>x.uid!==d.del));Store.set('reminders',Store.get('reminders',[]).filter(r=>r.uid!==d.del));toast('Plant deleted');draw()}
    if(d.edit){const x=all.find(i=>i.uid===d.edit),n=prompt('Nickname:',x.nickname);if(n===null)return;const r=prompt('Room:',x.room);
      if(!n.trim()||!r||!r.trim()){toast('Nickname and room are required');return}
      x.nickname=n.trim();x.room=r.trim();Store.set('plants',all);toast('Plant updated ✓');draw()}
  };
  draw();
}

// ---------- CARE REMINDERS ----------
if(page==='care'){
  const name=r=>{const u=Store.get('plants',[]).find(x=>x.uid===r.uid);return u?u.nickname:'Plant'};
  const draw=()=>{
    const rem=Store.get('reminders',[]).sort((a,b)=>a.due.localeCompare(b.due));
    const row=(r,od)=>`<div class="row ${od?'':'white'}"><div><b>${fmt(r.due)}</b> · ${r.type} – ${name(r)}<br><small>${r.every?'every '+r.every+' days':'one time'}</small>${od?'<br><span class="over">Overdue</span>':''}</div><div class="pill-row"><button class="btn yellow" data-done="${r.id}">Complete</button><button class="btn soft" data-snooze="${r.id}">Snooze 1d</button><button class="btn soft" data-move="${r.id}">Reschedule</button></div></div>`;
    const od=rem.filter(r=>r.due<=today()),up=rem.filter(r=>r.due>today());
    $('#over').innerHTML=od.map(r=>row(r,true)).join('')||'<div class="empty">Nothing due 🎉</div>';
    $('#up').innerHTML=up.map(r=>row(r,false)).join('')||'<div class="empty">No upcoming tasks. Add one below.</div>';
    const pl=Store.get('plants',[]);$('#plant').innerHTML=pl.length?pl.map(x=>`<option value="${x.uid}">${x.nickname}</option>`).join(''):'<option value="">Save a plant first</option>';
  };
  document.body.addEventListener('click',e=>{
    const d=e.target.dataset;let rem=Store.get('reminders',[]);const r=rem.find(x=>x.id===(d.done||d.snooze||d.move));if(!r)return;
    if(d.done){if(r.every){r.due=addDays(today(),r.every)}else rem=rem.filter(x=>x!==r);toast('Done! Next date recalculated ✓')}
    if(d.snooze){r.due=addDays(r.due>today()?r.due:today(),1);toast('Snoozed 1 day')}
    if(d.move){const v=prompt('New date (YYYY-MM-DD):',r.due);if(!v||isNaN(new Date(v))){toast('Invalid date');return}r.due=v;toast('Rescheduled ✓')}
    Store.set('reminders',rem);draw();
  });
  $('#due').value=today();
  $('#form').onsubmit=e=>{e.preventDefault();
    if(!$('#plant').value){$('#err').textContent='Save a plant first.';return}
    if(!$('#due').value||$('#every').value===''||+$('#every').value<0){$('#err').textContent='Enter a valid date and interval.';return}
    $('#err').textContent='';addReminder($('#plant').value,$('#type').value,$('#due').value,$('#every').value);toast('Reminder set ✓');draw()};
  $('#notif').onclick=async()=>{if(!('Notification' in window))return toast('Not supported in this browser');
    const p=await Notification.requestPermission();if(p==='granted'){new Notification('PlantCare',{body:'Notifications enabled 🌿'})}else toast('Permission not granted')};
  draw();
  if('Notification' in window&&Notification.permission==='granted'){const n=Store.get('reminders',[]).filter(r=>r.due<=today()).length;if(n)new Notification('PlantCare',{body:n+' plant task(s) due'})}
}

// ---------- RECOMMENDATIONS: transparent weighted scoring ----------
if(page==='rec'){
  const L={low:0,medium:1,bright:2},D={Easy:0,Moderate:1,Hard:2};
  function score(p,u){
    const w={};
    w.light=Math.abs(L[p.sunlight]-L[u.light])===0?35:Math.abs(L[p.sunlight]-L[u.light])===1?15:0;
    w.care=p.maintenanceLevel===u.care?25:(p.maintenanceLevel==='moderate'||u.care==='moderate')?12:0;
    w.experience=D[p.difficulty]<=D[u.exp]?20:0;
    w.space=p.size===u.size?10:(p.size==='m'||u.size==='m')?5:0;
    w.pets=!u.pets||p.petSafe?10:0;
    return{total:Object.values(w).reduce((a,b)=>a+b,0),w};
  }
  $('#form').onsubmit=e=>{e.preventDefault();
    const u={light:$('#light').value,care:$('#care').value,exp:$('#exp').value,size:$('#size').value,pets:$('#pets').value==='yes'};
    const top=PLANTS.filter(p=>!u.pets||p.petSafe)           // strict pet safety = mandatory
      .map(p=>({p,s:score(p,u)})).sort((a,b)=>b.s.total-a.s.total).slice(0,3);
    $('#out').innerHTML=top.length?top.map(({p,s})=>`<article class="card" style="margin:14px 0"><h2>${p.emoji} ${p.commonName} <span class="score">${s.total}%</span></h2>
      <p>Light match ${s.w.light}/35 · Maintenance ${s.w.care}/25 · Experience ${s.w.experience}/20 · Space ${s.w.space}/10 · Pet safety ${s.w.pets}/10</p>
      <p>${p.description}<br><b>Tip:</b> ${p.careTip}</p><div class="pill-row"><a class="btn soft" href="plant-info.html?id=${p.id}">Full info</a><button class="btn" data-save="${p.id}">Save</button></div></article>`).join(''):'<div class="empty">No plants match.</div>';
  };
}
