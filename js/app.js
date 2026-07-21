/* Landing page — carrega a agenda da nuvem (se configurada) e envia os
   formulários "Avise-me" e "Seja feirante". */

const LOCAL_KEY_INSCRICOES = "feiraReuseInscricoesLocal";
const LOCAL_KEY_FEIRANTES = "feiraReuseFeirantesLocal";

function readLocalList(key) {
  try { return JSON.parse(localStorage.getItem(key)) || []; }
  catch { return []; }
}
function writeLocalList(key, list) {
  localStorage.setItem(key, JSON.stringify(list));
}

async function loadAgenda() {
  if (!supabaseEnabled()) return;
  const { data, error } = await sb.from("agenda").select("*").eq("id", 1).maybeSingle();
  if (error || !data) return;
  const agenda = rowToAgenda(data);

  const labelEl = document.getElementById("agenda-label");
  const scheduleEl = document.getElementById("agenda-schedule");
  if (labelEl) labelEl.textContent = agenda.dateText || agenda.label;
  if (scheduleEl) {
    scheduleEl.textContent = agenda.dateText
      ? `${agenda.address} · ${agenda.schedule}`
      : "Horário e local a confirmar · atualização mensal";
  }

  const enderecoEl = document.getElementById("local-endereco");
  const dataHoraEl = document.getElementById("local-data-hora");
  if (enderecoEl) enderecoEl.innerHTML = `<strong>Endereço:</strong> ${agenda.address}`;
  if (dataHoraEl) dataHoraEl.innerHTML = `<strong>Data e horário:</strong> ${agenda.dateText || "a definir"} ${agenda.schedule ? "· " + agenda.schedule : ""}`;

  const mapLink = document.getElementById("ver-mapa-link");
  if (mapLink && agenda.mapUrl) mapLink.href = agenda.mapUrl;
}

function showFormMessage(el, text, ok) {
  el.textContent = text;
  el.className = "form-msg " + (ok ? "ok" : "err");
}

function setupAviseMeForm() {
  const form = document.getElementById("form-avise-me");
  if (!form) return;
  const msg = document.getElementById("avise-me-msg");
  const btn = form.querySelector("button");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = form.email.value.trim();
    const whatsapp = form.whatsapp.value.trim();
    if (!email || !whatsapp) return;

    btn.disabled = true;
    try {
      if (supabaseEnabled()) {
        const { error } = await sb.from("inscricoes").insert({ email, whatsapp });
        if (error) throw error;
      } else {
        const list = readLocalList(LOCAL_KEY_INSCRICOES);
        list.push({ email, whatsapp, createdAt: new Date().toISOString() });
        writeLocalList(LOCAL_KEY_INSCRICOES, list);
      }
      showFormMessage(msg, "Cadastro recebido! Vamos te avisar da próxima feira.", true);
      form.reset();
    } catch (err) {
      console.error(err);
      showFormMessage(msg, "Não foi possível enviar agora. Tente novamente em instantes.", false);
    } finally {
      btn.disabled = false;
    }
  });
}

function setupFeiranteForm() {
  const form = document.getElementById("form-feirante");
  if (!form) return;
  const msg = document.getElementById("feirante-msg");
  const btn = form.querySelector("button");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const nome = form.nome.value.trim();
    const whatsapp = form.whatsapp.value.trim();
    const produtos = form.produtos.value.trim();
    if (!nome || !whatsapp || !produtos) return;

    btn.disabled = true;
    try {
      if (supabaseEnabled()) {
        const { error } = await sb.from("feirantes").insert({ nome, whatsapp, produtos });
        if (error) throw error;
      } else {
        const list = readLocalList(LOCAL_KEY_FEIRANTES);
        list.push({ nome, whatsapp, produtos, status: "novo", createdAt: new Date().toISOString() });
        writeLocalList(LOCAL_KEY_FEIRANTES, list);
      }
      showFormMessage(msg, "Questionário enviado! A organização confirma sua vaga pelo WhatsApp.", true);
      form.reset();
    } catch (err) {
      console.error(err);
      showFormMessage(msg, "Não foi possível enviar agora. Tente novamente em instantes.", false);
    } finally {
      btn.disabled = false;
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  loadAgenda();
  setupAviseMeForm();
  setupFeiranteForm();
});
