/* ===== ELEMENTOS DOM ===== */
const drawer        = document.getElementById("drawer");
const search        = document.getElementById("search");
const list          = document.getElementById("list");
const confirmModal  = document.getElementById("confirmModal");
const confirmText   = document.getElementById("confirmText");
const addItemBtn    = document.getElementById("addItemBtn");
const editBtn       = document.getElementById("editBtn");
const editButtons   = document.getElementById("editButtons");
const ticketModal   = document.getElementById("ticketModal");
const ticketList    = document.getElementById("ticketList");
const viewTicketBtn = document.getElementById("viewTicketBtn");

/* ===== MODO EDICIÓN ===== */
let editMode = false;
function toggleEditMode(){
  editMode = !editMode;
  if(editButtons) editButtons.style.display = editMode ? "flex" : "none";
  addItemBtn.style.display = editMode ? "block" : "none";
  editBtn.textContent = editMode ? "↩️ Volver" : "✏️ Editar";
  render();
}

/* ===== CATEGORÍAS ===== */
const categories = [
  "Aguas",
  "Refrescos",
  "Cervezas",
  "Bodega",
  "Licores",
  "Café y té",
  "Frutas y verduras",
  "Lácteos y huevos",
  "Carne",
  "Marisco",
  "Limpieza",
  "Congelados",
  "Asiático",
  "Conservas",
  "Aceite, especias y salsas",
  "Otros"
];

/* ===== IVA POR CATEGORÍA ===== */
const categoryIVA = {
  "Aguas": 10,
  "Refrescos": 21,
  "Cervezas": 21,
  "Bodega": 21,
  "Licores": 21,
  "Café y té": 10,
  "Frutas y verduras": 4,
  "Lácteos y huevos": 4,
  "Carne": 10,
  "Marisco": 10,
  "Limpieza": 21,
  "Congelados": 10,
  "Asiático": 10,
  "Conservas": 10,
  "Aceite, especias y salsas": 10,
  "Otros": 21
};

let activeCat = categories[0];
let items = JSON.parse(localStorage.items || "[]");
items.forEach(i => {
if(!i.suppliers) i.suppliers = [];
if(i.mainSupplier == null) i.mainSupplier = 0;
if(!i.note) i.note = "";
if(i.iva == null) i.iva = categoryIVA[i.cat] || 21;
});

let cart  = JSON.parse(localStorage.cart  || "[]");
let deleteIndex = null;
let deleteType  = null;

/* ===== PROVEEDORES GLOBALES ===== */

// proveedores base del sistema
const baseProviders = [
  "Diemar",
  "Estrella Damm",
  "Bgrup",
  "Pascual",
  "Mercadona"
];

// proveedores guardados
let providers = JSON.parse(localStorage.providers || "[]");

// unir sin duplicados
providers = [...new Set([...baseProviders, ...providers])];

// filtro múltiple
let providerFilter = new Set();


/* ===== ORDEN INTELIGENTE ===== */
function parseQty(name){ const m = name.match(/([\d,.]+)/); return m ? parseFloat(m[1].replace(',', '.')) : null; }
function baseName(name){ return name.replace(/[\d.,]+\s*(cl|l|litros?|kg|g)?/i, '').trim(); }
function sortItems(){
  items.sort((a, b) => {
    if(a.cat !== b.cat) return a.cat.localeCompare(b.cat, 'es');
    const baseA = baseName(a.name), baseB = baseName(b.name);
    if(baseA !== baseB) return baseA.localeCompare(baseB, 'es');
    const qA = parseQty(a.name), qB = parseQty(b.name);
    if(qA!==null && qB!==null) return qA-qB;
    if(qA!==null) return -1;
    if(qB!==null) return 1;
    return a.name.localeCompare(b.name, 'es');
  });
}

/* ===== DRAWER ===== */
function toggleDrawer(){ drawer.classList.toggle("open"); }
function renderDrawer(){
  drawer.innerHTML = "";
  categories.forEach(cat => {
    const btn = document.createElement("button");
    btn.textContent = cat;
    if(cat === activeCat) btn.classList.add("active");
    btn.onclick = () => { activeCat = cat; toggleDrawer(); render(); };
    drawer.appendChild(btn);
  });
}

