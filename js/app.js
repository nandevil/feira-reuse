/* Landing page — carrega a agenda da nuvem (se configurada), envia os
   formulários "Avise-me" e "Seja feirante", injeta o mapa e os dados
   estruturados (JSON-LD) a partir da mesma agenda. */

const LOCAL_KEY_INSCRICOES = "feiraReuseInscricoesLocal";
const LOCAL_KEY_FEIRANTES = "feiraReuseFeirantesLocal";

function readLocalList(key) {
  try { return JSON.parse(localStorage.getItem(key)) || []; }
  catch { return []; }
}
function writeLocalList(key, list) {
  localStorage.setItem(key, JSON.stringify(list));
}

/* Deriva uma URL de embed do Google Maps a partir do link salvo na agenda
   (agenda-map). Se o link já for um embed, usa direto; se tiver um "q="
   reaproveita a busca; senão, cai para o endereço em texto — sempre sem
   precisar de chave de API. */
function buildMapEmbedUrl(agenda) {
  if (agenda.mapUrl) {
    try {
      const u = new URL(agenda.mapUrl);
      if (/\/maps\/embed/.test(u.pathname) || u.searchParams.get("output") === "embed") {
        return agenda.mapUrl;
      }
      const q = u.searchParams.get("q") || u.searchParams.get("query");
      if (q) return "https://www.google.com/maps?q=" + encodeURIComponent(q) + "&output=embed";
    } catch (e) { /* URL inválida, cai para o endereço abaixo */ }
  }
  if (agenda.address && agenda.address !== "a definir") {
    return "https://www.google.com/maps?q=" + encodeURIComponent(agenda.address) + "&output=embed";
  }
  return null;
}

