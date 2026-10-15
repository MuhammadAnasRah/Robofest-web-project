"use strict";
const initiatives = [
  {id:"digital-skills",name:"Women's Digital Skills Program",icon:"💻",color:"#5b3fc4",sdgs:["SDG 5"],description:"Training in coding, data and online work for women."},
  {id:"learning-center",name:"Accessible Learning Center",icon:"♿",color:"#0b7f7a",sdgs:["SDG 10"],description:"A learning space built for people with disabilities."},
  {id:"job-fair",name:"Inclusive Job Fair",icon:"🤝",color:"#b45309",sdgs:["SDG 5","SDG 10"],description:"Connects employers with women, youth and marginalised workers."},
  {id:"transport",name:"Safe Public Transport Campaign",icon:"🚌",color:"#1d4ed8",sdgs:["SDG 5","SDG 10"],description:"Safer, better-lit and more accessible routes for everyone."}
];
const groups = [
  {id:"Women",color:"#9d2f5f"},{id:"Youth",color:"#1d4ed8"},{id:"Persons with Disabilities",color:"#6d28d9"},
  {id:"Low-income Workers",color:"#b45309"},{id:"General Community",color:"#475569"}
];
const UNDER_THRESHOLD = 10; // % of participants below which a group triggers an alert
const KEY = "equalect-v1";
let state = {participants:[], nextId:1, minParticipants:10};
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const iniById = id => initiatives.find(i => i.id === id);
const pct = (n, t) => t ? Math.round(n / t * 1000) / 10 : 0;

function loadState() {
  try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && Array.isArray(s.participants)) state = Object.assign(state, s); } catch (e) {}
}
function saveState() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }


function calculateResults() {
  const total = state.participants.length;
  return initiatives.map(i => {
    const votes = state.participants.filter(p => p.initiative === i.id).length;
    return {...i, votes, percent: pct(votes, total)};
  });
}
function calculateGroupParticipation() {
  const total = state.participants.length;
  return groups.map(g => {
    const count = state.participants.filter(p => p.group === g.id).length;
    return {...g, count, percent: pct(count, total)};
  });
}
function determineMajority(results) {
  const max = Math.max(...results.map(r => r.votes));
  if (max === 0) return {status:"empty", leaders:[]};
  const leaders = results.filter(r => r.votes === max);
  return {status: leaders.length > 1 ? "tie" : "leader", leaders, max};
}
function checkParticipationThreshold() {
  const total = state.participants.length;
  return {met: total >= state.minParticipants, total, needed: Math.max(0, state.minParticipants - total)};
}
function checkUnderrepresentation() {
  const total = state.participants.length;
  if (!total) return [];
  return calculateGroupParticipation().filter(g => g.percent < UNDER_THRESHOLD);
}


function renderParticipants() {
  $("#pCount").textContent = state.participants.length;
  const list = $("#pList");
  if (!state.participants.length) {
    list.innerHTML = `<li class="empty" style="display:block"><div class="art" aria-hidden="true"><i></i><i></i><i></i></div><b>No participants yet.</b><br>Add one, or load the demo community.</li>`;
    return;
  }
  list.innerHTML = state.participants.map(p => {
    const g = groups.find(x => x.id === p.group);
    return `<li${p.id === justAdded ? ' class="new"' : ""}><div><b>${esc(p.name)}</b> <span class="gb" style="--g:${g.color}">${esc(p.group)}</span>${p.demo ? ' <small class="muted">(simulated)</small>' : ""}
      <br><small class="muted">Votes: ${esc(iniById(p.initiative).name)}</small></div>
      <button class="btn small" data-remove="${p.id}" aria-label="Remove vote for ${esc(p.name)}">Remove vote</button>
      <select data-change="${p.id}" aria-label="Change vote for ${esc(p.name)}">${initiatives.map(i => `<option value="${i.id}" ${i.id === p.initiative ? "selected" : ""}>Change vote: ${esc(i.name)}</option>`).join("")}</select></li>`;
  }).join("");
}



function update() { saveState(); renderAll(); }

function addParticipant(name, group, initiative, demo = false) {
  state.participants.push({id: state.nextId++, name, group, initiative, demo});
}
function changeVote(id, initiative) {
  const p = state.participants.find(x => x.id === id); if (!p) return;
  p.initiative = initiative; update(); showNotification(`${p.name} changed their vote.`);
}
function removeParticipant(id) {
  const p = state.participants.find(x => x.id === id); if (!p) return;
  state.participants = state.participants.filter(x => x.id !== id); update(); showNotification(`Vote removed for ${p.name}.`);
}
function clearDemoData() {
  state.participants = state.participants.filter(p => !p.demo); update(); showNotification("Demo data cleared.");
}
function resetVotes() {
  state = {participants:[], nextId:1, minParticipants:state.minParticipants};
  try { localStorage.removeItem(KEY); } catch (e) {}
  $("#formMsg").textContent = ""; $("#voteForm").reset(); $("#minP").value = state.minParticipants;
  renderAll(); showNotification("All votes have been reset.", "info");
}


