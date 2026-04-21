
import { auth, db } from "./firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { collection, addDoc, getDocs, query, where, doc, getDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { qs, qsa, money, shortDate, openMobileMenu, closeMobileMenu } from "./utils.js";

let uid=null, myUser=null, myDriver=null, trips=[], assigns=[], trucks=[];

onAuthStateChanged(auth, async user=>{
  if(!user){ window.location.href="../index.html"; return; }
  uid=user.uid;
  bindUI();
  await loadAll();
  render();
});

function bindUI(){
  qs("#logoutBtn").onclick=()=>signOut(auth).then(()=>window.location.href="../index.html");
  qs("#driverTripForm").onsubmit = async (e)=>{
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = Object.fromEntries(fd.entries());
    ["price","fuel","missionFees","returnPrice","returnMissionFees","returnFuel"].forEach(k=>data[k]=Number(data[k]||0));
    data.driverId = myDriver?.id || "";
    data.truckId = assigns[0]?.truckId || "";
    data.createdByUid = uid;
    data.createdAt = serverTimestamp();
    await addDoc(collection(db, "voyages"), data);
    e.target.reset();
    await loadTrips();
    render();
  };
  qsa(".nav-btn").forEach(btn=>btn.addEventListener("click", ()=>switchSection(btn.dataset.section)));
  qs("#menuToggle")?.addEventListener("click", openMobileMenu);
  qs("#closeMenu")?.addEventListener("click", closeMobileMenu);
  qs("#overlay")?.addEventListener("click", closeMobileMenu);
  qsa(".nav-btn").forEach(btn=>btn.addEventListener("click", ()=>{ if(window.innerWidth<=1100) closeMobileMenu(); }));
}

function switchSection(key){
  const map = {home:"#homeSection", myTrips:"#myTripsSection", myTruck:"#myTruckSection"};
  Object.values(map).forEach(sel=>qs(sel).classList.remove("active"));
  qs(map[key]).classList.add("active");
  qsa(".nav-btn").forEach(b=>b.classList.toggle("active", b.dataset.section===key));
}

async function loadAll(){
  const u = await getDoc(doc(db, "users", uid)); myUser = u.exists()? {id:u.id, ...u.data()} : null;
  const dSnap = await getDocs(query(collection(db, "chauffeurs"), where("email", "==", (myUser?.email||""))));
  myDriver = dSnap.docs[0] ? {id:dSnap.docs[0].id, ...dSnap.docs[0].data()} : null;
  const tSnap = await getDocs(collection(db, "camions")); trucks = tSnap.docs.map(d=>({id:d.id, ...d.data()}));
  await loadAssignments(); await loadTrips();
}
async function loadAssignments(){
  if(!myDriver){ assigns=[]; return; }
  const s = await getDocs(query(collection(db, "assignations"), where("driverId", "==", myDriver.id)));
  assigns = s.docs.map(d=>({id:d.id, ...d.data()}));
}
async function loadTrips(){
  if(!myDriver){ trips=[]; return; }
  const s = await getDocs(query(collection(db, "voyages"), where("driverId", "==", myDriver.id)));
  trips = s.docs.map(d=>({id:d.id, ...d.data()}));
}
function truckInfo(id){ return trucks.find(x=>x.id===id); }

function render(){
  const revenue = trips.reduce((s,x)=>s+Number(x.price||0)+Number(x.returnPrice||0),0);
  qs("#myTripCount").textContent = trips.length;
  qs("#myRevenue").textContent = money(revenue);
  qs("#myOdo").textContent = myDriver?.odometerAfter10Trips || "-";
  const myTruck = truckInfo(assigns[0]?.truckId);
  qs("#myTruckKpi").textContent = myTruck ? (myTruck.truckNumber || myTruck.brandModel || "-") : "-";

  qs("#myTripCards").innerHTML = trips.length ? trips.map(x=>`
    <div class="card-item">
      <h4>${x.client||"-"}</h4>
      <p><strong>Destination:</strong> ${x.destination||"-"}</p>
      <p><strong>Date départ / arrivée:</strong> ${shortDate(x.departDate)} → ${shortDate(x.arrivalDate)}</p>
      <p><strong>Prix:</strong> ${money(x.price||0)}</p>
      <p><strong>Gasoil:</strong> ${money(x.fuel||0)}</p>
      <p><strong>Frais mission:</strong> ${money(x.missionFees||0)}</p>
      <p><strong>Auteur, dépenses:</strong> ${x.authorExpense||"-"}</p>
      <p><strong>Retour:</strong> ${x.returnClient||"-"} / ${x.returnDestination||"-"}</p>
    </div>`).join("") : '<p class="muted">Aucun voyage.</p>';

  qs("#myTruckCard").innerHTML = myTruck ? `
    <div class="card-item">
      <h4>${myTruck.truckNumber||"-"} <span class="badge">${myTruck.plate||"-"}</span></h4>
      <p><strong>Marque / modèle:</strong> ${myTruck.brandModel||"-"}</p>
      <p><strong>Remarque:</strong> ${myTruck.note||"-"}</p>
      <p><strong>Remorque:</strong> ${myTruck.trailerNumber||"-"} / ${myTruck.trailerPlate||"-"}</p>
    </div>` : '<p class="muted">Aucun camion assigné.</p>';
}
