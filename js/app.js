/* Landing page — carrega a agenda da nuvem (se configurada), envia os
   formulários "Avise-me" e "Seja feirante", e monta os dados
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

/* Links + fotos de perfil do Instagram/Facebook/TikTok, editáveis no
   painel (tabela public.redes_sociais). Sem Supabase configurado, os
   links de js/config.js (já aplicados por applyFeiraConfigLinks) continuam
   valendo, e os avatares mantêm o ícone genérico. */
async function loadRedesSociais() {
  if (!supabaseEnabled()) return;
  const { data, error } = await sb.from("redes_sociais").select("*");
  if (error || !data) return;

  data.map(rowToRedeSocial).forEach((rede) => {
    if (rede.url) {
      document.querySelectorAll(`[data-social="${rede.id}"]`).forEach((el) => { el.href = rede.url; });
    }
    if (rede.fotoUrl) {
      document.querySelectorAll(`[data-social-avatar="${rede.id}"]`).forEach((el) => {
        el.innerHTML = `<img src="${rede.fotoUrl}" alt="Foto de perfil do ${rede.id}" loading="lazy"/>`;
      });
    }
  });
}

/* JSON-LD (schema.org) — reflete a mesma agenda usada no resto da página,
   assim ele fica sempre em sincronia com o que o painel salvou. */
function renderStructuredData(agenda) {
  const social = Object.values((typeof FEIRA_CONFIG !== "undefined" && FEIRA_CONFIG.social) || {})
    .filter((url) => url && url !== "#");
  const siteUrl = (typeof FEIRA_CONFIG !== "undefined" && FEIRA_CONFIG.siteUrl) || "";
  // Cidades da Região dos Lagos que a feira também quer alcançar no Google
  // (schema.org "areaServed") — editável em js/config.js.
  const regiao = (typeof FEIRA_CONFIG !== "undefined" && FEIRA_CONFIG.regiaoAtendida) || [];
  const areaServed = ["Araruama", ...regiao].map((cidade) => ({
    "@type": "City", name: cidade, containedInPlace: { "@type": "State", name: "Rio de Janeiro" }
  }));

  const enderecoLd = {
    "@type": "PostalAddress",
    streetAddress: agenda.address && agenda.address !== "a definir" ? agenda.address : "Araruama, RJ",
    addressLocality: "Araruama",
    addressRegion: "RJ",
    addressCountry: "BR"
  };

  const eventLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: "Feira Reuse Araruama",
    description: "Encontro mensal de economia circular com roupas sustentáveis, comida artesanal local e artesanato feito à mão, em Araruama e aberto a visitantes de toda a Região dos Lagos.",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    location: {
      "@type": "Place",
      name: "Feira Reuse Araruama",
      address: enderecoLd
    },
    image: siteUrl ? siteUrl + "/img/illustration.jpg" : undefined,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "BRL",
      availability: "https://schema.org/InStock",
      url: siteUrl || undefined
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
    description: "Feira mensal de economia circular em Araruama (RJ) — moda circular, artesanato autoral e gastronomia local, atendendo visitantes de toda a Região dos Lagos.",
    image: siteUrl ? siteUrl + "/img/logo.jpg" : undefined,
    url: siteUrl || undefined,
    address: enderecoLd,
    areaServed,
    sameAs: social.length ? social : undefined
  };

  const eventEl = document.getElementById("ld-event");
  const orgEl = document.getElementById("ld-org");
  if (eventEl) eventEl.textContent = JSON.stringify(eventLd);
  if (orgEl) orgEl.textContent = JSON.stringify(orgLd);
}

/* FAQPage (schema.org) — gerado a partir do próprio conteúdo da seção FAQ,
   pra nunca ficar dessincronizado do texto visível (edite o HTML, o
   JSON-LD acompanha sozinho). Habilita o rich snippet de perguntas
   frequentes direto no resultado de busca do Google. */
function renderFaqStructuredData() {
  const el = document.getElementById("ld-faq");
  if (!el) return;
  const items = [...document.querySelectorAll(".faq-item")].map((item) => {
    const question = item.querySelector("summary")?.textContent.trim() || "";
    const answer = item.querySelector("p")?.textContent.trim() || "";
    return {
      "@type": "Question",
      name: question,
      acceptedAnswer: { "@type": "Answer", text: answer }
    };
  }).filter((q) => q.name && q.acceptedAnswer.text);

  if (!items.length) return;
  el.textContent = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items
  });
}

/* Card da agenda: imagem do mês (ou placeholder), data/horário/local,
   selo "Entrada Gratuita" e o link "Ver no mapa". */
function renderAgendaCard(agenda) {
  const imageWrap = document.getElementById("agenda-image-wrap");
  if (imageWrap) {
    imageWrap.innerHTML = agenda.imageUrl
      ? `<img src="${agenda.imageUrl}" alt="Imagem da agenda da Feira Reuse deste mês" loading="lazy" style="width:100%;height:100%;object-fit:cover;display:block"/>`
      : `<div id="agenda-image-fallback" class="img-placeholder" style="width:100%;height:100%">Imagem da agenda em breve</div>`;
  }

  const dataEl = document.getElementById("agenda-data-texto");
  const horarioEl = document.getElementById("agenda-horario-texto");
  const localEl = document.getElementById("agenda-local-texto");
  if (dataEl) dataEl.textContent = agenda.dateText || "a definir";
  if (horarioEl) horarioEl.textContent = agenda.schedule || "a definir";
  if (localEl) localEl.textContent = agenda.address || "a definir";

  const badge = document.getElementById("agenda-gratuita-badge");
  if (badge) badge.hidden = !agenda.entradaGratuita;

  const mapLink = document.getElementById("agenda-card-map-link");
  if (mapLink) mapLink.href = agenda.mapUrl || "#";
}

