/* Disparo de conversão (GA4 + Meta Pixel) para os dois formulários do site.
   Chamado por js/app.js logo após salvar com sucesso no Supabase (ou no
   modo local) — nunca substitui o salvamento, só roda em paralelo. */
function trackLead(formType) {
  try {
    if (typeof gtag === "function") {
      gtag("event", "generate_lead", { form_type: formType });
    }
  } catch (e) { console.warn("GA4 lead event failed:", e); }

  try {
    if (typeof fbq === "function") {
      fbq("track", "Lead", { form_type: formType });
    }
  } catch (e) { console.warn("Meta Pixel lead event failed:", e); }
}