let justAdded = null, lastKey = "";
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const ICON = {ok:"✓", info:"i", warn:"!", error:"✕"};

function showNotification(msg, type = "ok") {
  const t = document.createElement("div");
  t.className = "toast " + type;
  t.innerHTML = `<span class="ti" aria-hidden="true">${ICON[type] || "i"}</span><span>${esc(msg)}</span><button aria-label="Dismiss notification">×</button>`;
  t.querySelector("button").onclick = () => t.remove();
  $("#toasts").appendChild(t);
  setTimeout(() => t.remove(), 5000);
}

// Smoothly count a number from its previous value to a new one
function tween(el, to, fmt = v => Math.round(v)) {
  const from = parseFloat(el.dataset.v || 0); el.dataset.v = to;
  if (reduceMotion || from === to) { el.textContent = fmt(to); return; }
  const t0 = performance.now();
  (function step(t) {
    const k = Math.min(1, (t - t0) / 600), e = 1 - Math.pow(1 - k, 3);
    el.textContent = fmt(from + (to - from) * e);
    if (k < 1) requestAnimationFrame(step);
  })(t0);
}

// Bars are built once and updated in place so widths animate instead of restarting
function buildBars() {
  $("#bars").innerHTML = initiatives.map(i => `
    <div class="bar" style="--c:${i.color}"><div class="top"><span><span class="rank"></span>${esc(i.name)}<span class="pill" hidden></span></span><span class="num"><b class="v"></b> votes · <b class="p"></b>%</span></div>
    <div class="track" aria-hidden="true"><div class="fill"></div></div></div>`).join("");
  $("#groupBars").innerHTML = groups.map(g => `
    <div class="bar gbar" style="--c:${g.color}"><div class="top"><span>${esc(g.id)}<span class="pill low" hidden>Below ${UNDER_THRESHOLD}%</span></span><span class="num"><b class="v"></b> people · <b class="p"></b>%</span></div>
    <div class="track" aria-hidden="true"><span class="tick" style="left:${UNDER_THRESHOLD}%"></span><div class="fill"></div></div></div>`).join("");
}
function updateBar(el, count, percent) {
  tween(el.querySelector(".v"), count);
  tween(el.querySelector(".p"), percent, v => v.toFixed(1));
  el.querySelector(".fill").style.width = percent + "%";
}

function renderInitiatives() {
  const res = calculateResults(), m = determineMajority(res);
  $("#initiativeGrid").innerHTML = res.map(r => {
    const lead = m.leaders.some(l => l.id === r.id) && r.votes > 0;
    return `<article class="card ini${lead ? " is-leader" : ""}" style="--c:${r.color}">
      ${lead ? `<span class="flag">${m.status === "tie" ? "Tied" : "Leading"}</span>` : ""}
      <span class="ico" aria-hidden="true">${r.icon}</span><h3>${esc(r.name)}</h3><p>${esc(r.description)}</p>
      <div>${r.sdgs.map(s => `<span class="badge">${s}</span>`).join("")}</div>
      <div class="stat">${r.votes}<small>vote${r.votes === 1 ? "" : "s"} · ${r.percent}%</small></div>
      <button class="btn primary" data-vote="${r.id}" aria-label="Vote for ${esc(r.name)}">Vote for this</button></article>`;
  }).join("");
}

function meterHTML() {
  return `<div class="meter"><div class="mh"><span class="need"></span><span class="mc"></span></div><div class="mt" role="progressbar" aria-label="Participation toward the minimum" aria-valuemin="0" aria-valuemax="100"><i></i></div></div>`;
}
function decisionHTML(kind, m) {
  if (kind === "idle") return `<div class="art" aria-hidden="true"><i></i><i></i><i></i></div><h3>No votes yet.</h3><p>Add community participants to see the collective decision take shape.</p><a class="btn primary" href="#vote">Add a participant</a> <button class="btn ghost" data-act="demo">Load Demo Data</button>`;
  const label = {final:["✓","Final decision"], leader:["★","Current leader"], tie:["⇄","Tie: no majority"]}[kind];
  const head = `<span class="status ${kind}"><span aria-hidden="true">${label[0]}</span>${label[1]}</span>`;
  if (kind === "tie") return head + `<div class="n">${m.leaders.map(l => `<span class="chip" style="--c:${l.color}">${l.icon} ${esc(l.name)}</span>`).join('<span class="vs">vs</span>')}</div>
    <p><b class="dv big"></b> votes each</p><p class="expl">The community is currently split between these initiatives. Additional participation or a defined tie-breaking process would be required. No winner has been chosen.</p>` + meterHTML();
  const L = m.leaders[0];
  return head + `<div class="n" style="--c:${L.color}"><span class="tile" aria-hidden="true">${L.icon}</span>${esc(L.name)}</div>
    <div class="figs"><div><b class="dv big"></b><span>votes</span></div><div><b class="dp big"></b><span>% of votes</span></div><div><b class="dt big"></b><span>participants</span></div></div>
    <p class="expl">${kind === "final" ? "The minimum participation threshold is met, so this is the majority choice among the simulated votes." : "This is the current majority choice among the simulated votes. It is not a final decision yet."} A majority shows what most voters chose, not that every group agrees. Check participation below.</p>` + meterHTML();
}

