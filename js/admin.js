
import { auth, db } from "./firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { collection, addDoc, getDocs, deleteDoc, doc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { qs, qsa, money, shortDate, today, drawChart, openMobileMenu, closeMobileMenu } from "./utils.js";

const sections = {
  dashboard: qs("#dashboardSection"),
  camions: qs("#camionsSection"),
  chauffeurs: qs("#chauffeursSection"),
  voyages: qs("#voyagesSection"),
  entretiens: qs("#entretiensSection"),
  depenses: qs("#depensesSection"),
  assignations: qs("#assignationsSection"),
  rapport: qs("#rapportSection")
};

const state = { camions:[], chauffeurs:[], voyages:[], entretiens:[], depenses:[], assignations:[] };

onAuthStateChanged(auth, async user => {
  if(!user){ window.location.href="../index.html"; return; }
  bindUI();
  await loadAll();
  renderAll();
});

function bindUI(){
  qsa(".nav-btn").forEach(btn => btn.addEventListener("click", ()=>switchSection(btn.dataset.section, btn.textContent)));
  qs("#logoutBtn").onclick = ()=>signOut(auth).then(()=>window.location.href="../index.html");
  qs("#truckForm").onsubmit = submitter("camions");
  qs("#driverForm").onsubmit = submitter("chauffeurs");
  qs("#tripForm").onsubmit = submitter("voyages");
  qs("#maintenanceForm").onsubmit = submitter("entretiens");
  qs("#expenseForm").onsubmit = submitter("depenses");
  qs("#assignForm").onsubmit = submitter("assignations");
  qs("#searchInput").addEventListener("input", renderAll);
  qs("#periodFilter").addEventListener("change", renderAll);
  qs("#menuToggle")?.addEventListener("click", openMobileMenu);
  qs("#closeMenu")?.addEventListener("click", closeMobileMenu);
  qs("#overlay")?.addEventListener("click", closeMobileMenu);
  qsa(".nav-btn").forEach(btn => btn.addEventListener("click", ()=>{ if(window.innerWidth<=1100) closeMobileMenu(); }));
}

function switchSection(key, title){
  Object.values(sections).forEach(s=>s.classList.remove("active"));
  sections[key].classList.add("active");
  qs("#pageTitle").textContent = title;
  qs("#pageTitleMobile").textContent = title;
  qsa(".nav-btn").forEach(b=>b.classList.toggle("active", b.dataset.section===key));
}

function submitter(name){
  return async (e)=>{
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = Object.fromEntries(fd.entries());
    ["price","fuel","missionFees","returnPrice","returnMissionFees","returnFuel","amount","odometerAfter10Trips"].forEach(k=>{ if(k in data) data[k]=Number(data[k]||0); });
    data.createdAt = serverTimestamp();
    if(!data.date && (name==="entretiens" || name==="depenses")) data.date = today();
    if(!data.assignedDate && name==="assignations") data.assignedDate = today();
    await addDoc(collection(db, name), data);
    e.target.reset();
    await loadAll();
    renderAll();
  };
}

async function loadAll(){
  for(const key of Object.keys(state)){
    const snap = await getDocs(collection(db,key));
    state[key] = snap.docs.map(d=>({id:d.id, ...d.data()}));
  }
  fillSelects();
}

function fillSelects(){
  const dOpts = '<option value="">Nom du chauffeur</option>' + state.chauffeurs.map(d=>`<option value="${d.id}">${d.name||"-"}</option>`).join("");
  const tOpts = '<option value="">Camion</option>' + state.camions.map(t=>`<option value="${t.id}">${t.truckNumber||t.brandModel||"-"}</option>`).join("");
  ["#tripDriverSelect", "#assignDriverSelect"].forEach(id=>{ const el=qs(id); if(el) el.innerHTML=dOpts; });
  ["#tripTruckSelect", "#maintenanceTruckSelect", "#assignTruckSelect"].forEach(id=>{ const el=qs(id); if(el) el.innerHTML=tOpts; });
}

function driverName(id){ return state.chauffeurs.find(x=>x.id===id)?.name || "-"; }
function truckLabel(id){ const t=state.camions.find(x=>x.id===id); return t ? `${t.truckNumber||""} ${t.plate||""}`.trim() : "-"; }

