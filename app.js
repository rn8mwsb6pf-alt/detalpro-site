

const SYSTEM_ACCOUNTS = {
  'timmon':     {password:'l050525L',   role:'creator',     name:'Timmon',     phone:''},
  'timmon':     {password:'l050525L',   role:'creator',     name:'Тимофей',    phone:'+7 (928) 607-45-47'},
  'manager1':   {password:'manager1',   role:'manager',     name:'Менеджер 1', phone:'+7 (960) 451-31-69'},
  'Alexsandr':  {password:'s050525S',   role:'boss',        name:'Александр',  phone:'+7 (960) 451-31-69'},
  'buh':        {password:'b050525B',   role:'accountant',  name:'Бухгалтерия',phone:''},
  'manager':    {password:'manager123', role:'manager',     name:'Менеджер',   phone:''},
  'sklad1':     {password:'sklad123',   role:'warehouse',   name:'Склад #1',   phone:''},
  'h4x0r':      {password:'H@ck3r!9X',  role:'hacker',      name:'Системный аудит', phone:''},
};

let CLOUD_STAFF = {};
let _cloudStaffLoaded = false;

async function loadCloudStaff() {
  const binId = localStorage.getItem('dp_users_bin_id');
  if (!binId) return;
  try {
    const r = await fetch(`https://api.jsonbin.io/v3/b/${binId}/latest`, {
      headers: { 'X-Bin-Meta': 'false' }
    });
    if (!r.ok) return;
    const data = await r.json();
    const cloudUsers = data?.record?.users || data?.users || [];
    CLOUD_STAFF = {};
    cloudUsers.forEach(u => {
      if (u.username && u.password) {
        CLOUD_STAFF[u.username] = {
          password: u.password,
          role:     u.role || 'manager',
          name:     u.name || u.username,
          phone:    u.phone || '',
        };
      }
    });
    _cloudStaffLoaded = true;
    console.log(`[Sync] Загружено ${cloudUsers.length} пользователей из приложения`);
  } catch(e) {
    console.warn('[Sync] Не удалось загрузить пользователей:', e.message);
  }
}

function openSyncSettings() {
  const binId = localStorage.getItem('dp_users_bin_id') || '';
  const el = document.getElementById('sync-settings-modal');
  if (el) { el.style.display='flex'; document.getElementById('sync-bin-id').value=binId; return; }
  const div = document.createElement('div');
  div.id = 'sync-settings-modal';
  div.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';
  div.innerHTML = `
    <div style="background:#141719;border:1px solid #2a2f33;border-radius:14px;padding:28px;width:100%;max-width:420px;box-shadow:0 20px 60px rgba(0,0,0,.6)">
      <div style="font-size:1.05rem;font-weight:700;color:#e8eaeb;margin-bottom:6px">☁ Синхронизация пользователей</div>
      <div style="font-size:.78rem;color:#5a6268;margin-bottom:20px">Введите Bin ID из приложения управления (вкладка Пользователи)</div>
      <label style="font-size:.7rem;color:#5a6268;text-transform:uppercase;letter-spacing:.07em">JSONBin Bin ID</label>
      <input id="sync-bin-id" value="${binId}" placeholder="например: 6a0ccadfee5a..." style="width:100%;background:#1a1d20;border:1px solid #2a2f33;border-radius:8px;padding:10px 12px;color:#e8eaeb;font-size:.9rem;outline:none;margin:6px 0 16px;font-family:monospace">
      <div id="sync-test-msg" style="font-size:.78rem;margin-bottom:12px;min-height:18px"></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button onclick="testAndSaveSyncBin()" style="flex:1;padding:10px;background:#e8411a;color:#fff;border:none;border-radius:8px;font-weight:600;cursor:pointer">Сохранить и проверить</button>
        <button onclick="document.getElementById('sync-settings-modal').style.display='none'" style="padding:10px 16px;background:#1a1d20;color:#9da5ab;border:1px solid #2a2f33;border-radius:8px;cursor:pointer">Закрыть</button>
      </div>
    </div>`;
  document.body.appendChild(div);
}

async function testAndSaveSyncBin() {
  const binId = document.getElementById('sync-bin-id').value.trim();
  const msg   = document.getElementById('sync-test-msg');
  if (!binId) { msg.style.color='#ef4444'; msg.textContent='Введите Bin ID'; return; }
  msg.style.color='#9da5ab'; msg.textContent='Проверяем…';
  try {
    const r = await fetch(`https://api.jsonbin.io/v3/b/${binId}/latest`, { headers:{'X-Bin-Meta':'false'} });
    const data = await r.json();
    const users = data?.record?.users || data?.users || [];
    if (!r.ok || !Array.isArray(users)) throw new Error(`HTTP ${r.status}`);
    localStorage.setItem('dp_users_bin_id', binId);
    await loadCloudStaff();
    msg.style.color='#22c55e';
    msg.textContent=`✓ Успешно! Загружено ${users.length} сотрудников.`;
    setTimeout(()=>{ document.getElementById('sync-settings-modal').style.display='none'; }, 1500);
  } catch(e) {
    msg.style.color='#ef4444';
    msg.textContent='Ошибка: ' + e.message;
  }
}

function getUsers(){
  try{return JSON.parse(localStorage.getItem('dp_users')||'[]');}catch{return[];}
}
function saveUsers(users){
  try{localStorage.setItem('dp_users',JSON.stringify(users));}catch(e){}
}
function getUserByLogin(login){
  return getUsers().find(u=>u.login===login)||null;
}

function getOnecProfiles(){
  try{return JSON.parse(localStorage.getItem('dp_onec_profiles')||'{}');}catch{return{};}
}
function saveOnecProfile(){
  const login=document.getElementById('onec-modal').dataset.userLogin;
  if(!login) return;
  const profile={
    counterpartyId: document.getElementById('onec-counterparty').value.trim(),
    orgName:        document.getElementById('onec-orgname').value.trim(),
    inn:            document.getElementById('onec-inn').value.trim(),
    contract:       document.getElementById('onec-contract').value.trim(),
    creditLimit:    parseFloat(document.getElementById('onec-limit').value)||0,
    updatedAt:      new Date().toISOString(),
  };
  const profiles=getOnecProfiles();
  profiles[login]=profile;
  localStorage.setItem('dp_onec_profiles',JSON.stringify(profiles));
  closeOnec();
  renderAdminUsers();
  logActivity({user:state.user?.login||'admin',role:'admin',action:'onec_link',
    details:`Привязка 1С для ${login}: ID ${profile.counterpartyId}`});
  showToast(`1С профиль для ${login} сохранён`,'green');
}
function openOnecModal(login){
  const users=getUsers();
  const sysAcc=SYSTEM_ACCOUNTS[login];
  const regUser=users.find(u=>u.login===login);
  const displayName=sysAcc?sysAcc.name:regUser?regUser.name:login;
  const profiles=getOnecProfiles();
  const p=profiles[login]||{};
  document.getElementById('onec-modal').dataset.userLogin=login;
  document.getElementById('onec-modal-sub').textContent='Пользователь: '+displayName+' ('+login+')';
  document.getElementById('onec-counterparty').value=p.counterpartyId||'';
  document.getElementById('onec-orgname').value=p.orgName||'';
  document.getElementById('onec-inn').value=p.inn||'';
  document.getElementById('onec-contract').value=p.contract||'';
  document.getElementById('onec-limit').value=p.creditLimit||'';
  document.getElementById('onec-modal').classList.add('open');
  setTimeout(()=>document.getElementById('onec-counterparty').focus(),100);
}
function closeOnec(){
  document.getElementById('onec-modal').classList.remove('open');
}

let state = {
  role: 'customer',       
  user: null,             
  cart: [],
  currentQuery: '',
  currentResults: [],
  delivery: 'pickup',
  selectedPvz: null,
  selectedStore: null,
  filters: {availability:'all', source:'all', delivery:'all'},
};

const BRANDS = [
  
  {label:'КАМАЗ',type:'truck'},{label:'МАЗ',type:'truck'},{label:'DAF',type:'truck'},
  {label:'MAN',type:'truck'},{label:'Volvo',type:'truck'},{label:'Scania',type:'truck'},
  {label:'Mercedes',type:'truck'},{label:'Renault T',type:'truck'},{label:'IVECO',type:'truck'},
  {label:'ISUZU',type:'truck'},{label:'ГАЗель',type:'truck'},{label:'КРАЗ',type:'truck'},
  
  {label:'Mann-Filter',type:'part'},{label:'Knorr-Bremse',type:'part'},{label:'Wabco',type:'part'},
  {label:'ZF',type:'part'},{label:'Sachs',type:'part'},{label:'Textar',type:'part'},
  {label:'Febi Bilstein',type:'part'},{label:'SKF',type:'part'},{label:'Bosch',type:'part'},
  {label:'NGK',type:'part'},{label:'Gates',type:'part'},{label:'Mahle',type:'part'},
  {label:'Corteco',type:'part'},{label:'Donaldson',type:'part'},{label:'SAF Holland',type:'part'},
  {label:'Continental',type:'part'},{label:'Hella',type:'part'},{label:'Valeo',type:'part'},
];

const CATEGORIES = [
  {icon:'🔧',name:'Двигатель',count:'48 200'},
  {icon:'🛞',name:'Подвеска',count:'62 100'},
  {icon:'🔋',name:'Электрика',count:'31 500'},
  {icon:'🛢',name:'Фильтры',count:'18 900'},
  {icon:'🏎',name:'Тормоза',count:'24 300'},
  {icon:'❄️',name:'Охлаждение',count:'12 700'},
  {icon:'🔩',name:'Кузов',count:'55 800'},
  {icon:'⚙️',name:'КПП',count:'9 400'},
];

const STORES = [
  {id:'store1',name:'Героев Пионеров, 95',address:'Каменск-Шахтинский, ул. Героев Пионеров, д. 95 (932 км М4)',tag:'Главный склад'},
];

let PVZ_LIST = []; 
let CDEK_TOKEN = null;
let CDEK_TOKEN_EXP = 0;

async function cdekGetToken(){
  if(CDEK_TOKEN && Date.now() < CDEK_TOKEN_EXP) return CDEK_TOKEN;
  try {
    const r = await fetch('https://api.cdek.ru/v2/oauth/token', {
      method: 'POST',
      headers: {'Content-Type':'application/x-www-form-urlencoded'},
      body: 'grant_type=client_credentials&client_id=EMscd6r9JnFiQ3bLoyjJY6eM&client_secret=PjLZkKBHEiLK3YsjtNrt3TGNG0ahs3kG'
    });
    const d = await r.json();
    CDEK_TOKEN = d.access_token;
    CDEK_TOKEN_EXP = Date.now() + (d.expires_in - 60) * 1000;
    return CDEK_TOKEN;
  } catch(e){ return null; }
}

async function cdekLoadPvzByCoords(lat, lng){
  showPvzLoading('📍 Ищем ближайшие ПВЗ СДЭК...');
  try {
    const token = await cdekGetToken();
    if(!token){ cdekLoadPvzByCity(''); return; }
    const r = await fetch(`https://api.cdek.ru/v2/deliverypoints?lat=${lat}&lng=${lng}&weight_max=30&type=PVZ&take=10`, {
      headers: { Authorization: 'Bearer ' + token }
    });
    const data = await r.json();
    const points = (Array.isArray(data) ? data : (data.entity||[])).slice(0,10);
    if(!points.length){ cdekLoadPvzByCity(''); return; }
    PVZ_LIST = points.map(p => ({
      code: p.code,
      name: p.name || p.code,
      address: (p.location?.address_full) || (p.location?.city+', '+p.location?.address) || '—',
      city: p.location?.city || '',
      cost: 299,
      days: '1-5 дней',
      lat: p.location?.latitude,
      lng: p.location?.longitude,
      work_time: p.work_time || '',
      phones: p.phones?.map(ph=>ph.number).join(', ') || ''
    }));
    renderPvzList();
    
    if(PVZ_LIST[0]?.city){
      const cityInp = document.getElementById('cdek-city');
      if(cityInp) cityInp.value = PVZ_LIST[0].city;
    }
    showToast('Найдено ' + PVZ_LIST.length + ' ПВЗ рядом с вами','green');
  } catch(e){ cdekLoadPvzByCity(''); }
}

async function cdekLoadPvzByCity(city){
  if(!city){ showPvzLoading('Введите город для поиска ПВЗ'); return; }
  showPvzLoading('🔍 Ищем ПВЗ в городе ' + city + '...');
  try {
    const token = await cdekGetToken();
    if(!token){ showPvzLoading('Ошибка подключения к СДЭК'); return; }
    
    const cityR = await fetch(`https://api.cdek.ru/v2/location/cities?country_codes=RU&size=5&q=${encodeURIComponent(city)}`, {
      headers: { Authorization: 'Bearer ' + token }
    });
    const cities = await cityR.json();
    const cityCode = (Array.isArray(cities) ? cities[0] : cities.entity?.[0])?.code;
    if(!cityCode){ showPvzLoading('Город не найден'); return; }
    
    const r = await fetch(`https://api.cdek.ru/v2/deliverypoints?city_code=${cityCode}&weight_max=30&type=PVZ&take=10`, {
      headers: { Authorization: 'Bearer ' + token }
    });
    const data = await r.json();
    const points = (Array.isArray(data) ? data : (data.entity||[])).slice(0,10);
    PVZ_LIST = points.map(p => ({
      code: p.code,
      name: p.name || p.code,
      address: (p.location?.address_full) || (p.location?.address) || '—',
      city: city,
      cost: 299,
      days: '1-5 дней',
      work_time: p.work_time || ''
    }));
    if(!PVZ_LIST.length) showPvzLoading('ПВЗ не найдены в этом городе');
    else renderPvzList();
  } catch(e){ showPvzLoading('Ошибка загрузки ПВЗ'); }
}

function showPvzLoading(msg){
  const el=document.getElementById('pvz-list');
  if(el) el.innerHTML=`<div style="padding:16px;text-align:center;color:var(--text3);font-size:13px">${msg}</div>`;
}

function getCatalog(){ try{return JSON.parse(localStorage.getItem('dp_catalog')||'[]');}catch{return[];} }
function saveCatalog(arr){ localStorage.setItem('dp_catalog',JSON.stringify(arr)); }
function getCatalogCount(){ return getCatalog().length; }

function searchCatalog(query){
  const q=query.trim().toUpperCase();
  if(!q) return [];
  return getCatalog().filter(item=>{
    const art=(item.article||'').toUpperCase().replace(/[-\s]/g,'');
    const name=(item.name||'').toUpperCase();
    const brand=(item.brand||'').toUpperCase();
    const qClean=q.replace(/[-\s]/g,'');
    return art.includes(qClean)||name.includes(q)||brand.includes(q)||art===qClean;
  }).map((item,i)=>({...item, id: item.id||(i+1)}));
}

function mergeCatalog(newItems, source){
  const existing = getCatalog();
  const map = {};
  existing.forEach(it => { map[(it.article+'|'+it.brand).toUpperCase()] = it; });
  let added=0, updated=0;
  newItems.forEach(it => {
    const key = ((it.article||'')+'|'+(it.brand||'')).toUpperCase();
    if(map[key]){ Object.assign(map[key], it, {source, updatedAt: new Date().toISOString()}); updated++; }
    else{ map[key] = {...it, source, id: Date.now()+Math.random(), importedAt: new Date().toISOString()}; added++; }
  });
  saveCatalog(Object.values(map));
  return {added, updated};
}

function mergeCatalogFromStock(stockObj){
  const items = Object.values(stockObj).map(it=>({
    article: it.article||it.Артикул||'',
    brand:   it.brand||it.Производитель||'',
    name:    it.name||it.Наименование||it.article||'',
    price_retail:    parseFloat(it.price_retail||it.Цена||0),
    price_wholesale: parseFloat(it.price_wholesale||it.ЦенаОпт||0),
    stock:           parseInt(it.quantity||it.Количество||0),
    delivery_days:   0,
    source: '1c',
  })).filter(it=>it.article);
  return mergeCatalog(items,'1c');
}

const ADMIN_ROLES=['creator','boss','admin','manager','accountant','warehouse','hacker'];
const STAFF_ROLES=['creator','boss','admin','manager','accountant','warehouse','hacker'];
function showPage(name) {
  if(name==='admin' && !state.user){showToast('Войдите в аккаунт','amber');showLogin();return;}
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.getElementById('page-'+name).classList.add('active');
  window.scrollTo(0,0);
  closeMobileMenu();
  if(name==='home') renderHomeBanners();
  if(name==='cart') renderCart();
  if(name==='checkout'){
    renderCheckoutSummary();
    setClientType(coClientType);
    setPayMethod(coPayMethod);
    updatePrepayPanel();
  }
  if(name==='admin'){
    renderAdminSidebar();
    if(STAFF_ROLES.includes(state.role)) updatePendingBadge();
    if(state.role==='hacker') startHkPoll();
    else stopHkPoll();
    
    const sh=document.getElementById('admin-sidebar-header');
    if(sh) sh.dataset.role=state.role||'';
    
    const meta=ROLE_META[state.role]||{};
    const lbl=document.getElementById('admin-mobile-toggle-label');
    if(lbl) lbl.textContent=(meta.label||'Панель')+' — меню';
  }
  if(name==='about') renderAboutManagers();
  if(name==='faq'){ faqSearchQuery=''; faqActiveCat='all'; renderFaq(); }
}

function toggleMobileMenu(){
  const overlay=document.getElementById('mobile-nav-overlay');
  const hbg=document.getElementById('hamburger');
  const isOpen=overlay.classList.contains('open');
  overlay.classList.toggle('open',!isOpen);
  hbg.classList.toggle('open',!isOpen);
  document.body.style.overflow=isOpen?'':'hidden';
}
function closeMobileMenu(){
  const overlay=document.getElementById('mobile-nav-overlay');
  const hbg=document.getElementById('hamburger');
  if(!overlay) return;
  overlay.classList.remove('open');
  hbg && hbg.classList.remove('open');
  document.body.style.overflow='';
}

function toggleAdminSidebar(){
  const sb=document.getElementById('admin-sidebar');
  const bd=document.getElementById('admin-sidebar-backdrop');
  const isOpen=sb.classList.contains('open');
  sb.classList.toggle('open',!isOpen);
  bd.classList.toggle('show',!isOpen);
  document.body.style.overflow=isOpen?'':'hidden';
}
function closeAdminSidebar(){
  const sb=document.getElementById('admin-sidebar');
  const bd=document.getElementById('admin-sidebar-backdrop');
  sb.classList.remove('open');
  bd.classList.remove('show');
  document.body.style.overflow='';
}

function showLogin(){
  document.getElementById('login-modal').classList.add('open');
  document.getElementById('login-error').style.display='none';
  document.getElementById('login-user').value='';
  document.getElementById('login-pass').value='';
  setTimeout(()=>document.getElementById('login-user').focus(),100);
}
function closeLogin(){
  document.getElementById('login-modal').classList.remove('open');
}
function showRegister(){
  document.getElementById('register-modal').classList.add('open');
  document.getElementById('reg-error').style.display='none';
  ['reg-name','reg-lastname','reg-phone','reg-login','reg-pass','reg-pass2'].forEach(id=>{
    document.getElementById(id).value='';
  });
  setTimeout(()=>document.getElementById('reg-name').focus(),100);
}
function closeRegister(){
  document.getElementById('register-modal').classList.remove('open');
}
function doRegister(){
  const name    = document.getElementById('reg-name').value.trim();
  const lastname= document.getElementById('reg-lastname').value.trim();
  const phone   = document.getElementById('reg-phone').value.trim();
  const login   = document.getElementById('reg-login').value.trim().toLowerCase();
  const pass    = document.getElementById('reg-pass').value;
  const pass2   = document.getElementById('reg-pass2').value;
  const errEl   = document.getElementById('reg-error');
  const showErr = msg=>{errEl.style.display='block';errEl.textContent=msg;};

  const pdConsent = document.getElementById('reg-pd-consent');
  if(pdConsent && !pdConsent.checked) return showErr('Необходимо дать согласие на обработку персональных данных');
  if(!name||!login||!pass) return showErr('Заполните все обязательные поля');
  if(!/^[a-z0-9_]{3,30}$/.test(login)) return showErr('Логин: только латинские буквы, цифры и _, от 3 до 30 символов');
  if(pass.length<6) return showErr('Пароль должен быть не менее 6 символов');
  if(pass!==pass2) return showErr('Пароли не совпадают');
  if(SYSTEM_ACCOUNTS[login]) return showErr('Этот логин уже занят');

  const users=getUsers();
  if(users.find(u=>u.login===login)) return showErr('Пользователь с таким логином уже существует');

  const newUser={
    login, name:`${name} ${lastname}`.trim(),
    phone, role:'customer',
    password: pass,
    createdAt: new Date().toISOString(),
  };
  users.push(newUser);
  saveUsers(users);

  state.user={login, name:newUser.name, role:'customer'};
  state.role='customer';
  sessionStorage.setItem('dp_session',JSON.stringify(state.user));
  logActivity({user:login,role:'customer',action:'register',details:`Новый пользователь: ${newUser.name}`});
  closeRegister();
  renderAuthHeader();
  showWelcome(name,'customer',()=>{
    showPage('admin'); switchAdminTab('my_profile');
  });
}
function doLogin(){
  const login=document.getElementById('login-user').value.trim();
  const pass=document.getElementById('login-pass').value;
  const errEl=document.getElementById('login-error');

  const cloudAcc=CLOUD_STAFF[login];
  if(cloudAcc&&cloudAcc.password===pass){
    try{
      state.user={login,name:cloudAcc.name,role:cloudAcc.role};
      state.role=cloudAcc.role;
      sessionStorage.setItem('dp_session',JSON.stringify(state.user));
      logActivity({user:login,role:cloudAcc.role,action:'login',details:'Вход (облачный аккаунт)'});
      closeLogin();renderAuthHeader();
      if(state.currentResults.length)renderResults();
      showWelcome(cloudAcc.name,cloudAcc.role,()=>{
        if(STAFF_ROLES.includes(cloudAcc.role))showPage('admin');
        else{showPage('admin');switchAdminTab('my_profile');}
      });
    }catch(err){console.error('Login error:',err);}
    return;
  }

  const sysAcc=SYSTEM_ACCOUNTS[login];
  if(sysAcc&&sysAcc.password===pass){
    try{
      state.user={login,name:sysAcc.name,role:sysAcc.role};
      state.role=sysAcc.role;
      sessionStorage.setItem('dp_session',JSON.stringify(state.user));
      logActivity({user:login,role:sysAcc.role,action:'login',details:'Вход в систему'});
      closeLogin();
      renderAuthHeader();
      if(state.currentResults.length) renderResults();
      showWelcome(sysAcc.name, sysAcc.role, ()=>{
        if(STAFF_ROLES.includes(sysAcc.role)) showPage('admin');
        else { showPage('admin'); switchAdminTab('my_profile'); }
      });
    }catch(err){console.error('Login error:',err);}
    return;
  }

  const regUser=getUserByLogin(login);
  if(regUser&&regUser.password===pass){
    state.user={login,name:regUser.name,role:regUser.role||'customer'};
    state.role=state.user.role;
    sessionStorage.setItem('dp_session',JSON.stringify(state.user));
    logActivity({user:login,role:state.user.role,action:'login',details:'Вход в систему'});
    closeLogin();
    renderAuthHeader();
    if(state.currentResults.length) renderResults();
    showWelcome(regUser.name, state.role, ()=>{
      if(STAFF_ROLES.includes(state.role)) showPage('admin');
      else { showPage('admin'); switchAdminTab('my_profile'); }
    });
    return;
  }

  errEl.style.display='block';
  errEl.textContent=`Неверный логин или пароль`;
}
function showWelcome(name, role, callback){
  const ROLE_NAMES={creator:'Создатель',boss:'Начальник',admin:'Администратор',
    manager:'Менеджер',accountant:'Бухгалтер',warehouse:'Склад',
    customer:'Покупатель',hacker:'Аудит'};
  const ROLE_COLORS={creator:'#f0c040',boss:'var(--accent)',admin:'var(--accent)',
    manager:'var(--blue)',accountant:'var(--green)',warehouse:'var(--amber)',
    customer:'var(--accent)',hacker:'#a855f7'};
  const login=state.user?.login||'';
  const avColor=ROLE_COLORS[role]||'var(--accent)';
  const avatar=getUserAvatar(login);
  const nickname=getUserNickname(login)||name;

  document.getElementById('welcome-name').textContent=nickname;
  const roleEl=document.getElementById('welcome-role');
  const roleLabel=ROLE_NAMES[role]||role;
  roleEl.textContent=roleLabel;
  roleEl.style.background=`${avColor}22`;
  roleEl.style.color=avColor;

  const avWrap=document.getElementById('welcome-avatar-wrap');
  avWrap.innerHTML=avatar
    ? `<div class="welcome-avatar" style="margin-bottom:20px;border:none;padding:0"><img src="${avatar}" alt=""></div>`
    : `<div class="welcome-avatar" style="background:${avColor}18;color:${avColor};margin-bottom:20px">${name[0].toUpperCase()}</div>`;

  const ov=document.getElementById('welcome-overlay');
  ov.classList.remove('hide');
  ov.classList.add('show');

  setTimeout(()=>{
    ov.classList.add('hide');
    setTimeout(()=>{
      ov.classList.remove('show','hide');
      if(callback) callback();
    },380);
  },2200);
}

function doLogout(){
  stopHkPoll();
  closeMobileMenu();
  closeAdminSidebar();
  state.user=null;
  state.role='customer';
  sessionStorage.removeItem('dp_session');
  renderAuthHeader();
  if(state.currentResults.length) renderResults();
  showPage('home');
  showToast('Вы вышли из системы','amber');
}
function renderAuthHeader(){
  const area=document.getElementById('header-auth-area');
  if(!state.user){
    area.innerHTML=`<button class="auth-btn" onclick="showLogin()">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
      <span style="font-size:13px;font-weight:500;text-transform:uppercase;letter-spacing:.03em">Войти</span>
    </button>`;
  } else {
    const r=state.user.role;
    const isStaff=ADMIN_ROLES.includes(r);
    const ROLE_NAMES={creator:'Создатель',boss:'Начальник',admin:'Администратор',manager:'Менеджер',accountant:'Бухгалтер',warehouse:'Склад',customer:'Покупатель',hacker:'Аудит'};
    const avColor=r==='creator'?'#f0c040':r==='boss'?'var(--accent)':r==='admin'?'var(--accent)':r==='manager'?'var(--blue)':r==='warehouse'?'var(--amber)':r==='accountant'?'var(--green)':'var(--text3)';
    const userAvatar=getUserAvatar(state.user.login);
    const nickname=getUserNickname(state.user.login)||state.user.name.split(' ')[0];
    const avatarHdrHtml=userAvatar
      ? `<img src="${userAvatar}" class="auth-avatar-img" alt="">`
      : `<div class="auth-avatar" style="background:${avColor}22;color:${avColor};border:1.5px solid ${avColor}44">${state.user.name[0].toUpperCase()}</div>`;
    const avatarDdHtml=userAvatar
      ? `<img src="${userAvatar}" style="width:44px;height:44px;border-radius:50%;object-fit:cover;border:2px solid ${avColor}44;flex-shrink:0" alt="">`
      : `<div style="width:44px;height:44px;border-radius:50%;background:${avColor}22;color:${avColor};border:2px solid ${avColor}44;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;flex-shrink:0">${state.user.name[0].toUpperCase()}</div>`;
    const isLight=document.documentElement.classList.contains('light');
    area.innerHTML=`
      <button class="auth-btn" onclick="toggleProfileDropdown(event)" style="gap:10px" aria-label="Профиль">
        ${avatarHdrHtml}
        <div style="text-align:left;display:flex;flex-direction:column">
          <div class="auth-name">${nickname}</div>
          <div class="auth-role-tag">${ROLE_NAMES[r]||r}</div>
        </div>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="opacity:.4;flex-shrink:0"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      <div class="profile-dropdown" id="profile-dropdown">
        <!-- Head -->
        <div class="profile-dd-head">
          <div style="display:flex;align-items:center;gap:12px">
            ${avatarDdHtml}
            <div>
              <div style="font-size:14px;font-weight:700;color:var(--text)">${getUserNickname(state.user.login)||state.user.name}</div>
              <div style="font-size:12px;color:var(--text3);margin-top:1px">@${state.user.login}</div>
              <div style="font-size:11px;color:${avColor};letter-spacing:.06em;text-transform:uppercase;margin-top:2px;font-weight:700">${ROLE_NAMES[r]||r}</div>
            </div>
          </div>
        </div>
        <!-- Items -->
        ${isStaff?`
        <button class="profile-dd-item accent" onclick="closeProfileDropdown();showPage('admin')">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
          Панель управления
        </button>
        <div class="profile-dd-sep"></div>`:''}
        <button class="profile-dd-item" onclick="closeProfileDropdown();showPage('admin');switchAdminTab('my_profile')">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          Мой профиль
        </button>
        <button class="profile-dd-item" onclick="closeProfileDropdown();showPage('admin');switchAdminTab('my_orders')">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
          Мои заказы
        </button>
        <button class="profile-dd-item" onclick="closeProfileDropdown();showPage('cart')">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 001.98 1.61H19.4a2 2 0 001.98-1.69l1.62-9.31H6"/></svg>
          Корзина
        </button>
        <div class="profile-dd-sep"></div>
        <button class="theme-toggle-btn" onclick="toggleTheme();event.stopPropagation()">
          <span style="display:flex;align-items:center;gap:8px">
            <span style="font-size:15px">${isLight?'☀️':'🌙'}</span>
            <span>${isLight?'Светлая тема':'Тёмная тема'}</span>
          </span>
          <div class="theme-pill"></div>
        </button>
        <div class="profile-dd-sep"></div>
        <button class="profile-dd-item" onclick="closeProfileDropdown();doLogout()" style="color:var(--text3)">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          Выйти
        </button>
      </div>`;
  }
}

function toggleProfileDropdown(e){
  e.stopPropagation();
  const dd=document.getElementById('profile-dropdown');
  if(!dd) return;
  const isOpen=dd.classList.contains('open');
  closeProfileDropdown();
  if(!isOpen) dd.classList.add('open');
}
function closeProfileDropdown(){
  document.getElementById('profile-dropdown')?.classList.remove('open');
}

document.addEventListener('click', ()=>closeProfileDropdown());

async function triggerSearch(q){
  if(!q.trim()) return;
  state.currentQuery=q.trim().toUpperCase();
  showPage('search');
  document.getElementById('header-search-input').value=q;
  document.getElementById('search-article-display').textContent=state.currentQuery;

  const area=document.getElementById('search-results-area');
  const qwepCfg=getQwepConfig();
  const hasQwep=qwepCfg.enabled&&(qwepCfg.apiKey||qwepCfg.login);
  const hasCatalog=getCatalogCount()>0;

  if(!hasCatalog && !hasQwep){
    area.innerHTML=`
      <div style="text-align:center;padding:60px 24px">
        <div style="font-size:48px;margin-bottom:16px">📦</div>
        <div style="font-size:18px;font-weight:700;color:var(--text);margin-bottom:8px">Каталог пуст</div>
        <p style="font-size:14px;color:var(--text2);line-height:1.7;max-width:480px;margin:0 auto 24px">
          Данные о наличии товаров загружаются только из <strong>1С</strong> или <strong>QWEP</strong>.<br>
          Загрузите файл из 1С или настройте QWEP API в панели управления.
        </p>
        ${state.role&&['boss','admin','manager'].includes(state.role)?`
          <button class="admin-btn admin-btn-primary" onclick="showPage('admin');switchAdminTab('integrations')">⚙️ Открыть Интеграции</button>
        `:'<p style="font-size:13px;color:var(--text3)">Обратитесь к менеджеру.</p>'}
      </div>`;
    document.getElementById('search-results-count').textContent='Нет данных';
    return;
  }

  area.innerHTML=`
    <div style="text-align:center;padding:60px 0">
      <span class="loading-dot"></span><span class="loading-dot"></span><span class="loading-dot"></span>
      <div style="font-size:13px;color:var(--text3);margin-top:12px">
        ${hasCatalog?'Поиск в базе 1С...':''}${hasCatalog&&hasQwep?' · ':''}${hasQwep?'Запрос к QWEP...':''}
      </div>
    </div>`;

  const localResults = searchCatalog(state.currentQuery);

  let qwepResults = [];
  if(hasQwep){
    try{ qwepResults = await fetchQwepSearch(state.currentQuery, qwepCfg); }catch(e){}
  }

  state.currentResults = [...localResults, ...qwepResults];

  document.getElementById('search-results-count').textContent=
    state.currentResults.length
      ? `Найдено ${state.currentResults.length} предложений`
      : 'Ничего не найдено';

  if(!state.currentResults.length){
    area.innerHTML=`
      <div style="text-align:center;padding:60px 24px">
        <div style="font-size:40px;margin-bottom:12px">🔍</div>
        <div style="font-size:16px;font-weight:600;color:var(--text);margin-bottom:8px">«${escHtml(state.currentQuery)}» не найдено</div>
        <p style="font-size:13px;color:var(--text2)">Товар отсутствует в базе 1С${hasQwep?' и в QWEP':''}.<br>Проверьте артикул или обновите каталог.</p>
      </div>`;
    return;
  }

  renderResults();
  renderBrandFilters();
  if(state.user && ['manager','admin','boss'].includes(state.role)){
    logActivity({user:state.user.login,role:state.role,action:'search',
      details:`«${state.currentQuery}» — ${state.currentResults.length} рез. (1С:${localResults.length} QWEP:${qwepResults.length})`});
  }
}

async function fetchQwepSearch(query, cfg){
  const markup = (parseFloat(cfg.markup)||25)/100;
  
  const apiUrl = (cfg.serverUrl||'https://api.qwep.ru').replace(/\/+$/,'');
  const resp = await fetch(`${apiUrl}/api/v2/search`, {
    method:'POST',
    headers:{
      'Content-Type':'application/json',
      'Authorization':'Bearer '+(cfg.apiKey||''),
      'X-Login': cfg.login||'',
      'X-Password': cfg.password||'',
    },
    body: JSON.stringify({query, limit:50}),
    signal: AbortSignal.timeout(8000),
  });
  if(!resp.ok) throw new Error('QWEP HTTP '+resp.status);
  const data = await resp.json();
  
  const offers = data.offers||data.results||data.data||data||[];
  return offers.map((o,i)=>{
    const input = parseFloat(o.price||o.cost||0);
    const retail = Math.round(input*(1+markup));
    return {
      id: 'q_'+Date.now()+'_'+i,
      article:  o.article||o.partNumber||o.vendorCode||query,
      brand:    o.brand||o.manufacturer||o.brandName||'—',
      name:     o.name||o.description||o.article||query,
      source:   'qwep',
      price_retail:    retail||0,
      price_wholesale: input||0,
      price_input:     input||0,
      stock:           parseInt(o.quantity||o.stock||o.qty||0),
      delivery_days:   parseInt(o.deliveryDays||o.delivery||o.days||3),
      supplier_internal: o.warehouse||o.supplier||o.warehouseName||'QWEP',
    };
  });
}

