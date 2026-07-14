const ARRIVAL_DEFAULTS=["Chocks","First passenger on bus","Last passenger at aircraft","Arrived at gate","Last passenger departed bus"];
const DEPARTURE_DEFAULTS=["First passenger on board","Last passenger on bus","Arrived at aircraft / gate","Last passenger departed bus","Aircraft pushback"];
const $=id=>document.getElementById(id);
const store={get(k,f){try{return JSON.parse(localStorage.getItem(k))??f}catch{return f}},set(k,v){localStorage.setItem(k,JSON.stringify(v))}};
let state={loggedIn:false,session:null,movementType:"arrival",count:0,totals:{passengers:0,highlift:0,crew:0},route:{from:"",to:""},flight:{number:"",,registration:""},timestamps:{},labels:{arrival:[...ARRIVAL_DEFAULTS],departure:[...DEPARTURE_DEFAULTS]},editingId:null};
function toast(m){$("toast").textContent=m;$("toast").classList.add("show");setTimeout(()=>$("toast").classList.remove("show"),1800)}
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]))}
function fmtTime(i){return i?new Date(i).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit",second:"2-digit"}):"Tap to record"}
function fmtDate(i){return i?new Date(i).toLocaleString():""}
function persist(){if(state.loggedIn)store.set("abl_active",state)}
function password(){return localStorage.getItem("abl_password")||"1234"}
function login(){const b=$("busId").value.trim().toUpperCase(),km=Number($("startKm").value);if(!b)return toast("Enter bus ID");if(!Number.isFinite(km))return toast("Enter starting kilometres");if($("password").value!==password())return toast("Incorrect password");state={loggedIn:true,session:{id:Date.now(),busId:b,startKm:km,endKm:null,startedAt:new Date().toISOString(),endedAt:null,movements:[]},movementType:"arrival",count:0,totals:{passengers:0,highlift:0,crew:0},route:{from:"",to:""},flight:{number:"",,registration:""},timestamps:{},labels:{arrival:[...ARRIVAL_DEFAULTS],departure:[...DEPARTURE_DEFAULTS]},editingId:null};persist();render()}
function capture(){state.flight={number:$("flightNumber").value.trim().toUpperCase(),};state.route={from:$("fromLocation").value.trim().toUpperCase(),to:$("toLocation").value.trim().toUpperCase()};state.totals={passengers:Math.max(0,Number($("totalPassengers").value)||0),highlift:Math.max(0,Number($("totalHighlift").value)||0),crew:Math.max(0,Number($("totalCrew").value)||0)};state.count=state.totals.passengers;persist()}
function render(){ $("loginScreen").hidden=state.loggedIn;$("appScreen").hidden=!state.loggedIn;if(!state.loggedIn)return;$("sessionSummary").textContent=`Bus ${state.session.busId} · Start ${state.session.startKm} km`;renderCounter();renderMovement();renderDashboard();renderFlightLog();renderHistory()}
function renderCounter(){$("passengerCount").textContent=state.count;$("passengerPill").textContent=`${state.count} pax`;$("totalPassengers").value=state.totals.passengers;$("totalHighlift").value=state.totals.highlift;$("totalCrew").value=state.totals.crew}
function renderMovement(){
  const a=state.movementType==="arrival";
  $("arrivalBtn").classList.toggle("active",a);
  $("departureBtn").classList.toggle("active",!a);
  $("fromLabel").textContent=a?"From bay":"From gate";
  $("toLabel").textContent=a?"To gate":"To bay / aircraft";
  $("flightNumber").value=state.flight.number;
  
  
  $("fromLocation").value=state.route.from;
  $("toLocation").value=state.route.to;

  state.labels ||= {arrival:[...ARRIVAL_DEFAULTS],departure:[...DEPARTURE_DEFAULTS]};
  state.labels.arrival ||= [...ARRIVAL_DEFAULTS];
  state.labels.departure ||= [...DEPARTURE_DEFAULTS];
  while(state.labels.departure.length < DEPARTURE_DEFAULTS.length){
    state.labels.departure.push(DEPARTURE_DEFAULTS[state.labels.departure.length]);
  }

  const labels=state.labels[state.movementType];
  $("timestampList").innerHTML=labels.map((l,i)=>`
    <div class="timestamp-row">
      <div class="timestamp-main-row">
        <button class="timestamp-btn ${state.timestamps[i]?"done":""}" data-stamp="${i}">
          <strong>${i+1}. ${esc(l)}</strong>
          <span>${fmtTime(state.timestamps[i])}</span>
        </button>
        <button class="rename-icon" data-rename="${i}" aria-label="Rename timestamp" title="Rename timestamp">✎</button>
      </div>
    </div>`).join("");

  document.querySelectorAll("[data-stamp]").forEach(x=>x.onclick=()=>{
    state.timestamps[Number(x.dataset.stamp)]=new Date().toISOString();
    persist();renderMovement();toast("Timestamp recorded");
  });

  document.querySelectorAll("[data-rename]").forEach(x=>x.onclick=()=>{
    const i=Number(x.dataset.rename);
    const current=state.labels[state.movementType][i];
    const renamed=prompt("Rename timestamp",current);
    if(renamed===null)return;
    const clean=renamed.trim();
    if(!clean)return toast("Timestamp name cannot be blank");
    state.labels[state.movementType][i]=clean;
    persist();renderMovement();toast("Timestamp renamed");
  });
}
function renderDashboard(){const m=state.session.movements,p=m.reduce((a,x)=>a+Number(x.passengers||0),0);$("dashFlights").textContent=m.length;$("dashPassengers").textContent=p;$("dashHighlift").textContent=m.reduce((a,x)=>a+Number(x.highlift||0),0);$("dashCrew").textContent=m.reduce((a,x)=>a+Number(x.crew||0),0);$("dashAverage").textContent=m.length?(p/m.length).toFixed(1):"0";$("dashKm").textContent=state.session.endKm==null?"In progress":(state.session.endKm-state.session.startKm).toFixed(1)}
function saveFlight(){capture();if(!state.flight.number)return toast("Enter flight number");if(!state.route.from||!state.route.to)return toast("Enter both locations");if(!Object.keys(state.timestamps).length)return toast("Record at least one timestamp");const labels=state.labels[state.movementType],item={id:state.editingId||Date.now(),flightNumber:state.flight.number,airline:state.flight.airline,type:state.movementType,from:state.route.from,to:state.route.to,passengers:state.totals.passengers,highlift:state.totals.highlift,crew:state.totals.crew,savedAt:new Date().toISOString(),timestamps:labels.map((n,i)=>({name:n,time:state.timestamps[i]||""}))};if(state.editingId){const i=state.session.movements.findIndex(x=>x.id===state.editingId);state.session.movements[i]=item;toast("Flight updated")}else{state.session.movements.push(item);toast("Flight saved")}resetMovement(false);persist();render()}
function renderFlightLog(){
  const q=$("flightSearch").value.trim().toLowerCase();
  const list=state.session.movements.filter(m=>
    !q || `${m.flightNumber} ${m.type} ${m.from} ${m.to}`.toLowerCase().includes(q)
  );

  if(!list.length){
    $("flightLog").innerHTML='<p class="empty">No flights saved.</p>';
    return;
  }

  $("flightLog").innerHTML=[...list].reverse().map(m=>{
    const timestamps=(m.timestamps||[]).map(t=>`
      <div class="flight-detail-line">
        <span>${esc(t.name)}</span>
        <strong>${t.time?fmtTime(t.time):"Not recorded"}</strong>
      </div>`).join("");

    return `
      <details class="flight-item" open>
        <summary class="flight-summary">
          <div>
            <strong>${esc(m.flightNumber)}</strong>
            <small>${m.type==="arrival"?"Arrival":"Departure"} · ${esc(m.from)} → ${esc(m.to)}</small>
          </div>
          <span>${fmtTime(m.savedAt)}</span>
        </summary>

        <div class="flight-details">
          <div class="flight-detail-line">
            <span>Flight number</span>
            <strong>${esc(m.flightNumber)}</strong>
          </div>
          <div class="flight-detail-line">
            <span>Movement</span>
            <strong>${m.type==="arrival"?"Arrival":"Departure"}</strong>
          </div>
          <div class="flight-detail-line">
            <span>Route</span>
            <strong>${esc(m.from)} → ${esc(m.to)}</strong>
          </div>
          <div class="flight-detail-line">
            <span>Total passengers</span>
            <strong>${Number(m.passengers)||0}</strong>
          </div>
          <div class="flight-detail-line">
            <span>Total Highlift</span>
            <strong>${Number(m.highlift)||0}</strong>
          </div>
          <div class="flight-detail-line">
            <span>Total Crew</span>
            <strong>${Number(m.crew)||0}</strong>
          </div>
          <div class="flight-detail-line">
            <span>Flight logged</span>
            <strong>${fmtDate(m.savedAt)}</strong>
          </div>

          <div class="timestamp-heading">Timestamps</div>
          ${timestamps || '<p class="empty">No timestamps recorded.</p>'}

          <div class="flight-actions">
            <button class="btn ghost edit-flight" data-id="${m.id}">Edit</button>
            <button class="btn danger delete-flight" data-id="${m.id}">Delete</button>
          </div>
        </div>
      </details>`;
  }).join("");

  document.querySelectorAll(".edit-flight").forEach(b=>
    b.onclick=e=>{
      e.preventDefault();
      editFlight(Number(b.dataset.id));
    }
  );
  document.querySelectorAll(".delete-flight").forEach(b=>
    b.onclick=e=>{
      e.preventDefault();
      deleteFlight(Number(b.dataset.id));
    }
  );
}
function editFlight(id){const m=state.session.movements.find(x=>x.id===id);if(!m)return;state.editingId=id;state.movementType=m.type;state.flight={number:m.flightNumber,airline:m.airline||""};state.route={from:m.from,to:m.to};state.totals={passengers:Number(m.passengers)||0,highlift:Number(m.highlift)||0,crew:Number(m.crew)||0};state.count=state.totals.passengers;state.timestamps={};m.timestamps.forEach((t,i)=>{state.labels[m.type][i]=t.name;if(t.time)state.timestamps[i]=t.time});persist();render();window.scrollTo({top:0,behavior:"smooth"});toast("Editing flight")}
function deleteFlight(id){const m=state.session.movements.find(x=>x.id===id);if(m&&confirm(`Delete flight ${m.flightNumber}?`)){state.session.movements=state.session.movements.filter(x=>x.id!==id);persist();render();toast("Flight deleted")}}
function resetMovement(ask=true){if(ask&&!confirm("Clear current flight details?"))return;state.count=0;state.totals={passengers:0,highlift:0,crew:0};state.route={from:"",to:""};state.flight={number:"",,registration:""};state.timestamps={};state.editingId=null;persist();render()}
function finishShift(){const km=Number($("endKm").value);if(!Number.isFinite(km)||km<state.session.startKm)return toast("Enter valid ending kilometres");state.session.endKm=km;state.session.endedAt=new Date().toISOString();const h=store.get("abl_history",[]);h.unshift(state.session);store.set("abl_history",h);localStorage.removeItem("abl_active");state.loggedIn=false;$("endShiftModal").hidden=true;render();toast("Shift saved")}
function renderHistory(){const h=store.get("abl_history",[]);$("historyList").innerHTML=h.length?h.map(s=>{const p=s.movements.reduce((a,m)=>a+Number(m.passengers||0),0),hl=s.movements.reduce((a,m)=>a+Number(m.highlift||0),0),c=s.movements.reduce((a,m)=>a+Number(m.crew||0),0);return `<details class="history-shift"><summary>${esc(s.busId)} · ${fmtDate(s.startedAt)}</summary><div class="history-line"><span>Flights</span><strong>${s.movements.length}</strong></div><div class="history-line"><span>Passengers</span><strong>${p}</strong></div><div class="history-line"><span>Highlift</span><strong>${hl}</strong></div><div class="history-line"><span>Crew</span><strong>${c}</strong></div><div class="history-line"><span>Kilometres</span><strong>${(s.endKm-s.startKm).toFixed(1)}</strong></div></details>`}).join(""):'<p class="empty">No completed shifts yet.</p>'}
function exportCsv(){const h=store.get("abl_history",[]);if(state.loggedIn)h.unshift(state.session);const rows=[["Shift Start","Shift End","Bus","Start KM","End KM","Flight",Airline","Movement","From","To","Passengers","Highlift","Crew","Timestamp Name","Timestamp"]];h.forEach(s=>s.movements.forEach(m=>m.timestamps.forEach(t=>rows.push([s.startedAt,s.endedAt||"",s.busId,s.startKm,s.endKm??"",m.flightNumber,m.type,m.from,m.to,m.passengers,m.highlift,m.crew,t.name,t.time]))));const csv=rows.map(r=>r.map(v=>`"${String(v??"").replace(/"/g,'""')}"`).join(",")).join("\n"),a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));a.download=`airside-bus-records-${new Date().toISOString().slice(0,10)}.csv`;a.click();URL.revokeObjectURL(a.href)}
function switchTab(n){["operation","history","settings"].forEach(t=>{$(`${t}Tab`).hidden=t!==n;document.querySelector(`[data-tab="${t}"]`).classList.toggle("active",t===n)})}
function normalizeState(saved){
  if(!saved || !saved.loggedIn || !saved.session) return null;
  saved.movementType = saved.movementType === "departure" ? "departure" : "arrival";
  saved.count = Math.max(0, Number(saved.count) || 0);
  saved.totals = saved.totals || {passengers:saved.count,highlift:0,crew:0};
  saved.totals.passengers = Math.max(0, Number(saved.totals.passengers) || 0);
  saved.totals.highlift = Math.max(0, Number(saved.totals.highlift) || 0);
  saved.totals.crew = Math.max(0, Number(saved.totals.crew) || 0);
  saved.route = saved.route || {from:"",to:""};
  saved.flight = saved.flight || {number:"",,registration:""};
  saved.flight.registration = saved.flight.registration || "";
  saved.timestamps = saved.timestamps || {};
  saved.labels = saved.labels || {};
  saved.labels.arrival = Array.isArray(saved.labels.arrival) ? saved.labels.arrival : [...ARRIVAL_DEFAULTS];
  saved.labels.departure = Array.isArray(saved.labels.departure) ? saved.labels.departure : [...DEPARTURE_DEFAULTS];
  while(saved.labels.arrival.length < ARRIVAL_DEFAULTS.length) saved.labels.arrival.push(ARRIVAL_DEFAULTS[saved.labels.arrival.length]);
  while(saved.labels.departure.length < DEPARTURE_DEFAULTS.length) saved.labels.departure.push(DEPARTURE_DEFAULTS[saved.labels.departure.length]);
  saved.editingId = saved.editingId || null;
  saved.session.movements = Array.isArray(saved.session.movements) ? saved.session.movements : [];
  return saved;
}
function init(){const a=normalizeState(store.get("abl_active",null));if(a)state=a;$("loginBtn").onclick=login;$("plusBtn").onclick=()=>{state.count++;state.totals.passengers=state.count;persist();renderCounter()};$("minusBtn").onclick=()=>{state.count=Math.max(0,state.count-1);state.totals.passengers=state.count;persist();renderCounter()};$("resetCountBtn").onclick=()=>{state.count=0;state.totals.passengers=0;persist();renderCounter()};["totalPassengers","totalHighlift","totalCrew","flightNumber","fromLocation","toLocation"].forEach(id=>$(id).oninput=()=>{capture();renderCounter()});$("arrivalBtn").onclick=()=>{state.movementType="arrival";state.timestamps={};persist();renderMovement()};$("departureBtn").onclick=()=>{state.movementType="departure";state.timestamps={};persist();renderMovement()};$("saveFlightBtn").onclick=saveFlight;$("undoTimestampBtn").onclick=()=>{const k=Object.keys(state.timestamps).map(Number).sort((a,b)=>b-a);if(k.length){delete state.timestamps[k[0]];persist();renderMovement()}};$("clearMovementBtn").onclick=()=>resetMovement(true);$("flightSearch").oninput=renderFlightLog;$("endShiftBtn").onclick=()=>{$("endShiftSummary").textContent=`Bus ${state.session.busId} started at ${state.session.startKm} km.`;$("endShiftModal").hidden=false};$("cancelEndShiftBtn").onclick=()=>$("endShiftModal").hidden=true;$("confirmEndShiftBtn").onclick=finishShift;$("savePasswordBtn").onclick=()=>{const p=$("newPassword").value;if(p.length<4)return toast("Use at least 4 characters");localStorage.setItem("abl_password",p);toast("Password changed")};$("clearHistoryBtn").onclick=()=>{if(confirm("Clear completed history?")){localStorage.removeItem("abl_history");renderHistory()}};$("exportCsvBtn").onclick=exportCsv;document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>switchTab(b.dataset.tab));setInterval(()=>{$("liveClock").textContent=new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})},1000);render();if("serviceWorker"in navigator)navigator.serviceWorker.register("service-worker.js")}
document.addEventListener("DOMContentLoaded",init);
