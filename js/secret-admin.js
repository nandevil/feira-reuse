/* Acesso discreto ao painel: 3 cliques no logo do rodapé, em até 3s,
   abrem admin.html (que continua exigindo login e senha do Supabase —
   isto só evita deixar um botão "Painel" visível no menu para
   qualquer visitante). */
(() => {
  const trigger = document.getElementById("secret-admin-trigger");
  if (!trigger) return;

  const CLICKS_NEEDED = 3;
  const WINDOW_MS = 3000;
  let clicks = 0;
  let timer = null;

  trigger.addEventListener("click", () => {
    clicks++;
    clearTimeout(timer);
    if (clicks >= CLICKS_NEEDED) {
      clicks = 0;
      window.location.href = "admin.html";
      return;
    }
    timer = setTimeout(() => { clicks = 0; }, WINDOW_MS);
  });
})();
