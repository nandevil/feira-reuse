/* =====================================================
   CONFIGURAÇÃO EDITÁVEL — preencha com os dados reais.
   Este arquivo é a ÚNICA fonte dos links de redes sociais, WhatsApp,
   e-mail, IDs de rastreamento e domínio. Troque os valores abaixo e
   todos os lugares do site (topo, seção "sobre", rodapé, botão
   flutuante, formulário de feirante, SEO) atualizam automaticamente.
===================================================== */
const FEIRA_CONFIG = {
  // Redes sociais — troque "#" pela URL real de cada perfil.
  social: {
    instagram: "#", // ex: "https://instagram.com/feirareusearar"
    facebook: "#",  // ex: "https://facebook.com/feirareusearar"
    tiktok: "#"     // ex: "https://tiktok.com/@feirareusearar"
  },

  // WhatsApp da organização, formato internacional sem espaços/símbolos.
  // Exemplo: "5522900000000" (55 = Brasil, 22 = DDD, resto o número).
  whatsappNumber: "", // preencha para ativar os links/botão de WhatsApp
  whatsappMessage: "Olá! Vim pelo site da Feira Reuse Araruama.",

  // E-mail de contato exibido no rodapé.
  email: "", // ex: "contato@feirareuseararuama.com.br"

  // Domínio final do site, sem barra no fim (usado em canonical/OG/sitemap).
  siteUrl: "https://SEU-DOMINIO-AQUI.com.br",

  // Analytics e Ads — troque pelos IDs reais quando tiver as contas.
  ga4MeasurementId: "G-XXXXXXXXXX",
  metaPixelId: "0000000000000"
};

/* Monta o link wa.me a partir do número acima; retorna "#" (inerte)
   se o número ainda não foi preenchido, para não gerar um link quebrado.
   Aceita uma mensagem específica (customMessage); sem ela, usa a
   mensagem padrão de FEIRA_CONFIG.whatsappMessage. */
function whatsappLink(customMessage) {
  const n = (FEIRA_CONFIG.whatsappNumber || "").replace(/\D/g, "");
  if (!n) return "#";
  const msg = customMessage || FEIRA_CONFIG.whatsappMessage || "";
  return "https://wa.me/" + n + "?text=" + encodeURIComponent(msg);
}

/* Aplica os links de config.js em todo elemento marcado com
   data-social="instagram|facebook|tiktok", data-whatsapp-link ou
   data-email-link. Rodar uma vez, no carregamento de cada página. */
function applyFeiraConfigLinks() {
  document.querySelectorAll("[data-social]").forEach((el) => {
    const key = el.getAttribute("data-social");
    const url = FEIRA_CONFIG.social[key];
    if (url && url !== "#") el.href = url;
  });

  // data-whatsapp-message (opcional): mensagem própria desse botão,
  // em vez da mensagem padrão — ex: o CTA "Seja um Parceiro".
  document.querySelectorAll("[data-whatsapp-link]").forEach((el) => {
    const wa = whatsappLink(el.getAttribute("data-whatsapp-message"));
    if (wa !== "#") el.href = wa;
  });

  document.querySelectorAll("[data-email-link]").forEach((el) => {
    if (FEIRA_CONFIG.email) el.href = "mailto:" + FEIRA_CONFIG.email;
  });
}

document.addEventListener("DOMContentLoaded", applyFeiraConfigLinks);