/* ===== RENDER PRINCIPAL ===== */
function render(){
  sortItems();
  renderDrawer();
  const q = (search?.value || "").toLowerCase();
  list.innerHTML = items
.filter(i => {

  const qActive = q.length > 0;
  const providerActive = providerFilter.size > 0;

  // ✅ categoría solo si no hay búsqueda ni filtro proveedor
  if(!qActive && !providerActive){
    if(i.cat !== activeCat) return false;
  }

  // ✅ filtro proveedor (multi)
  if(providerActive){
    const mainProv = i.suppliers?.[i.mainSupplier]?.name;
    if(!mainProv || !providerFilter.has(mainProv)) return false;
  }

  // ✅ filtro texto
  if(qActive){
    const nameMatch = i.name.toLowerCase().includes(q);
    const provMatch =
      i.suppliers?.[i.mainSupplier]?.name
        ?.toLowerCase()
        .includes(q);

    if(!nameMatch && !provMatch) return false;
  }

  return true;

})


    .map(i => {
      const realIndex = items.indexOf(i);
      return `
        <div class="item">
     <span>
  ${i.name}
  ${q ? `<small style="color:#666">(${i.cat})</small>` : ""}
${editMode && (i.suppliers?.length || i.note) ? `
  <small style="display:block;color:#666;font-size:12px;margin-top:4px">
    ${i.suppliers?.[i.mainSupplier]
      ? `💰 ${i.suppliers[i.mainSupplier].cost.toFixed(2)} €`
      : ""}
    ${i.suppliers?.length > 1
      ? ` · 🏭 ${i.suppliers.length} proveedores`
      : ""}
   ${i.note ? ` · 📝 ${i.note}` : ""}
· IVA ${i.iva || 21}%
  </small>
` : ""}

</span>
          <div>
            ${editMode
              ? `<button class="del" onclick="askDeleteItem('${i.name.replace(/'/g,"\\'")}')">✕</button>
                 <button class="edit" onclick="editItem(${realIndex})">✏️</button>`
              : `<button class="add" onclick="showQtyModal('${i.name.replace(/'/g,"\\'")}')">+</button>`}
          </div>
        </div>
      `;
    }).join("");
  renderTicket();
  localStorage.items = JSON.stringify(items);
  localStorage.cart  = JSON.stringify(cart);
  localStorage.providers = JSON.stringify(providers);

}

/* ===== EDITAR ARTÍCULO ===== */
function editItem(index){
  const item = items[index];
 if(!item.suppliers) item.suppliers = [];
if(item.mainSupplier == null) item.mainSupplier = 0;
if(!item.note) item.note = "";

  const m = document.createElement("div");
  m.className = "modal";
  m.style.display = "flex";

  m.innerHTML = `
  <div class="box">
    <h3>Editar artículo</h3>

    <label>Nombre</label>
    <input id="iname" value="${item.name}">

    <label>Categoría</label>
    <select id="icat">
      ${categories.map(c => `<option ${c===item.cat?'selected':''}>${c}</option>`).join("")}
    </select>

    <p>Añadir proveedor</p>
    <select id="providerSelect">
      <option value="">-- seleccionar --</option>
      ${providers.map(p => `<option>${p}</option>`).join("")}
    </select>
    <input id="providerNew" placeholder="o escribir proveedor nuevo">
    <input id="providerCost" type="number" step="0.01" placeholder="Precio">
    <button id="addProvider">➕ Añadir proveedor</button>

    <p>Proveedores del artículo</p>
    <ul id="providerList"></ul>

    <p>Proveedor principal (nº)</p>
    <input id="imain" type="number" min="1" value="${item.suppliers.length ? item.mainSupplier + 1 : 1}">

    <p>IVA</p>
    <select id="iiva">
      <option value="0">0%</option>
      <option value="4">4%</option>
      <option value="10">10%</option>
      <option value="21">21%</option>
    </select>

    <p>Nota interna</p>
    <textarea id="inote">${item.note}</textarea>

    <div>
      <button id="save">Guardar</button>
      <button id="cancel">Cancelar</button>
    </div>
  </div>
  `;

  document.body.appendChild(m);
  m.querySelector("#iiva").value = item.iva ?? 21;

  const ul = m.querySelector("#providerList");

  function refreshProviderList(){
    ul.innerHTML = item.suppliers.map((s,i)=>`
      <li>
        ${s.name} — ${s.cost.toFixed(2)} €
        <button class="remove-provider" data-index="${i}">✕</button>
      </li>
    `).join("");

    ul.querySelectorAll(".remove-provider").forEach(btn=>{
      btn.onclick = () => {
        const idx = Number(btn.dataset.index);
        item.suppliers.splice(idx,1);
        if(item.mainSupplier >= item.suppliers.length){
          item.mainSupplier = 0;
        }
        refreshProviderList();
      };
    });
  }

  refreshProviderList();

  // Añadir proveedor
  m.querySelector("#addProvider").onclick = () => {
    const selectName = m.querySelector("#providerSelect").value.trim();
    const newName    = m.querySelector("#providerNew").value.trim();
    const name = newName || selectName;
    const cost = parseFloat(m.querySelector("#providerCost").value);

    if(!name) return alert("Selecciona o escribe proveedor");
    if(isNaN(cost)) return alert("Introduce precio válido");

    if(item.suppliers.some(s => s.name === name)){
      return alert("Proveedor ya añadido");
    }

    item.suppliers.push({ name, cost });
    item.mainSupplier = item.suppliers.map(s => s.cost).indexOf(Math.min(...item.suppliers.map(s=>s.cost)));

    if(!providers.includes(name)) providers.push(name);

    m.querySelector("#providerSelect").value = "";
    m.querySelector("#providerNew").value = "";
    m.querySelector("#providerCost").value = "";

    refreshProviderList();
  };

  // Botón Cancelar
  m.querySelector("#cancel").onclick = () => m.remove();

  // Botón Guardar
  m.querySelector("#save").onclick = () => {
    const name = m.querySelector("#iname").value.trim();
    if(!name) return alert("Nombre requerido");

    item.name = name;
    item.cat = m.querySelector("#icat").value;
    item.iva = parseInt(m.querySelector("#iiva").value) || categoryIVA[item.cat] || 21;
    item.note = m.querySelector("#inote").value;
    const mainProv = parseInt(m.querySelector("#imain").value);
    item.mainSupplier = Math.max(0, Math.min(mainProv - 1, item.suppliers.length - 1));

    m.remove();
    render();
  };
}

/* ===== NUEVO ARTÍCULO ===== */
function showAddItem(){
  const m = document.createElement("div");
  m.className="modal";
  m.style.display="flex";

  m.innerHTML = `
    <div class="box">
      <h3>Nuevo artículo</h3>
      <input id="iname">
      <select id="icat">
        ${categories.map(c=>`<option>${c}</option>`).join("")}
      </select>
      <div>
        <button id="save">Guardar</button>
        <button id="cancel">Cancelar</button>
      </div>
    </div>`;

  document.body.appendChild(m);

  m.querySelector("#cancel").onclick = ()=> m.remove();

  m.querySelector("#save").onclick = ()=>{
    const name = m.querySelector("#iname").value.trim();
    if(!name) return alert("Nombre requerido");

    const cat = m.querySelector("#icat").value;

    items.push({
      name,
      cat,
      suppliers: [],
      mainSupplier: 0,
      note: "",
      iva: categoryIVA[cat] || 21
    });

    m.remove();
    render();
  };
}


/* ===== CANTIDAD ===== */
function showQtyModal(name){
  let qty = 1, unit = "UNIDAD";
  const m = document.createElement("div");
  m.className = "modal";
  m.style.display = "flex";
  m.innerHTML = `
    <div class="box">
      <h3>${name}</h3>
      <div class="btns qty">
        ${[1,2,3,4,5,6,7,8,9,10].map(n=>`<button>${n}</button>`).join("")}
      </div>
      <div class="btns unit">
        <button class="active">UNIDAD</button>
        <button>KG</button>
        <button>CAJA</button>
      </div>
      <div>
        <button id="add">Añadir</button>
        <button id="cancel">Cancelar</button>
      </div>
    </div>
  `;
  document.body.appendChild(m);

  // ✅ marcar cantidad 1 por defecto
  const firstQtyBtn = m.querySelector(".qty button");
  if(firstQtyBtn){
    firstQtyBtn.classList.add("active");
  }

  m.querySelectorAll(".qty button").forEach(b=>{
    b.onclick = () => {
      m.querySelectorAll(".qty button").forEach(x => x.classList.remove("active"));
      b.classList.add("active");
      qty = +b.textContent;
    };
  });

  m.querySelectorAll(".unit button").forEach(b=>{
    b.onclick = () => {
      m.querySelectorAll(".unit button").forEach(x => x.classList.remove("active"));
      b.classList.add("active");
      unit = b.textContent;
    };
  });

  m.querySelector("#cancel").onclick = () => m.remove();
  m.querySelector("#add").onclick = () => {
    const found = cart.find(c=>c.name===name && c.unit===unit);
    found ? found.qty += qty : cart.push({ name, qty, unit });
    m.remove();
    render();
  };
}

/* ===== TICKET ===== */
function renderTicket(){
  ticketList.innerHTML = cart.map((c,i)=>`
    <li>
      <span>${c.name}</span>
      <span>${c.qty} ${c.unit}</span>
      <button class="del" onclick="askDeleteTicket(${i})">✕</button>
    </li>
  `).join("");
  viewTicketBtn.textContent = `🧾 Ver Ticket [ ${String(cart.length).padStart(2,"0")} ]`;
  viewTicketBtn.style.display = cart.length?"block":"none";
}
function openTicketModal(){ renderTicket(); ticketModal.style.display="flex"; }
function closeTicketModal(){ ticketModal.style.display="none"; }

/* ===== ELIMINAR ===== */
function askDeleteItem(name){ deleteType="item"; deleteIndex=items.findIndex(i=>i.name===name); confirmText.textContent=`¿Eliminar ${name}?`; confirmModal.style.display="flex"; }
function askDeleteTicket(i){ deleteType="ticket"; deleteIndex=i; confirmText.textContent=`¿Eliminar ${cart[i].name}?`; confirmModal.style.display="flex"; }
function askResetTicket(){ deleteType="reset"; confirmText.textContent="¿Eliminar ticket de pedido?"; confirmModal.style.display="flex"; }
function confirmDelete(){ if(deleteType==="item") items.splice(deleteIndex,1); if(deleteType==="ticket") cart.splice(deleteIndex,1); if(deleteType==="reset") cart=[]; closeConfirm(); render(); }
function closeConfirm(){ confirmModal.style.display="none"; }

/* ===== WHATSAPP ===== */
function buildWhatsAppText(){
  let txt = "🧾 *PEDIDO*\n\n";
  categories.forEach(cat=>{
    const lines = cart.filter(c =>
      items.find(i => i.name === c.name && i.cat === cat)
    );
    if(lines.length){
      txt += `*${cat}*\n`;
      lines.forEach(l=>{
        txt += `- ${l.name}: ${l.qty} ${l.unit}\n`;
      });
      txt += "\n";
    }
  });
  return txt.trim();
}

function previewWhatsApp(){
  const m = document.createElement("div");
  m.className = "modal";
  m.style.display = "flex";
  m.innerHTML = `
    <div class="box">
      <h3>Vista previa WhatsApp</h3>
      <textarea style="width:100%;height:220px">${buildWhatsAppText()}</textarea>
      <div>
        <button id="cancel">Cancelar</button>
        <button id="send">Enviar</button>
      </div>
    </div>
  `;
  document.body.appendChild(m);

  m.querySelector("#cancel").onclick = () => m.remove();
  m.querySelector("#send").onclick = () => {
    const txt = m.querySelector("textarea").value;
    window.open(
      "https://wa.me/?text=" + encodeURIComponent(txt),
      "_blank"
    );
    m.remove();
  };
}

function sendWhatsApp(){
  previewWhatsApp();
}


/* ===== IMPRIMIR ===== */
function printTicket(){
  const container=document.getElementById("print-ticket");
  const fecha=document.getElementById("ticket-fecha");
  const itemsContainer=document.getElementById("ticket-items");
  fecha.textContent=new Date().toLocaleString();
  itemsContainer.innerHTML="";
  cart.forEach(c=>{
    const div=document.createElement("div");
    div.innerHTML=`<span>${c.name}</span><span>${c.qty} ${c.unit}</span>`;
    itemsContainer.appendChild(div);
  });
  container.style.display="block"; window.print(); container.style.display="none";
}

/* ===== FILTRO POR PROVEEDOR ===== */
function openProviderFilter(){
  const m = document.createElement("div");
  m.className = "modal";
  m.style.display = "flex";

  m.innerHTML = `
    <div class="box">
      <h3>Filtrar por proveedor</h3>

      <div class="chips">
        ${providers.map(p => `
          <button class="chip ${providerFilter.has(p) ? 'active':''}" data-prov="${p}">
            ${p}
          </button>
        `).join("")}
      </div>

      <div class="ticket-actions">
  <button id="clear">🗑 Limpiar</button>
  <button id="close">✅ Aplicar</button>
</div>

    </div>
  `;

  document.body.appendChild(m);

  // toggle selección
  m.querySelectorAll(".chip").forEach(btn=>{
    btn.onclick = () => {
      const p = btn.dataset.prov;

      if(providerFilter.has(p)){
        providerFilter.delete(p);
        btn.classList.remove("active");
      } else {
        providerFilter.add(p);
        btn.classList.add("active");
      }
    };
  });

  m.querySelector("#clear").onclick = () => {
    providerFilter.clear();
    m.remove();
    render();
  };

  m.querySelector("#close").onclick = () => {
    m.remove();
    render();
  };
}

/* ===== INICIAL ===== */
if(items.length===0){
  items = [
    {name:"Agua 50cl",cat:"Aguas", suppliers:[], mainSupplier:0, note:"", iva:10},
    {name:"Agua 1,25 litros",cat:"Aguas", suppliers:[], mainSupplier:0, note:"", iva:10},
    {name:"Coca Cola",cat:"Refrescos", suppliers:[], mainSupplier:0, note:"", iva:21}
  ];
}



// Guardar en localStorage si era vacío
localStorage.items = JSON.stringify(items);

// Render inicial
render();

// Escuchar búsqueda
search.addEventListener("input", render);

/* ===== EXPORTAR / IMPORTAR ===== */
function exportData(){
  const data = { items, cart, providers };

  const blob = new Blob(
    [JSON.stringify(data, null, 2)],
    { type: "application/json" }
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "backup_despensa.json";
  a.click();
  URL.revokeObjectURL(url);
}

function importData(event){
  const file = event.target.files[0];
  if(!file) return;

  const reader = new FileReader();

  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);

      if(data.items && data.cart){
        providers = data.providers || providers;
        items = data.items;
        cart  = data.cart;

        // normalizar
        items.forEach(i => {
          if(!i.suppliers) i.suppliers = [];
          if(i.mainSupplier == null) i.mainSupplier = 0;
          if(!i.note) i.note = "";
          if(i.iva == null) i.iva = categoryIVA[i.cat] || 21;
        });

        localStorage.providers = JSON.stringify(providers);
        localStorage.items = JSON.stringify(items);
        localStorage.cart  = JSON.stringify(cart);

        render();
        alert("Copia restaurada correctamente ✅");
      } else {
        alert("Archivo inválido ⚠️");
      }

    } catch {
      alert("Error al leer el archivo ⚠️");
    }
  };

  reader.readAsText(file);
}

function removeProvider(itemIndex, supplierIndex){
  items[itemIndex].suppliers.splice(supplierIndex,1);
  render();
}

/* ===== VERSIONES ===== */

// Guardar una versión manual
function saveBackup(){
  const backups = JSON.parse(localStorage.backups || "[]");
  const timestamp = new Date().toISOString();
  backups.push({
    date: timestamp,
    items: JSON.parse(JSON.stringify(items)),
    cart:  JSON.parse(JSON.stringify(cart)),
    providers: JSON.parse(JSON.stringify(providers))
  });
  localStorage.backups = JSON.stringify(backups);
  alert("Versión guardada ✅");
}

// Mostrar lista de versiones y restaurar
function showBackups(){
  const backups = JSON.parse(localStorage.backups || "[]");
  if(backups.length === 0){
    alert("No hay versiones guardadas");
    return;
  }

  const m = document.createElement("div");
  m.className = "modal";
  m.style.display = "flex";

  m.innerHTML = `
    <div class="box">
      <h3>Versiones guardadas</h3>
      <div class="chips">
        ${backups.map((b,i)=>`
          <button class="chip restore" data-i="${i}">
            ${new Date(b.date).toLocaleString()}
          </button>
        `).join("")}
      </div>
      <div class="ticket-actions" style="margin-top:12px">
        <button id="saveNew">💾 Guardar versión</button>
        <button id="close">❌ Cerrar</button>
      </div>
    </div>
  `;

  document.body.appendChild(m);

  // Restaurar versión
  m.querySelectorAll(".restore").forEach(btn=>{
    btn.onclick = ()=>{
      const b = backups[btn.dataset.i];
      items = b.items;
      cart  = b.cart;
      providers = b.providers;
      localStorage.items = JSON.stringify(items);
      localStorage.cart  = JSON.stringify(cart);
      localStorage.providers = JSON.stringify(providers);
      render();
      m.remove();
      alert("Versión restaurada ✅");
    };
  });

  // Guardar nueva versión
  m.querySelector("#saveNew").onclick = ()=>{
    saveBackup();
    m.remove();
  };

  m.querySelector("#close").onclick = ()=> m.remove();
}
