
const Store={get(k,d){try{const v=JSON.parse(localStorage.getItem('pc_'+k));return v===null?d:v}catch{return d}},set(k,v){localStorage.setItem('pc_'+k,JSON.stringify(v))}};
const today=()=>new Date().toISOString().slice(0,10);
const addDays=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x.toISOString().slice(0,10)};
const plantById=id=>PLANTS.find(p=>p.id===id);
const fmt=d=>new Date(d).toLocaleDateString(undefined,{month:'short',day:'numeric'});

function toast(msg){let t=document.getElementById('toast');if(!t){t=document.createElement('div');t.id='toast';t.setAttribute('role','status');document.body.append(t)}t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2200)}



(function () {
    const pages = [
        ['index.html', 'Home', 'images/home.png'],
        ['identify.html', 'Identify', 'images/search.png'],
        ['my-plants.html', 'My Plants', 'images/my-plants.png'],
        ['care-reminders.html', 'Care', 'images/leaves.png'],
        ['recommendations.html', 'Recommend', 'images/recommend.png']
    ];

    const cur = location.pathname.split('/').pop() || 'index.html';

    document.body.insertAdjacentHTML(
        'beforeend',
        `
        <nav class="bottom-nav" aria-label="Main navigation">
            ${pages.map(p => `
                <a
                    href="${p[0]}"
                    class="${p[0] === cur ||
                    (cur === 'plant-info.html' && p[0] === 'index.html')
                        ? 'active'
                        : ''}"
                >
                    <img src="${p[2]}" alt="" class="nav-icon">
                    <span>${p[1]}</span>
                </a>
            `).join('')}
        </nav>

        <footer class="site-footer">
            PlantCare &copy; ${new Date().getFullYear()}
            · Data stored only in your browser
        </footer>
        `
    );
})();

function savePlant(id,nickname,room){
  const p=plantById(id);const list=Store.get('plants',[]);
  const uid='u'+Date.now();
  list.push({uid,plantId:id,nickname:nickname||p.commonName,room:room||'Living room',added:today()});
  Store.set('plants',list);
  addReminder(uid,'Water',addDays(today(),p.wateringDays),p.wateringDays);
  toast(p.commonName+' saved to My Plants ✓');
}
function addReminder(uid,type,due,every){
  const r=Store.get('reminders',[]);r.push({id:'r'+Date.now()+Math.random().toString(36).slice(2,5),uid,type,due,every:Number(every)||0});Store.set('reminders',r);
}
function plantCard(p){
  return `<article class="card"><div class="ph" role="img" aria-label="${p.commonName} illustration">${p.emoji}</div><h3>${p.commonName}</h3><div class="muted" style="color:var(--muted);font-size:.85rem">${p.scientificName}</div><div><span class="tag">☀ ${p.sunlight}</span><span class="tag">${p.petSafe?'🐾 Pet safe':'⚠ Toxic to pets'}</span><span class="tag">${p.difficulty}</span></div><div class="pill-row" style="margin-top:10px"><a class="btn soft" href="plant-info.html?id=${p.id}">Details</a><button class="btn" data-save="${p.id}">Save</button></div></article>`;
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-save]');if(b)savePlant(b.dataset.save)});
