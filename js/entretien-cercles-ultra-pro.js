
/* Entretien Cercles Ultra Pro Animés */
function ecNum(v){var n=Number(v||0);return Number.isFinite(n)?n:0;}
function ecT(fr,ar){return document.documentElement.lang==='ar'?ar:fr;}
function ecStatus(p){if(p>=100)return{c:'danger',i:'🔴',l:ecT('Dépassé','متجاوز')};if(p>=90)return{c:'danger',i:'🔴',l:ecT('Urgent','عاجل')};if(p>=70)return{c:'warning',i:'🟡',l:ecT('Bientôt','قريبا')};return{c:'ok',i:'🟢',l:'OK'};}
async function ecLastKmByCamion(db){
  var snap=await db.collection('odometres').get();var map={};
  snap.forEach(function(doc){var d=doc.data();if(!d.camionId)return;var km=ecNum(d.km);if(!map[d.camionId]||km>map[d.camionId])map[d.camionId]=km;});
  return map;
}
function ecCircle(type,pct,rest,kmActuel,startKm,st){
  var r=42,circ=2*Math.PI*r,safe=Math.max(0,Math.min(100,pct)),offset=circ-(safe/100)*circ;
  return '<div class="ec-item '+st.c+'"><div class="ec-circle"><svg viewBox="0 0 110 110"><circle class="ec-bg" cx="55" cy="55" r="'+r+'"></circle><circle class="ec-progress '+st.c+'" cx="55" cy="55" r="'+r+'" stroke-dasharray="'+circ+'" stroke-dashoffset="'+circ+'" style="--ec-offset:'+offset+';"></circle></svg><div class="ec-center"><strong>'+safe+'%</strong><small>'+st.i+'</small></div></div><div class="ec-info"><h4>'+type+'</h4><span class="ec-badge '+st.c+'">'+st.l+'</span><p>'+rest.toLocaleString()+' km '+ecT('restants','متبقية')+'</p><small>'+ecT('Actuel','الحالي')+': '+kmActuel.toLocaleString()+' km · '+ecT('Départ','البداية')+': '+startKm.toLocaleString()+' km</small></div></div>';
}
async function loadEntretienCerclesUltraPro(){
  var el=document.getElementById('alertesEntretienHtml')||document.getElementById('alertesEntretienCompact')||document.getElementById('dashboardEntretien')||document.getElementById('entretienUltraDashboard')||document.getElementById('alertesEntretienContainer');
  if(!el||typeof firebase==='undefined')return;
  try{
    var db=firebase.firestore();
    var results=await Promise.all([db.collection('camions').get(),db.collection('alertes_entretien').get()]);
    var camionsSnap=results[0],alertesSnap=results[1],lastKm=await ecLastKmByCamion(db);
    var camions=[],alertes=[];
    camionsSnap.forEach(function(doc){var c=doc.data();camions.push({id:doc.id,nom:c.numeroCamion||c.numeroPlaque||c.marqueModele||c.name||'Camion',data:c});});
    alertesSnap.forEach(function(doc){var a=doc.data();alertes.push({id:doc.id,type:a.type||a.nom||a.name||'Entretien',intervalKm:ecNum(a.intervalKm||a.intervalleKm||a.km||a.kilometrage),data:a});});
    var selectedCamion=(document.getElementById('ecFilterCamion')||{}).value||'all';
    var selectedType=(document.getElementById('ecFilterType')||{}).value||'all';
    var selectedStatus=(document.getElementById('ecFilterStatus')||{}).value||'all';
    var search=((document.getElementById('ecFilterSearch')||{}).value||'').toLowerCase().trim();
    var total=0,urgent=0,soon=0,cards='';
    camions.filter(function(c){return selectedCamion==='all'||c.id===selectedCamion;}).filter(function(c){return !search||c.nom.toLowerCase().includes(search);}).forEach(function(camion){
      var kmActuel=ecNum(lastKm[camion.id]||camion.data.kmActuel||camion.data.km||0);
      var dernier=camion.data.dernierEntretien||{};
      var circles='';
      alertes.forEach(function(a){
        if(selectedType!=='all'&&a.type!==selectedType)return;
        var startKm=ecNum(dernier[a.type]||0),used=Math.max(0,kmActuel-startKm),interval=a.intervalKm||1;
        var pct=Math.min(100,Math.round((used/interval)*100)),rest=Math.max(0,interval-used),st=ecStatus(pct);
        if(selectedStatus!=='all'&&st.c!==selectedStatus)return;
        total++;if(st.c==='danger')urgent++;if(st.c==='warning')soon++;
        circles+=ecCircle(a.type,pct,rest,kmActuel,startKm,st);
      });
      if(circles){cards+='<div class="ec-truck-card"><div class="ec-truck-head"><h3>🚛 '+camion.nom+'</h3><p>'+ecT('KM actuel','الكيلومتر الحالي')+': <b>'+kmActuel.toLocaleString()+' km</b></p></div><div class="ec-grid">'+circles+'</div></div>';}
    });
    el.innerHTML='<div class="ec-wrap"><div class="ec-title"><h2>'+ecT('Entretien — Cercles Ultra Pro','الصيانة — دوائر احترافية')+'</h2><p>'+ecT('Vue compacte, animée et claire par camion','عرض مختصر ومتحرك حسب الشاحنة')+'</p></div><div class="ec-kpis"><div><span>'+ecT('Alertes','تنبيهات')+'</span><b>'+total+'</b></div><div><span>'+ecT('Urgentes','عاجلة')+'</span><b>'+urgent+'</b></div><div><span>'+ecT('Bientôt','قريبا')+'</span><b>'+soon+'</b></div></div><div class="ec-filters"><input id="ecFilterSearch" value="'+((document.getElementById('ecFilterSearch')||{}).value||'')+'" oninput="loadEntretienCerclesUltraPro()" placeholder="'+ecT('Recherche camion...','بحث عن شاحنة...')+'"><select id="ecFilterCamion" onchange="loadEntretienCerclesUltraPro()"></select><select id="ecFilterType" onchange="loadEntretienCerclesUltraPro()"></select><select id="ecFilterStatus" onchange="loadEntretienCerclesUltraPro()"><option value="all">'+ecT('Tous statuts','كل الحالات')+'</option><option value="ok" '+(selectedStatus==='ok'?'selected':'')+'>🟢 OK</option><option value="warning" '+(selectedStatus==='warning'?'selected':'')+'>🟡 '+ecT('Bientôt','قريبا')+'</option><option value="danger" '+(selectedStatus==='danger'?'selected':'')+'>🔴 '+ecT('Urgent','عاجل')+'</option></select></div><div class="ec-list">'+(cards||'<div class="ec-empty">'+ecT('Aucune alerte','لا توجد تنبيهات')+'</div>')+'</div></div>';
    var fc=document.getElementById('ecFilterCamion'),ft=document.getElementById('ecFilterType');
    if(fc){fc.innerHTML='<option value="all">'+ecT('Tous les camions','كل الشاحنات')+'</option>';camions.forEach(function(c){var o=document.createElement('option');o.value=c.id;o.textContent=c.nom;fc.appendChild(o);});fc.value=selectedCamion;}
    if(ft){ft.innerHTML='<option value="all">'+ecT('Tous les entretiens','كل الصيانات')+'</option>';alertes.forEach(function(a){var o=document.createElement('option');o.value=a.type;o.textContent=a.type;ft.appendChild(o);});ft.value=selectedType;}
  }catch(e){console.error(e);el.innerHTML='<div class="ec-error">Erreur entretien: '+e.message+'</div>';}
}
document.addEventListener('DOMContentLoaded',function(){setTimeout(loadEntretienCerclesUltraPro,700);});