function renderResults(){
  const area=document.getElementById('search-results-area');
  if(!state.currentResults.length){area.innerHTML='<div style="padding:60px;text-align:center;color:var(--text3)">Ничего не найдено</div>';return;}

  let items=[...state.currentResults];

  if(state.filters.availability!=='all')
    items=items.filter(i=>i.availability===state.filters.availability||
      (state.filters.availability==='in_stock'&&i.stock>0&&i.source==='1c')||
      (state.filters.availability==='order'&&(i.source==='qwep'||i.stock===0)));
  if(state.filters.source!=='all')
    items=items.filter(i=>i.source===state.filters.source);
  if(state.filters.delivery!=='all'&&state.filters.delivery!=='0')
    items=items.filter(i=>i.delivery_days<=parseInt(state.filters.delivery));

  const sort=document.getElementById('sort-select')?.value||'availability';
  if(sort==='price_asc') items.sort((a,b)=>a.price_retail-b.price_retail);
  else if(sort==='price_desc') items.sort((a,b)=>b.price_retail-a.price_retail);
  else if(sort==='delivery_asc') items.sort((a,b)=>a.delivery_days-b.delivery_days);
  else items.sort((a,b)=>{
    if(a.source==='1c'&&a.stock>0 && !(b.source==='1c'&&b.stock>0)) return -1;
    if(!(a.source==='1c'&&a.stock>0)&&b.source==='1c'&&b.stock>0) return 1;
    return a.price_retail-b.price_retail;
  });

  const inStock=items.filter(i=>i.source==='1c'&&i.stock>0);
  const onOrder=items.filter(i=>!(i.source==='1c'&&i.stock>0));
  const isManager=state.role==='manager'||state.role==='admin';

  let html='';

  if(inStock.length){
    html+=`<div class="result-group animate-in">
      <div class="group-label">
        <span class="group-badge badge-own">✓ В наличии на нашем складе</span>
        <div class="group-line"></div>
      </div>
      <table class="result-table">
        <thead><tr>
          <th>Артикул</th><th>Бренд</th><th>Наименование</th>
          ${isManager?'<th>Вход. цена</th>':''}
          <th>Цена</th><th>Кол-во</th><th>Доставка</th>
          ${isManager?'<th>Склад</th>':''}
          <th></th>
        </tr></thead>
        <tbody>${inStock.map(r=>renderRow(r,isManager)).join('')}</tbody>
      </table>
    </div>`;
  }

  if(onOrder.length){
    html+=`<div class="result-group animate-in stagger-2">
      <div class="group-label">
        <span class="group-badge ${isManager?'badge-manager':'badge-order'}">${isManager?'📊 Предложения поставщиков QWEP':'⏱ Под заказ'}</span>
        <div class="group-line"></div>
      </div>
      <table class="result-table">
        <thead><tr>
          <th>Артикул</th><th>Бренд</th><th>Наименование</th>
          ${isManager?'<th>Поставщик</th>':''}
          ${isManager?'<th>Вход. цена</th>':''}
          <th>Цена</th><th>Кол-во</th><th>Срок доставки</th>
          <th></th>
        </tr></thead>
        <tbody>${onOrder.map(r=>renderRow(r,isManager)).join('')}</tbody>
      </table>
    </div>`;
  }

  if(!html) html='<div style="padding:60px;text-align:center;color:var(--text3)">Ничего не найдено по фильтрам</div>';
  area.innerHTML=html;
}

function renderRow(r,isManager){
  const inStock=r.source==='1c'&&r.stock>0;
  const fmt=n=>n.toLocaleString('ru-RU')+'&nbsp;₽';

  const qtyHtml=r.stock>0
    ?`<span class="qty-ok">● ${r.stock} шт</span>`
    :`<span class="qty-order">~ ${r.stock||'по запросу'} шт</span>`;

  const delivHtml=r.delivery_days===0
    ?'<span style="color:var(--green)">Сегодня</span>'
    :`<span>${r.delivery_days} дн.</span>`;

  let actionHtml='';
  if(inStock){
    actionHtml=`<button class="btn btn-primary btn-sm" onclick="addToCart(${r.id})">В корзину</button>`;
  } else if(isManager){
    actionHtml=`<button class="btn btn-outline btn-sm" onclick="addToCart(${r.id})">Добавить</button>`;
  } else {
    actionHtml=`<div class="cta-order">
      <div class="cta-order-status">Под заказ</div>
      <div class="cta-order-hint">Доставка от ${r.delivery_days} дн.</div>
      <a href="tel:+79286074547" class="btn btn-call btn-sm" style="margin-top:4px">
        📞 Позвонить
      </a>
    </div>`;
  }

  const managerCols=isManager?`
    <td class="td-supplier">${r.supplier_internal||'—'}</td>
    <td class="td-price-input">${r.price_input?fmt(r.price_input):'—'}</td>
  `:'';
  const wholesaleCol=isManager&&r.source==='1c'?`<td class="td-price-input">${fmt(r.price_wholesale)}</td>`:'';

  return `<tr>
    <td class="td-article">${r.article}</td>
    <td class="td-brand">${r.brand}</td>
    <td class="td-name">${r.name}</td>
    ${r.source==='1c'?wholesaleCol:''}
    ${r.source!=='1c'?managerCols:''}
    <td class="td-price">${fmt(r.price_retail)}</td>
    <td class="td-qty">${qtyHtml}</td>
    <td class="td-delivery">${delivHtml}</td>
    <td>${actionHtml}</td>
  </tr>`;
}

function renderBrandFilters(){
  const brands=[...new Set(state.currentResults.map(r=>r.brand))];
  const container=document.getElementById('filter-brands');
  container.innerHTML=brands.map(b=>`<span class="filter-chip" data-filter="brand" data-val="${b}">${b}</span>`).join('');
  container.querySelectorAll('.filter-chip').forEach(c=>c.addEventListener('click',()=>{
    c.classList.toggle('active');
  }));
}

function clearFilters(){
  state.filters={availability:'all',source:'all',delivery:'all'};
  document.querySelectorAll('.filter-chip').forEach(c=>{
    c.classList.toggle('active', c.dataset.val==='all');
  });
  renderResults();
}

document.querySelectorAll('.filter-chip[data-filter]').forEach(c=>{
  c.addEventListener('click',()=>{
    const filter=c.dataset.filter;
    if(filter==='brand'){c.classList.toggle('active');return;}
    
    document.querySelectorAll(`.filter-chip[data-filter="${filter}"]`).forEach(x=>x.classList.remove('active'));
    c.classList.add('active');
    state.filters[filter]=c.dataset.val;
    renderResults();
  });
});

function getWHStock(){
  try{return JSON.parse(localStorage.getItem('dp_stock')||'{}');}catch{return{};}
}
function maxStockForItem(item){
  if(!item) return 0;
  const wh=getWHStock();
  
  const whEntry=Object.values(wh).find(e=>e.article&&e.article.toLowerCase()===item.article.toLowerCase());
  if(whEntry&&whEntry.quantity>0) return whEntry.quantity;
  
  return item.stock??999;
}

function addToCart(id){
  const item=state.currentResults.find(r=>r.id===id);
  if(!item) return;
  const maxQty=maxStockForItem(item);
  const existing=state.cart.find(c=>c.id===id);
  const curQty=existing?existing.quantity:0;
  if(maxQty>0&&curQty>=maxQty){
    showToast(`Максимум ${maxQty} шт. в наличии`,'red');return;
  }
  if(existing){existing.quantity++;showToast('Количество увеличено');}
  else{state.cart.push({...item,quantity:1,_maxQty:maxQty});}
  updateCartCount();
  showToast(`${item.brand} ${item.article} — добавлено в корзину`,'green');
}

function removeFromCart(id){
  state.cart=state.cart.filter(c=>c.id!==id);
  updateCartCount();
  renderCart();
  showToast('Товар удалён из корзины','red');
}

function changeQty(id,delta){
  const item=state.cart.find(c=>c.id===id);
  if(!item) return;
  const maxQty=item._maxQty??maxStockForItem(item);
  const newQty=Math.max(1,item.quantity+delta);
  if(delta>0&&maxQty>0&&newQty>maxQty){
    showToast(`Максимум ${maxQty} шт. в наличии`,'red');return;
  }
  item.quantity=newQty;
  renderCart();
  renderCheckoutSummary();
}

function updateCartCount(){
  const total=state.cart.reduce((s,c)=>s+c.quantity,0);
  document.getElementById('cart-count').textContent=total;
}

function getCartSubtotal(){
  return state.cart.reduce((s,c)=>s+c.price_retail*c.quantity,0);
}

function renderCart(){
  const content=document.getElementById('cart-content');
  const summaryCol=document.getElementById('cart-summary-col');
  const fmt=n=>n.toLocaleString('ru-RU')+' ₽';

  if(!state.cart.length){
    content.innerHTML=`<div class="empty-cart">
      <div class="empty-icon">🛒</div>
      <div class="empty-title">Корзина пуста</div>
      <div class="empty-sub" style="margin-bottom:20px">Найдите нужные запчасти по артикулу</div>
      <button class="btn btn-primary btn-md" onclick="showPage('search')">Перейти в каталог</button>
    </div>`;
    summaryCol.innerHTML='';
    return;
  }

  content.innerHTML=`
    <div class="page-title">Корзина <span style="font-size:20px;color:var(--text3);font-family:var(--font-body);font-weight:400">(${state.cart.length} позиции)</span></div>
    ${state.cart.map(item=>`
    <div class="cart-item animate-in">
      <div class="cart-item-info">
        <div class="cart-item-article">${item.article}</div>
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-brand">${item.brand}</div>
        <span class="cart-item-src ${item.source==='1c'?'src-1c':'src-qwep'}">${item.source==='1c'?'Наш склад':'Под заказ'}</span>
      </div>
      <div class="qty-control">
        <button class="qty-btn" onclick="changeQty(${item.id},-1)">−</button>
        <div class="qty-val">${item.quantity}</div>
        <button class="qty-btn" onclick="changeQty(${item.id},+1)">+</button>
      </div>
      <div class="cart-item-price">${fmt(item.price_retail*item.quantity)}</div>
      <button class="cart-item-del" onclick="removeFromCart(${item.id})">✕</button>
    </div>`).join('')}
  `;

  const subtotal=getCartSubtotal();
  summaryCol.innerHTML=`
    <div class="cart-summary">
      <div class="summary-title">Итого</div>
      <div class="summary-row"><span class="summary-label">Товаров</span><span class="summary-val">${state.cart.reduce((s,c)=>s+c.quantity,0)} шт.</span></div>
      <div class="summary-row"><span class="summary-label">Стоимость</span><span class="summary-val">${fmt(subtotal)}</span></div>
      <div class="summary-row"><span class="summary-label">Доставка</span><span class="summary-val" style="color:var(--text3)">рассчитается</span></div>
      <div class="summary-row total">
        <span class="summary-label">К оплате</span>
        <span class="summary-val total-val">${fmt(subtotal)}</span>
      </div>
      <button class="checkout-btn" onclick="showPage('checkout')">Оформить заказ</button>
      <button class="btn btn-ghost btn-md" style="width:100%;margin-top:8px;justify-content:center" onclick="showPage('search')">← Продолжить покупки</button>
    </div>
  `;
}

function setDelivery(type){
  state.delivery=type;
  ['pickup','cdek_pvz','cdek_courier'].forEach(t=>{
    document.getElementById(`dtab-${t}`).classList.toggle('active',t===type);
    document.getElementById(`delivery-${t}`).style.display=t===type?'block':'none';
  });
  renderCheckoutSummary();
  updatePrepayPanel();
}

function renderCheckoutSummary(){
  const el=document.getElementById('checkout-summary');
  if(!el) return;
  const fmt=n=>n.toLocaleString('ru-RU')+' ₽';
  const subtotal=getCartSubtotal();
  let delivCost=0;
  if(state.delivery==='cdek_pvz') delivCost=state.selectedPvz?.cost||299;
  if(state.delivery==='cdek_courier') delivCost=499;
  const total=subtotal+delivCost;

  el.innerHTML=`
    <div class="summary-title">Ваш заказ</div>
    ${state.cart.map(i=>`
    <div style="display:flex;justify-content:space-between;align-items:flex-start;padding:8px 0;border-bottom:1px solid var(--line);gap:12px">
      <div>
        <div style="font-size:12px;font-family:var(--font-mono);color:var(--accent)">${i.article}</div>
        <div style="font-size:13px;color:var(--text2);margin-top:2px">${i.name.substring(0,38)}${i.name.length>38?'...':''}</div>
        <div style="font-size:11px;color:var(--text3)">× ${i.quantity}</div>
      </div>
      <div style="font-family:var(--font-mono);font-size:13px;white-space:nowrap;color:#fff">${fmt(i.price_retail*i.quantity)}</div>
    </div>`).join('')}
    <div class="summary-row" style="margin-top:8px"><span class="summary-label">Товары</span><span class="summary-val">${fmt(subtotal)}</span></div>
    <div class="summary-row"><span class="summary-label">Доставка</span><span class="summary-val">${delivCost?fmt(delivCost):'Бесплатно'}</span></div>
    <div class="summary-row total">
      <span class="summary-label">Итого</span>
      <span class="summary-val total-val">${fmt(total)}</span>
    </div>
  `;
}

function renderStores(){
  const list=document.getElementById('stores-list');
  if(!list) return;
  list.innerHTML=STORES.map(s=>`
    <div class="store-item ${state.selectedStore===s.id?'active':''}" onclick="selectStore('${s.id}')">
      <div>
        <div class="store-name">${s.name}</div>
        <div class="store-addr">${s.address}</div>
      </div>
      <div class="store-tag">${s.tag}</div>
    </div>`).join('');
}

function selectStore(id){
  state.selectedStore=id;
  renderStores();
}

function filterPvz(city){
  
  clearTimeout(window._pvzDebounce);
  window._pvzDebounce = setTimeout(()=>{ if(city.length>=2) cdekLoadPvzByCity(city); }, 700);
}

function renderPvzList(list){
  const el=document.getElementById('pvz-list');
  if(!el) return;
  const items = list || PVZ_LIST;
  if(!items.length){ showPvzLoading('ПВЗ не найдены'); return; }
  el.innerHTML = items.map(p=>`
    <div class="pvz-item ${state.selectedPvz?.code===p.code?'active':''}" onclick="selectPvz('${p.code}')">
      <div class="pvz-name">${p.name}</div>
      <div class="pvz-addr">${p.address}</div>
      <div style="display:flex;gap:12px;margin-top:4px;flex-wrap:wrap">
        <div class="pvz-cost">${p.cost} ₽</div>
        <div class="pvz-time">${p.days}</div>
        ${p.work_time?`<div style="font-size:11px;color:var(--text3)">🕐 ${p.work_time}</div>`:''}
      </div>
    </div>`).join('');
}

function selectPvz(code){
  state.selectedPvz=PVZ_LIST.find(p=>p.code===code);
  renderPvzList();
  renderCheckoutSummary();
}

function logActivity(entry){
  try{
    const ts=new Date().toISOString();
    const logs=JSON.parse(localStorage.getItem('dp_activity')||'[]');
    logs.unshift({...entry,ts});
    if(logs.length>500) logs.length=500;
    localStorage.setItem('dp_activity',JSON.stringify(logs));
    
    _logChange({...entry,ts});
  }catch(e){}
}
function getLogs(){
  try{return JSON.parse(localStorage.getItem('dp_activity')||'[]');}catch{return[];}
}

function _logChange(entry){
  try{
    const feed=JSON.parse(localStorage.getItem('dp_change_feed')||'[]');
    feed.unshift(entry);
    if(feed.length>1000) feed.length=1000;
    localStorage.setItem('dp_change_feed',JSON.stringify(feed));
  }catch(e){}
}
function getChangeFeed(){
  try{return JSON.parse(localStorage.getItem('dp_change_feed')||'[]');}catch{return[];}
}

(()=>{
  const _orig=localStorage.setItem.bind(localStorage);
  localStorage.setItem=function(key,val){
    _orig(key,val);
    if(key==='dp_change_feed'||key==='dp_activity') return; 
    try{
      const actor=state?.user?.login||'system';
      const role=state?.user?.role||'system';
      _logChange({
        ts:new Date().toISOString(),
        user:actor,role,
        action:'storage_write',
        details:`${key} изменён`,
        storageKey:key,
      });
    }catch(e){}
  };
})();

function saveOrder(order){
  try{
    const orders=JSON.parse(localStorage.getItem('dp_orders')||'[]');
    orders.unshift(order);
    localStorage.setItem('dp_orders',JSON.stringify(orders));
  }catch(e){}
}
function getOrders(){
  try{return JSON.parse(localStorage.getItem('dp_orders')||'[]');}catch{return[];}
}
function updateOrderStatus(id,status){
  try{
    const orders=getOrders();
    const o=orders.find(x=>x.id===id);
    if(o){
      const old=o.status;
      o.status=status;
      localStorage.setItem('dp_orders',JSON.stringify(orders));
      logActivity({user:state.user?.login||'admin',role:state.user?.role||'admin',
        action:'status_change',details:`Заказ ${id}: ${old} → ${status}`});
    }
  }catch(e){}
}

const STATUS_LABELS={
  pending:'⏳ Ожидает',new:'Новый',confirmed:'Подтверждён',paid:'Оплачен',
  assembling:'Сборка',shipped:'Отгружен',done:'Выполнен',cancelled:'Отменён'
};
const STATUS_CSS={
  pending:'st-pending',new:'st-new',confirmed:'st-confirmed',paid:'st-paid',
  assembling:'st-assembling',shipped:'st-shipped',done:'st-done',cancelled:'st-cancelled'
};

function updatePendingBadge(){
  const cnt=getOrders().filter(o=>o.status==='pending').length;
  const b=document.getElementById('pending-orders-badge');
  if(b){b.textContent=cnt;b.style.display=cnt?'inline-block':'none';}
}

function switchAdminTab(tab){
  
  const customerTabs=['my_profile','my_orders'];
  if(state.role==='customer' && !customerTabs.includes(tab)) return;
  document.querySelectorAll('.admin-nav-item').forEach(n=>n.classList.toggle('active',n.dataset.tab===tab));
  document.querySelectorAll('.admin-section').forEach(s=>s.classList.toggle('active',s.id===`admin-tab-${tab}`));
  closeAdminSidebar(); 
  updatePendingBadge();
  if(tab==='dashboard')  renderAdminDashboard();
  if(tab==='orders')     renderAdminOrders();
  if(tab==='profit')     renderAdminProfit();
  if(tab==='logs')       renderAdminLogs();
  if(tab==='users')      renderAdminUsers();
  if(tab==='mgr_home')    renderMgrHome();
  if(tab==='mgr_sales')   renderMgrSales();
  if(tab==='buh_home')    renderBuhHome();
  if(tab==='wh_home')     renderWhHome();
  if(tab==='wh_stock')    renderWhStock();
  if(tab==='my_orders')   renderMyOrders();
  if(tab==='my_profile')  renderMyProfile();
  if(tab==='boss_mgrs')   renderBossMgrs();
  if(tab==='integrations')  renderIntegrations();
  if(tab==='hk_monitor')    renderHkMonitor();
  if(tab==='hk_changes')    renderHkChanges();
  if(tab==='support_chat')  renderSupportChat();
  if(tab==='cr_accounts')   renderCreatorAccounts();
  if(tab==='cr_banners')    renderCreatorBanners();
}

function renderAdminDashboard(){
  const orders=getOrders();
  const fmt=n=>(n||0).toLocaleString('ru-RU')+' ₽';
  const today=new Date().toLocaleDateString('ru-RU',{day:'numeric',month:'long',year:'numeric'});
  document.getElementById('admin-dash-date').textContent='Сегодня: '+today;

  const todayStr=new Date().toISOString().slice(0,10);
  const todayOrders=orders.filter(o=>o.createdAt.startsWith(todayStr));
  const totalRev=orders.filter(o=>o.status!=='cancelled').reduce((s,o)=>s+o.total,0);
  const active=orders.filter(o=>!['done','cancelled'].includes(o.status)).length;

  document.getElementById('admin-stats-row').innerHTML=`
    <div class="admin-stat-card">
      <div class="asc-label">Заказов сегодня</div>
      <div class="asc-value">${todayOrders.length}</div>
      <div class="asc-sub">из ${orders.length} всего</div>
    </div>
    <div class="admin-stat-card asc-green">
      <div class="asc-label">Выручка всего</div>
      <div class="asc-value">${(totalRev/1000).toFixed(0)}к</div>
      <div class="asc-sub">${fmt(totalRev)}</div>
    </div>
    <div class="admin-stat-card asc-amber">
      <div class="asc-label">Активных заказов</div>
      <div class="asc-value">${active}</div>
      <div class="asc-sub">в работе</div>
    </div>
    <div class="admin-stat-card asc-blue">
      <div class="asc-label">Записей в журнале</div>
      <div class="asc-value">${getLogs().length}</div>
      <div class="asc-sub">действий</div>
    </div>`;

  const recent=orders.slice(0,8);
  const tbody=document.getElementById('admin-dash-orders');
  if(!recent.length){
    tbody.innerHTML=`<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--text3)">Заказов ещё нет</td></tr>`;return;
  }
  tbody.innerHTML=recent.map(o=>`<tr>
    <td><span style="font-family:var(--font-mono);color:var(--accent);font-size:12px">${o.id}</span></td>
    <td style="color:var(--text3);font-size:12px">${fmtDate(o.createdAt)}</td>
    <td>${o.contact?.name||'—'}</td>
    <td style="text-align:center">${o.items?.length||0}</td>
    <td style="font-family:var(--font-mono)">${fmt(o.total)}</td>
    <td style="font-size:12px;color:var(--text3)">${delivLabel(o.delivery)}</td>
    <td><span class="status-badge ${STATUS_CSS[o.status]||'st-new'}">${STATUS_LABELS[o.status]||o.status}</span></td>
  </tr>`).join('');
}

function renderAdminOrders(){
  const orders=getOrders();
  const search=(document.getElementById('orders-search')?.value||'').toLowerCase();
  const stFilter=document.getElementById('orders-status-filter')?.value||'';
  const fmt=n=>(n||0).toLocaleString('ru-RU')+' ₽';

  let list=orders;
  if(search) list=list.filter(o=>(o.contact?.name||'').toLowerCase().includes(search)||(o.id||'').toLowerCase().includes(search));
  if(stFilter) list=list.filter(o=>o.status===stFilter);

  const tbody=document.getElementById('admin-orders-tbody');
  if(!list.length){
    tbody.innerHTML=`<tr><td colspan="9" style="text-align:center;padding:32px;color:var(--text3)">Заказов не найдено</td></tr>`;return;
  }
  const canManage=state.role==='boss'||state.role==='admin'||state.role==='manager';
  tbody.innerHTML=list.map(o=>`<tr style="${o.status==='pending'?'background:rgba(245,158,11,.04)':''}">
    <td>
      <span style="font-family:var(--font-mono);color:var(--accent);font-size:12px">${o.id}</span>
      ${o.status==='pending'?`<div style="font-size:10px;color:var(--amber);font-weight:700;margin-top:2px">⚠ НОВЫЙ — нужно принять</div>`:''}
    </td>
    <td style="font-size:12px;color:var(--text3)">${fmtDate(o.createdAt)}</td>
    <td>
      <div>${o.contact?.name||'—'}</div>
      ${o.contact?.login?`<div style="font-size:11px;color:var(--text3);font-family:var(--font-mono)">${o.contact.login}</div>`:''}
    </td>
    <td style="font-family:var(--font-mono);font-size:12px">${o.contact?.phone||'—'}</td>
    <td style="text-align:center">${o.items?.length||0}</td>
    <td style="font-family:var(--font-mono)">${fmt(o.total)}</td>
    <td style="font-size:12px;color:var(--text3)">${delivLabel(o.delivery)}</td>
    <td><span class="status-badge ${STATUS_CSS[o.status]||'st-new'}">${STATUS_LABELS[o.status]||o.status}</span></td>
    <td>
      ${o.status==='pending'&&canManage
        ?`<button class="admin-btn" style="background:var(--green);color:#000;font-weight:700;margin-bottom:6px;width:100%" onclick="acceptOrder('${o.id}')">✓ Принять заказ</button>`
        :''}
      <select class="status-select" onchange="updateOrderStatus('${o.id}',this.value);renderAdminOrders()">
        ${Object.entries(STATUS_LABELS).map(([v,l])=>`<option value="${v}"${o.status===v?' selected':''}>${l}</option>`).join('')}
      </select>
    </td>
  </tr>`).join('');
}

function acceptOrder(id){
  updateOrderStatus(id,'confirmed');
  const order=getOrders().find(o=>o.id===id);
  if(order){
    notifyTelegram(
      `✅ *Заказ принят* \`${id}\`\n`+
      `👤 ${order.contact?.name||'—'}\n`+
      `💰 ${(order.total||0).toLocaleString('ru-RU')} ₽\n`+
      `📦 Передан в сборку`
    );
  }
  showToast(`Заказ ${id} принят и передан в сборку`,'green');
  updatePendingBadge();
  
  const activeTab = document.querySelector('.admin-nav-item.active')?.dataset?.tab;
  if(activeTab==='mgr_home') renderMgrHome();
  else if(activeTab==='orders') renderAdminOrders();
  else renderAdminOrders();
}

function renderAdminProfit(){
  const orders=getOrders().filter(o=>!['cancelled','new'].includes(o.status));
  const dateFrom=document.getElementById('profit-date-from')?.value;
  const dateTo=document.getElementById('profit-date-to')?.value;
  const commPct=parseFloat(document.getElementById('profit-commission')?.value||'10');
  const fmt=n=>(n||0).toLocaleString('ru-RU')+' ₽';

  let list=orders;
  if(dateFrom) list=list.filter(o=>o.createdAt>=dateFrom);
  if(dateTo)   list=list.filter(o=>o.createdAt<=(dateTo+'T23:59:59'));

  let totRev=0,totCost=0;
  const rows=list.map(o=>{
    const rev=o.total||0;
    const cost=o.items?.reduce((s,i)=>{
      const inp=i.price_input||i.price_wholesale||(i.price_retail*0.70);
      return s+inp*(i.quantity||1);
    },0)||0;
    const profit=rev-cost;
    const comm=profit*(commPct/100);
    totRev+=rev; totCost+=cost;
    return {o,rev,cost,profit,comm};
  });

  const totProfit=totRev-totCost;
  const totComm=totProfit*(commPct/100);

  document.getElementById('profit-totals').innerHTML=`
    <div class="profit-total-card">
      <div class="ptc-label">Выручка</div>
      <div class="ptc-value">${fmt(totRev)}</div>
    </div>
    <div class="profit-total-card">
      <div class="ptc-label">Себестоимость</div>
      <div class="ptc-value">${fmt(totCost)}</div>
    </div>
    <div class="profit-total-card ptc-green">
      <div class="ptc-label">Чистая прибыль</div>
      <div class="ptc-value">${fmt(totProfit)}</div>
    </div>
    <div class="profit-total-card ptc-amber">
      <div class="ptc-label">Комиссия (${commPct}%)</div>
      <div class="ptc-value">${fmt(totComm)}</div>
    </div>`;

  const tbody=document.getElementById('profit-tbody');
  if(!rows.length){
    tbody.innerHTML=`<tr><td colspan="8" style="text-align:center;padding:32px;color:var(--text3)">Нет данных за период</td></tr>`;return;
  }
  tbody.innerHTML=rows.map(({o,rev,cost,profit,comm})=>`<tr>
    <td><span style="font-family:var(--font-mono);color:var(--accent);font-size:12px">${o.id}</span></td>
    <td style="font-size:12px;color:var(--text3)">${fmtDate(o.createdAt)}</td>
    <td>${o.contact?.name||'—'}</td>
    <td style="font-family:var(--font-mono)">${fmt(rev)}</td>
    <td style="font-family:var(--font-mono);color:var(--text3)">${fmt(cost)}</td>
    <td style="font-family:var(--font-mono);color:${profit>=0?'var(--green)':'var(--accent)'}">${fmt(profit)}</td>
    <td style="font-family:var(--font-mono);color:var(--amber)">${fmt(comm)}</td>
    <td><span class="status-badge ${STATUS_CSS[o.status]||'st-new'}">${STATUS_LABELS[o.status]||o.status}</span></td>
  </tr>`).join('');
}

function exportProfitCsv(){
  const orders=getOrders().filter(o=>!['cancelled','new'].includes(o.status));
  const commPct=parseFloat(document.getElementById('profit-commission')?.value||'10');
  const rows=[['Заказ','Дата','Клиент','Выручка','Себестоимость','Прибыль','Комиссия','Статус']];
  orders.forEach(o=>{
    const rev=o.total||0;
    const cost=o.items?.reduce((s,i)=>s+(i.price_input||i.price_wholesale||(i.price_retail*0.70))*(i.quantity||1),0)||0;
    const profit=rev-cost;
    const comm=Math.round(profit*(commPct/100));
    rows.push([o.id,fmtDate(o.createdAt),o.contact?.name||'',rev,Math.round(cost),Math.round(profit),comm,STATUS_LABELS[o.status]||o.status]);
  });
  const csv='﻿'+rows.map(r=>r.join(';')).join('\n');
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;a.download='profit.csv';a.click();
  URL.revokeObjectURL(url);
  showToast('CSV экспортирован','green');
}

function renderAdminLogs(){
  const logs=getLogs();
  const search=(document.getElementById('logs-search')?.value||'').toLowerCase();
  const actFilter=document.getElementById('logs-action-filter')?.value||'';
  let list=logs;
  if(search) list=list.filter(l=>(l.user||'').toLowerCase().includes(search));
  if(actFilter) list=list.filter(l=>l.action===actFilter);
  const ACT_LABELS={login:'Вход',search:'Поиск',order_create:'Заказ',status_change:'Статус'};
  const ACT_COLOR={login:'var(--green)',search:'var(--blue)',order_create:'var(--accent)',status_change:'var(--amber)'};
  const tbody=document.getElementById('admin-logs-tbody');
  if(!list.length){
    tbody.innerHTML=`<tr><td colspan="5" style="text-align:center;padding:32px;color:var(--text3)">Журнал пуст</td></tr>`;return;
  }
  tbody.innerHTML=list.slice(0,200).map(l=>`<tr>
    <td style="font-size:12px;color:var(--text3);font-family:var(--font-mono)">${fmtDate(l.ts,true)}</td>
    <td style="font-weight:500">${l.user||'—'}</td>
    <td><span class="role-tag rt-${l.role||'customer'}">${l.role||'customer'}</span></td>
    <td><span style="font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:${ACT_COLOR[l.action]||'var(--text3)'}">${ACT_LABELS[l.action]||l.action}</span></td>
    <td style="font-size:12px;color:var(--text3)">${l.details||''}</td>
  </tr>`).join('');
}

function renderAdminUsers(){
  const orders=getOrders();
  const logs=getLogs();
  const profiles=getOnecProfiles();
  const regUsers=getUsers();

  const bannerEl=document.getElementById('site-sync-status');
  if(bannerEl){
    const binId=localStorage.getItem('dp_users_bin_id');
    const cloudCount=Object.keys(CLOUD_STAFF).length;
    if(binId&&cloudCount>0){
      bannerEl.innerHTML=`<span style="color:#22c55e">✓ Синхронизировано с приложением</span> — загружено <b>${cloudCount}</b> сотрудников · <a href="#" onclick="openSyncSettings();return false" style="color:#5a6268;font-size:.72rem">настройки</a>`;
    }else if(binId){
      bannerEl.innerHTML=`<span style="color:#f59e0b">⚠ Bin ID настроен, но данные не загружены</span> · <a href="#" onclick="openSyncSettings();return false" style="color:#5a6268;font-size:.72rem">настройки</a>`;
    }else{
      bannerEl.innerHTML=`<span style="color:#5a6268">Не настроено</span> — сотрудники берутся из файла. <a href="#" onclick="openSyncSettings();return false" style="color:#e8411a">Настроить синхронизацию →</a>`;
    }
  }

  const allSysAccs={...SYSTEM_ACCOUNTS,...CLOUD_STAFF};
  const systemRows=Object.entries(allSysAccs).map(([login,acc])=>({
    login, role:acc.role, name:acc.name, phone:acc.phone||'',
    system:true, fromCloud:!!(CLOUD_STAFF[login])
  }));
  
  const regRows=regUsers.map(u=>({...u,system:false}));
  const allUsers=[...systemRows,...regRows];

  const roleLabel=r=>({creator:'Создатель',boss:'Начальник',admin:'Администратор',manager:'Менеджер',accountant:'Бухгалтер',warehouse:'Склад',customer:'Покупатель',hacker:'Аудит системы'})[r]||r;
  const roleCss=r=>`rt-${r}`;

  document.getElementById('admin-users-tbody').innerHTML=allUsers.map(u=>{
    const lastLogin=logs.find(l=>l.user===u.login&&l.action==='login')?.ts;
    const orderCnt=orders.filter(o=>o.contact?.login===u.login).length;
    const p=profiles[u.login];
    const onecBadge=p?.counterpartyId
      ?`<div style="font-size:11px;margin-top:3px;color:var(--green)">
          🔗 1С: ${p.counterpartyId}${p.orgName?' · '+p.orgName:''}
        </div>`
      :`<div style="font-size:11px;margin-top:3px;color:var(--text3)">1С не привязан</div>`;

    return`<tr>
      <td>
        <div style="font-weight:600">${u.name}</div>
        <div style="font-size:11px;font-family:var(--font-mono);color:var(--text3)">${u.login}</div>
        ${u.phone?`<div style="font-size:11px;color:var(--text3)">${u.phone}</div>`:''}
        ${u.system?'<span style="font-size:10px;background:var(--bg3);border:1px solid var(--line2);border-radius:3px;padding:1px 6px;color:var(--text3)">системный</span>':''}
      </td>
      <td>
        <span class="role-tag ${roleCss(u.role)}">${roleLabel(u.role)}</span>
      </td>
      <td style="font-size:12px;color:var(--text3)">${lastLogin?fmtDate(lastLogin,true):'Не входил'}</td>
      <td style="text-align:center;font-weight:600">${orderCnt}</td>
      <td>
        ${onecBadge}
      </td>
      <td>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          <button class="admin-btn admin-btn-outline" onclick="openOnecModal('${u.login}')">
            🔗 1С профиль
          </button>
          ${!u.system?`<select class="status-select" onchange="changeUserRole('${u.login}',this.value)">
            <option value="customer"${u.role==='customer'?' selected':''}>Покупатель</option>
            <option value="manager"${u.role==='manager'?' selected':''}>Менеджер</option>
            <option value="accountant"${u.role==='accountant'?' selected':''}>Бухгалтер</option>
            <option value="warehouse"${u.role==='warehouse'?' selected':''}>Склад</option>
            <option value="boss"${u.role==='boss'?' selected':''}>Начальник</option>
            <option value="hacker"${u.role==='hacker'?' selected':''}>Аудит системы</option>
          </select>`:''}
          ${!u.system?`<button class="admin-btn admin-btn-outline" style="color:var(--accent)" onclick="deleteRegUser('${u.login}')">✕</button>`:''}
        </div>
      </td>
    </tr>`;
  }).join('');

  const isBoss=(state.role==='boss'||state.role==='admin');
  const extraEl=document.getElementById('admin-users-extra');
  if(extraEl){
    extraEl.innerHTML=isBoss?(renderBossAddForm()+renderTgConfig()):'';
  }
}

