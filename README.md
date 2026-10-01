# Feira Reuse Araruama

Site oficial da **Feira Reuse Araruama**, um encontro quinzenal (1º domingo e domingo do meio do mês) de economia circular em Araruama (RJ) — moda circular, artesanato autoral e gastronomia local, aberto a visitantes de toda a Região dos Lagos.

🔗 **Site no ar:** [feirareuseararuama.com.br](https://feirareuseararuama.com.br)

## Visão geral

O projeto resolve dois problemas da feira: dar visibilidade online ao evento (agenda, localização, redes sociais, SEO local) e automatizar a operação por trás dele — cadastro de visitantes, recrutamento de feirantes e divulgação — sem exigir um backend tradicional nem equipe técnica para manter.

## Funcionalidades

- **Landing page completa**: agenda da próxima edição, galeria de fotos/vídeos, critérios para feirantes, parcerias e FAQ.
- **Formulário "Avise-me"**: visitantes se cadastram para receber um e-mail automático quando a próxima edição for confirmada.
- **Formulário "Seja feirante"**: candidatos se inscrevem e a candidatura é sincronizada automaticamente para uma planilha do Google, além de ficar salva no banco de dados.
- **Painel administrativo** (`admin.html`): gerenciamento da agenda, inscritos, candidaturas, galeria e redes sociais, sem precisar editar código.
- **Disparo de e-mail com um clique**: avisa todos os inscritos sobre a próxima edição, via integração com [Brevo](https://www.brevo.com/).
- **SEO técnico**: dados estruturados (schema.org), sitemap, meta tags otimizadas e Google Search Console configurado.
- **Google Business Profile** integrado, com botão de avaliação direto no site.

## Tecnologias utilizadas

- **Frontend**: HTML, CSS e JavaScript puros (sem framework, sem build step).
- **Backend / banco de dados**: [Supabase](https://supabase.com/) (Postgres, Auth, Storage, Edge Functions).
- **Hospedagem**: [Cloudflare Workers](https://workers.cloudflare.com/), com deploy automático a cada push no GitHub.
- **E-mail transacional**: [Brevo](https://www.brevo.com/).
- **Integrações automatizadas**: Google Sheets API (sincronização de candidaturas de feirantes) via Supabase Edge Functions + Google Cloud Service Account.

## Estrutura do projeto

```
feira-reuse/
├── index.html           # Landing page
├── admin.html            # Painel administrativo
├── privacidade.html      # Política de privacidade
├── css/style.css         # Estilos do site
├── js/
│   ├── app.js             # Lógica da landing page
│   ├── admin.js           # Lógica do painel administrativo
│   ├── config.js          # Configuração central (links, contatos, domínio)
│   ├── supabase-client.js # Conexão com o Supabase
│   └── depoimentos.js     # Depoimentos de feirantes
├── img/                   # Imagens do site
├── sitemap.xml / robots.txt
├── server.ps1             # Servidor local para desenvolvimento (Windows/PowerShell)
└── SETUP.md               # Guia completo de configuração do backend (Supabase)
```

## Como executar localmente

O projeto é um site estático — não precisa de build nem de `npm install`.

1. Clone o repositório:
   ```bash
   git clone https://github.com/nandevil/feira-reuse.git
   cd feira-reuse
   ```
2. Suba um servidor local. No Windows, com PowerShell:
   ```powershell
   ./server.ps1
   ```
   Isso serve o site em `http://localhost:8125`. (Em outro sistema, qualquer servidor estático simples funciona, ex: `npx serve .`)
3. Para habilitar o backend completo (login do painel, agenda, inscrições, galeria), siga o passo a passo em [`SETUP.md`](./SETUP.md) para configurar seu próprio projeto Supabase e preencher `js/supabase-client.js`.

## Créditos

Desenvolvido para a organização da **Feira Reuse Araruama**, com apoio do [Claude](https://claude.com/claude-code) (Anthropic) no desenvolvimento, configuração de infraestrutura e automações.