function renderMap(agenda) {
  const container = document.getElementById("mapa-container");
  if (!container) return;
  const embedUrl = buildMapEmbedUrl(agenda);
  if (!embedUrl) return; // mantém o ícone de fallback que já está no HTML
  container.innerHTML = `<iframe src="${embedUrl}" title="Mapa do local da Feira Reuse" width="100%" height="100%" style="border:0" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
}

/* JSON-LD (schema.org) — reflete a mesma agenda usada no resto da página,
   assim ele fica sempre em sincronia com o que o painel salvou. */
function renderStructuredData(agenda) {
  const social = Object.values((typeof FEIRA_CONFIG !== "undefined" && FEIRA_CONFIG.social) || {})
    .filter((url) => url && url !== "#");
  const siteUrl = (typeof FEIRA_CONFIG !== "undefined" && FEIRA_CONFIG.siteUrl) || "";

  const eventLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: "Feira Reuse Araruama",
    description: "Encontro mensal de economia circular com roupas sustentáveis, comida artesanal local e artesanato feito à mão.",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    location: {
      "@type": "Place",
      name: "Feira Reuse Araruama",
      address: agenda.address || "Araruama, RJ"
    },
    organizer: { "@type": "Organization", name: "Feira Reuse Araruama", url: siteUrl }
  };
  // agenda.dateText é texto livre (ex: "16 de agosto, sábado") — só vira
  // startDate no JSON-LD quando dá pra interpretar como data de verdade.
  const parsed = Date.parse(agenda.dateText);
  if (!Number.isNaN(parsed)) eventLd.startDate = new Date(parsed).toISOString();

  const orgLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: "Feira Reuse Araruama",
    image: siteUrl ? siteUrl + "/img/logo.jpg" : undefined,
    url: siteUrl || undefined,
    address: {
      "@type": "PostalAddress",
      streetAddress: agenda.address || "a definir",
      addressLocality: "Araruama",
      addressRegion: "RJ",
      addressCountry: "BR"
    },
    sameAs: social.length ? social : undefined
  };

  const eventEl = document.getElementById("ld-event");
  const orgEl = document.getElementById("ld-org");
  if (eventEl) eventEl.textContent = JSON.stringify(eventLd);
  if (orgEl) orgEl.textContent = JSON.stringify(orgLd);
}

async function loadAgenda() {
  // Sem Supabase configurado, ainda assim popula o mapa/JSON-LD com os
  // valores padrão ("a definir") em vez de deixar tudo vazio.
  const fallbackAgenda = { label: "A definir", dateText: "", address: "a definir", schedule: "a definir", mapUrl: "" };
  if (!supabaseEnabled()) {
    renderMap(fallbackAgenda);
    renderStructuredData(fallbackAgenda);
    return;
  }

  const { data, error } = await sb.from("agenda").select("*").eq("id", 1).maybeSingle();
  if (error || !data) {
    renderMap(fallbackAgenda);
    renderStructuredData(fallbackAgenda);
    return;
  }
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

  renderMap(agenda);
  renderStructuredData(agenda);
}

function escapeHtml(s) {
  return String(s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/* Carrossel da galeria — busca as fotos cadastradas no painel (tabela
   public.galeria) e monta os slides. Sem Supabase configurado (ou sem
   fotos ainda), mantém o placeholder que já está no HTML. */
async function loadGaleria() {
  const track = document.getElementById("galeria-track");
  const dotsWrap = document.getElementById("galeria-dots");
  const prevBtn = document.getElementById("galeria-prev");
  const nextBtn = document.getElementById("galeria-next");
  if (!track) return;

  let items = [];
  if (supabaseEnabled()) {
    const { data, error } = await sb.from("galeria").select("*").order("posicao", { ascending: true });
    if (!error && data) items = data.map(rowToGaleria);
  }

  if (!items.length) {
    prevBtn.style.display = "none";
    nextBtn.style.display = "none";
    dotsWrap.innerHTML = "";
    return; // mantém o slide de placeholder que já está no HTML
  }

  prevBtn.style.display = "";
  nextBtn.style.display = "";
  track.innerHTML = items.map((it) => `
    <div class="carousel-slide">
      <img src="${it.imageUrl}" alt="${escapeHtml(it.caption || "Foto da Feira Reuse")}" loading="lazy"/>
      ${it.caption ? `<div class="carousel-caption">${escapeHtml(it.caption)}</div>` : ""}
    </div>`).join("");
  dotsWrap.innerHTML = items.map((_, i) =>
    `<button type="button" class="carousel-dot${i === 0 ? " active" : ""}" data-i="${i}" aria-label="Ir para foto ${i + 1}"></button>`
  ).join("");

  setupCarouselNav(track, dotsWrap, prevBtn, nextBtn);
}

function setupCarouselNav(track, dotsWrap, prevBtn, nextBtn) {
  const slides = [...track.children];
  const dots = [...dotsWrap.children];

  function currentIndex() {
    const trackRect = track.getBoundingClientRect();
    const center = trackRect.left + trackRect.width / 2;
    let closest = 0, closestDist = Infinity;
    slides.forEach((s, i) => {
      const r = s.getBoundingClientRect();
      const dist = Math.abs(r.left + r.width / 2 - center);
      if (dist < closestDist) { closestDist = dist; closest = i; }
    });
    return closest;
  }

  function goTo(i) {
    const idx = Math.max(0, Math.min(slides.length - 1, i));
    slides[idx].scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }

  prevBtn.onclick = () => goTo(currentIndex() - 1);
  nextBtn.onclick = () => goTo(currentIndex() + 1);
  dots.forEach((d, i) => { d.onclick = () => goTo(i); });

  let scrollTimeout;
  track.addEventListener("scroll", () => {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      const idx = currentIndex();
      dots.forEach((d, i) => d.classList.toggle("active", i === idx));
    }, 100);
  });
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
      if (typeof trackLead === "function") trackLead("visitante");
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
      if (typeof trackLead === "function") trackLead("feirante");
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
  loadGaleria();
  setupAviseMeForm();
  setupFeiranteForm();
});
