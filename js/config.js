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
    instagram: "https://instagram.com/feira_reuse_araruama",
    facebook: "https://www.facebook.com/profile.php?id=100064792671133",
    tiktok: "https://www.tiktok.com/@feira.reuse.araru"
  },

  // WhatsApp da organização, formato internacional sem espaços/símbolos.
  // Exemplo: "5522900000000" (55 = Brasil, 22 = DDD, resto o número).
  whatsappNumber: "5522999390065",
  whatsappMessage: "Olá! Vim pelo site da Feira Reuse Araruama.",

  // E-mail de contato exibido no rodapé.
  email: "feirareuseararuama@hotmail.com",

  // Domínio final do site, sem barra no fim (usado em canonical/OG/sitemap).
  siteUrl: "https://feirareuseararuama.com.br",

  // Link direto pra avaliação no Google Business Profile (aparece no
  // botão "Avalie-nos no Google" do rodapé).
  googleReviewUrl: "https://g.page/r/Cdiw_hLzsD6yEBM/review",

  // Link de convite do grupo de avisos no WhatsApp (aparece no botão
  // "Grupo de avisos WhatsApp" na home).
  whatsappGroupUrl: "https://chat.whatsapp.com/DiHd1siwEAS7wcx2MrJDFu?s=cl&p=i&ilr=4",

  // Cidades da Região dos Lagos que a feira também quer alcançar (SEO local
  // — entra nos dados estruturados como "área atendida"). Ajuste a lista
  // livremente; a cidade principal (Araruama) já é tratada à parte.
  regiaoAtendida: ["Cabo Frio", "São Pedro da Aldeia", "Iguaba Grande", "Saquarema", "Arraial do Cabo", "Armação dos Búzios"],

  // Analytics e Ads — troque pelos IDs reais quando tiver as contas.
  ga4MeasurementId: "G-XXXXXXXXXX",
  metaPixelId: "0000000000000",

  // Domínio de e-mail novo (registrado em 2026): os primeiros e-mails de
  // confirmação podem cair na caixa de spam/lixo eletrônico até a
  // reputação de envio se firmar. Mostra um aviso disso na confirmação
  // do "Avise-me". Quando a entrega estiver estável (depois de um tempo
  // enviando sem reclamação), troque para false pra remover o aviso.
  avisoSpamAtivo: true
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

  document.querySelectorAll("[data-google-review-link]").forEach((el) => {
    if (FEIRA_CONFIG.googleReviewUrl) el.href = FEIRA_CONFIG.googleReviewUrl;
  });

  document.querySelectorAll("[data-whatsapp-group-link]").forEach((el) => {
    if (FEIRA_CONFIG.whatsappGroupUrl) el.href = FEIRA_CONFIG.whatsappGroupUrl;
  });
}

document.addEventListener("DOMContentLoaded", applyFeiraConfigLinks);
