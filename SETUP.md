# Back-end na nuvem com Supabase (gratuito)

O código do site já está pronto para o Supabase. Enquanto você não
seguir estes passos, a landing page funciona no **modo local** (os
formulários salvam só no navegador de quem preencheu) e o painel
mostra apenas o que estiver salvo no seu próprio navegador, sem login.
Depois de configurar, os cadastros passam a ser salvos na nuvem e o
painel mostra os dados de qualquer dispositivo, com login validado no
servidor.

## Passo 1 — Criar a conta e o projeto

1. Acesse <https://supabase.com> e clique em **Start your project**
   (pode entrar com a conta do GitHub).
2. Crie um projeto: nome `feira-reuse`, senha de banco qualquer
   (guarde), região `South America (São Paulo)`.
3. Aguarde ~2 minutos até o projeto ficar pronto.

## Passo 2 — Criar as tabelas

No menu lateral, abra **SQL Editor**, cole o bloco abaixo e clique em
**Run**:

```sql
-- Próxima edição da feira (linha única, id=1)
create table public.agenda (
  id int primary key default 1,
  label text,
  date_text text,
  address text,
  schedule_text text,
  map_url text
);
insert into public.agenda (id) values (1);

-- Inscrições do formulário "Avise-me"
create table public.inscricoes (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  email text not null,
  whatsapp text not null
);

-- Candidaturas do formulário "Seja feirante"
create table public.feirantes (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  nome text not null,
  whatsapp text not null,
  produtos text not null,
  status text not null default 'novo'
);

-- Fotos do carrossel "Galeria" (gerenciadas pelo painel, quantidade livre)
create table public.galeria (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  image_url text not null,
  storage_path text not null,
  caption text not null default '',
  posicao int not null default 0
);

alter table public.agenda enable row level security;
alter table public.inscricoes enable row level security;
alter table public.feirantes enable row level security;
alter table public.galeria enable row level security;
alter table public.agenda force row level security;
alter table public.inscricoes force row level security;
alter table public.feirantes force row level security;
alter table public.galeria force row level security;

-- Qualquer visitante pode LER a agenda (aparece na landing page)
create policy "todos podem ler agenda"
  on public.agenda for select to anon using (true);

-- Apenas você (logado) pode ATUALIZAR a agenda
create policy "dono pode atualizar agenda"
  on public.agenda for update to authenticated using (true) with check (true);

-- Visitantes (anônimos) podem CRIAR inscrições e candidaturas
create policy "anon pode se inscrever"
  on public.inscricoes for insert to anon with check (true);
create policy "anon pode se candidatar"
  on public.feirantes for insert to anon with check (true);

-- Apenas você (logado) pode LER e APAGAR inscrições/candidaturas
create policy "dono pode ler inscricoes"
  on public.inscricoes for select to authenticated using (true);
create policy "dono pode apagar inscricoes"
  on public.inscricoes for delete to authenticated using (true);
create policy "dono pode ler feirantes"
  on public.feirantes for select to authenticated using (true);
create policy "dono pode apagar feirantes"
  on public.feirantes for delete to authenticated using (true);

-- Qualquer visitante pode LER a galeria (aparece no carrossel da home)
create policy "todos podem ler galeria"
  on public.galeria for select to anon using (true);

-- Apenas você (logado) pode ADICIONAR, EDITAR e APAGAR fotos da galeria
create policy "dono pode inserir galeria"
  on public.galeria for insert to authenticated with check (true);
create policy "dono pode atualizar galeria"
  on public.galeria for update to authenticated using (true) with check (true);
create policy "dono pode apagar galeria"
  on public.galeria for delete to authenticated using (true);
```

## Passo 3 — Criar o bucket de fotos da galeria

1. Menu **Storage → New bucket**. Nome: `galeria`. Marque **Public
   bucket** (assim as fotos aparecem no carrossel do site sem precisar
   de login).
2. Volte ao **SQL Editor**, cole o bloco abaixo e clique em **Run**
   (essas políticas fazem para os ARQUIVOS o mesmo que as políticas
   acima fazem para a tabela `galeria`):

```sql
create policy "leitura publica das fotos da galeria"
  on storage.objects for select
  to public
  using (bucket_id = 'galeria');

create policy "dono pode enviar fotos da galeria"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'galeria');

create policy "dono pode apagar fotos da galeria"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'galeria');
```

## Passo 4 — Criar o SEU usuário de acesso ao painel

1. Menu **Authentication → Users → Add user → Create new user**.
2. E-mail e senha forte de sua escolha (o e-mail que você vai usar
   para logar em `admin.html`).
3. Marque **Auto Confirm User**.
4. Em **Authentication → Sign In / Up**, desative
   **Allow new users to sign up** (assim ninguém mais cria conta).

## Passo 5 — Conectar o site

1. Menu **Project Settings → API**. Copie:
   - **Project URL** (ex: `https://abcdefgh.supabase.co`)
   - **anon public key** (começa com `eyJ...` ou `sb_publishable_...`)
2. Abra `js/supabase-client.js` e preencha:

```js
const SUPABASE_URL = "https://SEU-PROJETO.supabase.co";
const SUPABASE_ANON_KEY = "sua-anon-key-aqui";
```

3. Salve, recarregue o site (`index.html`) e o painel (`admin.html`).
   O selo do painel deve mudar de "Modo local" para "Conectado à
   nuvem", e você poderá logar com o usuário criado no Passo 3.
