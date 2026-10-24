/* Global: state, utilities, UI */
(() => {
  const STORE = "kioskData";
  const DEFAULT_PRODUCTS = [
    {id:"p1",name:"Саса",price:3,active:true},
    {id:"p2",name:"Чай",price:5,active:true},
    {id:"p3",name:"Кофе",price:8,active:true},
    {id:"p4",name:"Блин",price:2.5,active:true},
  ];

  // ---------- state ----------
  let state = {sales:[],products:[]};
  function load(){try{state=JSON.parse(localStorage.getItem(STORE))||{sales:[],products:DEFAULT_PRODUCTS.slice()}}catch{e};}
  function save(){localStorage.setItem(STORE,JSON.stringify(state));}
  load();

  // ---------- utils ----------
  const $=(s)=>document.querySelector(s);
  const $$=(s)=>Array.from(document.querySelectorAll(s));
  const esc=(t)=>String(t).replace(/[&<>"']/g,m=>({'"':"&quot;","'":"&#39;","<":"&lt;",">":"&gt;","&":"&amp;"}[m]));
  const fmtMoney=n=>" "+Math.round(n*100)/100+" сом";
  const dayKey=(ts)=>new Date(ts).toISOString().slice(0,10);
  const fmtTime=ts=>{const d=new Date(ts);const p=x=>String(x).padStart(2,"0");return `${p(d.getHours())}:${p(d.getMinutes())}`;};
  const fmtDateTime=ts=>{const d=new Date(ts);const p=x=>String(x).padStart(2,"0");return `${p(d.getHours())}:${p(d.getMinutes())} ${p(d.getDate())}.${p(d.getMonth()+1)}.${d.getFullYear()}`;};
  const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
  const todayKey=()=>dayKey(Date.now());

  // ---------- toast ----------
  let toastT=null;
  function showToast(msg,ms=4000){
    const t=$("#confirmToast");
    t.innerHTML=`<span>${msg}</span>`;
    t.classList.remove("hidden");
    clearTimeout(toastT);
    toastT=setTimeout(()=>t.classList.add("hidden"),ms);
    $("#confirmCloseBtn").classList.remove("hidden");
    setTimeout(()=>$("#confirmCloseBtn").classList.add("hidden"),ms-300);
  }
  $("#confirmCloseBtn").onclick=()=>$("#confirmToast").classList.add("hidden");

  // ---------- modal ----------
  function openModal(html,cb){
    $("#modalOverlay").innerHTML=html;
    $("#modalOverlay").classList.remove("hidden");
    document.body.style.overflow="hidden";
    if(cb)cb($("#modalOverlay"));
  }
  function closeModal(){
    $("#modalOverlay").classList.add("hidden");
    $("#modalOverlay").innerHTML="";
    document.body.style.overflow="";
  }
  $("#modalOverlay").onclick=e=>{if(e.target===$("#modalOverlay"))closeModal();};
  function confirm(text,onOk){
    openModal(`
      <div class="mtag"><h3>Подтвердить?</h3></div>
      <p>${text}</p>
      <div class="modal-actions">
        <button class="btn-sm btn-ghost" id="cBtn">Нет</button>
        <button class="btn-sm btn-primary" id="oBtn">Да</button>
      </div>
    `,ov=>{
      $("#oBtn").onclick=()=>{closeModal();onOk();};
      $("#cBtn").onclick=closeModal;
    });
  }
  // ---------- screens ----------
  const screens={sale,history,summary,products};
  const titles={sale:"Продажа",history:"История",summary:"Итоги",products:"Товары"};
  let current="sale";
  let payType="cash"; // cash or transfer
  let cart={}; // {productId: qty}
  function switchScreen(name){
    current=name;
    $$(".nav-btn").forEach(b=>b.classList.toggle("active",b.dataset.screen===name));
    render();
  }
  function render(){
    const m=$("#main");
    m.innerHTML="";
    $("#pageTitle").textContent=titles[current];
    if(screens[current])screens[current]();
  }

  // ---------- SALE ----------
  function renderSale(){
    const m=$("#main");
    m.innerHTML=`
      <section class="hero">
        <h2 class="screen-title">Корзина</h2>
        <p class="subtitle">Нажмите на товар, чтобы добавить.</p>
        <div class="product-grid" id="prodGrid"></div>
      </section>
      <section class="cart" id="cartBlock"></section>
    `;
    // product buttons
    const grid=$("#prodGrid");
    state.products.filter(p=>p.active).forEach(p=>{
      const btn=document.createElement("button");
      btn.className="prod";
      btn.type="button";
      btn.innerHTML=`<div class="prod-name">${esc(p.name)}</div><div class="prod-price">${fmtMoney(p.price)}</div>`;
      btn.onclick=()=>{addToCart(p.id);mainSaleHaptic();};
      grid.appendChild(btn);
    });
    renderCart();
  }
  function addToCart(id){
    cart[id]=(cart[id]||0)+1;
    renderCart();
  }
  function renderCart(){
    const block=$("#cartBlock");
    const items=Object.entries(cart);
    block.classList.toggle("show",items.length>0);
    if(!items.length){
      block.innerHTML=`<div class="empty">Папка пустая. Нажмите на товары, чтобы добавить в чек.</div>`;
      return;
    }
    let total=0;
    const rows=[];
    items.forEach(([pid,qty],i)=>{
      const p=state.products.find(x=>x.id===pid);
      if(!p){return;}
      total+=p.price*qty;
      rows.push(`
        <li class="cart-line" data-pid="${pid}">
          <span class="cart-name">${esc(p.name)}</span>
          <button class="icon-btn cart-minus" type="button">−</button>
          <span class="cart-unit">${qty}</span>
          <button class="icon-btn cart-plus" type="button">+</button>
        </li>
      `);
    });
    block.innerHTML=`
      <div class="cart-head">
        <span>Текущий чек</span>
        <span class="cart-total">${fmtMoney(total)}</span>
      </div>
      <ul class="cart-list">${rows.join("")}</ul>
      <div class="cart-foot">
        <button class="btn btn-ghost" id="clearCart">Очистить</button>
        <div class="cart-pay">
          <button class="btn btn-sm btn-cash" id="payCash">💵 Наличка</button>
          <button class="btn btn-sm btn-transfer" id="payTransfer">📲 Перевод</button>
        </div>
      </div>
    `;
    // bind +
    $$(".cart-plus",block).forEach(b=>{
      const pid=b.closest(".cart-line").dataset.pid;
      b.onclick=()=>{cart[pid]++;renderCart();};
    });
    // bind -
    $$(".cart-minus",block).forEach(b=>{
      const pid=b.closest(".cart-line").dataset.pid;
      b.onclick=()=>{cart[pid]--;if(cart[pid]<=0)delete cart[pid];renderCart();};
    });
    $("#clearCart").onclick=()=>{cart={};renderCart();};
    $("#payCash").onclick=()=>{payType="cash";finalizeSale();};
    $("#payTransfer").onclick=()=>{payType="transfer";finalizeSale();};
  }
  function finalizeSale(){
    if(Object.keys(cart).length===0){showToast("Корзина пуста");return;}
    const lines=[];
    let sum=0;
    for(const [pid,qty] of Object.entries(cart)){
      const p=state.products.find(x=>x.id===pid);
      if(!p){continue;}
      const price=p.price;
      sum+=price*qty;
      lines.push({id:pid,name:p.name,price,quantity:qty});
    }
    const sale={id:uid(),time:Date.now(),items:lines,total:sum,pay:payType};
    state.sales.push(sale);
    save();
    cart={};
    renderCart();
    showToast(`Записано: ${fmtMoney(sale.total)} ${sale.pay==="cash"? "наличка":"перевод"}`,3000);
    // tiny cancel window
    $("#confirmCloseBtn").classList.remove("hidden");
    setTimeout(()=>$("#confirmCloseBtn").classList.add("hidden"),5000);
    $("#confirmCloseBtn").onclick=()=>{
      state.sales.pop();
      save();
      showToast("Отменено");
      $("#confirmCloseBtn").classList.add("hidden");
    };
  }
  function mainSaleHaptic(){/* no vibration, optional visual */}
  // ---------- HISTORY ----------
  function renderHistory(){
    const m=$("#main");
    const today=todayKey();
    const filter=$("#dateFilter");
    m.innerHTML=`
      <section class="hero">
        <h2 class="screen-title">История за ${formatDateReadable(today)}</h2>
        <p class="subtitle">Выберите дату, чтобы посмотреть продажи.</p>
        <div class="toolbar right">
          <label>Дата:</label>
          <input type="date" id="dateFilter" value="${today}" max="${today}">
        </div>
      </section>
      <section class="sales-list" id="salesList"></section>
    `;
    const fl=$("#dateFilter");
    fl.onchange=()=>renderHistoryList();
    renderHistoryList();
  }
  function formatDateReadable(iso){
    const d=new Date(iso);
    const p=x=>String(x).padStart(2,"0");
    return `${p(d.getDate())}.${p(d.getMonth()+1)}.${d.getFullYear()}`;
  }
  function renderHistoryList(){
    const list=$("#salesList");
    const sel=$("#dateFilter").value;
    const daySales=state.sales.filter(s=>dayKey(s.time)===sel).sort((a,b)=>b.time-a.time);
    if(daySales.length===0){
      list.innerHTML=`<div class="empty">За ${formatDateReadable(sel)} продаж нет.</div>`;
      return;
    }
    list.innerHTML=daySales.map(s=>`
      <div class="sale-row">
        <div class="sale-time">${fmtTime(s.time)}</div>
        <div class="sale-items">
          ${s.items.map(i=>`<div>${i.name} ×${i.quantity}</div>`).join("")}
        </div>
        <div class="sale-sum">${fmtMoney(s.total)}</div>
        <div class="sale-pay ${s.pay==="cash"?"pay-cash":"pay-transfer"}">${s.pay==="cash"? "Наличка":"Перевод"}</div>
        <div class="sale-acts">
          <button class="icon-btn" data-id="${s.id}" title="Удалить">🗑️</button>
          <button class="icon-btn" data-id="${s.id}" title="Сменить оплату">💳</button>
        </div>
      </div>
    `).join("");
    $$(".sale-acts .icon-btn").forEach(b=>{
      const id=b.dataset.id;
      if(b.textContent==="🗑️"){
        b.onclick=()=>{confirm("Удалить эту продажу?",()=>{state.sales=state.sales.filter(x=>x.id!==id);save();renderHistoryList();});};
      }else{
        b.onclick=()=>{const s=state.sales.find(x=>x.id===id);if(!s)return;s.pay=s.pay==="cash"?"transfer":"cash";save();renderHistoryList();};
      }
    });
  // ---------- SUMMARY ----------
  function renderSummary(){
    const m=$("#main");
    const today=todayKey();
    const filter=$("#dateFilter");
    m.innerHTML=`
      <section class="hero">
        <h2 class="screen-title">Итоги за ${formatDateReadable(today)}</h2>
        <p class="subtitle">Выберите дату, чтобы посмотреть сводку.</p>
        <div class="toolbar right">
          <label>Дата:</label>
          <input type="date" id="dateFilter" value="${today}" max="${today}">
        </div>
      </section>
      <section class="stats" id="statsBlock"></section>
      <section class="counts-block" id="countsBlock"></section>
    `;
    const fl=$("#dateFilter");
    fl.onchange=()=>renderSummaryBlocks();
    renderSummaryBlocks();
  }
  function renderSummaryBlocks(){
    const sel=$("#dateFilter").value;
    const day=state.sales.filter(s=>dayKey(s.time)===sel);
    const cash=day.reduce((a,s)=>s.pay==="cash"?a+s.total:a,0);
    const transfer=day.reduce((a,s)=>s.pay==="transfer"?a+s.total:a,0);
    const total=cash+transfer;
    const cnt=day.length;
    const stats=$("#statsBlock");
    stats.innerHTML=`
      <div class="stat big"><div class="stat-val">${fmtMoney(total)}</div><div class="stat-lab">Общая выручка</div></div>
      <div class="stat"><div class="stat-val">${fmtMoney(cash)}</div><div class="stat-lab">Наличкой</div></div>
      <div class="stat"><div class="stat-val">${fmtMoney(transfer)}</div><div class="stat-lab">Переводом</div></div>
      <div class="stat"><div class="stat-val">${cnt} продаж</div><div class="stat-lab">Количество продаж</div></div>
    `;
    // товарные_counts
    const counts={};
    day.forEach(s=>{s.items.forEach(i=>{counts[i.name]=(counts[i.name]||0)+i.quantity;});});
    const countsEl=$("#countsBlock");
    if(Object.keys(counts).length===0){
      countsEl.innerHTML=`<div class="empty">Нет данных о товарах.</div>`;
      return;
    }
    countsEl.innerHTML=`
      <h3 class="screen-title">Продано товаров</h3>
      <ul class="counts">
        ${Object.entries(counts).map(([name,q])=>`
          <li class="count-row"><span class="cnt-name">${esc(name)}</span><span class="cnt-num">${q} шт.</span></li>
        `).join("")}
      </ul>
    `;
  }
  // ---------- PRODUCTS ----------
  function renderProducts(){
    const m=$("#main");
    m.innerHTML=`
      <section class="hero">
        <h2 class="screen-title">Товары</h2>
        <p class="subtitle">Добавляйте, редактируйте, скрывайте товары.</p>
      </section>
      <section class="manu-list" id="manuList"></section>
      <div style="height:12px"></div>
      <button class="btn btn-primary btn-block" id="addProd">➕ Добавить товар</button>
    `;
    renderProductList();
    $("#addProd").onclick=()=>openProductForm(null);
  }
  function renderProductList(){
    const list=$("#manuList");
    const active=state.products.filter(p=>p.active).sort((a,b)=>(a.order||0)-(b.order||0));
    const inactive=state.products.filter(p=>!p.active);
    list.innerHTML=`
      ${active.length?`<h3 class="screen-title">Активные товары</h3>`:""}
      <ul class="manu-list">
        ${active.map(p=>`
          <li class="manu-item">
            <div class="manu-name"><em>${esc(p.name)}</em>${p.price>0?` – ${fmtMoney(p.price)}`:""}</div>
            <div class="manu-actions">
              <button class="icon-btn" data-id="${p.id}" title="Изменить">✏️</button>
              <button class="icon-btn" data-id="${p.id}" title="${p.active?"Скрыть":"Показать"}">${p.active?"🙈":"👁️"}</button>
              <button class="icon-btn danger" data-id="${p.id}" title="Удалить">🗑️</button>
            </div>
          </li>
        `).join("")}
      </ul>
      ${inactive.length?`<h3 class="screen-title">Скрытые товары</h3>`:""}
      <ul class="manu-list">
        ${inactive.map(p=>`
          <li class="manu-item">
            <div class="manu-name"><em>${esc(p.name)}</em> (скрыто)</div>
            <div class="manu-actions">
              <button class="icon-btn" data-id="${p.id}" title="Изменить">✏️</button>
              <button class="icon-btn" data-id="${p.id}" title="Показать">👁️</button>
              <button class="icon-btn danger" data-id="${p.id}" title="Удалить">🗑️</button>
            </div>
          </li>
        `).join("")}
      </ul>
    `;
    $$(".manu-actions .icon-btn").forEach(b=>{
      const pid=b.dataset.id;
      const p=state.products.find(x=>x.id===pid);
      if(!p)return;
      if(b.textContent==="✏️"){
        b.onclick=()=>openProductForm(p);
      }else if(b.textContent==="🙈"||b.textContent==="👁️"){
        b.onclick=()=>{p.active=!p.active;save();renderProductList();};
      }else if(b.textContent==="🗑️"){
        b.onclick=()=>{confirm(`Удалить товар "${esc(p.name)}"?`,()=>{state.products=state.products.filter(x=>x.id!==pid);save();renderProductList();});};
      }
    });
  }
  function openProductForm(prod){
    const isEdit=!!prod;
    openModal(`
      <div class="mtag"><h3>${isEdit?"Изменить товар":"Добавить товар"}</h3></div>
      <div class="modal-form">
        <label>Название:</label>
        <input type="text" id="pfName" value="${isEdit?esc(prod.name):""}" placeholder="Например, Самса">
        <label>Цена (сом):</label>
        <input type="number" id="pfPrice" min="0" step="0.1" value="${isEdit?prod.price:""}" placeholder="Например, 3">
        <label class="mtag" style="margin-top:8px;">
          <input type="checkbox" id="pfActive" ${isEdit&&prod.active?"checked":""}>
          <span>Aктивен (показывать в продажах)</span>
        </label>
      </div>
      <div class="modal-actions">
        <button class="btn-sm btn-ghost" id="pfCancel">Отменить</button>
        <button class="btn-sm btn-primary" id="pfSave">${isEdit?"Сохранить":"Добавить"}</button>
      </div>
    `,ov=>{
      $("#pfCancel").onclick=closeModal;
      $("#pfSave").onclick=()=>{
        const name=$("#pfName").value.trim();
        const price=parseFloat($("#pfPrice").value);
        const active=$("#pfActive").checked;
        if(!name||isNaN(price)||price<0){showToast("Проверьте имя и цену");return;}
        if(isEdit){
          prod.name=name;
          prod.price=price;
          prod.active=active;
        }else{
          const newId=uid();
          state.products.push({id:newId,name,price:Number(price),active});
        }
        save();
        closeModal();
        renderProductList();
      };
    });
  }

  // ---------- init ----------
  $$(".nav-btn").forEach(b=>b.onclick=()=>switchScreen(b.dataset.screen));
  switchScreen("sale");
  // register service worker
  if("serviceWorker" in navigator){
    navigator.serviceWorker.register("./sw.js").catch(err=>console.log("SW error:",err));
  }
})();