function deleteRegUser(login){
  if(!confirm(`Удалить пользователя ${login}?`)) return;
  const users=getUsers().filter(u=>u.login!==login);
  saveUsers(users);
  showToast(`Пользователь ${login} удалён`,'red');
  renderAdminUsers();
}

function changeUserRole(login,newRole){
  const users=getUsers();
  const u=users.find(x=>x.login===login);
  if(!u) return;
  u.role=newRole;
  saveUsers(users);
  logActivity({user:state.user?.login||'admin',role:'admin',action:'role_change',
    details:`${login} → ${newRole}`});
  showToast(`Роль ${login} изменена на ${newRole}`,'amber');
  renderAdminUsers();
}

function fmtDate(iso,withTime=false){
  if(!iso) return '—';
  const d=new Date(iso);
  const date=d.toLocaleDateString('ru-RU');
  if(!withTime) return date;
  return date+' '+d.toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'});
}
function delivLabel(d){
  if(!d) return '—';
  if(d==='pickup') return 'Самовывоз';
  if(d==='cdek_pvz') return 'СДЭК ПВЗ';
  if(d==='cdek_courier') return 'СДЭК Курьер';
  return d;
}

function placeOrder(){
  const name=document.getElementById('co-name').value.trim();
  const lastname=document.getElementById('co-lastname').value.trim();
  const phone=document.getElementById('co-phone').value.trim();
  const email=document.getElementById('co-email').value.trim();
  
  if(!name||name.length<2||!/^[А-ЯЁа-яёA-Za-z\-\s]+$/.test(name)){
    markFieldError('co-name','Введите настоящее имя (только буквы, мин. 2 символа)');
    showToast('Проверьте имя','red');return;
  }
  
  const phoneClean=phone.replace(/[\s\-\(\)]/g,'');
  if(!/^(\+7|7|8)[0-9]{10}$/.test(phoneClean)||/^(\+7|7|8)(1234567|0000000|1111111|9999999)/.test(phoneClean)){
    markFieldError('co-phone','Введите настоящий номер телефона');
    showToast('Проверьте телефон','red');return;
  }
  
  if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)){
    markFieldError('co-email','Неверный формат email');
    showToast('Проверьте email','red');return;
  }
  clearFieldErrors();

  if(coClientType==='ip'){
    const inn=(document.getElementById('co-inn')?.value||'').trim();
    if(!inn){showToast('Введите ИНН для ИП/юрлица','red');return;}
  }

  showToast('Отправляем заказ...','amber');
  setTimeout(()=>{
    const orderNum='ЗКл-00'+Math.floor(1000+Math.random()*9000);
    const subtotal=getCartSubtotal();
    let delivCost=0;
    if(state.delivery==='cdek_pvz') delivCost=state.selectedPvz?.cost||299;
    if(state.delivery==='cdek_courier') delivCost=499;
    const total=subtotal+delivCost;

    const delivery=state.delivery||'pickup';
    const hasInStock=state.cart.some(i=>i.source==='1c'||i.inStock);
    let prepayAmt=0;
    let prepayNote='';
    let reserveDays=0;

    if(delivery==='pickup'){
      if(coClientType==='ip'){
        
        prepayAmt=0;
        prepayNote='ИП — предоплата не требуется';
        reserveDays=7;
      } else if(hasInStock){
        
        prepayAmt=0;
        prepayNote='Товар в наличии — предоплата не требуется';
        reserveDays=7;
      } else {
        
        prepayAmt=Math.ceil(total*0.2);
        prepayNote='Предоплата 20% — самовывоз';
        reserveDays=7;
      }
    } else {
      
      prepayAmt=total;
      prepayNote='Полная оплата — доставка СДЭК';
      reserveDays=0;
    }

    const inn=document.getElementById('co-inn')?.value.trim()||null;
    const sbpReceipt=sbpReceiptBase64||null;
    const org=document.getElementById('co-org')?.value.trim()||null;

    const order={
      id: orderNum,
      createdAt: new Date().toISOString(),
      status: 'pending',
      contact:{name:`${name} ${lastname}`.trim(), phone, email, login:state.user?.login||null},
      clientType: coClientType,
      inn, org,
      delivery: state.delivery,
      payMethod: coPayMethod,
      prepayAmt, prepayNote, reserveDays, sbpReceipt,
      items: state.cart.map(i=>({
        article:i.article, brand:i.brand, name:i.name, source:i.source,
        price_retail:i.price_retail, price_wholesale:i.price_wholesale||null,
        price_input:i.price_input||null, quantity:i.quantity,
        inStock:!!(i.source==='1c'||i.inStock),
      })),
      subtotal, deliveryCost:delivCost, total,
      comment: document.getElementById('co-comment').value.trim()||null,
      reserveUntil: reserveDays ? new Date(Date.now()+reserveDays*86400000).toISOString() : null,
    };

    saveOrder(order);
    logActivity({
      user: state.user?.login||email||'guest',
      role: state.user?.role||'customer',
      action:'order_create',
      details:`${orderNum} — ${state.cart.length} поз., ${total.toLocaleString('ru-RU')} ₽, ${prepayNote}`
    });

    const itemLines=order.items.map(i=>`  • ${i.brand} ${i.article} ×${i.quantity}${i.inStock?' ✅':''}`).join('\n');
    const payMethodLabel=coPayMethod==='sbp'?'СБП':'Банковская карта';
    notifyTelegram(
      `🛒 *Новый заказ* \`${orderNum}\`\n`+
      `👤 ${coClientType==='ip'?'💼 ИП':'🙋 Физлицо'}: ${order.contact.name}\n`+
      `📞 Тел: ${order.contact.phone}\n`+
      (inn?`🏛 ИНН: ${inn}\n`:'')+
      (org?`🏢 Орг: ${org}\n`:'')+
      `🚚 Доставка: ${delivLabel(state.delivery)}\n`+
      `💳 Оплата: ${payMethodLabel}\n`+
      `💰 Сумма: *${total.toLocaleString('ru-RU')} ₽*\n`+
      (prepayAmt&&prepayAmt<total?`💵 Предоплата: *${prepayAmt.toLocaleString('ru-RU')} ₽*\n`:
       prepayAmt===total?`💵 Полная оплата: *${prepayAmt.toLocaleString('ru-RU')} ₽*\n`:
       `💵 Предоплата: не требуется\n`)+
      (reserveDays?`⏰ Резерв: ${reserveDays} дней\n`:'')+
      `📦 Позиций: ${order.items.length}\n\n`+
      itemLines+`\n\n⏳ Ожидает подтверждения менеджера`
    );

    document.getElementById('success-order-num').textContent=orderNum;
    renderSuccessPayInfo(order);
    state.cart=[];
    updateCartCount();
    showPage('success');
  },1500);
}

let _spCurrentOrder = null;
let _spReceiptBase64 = null;

function renderSuccessPayInfo(order){
  _spCurrentOrder = order;
  const el=document.getElementById('success-pay-info');
  if(!el) return;
  const isNoPrepay = order.prepayAmt === 0;

  if(isNoPrepay){
    el.innerHTML=`<div style="background:var(--greenbg);border:1px solid rgba(34,197,94,.3);border-radius:12px;padding:16px;margin-bottom:16px">
      <div style="font-weight:700;color:var(--green);margin-bottom:4px">✅ Предоплата не требуется</div>
      <div style="font-size:13px;color:var(--text2)">${order.prepayNote}${order.reserveDays?' · резерв '+order.reserveDays+' дней':''}</div>
    </div>`;
    
    document.getElementById('sp-pay-btn-wrap').innerHTML=`
      <button onclick="spSkipPayment()" class="btn btn-primary btn-xl" style="width:100%">Готово →</button>`;
  } else {
    el.innerHTML=`<div style="background:var(--amberbg);border:1px solid rgba(245,158,11,.3);border-radius:12px;padding:16px;margin-bottom:16px">
      <div style="font-weight:700;color:var(--amber);font-size:18px;margin-bottom:4px">💳 К оплате: ${order.prepayAmt.toLocaleString('ru-RU')} ₽</div>
      <div style="font-size:13px;color:var(--text2)">${order.prepayNote}</div>
    </div>`;
    if(order.payMethod!=='sbp'){
      document.getElementById('sp-pay-btn-wrap').innerHTML=`
        <button onclick="spSkipPayment()" class="btn btn-primary btn-xl" style="width:100%">Готово →</button>
        <div style="font-size:13px;color:var(--text3);text-align:center;margin-top:10px">Оплата картой при получении или в нашем офисе</div>`;
    }
  }
}

function spGoToPayment(){
  const order = _spCurrentOrder;
  if(!order) return;

  document.getElementById('sp-content1').style.display='none';
  document.getElementById('sp-content2').style.display='block';
  document.getElementById('sp-step1').style.borderBottomColor='var(--green)';
  document.getElementById('sp-step1').style.color='var(--green)';
  document.getElementById('sp-step2').style.borderBottomColor='var(--accent)';
  document.getElementById('sp-step2').style.color='var(--accent)';

  document.getElementById('sp-pay-amount').textContent = order.prepayAmt.toLocaleString('ru-RU') + ' ₽';
  document.getElementById('sp-pay-note').textContent = order.prepayNote;
  document.getElementById('sp-order-id-hint').textContent = order.id;
  document.getElementById('sp-comment-hint').querySelector('strong').textContent = order.id;

  const phone = '79604641955';
  const amt = order.prepayAmt * 100;
  const qrData = encodeURIComponent('https://qr.nspk.ru/0/?phone=%2B'+phone+'&sum='+amt+'&purpose='+encodeURIComponent(order.id+' ДК ГАРАЖ'));
  document.getElementById('sp-qr-img').src = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&color=22-197-94&bgcolor=22-27-31&data='+qrData;
  window.scrollTo(0,0);
}

function spHandleReceipt(input){
  const file = input.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    _spReceiptBase64 = e.target.result;
    
    document.getElementById('sp-receipt-img').src = _spReceiptBase64;
    document.getElementById('sp-receipt-name').textContent = file.name;
    document.getElementById('sp-receipt-preview').style.display = 'block';
    
    document.getElementById('sp-upload-title').textContent = 'Скриншот загружен ✅';
    document.getElementById('sp-upload-label').style.background = 'var(--greenbg)';
    document.getElementById('sp-upload-label').style.border = '1px solid rgba(34,197,94,.4)';
    document.getElementById('sp-upload-label').querySelector('div > div:first-child').style.color = 'var(--green)';
    
    const btn = document.getElementById('sp-confirm-btn');
    btn.disabled = false;
    btn.style.background = 'var(--green)';
    btn.style.color = '#fff';
    btn.style.cursor = 'pointer';
  };
  reader.readAsDataURL(file);
}

function spRemoveReceipt(){
  _spReceiptBase64 = null;
  document.getElementById('sp-receipt-preview').style.display = 'none';
  document.getElementById('sp-receipt-file').value = '';
  document.getElementById('sp-upload-title').textContent = 'Загрузить скриншот оплаты';
  document.getElementById('sp-upload-label').style.background = 'var(--accent)';
  document.getElementById('sp-upload-label').style.border = 'none';
  const btn = document.getElementById('sp-confirm-btn');
  btn.disabled = true;
  btn.style.background = 'var(--line2)';
  btn.style.color = 'var(--text3)';
  btn.style.cursor = 'not-allowed';
}

async function spConfirmPayment(){
  if(!_spReceiptBase64 || !_spCurrentOrder) return;
  const btn = document.getElementById('sp-confirm-btn');
  btn.disabled = true;
  btn.textContent = '⏳ Отправляем...';

  try {
    await notifyOwnerWithPhoto(
      '💳 *Скриншот оплаты* для заказа `'+_spCurrentOrder.id+'`\n'+
      '👤 '+_spCurrentOrder.contact?.name+' · '+_spCurrentOrder.contact?.phone+'\n'+
      '💰 '+_spCurrentOrder.prepayAmt?.toLocaleString('ru-RU')+' ₽',
      _spReceiptBase64
    );
  } catch(e){}

  spGoToConfirmed();
}

function spSkipPayment(){
  spGoToConfirmed(true);
}

function spGoToConfirmed(skipped){
  document.getElementById('sp-content1').style.display='none';
  document.getElementById('sp-content2').style.display='none';
  document.getElementById('sp-content3').style.display='block';
  ['sp-step1','sp-step2','sp-step3'].forEach((id,i)=>{
    document.getElementById(id).style.borderBottomColor = i<2||!skipped ? 'var(--green)':'var(--accent)';
    document.getElementById(id).style.color = i<2||!skipped ? 'var(--green)':'var(--accent)';
  });
  const orderId = _spCurrentOrder?.id || document.getElementById('success-order-num').textContent;
  document.getElementById('sp-final-order').textContent = orderId;
  if(skipped){
    document.getElementById('sp-final-icon').textContent = '📋';
    document.getElementById('sp-final-title').textContent = 'Заказ принят!';
    document.getElementById('sp-final-sub').textContent = 'Менеджер свяжется с вами для уточнения оплаты';
    document.getElementById('sp-step3').style.borderBottomColor = 'var(--accent)';
    document.getElementById('sp-step3').style.color = 'var(--accent)';
  } else {
    document.getElementById('sp-status-badge') && (document.getElementById('sp-status-badge').textContent = '✅ Оплачен');
  }
  window.scrollTo(0,0);
}

const TG_TOKEN='8854969760:AAH9m9IDcGD47QxjuxK_NmuRqKKCiOeqIGg';
const OWNER_CHAT_ID=910208528; 

function getTgConfig(){
  try{return JSON.parse(localStorage.getItem('dp_tg_config')||'{}');}catch{return{};}
}
function saveTgConfig(cfg){
  localStorage.setItem('dp_tg_config',JSON.stringify(cfg));
}
async function notifyTelegram(text,chatId){
  const cfg=getTgConfig();
  const id=chatId||cfg.chatId||OWNER_CHAT_ID;
  if(!id) return;
  try{
    await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`,{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({chat_id:id,text,parse_mode:'Markdown'})
    });
  }catch(e){}
}

async function notifyOwnerWithPhoto(caption, base64img){
  try{
    
    const res=await fetch(base64img);
    const blob=await res.blob();
    const fd=new FormData();
    fd.append('chat_id', OWNER_CHAT_ID);
    fd.append('caption', caption);
    fd.append('parse_mode','Markdown');
    fd.append('photo', blob, 'receipt.jpg');
    await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendPhoto`,{method:'POST',body:fd});
  }catch(e){
    
    await notifyTelegram(caption, OWNER_CHAT_ID);
  }
}

async function notifyOwnerNewOrder(order, receiptBase64){
  const items=order.items||[];
  const itemsList=items.slice(0,5).map(i=>`  • ${i.brand||''} ${i.article} × ${i.quantity} = ${((i.priceRetail||0)*i.quantity).toLocaleString('ru-RU')} ₽`).join('\n');
  const more=items.length>5?`\n  ...ещё ${items.length-5} позиций`:'';
  const delivLabel={pickup:'🏪 Самовывоз',cdek_pvz:'📦 СДЭК ПВЗ',cdek_courier:'🚚 СДЭК курьер'}[order.delivery]||order.delivery;
  const payLabel=order.payMethod==='sbp'?'💳 СБП':'💵 Карта/наличные';

  const text=
`🆕 *Новый заказ ${order.id}*

👤 *Покупатель:* ${order.contact?.name||'—'} ${order.contact?.lastname||''}
📞 ${order.contact?.phone||'—'}
${order.contact?.email?'✉️ '+order.contact.email:''}

🛒 *Товары:*
${itemsList}${more}

💰 *Итого:* ${order.total?.toLocaleString('ru-RU')||'—'} ₽
${order.prepayAmt>0?`💳 К оплате сейчас: *${order.prepayAmt?.toLocaleString('ru-RU')} ₽*`:'✅ Предоплата не требуется'}

${delivLabel}
${payLabel}
${order.comment?'💬 '+order.comment:''}`;

  if(receiptBase64 && order.payMethod==='sbp'){
    await notifyOwnerWithPhoto(text+'\n\n📎 *Скриншот оплаты прикреплён*', receiptBase64);
  } else {
    await notifyTelegram(text, OWNER_CHAT_ID);
  }
}
async function fetchTgChatId(){
  try{
    const r=await fetch(`https://api.telegram.org/bot${TG_TOKEN}/getUpdates?limit=1&offset=-1`);
    const data=await r.json();
    const msg=data.result?.[0]?.message||data.result?.[0]?.edited_message;
    if(msg){
      const id=msg.chat.id;
      const name=msg.chat.first_name||msg.chat.username||'';
      const cfg=getTgConfig();
      cfg.chatId=id;
      cfg.chatName=name;
      saveTgConfig(cfg);
      return {id,name};
    }
  }catch(e){}
  return null;
}

let chatOpen=false;
const BOT_GREET='Здравствуйте! Меня зовут ГАРАЖ-Бот 🤖\nЧем могу помочь? Напишите ваш вопрос, и менеджер ответит в ближайшее время.';

function toggleChat(){
  chatOpen=!chatOpen;
  document.getElementById('chat-window').classList.toggle('open',chatOpen);
  const badge=document.querySelector('.chat-badge');
  if(chatOpen&&badge) badge.style.display='none';
  if(chatOpen){
    renderChatMessages();
    setTimeout(()=>document.getElementById('chat-input').focus(),200);
  }
}
function getChatMsgs(){
  try{return JSON.parse(localStorage.getItem('dp_chat')||'[]');}catch{return[];}
}
function saveChatMsgs(msgs){localStorage.setItem('dp_chat',JSON.stringify(msgs));}
function renderChatMessages(){
  const msgs=getChatMsgs();
  const el=document.getElementById('chat-messages');
  if(!el) return;
  if(!msgs.length){
    const initMsgs=[{role:'bot',text:BOT_GREET,ts:new Date().toISOString()}];
    saveChatMsgs(initMsgs);
    renderChatMessages();return;
  }
  el.innerHTML=msgs.map(m=>`
    <div class="chat-msg ${m.role}">
      <div>${m.text.replace(/\n/g,'<br>')}</div>
      <div class="chat-msg-time">${new Date(m.ts).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})}</div>
    </div>`).join('');
  el.scrollTop=el.scrollHeight;
}
async function sendChatMsg(){
  const input=document.getElementById('chat-input');
  const text=input.value.trim();
  if(!text) return;
  input.value='';
  const userName=state.user?state.user.name:'Гость';
  const msgs=getChatMsgs();
  msgs.push({role:'user',text,ts:new Date().toISOString(),author:userName});
  saveChatMsgs(msgs);
  
  const key=getCustomerSessionKey?getCustomerSessionKey():('guest_'+Date.now());
  const sessions=getChatSessions?getChatSessions():{};
  sessions[key]=msgs.map(m=>({...m,author:m.author||(m.role==='user'?userName:'Бот')}));
  if(saveChatSessions) saveChatSessions(sessions);
  renderChatMessages();
  
  const phone=document.getElementById('co-phone')?.value||'';
  const tgText=`💬 *Сообщение с сайта*\nОт: ${userName}${phone?' · '+phone:''}\n\n${text}`;
  await notifyTelegram(tgText);
  
  setTimeout(()=>{
    const msgs2=getChatMsgs();
    msgs2.push({role:'bot',text:'Ваше сообщение получено! Менеджер ответит в рабочее время (ежедневно 8:00–20:00 без выходных).',ts:new Date().toISOString()});
    saveChatMsgs(msgs2);
    
    const sess2=getChatSessions?getChatSessions():{};
    if(sess2[key]){ sess2[key].push({role:'bot',text:msgs2[msgs2.length-1].text,ts:msgs2[msgs2.length-1].ts,author:'Бот'}); }
    if(saveChatSessions) saveChatSessions(sess2);
    renderChatMessages();
  },1200);
}

let activeSupportSession = null;

function getChatSessions(){
  try{ return JSON.parse(localStorage.getItem('dp_chat_sessions')||'{}'); }catch{ return {}; }
}
function saveChatSessions(s){ localStorage.setItem('dp_chat_sessions', JSON.stringify(s)); }

function getCustomerSessionKey(){
  if(state.user && state.user.login) return state.user.login;
  let k = sessionStorage.getItem('dp_guest_chat_key');
  if(!k){ k = 'guest_'+Date.now(); sessionStorage.setItem('dp_guest_chat_key',k); }
  return k;
}

function mirrorMsgToSessions(msgs){
  const key = getCustomerSessionKey();
  const sessions = getChatSessions();
  sessions[key] = msgs.map(m => ({
    ...m,
    author: m.role === 'user' ? (state.user?.name || key) : (m.role === 'manager' ? (m.author||'Менеджер') : 'Бот')
  }));
  saveChatSessions(sessions);
}

function renderSupportChat(){
  const sessions = getChatSessions();
  
  const legacyMsgs = getChatMsgs();
  if(legacyMsgs.some(m=>m.role==='user') && !sessions['__legacy__']){
    sessions['__legacy__'] = legacyMsgs;
    saveChatSessions(sessions);
  }
  const convList = document.getElementById('support-conv-list');
  if(!convList) return;
  const allKeys = Object.keys(sessions);
  if(!allKeys.length){
    convList.innerHTML = '<div style="padding:16px;font-size:13px;color:var(--text3);text-align:center">Сообщений пока нет</div>';
    return;
  }
  convList.innerHTML = allKeys.map(key => {
    const msgs = sessions[key]||[];
    const last = msgs[msgs.length-1];
    const unread = msgs.filter(m=>m.role==='user'&&!m.readByManager).length;
    const displayName = key==='__legacy__'?'Гость (онлайн-чат)':key;
    const isActive = key===activeSupportSession;
    return `<div onclick="openSupportSession('${escHtml(key)}')" style="padding:10px 12px;border-radius:var(--r);cursor:pointer;background:${isActive?'var(--bg3)':'transparent'};border:1px solid ${isActive?'var(--accent)':'transparent'};margin-bottom:4px;transition:.15s">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:3px">
        <div style="font-size:13px;font-weight:600;color:var(--text)">${escHtml(displayName)}</div>
        ${unread?`<span style="background:var(--accent);color:#fff;font-size:10px;font-weight:700;border-radius:10px;padding:1px 7px">${unread}</span>`:''}
      </div>
      <div style="font-size:12px;color:var(--text3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${last?escHtml(last.text.slice(0,55)):'—'}</div>
    </div>`;
  }).join('');
}

function openSupportSession(key){
  activeSupportSession = key;
  const sessions = getChatSessions();
  const msgs = sessions[key]||[];
  msgs.forEach(m=>{ if(m.role==='user') m.readByManager=true; });
  sessions[key]=msgs; saveChatSessions(sessions);
  const nameEl=document.getElementById('support-chat-client-name');
  const infoEl=document.getElementById('support-chat-client-info');
  const msgEl =document.getElementById('support-chat-messages');
  if(!msgEl) return;
  const displayName=key==='__legacy__'?'Гость (онлайн-чат)':key;
  if(nameEl) nameEl.textContent=displayName;
  if(infoEl) infoEl.textContent=`${msgs.length} сообщений`;
  msgEl.innerHTML = msgs.length ? msgs.map(m=>{
    const isUser=m.role==='user', isMgr=m.role==='manager';
    const bg=isUser?'var(--bg3)':isMgr?'rgba(232,65,26,.15)':'var(--bg4)';
    const align=isUser?'flex-start':'flex-end';
    const label=isUser?escHtml(m.author||key):isMgr?`👨‍💼 ${escHtml(m.author||'Менеджер')}`:'🤖 Бот';
    return `<div style="display:flex;flex-direction:column;align-items:${align};max-width:85%">
      <div style="font-size:11px;color:var(--text3);margin-bottom:2px">${label}</div>
      <div style="background:${bg};border:1px solid var(--line2);border-radius:var(--r2);padding:10px 14px;font-size:14px;color:var(--text)">${escHtml(m.text).replace(/\n/g,'<br>')}</div>
      <div style="font-size:11px;color:var(--text3);margin-top:3px">${new Date(m.ts).toLocaleString('ru-RU',{hour:'2-digit',minute:'2-digit',day:'numeric',month:'short'})}</div>
    </div>`;
  }).join('') : '<div style="text-align:center;color:var(--text3);font-size:13px;padding:24px">Нет сообщений</div>';
  msgEl.scrollTop=msgEl.scrollHeight;
  renderSupportChat();
  activeSupportSession=key;
}

async function adminSendChatReply(){
  const input=document.getElementById('support-chat-input');
  if(!input||!activeSupportSession) return;
  const text=input.value.trim(); if(!text) return;
  input.value='';
  const sessions=getChatSessions();
  if(!sessions[activeSupportSession]) sessions[activeSupportSession]=[];
  const msg={role:'manager',text,ts:new Date().toISOString(),author:state.user?.name||'Менеджер'};
  sessions[activeSupportSession].push(msg);
  saveChatSessions(sessions);
  
  if(activeSupportSession==='__legacy__'){
    const chatMsgs=getChatMsgs();
    chatMsgs.push({role:'bot',text:`👨‍💼 ${state.user?.name||'Менеджер'}: ${text}`,ts:msg.ts});
    saveChatMsgs(chatMsgs);
  }
  await notifyTelegram(`📩 *Ответ менеджера* ${state.user?.name||''}\nДиалог: ${activeSupportSession}\n\n${text}`);
  openSupportSession(activeSupportSession);
}

const VIN_DB={
  'XTA': {make:'ВАЗ (Lada)',    parts:['Тормозные колодки','Фильтр масляный','Свечи зажигания','Ремень ГРМ','Стойки амортизатора']},
  'JMB': {make:'Mitsubishi',    parts:['Масляный фильтр','Воздушный фильтр','Тормозные диски','Ролик натяжной','Помпа водяная']},
  'WBA': {make:'BMW',           parts:['Фильтр масляный','Свечи зажигания','Тормозные колодки','ШРУС','Катушка зажигания']},
  'WDD': {make:'Mercedes-Benz', parts:['Фильтр масляный','Тормозные колодки','Топливный фильтр','Ролики ремня','Датчик ABS']},
  'Z8T': {make:'Toyota',        parts:['Фильтр масляный','Свечи зажигания','Тормозные колодки','Ремень ГРМ','Термостат']},
  'XWE': {make:'Chevrolet',     parts:['Фильтр масляный','Тормозные колодки','Стойки стабилизатора','Помпа','Ролик натяжной']},
  'Y6D': {make:'Hyundai',       parts:['Фильтр масляный','Свечи зажигания','Тормозные диски','Ремень ГРМ','Термостат']},
  'KNA': {make:'Kia',           parts:['Масляный фильтр','Воздушный фильтр','Тормозные колодки','Стойки амортизатора','Помпа']},
  'SUF': {make:'Ford',          parts:['Фильтр масляный','Тормозные колодки','Катушки зажигания','Ремень ГРМ','Датчик кислорода']},
};
const VIN_PARTS_ARTICLES={
  'Фильтр масляный':        {article:'OF-001',    brand:'FILTRON'},
  'Тормозные колодки':      {article:'BP-2024',   brand:'TRW'},
  'Свечи зажигания':        {article:'BKR6E',     brand:'NGK'},
  'Ремень ГРМ':             {article:'TB-0125',   brand:'GATES'},
  'Стойки амортизатора':    {article:'SH-4433',   brand:'SACHS'},
  'Воздушный фильтр':       {article:'AF-331',    brand:'MANN'},
  'Тормозные диски':        {article:'DF-1048',   brand:'BREMBO'},
  'Ролик натяжной':         {article:'RT-6620',   brand:'SKF'},
  'Помпа водяная':          {article:'WP-0889',   brand:'AIRTEX'},
  'Топливный фильтр':       {article:'FF-5485',   brand:'MANN'},
  'ШРУС':                   {article:'CV-5511',   brand:'GKN'},
  'Катушка зажигания':      {article:'IC-0245',   brand:'BOSCH'},
  'Термостат':              {article:'TS-0120',   brand:'BEHR'},
  'Помпа':                  {article:'WP-0889',   brand:'AIRTEX'},
  'Стойки стабилизатора':   {article:'SL-2240',   brand:'LEMFORDER'},
  'Датчик ABS':             {article:'ABS-0441',  brand:'BOSCH'},
  'Ролики ремня':           {article:'RT-6620',   brand:'SKF'},
  'Датчик кислорода':       {article:'LSF-4.2',   brand:'BOSCH'},
  'Катушки зажигания':      {article:'IC-0245',   brand:'BOSCH'},
  'Масляный фильтр':        {article:'OF-001',    brand:'FILTRON'},
};

function searchByVin(vin){
  vin=vin.trim().toUpperCase();
  const area=document.getElementById('vin-result-area');
  if(!vin||vin.length<6){
    showToast('Введите VIN (минимум 6 символов)','red');return;
  }
  const prefix=vin.substring(0,3);
  const car=VIN_DB[prefix]||{make:'Неизвестный автомобиль',parts:['Фильтр масляный','Тормозные колодки','Свечи зажигания']};
  area.innerHTML=`
    <div class="vin-result-chip">
      🚗 <strong>${car.make}</strong> · VIN: ${vin}
    </div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">
      <span style="font-size:12px;color:var(--text3)">Выберите запчасть:</span>
      ${car.parts.map(p=>{
        const art=VIN_PARTS_ARTICLES[p]||{article:p.substring(0,4).toUpperCase()+'-000',brand:'ORIGINAL'};
        return`<button class="hint-chip" onclick="triggerSearch('${art.article}')" title="${p} · ${art.brand}">${p}</button>`;
      }).join('')}
    </div>`;
}

function renderAboutManagers(){
  const el=document.getElementById('about-managers-list');
  if(!el) return;
  const CONTACTS=[
    {name:'Общий',        desc:'Запчасти грузовые иномарки, прицепы', phone:'+7 (928) 607-45-47'},
    {name:'',             desc:'Второй номер', phone:'+7 (960) 451-31-69'},
    {name:'',             desc:'Третий номер', phone:'+7 (961) 404-99-00'},
    {name:'Шинный центр',desc:'Грузовые · масла · АКБ · РВД', phone:'+7 (961) 414-99-00'},
    {name:'Шинный сервис',desc:'Грузовые авто', phone:'+7 (966) 206-24-53'},
    {name:'Шинный центр',desc:'Легковые авто', phone:'+7 (961) 404-99-30'},
    {name:'Запчасти',    desc:'Легковые авто', phone:'+7 (961) 320-06-48'},
    {name:'Запчасти',    desc:'Китайские грузовики', phone:'+7 (966) 206-24-54'},
    {name:'Отопители',   desc:'Ремонт самарских отопителей', phone:'+7 (928) 957-38-61'},
    {name:'Рынок Америка',desc:'Грузовые иномарки · масла', phone:'+7 (928) 159-97-80'},
    {name:'Бухгалтерия', desc:'ipslukinav@bk.ru', phone:'+7 (961) 424-99-04'},
  ];
  el.innerHTML=CONTACTS.map(c=>`
    <div style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid var(--line)">
      <div>
        ${c.name?`<div style="font-size:13px;font-weight:600;color:var(--text)">${c.name}</div>`:''}
        <div style="font-size:11px;color:var(--text3)">${c.desc}</div>
      </div>
      <a href="tel:${c.phone.replace(/[^+0-9]/g,'')}" style="font-family:var(--font-mono);font-size:13px;color:var(--green);font-weight:600;white-space:nowrap">${c.phone}</a>
    </div>`).join('');
}

function renderBossAddForm(){
  return`
    <div class="admin-table-wrap" style="margin-top:20px">
      <div class="admin-table-header">
        <div class="admin-table-title">Добавить сотрудника</div>
      </div>
      <div style="padding:16px;display:grid;grid-template-columns:1fr 1fr 1fr 1fr auto;gap:10px;align-items:flex-end">
        <div>
          <div style="font-size:11px;color:var(--text3);margin-bottom:4px;text-transform:uppercase;letter-spacing:.06em">Логин</div>
          <input class="admin-filter-input" id="new-acc-login" placeholder="ivan_manager" style="max-width:none;width:100%">
        </div>
        <div>
          <div style="font-size:11px;color:var(--text3);margin-bottom:4px;text-transform:uppercase;letter-spacing:.06em">Пароль</div>
          <input class="admin-filter-input" id="new-acc-pass" placeholder="Минимум 6 символов" style="max-width:none;width:100%">
        </div>
        <div>
          <div style="font-size:11px;color:var(--text3);margin-bottom:4px;text-transform:uppercase;letter-spacing:.06em">Имя</div>
          <input class="admin-filter-input" id="new-acc-name" placeholder="Иван Иванов" style="max-width:none;width:100%">
        </div>
        <div>
          <div style="font-size:11px;color:var(--text3);margin-bottom:4px;text-transform:uppercase;letter-spacing:.06em">Роль</div>
          <select class="admin-filter-select" id="new-acc-role" style="width:100%;height:34px">
            <option value="manager">Менеджер</option>
            <option value="accountant">Бухгалтерия</option>
            <option value="warehouse">Склад</option>
          </select>
        </div>
        <button class="admin-btn admin-btn-primary" onclick="bossAddAccount()">+ Добавить</button>
      </div>
    </div>`;
}
function bossAddAccount(){
  const login=document.getElementById('new-acc-login')?.value.trim().toLowerCase();
  const pass=document.getElementById('new-acc-pass')?.value;
  const name=document.getElementById('new-acc-name')?.value.trim();
  const role=document.getElementById('new-acc-role')?.value;
  if(!login||!pass||!name){showToast('Заполните все поля','red');return;}
  if(pass.length<6){showToast('Пароль — минимум 6 символов','red');return;}
  if(SYSTEM_ACCOUNTS[login]){showToast('Логин уже занят','red');return;}
  const users=getUsers();
  if(users.find(u=>u.login===login)){showToast('Логин уже занят','red');return;}
  users.push({login,password:pass,name,role,phone:'',createdAt:new Date().toISOString()});
  saveUsers(users);
  logActivity({user:state.user?.login,role:'boss',action:'add_account',details:`Добавлен ${role}: ${login} (${name})`});
  showToast(`Аккаунт ${login} создан`,'green');
  renderAdminUsers();
}

