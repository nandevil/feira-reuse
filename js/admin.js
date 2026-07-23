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

/* Monta o link wa.me a partir do número salvo no cadastro (aceita com
   ou sem "55" na frente, com ou sem parênteses/traço). */
function waLinkFromPhone(phone) {
  let digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return "";
  if (!digits.startsWith("55")) digits = "55" + digits;
  return "https://wa.me/" + digits;
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
    document.getElementById("galeria-manage").hidden = true;
    document.getElementById("galeria-local-msg").hidden = false;
    document.getElementById("redes-manage").hidden = true;
    document.getElementById("redes-local-msg").hidden = false;
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
  loadGaleria();
  loadRedesSociais();
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

let agendaAtual = null;

async function loadAgendaForm() {
  const { data } = await sb.from("agenda").select("*").eq("id", 1).maybeSingle();
  if (data) {
    const a = rowToAgenda(data);
    agendaAtual = a;
    document.getElementById("agenda-date").value = a.dateText;
    document.getElementById("agenda-address").value = a.address === "a definir" ? "" : a.address;
    document.getElementById("agenda-schedule").value = a.schedule === "a definir" ? "" : a.schedule;
    document.getElementById("agenda-map").value = a.mapUrl;
    document.getElementById("agenda-gratuita").checked = a.entradaGratuita;
    const preview = document.getElementById("agenda-image-preview");
    preview.innerHTML = a.imageUrl
      ? `<img src="${a.imageUrl}" alt="" style="width:100%;height:100%;object-fit:cover;display:block"/>`
      : "";
  }
}

document.getElementById("agenda-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const msg = document.getElementById("agenda-msg");
  const btn = e.target.querySelector("button[type=submit]");
  const fileInput = document.getElementById("agenda-image-file");
  const file = fileInput.files[0];

  btn.disabled = true;
  try {
    const agenda = {
      dateText: document.getElementById("agenda-date").value.trim(),
      address: document.getElementById("agenda-address").value.trim() || "a definir",
      schedule: document.getElementById("agenda-schedule").value.trim() || "a definir",
      mapUrl: document.getElementById("agenda-map").value.trim(),
      entradaGratuita: document.getElementById("agenda-gratuita").checked,
      imageUrl: agendaAtual ? agendaAtual.imageUrl : "",
      storagePath: agendaAtual ? agendaAtual.storagePath : ""
    };

    if (file) {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `agenda-${Date.now()}.${ext}`;
      const { error: upErr } = await sb.storage.from("agenda-fotos").upload(path, file);
      if (upErr) throw upErr;
      const { data: pub } = sb.storage.from("agenda-fotos").getPublicUrl(path);
      const oldPath = agendaAtual ? agendaAtual.storagePath : "";
      agenda.imageUrl = pub.publicUrl;
      agenda.storagePath = path;
      if (oldPath) await sb.storage.from("agenda-fotos").remove([oldPath]);
    }

    const { error } = await sb.from("agenda").upsert(agendaToRow(agenda));
    if (error) throw error;
    showFormMessage(msg, "Agenda atualizada!", true);
    fileInput.value = "";
    await loadAgendaForm();
  } catch (err) {
    console.error(err);
    showFormMessage(msg, "Não foi possível salvar.", false);
  } finally {
    btn.disabled = false;
  }
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
    const wa = waLinkFromPhone(r.whatsapp);
    tr.innerHTML = `<td>${fmtDate(r.createdAt)}</td><td>${escapeHtml(r.nome)}</td><td>${escapeHtml(r.whatsapp)}</td><td>${escapeHtml(r.produtos)}</td><td>${wa ? `<a href="${wa}" target="_blank" rel="noopener" class="btn btn-secondary" style="padding:6px 14px;font-size:13px;white-space:nowrap">Falar com Feirante</a>` : ""}</td>`;
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
    const wa = waLinkFromPhone(r.whatsapp);
    tr.innerHTML = `<td>${fmtDate(r.createdAt)}</td><td>${escapeHtml(r.nome)}</td><td>${escapeHtml(r.whatsapp)}</td><td>${escapeHtml(r.produtos)}</td><td>${wa ? `<a href="${wa}" target="_blank" rel="noopener" class="btn btn-secondary" style="padding:6px 14px;font-size:13px;white-space:nowrap">Falar com Feirante</a>` : ""}</td>`;
    fBody.appendChild(tr);
  }
}

