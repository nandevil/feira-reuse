/* Painel administrativo — exige Supabase configurado (login real).
   Sem Supabase configurado (js/supabase-client.js vazio), o painel
   mostra apenas os dados salvos localmente neste navegador (modo local),
   sem exigir login — útil para conferir enquanto o back-end não foi
   criado, mas não sincroniza entre dispositivos. */

const loginView = document.getElementById("login-view");
const appView = document.getElementById("app-view");
const modeBadge = document.getElementById("mode-badge");

function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function readLocalList(key) {
  try { return JSON.parse(localStorage.getItem(key)) || []; }
  catch { return []; }
}

async function init() {
  if (!supabaseEnabled()) {
    modeBadge.textContent = "Modo local (sem Supabase)";
    modeBadge.className = "badge local";
    appView.hidden = false;
    loginView.hidden = true;
    document.getElementById("logout-btn").hidden = true;
    document.getElementById("agenda-form").querySelector("button").disabled = true;
    loadLocalLists();
    return;
  }

  const { data } = await sb.auth.getSession();
  if (data.session) {
    showApp();
  } else {
    loginView.hidden = false;
  }
}

function showApp() {
  loginView.hidden = true;
  appView.hidden = false;
  modeBadge.textContent = "Conectado à nuvem";
  modeBadge.className = "badge cloud";
  loadAgendaForm();
  loadInscricoes();
  loadFeirantes();
}

document.getElementById("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;
  const msg = document.getElementById("login-msg");
  msg.textContent = "";
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) {
    msg.textContent = "E-mail ou senha inválidos.";
    return;
  }
  showApp();
});

document.getElementById("logout-btn").addEventListener("click", async () => {
  await sb.auth.signOut();
  appView.hidden = true;
  loginView.hidden = false;
});

async function loadAgendaForm() {
  const { data } = await sb.from("agenda").select("*").eq("id", 1).maybeSingle();
  if (data) {
    const a = rowToAgenda(data);
    document.getElementById("agenda-label").value = a.label === "A definir" ? "" : a.label;
    document.getElementById("agenda-date").value = a.dateText;
    document.getElementById("agenda-address").value = a.address === "a definir" ? "" : a.address;
    document.getElementById("agenda-schedule").value = a.schedule === "a definir" ? "" : a.schedule;
    document.getElementById("agenda-map").value = a.mapUrl;
  }
}

document.getElementById("agenda-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const msg = document.getElementById("agenda-msg");
  const agenda = {
    label: document.getElementById("agenda-label").value.trim() || "A definir",
    dateText: document.getElementById("agenda-date").value.trim(),
    address: document.getElementById("agenda-address").value.trim() || "a definir",
    schedule: document.getElementById("agenda-schedule").value.trim() || "a definir",
    mapUrl: document.getElementById("agenda-map").value.trim()
  };
  const { error } = await sb.from("agenda").upsert(agendaToRow(agenda));
  showFormMessage(msg, error ? "Não foi possível salvar." : "Agenda atualizada!", !error);
});

function showFormMessage(el, text, ok) {
  el.textContent = text;
  el.style.color = ok ? "var(--verde-selo)" : "#b3261e";
}

async function loadInscricoes() {
  const { data, error } = await sb.from("inscricoes").select("*").order("created_at", { ascending: false });
  const rows = (error || !data) ? [] : data.map(rowToInscricao);
  document.getElementById("inscricoes-count").textContent = rows.length;
  const body = document.getElementById("inscricoes-body");
  body.innerHTML = "";
  document.getElementById("inscricoes-empty").hidden = rows.length > 0;
  document.getElementById("inscricoes-table").hidden = rows.length === 0;
  for (const r of rows) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${fmtDate(r.createdAt)}</td><td>${escapeHtml(r.email)}</td><td>${escapeHtml(r.whatsapp)}</td>`;
    body.appendChild(tr);
  }
}

async function loadFeirantes() {
  const { data, error } = await sb.from("feirantes").select("*").order("created_at", { ascending: false });
  const rows = (error || !data) ? [] : data.map(rowToFeirante);
  document.getElementById("feirantes-count").textContent = rows.length;
  const body = document.getElementById("feirantes-body");
  body.innerHTML = "";
  document.getElementById("feirantes-empty").hidden = rows.length > 0;
  document.getElementById("feirantes-table").hidden = rows.length === 0;
  for (const r of rows) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${fmtDate(r.createdAt)}</td><td>${escapeHtml(r.nome)}</td><td>${escapeHtml(r.whatsapp)}</td><td>${escapeHtml(r.produtos)}</td>`;
    body.appendChild(tr);
  }
}

function loadLocalLists() {
  const inscricoes = readLocalList("feiraReuseInscricoesLocal");
  document.getElementById("inscricoes-count").textContent = inscricoes.length;
  const iBody = document.getElementById("inscricoes-body");
  iBody.innerHTML = "";
  document.getElementById("inscricoes-empty").hidden = inscricoes.length > 0;
  document.getElementById("inscricoes-table").hidden = inscricoes.length === 0;
  for (const r of inscricoes.slice().reverse()) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${fmtDate(r.createdAt)}</td><td>${escapeHtml(r.email)}</td><td>${escapeHtml(r.whatsapp)}</td>`;
    iBody.appendChild(tr);
  }

  const feirantes = readLocalList("feiraReuseFeirantesLocal");
  document.getElementById("feirantes-count").textContent = feirantes.length;
  const fBody = document.getElementById("feirantes-body");
  fBody.innerHTML = "";
  document.getElementById("feirantes-empty").hidden = feirantes.length > 0;
  document.getElementById("feirantes-table").hidden = feirantes.length === 0;
  for (const r of feirantes.slice().reverse()) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${fmtDate(r.createdAt)}</td><td>${escapeHtml(r.nome)}</td><td>${escapeHtml(r.whatsapp)}</td><td>${escapeHtml(r.produtos)}</td>`;
    fBody.appendChild(tr);
  }
}

function escapeHtml(s) {
  return String(s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

init();
