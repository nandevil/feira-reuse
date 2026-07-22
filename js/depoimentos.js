/* =====================================================
   DEPOIMENTOS — edite os textos e, opcionalmente, preencha:
   - nome: nome da pessoa (some some vazio, usa "fallback")
   - instagram: o @ da pessoa, ex: "@feirareusearar" (opcional)
   - foto: caminho de uma foto quadrada, ex: "img/depoimentos/nome.jpg"
           (opcional — sem foto, o card não mostra avatar)
   Nada disso trava o layout se ficar vazio.
===================================================== */
const DEPOIMENTOS_FEIRANTES = [
  {
    texto: "A feira me deu visibilidade e novos clientes fiéis em Araruama.",
    nome: "",
    instagram: "",
    foto: "",
    fallback: "Feirante de artesanato"
  },
  {
    texto: "Organização impecável e um público que valoriza produto sustentável.",
    nome: "",
    instagram: "",
    foto: "",
    fallback: "Feirante de roupas upcycled"
  }
];

const DEPOIMENTOS_VISITANTES = [
  {
    texto: "Achei peças incríveis e ainda ajudei o comércio local.",
    nome: "",
    instagram: "",
    foto: "",
    fallback: "Visitante"
  },
  {
    texto: "Feira com propósito de verdade — já virou programa mensal aqui em casa.",
    nome: "",
    instagram: "",
    foto: "",
    fallback: "Visitante"
  }
];

/* "@fulano" -> link https://instagram.com/fulano (aceita já vir com ou sem @) */
function instagramHandleUrl(handle) {
  const clean = (handle || "").trim().replace(/^@/, "");
  return clean ? "https://instagram.com/" + clean : "";
}

function renderDepoimentos(containerId, lista) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = lista.map((d) => {
    const nome = (d.nome || "").trim();
    const handle = (d.instagram || "").trim();
    const autorTexto = nome || d.fallback || "";
    const handleHtml = handle
      ? ` <a href="${instagramHandleUrl(handle)}" target="_blank" rel="noopener" style="color:inherit;opacity:.85">${handle.startsWith("@") ? handle : "@" + handle}</a>`
      : "";
    const avatarHtml = d.foto
      ? `<img class="quote-avatar" src="${d.foto}" alt="Foto de ${autorTexto}" loading="lazy" width="44" height="44"/>`
      : "";
    return `<div class="quote-card">
      <p class="stars">★★★★★</p>
      <p style="margin:8px 0 0;line-height:1.6">"${d.texto}"</p>
      <div class="quote-author">
        ${avatarHtml}
        <p style="margin:0;font-weight:600;opacity:.9">— ${autorTexto}${handleHtml}</p>
      </div>
    </div>`;
  }).join("");
}

document.addEventListener("DOMContentLoaded", () => {
  renderDepoimentos("depoimentos-feirantes", DEPOIMENTOS_FEIRANTES);
  renderDepoimentos("depoimentos-visitantes", DEPOIMENTOS_VISITANTES);
});