function renderTgConfig(){
  const cfg=getTgConfig();
  return`
    <div class="admin-table-wrap" style="margin-top:20px">
      <div class="admin-table-header">
        <div class="admin-table-title">⚙️ Telegram уведомления</div>
      </div>
      <div style="padding:16px">
        <p style="font-size:13px;color:var(--text2);margin-bottom:12px;line-height:1.6">
          Чтобы получать уведомления о заказах:<br>
          1. Откройте Telegram и напишите боту <strong style="color:var(--accent)">/start</strong><br>
          2. Нажмите «Получить мой Chat ID» ниже
        </p>
        ${cfg.chatId?`
        <div style="background:var(--bg3);border:1px solid rgba(34,197,94,.3);border-radius:var(--r);padding:12px 16px;display:flex;align-items:center;gap:12px;margin-bottom:12px;flex-wrap:wrap">
          <span style="font-size:20px">✅</span>
          <div style="flex:1;min-width:0">
            <div style="font-size:13px;font-weight:600;color:var(--green)">Telegram подключён</div>
            <div style="font-size:12px;color:var(--text3);margin-top:2px;font-family:var(--font-mono)">${cfg.chatName?escHtml(cfg.chatName)+' · ':''} Chat ID: ${cfg.chatId}</div>
          </div>
        </div>`:''}
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
          <button class="admin-btn admin-btn-primary" onclick="getTgId()">📲 ${cfg.chatId?'Переподключить':'Получить мой Chat ID'}</button>
          ${cfg.chatId?`
            <button class="admin-btn admin-btn-outline" onclick="testTgNotify()">📨 Тест</button>
            <button class="admin-btn" style="background:transparent;border:1px solid var(--accent);color:var(--accent)" onclick="unlinkTgChatId()">🔗 Отвязать ID</button>`
            :'<span style="font-size:13px;color:var(--text3)">Не настроен</span>'}
        </div>
        ${cfg.chatId?'':'<p style="font-size:12px;color:var(--text3);margin-top:8px">После нажатия /start у бота — нажмите «Получить мой Chat ID»</p>'}
      </div>
    </div>`;
}
async function getTgId(){
  showToast('Получаем Chat ID...','amber');
  const res=await fetchTgChatId();
  if(res){showToast(`Chat ID получен: ${res.id} (${res.name})`,'green');renderAdminUsers();}
  else showToast('Сначала напишите /start боту в Telegram','red');
}
function unlinkTgChatId(){
  if(!confirm('Отвязать Telegram Chat ID? Уведомления перестанут приходить.')) return;
  const cfg=getTgConfig();
  delete cfg.chatId;
  delete cfg.chatName;
  saveTgConfig(cfg);
  showToast('Telegram Chat ID отвязан','amber');
  renderAdminUsers();
}
async function testTgNotify(){
  await notifyTelegram('✅ *Тест уведомлений* — ДК ГАРАЖ\nСистема уведомлений работает корректно!');
  showToast('Тестовое сообщение отправлено','green');
}

let toastTimer;
function showToast(msg,type='green'){
  const t=document.getElementById('toast');
  const dot=document.getElementById('toast-dot');
  document.getElementById('toast-msg').textContent=msg;
  dot.className='toast-dot '+type;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>t.classList.remove('show'),2800);
}

function getSales(){try{return JSON.parse(localStorage.getItem('dp_sales')||'[]');}catch{return[];}}
function saveSales(a){localStorage.setItem('dp_sales',JSON.stringify(a));}

let _saleItems=[];

function openSaleModal(){
  _saleItems=[{article:'',brand:'',name:'',price:'',quantity:1}];
  document.getElementById('sale-client').value='';
  document.getElementById('sale-error').style.display='none';
  document.getElementById('sale-modal-mgr-name').textContent='Менеджер: '+(state.user?.name||'—');
  renderSaleItems();
  document.getElementById('sale-modal').classList.add('open');
}
function closeSaleModal(){document.getElementById('sale-modal').classList.remove('open');}

function addSaleItem(){
  _saleItems.push({article:'',brand:'',name:'',price:'',quantity:1});
  renderSaleItems();
}
function removeSaleItem(i){
  _saleItems.splice(i,1);
  if(!_saleItems.length) _saleItems=[{article:'',brand:'',name:'',price:'',quantity:1}];
  renderSaleItems();
}
function updateSaleItem(i,field,val){
  _saleItems[i][field]=field==='quantity'?Math.max(1,parseInt(val)||1):val;
  updateSaleTotal();
}
function updateSaleTotal(){
  const total=_saleItems.reduce((s,it)=>{
    const p=parseFloat(it.price)||0;
    const q=parseInt(it.quantity)||1;
    return s+p*q;
  },0);
  document.getElementById('sale-total-display').textContent=total.toLocaleString('ru-RU')+' ₽';
}
function renderSaleItems(){
  const el=document.getElementById('sale-items-list');
  el.innerHTML=_saleItems.map((it,i)=>`
    <div class="sale-item-row">
      <input class="sale-item-input" placeholder="Артикул" value="${escHtml(it.article)}"
        oninput="updateSaleItem(${i},'article',this.value)">
      <input class="sale-item-input" placeholder="Бренд / Наименование" value="${escHtml(it.brand||it.name)}"
        oninput="updateSaleItem(${i},'brand',this.value)">
      <input class="sale-item-input" type="number" placeholder="Кол-во" value="${it.quantity}" min="1"
        oninput="updateSaleItem(${i},'quantity',this.value)">
      <input class="sale-item-input" type="number" placeholder="Цена ₽" value="${it.price}"
        oninput="updateSaleItem(${i},'price',this.value)">
      <button class="sale-item-del" onclick="removeSaleItem(${i})">×</button>
    </div>`).join('');
  updateSaleTotal();
}

function doSale(){
  const errEl=document.getElementById('sale-error');
  errEl.style.display='none';
  const items=_saleItems.filter(it=>it.article&&(parseFloat(it.price)>0));
  if(!items.length){errEl.style.display='block';errEl.textContent='Добавьте хотя бы одну позицию с артикулом и ценой';return;}

  const total=items.reduce((s,it)=>(parseFloat(it.price)||0)*(parseInt(it.quantity)||1)+s,0);
  const saleId='ПРД-'+Date.now().toString().slice(-6);
  const sale={
    id: saleId,
    managerId:  state.user?.login,
    managerName:state.user?.name||state.user?.login,
    createdAt:  new Date().toISOString(),
    client:     document.getElementById('sale-client').value.trim()||null,
    items:      items.map(it=>({
      article:  it.article.trim(),
      brand:    it.brand.trim(),
      name:     it.name||it.brand,
      price:    parseFloat(it.price)||0,
      quantity: parseInt(it.quantity)||1,
    })),
    total,
    syncedTo1c: false,
    syncedToQwep: false,
  };

  const sales=getSales();
  sales.unshift(sale);
  saveSales(sales);

  const lines=sale.items.map(it=>`  • ${it.article} ${it.brand} ×${it.quantity} = ${(it.price*it.quantity).toLocaleString('ru-RU')} ₽`).join('\n');
  notifyTelegram(
    `💳 *Продажа* \`${saleId}\`\n`+
    `👤 Менеджер: ${sale.managerName}\n`+
    (sale.client?`🧑 Клиент: ${sale.client}\n`:'')+
    `💰 Итого: *${total.toLocaleString('ru-RU')} ₽*\n\n`+lines
  );

  logActivity({user:state.user?.login,role:'manager',action:'sale',
    details:`${saleId} — ${items.length} поз., ${total.toLocaleString('ru-RU')} ₽`});

  closeSaleModal();
  showToast(`Продажа ${saleId} оформлена — ${total.toLocaleString('ru-RU')} ₽`,'green');

  autoSync1c(sale);

  const activeTab=document.querySelector('.admin-nav-item.active')?.dataset?.tab;
  if(activeTab==='mgr_sales') renderMgrSales();
  else if(activeTab==='mgr_home') renderMgrHome();
}

async function autoSync1c(sale){
  const cfg=get1cConfig();
  if(!cfg.enabled||!cfg.serverUrl) return;
  try{
    const resp=await fetch(cfg.serverUrl+'/api/sale',{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Basic '+btoa(cfg.login+':'+cfg.password)},
      body:JSON.stringify({
        id:sale.id, date:sale.createdAt,
        managerId:sale.managerId, managerName:sale.managerName,
        client:sale.client,
        items:sale.items,
        total:sale.total,
      }),
    });
    if(resp.ok){
      const sales=getSales();
      const s=sales.find(x=>x.id===sale.id);
      if(s){s.syncedTo1c=true;saveSales(sales);}
      addSyncLog('1С','ok',`${sale.id} — синхронизировано`);
    }else{
      addSyncLog('1С','err',`${sale.id} — ошибка ${resp.status}`);
    }
  }catch(e){
    addSyncLog('1С','err',`${sale.id} — нет связи`);
  }
}

function renderMgrSales(){
  const login=state.user?.login;
  const sales=getSales().filter(s=>s.managerId===login);
  const fmt=n=>(n||0).toLocaleString('ru-RU')+' ₽';
  const q=(document.getElementById('mgr-sales-search')?.value||'').toLowerCase();
  const list=q?sales.filter(s=>
    (s.client||'').toLowerCase().includes(q)||
    s.items.some(i=>(i.article||'').toLowerCase().includes(q)||(i.brand||'').toLowerCase().includes(q))
  ):sales;

  const now=new Date();
  const monthSales=sales.filter(s=>new Date(s.createdAt).getMonth()===now.getMonth()&&new Date(s.createdAt).getFullYear()===now.getFullYear());
  const monthTotal=monthSales.reduce((a,s)=>a+s.total,0);
  const todayStr=now.toISOString().slice(0,10);
  const todaySales=sales.filter(s=>s.createdAt.startsWith(todayStr));
  const todayTotal=todaySales.reduce((a,s)=>a+s.total,0);

  const statsEl=document.getElementById('mgr-sales-stats');
  if(statsEl) statsEl.innerHTML=`
    <div class="kpi-card" style="--kpi-color:var(--green)">
      <div class="kpi-label">Сегодня продаж</div>
      <div class="kpi-val">${todaySales.length}</div>
      <div class="kpi-sub">${fmt(todayTotal)}</div>
    </div>
    <div class="kpi-card" style="--kpi-color:var(--blue)">
      <div class="kpi-label">За месяц</div>
      <div class="kpi-val">${monthSales.length}</div>
      <div class="kpi-sub">${fmt(monthTotal)}</div>
    </div>
    <div class="kpi-card" style="--kpi-color:var(--accent)">
      <div class="kpi-label">Всего продаж</div>
      <div class="kpi-val">${sales.length}</div>
      <div class="kpi-sub">${fmt(sales.reduce((a,s)=>a+s.total,0))}</div>
    </div>`;

  const tb=document.getElementById('mgr-sales-tbody');
  if(!tb) return;
  tb.innerHTML=list.length?list.map(s=>`<tr>
    <td><span style="font-family:var(--font-mono);color:var(--accent);font-size:12px">${s.id}</span></td>
    <td style="font-size:12px;color:var(--text3)">${fmtDate(s.createdAt,true)}</td>
    <td>${s.client||'<span style="color:var(--text3)">—</span>'}</td>
    <td style="text-align:center">${s.items?.length||0}</td>
    <td style="font-family:var(--font-mono);font-weight:700">${fmt(s.total)}</td>
    <td>
      ${s.syncedTo1c
        ?'<span style="color:var(--green);font-size:12px">✓ 1С</span>'
        :`<button class="admin-btn admin-btn-outline" style="font-size:11px;padding:4px 10px" onclick="syncSaleTo1c('${s.id}')">↑ В 1С</button>`}
    </td>
    <td>
      <button class="admin-btn admin-btn-outline" style="font-size:11px;padding:4px 10px" onclick="showSaleDetail('${s.id}')">Детали</button>
    </td>
  </tr>`).join('')
  :`<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--text3)">Продаж пока нет — нажмите «+ Оформить продажу»</td></tr>`;
}

function showSaleDetail(id){
  const s=getSales().find(x=>x.id===id);
  if(!s) return;
  const fmt=n=>(n||0).toLocaleString('ru-RU')+' ₽';
  const lines=s.items.map(i=>`${i.article} ${i.brand} ×${i.quantity} = ${fmt(i.price*i.quantity)}`).join('\n');
  alert(`Продажа ${s.id}\n${fmtDate(s.createdAt,true)}\nКлиент: ${s.client||'—'}\n\n${lines}\n\nИтого: ${fmt(s.total)}`);
}

async function syncSaleTo1c(id){
  const s=getSales().find(x=>x.id===id);
  if(!s){showToast('Продажа не найдена','red');return;}
  showToast('Отправка в 1С...','amber');
  await autoSync1c(s);
  const updated=getSales().find(x=>x.id===id);
  if(updated?.syncedTo1c){showToast('Синхронизировано с 1С','green');}
  else{showToast('Не удалось синхронизировать — проверьте настройки 1С','red');}
  const activeTab=document.querySelector('.admin-nav-item.active')?.dataset?.tab;
  if(activeTab==='mgr_sales') renderMgrSales();
  if(activeTab==='boss_mgrs') renderBossMgrs();
}

function renderBossMgrs(){
  const period=document.getElementById('boss-mgr-period')?.value||'month';
  const now=new Date();
  const fmt=n=>(n||0).toLocaleString('ru-RU')+' ₽';

  const allSales=getSales();
  const allOrders=getOrders().filter(o=>o.managerId&&!['cancelled','pending'].includes(o.status));

  const filterDate=s=>{
    const d=new Date(s.createdAt||s.date);
    if(period==='week'){
      const startOfWeek=new Date(now);startOfWeek.setDate(now.getDate()-now.getDay()+1);
      return d>=startOfWeek;
    }
    if(period==='month') return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();
    return true;
  };

  const filteredSales=allSales.filter(filterDate);
  const filteredOrders=allOrders.filter(filterDate);

  const mgrSet={};
  [...Object.entries(SYSTEM_ACCOUNTS).filter(([,v])=>v.role==='manager'),
   ...getUsers().filter(u=>u.role==='manager').map(u=>[u.login,u])
  ].forEach(([login,acc])=>{mgrSet[login]={login,name:acc.name||login};});

  const mgrStats=Object.values(mgrSet).map(m=>{
    const sales=filteredSales.filter(s=>s.managerId===m.login);
    const orders=filteredOrders.filter(o=>o.managerId===m.login);
    const saleTotal=sales.reduce((a,s)=>a+s.total,0);
    const orderTotal=orders.reduce((a,o)=>a+(o.total||0),0);
    return{...m, sales, orders, saleTotal, orderTotal, total:saleTotal+orderTotal};
  }).sort((a,b)=>b.total-a.total);

  const maxTotal=Math.max(...mgrStats.map(m=>m.total),1);

  const cardsEl=document.getElementById('boss-mgrs-cards');
  if(cardsEl) cardsEl.innerHTML=mgrStats.map((m,i)=>`
    <div class="mgr-card">
      <div class="mgr-card-rank">#${i+1}</div>
      <div class="mgr-card-name">${m.name}</div>
      <div class="mgr-card-role">${m.login} · Менеджер</div>
      <div class="mgr-card-stats">
        <div class="mgr-stat">
          <div class="mgr-stat-label">Продаж в магазине</div>
          <div class="mgr-stat-val">${m.sales.length}</div>
          <div style="font-size:12px;color:var(--blue)">${fmt(m.saleTotal)}</div>
        </div>
        <div class="mgr-stat">
          <div class="mgr-stat-label">Онлайн-заказов</div>
          <div class="mgr-stat-val">${m.orders.length}</div>
          <div style="font-size:12px;color:var(--green)">${fmt(m.orderTotal)}</div>
        </div>
      </div>
      <div class="mgr-card-bar">
        <div class="mgr-card-bar-fill" style="width:${Math.round(m.total/maxTotal*100)}%;background:${i===0?'var(--accent)':i===1?'var(--blue)':'var(--green)'}"></div>
      </div>
      <div style="text-align:right;margin-top:6px;font-family:var(--font-head);font-size:18px;font-weight:700;color:#fff">${fmt(m.total)}</div>
    </div>`).join('')||'<div style="color:var(--text3);padding:20px">Нет менеджеров</div>';

  const allRows=[
    ...filteredSales.map(s=>({...s,type:'instore',mgr:mgrSet[s.managerId]?.name||s.managerId})),
    ...filteredOrders.map(o=>({id:o.id,createdAt:o.createdAt,managerId:o.managerId,mgr:mgrSet[o.managerId]?.name||o.managerId,
      client:o.contact?.name,items:o.items,total:o.total,syncedTo1c:o.syncedTo1c,type:'online'}))
  ].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));

  const tb=document.getElementById('boss-mgrs-tbody');
  if(tb) tb.innerHTML=allRows.length?allRows.map(r=>`<tr>
    <td>
      <span style="font-family:var(--font-mono);color:${r.type==='instore'?'var(--blue)':'var(--accent)'};font-size:12px">${r.id}</span>
      <span style="font-size:10px;margin-left:6px;color:var(--text3)">${r.type==='instore'?'магазин':'онлайн'}</span>
    </td>
    <td style="font-size:12px;color:var(--text3)">${fmtDate(r.createdAt,true)}</td>
    <td style="font-weight:600;color:var(--blue)">${r.mgr||'—'}</td>
    <td>${r.client||'<span style="color:var(--text3)">—</span>'}</td>
    <td style="text-align:center">${r.items?.length||0}</td>
    <td style="font-family:var(--font-mono);font-weight:700">${fmt(r.total)}</td>
    <td>${r.syncedTo1c?'<span style="color:var(--green);font-size:12px">✓ 1С</span>':'—'}</td>
  </tr>`).join('')
  :`<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--text3)">Нет данных за период</td></tr>`;
}

function getQwepConfig(){try{return JSON.parse(localStorage.getItem('dp_qwep_config')||'{}');}catch{return{};}}
function saveQwepConfig(c){localStorage.setItem('dp_qwep_config',JSON.stringify(c));}

const _1C_COLORS=['#f59e0b','#3b82f6','#22c55e','#a855f7','#ef4444','#06b6d4'];

function get1cConfigs(){
  try{
    const raw=localStorage.getItem('dp_1c_configs');
    if(raw) return JSON.parse(raw);
    
    const old=localStorage.getItem('dp_1c_config');
    if(old){
      const o=JSON.parse(old);
      if(o.serverUrl){
        const migrated=[{
          id:'c1',name:'Основная база',
          serverUrl:o.serverUrl,login:o.login||'',password:o.password||'',
          database:o.database||'',interval:o.interval||15,
          enabled:o.enabled??true,color:'#f59e0b',
          syncSales:true,importStock:true,
          lastSyncTs:null,lastSyncStatus:null,lastSyncMsg:null,
        }];
        save1cConfigs(migrated);
        localStorage.removeItem('dp_1c_config');
        return migrated;
      }
    }
    return[];
  }catch{return[];}
}
function save1cConfigs(arr){localStorage.setItem('dp_1c_configs',JSON.stringify(arr));}

function get1cConfig(){return get1cConfigs().find(c=>c.enabled)||{};}

function _newCfgId(){return 'c'+Date.now().toString(36);}

function add1cInstance(){
  const cfgs=get1cConfigs();
  const color=_1C_COLORS[cfgs.length % _1C_COLORS.length];
  cfgs.push({
    id:_newCfgId(),
    name:`База ${cfgs.length+1}`,
    serverUrl:'',login:'',password:'',database:'',
    interval:15,enabled:true,color,
    syncSales:true,importStock:false,
    lastSyncTs:null,lastSyncStatus:null,lastSyncMsg:null,
  });
  save1cConfigs(cfgs);
  renderIntegrations();
  showToast('Новое подключение 1С добавлено','amber');
}

function remove1cInstance(id){
  if(!confirm('Удалить это подключение 1С?')) return;
  save1cConfigs(get1cConfigs().filter(c=>c.id!==id));
  addSyncLog('1С','err',`Подключение ${id} удалено`);
  renderIntegrations();
  showToast('Подключение удалено','red');
}

function save1cInstance(id){
  const cfgs=get1cConfigs();
  const idx=cfgs.findIndex(c=>c.id===id);
  if(idx<0) return;
  const pfx=`1c-${id}`;
  cfgs[idx]={
    ...cfgs[idx],
    name:     document.getElementById(`${pfx}-name`).value.trim()||`База ${idx+1}`,
    serverUrl:document.getElementById(`${pfx}-url`).value.trim(),
    login:    document.getElementById(`${pfx}-login`).value.trim(),
    password: document.getElementById(`${pfx}-pass`).value||cfgs[idx].password,
    database: document.getElementById(`${pfx}-db`).value.trim(),
    interval: parseInt(document.getElementById(`${pfx}-interval`).value)||15,
    enabled:  document.getElementById(`${pfx}-enabled`).checked,
    syncSales:    document.getElementById(`${pfx}-sync-sales`).checked,
    importStock:  document.getElementById(`${pfx}-import-stock`).checked,
  };
  save1cConfigs(cfgs);
  addSyncLog(cfgs[idx].name,'ok','Настройки сохранены');
  showToast(`«${cfgs[idx].name}» — настройки сохранены`,'green');
  renderIntegrations();
}

function toggle1cInstance(id,on){
  const cfgs=get1cConfigs();
  const c=cfgs.find(x=>x.id===id);
  if(!c) return;
  c.enabled=on;
  save1cConfigs(cfgs);
  addSyncLog(c.name,on?'ok':'err',on?'Включено':'Отключено');
  renderIntegrations();
}

function getSyncLog(){try{return JSON.parse(localStorage.getItem('dp_sync_log')||'[]');}catch{return[];}}
function addSyncLog(system,type,msg){
  const logs=getSyncLog();
  logs.unshift({system,type,msg,ts:new Date().toISOString()});
  if(logs.length>100) logs.length=100;
  localStorage.setItem('dp_sync_log',JSON.stringify(logs));
  renderSyncLog();
}
function renderSyncLog(){
  const el=document.getElementById('sync-log-box');
  if(!el) return;
  const logs=getSyncLog();
  el.innerHTML=logs.length
    ?logs.map(l=>`<div class="sync-log-${l.type==='ok'?'ok':'err'}">[${fmtDate(l.ts,true)}] <b>${escHtml(l.system)}</b>: ${escHtml(l.msg)}</div>`).join('')
    :'<span style="color:var(--text3)">Журнал пуст</span>';
}
function clearSyncLog(){
  localStorage.removeItem('dp_sync_log');
  renderSyncLog();
  showToast('Журнал очищен','amber');
}

function handle1cFileDrop(event){
  const file = event.dataTransfer?.files?.[0];
  if(file) processOnecFile(file);
}
function handle1cFile(input){
  const file = input?.files?.[0];
  if(file) processOnecFile(file);
  input.value='';
}

function processOnecFile(file){
  if(file.size > 52_428_800){ showToast('Файл слишком большой (макс. 50 МБ)','red'); return; }
  showToast('Читаем файл...','amber');
  const reader = new FileReader();
  reader.onload = e => {
    try{
      const text = e.target.result;
      const ext  = file.name.split('.').pop().toLowerCase();
      let items  = [];
      if(ext==='json'||text.trimStart().startsWith('[')||text.trimStart().startsWith('{')){
        items = parseOnecJson(text);
      } else if(ext==='xml'||text.trimStart().startsWith('<')){
        items = parseOnecXml(text);
      } else {
        items = parseOnecCsv(text);
      }
      if(!items.length){ showToast('Не удалось распознать данные — проверьте формат','red'); return; }
      const {added,updated} = mergeCatalog(items,'1c');
      localStorage.setItem('dp_catalog_meta', JSON.stringify({updatedAt:new Date().toISOString(),file:file.name}));
      showToast(`Импортировано: ${added} новых · ${updated} обновлено`,'green');
      renderIntegrations();
    }catch(err){
      showToast('Ошибка разбора файла: '+err.message,'red');
    }
  };
  reader.readAsText(file,'utf-8');
}

function parseOnecCsv(text){
  const lines = text.split(/\r?\n/).filter(l=>l.trim());
  if(lines.length<2) return [];
  
  const sep = (lines[0].match(/;/g)||[]).length > (lines[0].match(/,/g)||[]).length ? ';' : ',';
  
  const headers = lines[0].split(sep).map(h=>h.trim().replace(/^"|"$/g,'').toLowerCase());

  const colMap = {
    article:   headers.findIndex(h=>/артикул|article|art|partno|partnumber|vendorcode/i.test(h)),
    brand:     headers.findIndex(h=>/производитель|бренд|brand|manufacturer|maker/i.test(h)),
    name:      headers.findIndex(h=>/наименование|название|name|description|товар/i.test(h)),
    price_retail: headers.findIndex(h=>/цена.*розн|розничн|price.*retail|retail/i.test(h)||/^цена$/i.test(h)),
    price_wholesale: headers.findIndex(h=>/цена.*опт|оптов|price.*whole|wholesale/i.test(h)),
    stock:     headers.findIndex(h=>/количество|кол|остат|stock|qty|quantity/i.test(h)),
    delivery:  headers.findIndex(h=>/срок|delivery|дней/i.test(h)),
  };
  
  if(colMap.article<0) colMap.article=0;
  if(colMap.brand<0)   colMap.brand=1;
  if(colMap.name<0)    colMap.name=2;
  if(colMap.price_retail<0) colMap.price_retail=3;
  if(colMap.price_wholesale<0) colMap.price_wholesale=4;
  if(colMap.stock<0)   colMap.stock=5;

  const items=[];
  for(let i=1;i<lines.length;i++){
    const cols = lines[i].split(sep).map(c=>c.trim().replace(/^"|"$/g,''));
    const article = cols[colMap.article]||'';
    if(!article) continue;
    items.push({
      article,
      brand:           cols[colMap.brand]||'',
      name:            cols[colMap.name]||article,
      price_retail:    parseFloat((cols[colMap.price_retail]||'0').replace(/[^\d.]/g,''))||0,
      price_wholesale: parseFloat((cols[colMap.price_wholesale]||'0').replace(/[^\d.]/g,''))||0,
      stock:           parseInt((cols[colMap.stock]||'0').replace(/[^\d]/g,''))||0,
      delivery_days:   parseInt((cols[colMap.delivery>=0?colMap.delivery:99]||'0'))||0,
      source:          '1c',
    });
  }
  return items;
}

function parseOnecJson(text){
  const data = JSON.parse(text);
  const arr  = Array.isArray(data) ? data : (data.items||data.products||data.catalog||data.Товары||[data]);
  return arr.map(o=>({
    article:         o.article||o.Артикул||o.partNumber||o.VendorCode||'',
    brand:           o.brand||o.Производитель||o.Brand||o.manufacturer||'',
    name:            o.name||o.Наименование||o.Name||o.description||o.article||'',
    price_retail:    parseFloat(o.price_retail||o.ЦенаРозн||o.price||o.Цена||0),
    price_wholesale: parseFloat(o.price_wholesale||o.ЦенаОпт||o.wholesale||0),
    stock:           parseInt(o.stock||o.Количество||o.quantity||o.qty||0),
    delivery_days:   parseInt(o.delivery_days||o.Срок||0),
    source:          '1c',
  })).filter(o=>o.article);
}

function parseOnecXml(text){
  const parser = new DOMParser();
  const doc    = parser.parseFromString(text,'text/xml');
  const items  = [];

  doc.querySelectorAll('Товар').forEach(t=>{
    const article = t.querySelector('Артикул')?.textContent||
                    t.querySelector('ВендорКод')?.textContent||'';
    if(!article) return;
    items.push({
      article,
      brand:           t.querySelector('Производитель')?.textContent||'',
      name:            t.querySelector('Наименование')?.textContent||article,
      price_retail:    0, price_wholesale:0, stock:0, delivery_days:0, source:'1c'
    });
  });

  doc.querySelectorAll('Предложение').forEach(p=>{
    const article = p.querySelector('Артикул')?.textContent||'';
    const qty     = parseInt(p.querySelector('Количество')?.textContent||0);
    const price   = parseFloat(p.querySelector('Цена Представление')?.textContent||
                               p.querySelector('ЦенаЗаЕдиницу')?.textContent||0);
    const it = items.find(i=>i.article===article);
    if(it){ it.stock=qty; if(price) it.price_retail=price; }
    else items.push({article, brand:'', name:article, price_retail:price, price_wholesale:0, stock:qty, delivery_days:0, source:'1c'});
  });

  if(!items.length){
    doc.querySelectorAll('[article],[Артикул],[partNumber]').forEach(el=>{
      const article = el.getAttribute('article')||el.getAttribute('Артикул')||el.getAttribute('partNumber')||'';
      if(!article) return;
      items.push({
        article,
        brand:        el.getAttribute('brand')||el.getAttribute('Производитель')||'',
        name:         el.getAttribute('name')||el.getAttribute('Наименование')||article,
        price_retail: parseFloat(el.getAttribute('price')||0),
        price_wholesale:0, stock:parseInt(el.getAttribute('stock')||0), delivery_days:0, source:'1c',
      });
    });
  }
  return items.filter(i=>i.article);
}

function renderIntegrations(){
  const q=getQwepConfig();
  const cfgs=get1cConfigs();
  const el=document.getElementById('integrations-content');
  if(!el) return;

  const catCount = getCatalogCount();
  el.innerHTML=`
    <!-- ══ 1С FILE IMPORT ══════════════════════════════════════════════════ -->
    <div class="integ-card" style="border-left:4px solid var(--green)">
      <div class="integ-card-header">
        <div class="integ-logo" style="background:rgba(34,197,94,.15);color:var(--green);font-family:var(--font-head);font-weight:900;font-size:14px">1С</div>
        <div>
          <div class="integ-title">Импорт каталога из файла (1С)</div>
          <div class="integ-status ${catCount>0?'sync-log-ok':''}">${catCount>0?`● Загружено позиций: ${catCount.toLocaleString('ru-RU')}`:'○ Каталог пуст — загрузите файл'}</div>
        </div>
      </div>
      <p style="font-size:13px;color:var(--text2);line-height:1.7;margin:0 0 16px">
        Выгрузите из 1С файл остатков в формате <strong>CSV</strong>, <strong>JSON</strong> или <strong>XML</strong>
        и загрузите его сюда. Данные мгновенно появятся в каталоге. Повторный импорт обновляет существующие позиции.
      </p>
      <div style="background:var(--bg3);border:2px dashed var(--line2);border-radius:var(--r2);padding:28px;text-align:center;margin-bottom:16px;cursor:pointer;transition:.15s"
        onclick="document.getElementById('onec-file-input').click()"
        ondragover="event.preventDefault();this.style.borderColor='var(--green)'"
        ondragleave="this.style.borderColor='var(--line2)'"
        ondrop="event.preventDefault();this.style.borderColor='var(--line2)';handle1cFileDrop(event)">
        <div style="font-size:32px;margin-bottom:8px">📂</div>
        <div style="font-size:14px;font-weight:600;color:var(--text)">Перетащите файл или нажмите для выбора</div>
        <div style="font-size:12px;color:var(--text3);margin-top:4px">CSV · JSON · XML · до 50 МБ</div>
        <input type="file" id="onec-file-input" accept=".csv,.json,.xml,.txt" style="display:none" onchange="handle1cFile(this)">
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
        <button class="admin-btn admin-btn-green" onclick="document.getElementById('onec-file-input').click()">📂 Выбрать файл</button>
        ${catCount>0?`<button class="admin-btn admin-btn-outline" style="color:var(--accent);border-color:var(--accent)" onclick="if(confirm('Очистить весь каталог? Данные удалятся из поиска.')){saveCatalog([]);showToast('Каталог очищен','amber');renderIntegrations()}">🗑 Очистить каталог</button>`:''}
        <span style="font-size:12px;color:var(--text3)">${catCount>0?`Последнее обновление: ${fmtDate(JSON.parse(localStorage.getItem('dp_catalog_meta')||'{}').updatedAt,true)||'—'}`:'Данных нет'}</span>
      </div>

      <!-- CSV column mapping hint -->
      <div style="margin-top:16px;background:var(--bg3);border-radius:var(--r);padding:14px;font-size:12px;color:var(--text2);line-height:1.8">
        <strong style="color:var(--text)">Формат CSV (разделитель ; или ,):</strong><br>
        <code style="color:var(--green)">Артикул;Производитель;Наименование;ЦенаРозн;ЦенаОпт;Количество</code><br>
        <strong style="color:var(--text)">Формат JSON:</strong>
        <code style="color:var(--green)">[{"article":"...", "brand":"...", "name":"...", "price_retail":..., "stock":...}]</code><br>
        <strong style="color:var(--text)">Формат XML (1С CommerceML):</strong> автоматически распознаётся.
      </div>
    </div>

    <!-- QWEP block -->
    <div class="integ-card">
      <div class="integ-card-header">
        <div class="integ-logo" style="background:rgba(59,130,246,.15);color:var(--blue)">🔍</div>
        <div>
          <div class="integ-title">QWEP — каталог запчастей</div>
          <div class="integ-status ${q.enabled?'sync-log-ok':''}">${q.enabled?'● Подключён':'○ Не подключён'}</div>
        </div>
        <label style="margin-left:auto;display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px">
          <input type="checkbox" id="qwep-enabled" ${q.enabled?'checked':''} onchange="toggleQwep(this.checked)"
            style="width:16px;height:16px;accent-color:var(--blue)"> Включить
        </label>
      </div>
      <div class="integ-fields">
        <div class="integ-field"><label>API ключ</label><input id="qwep-api-key" type="password" value="${escHtml(q.apiKey||'')}" placeholder="QWEP-XXXXXX-XXXXXX"></div>
        <div class="integ-field"><label>Логин</label><input id="qwep-login" value="${escHtml(q.login||'')}" placeholder="user@qwep.ru"></div>
        <div class="integ-field"><label>Пароль</label><input id="qwep-pass" type="password" value="${escHtml(q.password||'')}" placeholder="••••••••"></div>
        <div class="integ-field"><label>Наценка по умолчанию %</label><input id="qwep-markup" type="number" value="${q.markup||25}" min="0" max="200"></div>
      </div>
      <div class="integ-actions">
        <button class="admin-btn admin-btn-primary" onclick="saveQwep()">💾 Сохранить</button>
        <button class="admin-btn admin-btn-outline" onclick="testQwep()">🔗 Проверить соединение</button>
      </div>
    </div>

    <!-- 1C section header -->
    <div style="display:flex;align-items:center;justify-content:space-between;margin:24px 0 12px">
      <div>
        <div style="font-family:var(--font-head);font-size:20px;font-weight:700;color:#fff">1С:Предприятие</div>
        <div style="font-size:12px;color:var(--text3);margin-top:2px">Подключено баз: ${cfgs.length} · Активных: ${cfgs.filter(c=>c.enabled).length}</div>
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <button class="admin-btn admin-btn-green" onclick="syncAll1c()">↑ Синк всех продаж</button>
        <button class="admin-btn admin-btn-outline" onclick="importAllStock()">↓ Импорт остатков</button>
        <button class="admin-btn admin-btn-primary" onclick="add1cInstance()">＋ Добавить базу 1С</button>
      </div>
    </div>

    <!-- 1C cards -->
    <div id="onec-cards-list">
      ${cfgs.length ? cfgs.map(c=>render1cCard(c)).join('') : `
        <div class="integ-card" style="text-align:center;padding:40px;color:var(--text3)">
          Нет подключений 1С — нажмите «＋ Добавить базу 1С»
        </div>`}
    </div>

    <!-- Global actions -->
    <div style="margin:20px 0 8px;display:flex;gap:10px;flex-wrap:wrap">
      <button class="admin-btn admin-btn-outline" onclick="syncAll1c()">↑ Синхронизировать всё</button>
      <button class="admin-btn admin-btn-outline" onclick="importAllStock()">↓ Загрузить все остатки</button>
    </div>

    <!-- Sync log -->
    <div class="integ-card" style="margin-top:8px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <div style="font-weight:600;color:var(--text2);font-size:14px">📋 Журнал синхронизации</div>
        <button class="admin-btn admin-btn-outline" style="font-size:11px;padding:4px 10px" onclick="clearSyncLog()">Очистить</button>
      </div>
      <div class="sync-log" id="sync-log-box">—</div>
    </div>

    <!-- Guide -->
    <div class="integ-card" style="background:var(--bg2);margin-top:12px">
      <div style="font-weight:600;color:var(--amber);margin-bottom:10px">📖 Как подключить 1С</div>
      <div style="font-size:13px;color:var(--text2);line-height:1.9">
        1. В 1С создайте <strong>HTTP-сервис</strong> (Конфигуратор → HTTP-сервисы)<br>
        2. Метод <code>POST /api/sale</code> — приём продаж с сайта<br>
        3. Метод <code>GET /api/stock</code> — выгрузка остатков<br>
        4. Метод <code>GET /api/ping</code> — проверка соединения (возвращает 200 OK)<br>
        5. Укажите URL сервера, логин и пароль → «Сохранить» → «Проверить»<br>
        <br>
        <strong style="color:var(--text)">Пример URL:</strong> <code>http://192.168.0.10:8080/УТ11</code><br>
        <strong style="color:var(--text)">Несколько баз:</strong> каждая база — отдельная карточка.<br>
        Можно настроить: одна база получает продажи, другая — только отдаёт остатки.
      </div>
    </div>`;

  renderSyncLog();
}

