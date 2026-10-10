/* Origem do acesso: aviso de cookies + captura de UTM/referrer + eventos.
   Não registra NADA (nem guarda no navegador) antes do aceite. Nenhum dado
   pessoal vai junto: só tipo do evento, origem ("fonte / meio") e campanha. */

const CONSENT_KEY = "feiraReuseConsent";   // localStorage: "granted" | "denied"
const ORIGEM_KEY = "feiraReuseOrigem";     // sessionStorage (só após aceite)
const JA_ENVIADO_PREFIX = "feiraReuseJa_"; // sessionStorage: 1 evento "único" por sessão

const TIPOS_EVENTO = [
  "visita", "clique_grupo", "clique_instagram", "clique_mapa",
  "clique_compartilhar", "abriu_feirante", "envio_feirante", "cadastro_avise_me"
];

/* Minúsculas, sem acento nem espaço (mesma regra do gerador de links do painel). */
function normalizarParametro(valor) {
  return String(valor || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9_.-]/g, "")
    .slice(0, 40);
}

function origemPorReferrer() {
  let host = "";
  try { host = new URL(document.referrer).hostname.toLowerCase(); } catch (e) { return null; }
  if (!host || host === location.hostname) return null; // navegação interna não muda a origem
  if (/(^|\.)google\./.test(host)) return { source: "google", medium: "organico", campaign: null };
  if (/(^|\.)instagram\.com$/.test(host)) return { source: "instagram", medium: "referencia", campaign: null };
  if (/(^|\.)(facebook\.com|fb\.com|fb\.me)$/.test(host)) return { source: "facebook", medium: "referencia", campaign: null };
  if (/(^|\.)(whatsapp\.com|wa\.me)$/.test(host)) return { source: "whatsapp", medium: "referencia", campaign: null };
  return { source: "outro", medium: "referencia", campaign: null };
}

function lerSessaoOrigem() {
  try { return JSON.parse(sessionStorage.getItem(ORIGEM_KEY)); } catch (e) { return null; }
}

/* Prioridade: UTM da URL > origem já guardada na sessão > referrer > direto. */
function detectarOrigem() {
  const params = new URLSearchParams(location.search);
  const utmSource = normalizarParametro(params.get("utm_source"));
  if (utmSource) {
    return {
      source: utmSource,
      medium: normalizarParametro(params.get("utm_medium")) || "nenhum",
      campaign: normalizarParametro(params.get("utm_campaign")) || null
    };
  }
  return lerSessaoOrigem() || origemPorReferrer() || { source: "direto", medium: "nenhum", campaign: null };
}

let origemAtual = detectarOrigem(); // fica só em memória até o aceite
let visitanteEhAdmin = false;       // visitas da própria administração não contam

function consentimento() {
  try { return localStorage.getItem(CONSENT_KEY); } catch (e) { return null; }
}

function origemTexto(o) {
  return o.source + " / " + o.medium;
}

/* Origem gravada junto de cada cadastro; null (coluna fica vazia) sem aceite. */
function origemParaCadastro() {
  return consentimento() === "granted" ? origemTexto(origemAtual) : null;
}

function jaEnviado(tipo) {
  try { return sessionStorage.getItem(JA_ENVIADO_PREFIX + tipo) === "1"; } catch (e) { return false; }
}

function marcarEnviado(tipo) {
  try { sessionStorage.setItem(JA_ENVIADO_PREFIX + tipo, "1"); } catch (e) { /* sem sessionStorage: segue */ }
}

/* keepalive: o envio sobrevive à troca de página (cliques que abrem na mesma aba). */
function trackEvento(tipo, opcoes) {
  const unico = !!(opcoes && opcoes.unico);
  if (consentimento() !== "granted" || visitanteEhAdmin) return;
  if (typeof supabaseEnabled !== "function" || !supabaseEnabled()) return;
  if (TIPOS_EVENTO.indexOf(tipo) === -1) return;
  if (unico && jaEnviado(tipo)) return;
  if (unico) marcarEnviado(tipo);

  try {
    fetch(SUPABASE_URL + "/rest/v1/eventos", {
      method: "POST",
      keepalive: true,
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: "Bearer " + SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
        Prefer: "return=minimal"
      },
      body: JSON.stringify({ tipo: tipo, origem: origemTexto(origemAtual), campanha: origemAtual.campaign })
    }).catch((e) => console.warn("Evento não registrado:", e));
  } catch (e) { console.warn("Evento não registrado:", e); }
}

