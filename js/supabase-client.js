/* =====================================================
   SUPABASE — configuração do back-end na nuvem
   Enquanto os dois campos abaixo estiverem vazios, o site funciona no
   modo local (avisos e agenda ficam salvos só neste navegador, sem
   painel administrativo funcional). Preencha com os dados do seu
   projeto Supabase (veja SETUP.md na raiz do projeto) para ativar o
   modo nuvem.

   A "anon key" é pública por design (ela vai no front-end de qualquer
   site que usa Supabase); a proteção dos dados vem das políticas RLS
   criadas no SETUP.md, não do sigilo da chave.
===================================================== */
const SUPABASE_URL = "https://hepgprwnzngohiflzzrq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhlcGdwcnduem5nb2hpZmx6enJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ4MDc5MzUsImV4cCI6MjEwMDM4MzkzNX0.9xWV4tKxePxem4ULShjR5yU9hciGXuErg5kJnRq3c6o";

const sb = (SUPABASE_URL && SUPABASE_ANON_KEY && window.supabase)
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

function supabaseEnabled() {
  return !!sb;
}

/* Linha única (id=1) da tabela public.agenda -> formato do site */
function rowToAgenda(r) {
  return {
    label: r.label || "A definir",
    dateText: r.date_text || "",
    address: r.address || "a definir",
    schedule: r.schedule_text || "a definir",
    mapUrl: r.map_url || "",
    imageUrl: r.image_url || "",
    storagePath: r.storage_path || "",
    entradaGratuita: r.entrada_gratuita !== false
  };
}

function agendaToRow(a) {
  return {
    id: 1,
    label: a.label,
    date_text: a.dateText,
    address: a.address,
    schedule_text: a.schedule,
    map_url: a.mapUrl,
    image_url: a.imageUrl,
    storage_path: a.storagePath,
    entrada_gratuita: a.entradaGratuita
  };
}

/* Inscrição do formulário "Avise-me" (tabela public.inscricoes) */
function rowToInscricao(r) {
  return {
    id: r.id,
    createdAt: r.created_at,
    email: r.email,
    whatsapp: r.whatsapp
  };
}

/* Candidatura de feirante (tabela public.feirantes) */
function rowToFeirante(r) {
  return {
    id: r.id,
    createdAt: r.created_at,
    nome: r.nome,
    whatsapp: r.whatsapp,
    produtos: r.produtos,
    status: r.status || "novo"
  };
}

/* Foto do carrossel "Galeria" (tabela public.galeria) */
function rowToGaleria(r) {
  return {
    id: r.id,
    createdAt: r.created_at,
    imageUrl: r.image_url,
    storagePath: r.storage_path,
    caption: r.caption || "",
    posicao: Number.isFinite(r.posicao) ? r.posicao : 0
  };
}

/* Link + foto de perfil de uma rede social (tabela public.redes_sociais) */
function rowToRedeSocial(r) {
  return {
    id: r.id,
    url: r.url || "",
    fotoUrl: r.foto_url || "",
    storagePath: r.storage_path || ""
  };
}