async function loadAgenda() {
  // Sem Supabase configurado, ainda assim popula o card/JSON-LD com os
  // valores padrão ("a definir") em vez de deixar tudo vazio.
  const fallbackAgenda = { label: "A definir", dateText: "", address: "a definir", schedule: "a definir", mapUrl: "", imageUrl: "", entradaGratuita: true };
  if (!supabaseEnabled()) {
    renderAgendaCard(fallbackAgenda);
    renderStructuredData(fallbackAgenda);
    return;
  }

  const { data, error } = await sb.from("agenda").select("*").eq("id", 1).maybeSingle();
  if (error || !data) {
    renderAgendaCard(fallbackAgenda);
    renderStructuredData(fallbackAgenda);
    return;
  }
  const agenda = rowToAgenda(data);

  renderAgendaCard(agenda);
  renderStructuredData(agenda);
}

function escapeHtml(s) {
  return String(s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/* Detecta se a URL de um item da galeria é de vídeo (pela extensão do
   arquivo), para renderizar <video> em vez de <img>. */
function isVideoUrl(url) {
  return /\.(mp4|webm|mov|ogg)(\?|$)/i.test(url || "");
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
    dotsWrap.innerHTML = "";
    track.innerHTML = Array(4).fill(
      `<div class="carousel-slide"><div class="img-placeholder" style="width:100%;height:100%">Nenhuma foto adicionada ainda</div></div>`
    ).join("");
    setupCarouselNav(track, dotsWrap, prevBtn, nextBtn);
    return;
  }

  track.innerHTML = items.map((it) => `
    <div class="carousel-slide">
      ${isVideoUrl(it.imageUrl) ?
        `<video src="${it.imageUrl}" controls playsinline preload="metadata" onloadedmetadata="this.currentTime=0.1"></video>` :
        `<img src="${it.imageUrl}" alt="${escapeHtml(it.caption || "Foto da Feira Reuse")}" loading="lazy"/>`}
      ${it.caption ? `<div class="carousel-caption">${escapeHtml(it.caption)}</div>` : ""}
    </div>`).join("");
  dotsWrap.innerHTML = items.map((_, i) =>
    `<button type="button" class="carousel-dot${i === 0 ? " active" : ""}" data-i="${i}" aria-label="Ir para foto ${i + 1}"></button>`
  ).join("");

  setupCarouselNav(track, dotsWrap, prevBtn, nextBtn);
}

/* Carrossel com vários quadrados visíveis ao mesmo tempo (a quantidade
   varia por CSS/breakpoint) — prev/next avançam um item por vez,
   alinhando-o à borda esquerda da faixa (efeito "esteira"). */
function setupCarouselNav(track, dotsWrap, prevBtn, nextBtn) {
  const slides = [...track.children];
  const dots = [...dotsWrap.children];

  /* Quando os slides cabem inteiros na largura visível (poucos itens,
     ou tela grande), centraliza a fileira em vez de grudar à esquerda.
     Quando não cabem, mantém alinhado à esquerda para rolar/arrastar. */
  function updateFit() {
    track.classList.toggle("carousel-track--fit", track.scrollWidth <= track.clientWidth + 1);
  }
  updateFit();
  new ResizeObserver(updateFit).observe(track);

  function leftmostIndex() {
    const trackRect = track.getBoundingClientRect();
    let closest = 0, closestDist = Infinity;
    slides.forEach((s, i) => {
      const dist = Math.abs(s.getBoundingClientRect().left - trackRect.left);
      if (dist < closestDist) { closestDist = dist; closest = i; }
    });
    return closest;
  }

  function goTo(i) {
    const idx = Math.max(0, Math.min(slides.length - 1, i));
    slides[idx].scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
  }

  prevBtn.onclick = () => goTo(leftmostIndex() - 1);
  nextBtn.onclick = () => goTo(leftmostIndex() + 1);
  dots.forEach((d, i) => { d.onclick = () => goTo(i); });

  let scrollTimeout;
  track.addEventListener("scroll", () => {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      const idx = leftmostIndex();
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
      const avisoSpam = (typeof FEIRA_CONFIG !== "undefined" && FEIRA_CONFIG.avisoSpamAtivo)
        ? " Dica: confira também sua caixa de spam/lixo eletrônico, o e-mail pode cair lá nos primeiros envios."
        : "";
      showFormMessage(msg, "Cadastro recebido! Vamos te avisar da próxima feira." + avisoSpam, true);
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

/* Carrosséis de conteúdo estático (critérios de seleção, benefícios de
   parceria) — o HTML dos slides já vem pronto na página, só liga a
   navegação (mesma lógica da galeria). */
function setupStaticCarousel(trackId, dotsId, prevId, nextId) {
  const track = document.getElementById(trackId);
  const dotsWrap = document.getElementById(dotsId);
  const prevBtn = document.getElementById(prevId);
  const nextBtn = document.getElementById(nextId);
  if (!track) return;
  setupCarouselNav(track, dotsWrap, prevBtn, nextBtn);
}

document.addEventListener("DOMContentLoaded", () => {
  loadAgenda();
  loadGaleria();
  loadRedesSociais();
  renderFaqStructuredData();
  setupAviseMeForm();
  setupFeiranteForm();
  setupStaticCarousel("sobre-criterios-track", "sobre-criterios-dots", "sobre-criterios-prev", "sobre-criterios-next");
  setupStaticCarousel("parcerias-track", "parcerias-dots", "parcerias-prev", "parcerias-next");
});