function render1cCard(c){
  const pfx=`1c-${c.id}`;
  const statusColor=c.lastSyncStatus==='ok'?'var(--green)':c.lastSyncStatus==='err'?'var(--accent)':'var(--text3)';
  const statusText=c.lastSyncStatus==='ok'?`✓ Синк ${fmtDate(c.lastSyncTs,true)}`
    :c.lastSyncStatus==='err'?`✕ ${c.lastSyncMsg||'Ошибка'}`:'Ещё не синхронизировалось';
  return`
  <div class="integ-card" style="border-left:4px solid ${c.color}">
    <div class="integ-card-header">
      <div class="integ-logo" style="background:${c.color}22;color:${c.color};font-family:var(--font-head);font-weight:900;font-size:14px">1С</div>
      <div style="flex:1;min-width:0">
        <div class="integ-title">${escHtml(c.name)}</div>
        <div style="font-size:11px;color:${statusColor};margin-top:2px">${statusText}</div>
        ${c.serverUrl?`<div style="font-size:11px;color:var(--text3);font-family:var(--font-mono);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(c.serverUrl)}</div>`:''}
      </div>
      <div style="display:flex;align-items:center;gap:12px;flex-shrink:0">
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px">
          <input type="checkbox" id="${pfx}-enabled" ${c.enabled?'checked':''}
            onchange="toggle1cInstance('${c.id}',this.checked)"
            style="width:16px;height:16px;accent-color:${c.color}">
          Вкл
        </label>
        <button onclick="remove1cInstance('${c.id}')" style="background:transparent;border:1px solid var(--line2);color:var(--text3);border-radius:var(--r);padding:4px 8px;cursor:pointer;font-size:14px" title="Удалить">✕</button>
      </div>
    </div>

    <!-- Fields -->
    <div class="integ-fields">
      <div class="integ-field" style="grid-column:span 2">
        <label>Название базы</label>
        <input id="${pfx}-name" value="${escHtml(c.name)}" placeholder="Название для удобства">
      </div>
      <div class="integ-field" style="grid-column:span 2">
        <label>URL HTTP-сервиса 1С</label>
        <input id="${pfx}-url" value="${escHtml(c.serverUrl)}" placeholder="http://192.168.0.XX:8080/БазаДанных">
      </div>
      <div class="integ-field">
        <label>Логин 1С</label>
        <input id="${pfx}-login" value="${escHtml(c.login)}" placeholder="Администратор">
      </div>
      <div class="integ-field">
        <label>Пароль 1С</label>
        <input id="${pfx}-pass" type="password" placeholder="••••••••" value="">
      </div>
      <div class="integ-field">
        <label>База данных</label>
        <input id="${pfx}-db" value="${escHtml(c.database)}" placeholder="Автозапчасти">
      </div>
      <div class="integ-field">
        <label>Автосинк каждые (мин)</label>
        <input id="${pfx}-interval" type="number" value="${c.interval||15}" min="1" max="1440">
      </div>
    </div>

    <!-- Checkboxes -->
    <div style="display:flex;gap:20px;margin:12px 0 14px;flex-wrap:wrap">
      <label style="display:flex;align-items:center;gap:7px;cursor:pointer;font-size:13px;color:var(--text2)">
        <input type="checkbox" id="${pfx}-sync-sales" ${c.syncSales?'checked':''}
          style="width:15px;height:15px;accent-color:${c.color}">
        Отправлять продажи в эту базу
      </label>
      <label style="display:flex;align-items:center;gap:7px;cursor:pointer;font-size:13px;color:var(--text2)">
        <input type="checkbox" id="${pfx}-import-stock" ${c.importStock?'checked':''}
          style="width:15px;height:15px;accent-color:${c.color}">
        Загружать остатки из этой базы
      </label>
    </div>

    <!-- Actions -->
    <div class="integ-actions">
      <button class="admin-btn admin-btn-primary" onclick="save1cInstance('${c.id}')">💾 Сохранить</button>
      <button class="admin-btn admin-btn-outline" onclick="test1cInstance('${c.id}')">🔗 Проверить связь</button>
      <button class="admin-btn admin-btn-green" onclick="syncSalesTo1cInstance('${c.id}')">↑ Синк продаж</button>
      <button class="admin-btn admin-btn-outline" onclick="import1cStock('${c.id}')">↓ Загрузить остатки</button>
    </div>
  </div>`;
}

function saveQwep(){
  saveQwepConfig({
    apiKey:  document.getElementById('qwep-api-key').value.trim(),
    login:   document.getElementById('qwep-login').value.trim(),
    password:document.getElementById('qwep-pass').value,
    markup:  parseInt(document.getElementById('qwep-markup').value)||25,
    enabled: document.getElementById('qwep-enabled').checked,
  });
  showToast('Настройки QWEP сохранены','green');
  addSyncLog('QWEP','ok','Настройки обновлены');
}
function toggleQwep(on){
  const cfg=getQwepConfig();cfg.enabled=on;saveQwepConfig(cfg);
  addSyncLog('QWEP',on?'ok':'err',on?'Включено':'Отключено');
}
async function testQwep(){
  showToast('Проверяем QWEP...','amber');
  const cfg=getQwepConfig();
  if(!cfg.apiKey){showToast('Введите API ключ','red');return;}
  setTimeout(()=>{
    addSyncLog('QWEP','ok','Соединение проверено (симуляция — нужна реальная интеграция)');
    showToast('QWEP: ОК (тестовый режим)','green');
  },600);
}

async function test1cInstance(id){
  const cfgs=get1cConfigs();
  const c=cfgs.find(x=>x.id===id);
  if(!c){showToast('Подключение не найдено','red');return;}
  if(!c.serverUrl){showToast('Введите URL сервера','red');return;}
  showToast(`Проверяем «${c.name}»...`,'amber');
  try{
    const resp=await fetch(c.serverUrl+'/api/ping',{
      headers:{'Authorization':'Basic '+btoa(c.login+':'+c.password)},
      signal:AbortSignal.timeout(6000),
    });
    const idx=cfgs.findIndex(x=>x.id===id);
    if(resp.ok){
      cfgs[idx].lastSyncStatus='ok';
      cfgs[idx].lastSyncTs=new Date().toISOString();
      cfgs[idx].lastSyncMsg='Ping OK';
      save1cConfigs(cfgs);
      addSyncLog(c.name,'ok','Ping OK — соединение установлено');
      showToast(`«${c.name}»: соединение ОК ✓`,'green');
    }else{
      cfgs[idx].lastSyncStatus='err';
      cfgs[idx].lastSyncMsg=`HTTP ${resp.status}`;
      save1cConfigs(cfgs);
      addSyncLog(c.name,'err',`Ошибка HTTP ${resp.status}`);
      showToast(`«${c.name}»: ошибка ${resp.status}`,'red');
    }
  }catch(e){
    const idx=cfgs.findIndex(x=>x.id===id);
    cfgs[idx].lastSyncStatus='err';
    cfgs[idx].lastSyncMsg='Нет связи';
    save1cConfigs(cfgs);
    addSyncLog(c.name,'err','Нет связи — '+e.message);
    showToast(`«${c.name}»: нет связи`,'red');
  }
  renderIntegrations();
}

async function _syncSaleToInstance(sale,c){
  if(!c.enabled||!c.syncSales||!c.serverUrl) return false;
  try{
    const resp=await fetch(c.serverUrl+'/api/sale',{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Basic '+btoa(c.login+':'+c.password)},
      body:JSON.stringify({
        id:sale.id,date:sale.createdAt,
        managerId:sale.managerId,managerName:sale.managerName,
        client:sale.client,items:sale.items,total:sale.total,
      }),
      signal:AbortSignal.timeout(8000),
    });
    if(resp.ok){
      addSyncLog(c.name,'ok',`${sale.id} → отправлено`);
      return true;
    }else{
      addSyncLog(c.name,'err',`${sale.id} → HTTP ${resp.status}`);
      return false;
    }
  }catch(e){
    addSyncLog(c.name,'err',`${sale.id} → нет связи`);
    return false;
  }
}

async function autoSync1c(sale){
  const cfgs=get1cConfigs().filter(c=>c.enabled&&c.syncSales&&c.serverUrl);
  if(!cfgs.length) return;
  const sales=getSales();
  const s=sales.find(x=>x.id===sale.id);
  if(!s) return;
  if(!s.syncInstances) s.syncInstances={};
  let anyOk=false;
  for(const c of cfgs){
    if(s.syncInstances[c.id]) continue; 
    const ok=await _syncSaleToInstance(sale,c);
    if(ok){s.syncInstances[c.id]=true;anyOk=true;}
  }
  if(anyOk){s.syncedTo1c=true;}
  saveSales(sales);
}

async function syncSalesTo1cInstance(id){
  const cfgs=get1cConfigs();
  const c=cfgs.find(x=>x.id===id);
  if(!c){showToast('База не найдена','red');return;}
  if(!c.serverUrl){showToast('Укажите URL сервера','red');return;}
  const sales=getSales();
  const toSync=sales.filter(s=>!s.syncInstances?.[id]);
  if(!toSync.length){showToast(`«${c.name}» — всё уже синхронизировано`,'green');return;}
  showToast(`Отправляем ${toSync.length} продаж в «${c.name}»...`,'amber');
  let ok=0,err=0;
  for(const s of toSync){
    if(!s.syncInstances) s.syncInstances={};
    const r=await _syncSaleToInstance(s,c);
    if(r){s.syncInstances[id]=true;s.syncedTo1c=true;ok++;}else{err++;}
  }
  saveSales(sales);
  
  const idx=cfgs.findIndex(x=>x.id===id);
  cfgs[idx].lastSyncTs=new Date().toISOString();
  cfgs[idx].lastSyncStatus=err===0?'ok':'err';
  cfgs[idx].lastSyncMsg=`${ok} отправлено, ${err} ошибок`;
  save1cConfigs(cfgs);
  showToast(`«${c.name}»: ${ok} отправлено${err?', '+err+' ошибок':''}`,(err?'amber':'green'));
  renderIntegrations();
}

async function syncAll1c(){
  const cfgs=get1cConfigs().filter(c=>c.enabled&&c.syncSales);
  if(!cfgs.length){showToast('Нет активных баз 1С с включённым синком продаж','red');return;}
  showToast(`Синхронизируем с ${cfgs.length} базами...`,'amber');
  for(const c of cfgs){
    await syncSalesTo1cInstance(c.id);
  }
  showToast('Синхронизация завершена','green');
}

async function import1cStock(id){
  const cfgs=get1cConfigs();
  const c=cfgs.find(x=>x.id===id);
  if(!c||!c.serverUrl){showToast('Укажите URL сервера','red');return;}
  showToast(`Загружаем остатки из «${c.name}»...`,'amber');
  try{
    const resp=await fetch(c.serverUrl+'/api/stock',{
      headers:{'Authorization':'Basic '+btoa(c.login+':'+c.password)},
      signal:AbortSignal.timeout(12000),
    });
    if(resp.ok){
      const data=await resp.json();
      const stock=getWHStock();
      data.forEach(item=>{
        const key=(item.article||'')+'_'+(item.brand||'');
        stock[key]={...item,receivedAt:new Date().toISOString(),source:'1c:'+c.name};
      });
      localStorage.setItem('dp_stock',JSON.stringify(stock));
      
      const {added,updated}=mergeCatalogFromStock(stock);
      localStorage.setItem('dp_catalog_meta',JSON.stringify({updatedAt:new Date().toISOString(),file:'1C: '+c.name}));
      addSyncLog(c.name,'ok',`Загружено ${data.length} позиций · каталог +${added} новых, обновл. ${updated}`);
      showToast(`«${c.name}»: загружено ${data.length} позиций`,'green');
    }else{
      addSyncLog(c.name,'err',`HTTP ${resp.status} при загрузке остатков`);
      showToast(`«${c.name}»: ошибка ${resp.status}`,'red');
    }
  }catch(e){
    addSyncLog(c.name,'err','Нет связи при загрузке — '+e.message);
    showToast(`«${c.name}»: нет связи`,'red');
  }
}

async function importAllStock(){
  const cfgs=get1cConfigs().filter(c=>c.enabled&&c.importStock);
  if(!cfgs.length){
    showToast('Нет баз с включённой загрузкой остатков','red');
    return;
  }
  showToast(`Загружаем остатки из ${cfgs.length} баз...`,'amber');
  for(const c of cfgs) await import1cStock(c.id);
  showToast('Загрузка остатков завершена','green');
}

let _hkPollTimer=null;
const _hkSeen=new Set(); 

function _hkActionLabel(a){
  return {
    order_create:'Заказ',sale:'Продажа',status_change:'Смена статуса',
    login:'Вход',search:'Поиск',role_change:'Смена роли',
    onec_link:'1С привязка',add_account:'Добавл. акк.',
    storage_write:'Запись данных',
  }[a]||a;
}

function _hkRowHtml(entry,isNew){
  const ts=entry.ts||'';
  const user=entry.user||'system';
  const role=entry.role||'system';
  const action=entry.action||'event';
  const details=entry.details||entry.storageKey||'';
  const id=ts+user+action;
  const isNewCls=isNew&&!_hkSeen.has(id)?'hk-new':'';
  _hkSeen.add(id);
  const actClass=`hk-act-${action}`||'hk-act-default';
  return`<div class="hk-row ${isNewCls}">
    <span class="hk-ts">${ts.slice(11,19)} <span style="color:var(--text3);font-size:10px">${ts.slice(0,10)}</span></span>
    <span class="hk-user">${escHtml(user)}</span>
    <span class="hk-role-tag hk-role-${role}">${role}</span>
    <div>
      <span class="hk-action ${actClass}">${_hkActionLabel(action)}</span>
      ${details?`<span class="hk-details" title="${escHtml(details)}"> — ${escHtml(String(details).slice(0,120))}</span>`:''}
    </div>
  </div>`;
}

function renderHkMonitor(){
  const roleFilter=document.getElementById('hk-role-filter')?.value||'';
  const search=(document.getElementById('hk-search')?.value||'').toLowerCase();

  const feedRaw=getChangeFeed();
  const logsRaw=getLogs();
  const merged=[...feedRaw,...logsRaw];
  const seen=new Set();
  const all=merged.filter(e=>{
    const k=(e.ts||'')+(e.user||'')+(e.action||'')+(e.details||'');
    if(seen.has(k)) return false;
    seen.add(k);
    return true;
  }).sort((a,b)=>new Date(b.ts)-new Date(a.ts));

  let list=all;
  if(roleFilter) list=list.filter(e=>e.role===roleFilter);
  if(search) list=list.filter(e=>
    (e.user||'').toLowerCase().includes(search)||
    (e.details||'').toLowerCase().includes(search)
  );

  const now=new Date();
  const todayStr=now.toISOString().slice(0,10);
  const todayEvents=all.filter(e=>e.ts?.startsWith(todayStr));
  const uniqueUsers=new Set(all.filter(e=>e.role!=='system').map(e=>e.user)).size;
  const salesCnt=all.filter(e=>e.action==='sale').length;
  const statusChanges=all.filter(e=>e.action==='status_change').length;

  const statsEl=document.getElementById('hk-stats-row');
  if(statsEl) statsEl.innerHTML=`
    <div class="kpi-card" style="--kpi-color:#a855f7">
      <div class="kpi-label">Событий сегодня</div>
      <div class="kpi-val">${todayEvents.length}</div>
    </div>
    <div class="kpi-card" style="--kpi-color:var(--blue)">
      <div class="kpi-label">Активных пользователей</div>
      <div class="kpi-val">${uniqueUsers}</div>
    </div>
    <div class="kpi-card" style="--kpi-color:var(--green)">
      <div class="kpi-label">Продаж зафиксировано</div>
      <div class="kpi-val">${salesCnt}</div>
    </div>
    <div class="kpi-card" style="--kpi-color:var(--amber)">
      <div class="kpi-label">Смен статуса</div>
      <div class="kpi-val">${statusChanges}</div>
    </div>`;

  const feedEl=document.getElementById('hk-monitor-feed');
  if(!feedEl) return;
  if(!list.length){
    feedEl.innerHTML='<div class="hk-feed" style="color:var(--text3);text-align:center;padding:32px">Нет событий</div>';
    return;
  }
  const isFirst=!feedEl.innerHTML||feedEl.innerHTML.includes('Нет событий');
  feedEl.innerHTML=`<div class="hk-feed">${list.slice(0,300).map(e=>_hkRowHtml(e,!isFirst)).join('')}</div>`;
}

function renderHkChanges(){
  const roleFilter=document.getElementById('hk-ch-role')?.value||'';
  const actionFilter=document.getElementById('hk-ch-action')?.value||'';
  const search=(document.getElementById('hk-ch-search')?.value||'').toLowerCase();

  const all=[...getChangeFeed(),...getLogs()]
    .reduce((acc,e)=>{
      const k=(e.ts||'')+(e.user||'')+(e.action||'');
      if(!acc.keys.has(k)){acc.keys.add(k);acc.items.push(e);}
      return acc;
    },{keys:new Set(),items:[]}).items
    .sort((a,b)=>new Date(b.ts)-new Date(a.ts));

  let list=all;
  if(roleFilter) list=list.filter(e=>e.role===roleFilter);
  if(actionFilter) list=list.filter(e=>e.action===actionFilter);
  if(search) list=list.filter(e=>
    (e.user||'').toLowerCase().includes(search)||
    (e.details||'').toLowerCase().includes(search)||
    (e.storageKey||'').toLowerCase().includes(search)
  );

  const ACT_COLOR={
    order_create:'var(--accent)',sale:'var(--blue)',status_change:'var(--amber)',
    login:'var(--green)',role_change:'#a855f7',storage_write:'var(--text3)',
    search:'var(--text2)',
  };
  const tb=document.getElementById('hk-changes-tbody');
  if(!tb) return;
  tb.innerHTML=list.length?list.slice(0,500).map(e=>`<tr>
    <td style="font-family:var(--font-mono);font-size:11px;color:var(--text3);white-space:nowrap">${fmtDate(e.ts,true)}</td>
    <td style="font-weight:600;color:#fff">${escHtml(e.user||'system')}</td>
    <td><span class="hk-role-tag hk-role-${e.role||'system'}">${e.role||'system'}</span></td>
    <td><span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:${ACT_COLOR[e.action]||'var(--text2)'}">${_hkActionLabel(e.action||'')}</span></td>
    <td style="font-size:12px;color:var(--text2);max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${escHtml(e.details||e.storageKey||'')}">
      ${escHtml((e.details||e.storageKey||'—').slice(0,150))}
    </td>
  </tr>`).join('')
  :`<tr><td colspan="5" style="text-align:center;padding:32px;color:var(--text3)">Нет событий по фильтру</td></tr>`;
}

function startHkPoll(){
  if(_hkPollTimer) return;
  _hkPollTimer=setInterval(()=>{
    const active=document.querySelector('.admin-nav-item.active')?.dataset?.tab;
    if(active==='hk_monitor') renderHkMonitor();
  },3000);
}
function stopHkPoll(){
  if(_hkPollTimer){clearInterval(_hkPollTimer);_hkPollTimer=null;}
}

const ROLE_TABS_CONFIG = {
  boss:[
    {id:'dashboard',    icon:'📊', label:'Дашборд'},
    {id:'orders',       icon:'📋', label:'Заказы',          badge:true},
    {id:'support_chat', icon:'💬', label:'Чат поддержки'},
    {id:'boss_mgrs',    icon:'👨‍💼', label:'Менеджеры'},
    {id:'profit',       icon:'💰', label:'Прибыль'},
    {id:'logs',         icon:'📝', label:'Журнал'},
    {id:'users',        icon:'👥', label:'Сотрудники'},
    {id:'integrations', icon:'🔌', label:'Интеграции'},
  ],
  admin:[
    {id:'dashboard',    icon:'📊', label:'Дашборд'},
    {id:'orders',       icon:'📋', label:'Заказы',   badge:true},
    {id:'support_chat', icon:'💬', label:'Чат поддержки'},
    {id:'profit',       icon:'💰', label:'Прибыль'},
    {id:'logs',         icon:'📝', label:'Журнал'},
    {id:'users',        icon:'👥', label:'Пользователи'},
  ],
  manager:[
    {id:'mgr_home',     icon:'🏠', label:'Главная',   badge:true},
    {id:'support_chat', icon:'💬', label:'Чат поддержки'},
    {id:'mgr_sales',    icon:'💳', label:'Мои продажи'},
    {id:'orders',       icon:'📋', label:'Онлайн-заказы'},
  ],
  accountant:[
    {id:'buh_home',  icon:'📈', label:'Сводка'},
    {id:'profit',    icon:'💰', label:'Детальный отчёт'},
    {id:'orders',    icon:'📋', label:'Заказы (просмотр)'},
  ],
  warehouse:[
    {id:'wh_home',   icon:'📦', label:'Очередь сборки', badge:true},
    {id:'wh_stock',  icon:'🗃', label:'Остатки'},
  ],
  customer:[
    {id:'my_orders',  icon:'🛍', label:'Мои заказы'},
    {id:'my_profile', icon:'👤', label:'Профиль'},
  ],
  hacker:[
    {id:'hk_monitor', icon:'🖥', label:'Монитор',    badge:true},
    {id:'hk_changes', icon:'🔄', label:'Все изменения'},
    {id:'logs',       icon:'📋', label:'Журнал событий'},
    {id:'integrations',icon:'🔌',label:'Интеграции'},
  ],
  creator:[
    {id:'dashboard',    icon:'📊', label:'Дашборд'},
    {id:'orders',       icon:'📋', label:'Заказы',         badge:true},
    {id:'support_chat', icon:'💬', label:'Чат поддержки'},
    {id:'cr_accounts',  icon:'🔑', label:'Все аккаунты'},
    {id:'cr_banners',   icon:'🎯', label:'Баннеры'},
    {id:'boss_mgrs',    icon:'👨‍💼', label:'Менеджеры'},
    {id:'profit',       icon:'💰', label:'Прибыль'},
    {id:'logs',         icon:'📝', label:'Журнал'},
    {id:'users',        icon:'👥', label:'Пользователи'},
    {id:'integrations', icon:'🔌', label:'Интеграции'},
    {id:'hk_monitor',   icon:'🖥', label:'Монитор'},
    {id:'hk_changes',   icon:'🔄', label:'Изменения'},
  ],
};

const ROLE_META = {
  creator:    {label:'Создатель',    color:'#f0c040',        bg:'rgba(240,192,64,.15)'},
  boss:       {label:'Начальник',    color:'var(--accent)',  bg:'rgba(232,65,26,.15)'},
  admin:      {label:'Администратор',color:'var(--accent)',  bg:'rgba(232,65,26,.15)'},
  manager:    {label:'Менеджер',     color:'var(--blue)',    bg:'rgba(59,130,246,.15)'},
  accountant: {label:'Бухгалтер',    color:'var(--green)',   bg:'rgba(34,197,94,.15)'},
  warehouse:  {label:'Склад',        color:'var(--amber)',   bg:'rgba(245,158,11,.15)'},
  customer:   {label:'Покупатель',   color:'var(--text2)',   bg:'var(--bg4)'},
  hacker:     {label:'Аудит системы',color:'#a855f7',        bg:'rgba(168,85,247,.15)'},
};

function renderAdminSidebar(){
  const role = state.role||'customer';
  const meta = ROLE_META[role]||ROLE_META.customer;
  const tabs  = ROLE_TABS_CONFIG[role]||ROLE_TABS_CONFIG.customer;

  document.getElementById('admin-sidebar-role-label').textContent = meta.label;
  const u = state.user;
  document.getElementById('admin-sidebar-user').innerHTML =
    `<span style="color:${meta.color};font-weight:600">${u?.name||u?.login||'—'}</span>`;

  const nav = document.getElementById('admin-nav-items');
  nav.innerHTML = tabs.map((t,i)=>`
    <div class="admin-nav-item${i===0?' active':''}" data-tab="${t.id}" onclick="switchAdminTab('${t.id}')">
      <span class="admin-nav-icon">${t.icon}</span>
      ${t.label}
      ${t.badge?`<span id="pending-orders-badge" style="display:none;margin-left:auto;background:var(--accent);color:#fff;font-size:10px;font-weight:700;border-radius:10px;padding:1px 7px;min-width:18px;text-align:center"></span>`:''}
    </div>`).join('');

  switchAdminTab(tabs[0].id);
}

function renderMgrHome(){
  const orders = getOrders();
  const fmt = n=>(n||0).toLocaleString('ru-RU')+' ₽';
  const today = new Date().toLocaleDateString('ru-RU',{weekday:'long',day:'numeric',month:'long'});

  const h = new Date().getHours();
  const greet = h<12?'Доброе утро':h<18?'Добрый день':'Добрый вечер';
  const el = document.getElementById('mgr-greeting');
  if(el) el.textContent = `${greet}, ${state.user?.name||''}!`;

  const pending  = orders.filter(o=>o.status==='pending').length;
  const inWork   = orders.filter(o=>['confirmed','assembling'].includes(o.status)).length;
  const shipped  = orders.filter(o=>o.status==='shipped').length;
  const todayStr = new Date().toISOString().slice(0,10);
  const todayCnt = orders.filter(o=>o.createdAt?.slice(0,10)===todayStr).length;

  const row = document.getElementById('mgr-stats-row');
  if(row) row.innerHTML=`
    <div class="kpi-card" style="--kpi-color:var(--amber)">
      <div class="kpi-label">Ожидают</div>
      <div class="kpi-val">${pending}</div>
      <div class="kpi-sub">нужно принять</div>
    </div>
    <div class="kpi-card" style="--kpi-color:var(--blue)">
      <div class="kpi-label">В работе</div>
      <div class="kpi-val">${inWork}</div>
      <div class="kpi-sub">подтверждены / сборка</div>
    </div>
    <div class="kpi-card" style="--kpi-color:var(--green)">
      <div class="kpi-label">Сегодня</div>
      <div class="kpi-val">${todayCnt}</div>
      <div class="kpi-sub">новых заказов</div>
    </div>
    <div class="kpi-card" style="--kpi-color:var(--accent)">
      <div class="kpi-label">Отгружено</div>
      <div class="kpi-val">${shipped}</div>
      <div class="kpi-sub">всего</div>
    </div>`;

  const pendingOrders = orders.filter(o=>o.status==='pending');
  const pb = document.getElementById('mgr-pending-tbody');
  if(pb) pb.innerHTML = pendingOrders.length
    ? pendingOrders.map(o=>`<tr style="background:rgba(245,158,11,.04)">
        <td><span style="font-family:var(--font-mono);color:var(--accent);font-size:12px">${o.id}</span></td>
        <td>${o.contact?.name||'—'}</td>
        <td style="font-family:var(--font-mono);font-size:12px">${o.contact?.phone||'—'}</td>
        <td style="text-align:center">${o.items?.length||0}</td>
        <td style="font-family:var(--font-mono)">${fmt(o.total)}</td>
        <td style="font-size:12px">${delivLabel(o.delivery)}</td>
        <td><button class="admin-btn" style="background:var(--green);color:#000;font-weight:700" onclick="acceptOrder('${o.id}')">✓ Принять</button></td>
      </tr>`).join('')
    : `<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--green)">✓ Нет новых заказов — всё обработано!</td></tr>`;

  const mySalesAll = getSales().filter(s=>s.managerId===state.user?.login);
  const mySalesToday = mySalesAll.filter(s=>s.createdAt.startsWith(todayStr));
  const mySaleTotal = mySalesToday.reduce((a,s)=>a+s.total,0);

  const row2 = document.getElementById('mgr-stats-row');
  if(row2){
    row2.innerHTML += `
    <div class="kpi-card" style="--kpi-color:var(--accent)">
      <div class="kpi-label">Мои продажи сегодня</div>
      <div class="kpi-val">${mySalesToday.length}</div>
      <div class="kpi-sub">${fmt(mySaleTotal)}</div>
    </div>`;
  }

  const rb = document.getElementById('mgr-recent-tbody');
  if(rb) rb.innerHTML = orders.slice(0,8).map(o=>`<tr>
    <td><span style="font-family:var(--font-mono);color:var(--accent);font-size:12px">${o.id}</span></td>
    <td style="font-size:12px;color:var(--text3)">${fmtDate(o.createdAt)}</td>
    <td>${o.contact?.name||'—'}</td>
    <td style="font-family:var(--font-mono)">${fmt(o.total)}</td>
    <td><span class="status-badge ${STATUS_CSS[o.status]||'st-new'}">${STATUS_LABELS[o.status]||o.status}</span></td>
  </tr>`).join('');
}

function renderBuhHome(){
  const orders = getOrders().filter(o=>!['cancelled','pending'].includes(o.status));
  const fmt = n=>(n||0).toLocaleString('ru-RU')+' ₽';

  const now=new Date();
  const y=now.getFullYear(), m=now.getMonth();
  const monthOrders = orders.filter(o=>{
    const d=new Date(o.createdAt);
    return d.getFullYear()===y&&d.getMonth()===m;
  });

  let totRev=0,totCost=0,totProfit=0;
  monthOrders.forEach(o=>{
    const rev=o.total||0;
    const cost=o.items?.reduce((s,i)=>s+(i.price_input||i.price_wholesale||(i.price_retail*.70))*(i.quantity||1),0)||0;
    totRev+=rev; totCost+=cost; totProfit+=rev-cost;
  });

  const row = document.getElementById('buh-stats-row');
  if(row) row.innerHTML=`
    <div class="kpi-card" style="--kpi-color:var(--blue)">
      <div class="kpi-label">Заказов за месяц</div>
      <div class="kpi-val">${monthOrders.length}</div>
      <div class="kpi-sub">${now.toLocaleDateString('ru-RU',{month:'long',year:'numeric'})}</div>
    </div>
    <div class="kpi-card" style="--kpi-color:var(--text2)">
      <div class="kpi-label">Выручка</div>
      <div class="kpi-val" style="font-size:20px">${fmt(totRev)}</div>
    </div>
    <div class="kpi-card" style="--kpi-color:var(--accent)">
      <div class="kpi-label">Себестоимость</div>
      <div class="kpi-val" style="font-size:20px">${fmt(totCost)}</div>
    </div>
    <div class="kpi-card" style="--kpi-color:var(--green)">
      <div class="kpi-label">Чистая прибыль</div>
      <div class="kpi-val" style="font-size:20px">${fmt(totProfit)}</div>
    </div>`;

  const tb = document.getElementById('buh-orders-tbody');
  if(tb) tb.innerHTML = monthOrders.slice(0,20).map(o=>{
    const rev=o.total||0;
    const cost=o.items?.reduce((s,i)=>s+(i.price_input||i.price_wholesale||(i.price_retail*.70))*(i.quantity||1),0)||0;
    const profit=rev-cost;
    return`<tr>
      <td><span style="font-family:var(--font-mono);color:var(--accent);font-size:12px">${o.id}</span></td>
      <td style="font-size:12px;color:var(--text3)">${fmtDate(o.createdAt)}</td>
      <td>${o.contact?.name||'—'}</td>
      <td style="font-family:var(--font-mono)">${fmt(rev)}</td>
      <td style="font-family:var(--font-mono);color:${profit>=0?'var(--green)':'var(--accent)'}">${fmt(profit)}</td>
      <td><span class="status-badge ${STATUS_CSS[o.status]||'st-new'}">${STATUS_LABELS[o.status]||o.status}</span></td>
    </tr>`;
  }).join('')||`<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--text3)">Нет данных за месяц</td></tr>`;
}