function escapeHtml(s) {
  return String(s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/* ===== Galeria (carrossel da home) ===== */
let galeriaItems = [];

async function loadGaleria() {
  const { data, error } = await sb.from("galeria").select("*").order("posicao", { ascending: true });
  galeriaItems = (error || !data) ? [] : data.map(rowToGaleria);
  renderGaleriaList();
}

function galeriaRowHtml(item, index, total) {
  return `<div class="galeria-row" data-id="${item.id}" style="display:flex;align-items:center;gap:12px;padding:10px;border:1px solid color-mix(in oklch, var(--verde-selo) 20%, transparent);border-radius:10px">
    <img src="${item.imageUrl}" alt="" style="width:64px;height:64px;object-fit:cover;border-radius:8px;flex:none"/>
    <input type="text" class="galeria-caption-input" value="${escapeHtml(item.caption)}" placeholder="Legenda" style="flex:1;border:2px solid color-mix(in oklch, var(--verde-selo) 30%, transparent);border-radius:8px;padding:8px 10px;font-family:'Poppins',sans-serif;font-size:14px;color:var(--verde-escuro)"/>
    <button type="button" class="btn btn-secondary galeria-up" ${index === 0 ? "disabled" : ""} title="Mover para cima" style="padding:6px 10px">↑</button>
    <button type="button" class="btn btn-secondary galeria-down" ${index === total - 1 ? "disabled" : ""} title="Mover para baixo" style="padding:6px 10px">↓</button>
    <button type="button" class="btn btn-secondary galeria-delete" title="Excluir" style="padding:6px 10px;border-color:#b3261e;color:#b3261e">Excluir</button>
  </div>`;
}

function renderGaleriaList() {
  document.getElementById("galeria-count").textContent = galeriaItems.length;
  document.getElementById("galeria-empty").hidden = galeriaItems.length > 0;
  const list = document.getElementById("galeria-list");
  list.innerHTML = galeriaItems.map((it, i) => galeriaRowHtml(it, i, galeriaItems.length)).join("");
}

document.getElementById("galeria-upload-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const fileInput = document.getElementById("galeria-file");
  const captionInput = document.getElementById("galeria-caption");
  const msg = document.getElementById("galeria-msg");
  const file = fileInput.files[0];
  if (!file) return;

  const btn = e.target.querySelector("button");
  btn.disabled = true;
  try {
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error: upErr } = await sb.storage.from("galeria").upload(path, file);
    if (upErr) throw upErr;
    const { data: pub } = sb.storage.from("galeria").getPublicUrl(path);
    const nextPos = galeriaItems.length ? Math.max(...galeriaItems.map((i) => i.posicao)) + 1 : 0;
    const { error: insErr } = await sb.from("galeria").insert({
      image_url: pub.publicUrl,
      storage_path: path,
      caption: captionInput.value.trim(),
      posicao: nextPos
    });
    if (insErr) throw insErr;
    showFormMessage(msg, "Foto adicionada!", true);
    fileInput.value = "";
    captionInput.value = "";
    await loadGaleria();
  } catch (err) {
    console.error(err);
    showFormMessage(msg, "Não foi possível enviar a foto.", false);
  } finally {
    btn.disabled = false;
  }
});

