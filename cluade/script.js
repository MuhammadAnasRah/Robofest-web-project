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

function showNotification(msg, type = "info") {
  const t = document.createElement("div");
  t.className = "toast " + type; t.textContent = msg;
  $("#toasts").appendChild(t);
  setTimeout(() => t.remove(), 4500);
}

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

function renderInitiatives() {
  const res = calculateResults();
  $("#initiativeGrid").innerHTML = res.map(r => `
    <article class="card ini" style="--c:${r.color}">
      <span class="ico" aria-hidden="true">${r.icon}</span>
      <h3>${esc(r.name)}</h3>
      <p>${esc(r.description)}</p>
      <div>${r.sdgs.map(s => `<span class="badge">${s}</span>`).join("")}</div>
      <div class="stat">${r.votes} vote${r.votes === 1 ? "" : "s"} · ${r.percent}%</div>
      <button class="btn primary" data-vote="${r.id}">Vote for this</button>
    </article>`).join("");
}

function renderParticipants() {
  $("#pCount").textContent = state.participants.length;
  const list = $("#pList");
  if (!state.participants.length) {
    list.innerHTML = `<li class="empty" style="display:block"><div class="art"></div><b>No participants yet.</b><br>Add one, or load the demo community.</li>`;
    return;
  }
  list.innerHTML = state.participants.map(p => {
    const g = groups.find(x => x.id === p.group);
    return `<li><div><b>${esc(p.name)}</b> <span class="gb" style="--g:${g.color}">${esc(p.group)}</span>${p.demo ? ' <small class="muted">(simulated)</small>' : ""}
      <br><small class="muted">Votes: ${esc(iniById(p.initiative).name)}</small></div>
      <button class="btn small" data-remove="${p.id}" aria-label="Remove vote for ${esc(p.name)}">Remove vote</button>
      <select data-change="${p.id}" aria-label="Change vote for ${esc(p.name)}">${initiatives.map(i => `<option value="${i.id}" ${i.id === p.initiative ? "selected" : ""}>Change vote: ${esc(i.name)}</option>`).join("")}</select></li>`;
  }).join("");
}

function renderResults() {
  const res = calculateResults(), total = state.participants.length;
  const m = determineMajority(res), th = checkParticipationThreshold();
  const d = $("#decision");
  if (m.status === "empty") {
    d.className = "decision";
    d.innerHTML = `<div class="empty"><div class="art"></div><h3>No votes yet.</h3><p>Add community participants to see the collective decision take shape.</p></div>`;
  } else if (m.status === "tie") {
    d.className = "decision tie";
    d.innerHTML = `<div class="k">NO MAJORITY — TIE</div><div class="n">${m.leaders.map(l => esc(l.name)).join(" and ")}</div>
      <p>${m.leaders.length} initiatives each have ${m.max} vote${m.max === 1 ? "" : "s"}. The community is currently split between these initiatives. Additional participation or a defined tie-breaking process would be required. No winner has been chosen.</p>`;
  } else {
    const w = m.leaders[0];
    d.className = "decision " + (th.met ? "final" : "lead");
    d.innerHTML = `<div class="k">${th.met ? "FINAL MAJORITY DECISION (eligible for declaration)" : "CURRENT LEADER"}</div>
      <div class="n">${w.icon} ${esc(w.name)}</div><p><b>${w.votes} votes · ${w.percent}%</b> of ${total} recorded participants.</p>
      <p>${th.met ? "The minimum participation threshold is met. This is the majority choice among the simulated votes." : `More participation needed before declaring a final community decision. At least ${state.minParticipants} participants are required; ${th.needed} more to go.`}
      The most votes is not the same as support from every group, so check participation below.</p>`;
  }
  const ranked = [...res].sort((a, b) => b.votes - a.votes);
  $("#bars").innerHTML = ranked.map((r, i) => `
    <div class="bar" style="--c:${r.color}"><div class="top"><span><span class="rank" aria-label="Rank ${i + 1}">${i + 1}</span>${esc(r.name)}</span><span>${r.votes} · ${r.percent}%</span></div>
    <div class="track"><div class="fill" data-w="${r.percent}"></div></div></div>`).join("");
  $("#total").textContent = `${total} total vote${total === 1 ? "" : "s"} · threshold ${Math.min(total, state.minParticipants)}/${state.minParticipants} participants`;
  animateBars("#bars");
}
function animateBars(sel) { requestAnimationFrame(() => requestAnimationFrame(() => document.querySelectorAll(sel + " .fill").forEach(f => f.style.width = f.dataset.w + "%"))); }