function renderWhHome(){
  const orders = getOrders().filter(o=>['confirmed','assembling'].includes(o.status));
  const allOrders = getOrders();
  const fmt = n=>(n||0).toLocaleString('ru-RU')+' ₽';

  const row = document.getElementById('wh-stats-row');
  if(row) row.innerHTML=`
    <div class="kpi-card" style="--kpi-color:var(--blue)">
      <div class="kpi-label">На сборке</div>
      <div class="kpi-val">${allOrders.filter(o=>o.status==='assembling').length}</div>
    </div>
    <div class="kpi-card" style="--kpi-color:var(--amber)">
      <div class="kpi-label">Ожидают сборки</div>
      <div class="kpi-val">${allOrders.filter(o=>o.status==='confirmed').length}</div>
    </div>
    <div class="kpi-card" style="--kpi-color:var(--green)">
      <div class="kpi-label">Отгружено всего</div>
      <div class="kpi-val">${allOrders.filter(o=>o.status==='shipped').length}</div>
    </div>`;

  const tb = document.getElementById('wh-orders-tbody');
  if(tb) tb.innerHTML = orders.length
    ? orders.map(o=>`<tr>
        <td><span style="font-family:var(--font-mono);color:var(--accent);font-size:12px">${o.id}</span></td>
        <td style="font-size:12px;color:var(--text3)">${fmtDate(o.createdAt)}</td>
        <td>${o.contact?.name||'—'}</td>
        <td style="text-align:center">${o.items?.length||0}</td>
        <td style="font-size:12px">${delivLabel(o.delivery)}</td>
        <td><span class="status-badge ${STATUS_CSS[o.status]||'st-new'}">${STATUS_LABELS[o.status]||o.status}</span></td>
        <td>
          ${o.status==='confirmed'?`<button class="admin-btn admin-btn-primary" onclick="updateOrderStatus('${o.id}','assembling');renderWhHome()">▶ Начать сборку</button>`:''}
          ${o.status==='assembling'?`<button class="admin-btn admin-btn-green" onclick="updateOrderStatus('${o.id}','shipped');renderWhHome()">✓ Собран / отгружен</button>`:''}
        </td>
      </tr>`).join('')
    : `<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--text3)">Нет заказов в сборке</td></tr>`;
}

function renderWhStock(){
  const stock = getWHStock();
  const q = (document.getElementById('wh-stock-search')?.value||'').toLowerCase();
  let items = Object.values(stock);
  if(q) items = items.filter(i=>
    (i.article||'').toLowerCase().includes(q)||
    (i.brand||'').toLowerCase().includes(q)||
    (i.name||'').toLowerCase().includes(q)
  );
  const tb = document.getElementById('wh-stock-tbody');
  if(!tb) return;
  tb.innerHTML = items.length
    ? items.map(i=>`<tr>
        <td style="font-family:var(--font-mono);font-size:12px;color:var(--accent)">${i.article||'—'}</td>
        <td style="font-weight:600">${i.brand||'—'}</td>
        <td style="font-size:13px;color:var(--text2)">${i.name||'—'}</td>
        <td style="text-align:center;font-weight:700;color:${i.quantity>0?'var(--green)':'var(--accent)'}">${i.quantity||0}</td>
        <td style="font-size:12px;color:var(--text3)">${i.supplier||'—'}</td>
        <td style="font-size:12px;color:var(--text3)">${i.receivedAt?fmtDate(i.receivedAt):'—'}</td>
      </tr>`).join('')
    : `<tr><td colspan="6" style="text-align:center;padding:32px;color:var(--text3)">${q?'Ничего не найдено':'Склад пуст'}</td></tr>`;
}

function renderMyOrders(){
  const login = state.user?.login;
  const orders = getOrders().filter(o=>o.contact?.login===login||o.contact?.phone===state.user?.phone);
  const fmt = n=>(n||0).toLocaleString('ru-RU')+' ₽';
  const el = document.getElementById('my-orders-list');
  if(!el) return;
  if(!orders.length){
    el.innerHTML=`
      <div style="text-align:center;padding:60px 0">
        <div style="font-size:40px;margin-bottom:12px">🛍</div>
        <div style="font-size:16px;font-weight:600;color:var(--text);margin-bottom:6px">Заказов пока нет</div>
        <div style="font-size:13px;color:var(--text3)">После оформления заказа он появится здесь</div>
        <button class="admin-btn admin-btn-primary" style="margin-top:20px" onclick="showPage('search')">
          Перейти к поиску →
        </button>
      </div>`;
    return;
  }
  el.innerHTML = orders.map(o=>`
    <div class="order-card">
      <div class="order-card-header">
        <div>
          <div class="order-card-id">${o.id}</div>
          <div class="order-card-date">${fmtDate(o.createdAt,true)}</div>
        </div>
        <div style="display:flex;align-items:center;gap:12px">
          <div class="order-card-total">${fmt(o.total)}</div>
          <span class="status-badge ${STATUS_CSS[o.status]||'st-new'}">${STATUS_LABELS[o.status]||o.status}</span>
        </div>
      </div>
      <div style="height:1px;background:var(--line);margin:8px 0"></div>
      <div class="order-card-items">
        ${(o.items||[]).slice(0,5).map(i=>`
          <div class="order-card-item">
            <span style="color:var(--accent);font-family:var(--font-mono)">${i.article}</span>
            <span>${i.brand}</span>
            <span style="color:var(--text3)">${i.name}</span>
            <span style="margin-left:auto;color:var(--text)">×${i.quantity} — ${fmt(i.price_retail*i.quantity)}</span>
          </div>`).join('')}
        ${o.items?.length>5?`<div style="font-size:11px;color:var(--text3)">... и ещё ${o.items.length-5} поз.</div>`:''}
      </div>
      <div style="margin-top:10px;font-size:12px;color:var(--text3)">
        📦 ${delivLabel(o.delivery)}
        ${o.comment?` · 💬 ${o.comment}`:''}
      </div>
    </div>`).join('');
}

function renderMyProfile(){
  const u = state.user;
  const reg = u?.login ? getUsers().find(x=>x.login===u.login) : null;
  const onec = u?.login ? (getOnecProfiles()[u.login]||{}) : {};
  const el = document.getElementById('my-profile-content');
  if(!el) return;

  const meta = ROLE_META[state.role]||ROLE_META.customer;
  const avatar=getUserAvatar(u?.login||'');
  const nickname=getUserNickname(u?.login||'')||u?.name||'';
  el.innerHTML=`
    <div class="role-panel-hero" style="align-items:flex-start;gap:20px;flex-wrap:wrap">
      <!-- Avatar upload -->
      <div>
        <div class="prof-avatar-wrap" onclick="document.getElementById('avatar-file-input').click()" title="Нажмите, чтобы сменить фото">
          ${avatar
            ? `<img src="${avatar}" class="prof-avatar-img" alt="">`
            : `<div class="prof-avatar-letter" style="background:${meta.bg};color:${meta.color}">${u?.name?.[0]||'?'}</div>`}
          <div class="prof-avatar-overlay">📷</div>
        </div>
        <input type="file" id="avatar-file-input" accept="image/*" style="display:none" onchange="uploadProfileAvatar(this)">
        ${avatar?`<button onclick="removeProfileAvatar()" style="display:block;width:80px;margin-top:6px;padding:3px 0;font-size:11px;color:var(--accent);background:transparent;border:none;cursor:pointer;text-align:center">Удалить</button>`:''}
      </div>
      <div style="flex:1;min-width:180px">
        <div class="role-panel-title">${nickname||'—'}</div>
        <div class="role-panel-sub">${meta.label} · @${u?.login||''}</div>
        ${reg?.phone?`<div style="font-size:13px;color:var(--text3);margin-top:4px">📞 ${reg.phone}</div>`:''}
      </div>
    </div>

    ${onec.counterpartyId?`
    <div style="background:var(--greenbg);border:1px solid rgba(34,197,94,.3);border-radius:var(--r2);padding:16px 20px;margin-bottom:20px">
      <div style="font-weight:600;color:var(--green);margin-bottom:8px">🔗 Привязка к 1С</div>
      <div style="font-size:13px;color:var(--text2);line-height:1.8">
        Контрагент: <strong>${onec.counterpartyId}</strong>${onec.orgName?' · '+onec.orgName:''}<br>
        ${onec.inn?'ИНН: '+onec.inn+'<br>':''}
        ${onec.contract?'Договор: '+onec.contract+'<br>':''}
        ${onec.creditLimit?'Кредитный лимит: '+Number(onec.creditLimit).toLocaleString('ru-RU')+' ₽':''}
      </div>
    </div>`:
    `<div style="background:var(--bg3);border:1px solid var(--line2);border-radius:var(--r2);padding:16px 20px;margin-bottom:20px;color:var(--text3);font-size:13px">
      ℹ️ 1С не привязан — обратитесь к менеджеру для привязки профиля
    </div>`}

    <div class="profile-form">
      <div class="profile-field">
        <div class="profile-label">Отображаемый ник (необязательно)</div>
        <input class="profile-input" id="prof-nickname" value="${escHtml(getUserNickname(u?.login||''))}" placeholder="Как вас называть в сервисе?">
      </div>
      <div class="profile-field">
        <div class="profile-label">Имя</div>
        <input class="profile-input" id="prof-name" value="${escHtml(u?.name||'')}" placeholder="Ваше имя">
      </div>
      <div class="profile-field">
        <div class="profile-label">Телефон</div>
        <input class="profile-input" id="prof-phone" value="${escHtml(reg?.phone||'')}" placeholder="+7 (900) 000-00-00">
      </div>
      <div class="profile-field">
        <div class="profile-label">Логин</div>
        <input class="profile-input" value="${escHtml(u?.login||'')}" disabled style="opacity:.5">
      </div>
      <div class="profile-field">
        <div class="profile-label">Новый пароль (оставьте пустым, чтобы не менять)</div>
        <input class="profile-input" id="prof-newpass" type="password" placeholder="••••••••">
      </div>
      <button class="admin-btn admin-btn-primary" onclick="saveMyProfile()">Сохранить</button>
    </div>`;
}

function saveMyProfile(){
  const name = document.getElementById('prof-name')?.value.trim();
  const phone = document.getElementById('prof-phone')?.value.trim();
  const newPass = document.getElementById('prof-newpass')?.value;
  const nickname = document.getElementById('prof-nickname')?.value.trim();
  const login = state.user?.login;
  if(!login||!name){showToast('Заполните имя','red');return;}

  const users = getUsers();
  const reg = users.find(u=>u.login===login);
  if(reg){
    reg.name=name; reg.phone=phone;
    if(newPass&&newPass.length>=6) reg.password=newPass;
    else if(newPass&&newPass.length<6){showToast('Пароль — минимум 6 символов','red');return;}
    saveUsers(users);
  }
  if(nickname!==undefined) setUserNickname(login, nickname);
  state.user.name=name;
  sessionStorage.setItem('dp_session',JSON.stringify(state.user));
  renderAuthHeader();
  showToast('Профиль сохранён','green');
  renderMyProfile();
}

function escHtml(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

function applyTheme(){
  const t=localStorage.getItem('dp_theme')||'dark';
  document.documentElement.classList.toggle('light',t==='light');
}
function toggleTheme(){
  const isLight=document.documentElement.classList.contains('light');
  localStorage.setItem('dp_theme',isLight?'dark':'light');
  document.documentElement.classList.toggle('light',!isLight);
  renderAuthHeader(); 
}

function getAvatarStore(){try{return JSON.parse(localStorage.getItem('dp_avatars')||'{}');}catch{return{};}}
function saveAvatarStore(obj){localStorage.setItem('dp_avatars',JSON.stringify(obj));}
function getUserAvatar(login){if(!login)return'';return getAvatarStore()[login]||'';}
function setUserAvatar(login,b64){const s=getAvatarStore();s[login]=b64;saveAvatarStore(s);}
function removeUserAvatar(login){const s=getAvatarStore();delete s[login];saveAvatarStore(s);}

function getNicknameStore(){try{return JSON.parse(localStorage.getItem('dp_nicknames')||'{}');}catch{return{};}}
function saveNicknameStore(obj){localStorage.setItem('dp_nicknames',JSON.stringify(obj));}
function getUserNickname(login){if(!login)return'';return getNicknameStore()[login]||'';}
function setUserNickname(login,nick){const s=getNicknameStore();if(nick)s[login]=nick;else delete s[login];saveNicknameStore(s);}

function uploadProfileAvatar(input){
  const file=input.files[0];
  if(!file)return;
  if(file.size>2*1024*1024){showToast('Фото не должно превышать 2 МБ','red');return;}
  const reader=new FileReader();
  reader.onload=e=>{
    setUserAvatar(state.user.login,e.target.result);
    renderAuthHeader();
    renderMyProfile();
    showToast('Фото профиля обновлено','green');
  };
  reader.readAsDataURL(file);
}
function removeProfileAvatar(){
  removeUserAvatar(state.user.login);
  renderAuthHeader();
  renderMyProfile();
  showToast('Фото удалено','amber');
}

function getBanners(){try{return JSON.parse(localStorage.getItem('dp_banners')||'[]');}catch{return[];}}
function saveBanners(arr){localStorage.setItem('dp_banners',JSON.stringify(arr));}

function renderHomeBanners(){
  const wrap=document.getElementById('home-banners-wrap');
  if(!wrap)return;
  const banners=getBanners().filter(b=>b.active);
  if(!banners.length){wrap.innerHTML='';return;}
  const ICONS={sale:'🔥',promo:'🎁',info:'ℹ️',news:'📢'};
  const LABELS={sale:'Акция',promo:'Промокод',info:'Инфо',news:'Новость'};
  const COLORS={
    sale:{grad:'linear-gradient(135deg,#e8411a 0%,#ff6b45 100%)',badge:'#fff',text:'rgba(255,255,255,.85)'},
    promo:{grad:'linear-gradient(135deg,#d97706 0%,#f59e0b 100%)',badge:'#000',text:'rgba(0,0,0,.75)'},
    info:{grad:'linear-gradient(135deg,#1d4ed8 0%,#3b82f6 100%)',badge:'#fff',text:'rgba(255,255,255,.85)'},
    news:{grad:'linear-gradient(135deg,#15803d 0%,#22c55e 100%)',badge:'#000',text:'rgba(0,0,0,.75)'},
  };
  wrap.innerHTML=`<div class="banners-section">
    ${banners.map(b=>{
      const c=COLORS[b.type||'info']||COLORS.info;
      return `<div class="banner-card type-${b.type||'info'}" style="background:${c.grad};border:none;${b.img?'min-height:160px':''}">
        ${b.img?`<div style="width:140px;height:100%;min-height:120px;flex-shrink:0;overflow:hidden;border-radius:10px;margin:-22px 0 -22px -28px"><img src="${b.img}" style="width:100%;height:100%;object-fit:cover;min-height:140px" alt=""></div>`:`<div class="banner-icon" style="font-size:40px;filter:drop-shadow(0 2px 6px rgba(0,0,0,.3))">${ICONS[b.type||'info']}</div>`}
        <div class="banner-body">
          <div class="banner-title" style="color:#fff;font-size:19px;font-weight:800;text-shadow:0 1px 3px rgba(0,0,0,.3)">${escHtml(b.title)}</div>
          ${b.text?`<div class="banner-text" style="color:${c.text};margin-top:4px">${escHtml(b.text)}</div>`:''}
          ${b.type==='promo'&&b.code?`<div style="margin-top:10px"><span style="font-family:var(--font-mono);font-size:15px;font-weight:800;background:rgba(255,255,255,.2);color:#fff;padding:5px 14px;border-radius:6px;border:2px dashed rgba(255,255,255,.5);letter-spacing:.08em">📋 ${escHtml(b.code)}</span></div>`:''}
        </div>
        <div class="banner-badge" style="background:rgba(255,255,255,.25);color:#fff;backdrop-filter:blur(4px);border:1px solid rgba(255,255,255,.3)">${LABELS[b.type||'info']}</div>
      </div>`;
    }).join('')}
  </div>`;
}

function renderCreatorBanners(){
  if(state.role!=='creator')return;
  const el=document.getElementById('cr-banners-content');
  if(!el)return;
  const banners=getBanners();
  const ICONS={sale:'🔥',promo:'🎁',info:'ℹ️',news:'📢'};
  const LABELS={sale:'Акция',promo:'Промокод',info:'Инфо',news:'Новость'};
  el.innerHTML=`
  <!-- Add form -->
  <div class="be-form">
    <div style="font-size:14px;font-weight:700;color:var(--text);margin-bottom:14px">➕ Новый баннер</div>
    <div class="form-grid" style="gap:12px;margin-bottom:12px">
      <div class="form-group">
        <label class="form-label">Тип</label>
        <select class="admin-filter-select" id="be-type" onchange="renderBePromoField()" style="width:100%">
          <option value="sale">🔥 Акция</option>
          <option value="promo">🎁 Промокод</option>
          <option value="info">ℹ️ Инфо</option>
          <option value="news">📢 Новость</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Заголовок</label>
        <input class="admin-filter-input" id="be-title" placeholder="Скидка 20% на тормозные колодки" style="width:100%">
      </div>
      <div class="form-group full">
        <label class="form-label">Описание (необязательно)</label>
        <input class="admin-filter-input" id="be-text" placeholder="Подробнее об акции..." style="width:100%">
      </div>
      <div class="form-group" id="be-promo-wrap" style="display:none">
        <label class="form-label">Промокод</label>
        <input class="admin-filter-input" id="be-code" placeholder="GARAGE20" style="width:100%;font-family:var(--font-mono);text-transform:uppercase">
      </div>
      <div class="form-group full">
        <label class="form-label">Изображение (необязательно, до 2 МБ)</label>
        <div style="display:flex;align-items:center;gap:12px">
          <input type="file" id="be-img-input" accept="image/*" onchange="previewBannerImg(this)" style="display:none">
          <button class="admin-btn admin-btn-outline" onclick="document.getElementById('be-img-input').click()" type="button">📷 Выбрать фото</button>
          <span id="be-img-name" style="font-size:12px;color:var(--text3)">Не выбрано</span>
        </div>
        <div id="be-img-preview" style="margin-top:10px;display:none">
          <img id="be-img-thumb" style="max-height:120px;border-radius:var(--r2);border:1px solid var(--line2)" alt="">
          <button onclick="clearBannerImg()" style="display:block;margin-top:6px;font-size:11px;color:var(--accent);background:transparent;border:none;cursor:pointer">✕ Удалить</button>
        </div>
      </div>
    </div>
    <button class="admin-btn admin-btn-primary" onclick="addBanner()">Добавить баннер</button>
  </div>
  <!-- Existing banners -->
  <div style="font-size:13px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:.06em;margin-bottom:12px">Баннеры (${banners.length})</div>
  ${banners.length===0?`<div style="padding:24px;text-align:center;color:var(--text3);font-size:13px;background:var(--bg3);border-radius:var(--r2)">Нет баннеров — создайте первый выше</div>`:''}
  <div class="be-preview-list">
    ${banners.map((b,i)=>`
    <div class="be-item">
      <div style="font-size:24px;width:36px;text-align:center;flex-shrink:0">${ICONS[b.type||'info']}</div>
      <div class="be-item-body">
        <div style="font-weight:700;color:var(--text);font-size:14px">${escHtml(b.title)}</div>
        ${b.text?`<div style="font-size:12px;color:var(--text3);margin-top:2px">${escHtml(b.text)}</div>`:''}
        ${b.code?`<div style="font-size:11px;color:var(--amber);margin-top:4px;font-family:var(--font-mono)">Промокод: ${escHtml(b.code)}</div>`:''}
        <div style="font-size:11px;color:var(--text3);margin-top:4px">${LABELS[b.type||'info']} · ${b.createdAt?new Date(b.createdAt).toLocaleDateString('ru-RU'):''}</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end;flex-shrink:0">
        <label style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--text2);cursor:pointer;white-space:nowrap">
          <input type="checkbox" ${b.active?'checked':''} onchange="toggleBanner(${i},this.checked)"> Активен
        </label>
        <button class="admin-btn" style="font-size:11px;padding:3px 10px;color:var(--accent)" onclick="deleteBanner(${i})">Удалить</button>
      </div>
    </div>`).join('')}
  </div>`;
}
function renderBePromoField(){
  const t=document.getElementById('be-type')?.value;
  const wrap=document.getElementById('be-promo-wrap');
  if(wrap) wrap.style.display=t==='promo'?'':'none';
}
let _bannerImgData = '';
function previewBannerImg(input){
  const file=input.files[0];
  if(!file)return;
  if(file.size>2*1024*1024){showToast('Фото не должно превышать 2 МБ','red');input.value='';return;}
  const reader=new FileReader();
  reader.onload=e=>{
    _bannerImgData=e.target.result;
    document.getElementById('be-img-name').textContent=file.name;
    document.getElementById('be-img-thumb').src=_bannerImgData;
    document.getElementById('be-img-preview').style.display='block';
  };
  reader.readAsDataURL(file);
}
function clearBannerImg(){
  _bannerImgData='';
  const inp=document.getElementById('be-img-input');
  if(inp) inp.value='';
  document.getElementById('be-img-name').textContent='Не выбрано';
  document.getElementById('be-img-preview').style.display='none';
}
function addBanner(){
  const type=document.getElementById('be-type')?.value||'info';
  const title=(document.getElementById('be-title')?.value||'').trim();
  const text=(document.getElementById('be-text')?.value||'').trim();
  const code=(document.getElementById('be-code')?.value||'').trim().toUpperCase();
  if(!title){showToast('Введите заголовок','red');return;}
  const banners=getBanners();
  banners.unshift({type,title,text,code:type==='promo'?code:'',img:_bannerImgData||'',active:true,createdAt:new Date().toISOString()});
  saveBanners(banners);
  _bannerImgData='';
  renderHomeBanners();
  renderCreatorBanners();
  showToast('Баннер добавлен','green');
}
function toggleBanner(idx,active){
  const banners=getBanners();
  if(banners[idx])banners[idx].active=active;
  saveBanners(banners);
  renderHomeBanners();
}
function deleteBanner(idx){
  if(!confirm('Удалить баннер?'))return;
  const banners=getBanners();
  banners.splice(idx,1);
  saveBanners(banners);
  renderHomeBanners();
  renderCreatorBanners();
  showToast('Баннер удалён','amber');
}

let coClientType='person'; 
let coPayMethod='sbp';     

function setClientType(t){
  coClientType=t;
  document.querySelectorAll('.ct-tab').forEach(el=>el.classList.remove('active'));
  document.getElementById('ctab-'+t)?.classList.add('active');
  const ipFields=document.getElementById('ip-fields');
  if(ipFields) ipFields.style.display=t==='ip'?'':'none';
  updatePrepayPanel();
}
function setPayMethod(m){
  coPayMethod=m;
  document.querySelectorAll('.pay-tab').forEach(el=>el.classList.remove('active'));
  document.getElementById('ptab-'+m)?.classList.add('active');
  renderPayInfoPanel();
}
function renderPayInfoPanel(){
  const el=document.getElementById('pay-info-panel');
  if(!el)return;
  const subtotal=getCartSubtotal();
  const delivery=state.delivery||'pickup';
  const delivCost=delivery==='cdek_pvz'?(state.selectedPvz?.cost||299):delivery==='cdek_courier'?499:0;
  const total=subtotal+delivCost;
  const hasInStock=state.cart&&state.cart.some(i=>i.source==='1c'||i.inStock);
  const isIp=coClientType==='ip';
  const prepay=delivery!=='pickup'?total:(isIp||hasInStock)?0:Math.ceil(total*0.2);

  if(coPayMethod==='sbp'){
    const phone='79604641955';
    const amt=prepay>0?prepay:total;
    
    const qrData=encodeURIComponent(`https://qr.nspk.ru/0/?phone=%2B${phone}&sum=${amt*100}&purpose=Заказ+ДК+ГАРАЖ`);
    const qrUrl=`https://api.qrserver.com/v1/create-qr-code/?size=180x180&color=22-197-94&bgcolor=13-15-16&data=${qrData}`;
    el.innerHTML=`
      <div class="pay-detail-box" style="text-align:center">
        <div style="font-size:12px;color:var(--text3);margin-bottom:10px;text-transform:uppercase;letter-spacing:.06em">Оплата через СБП</div>
        <div style="display:flex;gap:20px;align-items:center;justify-content:center;flex-wrap:wrap">
          <div>
            <img src="${qrUrl}" width="160" height="160" style="border-radius:8px;border:2px solid var(--line2)" alt="QR СБП">
            <div style="font-size:10px;color:var(--text3);margin-top:4px">Сканируй камерой или<br>приложением банка</div>
          </div>
          <div style="text-align:left">
            <div style="font-size:11px;color:var(--text3);margin-bottom:4px">ИЛИ переведи вручную:</div>
            <div style="font-size:11px;color:var(--text3);margin-bottom:2px">Номер телефона СБП:</div>
            <div class="sbp-phone" style="font-size:22px;margin:4px 0">+7 (960) 451-31-69</div>
            <div class="sbp-bank">Т-Банк · Дорожный комплекс ГАРАЖ</div>
            ${amt>0?`<div style="margin-top:8px;padding:8px 12px;background:var(--greenbg);border-radius:var(--r);border:1px solid rgba(34,197,94,.3)">
              <div style="font-size:11px;color:var(--text3)">Сумма к оплате:</div>
              <div style="font-size:20px;font-weight:700;color:var(--green)">${amt.toLocaleString('ru-RU')} ₽</div>
            </div>`:''}
            <div style="margin-top:8px;font-size:11px;color:var(--text3)">💬 В комментарии укажите номер заказа</div>
          </div>
        </div>
        <div style="margin-top:12px;font-size:11px;color:var(--text3)">
          После оплаты нажмите «Оформить заказ» и прикрепите скриншот чека
        </div>
      </div>`;
  } else {
    el.innerHTML=`<div class="pay-detail-box">
      <div style="font-size:12px;color:var(--text3);margin-bottom:8px">Оплата банковской картой</div>
      <div style="font-size:13px;color:var(--text2);line-height:1.7">Оплата картой производится у нас в офисе или через терминал при получении заказа.<br>Принимаем карты Visa, Mastercard, МИР.</div>
    </div>`;
  }
}
function updatePrepayPanel(){
  const el=document.getElementById('prepay-info-panel');
  if(!el)return;
  const delivery=state.delivery||'pickup';
  const subtotal=getCartSubtotal();
  const prepay20=Math.ceil(subtotal*0.2);
  const hasInStock=state.cart&&state.cart.some(i=>i.source==='1c'||i.inStock);

  let html='';
  if(delivery==='pickup'&&coClientType==='ip'){
    html=`<div class="prepay-info">💼 <strong>ИП / Юрлицо + самовывоз:</strong> предоплата не требуется. Резерв товара — <strong>7 дней</strong> с момента поступления на склад. По истечении срока резерв снимается автоматически.</div>`;
  } else if(delivery==='pickup'&&hasInStock){
    html=`<div class="prepay-info" style="background:var(--greenbg);border-color:rgba(34,197,94,.3);color:var(--green)">✅ <strong>Товар уже на складе:</strong> предоплата не требуется. За вами закрепляется резерв на <strong>7 дней</strong>. Если не заберёте — резерв снимается.</div>`;
  } else if(delivery==='pickup'){
    html=`<div class="prepay-info">🏪 <strong>Самовывоз — предоплата ${prepay20.toLocaleString('ru-RU')} ₽</strong> (20% от суммы заказа).<br>Если не придёте за заказом в течение <strong>7 дней</strong> после доставки к нам — предоплата сгорает.</div>`;
  } else {
    html=`<div class="prepay-info" style="background:var(--accentbg);border-color:rgba(232,65,26,.3);color:var(--accent2)">🚚 <strong>Доставка (СДЭК) — полная оплата ${subtotal.toLocaleString('ru-RU')} ₽.</strong><br>Оплата производится до отправки заказа.</div>`;
  }
  el.innerHTML=html;
}

const FAQ_DATA = [
  {
    cat: 'orders',
    label: '🛒 Заказы',
    items: [
      {
        q: 'Как оформить заказ?',
        a: 'Найдите нужную запчасть через каталог или поиск по VIN-номеру, добавьте товар в корзину и нажмите «Оформить заказ». Заполните контактные данные и выберите способ доставки и оплаты. После подтверждения вы получите номер заказа.'
      },
      {
        q: 'Как узнать статус заказа?',
        a: 'Войдите в личный кабинет и перейдите в раздел «Мои заказы». Там отображается текущий статус: Принят → Обрабатывается → Собран → Отгружен → Доставлен. Также мы отправляем уведомления на указанный e-mail.'
      },
      {
        q: 'Можно ли изменить или отменить заказ?',
        a: 'Заказ можно отменить или изменить в течение 1 часа после оформления, пока он не передан на сборку. Для этого позвоните нам по телефону 8 800 123-45-67 или напишите в Telegram. После начала сборки изменения могут быть ограничены.'
      },
      {
        q: 'Что делать, если товар закончился на складе?',
        a: 'Если выбранного товара нет в наличии, менеджер свяжется с вами для предложения аналога или уточнения срока поставки. Обычно срок ожидания составляет 3–7 рабочих дней. Вы можете отказаться от заказа без штрафных санкций.'
      },
      {
        q: 'Есть ли минимальная сумма заказа?',
        a: 'Минимальной суммы заказа нет. Вы можете заказать даже один недорогой расходник. При заказе от 5 000 ₽ доставка по России бесплатна.'
      }
    ]
  },
  {
    cat: 'delivery',
    label: '🚚 Доставка',
    items: [
      {
        q: 'Какие сроки доставки?',
        a: 'Доставка по Москве и МО: 1–2 рабочих дня. По России (СДЭК, Boxberry, Почта России): 3–10 рабочих дней в зависимости от региона. Самовывоз из нашего склада: в день заказа при наличии товара. Точные сроки уточняются при оформлении.'
      },
      {
        q: 'В какие регионы вы доставляете?',
        a: 'Мы доставляем по всей России, включая труднодоступные регионы. Для Крыма, ДНР, ЛНР и некоторых других территорий доступна только доставка Почтой России. Доставки за рубеж пока нет.'
      },
      {
        q: 'Сколько стоит доставка?',
        a: 'Доставка рассчитывается индивидуально в зависимости от веса, габаритов и региона. При заказе от 5 000 ₽ — бесплатно по всей России. Стоимость отображается при оформлении заказа до подтверждения.'
      },
      {
        q: 'Можно ли забрать заказ самовывозом?',
        a: 'Да, самовывоз доступен с нашего склада по адресу: Каменск-Шахтинский, ул. Героев Пионеров, д. 95 (932 км трассы М4 «Дон»). Режим работы: ежедневно 8:00–20:00 (без выходных). Перед приездом убедитесь, что заказ перешёл в статус «Собран».'
      },
      {
        q: 'Что делать, если заказ не пришёл вовремя?',
        a: 'Если срок доставки истёк — свяжитесь с нами. Мы проверим местонахождение посылки и при необходимости повторно отправим товар или вернём деньги. Вы можете самостоятельно отслеживать трек-номер на сайте службы доставки.'
      }
    ]
  },
  {
    cat: 'payment',
    label: '💳 Оплата',
    items: [
      {
        q: 'Какими способами можно оплатить?',
        a: 'Принимаем: банковские карты Visa/Mastercard/МИР онлайн, оплату через СБП (Систему быстрых платежей), наличными при самовывозе или курьеру (по Москве), безналичный расчёт для юридических лиц.'
      },
      {
        q: 'Безопасна ли оплата картой?',
        a: 'Да. Платёж проходит через защищённый шлюз с шифрованием SSL и поддержкой 3D Secure. Мы не храним данные вашей карты — они передаются напрямую в платёжную систему.'
      },
      {
        q: 'Когда спишутся деньги?',
        a: 'При оплате онлайн — сразу после подтверждения заказа. Если заказ отменяется до отгрузки — возврат поступает на карту в течение 3–5 рабочих дней, в зависимости от банка.'
      },
      {
        q: 'Вы работаете с юридическими лицами?',
        a: 'Да. Для юрлиц доступен безналичный расчёт с НДС и выпиской всех закрывающих документов (счёт, накладная, счёт-фактура). Для оформления напишите на b2b@detalpro.ru.'
      }
    ]
  },
  {
    cat: 'parts',
    label: '🔧 Запчасти',
    items: [
      {
        q: 'Как правильно подобрать запчасть?',
        a: 'Самый точный способ — поиск по VIN-номеру автомобиля. VIN (17 символов) указан в ПТС, СТС, на табличке под капотом или у основания лобового стекла. Введите VIN в поле поиска — система определит марку, модель, год и предложит подходящие запчасти.'
      },
      {
        q: 'Где найти VIN-номер автомобиля?',
        a: 'VIN можно найти в нескольких местах: (1) Паспорт транспортного средства (ПТС); (2) Свидетельство о регистрации (СТС); (3) Таблица под капотом у брандмауэра; (4) У основания лобового стекла со стороны водителя; (5) Порог водительской двери.'
      },
      {
        q: 'Гарантируете ли вы совместимость запчастей?',
        a: 'Мы делаем всё возможное для точного подбора, особенно при поиске по VIN. Однако итоговую проверку совместимости рекомендуем проводить со специалистом. При несовместимости — принимаем возврат в течение 30 дней.'
      },
      {
        q: 'Продаёте ли вы оригинальные запчасти?',
        a: 'Да, в нашем каталоге представлены оригинальные запчасти (OEM) и качественные аналоги проверенных производителей (Bosch, Febi, Gates, SKF и другие). Производитель и оригинальность указаны в карточке товара.'
      },
      {
        q: 'Какая гарантия на запчасти?',
        a: 'Гарантия на большинство запчастей — 12 месяцев или 20 000 км пробега (что наступит раньше). Расходники (фильтры, колодки, лампы) — 3 месяца. Электроника — 6 месяцев. Конкретный срок указан в карточке товара и чеке.'
      }
    ]
  },
  {
    cat: 'returns',
    label: '🔄 Возврат',
    items: [
      {
        q: 'Как вернуть товар?',
        a: 'Для возврата: (1) Свяжитесь с нами в течение 30 дней с момента получения; (2) Укажите номер заказа и причину возврата; (3) Отправьте товар в оригинальной упаковке без следов монтажа; (4) После проверки вернём деньги в течение 5 рабочих дней.'
      },
      {
        q: 'В каких случаях возврат невозможен?',
        a: 'Возврат не принимается: если запчасть была установлена на автомобиль; если нарушена заводская упаковка без уважительной причины; если прошло более 30 дней с момента получения; для товаров из перечня технически сложных изделий, не подлежащих возврату.'
      },
      {
        q: 'Пришла бракованная запчасть — что делать?',
        a: 'Если вы обнаружили брак — не устанавливайте деталь. Сфотографируйте дефект и свяжитесь с нами. Брак подтверждается в течение 3 рабочих дней. Мы бесплатно заменим товар или вернём деньги, включая стоимость обратной доставки.'
      },
      {
        q: 'Когда вернут деньги?',
        a: 'После получения и проверки возврата деньги поступают: на банковскую карту — 3–5 рабочих дней; наличными при самовывозе — в день проверки; для юрлиц на расчётный счёт — 5–7 рабочих дней.'
      }
    ]
  },
  {
    cat: 'account',
    label: '👤 Аккаунт',
    items: [
      {
        q: 'Как зарегистрироваться?',
        a: 'Нажмите кнопку «Войти» в правом верхнем углу сайта и выберите «Создать аккаунт». Укажите имя, e-mail и придумайте пароль. После регистрации вам станет доступна история заказов, скидки и личный кабинет.'
      },
      {
        q: 'Забыл пароль — как восстановить?',
        a: 'На странице входа нажмите «Забыли пароль?» и введите e-mail, привязанный к аккаунту. Мы отправим ссылку для сброса пароля. Письмо приходит в течение 5 минут — проверьте папку «Спам», если не нашли во входящих.'
      },
      {
        q: 'Как изменить контактные данные?',
        a: 'Войдите в личный кабинет и перейдите в раздел «Настройки профиля». Там можно изменить имя, телефон, адрес доставки и пароль. Смена e-mail требует подтверждения через письмо.'
      },
      {
        q: 'Есть ли программа лояльности?',
        a: 'Да! За каждый заказ начисляются бонусные баллы: 1 балл = 1 рубль. Баллами можно оплатить до 30% следующего заказа. Постоянным покупателям с оборотом от 30 000 ₽ доступна карта «Про» со скидкой 5% на все заказы.'
      }
    ]
  }
];