document.getElementById("galeria-list").addEventListener("blur", async (e) => {
  if (!e.target.classList || !e.target.classList.contains("galeria-caption-input")) return;
  const row = e.target.closest(".galeria-row");
  const id = row.dataset.id;
  const item = galeriaItems.find((i) => String(i.id) === String(id));
  if (!item) return;
  const newCaption = e.target.value.trim();
  if (newCaption === item.caption) return;
  item.caption = newCaption;
  await sb.from("galeria").update({ caption: newCaption }).eq("id", id);
}, true);

document.getElementById("galeria-list").addEventListener("click", async (e) => {
  const row = e.target.closest(".galeria-row");
  if (!row) return;
  const id = row.dataset.id;
  const idx = galeriaItems.findIndex((i) => String(i.id) === String(id));
  if (idx < 0) return;

  if (e.target.classList.contains("galeria-delete")) {
    if (!confirm("Excluir esta foto da galeria?")) return;
    const item = galeriaItems[idx];
    await sb.storage.from("galeria").remove([item.storagePath]);
    await sb.from("galeria").delete().eq("id", id);
    await loadGaleria();
    return;
  }
  if (e.target.classList.contains("galeria-up") && idx > 0) {
    await swapGaleriaPosicao(idx, idx - 1);
  }
  if (e.target.classList.contains("galeria-down") && idx < galeriaItems.length - 1) {
    await swapGaleriaPosicao(idx, idx + 1);
  }
});

async function swapGaleriaPosicao(i, j) {
  const a = galeriaItems[i], b = galeriaItems[j];
  await Promise.all([
    sb.from("galeria").update({ posicao: b.posicao }).eq("id", a.id),
    sb.from("galeria").update({ posicao: a.posicao }).eq("id", b.id)
  ]);
  await loadGaleria();
}

/* ===== Redes sociais (link + foto de perfil de cada rede) ===== */
async function loadRedesSociais() {
  const { data, error } = await sb.from("redes_sociais").select("*");
  const redes = (error || !data) ? [] : data.map(rowToRedeSocial);
  document.querySelectorAll(".rede-social-row").forEach((row) => {
    const id = row.dataset.rede;
    const rede = redes.find((r) => r.id === id);
    row.querySelector(".rede-url-input").value = rede ? rede.url : "";
    const preview = row.querySelector(".rede-avatar-preview");
    preview.innerHTML = rede && rede.fotoUrl
      ? `<img src="${rede.fotoUrl}" alt="" style="width:100%;height:100%;object-fit:cover;display:block"/>`
      : "";
  });
}

document.querySelectorAll(".rede-save-btn").forEach((btn) => {
  btn.addEventListener("click", async () => {
    const row = btn.closest(".rede-social-row");
    const id = row.dataset.rede;
    const urlInput = row.querySelector(".rede-url-input");
    const fileInput = row.querySelector(".rede-file-input");
    const msg = row.querySelector(".rede-msg");
    const file = fileInput.files[0];

    btn.disabled = true;
    try {
      const update = { url: urlInput.value.trim() };

      if (file) {
        const { data: current } = await sb.from("redes_sociais").select("storage_path").eq("id", id).maybeSingle();
        const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
        const path = `${id}-${Date.now()}.${ext}`;
        const { error: upErr } = await sb.storage.from("perfis").upload(path, file);
        if (upErr) throw upErr;
        const { data: pub } = sb.storage.from("perfis").getPublicUrl(path);
        update.foto_url = pub.publicUrl;
        update.storage_path = path;
        if (current && current.storage_path) {
          await sb.storage.from("perfis").remove([current.storage_path]);
        }
      }

      const { error } = await sb.from("redes_sociais").update(update).eq("id", id);
      if (error) throw error;
      showFormMessage(msg, "Salvo!", true);
      fileInput.value = "";
      await loadRedesSociais();
    } catch (err) {
      console.error(err);
      showFormMessage(msg, "Não foi possível salvar.", false);
    } finally {
      btn.disabled = false;
    }
  });
});

init();