function renderResults() {
  const res = calculateResults(), total = state.participants.length;
  const m = determineMajority(res), th = checkParticipationThreshold(), low = checkUnderrepresentation();
  const kind = m.status === "empty" ? "idle" : m.status === "tie" ? "tie" : th.met ? "final" : "leader";
  const key = kind + m.leaders.map(l => l.id).join();
  const d = $("#decision"), L = m.leaders[0];
  if (key !== lastKey) { d.className = "decision " + kind + " swap"; d.innerHTML = decisionHTML(kind, m); lastKey = key; }
  if (kind !== "idle") {
    const vals = {dv: m.max, dp: L.percent, dt: total};
    Object.keys(vals).forEach(k => { const el = d.querySelector("." + k); if (el) tween(el, vals[k], k === "dp" ? v => v.toFixed(1) : undefined); });
    const fillPct = Math.min(100, total / state.minParticipants * 100);
    d.querySelector(".mt i").style.width = fillPct + "%";
    d.querySelector(".mt").setAttribute("aria-valuenow", Math.round(fillPct));
    const need = d.querySelector(".need");
    need.className = "need" + (th.met ? " met" : "");
    need.textContent = th.met ? "Threshold met" : "More participation needed";
    d.querySelector(".mc").textContent = `${total} of ${state.minParticipants} participants` + (th.met ? "" : ` · ${th.needed} to go`);
  }
  const rankOf = r => res.filter(x => x.votes > r.votes).length;
  [...$("#bars").children].forEach((el, i) => {
    const r = res[i], lead = r.votes > 0 && m.leaders.some(l => l.id === r.id);
    updateBar(el, r.votes, r.percent);
    el.style.order = rankOf(r) * 10 + i;
    el.querySelector(".rank").textContent = rankOf(r) + 1;
    el.classList.toggle("leading", lead);
    const pill = el.querySelector(".pill"); pill.hidden = !lead; pill.textContent = m.status === "tie" ? "Tied" : "Leading";
  });
  $("#total").textContent = `${total} total vote${total === 1 ? "" : "s"}. Minimum for a final decision: ${state.minParticipants} participants.`;
  // One calm summary for screen readers instead of announcing every animated number
  $("#srStatus").textContent = kind === "idle" ? "No votes yet."
    : (kind === "tie" ? `Tie: ${m.leaders.map(l => l.name).join(" and ")} each have ${m.max} votes. No winner chosen.`
      : `${kind === "final" ? "Final majority decision" : "Current leader"}: ${L.name}, ${L.votes} votes, ${L.percent} percent.`)
      + (th.met ? "" : ` More participation needed: ${th.needed} more participants.`)
      + (low.length ? ` Participation alert for ${low.map(g => g.id).join(", ")}. No votes were changed.` : "");
}

function renderGroupParticipation() {
  const gp = calculateGroupParticipation(), total = state.participants.length;
  [...$("#groupBars").children].forEach((el, i) => {
    const g = gp[i], isLow = total > 0 && g.percent < UNDER_THRESHOLD;
    updateBar(el, g.count, g.percent);
    el.classList.toggle("underrep", isLow);
    el.querySelector(".pill").hidden = !isLow;
  });
  const low = checkUnderrepresentation();
  $("#alerts").innerHTML = !total ? "" : low.length
    ? low.map(g => `<div class="notice"><span class="ni" aria-hidden="true">i</span><div><b>Participation alert: ${esc(g.id)}</b><p>${esc(g.id)} represent ${g.percent}% of recorded participants. The current result reflects the participants who voted, but may not fully represent this group's preferences.</p><p class="sub">Transparency only: no votes were changed.</p></div></div>`).join("")
    : `<div class="notice ok"><span class="ni" aria-hidden="true">✓</span><div><b>Every group is at or above ${UNDER_THRESHOLD}% of participants.</b></div></div>`;
}

