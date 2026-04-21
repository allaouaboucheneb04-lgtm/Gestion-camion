export function money(v){return new Intl.NumberFormat('fr-CA',{style:'currency',currency:'CAD'}).format(Number(v||0));}
export function fmtDate(v){ if(!v) return '-'; const d=v?.toDate ? v.toDate() : new Date(v); return isNaN(d)?'-':d.toLocaleString('fr-CA'); }
export function slug(v=''){ return String(v).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,''); }
export function contains(v,q){ return slug(v).includes(slug(q)); }
export function esc(v=''){ return String(v).replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s])); }
export function dtValue(v){ if(!v) return ''; const d=v?.toDate ? v.toDate() : new Date(v); if(isNaN(d)) return ''; const pad=n=>String(n).padStart(2,'0'); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; }