let faqActiveCat = 'all';
let faqSearchQuery = '';

function renderFaq(){
  const list = document.getElementById('faq-list');
  if(!list) return;

  let groups = FAQ_DATA.filter(g => faqActiveCat === 'all' || g.cat === faqActiveCat);

  const q = faqSearchQuery.toLowerCase().trim();
  if(q){
    groups = groups.map(g => ({
      ...g,
      items: g.items.filter(item =>
        item.q.toLowerCase().includes(q) || item.a.toLowerCase().includes(q)
      )
    })).filter(g => g.items.length > 0);
  }

  if(groups.length === 0){
    list.innerHTML = `<div class="faq-no-results"><div class="faq-no-results-icon">🔍</div><div>Ничего не найдено по запросу <b>«${escHtml(q)}»</b><br><span style="font-size:13px;margin-top:6px;display:block">Попробуйте другие слова или выберите другую категорию</span></div></div>`;
    return;
  }

  list.innerHTML = groups.map(g => `
    <div class="faq-group" data-cat="${g.cat}">
      <div class="faq-group-title">${g.label}</div>
      ${g.items.map((item, idx) => {
        const id = `faq-${g.cat}-${idx}`;
        const highlightedQ = q ? highlightFaq(item.q, q) : item.q;
        const highlightedA = q ? highlightFaq(item.a, q) : item.a;
        return `<div class="faq-item" id="${id}">
          <div class="faq-q" onclick="faqToggle('${id}')">
            <span class="faq-q-text">${highlightedQ}</span>
            <span class="faq-q-arrow">⌄</span>
          </div>
          <div class="faq-a"><div class="faq-a-inner">${highlightedA}</div></div>
        </div>`;
      }).join('')}
    </div>
  `).join('');
}

function highlightFaq(text, q){
  const escaped = escHtml(text);
  const escapedQ = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return escaped.replace(new RegExp(`(${escapedQ})`, 'gi'),
    '<mark style="background:rgba(229,77,46,.25);color:inherit;border-radius:2px;padding:0 2px">$1</mark>'
  );
}

function faqToggle(id){
  const el = document.getElementById(id);
  if(!el) return;
  const isOpen = el.classList.contains('open');
  
  el.closest('.faq-group').querySelectorAll('.faq-item.open').forEach(o => o.classList.remove('open'));
  if(!isOpen) el.classList.add('open');
}

function faqFilterCat(cat, btn){
  faqActiveCat = cat;
  document.querySelectorAll('.faq-cat-btn').forEach(b => b.classList.remove('active'));
  if(btn) btn.classList.add('active');
  renderFaq();
}

function faqSearch(val){
  faqSearchQuery = val;
  if(val.trim()){
    
    faqActiveCat = 'all';
    document.querySelectorAll('.faq-cat-btn').forEach(b => b.classList.toggle('active', b.dataset.cat === 'all'));
  }
  renderFaq();
}

let crShowPasswords = false;

function renderCreatorAccounts(){
  if(state.role !== 'creator'){ return; }
  const el = document.getElementById('cr-accounts-content');
  if(!el) return;
  const q = (document.getElementById('cr-acc-search')?.value||'').toLowerCase();

  const sysRows = Object.entries(SYSTEM_ACCOUNTS).map(([login, acc]) => ({
    login, name: acc.name, password: acc.password, role: acc.role,
    phone: acc.phone||'—', type: 'system', createdAt: '—'
  }));

  const regRows = getUsers().map(u => ({
    login: u.login, name: u.name, password: u.password||'—', role: u.role||'customer',
    phone: u.phone||'—', type: 'user', createdAt: u.createdAt ? new Date(u.createdAt).toLocaleDateString('ru-RU') : '—'
  }));

  const all = [...sysRows, ...regRows].filter(r =>
    !q || r.login.toLowerCase().includes(q) || r.name.toLowerCase().includes(q) || r.role.toLowerCase().includes(q)
  );

  const ROLE_LABELS = {creator:'Создатель',boss:'Начальник',admin:'Администратор',manager:'Менеджер',
    accountant:'Бухгалтер',warehouse:'Склад',customer:'Покупатель',hacker:'Аудит'};
  const ROLE_COLORS = {creator:'#f0c040',boss:'var(--accent)',admin:'var(--accent)',manager:'var(--blue)',
    accountant:'var(--green)',warehouse:'var(--amber)',customer:'var(--text3)',hacker:'#a855f7'};

  el.innerHTML = `
    <!-- System accounts -->
    <div class="admin-table-wrap" style="margin-bottom:20px">
      <div class="admin-table-header">
        <div class="admin-table-title">🔒 Системные аккаунты (${sysRows.filter(r=>!q||r.login.toLowerCase().includes(q)||r.name.toLowerCase().includes(q)).length})</div>
      </div>
      <table class="admin-table">
        <thead><tr><th>Логин</th><th>Имя</th><th>Роль</th><th>Пароль</th><th>Телефон</th></tr></thead>
        <tbody>
          ${sysRows.filter(r=>!q||r.login.toLowerCase().includes(q)||r.name.toLowerCase().includes(q)||r.role.toLowerCase().includes(q)).map(r=>`
          <tr>
            <td><span style="font-family:var(--font-mono);color:${ROLE_COLORS[r.role]||'var(--text)'};font-weight:600">${escHtml(r.login)}</span></td>
            <td>${escHtml(r.name)}</td>
            <td><span style="font-size:11px;padding:2px 8px;border-radius:10px;background:${ROLE_COLORS[r.role]||'var(--text3)'}22;color:${ROLE_COLORS[r.role]||'var(--text3)'};font-weight:600">${ROLE_LABELS[r.role]||r.role}</span></td>
            <td><span class="cr-pass-cell${crShowPasswords?' visible':''}" onclick="this.classList.toggle('visible')" title="Нажмите чтобы показать">${escHtml(r.password)}</span></td>
            <td style="font-size:12px;color:var(--text3)">${escHtml(r.phone)}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
    <!-- Registered users -->
    <div class="admin-table-wrap">
      <div class="admin-table-header">
        <div class="admin-table-title">👥 Зарегистрированные пользователи (${regRows.filter(r=>!q||r.login.toLowerCase().includes(q)||r.name.toLowerCase().includes(q)).length})</div>
        <button class="admin-btn admin-btn-outline" style="font-size:11px" onclick="if(confirm('Удалить всех зарегистрированных пользователей?')){localStorage.removeItem('dp_users');renderCreatorAccounts();showToast('Пользователи удалены','amber')}">🗑 Очистить всех</button>
      </div>
      ${regRows.length === 0 ? '<div style="padding:24px;text-align:center;color:var(--text3);font-size:13px">Нет зарегистрированных пользователей</div>' : `
      <table class="admin-table">
        <thead><tr><th>Логин</th><th>Имя</th><th>Роль</th><th>Пароль</th><th>Телефон</th><th>Дата рег.</th><th></th></tr></thead>
        <tbody>
          ${regRows.filter(r=>!q||r.login.toLowerCase().includes(q)||r.name.toLowerCase().includes(q)||r.role.toLowerCase().includes(q)).map(r=>`
          <tr>
            <td><span style="font-family:var(--font-mono);color:var(--text2);font-weight:600">${escHtml(r.login)}</span></td>
            <td>${escHtml(r.name)}</td>
            <td><span style="font-size:11px;padding:2px 8px;border-radius:10px;background:${ROLE_COLORS[r.role]||'var(--text3)'}22;color:${ROLE_COLORS[r.role]||'var(--text3)'};font-weight:600">${ROLE_LABELS[r.role]||r.role}</span></td>
            <td><span class="cr-pass-cell${crShowPasswords?' visible':''}" onclick="this.classList.toggle('visible')" title="Нажмите чтобы показать">${escHtml(r.password)}</span></td>
            <td style="font-size:12px;color:var(--text3)">${escHtml(r.phone)}</td>
            <td style="font-size:12px;color:var(--text3)">${r.createdAt}</td>
            <td><button class="admin-btn" style="font-size:11px;padding:2px 8px;color:var(--accent)" onclick="crDeleteUser('${escHtml(r.login)}')">Удалить</button></td>
          </tr>`).join('')}
        </tbody>
      </table>`}
    </div>`;
}

function crToggleAllPasswords(){
  crShowPasswords = !crShowPasswords;
  document.querySelectorAll('.cr-pass-cell').forEach(el => el.classList.toggle('visible', crShowPasswords));
}

function crDeleteUser(login){
  if(!confirm(`Удалить пользователя «${login}»?`)) return;
  const users = getUsers().filter(u => u.login !== login);
  saveUsers(users);
  renderCreatorAccounts();
  showToast('Пользователь удалён','amber');
}

function downloadVcf(name, phone){
  const vcf = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${name} — ДК ГАРАЖ`,
    `N:ДК ГАРАЖ;${name};;;`,
    `TEL;TYPE=CELL:+${phone}`,
    'ORG:Дорожный комплекс ГАРАЖ',
    'URL:https://rn8mwsb6pf-alt.github.io/detalpro-site/',
    'ADR;TYPE=WORK:;;ул. Героев Пионеров 95;Каменск-Шахтинский;Ростовская обл.;;Россия',
    'NOTE:Менеджер магазина автозапчастей ДК ГАРАЖ. 932 км М4 Дон.',
    'END:VCARD'
  ].join('\n');
  const a = document.createElement('a');
  a.href = 'data:text/vcard;charset=utf-8,' + encodeURIComponent(vcf);
  a.download = `${name}_GARAZH.vcf`;
  a.click();
}

function showPdPolicy(e){
  e.stopPropagation();
  const existing = document.getElementById('pd-policy-modal');
  if(existing){ existing.classList.add('open'); return; }
  const div = document.createElement('div');
  div.id = 'pd-policy-modal';
  div.className = 'modal-overlay open';
  div.onclick = (ev) => { if(ev.target === div) div.classList.remove('open'); };
  div.innerHTML = `<div class="modal-box" style="max-width:540px;max-height:80vh;overflow-y:auto">
    <button class="modal-close" onclick="document.getElementById('pd-policy-modal').classList.remove('open')">✕</button>
    <div class="modal-title">Политика обработки персональных данных</div>
    <div style="font-size:13px;color:var(--text2);line-height:1.75;margin-top:12px">
      <p><strong style="color:var(--text)">Оператор персональных данных:</strong><br>
      ИП / ООО «Дорожный комплекс ГАРАЖ», ул. Героев Пионеров, 95, г. Каменск-Шахтинский, Ростовская обл.</p>
      <p><strong style="color:var(--text)">Цели обработки данных:</strong></p>
      <ul style="padding-left:20px;margin:8px 0">
        <li>Оформление и доставка заказов</li>
        <li>Связь с покупателем по вопросам заказа</li>
        <li>Ведение клиентской базы</li>
        <li>Уведомления об акциях и специальных предложениях (только с согласия)</li>
      </ul>
      <p><strong style="color:var(--text)">Перечень обрабатываемых данных:</strong><br>
      Имя, фамилия, номер телефона, адрес доставки.</p>
      <p><strong style="color:var(--text)">Срок хранения:</strong><br>
      Данные хранятся в течение 3 лет с момента последнего заказа или до отзыва согласия.</p>
      <p><strong style="color:var(--text)">Права субъекта данных:</strong><br>
      Вы имеете право на доступ к своим данным, их исправление, удаление и отзыв согласия.
      Для этого напишите на <a href="mailto:ipslukinav@bk.ru" style="color:var(--accent)">ipslukinav@bk.ru</a>.</p>
      <p style="font-size:12px;color:var(--text3)">Обработка персональных данных осуществляется в соответствии с ФЗ-152 «О персональных данных».</p>
    </div>
    <button class="modal-btn" onclick="document.getElementById('pd-policy-modal').classList.remove('open')" style="margin-top:16px">Понятно</button>
  </div>`;
  document.body.appendChild(div);
}

const DEMO_PARTS = [
  
  {article:'740.1000128-10', brand:'КАМАЗ', name:'Комплект прокладок двигателя 740.31', price_retail:4850, price_wholesale:3880, price_input:2900, stock:3, delivery_days:0, vehicle:'КАМАЗ 65115/5490'},
  {article:'5320-3501136',   brand:'КАМАЗ', name:'Тормозной цилиндр задний правый',     price_retail:2200, price_wholesale:1760, price_input:1320, stock:5, delivery_days:0, vehicle:'КАМАЗ 5320/5410'},
  {article:'740.11-1012038', brand:'КАМАЗ', name:'Масляный насос двигателя 740',         price_retail:6900, price_wholesale:5520, price_input:4100, stock:2, delivery_days:0, vehicle:'КАМАЗ 740'},
  {article:'740.1117010',    brand:'КАМАЗ', name:'Топливный насос высокого давления ТНВД',price_retail:18500,price_wholesale:14800,price_input:11000,stock:1, delivery_days:0, vehicle:'КАМАЗ 740.31'},
  {article:'5320-1703010',   brand:'КАМАЗ', name:'Сцепление в сборе 14" 330мм',          price_retail:12400,price_wholesale:9920, price_input:7400, stock:2, delivery_days:0, vehicle:'КАМАЗ 5320/65115'},
  
  {article:'W11102/80',      brand:'Mann-Filter', name:'Масляный фильтр двигателя 740 КАМАЗ', price_retail:890,  price_wholesale:712, price_input:534, stock:12, delivery_days:0, vehicle:'КАМАЗ'},
  {article:'WK9503X',        brand:'Mann-Filter', name:'Топливный фильтр тонкой очистки',      price_retail:1150, price_wholesale:920, price_input:690, stock:8,  delivery_days:0, vehicle:'DAF XF/CF'},
  {article:'WD95028',        brand:'Mann-Filter', name:'Масляный фильтр гидравлики КПП',        price_retail:760,  price_wholesale:608, price_input:456, stock:15, delivery_days:0, vehicle:'КАМАЗ/МАЗ'},
  {article:'P550778',        brand:'Donaldson',   name:'Воздушный фильтр первичный',            price_retail:2340, price_wholesale:1872,price_input:1400,stock:4,  delivery_days:0, vehicle:'КАМАЗ 65115'},
  {article:'C311300',        brand:'Mann-Filter', name:'Воздушный фильтр вторичный',            price_retail:980,  price_wholesale:784, price_input:588, stock:6,  delivery_days:0, vehicle:'MAN TGA/TGX'},
  
  {article:'29087',          brand:'Knorr-Bremse',name:'Тормозные колодки задний мост',         price_retail:5600, price_wholesale:4480,price_input:3360,stock:4,  delivery_days:0, vehicle:'DAF XF105/95'},
  {article:'WVA29087',       brand:'Textar',      name:'Тормозные колодки барабанные 420×180',  price_retail:4200, price_wholesale:3360,price_input:2520,stock:6,  delivery_days:0, vehicle:'MAN TGX/TGA'},
  {article:'1906350',        brand:'SAF Holland', name:'Тормозной барабан задний ось SAF',       price_retail:8900, price_wholesale:7120,price_input:5340,stock:2,  delivery_days:0, vehicle:'полуприцеп SAF'},
  
  {article:'1669768',        brand:'DAF Original',name:'Генератор 28V 100A Bosch',               price_retail:32000,price_wholesale:25600,price_input:19200,stock:0,delivery_days:4, vehicle:'DAF XF105'},
  {article:'1788521',        brand:'DAF Original',name:'Стартер 24V 7.5кВт',                     price_retail:18700,price_wholesale:14960,price_input:11220,stock:0,delivery_days:5, vehicle:'DAF XF/CF'},
  {article:'0535376',        brand:'ZF',          name:'Ремонтный комплект КПП ZF16S151',         price_retail:24500,price_wholesale:19600,price_input:14700,stock:0,delivery_days:7, vehicle:'DAF/MAN/Volvo ZF'},
  
  {article:'51.25415.6024',  brand:'MAN Original',name:'Термостат охлаждающей жидкости',         price_retail:3800, price_wholesale:3040,price_input:2280,stock:0, delivery_days:3, vehicle:'MAN TGX/TGA D2066'},
  {article:'81.96201.0499',  brand:'MAN Original',name:'Компрессор пневмосистемы',                price_retail:42000,price_wholesale:33600,price_input:25200,stock:0,delivery_days:10,vehicle:'MAN TGX 18.440'},
  {article:'81.50804.6012',  brand:'Wabco',       name:'Клапан ABS/EBS пневматический',          price_retail:6700, price_wholesale:5360,price_input:4020,stock:0, delivery_days:4, vehicle:'MAN/DAF/Volvo'},
  
  {article:'21340612',       brand:'Volvo Original',name:'Диск сцепления 430мм Ø50 шлиц',        price_retail:15600,price_wholesale:12480,price_input:9360,stock:0, delivery_days:6, vehicle:'Volvo FH/FM D13'},
  {article:'20545770',       brand:'Volvo Original',name:'Форсунка ТНВД unit injector',           price_retail:28000,price_wholesale:22400,price_input:16800,stock:0,delivery_days:8, vehicle:'Volvo FH12/FH16'},
  {article:'21277100',       brand:'Volvo Original',name:'Кронштейн двигателя правый',            price_retail:9200, price_wholesale:7360,price_input:5520,stock:0, delivery_days:5, vehicle:'Volvo FM/FMX'},
  
  {article:'A0001400285',    brand:'Mercedes',    name:'Турбокомпрессор OM471 euro6',             price_retail:95000,price_wholesale:76000,price_input:57000,stock:0,delivery_days:14,vehicle:'Mercedes Actros MP4'},
  {article:'A9700900952',    brand:'Mercedes',    name:'EGR клапан рециркуляции OM471',           price_retail:38000,price_wholesale:30400,price_input:22800,stock:0,delivery_days:10,vehicle:'Mercedes Actros'},
  
  {article:'1377192',        brand:'Scania',      name:'Водяной насос охлаждения DC12',           price_retail:14500,price_wholesale:11600,price_input:8700,stock:0, delivery_days:7, vehicle:'Scania R/P series DC12'},
  {article:'1419009',        brand:'Scania',      name:'Муфта вентилятора с крыльчаткой',        price_retail:22000,price_wholesale:17600,price_input:13200,stock:0,delivery_days:9, vehicle:'Scania R420/440/480'},
  
  {article:'64221-1002260',  brand:'ЯМЗ',         name:'Блок цилиндров ЯМЗ-238М2 голый',        price_retail:78000,price_wholesale:62400,price_input:46800,stock:1,delivery_days:0, vehicle:'МАЗ/КРАЗ ЯМЗ-238'},
  {article:'238-1011010-А',  brand:'ЯМЗ',         name:'Коленчатый вал ЯМЗ-238',                price_retail:32000,price_wholesale:25600,price_input:19200,stock:2,delivery_days:0, vehicle:'МАЗ/КРАЗ ЯМЗ-238'},
  
  {article:'T402853',        brand:'Castrol',     name:'Моторное масло VECTON 15W-40 20л',       price_retail:4200, price_wholesale:3360,price_input:2520,stock:20, delivery_days:0, vehicle:'все дизельные'},
  {article:'OAT-CWT5',       brand:'FELIX',       name:'Антифриз готовый -40°C G12+ 10л',        price_retail:1150, price_wholesale:920, price_input:690, stock:30, delivery_days:0, vehicle:'все'},
];

function seedDemoCatalog(){
  if(getCatalog().length>0) return; 
  const items = DEMO_PARTS.map((p,i)=>({
    id: i+1,
    article: p.article,
    brand: p.brand,
    name: p.name,
    price_retail: p.price_retail,
    price_wholesale: p.price_wholesale,
    price_input: p.price_input,
    stock: p.stock,
    delivery_days: p.delivery_days,
    source: '1c',
    vehicle: p.vehicle||'',
    inStock: p.stock>0,
  }));
  saveCatalog(items);
  localStorage.setItem('dp_catalog_meta', JSON.stringify({
    updatedAt: new Date().toISOString(),
    file: 'Демо-каталог (грузовые запчасти)',
    count: items.length,
  }));
}

function init(){
  
  applyTheme();
  
  seedDemoCatalog();
  
  loadCloudStaff();

  try{
    const saved=sessionStorage.getItem('dp_session');
    if(saved){
      state.user=JSON.parse(saved);
      state.role=state.user.role;
    }
  }catch(e){}
  renderAuthHeader();

  try{
    const now=new Date();
    const y=now.getFullYear(),m=String(now.getMonth()+1).padStart(2,'0');
    document.getElementById('profit-date-from').value=`${y}-${m}-01`;
    document.getElementById('profit-date-to').value=`${y}-${m}-${String(new Date(y,now.getMonth()+1,0).getDate()).padStart(2,'0')}`;
  }catch(e){}

  const track=document.getElementById('brands-track');
  const doubled=[...BRANDS,...BRANDS];
  track.innerHTML=doubled.map(b=>`<div class="brand-item${b.type==='truck'?' brand-truck':' brand-part'}">${b.label}</div>`).join('');

  const grid=document.getElementById('cats-grid');
  grid.innerHTML=CATEGORIES.map((c,i)=>`
    <div class="cat-card animate-in stagger-${(i%6)+1}" onclick="showPage('search')">
      <span class="cat-icon">${c.icon}</span>
      <div class="cat-name">${c.name}</div>
      <div class="cat-count">${c.count} артикулов</div>
    </div>`).join('');

  renderHomeBanners();

  renderStores();
  renderPvzList();
  renderCheckoutSummary();
  renderPayInfoPanel();
  updatePrepayPanel();

  setTimeout(()=>{
    if(STAFF_ROLES.includes(state.role)){
      updatePendingBadge();
      const cnt=getOrders().filter(o=>o.status==='pending').length;
      if(cnt) showToast(`${cnt} заказ(а) ожидают подтверждения`,'amber');
    }
  },500);
}

const VIN_WMI_DB = {
  
  'XTA':'LADA (АвтоВАЗ)|Россия','XTT':'ГАЗ (Волга/Газель)|Россия',
  'X7L':'УАЗ|Россия','X7M':'УАЗ|Россия','X9F':'КАМАЗ|Россия',
  'X96':'Renault (Россия)|Россия','XW8':'Volkswagen (Россия)|Россия',
  'XW7':'Ford (Россия)|Россия','XW9':'Hyundai (Россия)|Россия',
  'X4X':'Mitsubishi (Россия)|Россия','XKK':'Kia (Россия)|Россия',
  'Y3M':'Toyota (Россия)|Россия','YV9':'BMW (Россия)|Россия',
  'XWE':'Renault (Россия)|Россия','XLR':'АвтоТор (BMW/KIA)|Россия',
  'XUF':'ИжАвто|Россия','XTZ':'ТагАЗ|Россия',
  
  'JHM':'Honda|Япония','JH4':'Acura|Япония','JH6':'Honda|Япония','JHL':'Honda|Япония',
  'JTD':'Toyota|Япония','JTE':'Toyota|Япония','JTF':'Toyota|Япония',
  'JTG':'Toyota|Япония','JTJ':'Toyota|Япония','JTM':'Toyota|Япония','JTN':'Toyota|Япония',
  'JN1':'Nissan|Япония','JN3':'Nissan|Япония','JN6':'Nissan|Япония','JN8':'Nissan|Япония',
  'JM1':'Mazda|Япония','JMB':'Mitsubishi|Япония','JMF':'Mitsubishi|Япония',
  'JA3':'Mitsubishi|Япония','JA4':'Mitsubishi|Япония',
  'JS1':'Suzuki|Япония','JS2':'Suzuki|Япония','JS3':'Suzuki|Япония','JS4':'Suzuki|Япония',
  'JF1':'Subaru|Япония','JF2':'Subaru|Япония','JF3':'Subaru|Япония',
  'JSK':'Kawasaki|Япония','JKA':'Kawasaki|Япония','JKB':'Kawasaki|Япония',
  'JYA':'Yamaha|Япония','JYE':'Yamaha|Япония',
  'JNA':'Infiniti|Япония','JNK':'Infiniti|Япония',
  
  'KMH':'Hyundai|Корея','KMF':'Hyundai|Корея','KM8':'Hyundai|Корея',
  'KNA':'Kia|Корея','KNB':'Kia|Корея','KNC':'Kia|Корея','KND':'Kia|Корея',
  'KL1':'Chevrolet/Daewoo|Корея','KL4':'Daewoo|Корея','KL5':'Daewoo|Корея','KL8':'Daewoo|Корея',
  'KPT':'SsangYong|Корея','KPC':'SsangYong|Корея',
  
  'WBA':'BMW|Германия','WBB':'BMW|Германия','WBS':'BMW M|Германия',
  'WBY':'BMW i|Германия','WBX':'BMW|Германия',
  'WDB':'Mercedes-Benz|Германия','WDC':'Mercedes-Benz|Германия',
  'WDD':'Mercedes-Benz|Германия','WDF':'Mercedes-Benz|Германия',
  'WAU':'Audi|Германия','WA1':'Audi|Германия','WAP':'Porsche|Германия',
  'WP0':'Porsche|Германия','WP1':'Porsche Cayenne|Германия',
  'WVW':'Volkswagen|Германия','WV2':'Volkswagen|Германия',
  'WV3':'Volkswagen|Германия','WV1':'Volkswagen|Германия',
  'W0L':'Opel|Германия','W0V':'Opel|Германия',
  
  'VSS':'SEAT|Испания','VSE':'SEAT|Испания',
  'TMB':'Škoda|Чехия','TMA':'Škoda|Чехия',
  
  'VF1':'Renault|Франция','VF3':'Peugeot|Франция',
  'VF7':'Citroën|Франция','VF6':'Citroën|Франция','VNK':'Toyota|Франция',
  
  'ZAR':'Alfa Romeo|Италия','ZFA':'Fiat|Италия','ZFB':'Fiat|Италия',
  'ZFF':'Ferrari|Италия','ZLA':'Lamborghini|Италия',
  'ZHW':'Lamborghini|Италия','ZAA':'Alfa Romeo|Италия',
  'ZAM':'Maserati|Италия',
  
  'SAL':'Land Rover|Великобритания','SAJ':'Jaguar|Великобритания',
  'SAR':'Rover|Великобритания','SCB':'Bentley|Великобритания',
  'SCC':'Lotus|Великобритания','SDB':'Jaguar|Великобритания',
  'SHH':'Honda UK|Великобритания','ADR':'Rolls-Royce|Великобритания',
  
  'YV1':'Volvo|Швеция','YV4':'Volvo|Швеция','YS3':'Saab|Швеция','YS2':'Scania|Швеция',
  
  '1FA':'Ford|США','1FB':'Ford|США','1FC':'Ford|США','1FD':'Ford|США',
  '1FM':'Ford|США','1FT':'Ford|США','1FV':'Ford|США',
  '1G1':'Chevrolet|США','1G2':'Pontiac|США','1G3':'Oldsmobile|США',
  '1G4':'Buick|США','1G6':'Cadillac|США','1GC':'Chevrolet|США',
  '1GD':'Chevrolet|США','1GT':'GMC|США','1GY':'Cadillac|США',
  '1C3':'Chrysler/Dodge|США','1C4':'Chrysler/Jeep|США',
  '1C6':'Chrysler/Dodge|США','1C8':'Chrysler|США',
  '1N4':'Nissan|США','1N6':'Nissan|США',
  '4T1':'Toyota|США','4T3':'Toyota|США','5TD':'Toyota|США','5YF':'Toyota|США',
  '5NP':'Hyundai|США','5NM':'Hyundai|США','5XX':'Kia|США',
  '1HG':'Honda|США','1HH':'Honda|США',
  '2HG':'Honda|Канада','2HJ':'Honda|Канада','2HK':'Honda|Канада',
  '2T1':'Toyota|Канада','2T2':'Toyota|Канада',
  '2G1':'Chevrolet|Канада','2G2':'Pontiac|Канада',
  '3VW':'Volkswagen|Мексика','3FA':'Ford|Мексика','3N1':'Nissan|Мексика',
  '3VZ':'Toyota|Мексика',
  
  'LFV':'Volkswagen|Китай','LVS':'Volkswagen|Китай','LHG':'Honda|Китай',
  'LGB':'GAC|Китай','LSG':'GM|Китай','L6T':'Buick|Китай','LDC':'Dodge|Китай',
  'LBE':'BMW|Китай','LNB':'Nissan|Китай','LMG':'Opel|Китай',
  'L8X':'Chery|Китай','LJD':'Great Wall|Китай','LZG':'Brilliance|Китай',
  'LKH':'Geely|Китай','LS5':'Cadillac|Китай','LTN':'Toyota|Китай',
  
  'MAL':'Chevrolet|Индия','MBH':'Honda|Индия','MA3':'Suzuki|Индия','MA1':'Maruti|Индия',
  'NM0':'Ford|Турция','NM4':'Ford|Турция','TMT':'Toyota|Турция','NMA':'Renault|Турция',
  'AAV':'Volkswagen|ЮАР',
};

const VIN_YEAR_MAP = {
  'A':2010,'B':2011,'C':2012,'D':2013,'E':2014,
  'F':2015,'G':2016,'H':2017,'J':2018,'K':2019,
  'L':2020,'M':2021,'N':2022,'P':2023,'R':2024,
  'S':2025,'T':2026,'V':2027,'W':2028,'X':2029,'Y':2030,
  '1':2001,'2':2002,'3':2003,'4':2004,'5':2005,
  '6':2006,'7':2007,'8':2008,'9':2009,
};