function renderGroupParticipation() {
  const gp = calculateGroupParticipation();
  $("#groupBars").innerHTML = gp.map(g => `
    <div class="bar" style="--c:${g.color}"><div class="top"><span>${esc(g.id)}</span><span>${g.count} participant${g.count === 1 ? "" : "s"} · ${g.percent}%</span></div>
    <div class="track"><div class="fill" data-w="${g.percent}"></div></div></div>`).join("");
  animateBars("#groupBars");
  const low = checkUnderrepresentation();
  $("#alerts").innerHTML = !state.participants.length ? "" : low.length
    ? low.map(g => `<div class="alert"><b>Participation alert</b><br>${esc(g.id)} represent ${g.percent}% of recorded participants. The current result reflects the participants who voted, but may not fully represent this group's preferences. The result has not been changed.</div>`).join("")
    : `<div class="alert ok">No group is below ${UNDER_THRESHOLD}% of participants right now.</div>`;
}

function renderAll() { renderInitiatives(); renderParticipants(); renderResults(); renderGroupParticipation(); }
function update() { saveState(); renderAll(); }

function addParticipant(name, group, initiative, demo = false) {
  state.participants.push({id: state.nextId++, name, group, initiative, demo});
}
function handleSubmit(e) {
  e.preventDefault();
  const group = $("#pGroup").value, init = $("#pInit").value;
  let name = $("#pName").value.trim(), msg = "";
  if (!group) msg = "No community group selected.";
  else if (!init) msg = "Please select an initiative.";
  else if (name && state.participants.some(p => p.name.toLowerCase() === name.toLowerCase())) msg = "Participant already exists.";
  $("#formMsg").textContent = msg;
  if (msg) { showNotification(msg, "error"); return; }
  if (!name) name = "Participant " + String(state.nextId).padStart(2, "0");
  addParticipant(name, group, init);
  $("#pName").value = "";
  update();
  showNotification(`Vote added for ${name}.`);
  const total = state.participants.length, th = checkParticipationThreshold();
  if (!th.met) showNotification(`At least ${state.minParticipants} participants are required before declaring a final decision.`, "warn");
  else if (determineMajority(calculateResults()).status === "tie") showNotification("Voting is currently tied.", "warn");
}
function changeVote(id, initiative) {
  const p = state.participants.find(x => x.id === id); if (!p) return;
  p.initiative = initiative; update(); showNotification(`${p.name} changed their vote.`);
}
function removeParticipant(id) {
  const p = state.participants.find(x => x.id === id); if (!p) return;
  state.participants = state.participants.filter(x => x.id !== id); update(); showNotification(`Vote removed for ${p.name}.`);
}
function loadDemoData() {
  state.participants = state.participants.filter(p => !p.demo);
  // [group, count, vote weights per initiative]: deliberately a clear leader and two small groups
  const plan = [["Women",7,[0,1,3,2,2,1,0]],["Youth",5,[2,2,3,3,2]],["Persons with Disabilities",2,[1,1]],["Low-income Workers",4,[2,2,3,2]],["General Community",8,[3,2,2,3,3,2,0,2]]];
  const prefs = {Women:[0,0,0,0,2,3,0],"Youth":[2,2,3,0,2],"Persons with Disabilities":[1,1],"Low-income Workers":[2,2,3,0],"General Community":[3,3,2,0,3,2,3,1]};
  plan.forEach(([g, n]) => { for (let i = 0; i < n; i++) addParticipant(`${g.split(" ")[0]} ${i + 1}`, g, initiatives[prefs[g][i]].id, true); });
  update(); showNotification("Demo community loaded. All participants are simulated.", "info");
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
  renderAll();
}
initializeApp();