function matchesPeriod(item){
  const p = qs("#periodFilter").value;
  if(p==="all") return true;
  const ds = item.departDate || item.date || item.assignedDate;
  if(!ds) return true;
  const d = new Date(ds), n = new Date();
  if(p==="today") return d.toDateString()===n.toDateString();
  if(p==="month") return d.getMonth()===n.getMonth() && d.getFullYear()===n.getFullYear();
  return true;
}
function searchOk(text){
  const q=(qs("#searchInput").value||"").toLowerCase().trim();
  if(!q) return true;
  return text.toLowerCase().includes(q);
}
function fil(arr, mapper){ return arr.filter(x=>matchesPeriod(x)&&searchOk(mapper(x))); }

function renderAll(){
  const camions = fil(state.camions, x=>`${x.truckNumber} ${x.plate} ${x.brandModel} ${x.note} ${x.trailerNumber} ${x.trailerPlate}`);
  const chauffeurs = fil(state.chauffeurs, x=>`${x.name} ${x.driverNumber} ${x.licenseNumber} ${x.address} ${x.email}`);
  const voyages = fil(state.voyages, x=>`${x.client} ${x.destination} ${driverName(x.driverId)} ${truckLabel(x.truckId)} ${x.returnClient} ${x.returnDestination}`);
  const entretiens = fil(state.entretiens, x=>`${x.category} ${truckLabel(x.truckId)} ${x.note}`);
  const depenses = fil(state.depenses, x=>`${x.type} ${x.note}`);
  const assignations = fil(state.assignations, x=>`${driverName(x.driverId)} ${truckLabel(x.truckId)}`);

  qs("#truckCards").innerHTML = camions.length ? camions.map(x=>`
    <div class="card-item">
      <h4>${x.truckNumber||"-"} <span class="badge">${x.plate||"-"}</span></h4>
      <p><strong>Marque / modèle:</strong> ${x.brandModel||"-"}</p>
      <p><strong>Remarque:</strong> ${x.note||"-"}</p>
      <p><strong>Remorque:</strong> ${x.trailerNumber||"-"} / ${x.trailerPlate||"-"}</p>
      <div class="actions"><button class="btnDanger del" data-col="camions" data-id="${x.id}">Supprimer</button></div>
    </div>`).join("") : '<p class="muted">Aucun camion.</p>';

  qs("#driverCards").innerHTML = chauffeurs.length ? chauffeurs.map(x=>`
    <div class="card-item">
      <h4>${x.name||"-"}</h4>
      <p><strong>Numéro chauffeur:</strong> ${x.driverNumber||"-"}</p>
      <p><strong>Permis:</strong> ${x.licenseNumber||"-"}</p>
      <p><strong>Adresse:</strong> ${x.address||"-"}</p>
      <p><strong>Email:</strong> ${x.email||"-"}</p>
      <p><strong>Kilométrage après 10 voyages:</strong> ${x.odometerAfter10Trips||"-"}</p>
      <div class="actions"><button class="btnDanger del" data-col="chauffeurs" data-id="${x.id}">Supprimer</button></div>
    </div>`).join("") : '<p class="muted">Aucun chauffeur.</p>';

  qs("#tripCards").innerHTML = voyages.length ? voyages.map(x=>`
    <div class="card-item">
      <h4>${x.client||"-"}</h4>
      <p><strong>Destination:</strong> ${x.destination||"-"}</p>
      <p><strong>Départ / arrivée:</strong> ${shortDate(x.departDate)} → ${shortDate(x.arrivalDate)}</p>
      <p><strong>Prix course:</strong> ${money(x.price||0)}</p>
      <p><strong>Gasoil:</strong> ${money(x.fuel||0)}</p>
      <p><strong>Frais mission:</strong> ${money(x.missionFees||0)}</p>
      <p><strong>Auteur, dépenses:</strong> ${x.authorExpense||"-"}</p>
      <p><strong>Chauffeur:</strong> ${driverName(x.driverId)}</p>
      <p><strong>Camion:</strong> ${truckLabel(x.truckId)}</p>
      <hr>
      <p><strong>Retour client / destination:</strong> ${x.returnClient||"-"} / ${x.returnDestination||"-"}</p>
      <p><strong>Date retour / arrivée:</strong> ${shortDate(x.returnDate)} → ${shortDate(x.returnArrivalDate)}</p>
      <p><strong>Prix retour:</strong> ${money(x.returnPrice||0)}</p>
      <p><strong>Frais retour:</strong> ${money(x.returnMissionFees||0)}</p>
      <p><strong>Gasoil retour:</strong> ${money(x.returnFuel||0)}</p>
      <div class="actions"><button class="btnDanger del" data-col="voyages" data-id="${x.id}">Supprimer</button></div>
    </div>`).join("") : '<p class="muted">Aucun voyage.</p>';

  qs("#maintenanceCards").innerHTML = entretiens.length ? entretiens.map(x=>`
    <div class="card-item">
      <h4>${x.category||"-"}</h4>
      <p><strong>Camion:</strong> ${truckLabel(x.truckId)}</p>
      <p><strong>Montant:</strong> ${money(x.amount||0)}</p>
      <p><strong>Date:</strong> ${shortDate(x.date)}</p>
      <p><strong>Détail:</strong> ${x.note||"-"}</p>
      <div class="actions"><button class="btnDanger del" data-col="entretiens" data-id="${x.id}">Supprimer</button></div>
    </div>`).join("") : '<p class="muted">Aucun entretien.</p>';

  qs("#expenseCards").innerHTML = depenses.length ? depenses.map(x=>`
    <div class="card-item">
      <h4>${x.type||"-"}</h4>
      <p><strong>Montant:</strong> ${money(x.amount||0)}</p>
      <p><strong>Date:</strong> ${shortDate(x.date)}</p>
      <p><strong>Note:</strong> ${x.note||"-"}</p>
      <div class="actions"><button class="btnDanger del" data-col="depenses" data-id="${x.id}">Supprimer</button></div>
    </div>`).join("") : '<p class="muted">Aucune dépense.</p>';

  qs("#assignCards").innerHTML = assignations.length ? assignations.map(x=>`
    <div class="card-item">
      <h4>${driverName(x.driverId)}</h4>
      <p><strong>Camion:</strong> ${truckLabel(x.truckId)}</p>
      <p><strong>Date:</strong> ${shortDate(x.assignedDate)}</p>
      <div class="actions"><button class="btnDanger del" data-col="assignations" data-id="${x.id}">Supprimer</button></div>
    </div>`).join("") : '<p class="muted">Aucune assignation.</p>';

  bindDelete();

  const revenue = voyages.reduce((s,x)=>s+Number(x.price||0)+Number(x.returnPrice||0),0);
  const tripExpenses = voyages.reduce((s,x)=>s+Number(x.fuel||0)+Number(x.missionFees||0)+Number(x.returnFuel||0)+Number(x.returnMissionFees||0),0);
  const maintenance = entretiens.reduce((s,x)=>s+Number(x.amount||0),0);
  const others = depenses.reduce((s,x)=>s+Number(x.amount||0),0);
  const expense = tripExpenses + maintenance + others;
  const profit = revenue - expense;

  qs("#revKpi").textContent = money(revenue);
  qs("#depKpi").textContent = money(expense);
  qs("#benKpi").textContent = money(profit);
  qs("#voyKpi").textContent = voyages.length;
  qs("#truckKpi").textContent = camions.length;
  qs("#driverKpi").textContent = chauffeurs.length;
  qs("#maintKpi").textContent = entretiens.length;
  qs("#otherKpi").textContent = money(others);

  drawChart(qs("#chart"), revenue, expense, profit);

  qs("#reportTable").innerHTML = `
    <tr><td>Nombre de camions</td><td>${camions.length}</td></tr>
    <tr><td>Nombre de chauffeurs</td><td>${chauffeurs.length}</td></tr>
    <tr><td>Nombre de voyages</td><td>${voyages.length}</td></tr>
    <tr><td>Montant revenus</td><td>${money(revenue)}</td></tr>
    <tr><td>Montant dépenses voyage</td><td>${money(tripExpenses)}</td></tr>
    <tr><td>Montant entretiens</td><td>${money(maintenance)}</td></tr>
    <tr><td>Autres dépenses</td><td>${money(others)}</td></tr>
    <tr><td>Bénéfice global</td><td>${money(profit)}</td></tr>
  `;
}

function bindDelete(){
  document.querySelectorAll(".del").forEach(btn=>{
    btn.onclick = async ()=>{
      await deleteDoc(doc(db, btn.dataset.col, btn.dataset.id));
      await loadAll();
      renderAll();
    };
  });
}