const VIN_CATS_DB = [
  {id:'engine',icon:'⚙️',label:'Двигатель',color:'#e8411a',desc:'Фильтры, ГРМ, помпа, сальники',parts:[
    {id:'oil_filter',name:'Масляный фильтр',brands:['MANN','BOSCH','FILTRON','CHAMPION','MAHLE'],avgPrice:650},
    {id:'air_filter',name:'Воздушный фильтр',brands:['MANN','BOSCH','FILTRON','CHAMPION','HENGST'],avgPrice:850},
    {id:'fuel_filter',name:'Топливный фильтр',brands:['MANN','BOSCH','FILTRON','HENGST'],avgPrice:900},
    {id:'spark_plugs',name:'Свечи зажигания',brands:['BOSCH','NGK','DENSO','CHAMPION','BRISK'],avgPrice:450},
    {id:'timing_belt',name:'Ремень ГРМ (комплект)',brands:['GATES','CONTITECH','DAYCO','INA'],avgPrice:3200},
    {id:'water_pump',name:'Помпа водяная',brands:['DAYCO','GATES','FEBI','OPTIMAL','AISIN'],avgPrice:3500},
    {id:'valve_gasket',name:'Прокладка клапанной крышки',brands:['ELRING','VICTOR REINZ','MAHLE'],avgPrice:1400},
    {id:'engine_mounts',name:'Подушки двигателя',brands:['FEBI','LEMFORDER','MEYLE','CORTECO'],avgPrice:1900},
    {id:'oil_seal',name:'Сальники двигателя',brands:['ELRING','CORTECO','SKF','VICTOR REINZ'],avgPrice:580},
    {id:'glow_plugs',name:'Свечи накаливания (дизель)',brands:['BOSCH','NGK','BERU','CHAMPION'],avgPrice:920},
  ]},
  {id:'brakes',icon:'🛑',label:'Тормозная система',color:'#ef4444',desc:'Колодки, диски, суппорты',parts:[
    {id:'brake_pads_f',name:'Тормозные колодки передние',brands:['TRW','BREMBO','TEXTAR','ATE','FERODO'],avgPrice:2400},
    {id:'brake_pads_r',name:'Тормозные колодки задние',brands:['TRW','BREMBO','TEXTAR','ATE','FERODO'],avgPrice:2100},
    {id:'brake_disc_f',name:'Тормозные диски передние',brands:['BREMBO','TRW','ATE','TEXTAR'],avgPrice:4800},
    {id:'brake_disc_r',name:'Тормозные диски задние',brands:['BREMBO','TRW','ATE','TEXTAR'],avgPrice:3900},
    {id:'brake_caliper',name:'Суппорт тормозной',brands:['ATE','TRW','BREMBO','HELLA'],avgPrice:9800},
    {id:'brake_hose',name:'Тормозной шланг',brands:['FEBI','MEYLE','ATE','BOSCH'],avgPrice:850},
    {id:'brake_fluid',name:'Жидкость тормозная DOT-4',brands:['CASTROL','LIQUI MOLY','ATE','BOSCH'],avgPrice:420},
    {id:'brake_drum',name:'Барабан тормозной',brands:['TRW','ATE','FEBI','BREMBO'],avgPrice:3200},
  ]},
  {id:'suspension',icon:'🔩',label:'Подвеска и рулевое',color:'#f59e0b',desc:'Амортизаторы, пружины, шаровые',parts:[
    {id:'shock_f',name:'Амортизаторы передние',brands:['BILSTEIN','SACHS','KYB','MONROE'],avgPrice:5200},
    {id:'shock_r',name:'Амортизаторы задние',brands:['BILSTEIN','SACHS','KYB','MONROE'],avgPrice:4100},
    {id:'spring_f',name:'Пружины передние',brands:['SACHS','LESJOFORS','MOOG','H&R'],avgPrice:2900},
    {id:'ball_joint',name:'Шаровые опоры',brands:['LEMFORDER','TRW','MOOG','FEBI'],avgPrice:1900},
    {id:'tie_rod',name:'Рулевые тяги',brands:['LEMFORDER','TRW','MOOG','FEBI'],avgPrice:2300},
    {id:'tie_rod_end',name:'Наконечники рулевые',brands:['LEMFORDER','TRW','MOOG','FEBI'],avgPrice:1450},
    {id:'sway_bar',name:'Стойки/втулки стабилизатора',brands:['FEBI','MEYLE','MOOG','LEMFORDER'],avgPrice:920},
    {id:'silent_block',name:'Сайлентблоки рычагов',brands:['MEYLE','FEBI','LEMFORDER','MOOG'],avgPrice:780},
    {id:'wheel_bearing',name:'Ступичный подшипник',brands:['SKF','FAG','TIMKEN','NSK','SNR'],avgPrice:3100},
  ]},
  {id:'cooling',icon:'❄️',label:'Система охлаждения',color:'#06b6d4',desc:'Радиатор, термостат, антифриз',parts:[
    {id:'radiator',name:'Радиатор охлаждения',brands:['NISSENS','NRF','VALEO','MAHLE'],avgPrice:8800},
    {id:'thermostat',name:'Термостат',brands:['BEHR','WAHLER','STANT','FEBI'],avgPrice:1250},
    {id:'coolant_hoses',name:'Патрубки радиатора',brands:['GATES','CONTITECH','DAYCO'],avgPrice:870},
    {id:'coolant',name:'Антифриз',brands:['LIQUI MOLY','CASTROL','MANNOL','FELIX'],avgPrice:480},
    {id:'ac_condenser',name:'Радиатор кондиционера',brands:['NISSENS','NRF','VALEO'],avgPrice:6800},
    {id:'cooling_fan',name:'Вентилятор охлаждения',brands:['NISSENS','MAHLE','VALEO'],avgPrice:4500},
    {id:'exp_tank',name:'Расширительный бачок',brands:['FEBI','MEYLE','BEHR'],avgPrice:1900},
  ]},
  {id:'electrical',icon:'⚡',label:'Электрика и освещение',color:'#eab308',desc:'АКБ, генератор, стартер, датчики',parts:[
    {id:'battery',name:'Аккумулятор',brands:['BOSCH','VARTA','TOPLA','EXIDE'],avgPrice:7200},
    {id:'alternator',name:'Генератор',brands:['BOSCH','VALEO','DENSO','WAI'],avgPrice:12500},
    {id:'starter',name:'Стартер',brands:['BOSCH','VALEO','DENSO','WAI'],avgPrice:9000},
    {id:'sensors',name:'Датчики (ABS, MAP, лямбда)',brands:['BOSCH','DENSO','NGK','DELPHI'],avgPrice:2900},
    {id:'headlight',name:'Фара передняя',brands:['HELLA','VALEO','DEPO','TYC'],avgPrice:9800},
    {id:'taillight',name:'Фонарь задний',brands:['HELLA','VALEO','DEPO','TYC'],avgPrice:5800},
    {id:'bulbs',name:'Лампы',brands:['OSRAM','PHILIPS','BOSCH','NARVA'],avgPrice:340},
    {id:'wiper',name:'Щётки стеклоочистителя',brands:['BOSCH','VALEO','CHAMPION','DENSO'],avgPrice:690},
  ]},
  {id:'transmission',icon:'🔧',label:'Трансмиссия',color:'#a855f7',desc:'Сцепление, ШРУС, масло КПП',parts:[
    {id:'clutch_kit',name:'Комплект сцепления',brands:['LUK','SACHS','VALEO','EXEDY'],avgPrice:13500},
    {id:'clutch_disc',name:'Диск сцепления',brands:['LUK','SACHS','VALEO'],avgPrice:5800},
    {id:'cv_joint',name:'ШРУС (граната)',brands:['GKN','LOBRO','SPIDAN'],avgPrice:5100},
    {id:'cv_boot',name:'Пыльник ШРУС',brands:['FEBI','MEYLE','SKF','LOBRO'],avgPrice:680},
    {id:'driveshaft',name:'Полуось / привод в сборе',brands:['GKN','LOBRO','PASCAL'],avgPrice:9200},
    {id:'gearbox_oil',name:'Масло в КПП / мост',brands:['LIQUI MOLY','CASTROL','MOTUL','MANNOL'],avgPrice:920},
    {id:'flywheel',name:'Маховик двухмассовый',brands:['LUK','SACHS','VALEO'],avgPrice:24000},
  ]},
  {id:'fuel',icon:'⛽',label:'Система питания',color:'#22c55e',desc:'Насос, форсунки, турбина, EGR',parts:[
    {id:'fuel_pump',name:'Топливный насос',brands:['BOSCH','DELPHI','DENSO','VDO'],avgPrice:7200},
    {id:'injector',name:'Форсунки / инжекторы',brands:['BOSCH','SIEMENS','DELPHI','DENSO'],avgPrice:4800},
    {id:'throttle',name:'Дроссельная заслонка',brands:['BOSCH','SIEMENS','VDO','PIERBURG'],avgPrice:8800},
    {id:'turbo',name:'Турбокомпрессор',brands:['GARRETT','BorgWarner','IHI','KKK'],avgPrice:38000},
    {id:'egr',name:'Клапан EGR',brands:['BOSCH','DELPHI','PIERBURG','WAHLER'],avgPrice:7800},
    {id:'intercooler',name:'Интеркулер',brands:['NISSENS','NRF','VALEO','MAHLE'],avgPrice:9500},
  ]},
  {id:'exhaust',icon:'💨',label:'Выхлопная система',color:'#6b7280',desc:'Глушитель, катализатор, лямбда',parts:[
    {id:'catalytic',name:'Катализатор',brands:['BOSAL','WALKER','EBERSPACHER'],avgPrice:19000},
    {id:'muffler',name:'Глушитель',brands:['BOSAL','WALKER','ASSO','DINEX'],avgPrice:7800},
    {id:'flex_pipe',name:'Гофра выхлопная',brands:['BOSAL','WALKER','DINEX'],avgPrice:2900},
    {id:'o2_sensor',name:'Датчик кислородный (лямбда)',brands:['BOSCH','NGK','DENSO','DELPHI'],avgPrice:3400},
    {id:'dpf',name:'Сажевый фильтр DPF/FAP',brands:['BOSAL','WALKER','DINEX'],avgPrice:48000},
    {id:'exhaust_manifold',name:'Коллектор выпускной',brands:['ELRING','VICTOR REINZ','ERNST'],avgPrice:12500},
  ]},
  {id:'body',icon:'🚗',label:'Кузов и оптика',color:'#3b82f6',desc:'Бамперы, зеркала, стёкла, капот',parts:[
    {id:'bumper_f',name:'Бампер передний',brands:['PRASCO','BLIC','DEPO','RIDEX'],avgPrice:8800},
    {id:'bumper_r',name:'Бампер задний',brands:['PRASCO','BLIC','DEPO','RIDEX'],avgPrice:7800},
    {id:'mirror',name:'Зеркало боковое',brands:['BLIC','PRASCO','HAGUS'],avgPrice:4800},
    {id:'hood',name:'Капот',brands:['PRASCO','BLIC','RIDEX'],avgPrice:18500},
    {id:'fender',name:'Крыло',brands:['PRASCO','BLIC','RIDEX'],avgPrice:9500},
    {id:'windshield',name:'Лобовое стекло',brands:['AGC','PILKINGTON','SEKURIT'],avgPrice:23000},
    {id:'door_seal',name:'Уплотнители дверей',brands:['FEBI','MEYLE','CORTECO'],avgPrice:1900},
  ]},
  {id:'oils',icon:'🛢️',label:'Масла и жидкости',color:'#d97706',desc:'Моторное масло, трансмиссионное, ГУР',parts:[
    {id:'oil_5w30',name:'Моторное масло 5W-30 (4 л)',brands:['LIQUI MOLY','CASTROL','MOBIL','SHELL'],avgPrice:2900},
    {id:'oil_5w40',name:'Моторное масло 5W-40 (4 л)',brands:['LIQUI MOLY','CASTROL','MOBIL','MOTUL'],avgPrice:3100},
    {id:'oil_0w20',name:'Моторное масло 0W-20 (4 л)',brands:['MOBIL','SHELL','TOYOTA','HONDA'],avgPrice:3800},
    {id:'atf',name:'ATF — масло для АКПП',brands:['LIQUI MOLY','CASTROL','ZF','AISIN'],avgPrice:1300},
    {id:'power_steering',name:'Жидкость ГУР',brands:['LIQUI MOLY','CASTROL','FEBI','PENTOSIN'],avgPrice:720},
    {id:'washer',name:'Жидкость стеклоомывателя',brands:['LIQUI MOLY','SHELL','PEAK'],avgPrice:290},
  ]},
  {id:'interior',icon:'🪑',label:'Салон и аксессуары',color:'#8b5cf6',desc:'Фильтр салона, коврики, чехлы',parts:[
    {id:'cabin_filter',name:'Фильтр салона / кондиционера',brands:['MANN','BOSCH','FILTRON','MAHLE'],avgPrice:680},
    {id:'floor_mats',name:'Коврики в салон',brands:['3D','NOVLINE','RIVAL','SEINTEX'],avgPrice:2900},
    {id:'seat_covers',name:'Чехлы на сиденья',brands:['AUTOPROFI','SEINTEX','AZARD'],avgPrice:3600},
    {id:'horn',name:'Звуковой сигнал',brands:['BOSCH','HELLA','FIAMM'],avgPrice:780},
  ]},
];

const vinState = {info:null, category:null, partType:null};

function countryFlag(c){
  const f={'Россия':'🇷🇺','Япония':'🇯🇵','Германия':'🇩🇪','Корея':'🇰🇷',
    'Франция':'🇫🇷','Италия':'🇮🇹','Великобритания':'🇬🇧','Швеция':'🇸🇪',
    'США':'🇺🇸','Канада':'🇨🇦','Китай':'🇨🇳','Мексика':'🇲🇽',
    'Индия':'🇮🇳','Турция':'🇹🇷','ЮАР':'🇿🇦','Испания':'🇪🇸','Чехия':'🇨🇿'};
  return f[c]||'🌍';
}

function decodeVIN(vin){
  vin=vin.trim().toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g,'');
  if(vin.length!==17) return null;
  const wmi=vin.substring(0,3);
  const yearChar=vin[9];
  const vds=vin.substring(3,8);

  let mfrRaw=VIN_WMI_DB[wmi]||null;
  
  if(!mfrRaw){
    const wmi2=vin.substring(0,2);
    mfrRaw=Object.entries(VIN_WMI_DB).find(([k])=>k.startsWith(wmi2))?.[1]||null;
  }
  let make='Неизвестный производитель', country='Неизвестная страна';
  if(mfrRaw){[make,country]=mfrRaw.split('|');}

  let year=VIN_YEAR_MAP[yearChar]||null;
  
  if(year && year > new Date().getFullYear()+5) year-=30;
  const yearAlt=(year && year>=2010)?year-30:null;
  const yearStr=year?`${year}`:'неизвестен';
  const yearNote=yearAlt&&yearAlt>=1980?` (или ${yearAlt})`:'';

  const bodyMap={'S':'Седан','C':'Купе','V':'Минивэн','T':'Внедорожник/Пикап',
    'H':'Хэтчбэк','W':'Универсал','B':'Автобус','P':'Пикап',
    'M':'Минивэн','R':'Родстер','4':'Внедорожник','L':'Лимузин','N':'Фургон'};
  const fuelMap={'P':'Бензин','D':'Дизель','E':'Электро','H':'Гибрид','G':'Газ','B':'Бензин','N':'Газ'};
  const bodyGuess=bodyMap[vds[0]]||null;
  const fuelGuess=fuelMap[vds[1]]||'Бензин/Дизель';

  return {vin, wmi, make, country, year:yearStr, yearNote, yearChar,
    bodyGuess, fuelGuess, plant:vin[10], serial:vin.substring(11), vds,
    flag:countryFlag(country)};
}

function vinPageDecode(){
  const inp=document.getElementById('vin-page-input');
  const vin=inp.value.trim().toUpperCase();
  if(!vin){showToast('Введите VIN-номер автомобиля','amber');return;}
  if(vin.length!==17){showToast(`VIN должен содержать 17 символов (сейчас ${vin.length})`,'red');return;}

  const btn=document.querySelector('.vin-main-btn');
  if(btn){btn.textContent='Поиск...';btn.disabled=true;}
  setTimeout(()=>{
    const info=decodeVIN(vin);
    if(btn){btn.textContent='Определить →';btn.disabled=false;}
    if(!info){showToast('Не удалось декодировать VIN','red');return;}

    vinState.info=info; vinState.category=null; vinState.partType=null;

    document.getElementById('vin-step-info').style.display='none';
    document.getElementById('vin-step-car').style.display='block';
    document.getElementById('vin-step-parts').style.display='none';
    document.getElementById('vin-step-products').style.display='none';

    renderVinCarCard(info);
    renderVinCategories(info);
    document.getElementById('vin-step-car').scrollIntoView({behavior:'smooth',block:'start'});

    if(state.user) logActivity({user:state.user.login,role:state.role,
      action:'vin_search',details:`VIN: ${vin} — ${info.make} ${info.year}`});
  }, 600);
}

function renderVinCarCard(info){
  const el=document.getElementById('vin-car-card');
  el.innerHTML=`
    <div class="vin-car-icon">${info.flag}</div>
    <div>
      <div class="vin-car-make">${info.make}</div>
      <div style="font-size:14px;color:var(--text2);margin-bottom:12px">
        Год выпуска: <strong style="color:var(--text)">${info.year}${info.yearNote}</strong>
      </div>
      <div class="vin-car-detail">
        <div class="vin-car-chip">📍 <strong>${info.country}</strong></div>
        <div class="vin-car-chip">⛽ <strong>${info.fuelGuess}</strong></div>
        ${info.bodyGuess?`<div class="vin-car-chip">🚙 <strong>${info.bodyGuess}</strong></div>`:''}
        <div class="vin-car-chip vin-mono">
          VIN: <strong>${info.vin.substring(0,9)}<span style="color:var(--accent)">${info.vin.substring(9)}</span></strong>
        </div>
      </div>
    </div>`;
}

function renderVinCategories(info){
  document.getElementById('vin-cats-sub').textContent=
    `Выберите категорию запчастей для ${info.make} ${info.year}`;
  document.getElementById('vin-cats-grid').innerHTML=VIN_CATS_DB.map(cat=>`
    <div class="vin-cat-card" style="--cat-color:${cat.color}" onclick="vinSelectCategory('${cat.id}')">
      <div class="vin-cat-icon">${cat.icon}</div>
      <div class="vin-cat-label">${cat.label}</div>
      <div class="vin-cat-desc">${cat.desc}</div>
      <div class="vin-cat-count">${cat.parts.length} типов деталей →</div>
    </div>`).join('');
}

function vinSelectCategory(catId){
  const cat=VIN_CATS_DB.find(c=>c.id===catId);
  if(!cat||!vinState.info) return;
  vinState.category=cat; vinState.partType=null;
  const info=vinState.info;

  document.getElementById('vin-step-info').style.display='none';
  document.getElementById('vin-step-car').style.display='block';
  document.getElementById('vin-step-parts').style.display='block';
  document.getElementById('vin-step-products').style.display='none';

  document.getElementById('vin-parts-breadcrumb').innerHTML=`
    <a onclick="vinGoBack('car')">🔍 VIN-поиск</a> ›
    <a onclick="vinGoBack('car')">${info.make} ${info.year}</a> ›
    <span>${cat.label}</span>`;
  document.getElementById('vin-parts-title').textContent=cat.label;
  document.getElementById('vin-parts-sub').textContent=
    `${cat.parts.length} типов деталей для ${info.make} ${info.year}`;

  const fmtMin=n=>Math.round(n*0.65/10)*10;
  document.getElementById('vin-parts-grid').innerHTML=cat.parts.map(pt=>`
    <div class="vin-part-card" onclick="vinSelectPart('${pt.id}')">
      <div class="vin-part-name">${pt.name}</div>
      <div class="vin-part-brands">${pt.brands.slice(0,3).join(' · ')} и др.</div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-top:auto;padding-top:8px">
        <div class="vin-part-price">от ${fmtMin(pt.avgPrice).toLocaleString('ru-RU')} ₽</div>
        <span style="font-size:18px;color:var(--text3)">→</span>
      </div>
    </div>`).join('');

  document.getElementById('vin-step-parts').scrollIntoView({behavior:'smooth',block:'nearest'});
}

function vinSelectPart(partId){
  const cat=vinState.category;
  if(!cat) return;
  const pt=cat.parts.find(p=>p.id===partId);
  if(!pt||!vinState.info) return;
  vinState.partType=pt;
  const info=vinState.info;

  document.getElementById('vin-step-products').style.display='block';
  document.getElementById('vin-prods-breadcrumb').innerHTML=`
    <a onclick="vinGoBack('car')">🔍 VIN-поиск</a> ›
    <a onclick="vinGoBack('car')">${info.make} ${info.year}</a> ›
    <a onclick="vinGoBack('parts')">${cat.label}</a> ›
    <span>${pt.name}</span>`;
  document.getElementById('vin-prods-title').textContent=pt.name;
  document.getElementById('vin-prods-sub').textContent=
    `${pt.brands.length} предложений для ${info.make} ${info.year}`;

  const products=generateVinProducts(info,pt);
  const fmt=n=>n.toLocaleString('ru-RU')+' ₽';
  document.getElementById('vin-prods-list').innerHTML=products.map(p=>{
    const inStock=p.stock>0;
    const avail=inStock
      ?`<div class="vin-prod-avail-in">✅ В наличии — ${p.stock} шт.</div>`
      :`<div class="vin-prod-avail-ord">📦 Под заказ — ${p.delivery_days} дн.</div>`;
    return `<div class="vin-product-row">
      <div class="vin-prod-brand">${p.brand}</div>
      <div>
        <div class="vin-prod-name">${p.name}</div>
        <div class="vin-prod-art">${p.article}${p.supplier_internal?' · '+p.supplier_internal:''}</div>
        ${avail}
      </div>
      <div style="text-align:right">
        <div class="vin-prod-price">${fmt(p.price_retail)}</div>
        <div class="vin-prod-price-ws">опт: ${fmt(p.price_wholesale)}</div>
      </div>
      <div>
        <button class="vin-prod-btn" onclick='vinAddToCart(${JSON.stringify({
          article:p.article, brand:p.brand, name:p.name,
          price_retail:p.price_retail, price_wholesale:p.price_wholesale,
          stock:p.stock, delivery_days:p.delivery_days, source:p.source
        })})'>В корзину</button>
      </div>
    </div>`;
  }).join('');

  document.getElementById('vin-step-products').scrollIntoView({behavior:'smooth',block:'nearest'});
}

function vinGoBack(to){
  if(to==='car'){
    vinState.category=null; vinState.partType=null;
    document.getElementById('vin-step-parts').style.display='none';
    document.getElementById('vin-step-products').style.display='none';
    document.getElementById('vin-step-car').scrollIntoView({behavior:'smooth',block:'start'});
  } else if(to==='parts'){
    vinState.partType=null;
    document.getElementById('vin-step-products').style.display='none';
    document.getElementById('vin-step-parts').scrollIntoView({behavior:'smooth',block:'start'});
  }
}

function vinSetExample(vin){
  document.getElementById('vin-page-input').value=vin;
  vinPageDecode();
}

function generateVinProducts(info, pt){
  const brands=pt.brands||['BOSCH','MANN'];
  const avg=pt.avgPrice||2000;
  const mc=info.make.split(/[\/\s]/)[0].substring(0,3).toUpperCase();
  return brands.map((brand,i)=>{
    const seed=i*13+pt.id.length*7;
    const mult=0.62+i*0.09+(Math.sin(seed)*0.07);
    const price=Math.max(150,Math.round(avg*mult/5)*5);
    const stock=i===0?Math.floor(Math.abs(Math.sin(seed+1))*18)+2
      :(Math.abs(Math.cos(seed+3))>0.4?Math.floor(Math.abs(Math.sin(seed+2))*10):0);
    const delivery=stock>0?0:[1,2,3,5,7][i%5];
    const artCode=Math.abs(Math.floor(Math.sin(seed+pt.id.charCodeAt(0))*900000)+100000);
    const article=`${mc}-${artCode}`.substring(0,12);
    return{
      id:`vp_${pt.id}_${i}`,article,brand,
      name:`${brand} — ${pt.name}`,
      price_retail:price,
      price_wholesale:Math.round(price*0.71/5)*5,
      stock,delivery_days:delivery,
      source:stock>0?'1c':'qwep',
      supplier_internal:stock>0?null:['АвтоСклад-МСК','Партнёр-Авто','МосАвтозапчасть','QWEP Partner'][i%4],
    };
  });
}

function vinAddToCart(prod){
  
  const existing=state.cart.find(c=>c.article===prod.article&&c.brand===prod.brand);
  const maxQty=prod.stock||0;
  if(existing){
    if(maxQty>0&&existing.quantity>=maxQty){
      showToast(`Максимум ${maxQty} шт. в наличии`,'red');return;
    }
    existing.quantity++;
    showToast(`${prod.brand} — количество увеличено`,'green');
  } else {
    const cartItem={
      id:'vin_'+Date.now()+'_'+Math.random().toString(36).substring(2,6),
      article:prod.article, brand:prod.brand, name:prod.name,
      price_retail:prod.price_retail, price_wholesale:prod.price_wholesale,
      stock:prod.stock, delivery_days:prod.delivery_days,
      source:prod.source, quantity:1, _maxQty:maxQty,
    };
    state.cart.push(cartItem);
    showToast(`${prod.brand} ${prod.article} — добавлено в корзину`,'green');
  }
  updateCartCount();
}

init();

function markFieldError(id, msg){
  const el=document.getElementById(id);
  if(!el) return;
  el.classList.add('field-error');
  let em=el.parentNode.querySelector('.field-error-msg');
  if(!em){em=document.createElement('div');em.className='field-error-msg';el.parentNode.appendChild(em);}
  em.textContent=msg;em.classList.add('visible');
  el.addEventListener('input',()=>{el.classList.remove('field-error');em.classList.remove('visible');},{once:true});
}
function clearFieldErrors(){
  document.querySelectorAll('.form-input.field-error').forEach(el=>{
    el.classList.remove('field-error');
    const em=el.parentNode.querySelector('.field-error-msg');
    if(em) em.classList.remove('visible');
  });
}

function cdekAutoDetect(){
  if(!navigator.geolocation){ showToast('Геолокация недоступна','red'); return; }
  showPvzLoading('📍 Определяем ваше местоположение...');
  showToast('Определяем местоположение...','amber');
  navigator.geolocation.getCurrentPosition(
    pos=>{ cdekLoadPvzByCoords(pos.coords.latitude, pos.coords.longitude); },
    ()=>{ showToast('Разрешите доступ к геолокации в браузере','red'); showPvzLoading('Введите город вручную'); },
    {timeout:8000, enableHighAccuracy:false}
  );
}

function detectCityByGeo(){
  cdekAutoDetect();
}

const TRUCK_MODELS = {
  'Scania': {
    models: ['R-series','S-series','G-series','P-series','L-series','F-series','T-series','113','124','143'],
    wmi: 'YS2', country: '🇸🇪 Швеция'
  },
  'MAN': {
    models: ['TGX','TGS','TGM','TGL','TGE','F2000','F90','NG','L2000'],
    wmi: 'WMA', country: '🇩🇪 Германия'
  },
  'Volvo': {
    models: ['FH','FM','FMX','FL','FE','NH12','FH12','FH16','B','9700'],
    wmi: 'YV2', country: '🇸🇪 Швеция'
  },
  'Mercedes-Benz': {
    models: ['Actros','Arocs','Atego','Antos','Axor','SK','Sprinter'],
    wmi: 'WDB', country: '🇩🇪 Германия'
  },
  'DAF': {
    models: ['XF','CF','LF','XG','XG+','85CF','95XF','105XF'],
    wmi: 'XLA', country: '🇳🇱 Нидерланды'
  },
  'IVECO': {
    models: ['Stralis','Trakker','Eurocargo','Daily','S-Way','X-Way','Hi-Way'],
    wmi: 'ZCF', country: '🇮🇹 Италия'
  },
  'Renault': {
    models: ['T','C','D','K','Master','Kerax','Premium','Magnum','Midlum'],
    wmi: 'VF6', country: '🇫🇷 Франция'
  },
  'ISUZU': {
    models: ['Forward','Giga','ELF','NQR','NPR','NMR','CYZ'],
    wmi: 'JAB', country: '🇯🇵 Япония'
  },
  'Hino': {
    models: ['500','700','300','258','268','338','500 series','700 series'],
    wmi: 'JHH', country: '🇯🇵 Япония'
  },
  'Mitsubishi Fuso': {
    models: ['Canter','Fighter','Super Great','Rosa','Aero'],
    wmi: 'JL6', country: '🇯🇵 Япония'
  },
  'Ford': {
    models: ['Cargo 1833','Cargo 2533','Cargo 3230','Cargo 4142','Cargo 1846','Transit'],
    wmi: 'NM0', country: '🌍 Международный'
  },
  'КАМАЗ': {
    models: ['5490','65115','65117','6520','43118','53215','4308','53605','6460','NEO','53229'],
    wmi: 'X1P', country: '🇷🇺 Россия'
  },
  'МАЗ': {
    models: ['5340','6430','5432','5516','6516','4371','6303','5551','6312'],
    wmi: 'Y3M', country: '🇧🇾 Беларусь'
  },
  'КРАЗ': {
    models: ['256','255','6322','6510','6444','65032'],
    wmi: 'X8V', country: '🇺🇦 Украина'
  },
  'УРАЛ': {
    models: ['4320','5323','6370','44202','Next','M','C35'],
    wmi: 'X1W', country: '🇷🇺 Россия'
  },
  'ГАЗ': {
    models: ['ГАЗель NEXT','ГАЗон NEXT','Валдай','3302','3307','3309','2217'],
    wmi: 'XTT', country: '🇷🇺 Россия'
  },
  'ЗИЛ': {
    models: ['130','131','5301','4331','133'],
    wmi: 'XWE', country: '🇷🇺 Россия'
  },
  'FAW': {
    models: ['J7','J6P','J6L','CA3252','CA1163','Tiger V'],
    wmi: 'LFP', country: '🇨🇳 Китай'
  },
  'Dong Feng': {
    models: ['天龙','KX','KR','KC','H30','Captain T'],
    wmi: 'LFW', country: '🇨🇳 Китай'
  },
  'Foton': {
    models: ['Auman','ETX','GTL','S1','M4'],
    wmi: 'LVE', country: '🇨🇳 Китай'
  },
  'Schmitz': {
    models: ['S.KO','S.CS','S.CA','S.CU','S.CF','S.PR','S.BO'],
    wmi: 'WSM', country: '🇩🇪 Германия'
  },
  'Kögel': { models: ['Cargo','Maxx','Multi'], wmi: 'WKG', country: '🇩🇪 Германия' },
  'Krone': { models: ['SD','SDP','SDP 27','BDF','Cool Liner'], wmi: 'WKE', country: '🇩🇪 Германия' },
  'Wielton': { models: ['NS3','PC','PCS','NS34'], wmi: 'SUU', country: '🇵🇱 Польша' },
  'ЧМЗАП': { models: ['9990','99064','99074','8975'], wmi: 'X9C', country: '🇷🇺 Россия' },
  'НЕФАЗ': { models: ['9334','9693','8332','66062'], wmi: 'X1N', country: '🇷🇺 Россия' },
};

function vmOnBrandChange(){
  const brand = document.getElementById('vmBrand').value;
  const modelSel = document.getElementById('vmModel');
  const yearSel = document.getElementById('vmYear');
  document.getElementById('vmResult').style.display='none';
  
  if(!brand){ 
    modelSel.innerHTML='<option value="">— Сначала марка —</option>';
    modelSel.disabled=true; yearSel.disabled=true; return;
  }
  
  const data = TRUCK_MODELS[brand];
  if(data){
    modelSel.innerHTML='<option value="">— Модель —</option>' +
      data.models.map(m=>`<option value="${m}">${m}</option>`).join('');
  } else {
    
    modelSel.innerHTML='<option value="">Загрузка...</option>';
    fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/getmodelsformake/${encodeURIComponent(brand)}?format=json`)
      .then(r=>r.json())
      .then(d=>{
        const models = (d.Results||[]).slice(0,20).map(m=>m.Model_Name).filter(Boolean);
        if(models.length){
          modelSel.innerHTML='<option value="">— Модель —</option>' + models.map(m=>`<option value="${m}">${m}</option>`).join('');
        } else {
          modelSel.innerHTML='<option value="">— Модель —</option>';
        }
        modelSel.disabled=false;
      }).catch(()=>{ modelSel.innerHTML='<option value="">— Модель —</option>'; modelSel.disabled=false; });
  }
  modelSel.disabled=false;

  const curYear = new Date().getFullYear();
  yearSel.innerHTML='<option value="">Год</option>';
  for(let y=curYear; y>=1980; y--){
    yearSel.innerHTML+=`<option value="${y}">${y}</option>`;
  }
  yearSel.disabled=false;
}

function vmOnModelChange(){
  document.getElementById('vmResult').style.display='none';
}

function vmSearch(){
  const brand = document.getElementById('vmBrand').value;
  const model = document.getElementById('vmModel').value;
  const year  = document.getElementById('vmYear').value;
  
  if(!brand){ showToast('Выберите марку','red'); return; }
  
  const data = TRUCK_MODELS[brand] || { wmi: 'ZZZ', country: '—' };
  const wmi = data.wmi;

  const yearCode = '0ABCDEFGHJKLMNPRSTVWXY123456789'.split('')[parseInt(year||2020)-2000] || 'K';
  const seq = Math.floor(100000 + Math.random()*900000);
  const vin = wmi + '0000' + yearCode + '0' + seq;

  const res = document.getElementById('vmResult');
  const vinEl = document.getElementById('vmFoundVin');
  const desc = document.getElementById('vmCarDesc');
  vinEl.textContent = vin;
  desc.textContent = `${data.country} · ${brand}${model?' '+model:''} · ${year||'год не указан'}`;
  res.style.display='block';

  const q = brand + (model?' '+model:'') + (year?' '+year:'');
  document.getElementById('searchInput').value = q;
}

function vmUseVin(){
  const vin = document.getElementById('vmFoundVin').textContent;
  if(!vin) return;
  const inp=document.getElementById('vin-input')||document.getElementById('vinInput');
  if(inp) inp.value=vin;
  vinPageDecode();
}

function vinBrandSuggest(val){}
function vinSearchByBrand(){
  const brand=document.getElementById('vinBrandInput')?.value?.trim()||'';
  const year=document.getElementById('vinYearInput')?.value?.trim()||'';
  if(!brand){showToast('Введите марку автомобиля','red');return;}
  const q=brand+(year?' '+year:'');
  document.getElementById('searchInput').value=q;
  showPage('search');
  setTimeout(()=>runSearch(),100);
}

(function detectVPN(){
  fetch('https://ip-api.com/json/?fields=proxy,hosting,query')
    .then(r=>r.json())
    .then(d=>{
      if(d.proxy||d.hosting){
        const badge=document.getElementById('vpn-badge');
        if(badge) badge.style.display='flex';
      }
    }).catch(()=>{});
})();

const _origSetDelivery=typeof setDelivery==='function'?setDelivery:null;
if(_origSetDelivery){
  window.setDelivery=function(type){
    _origSetDelivery(type);
    if(type==='cdek_pvz'||type==='cdek_courier'){
    
    if(navigator.geolocation){
      cdekAutoDetect();
    } else {
      
      fetch('https://ipapi.co/json/')
        .then(r=>r.json())
        .then(d=>{ if(d.city){ document.getElementById('cdek-city').value=d.city; cdekLoadPvzByCity(d.city); }})
        .catch(()=>{ showPvzLoading('Введите название города'); });
    }
  }
  };
}

let sbpReceiptBase64 = null;

function handleReceiptUpload(input){
  const file=input.files[0];
  if(!file) return;
  const reader=new FileReader();
  reader.onload=e=>{
    sbpReceiptBase64=e.target.result;
    document.getElementById('receipt-filename').textContent=file.name;
    document.getElementById('receipt-icon').textContent='✅';
    const prev=document.getElementById('receipt-preview');
    const img=document.getElementById('receipt-img');
    img.src=sbpReceiptBase64;
    prev.style.display='block';
  };
  reader.readAsDataURL(file);
}

const _origSetPayMethod=typeof setPayMethod==='function'?setPayMethod:null;
if(_origSetPayMethod){
  window.setPayMethod=function(m){
    _origSetPayMethod(m);
    const sec=document.getElementById('sbp-receipt-section');
    if(sec) sec.style.display=(m==='sbp')?'block':'none';
  };
}

const _origUpdatePrepay=typeof updatePrepayPanel==='function'?updatePrepayPanel:null;
if(_origUpdatePrepay){
  window.updatePrepayPanel=function(){
    _origUpdatePrepay();
    if(typeof coPayMethod!=='undefined'&&coPayMethod==='sbp') renderPayInfoPanel();
  };
}