function iniciarRegistro() {
  try { sessionStorage.setItem(ORIGEM_KEY, JSON.stringify(origemAtual)); } catch (e) { /* segue em memória */ }
  trackEvento("visita", { unico: true });
  observarAberturaFeirante();
}

function encerrarRegistro() {
  try {
    sessionStorage.removeItem(ORIGEM_KEY);
    Object.keys(sessionStorage).forEach((k) => { if (k.indexOf(JA_ENVIADO_PREFIX) === 0) sessionStorage.removeItem(k); });
  } catch (e) { /* nada a limpar */ }
}

/* "Abriu o Seja feirante" = o formulário apareceu na tela (uma vez por sessão). */
let observadorFeirante = null;
function observarAberturaFeirante() {
  const form = document.getElementById("form-feirante");
  if (!form || !("IntersectionObserver" in window) || observadorFeirante) return;
  observadorFeirante = new IntersectionObserver((entradas) => {
    if (entradas.some((e) => e.isIntersecting)) {
      trackEvento("abriu_feirante", { unico: true });
      observadorFeirante.disconnect();
      observadorFeirante = null;
    }
  }, { threshold: 0.4 });
  observadorFeirante.observe(form);
}

/* Qualquer elemento com data-track="tipo_do_evento" vira um clique rastreado. */
document.addEventListener("click", (e) => {
  const alvo = e.target.closest && e.target.closest("[data-track]");
  if (alvo) trackEvento(alvo.getAttribute("data-track"));
});

/* ----- Aviso de cookies (barra no rodapé, sem bloquear o site) ----- */
function decidirConsentimento(valor) {
  try { localStorage.setItem(CONSENT_KEY, valor); } catch (e) { /* sem localStorage: vale só nesta página */ }
  const barra = document.getElementById("cookie-banner");
  if (barra) barra.hidden = true;
  if (valor === "granted") iniciarRegistro();
  else encerrarRegistro();
}

function montarAvisoCookies() {
  if (document.getElementById("cookie-banner")) return;
  const barra = document.createElement("div");
  barra.id = "cookie-banner";
  barra.setAttribute("role", "region");
  barra.setAttribute("aria-label", "Aviso de privacidade");
  barra.hidden = true;
  barra.innerHTML =
    '<p>Registramos de qual canal você chegou (por exemplo, Instagram ou Google) para melhorar a divulgação, ' +
    'sem identificar você. <a href="privacidade.html">Saiba mais</a></p>' +
    '<div class="cookie-banner-actions">' +
    '<button type="button" class="btn btn-primary" data-cookie="granted">Aceitar</button>' +
    '<button type="button" class="btn btn-secondary" data-cookie="denied">Recusar</button>' +
    '</div>';
  barra.addEventListener("click", (e) => {
    const botao = e.target.closest("[data-cookie]");
    if (botao) decidirConsentimento(botao.getAttribute("data-cookie"));
  });
  document.body.appendChild(barra);
}

function abrirPreferenciasCookies() {
  montarAvisoCookies();
  document.getElementById("cookie-banner").hidden = false;
}

document.addEventListener("DOMContentLoaded", async () => {
  montarAvisoCookies();

  const abrir = document.getElementById("abrir-cookies");
  if (abrir) abrir.addEventListener("click", (e) => { e.preventDefault(); abrirPreferenciasCookies(); });

  try {
    if (typeof supabaseEnabled === "function" && supabaseEnabled()) {
      const { data } = await sb.auth.getSession();
      visitanteEhAdmin = !!(data && data.session);
    }
  } catch (e) { /* sem sessão: visitante comum */ }

  const decisao = consentimento();
  if (decisao === "granted") iniciarRegistro();
  else if (decisao !== "denied") document.getElementById("cookie-banner").hidden = false;
});