function renderHero() {
  const t = state.participants.length, m = determineMajority(calculateResults());
  $("#heroLive").textContent = !t ? "No votes yet. Start the simulation."
    : `${t} participant${t === 1 ? "" : "s"} · ${m.status === "tie" ? "currently tied" : "leading: " + m.leaders[0].name}`;
}
function renderAll() { renderInitiatives(); renderParticipants(); justAdded = null; renderResults(); renderGroupParticipation(); renderHero(); }

function initScrollSpy() {
  const links = [...document.querySelectorAll("#menu a")];
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) links.forEach(a => a.getAttribute("href") === "#" + e.target.id ? a.setAttribute("aria-current", "true") : a.removeAttribute("aria-current"));
  }), {rootMargin: "-45% 0px -50% 0px"});
  document.querySelectorAll("main section").forEach(s => io.observe(s));
}

function handleSubmit(e) {
  e.preventDefault();
  const group = $("#pGroup").value, init = $("#pInit").value;
  let name = $("#pName").value.trim(), msg = "", bad = "";
  if (!group) { msg = "No community group selected."; bad = "#pGroup"; }
  else if (!init) { msg = "Please select an initiative."; bad = "#pInit"; }
  else if (name && state.participants.some(p => p.name.toLowerCase() === name.toLowerCase())) { msg = "Participant already exists."; bad = "#pName"; }
  ["#pName", "#pGroup", "#pInit"].forEach(s => $(s).removeAttribute("aria-invalid"));
  $("#formMsg").textContent = msg;
  if (msg) { $(bad).setAttribute("aria-invalid", "true"); $(bad).focus(); showNotification(msg, "error"); return; }
  if (!name) name = "Participant " + String(state.nextId).padStart(2, "0");
  addParticipant(name, group, init);
  justAdded = state.nextId - 1;
  $("#pName").value = "";
  update();
  showNotification(`Vote added for ${name}.`);
  if (!checkParticipationThreshold().met) showNotification(`At least ${state.minParticipants} participants are required before declaring a final decision.`, "warn");
  else if (determineMajority(calculateResults()).status === "tie") showNotification("Voting is currently tied.", "warn");
}

function loadDemoData() {
  state.participants = state.participants.filter(p => !p.demo);
  // Votes (initiative index) per group: a clear leader, plus two small groups
  const demo = {"Women":[0,0,0,0,2,3,0],"Youth":[2,2,3,0,2],"Persons with Disabilities":[1,1],"Low-income Workers":[2,2,3,0],"General Community":[3,3,0,0,3,0,3,1]};
  Object.entries(demo).forEach(([g, votes]) => votes.forEach((v, i) => addParticipant(`${g.split(" ")[0]} ${i + 1}`, g, initiatives[v].id, true)));
  update(); showNotification("Demo community loaded. All participants are simulated.", "info");
}

function openModal() { $("#modal").hidden = false; $("#mCancel").focus(); }
function closeModal() { $("#modal").hidden = true; $("#resetBtn").focus(); }

function initializeApp() {
  loadState();
  $("#pGroup").innerHTML = `<option value="">Select a group</option>` + groups.map(g => `<option>${g.id}</option>`).join("");
  $("#pInit").innerHTML = `<option value="">Select an initiative</option>` + initiatives.map(i => `<option value="${i.id}">${i.name}</option>`).join("");
  $("#minP").value = state.minParticipants;
  $("#voteForm").addEventListener("submit", handleSubmit);
  $("#minP").addEventListener("input", e => { state.minParticipants = Math.max(1, parseInt(e.target.value) || 1); update(); });
  $("#pList").addEventListener("click", e => { const b = e.target.closest("[data-remove]"); if (b) removeParticipant(+b.dataset.remove); });
  $("#pList").addEventListener("change", e => { if (e.target.dataset.change) changeVote(+e.target.dataset.change, e.target.value); });
  $("#initiativeGrid").addEventListener("click", e => {
    const b = e.target.closest("[data-vote]"); if (!b) return;
    $("#pInit").value = b.dataset.vote; location.hash = "#vote"; $("#pName").focus({preventScroll:true});
    showNotification("Initiative selected. Choose a group and add the vote.");
  });
  document.body.addEventListener("click", e => {
    const a = e.target.closest("[data-act]"); if (!a) return;
    a.dataset.act === "demo" ? loadDemoData() : clearDemoData();
  });
  $("#resetBtn").onclick = $("#newBtn").onclick = openModal;
  $("#mCancel").onclick = closeModal;
  $("#mOk").onclick = () => { $("#modal").hidden = true; resetVotes(); };
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !$("#modal").hidden) closeModal(); });
  $("#burger").onclick = () => { const o = $("#menu").classList.toggle("open"); $("#burger").setAttribute("aria-expanded", o); };
  $("#menu").addEventListener("click", () => { $("#menu").classList.remove("open"); $("#burger").setAttribute("aria-expanded", false); });
  buildBars();
  initScrollSpy();
  renderAll();
}
initializeApp();
