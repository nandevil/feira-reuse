/* =====================================================
   DEPOIMENTOS — edite os textos, e opcionalmente preencha "nome" e
   "instagram" de cada pessoa. Se "nome" ficar vazio, o card usa o
   texto de "fallback" (ex: "Visitante") em vez de travar o layout.
===================================================== */
const DEPOIMENTOS_FEIRANTES = [
  {
    texto: "A feira me deu visibilidade e novos clientes fiéis em Araruama.",
    nome: "",
    instagram: "",
    fallback: "Feirante de artesanato"
  },
  {
    texto: "Organização impecável e um público que valoriza produto sustentável.",
    nome: "",
    instagram: "",
    fallback: "Feirante de roupas upcycled"
  }
];

const DEPOIMENTOS_VISITANTES = [
  {
    texto: "Achei peças incríveis e ainda ajudei o comércio local.",
    nome: "",
    instagram: "",
    fallback: "Visitante"
  },
  {
    texto: "Feira com propósito de verdade — já virou programa mensal aqui em casa.",
    nome: "",
    instagram: "",
    fallback: "Visitante"
  }
];

function renderDepoimentos(containerId, lista) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = lista.map((d) => {
    const nome = (d.nome || "").trim();
    const autorTexto = nome || d.fallback || "";
    const autorHtml = (nome && d.instagram)
      ? `<a href="${d.instagram}" target="_blank" rel="noopener" style="color:inherit;text-decoration:underline">${autorTexto}</a>`
      : autorTexto;
    return `<div class="quote-card"><p class="stars">★★★★★</p><p style="margin:8px 0 0;line-height:1.6">"${d.texto}"</p><p style="margin:12px 0 0;font-weight:600;opacity:.8">— ${autorHtml}</p></div>`;
  }).join("");
}

document.addEventListener("DOMContentLoaded", () => {
  renderDepoimentos("depoimentos-feirantes", DEPOIMENTOS_FEIRANTES);
  renderDepoimentos("depoimentos-visitantes", DEPOIMENTOS_VISITANTES);
});
