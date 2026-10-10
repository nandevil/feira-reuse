/* Página "Origem do acesso" do painel: de onde vêm as visitas e quais origens
   geram resultado. Só dados agregados por origem — nenhum nome, e-mail ou
   telefone aparece aqui. Depende do Passo 8 do SETUP.md (tabela eventos). */

const DATA_LANCAMENTO = "2026-10-12";
const SEM_ORIGEM = "(sem origem registrada)";
const MIN_VISITAS_CONFIANCA = 30; // abaixo disso: "poucos dados"
const MIN_VISITAS_ALERTA = 10;    // "muita visita" no resumo semanal
const CORES_GRAFICO = ["#1F5C33", "#D9962B", "#2F7DBB", "#C2543C", "#7A5BA6", "#8A8F85"];

/* ================= Funções puras (sem tela) ================= */

function inicioDoDia(data) {
  const d = new Date(data);
  d.setHours(0, 0, 0, 0);
  return d;
}

function somarDias(data, dias) {
  const d = new Date(data);
  d.setDate(d.getDate() + dias);
  return d;
}

function dataDeInput(valor) {
  const [a, m, d] = String(valor || "").split("-").map(Number);
  return a && m && d ? new Date(a, m - 1, d) : null;
}

/* Período = [inicio, fim) em dias cheios do horário local. null se inválido. */
function resolverPeriodo(tipo, deStr, ateStr, agora) {
  const hojeInicio = inicioDoDia(agora || new Date());
  const amanha = somarDias(hojeInicio, 1);
  if (tipo === "7") return { inicio: somarDias(hojeInicio, -6), fim: amanha };
  if (tipo === "30") return { inicio: somarDias(hojeInicio, -29), fim: amanha };
  if (tipo === "desde") return { inicio: dataDeInput(DATA_LANCAMENTO), fim: amanha };
  const de = dataDeInput(deStr), ate = dataDeInput(ateStr);
  if (!de || !ate || ate < de) return null;
  return { inicio: de, fim: somarDias(ate, 1) };
}

/* Período imediatamente anterior, com o mesmo número de dias. */
function periodoAnterior(p) {
  const dias = Math.round((p.fim - p.inicio) / 86400000);
  return { inicio: somarDias(p.inicio, -dias), fim: p.inicio };
}

function chaveOrigem(o) {
  const k = String(o || "").trim().toLowerCase();
  return k || SEM_ORIGEM;
}

function agregarOrigens(eventos, feirantes, inscricoes) {
  const mapa = new Map();
  const linha = (o) => {
    const k = chaveOrigem(o);
    if (!mapa.has(k)) mapa.set(k, { origem: k, visitas: 0, grupo: 0, mapa: 0, feirantes: 0, avise: 0 });
    return mapa.get(k);
  };
  for (const e of eventos) {
    const l = linha(e.origem);
    if (e.tipo === "visita") l.visitas++;
    else if (e.tipo === "clique_grupo") l.grupo++;
    else if (e.tipo === "clique_mapa") l.mapa++;
  }
  for (const f of feirantes) linha(f.origem).feirantes++;
  for (const i of inscricoes) linha(i.origem).avise++;
  return Array.from(mapa.values()).map(completarLinha);
}

function completarLinha(l) {
  const resultados = l.grupo + l.feirantes + l.avise;
  return { ...l, resultados, conversao: l.visitas > 0 ? resultados / l.visitas : null };
}

function somarTotais(linhas) {
  const t = { origem: "Total", visitas: 0, grupo: 0, mapa: 0, feirantes: 0, avise: 0 };
  for (const l of linhas) {
    t.visitas += l.visitas; t.grupo += l.grupo; t.mapa += l.mapa;
    t.feirantes += l.feirantes; t.avise += l.avise;
  }
  return completarLinha(t);
}

/* Variação em %: null quando não há base de comparação. */
function variacaoPercentual(atual, anterior) {
  if (!anterior) return null;
  return ((atual - anterior) / anterior) * 100;
}

/* Variação da conversão em pontos percentuais: null se algum lado não existe. */
function variacaoPontos(convAtual, convAnterior) {
  if (convAtual == null || convAnterior == null) return null;
  return (convAtual - convAnterior) * 100;
}

function temDados(t) {
  return t.visitas + t.grupo + t.mapa + t.feirantes + t.avise > 0;
}

/* Linhas com os maiores valores de uma métrica (empates juntos); só se > 0. */
function lideres(linhas, metrica) {
  const validas = linhas.filter((l) => l.origem !== SEM_ORIGEM && l[metrica] > 0);
  if (!validas.length) return null;
  const max = Math.max(...validas.map((l) => l[metrica]));
  return { valor: max, linhas: validas.filter((l) => l[metrica] === max) };
}

/* Origem com visita demais e resultado de menos: pelo menos MIN_VISITAS_ALERTA
   visitas e (nenhum resultado, ou conversão abaixo da metade da geral). */
function origemComPoucoResultado(linhas, totais) {
  const geral = totais.conversao || 0;
  const candidatas = linhas.filter((l) =>
    l.origem !== SEM_ORIGEM && l.visitas >= MIN_VISITAS_ALERTA &&
    (l.resultados === 0 || l.conversao < geral / 2));
  if (!candidatas.length) return null;
  return candidatas.reduce((a, b) => (b.visitas > a.visitas ? b : a));
}

function listaNomes(linhas) {
  return linhas.map((l) => l.origem).join(" e ");
}

/* Frases do "Resumo da semana": só citam números que existem. */
function montarResumo(linhas, totais, periodoTexto) {
  if (!temDados(totais)) return ["Ainda sem acessos registrados nesta semana."];
  const frases = [`Últimos 7 dias (${periodoTexto}): ${totais.visitas} ${totais.visitas === 1 ? "visita" : "visitas"}.`];
  const feir = lideres(linhas, "feirantes");
  if (feir) frases.push(`Origem com mais candidaturas de feirantes: ${listaNomes(feir.linhas)} (${feir.valor}).`);
  const grupo = lideres(linhas, "grupo");
  if (grupo) frases.push(`Origem com mais entradas no grupo: ${listaNomes(grupo.linhas)} (${grupo.valor}).`);
  const fraca = origemComPoucoResultado(linhas, totais);
  if (fraca) {
    frases.push(`Origem com muita visita e pouco resultado: ${fraca.origem} (${fraca.visitas} visitas, ${fraca.resultados} ${fraca.resultados === 1 ? "resultado" : "resultados"}). Revise a chamada ou o link.`);
  }
  if (totais.visitas < MIN_VISITAS_CONFIANCA) frases.push("Poucos dados: use como tendência, não como conclusão.");
  return frases;
}

function chaveDia(data) {
  const d = new Date(data);
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

/* Visitas por dia e origem; as 5 origens com mais visitas ficam separadas, o resto vira "outras". */
function visitasPorDia(eventos, inicio, fim) {
  const dias = [];
  for (let d = new Date(inicio); d < fim; d = somarDias(d, 1)) dias.push(chaveDia(d));
  const indice = new Map(dias.map((k, i) => [k, i]));
  const porOrigem = new Map();
  for (const e of eventos) {
    if (e.tipo !== "visita") continue;
    const i = indice.get(chaveDia(e.created_at));
    if (i === undefined) continue;
    const k = chaveOrigem(e.origem);
    if (!porOrigem.has(k)) porOrigem.set(k, dias.map(() => 0));
    porOrigem.get(k)[i]++;
  }
  const ordenadas = Array.from(porOrigem.entries())
    .map(([origem, valores]) => ({ origem, valores, total: valores.reduce((a, b) => a + b, 0) }))
    .sort((a, b) => b.total - a.total);
  const series = ordenadas.slice(0, 5);
  const resto = ordenadas.slice(5);
  if (resto.length) {
    series.push({ origem: "outras", total: resto.reduce((a, s) => a + s.total, 0), valores: dias.map((_, i) => resto.reduce((a, s) => a + s.valores[i], 0)) });
  }
  return { dias, series };
}

function normalizarUtm(valor) { // mesma regra de js/origem.js
  return String(valor || "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9_.-]/g, "")
    .slice(0, 40);
}

/* null quando o destino não é um endereço válido. */
function montarLinkUtm(destino, fonte, meio, campanha) {
  let url;
  try { url = new URL(String(destino || "").trim()); } catch (e) { return null; }
  if (!/^https?:$/.test(url.protocol)) return null;
  const f = normalizarUtm(fonte), m = normalizarUtm(meio), c = normalizarUtm(campanha);
  if (!f || !m) return null;
  url.searchParams.set("utm_source", f);
  url.searchParams.set("utm_medium", m);
  if (c) url.searchParams.set("utm_campaign", c); else url.searchParams.delete("utm_campaign");
  return url.toString();
}

/* ================= Formatação ================= */

function fmtNum(n) { return Number(n).toLocaleString("pt-BR"); }
function fmtDecimal(n, casas) { return Number(n).toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas }); }
function fmtConversao(c) { return c == null ? "—" : fmtDecimal(c * 100, 1) + "%"; }
function fmtDiaMes(d) { return String(d.getDate()).padStart(2, "0") + "/" + String(d.getMonth() + 1).padStart(2, "0"); }
function fmtDiaMesAno(d) { return fmtDiaMes(d) + "/" + d.getFullYear(); }
function textoPeriodo(p) { return fmtDiaMes(p.inicio) + " a " + fmtDiaMes(somarDias(p.fim, -1)); }

function fmtVariacao(valor, unidade) {
  if (valor == null || !Number.isFinite(valor)) return '<span class="var-nd">—</span>';
  const arred = Math.round(valor * 10) / 10;
  const sinal = arred > 0 ? "+" : "";
  const classe = arred > 0 ? "var-pos" : arred < 0 ? "var-neg" : "var-nd";
  return `<span class="${classe}">${sinal}${fmtDecimal(arred, 1)}${unidade}</span>`;
}

/* ================= Dados (Supabase) ================= */

async function buscarTodos(tabela, colunas, inicio, fim) {
  const linhas = [];
  const passo = 1000;
  for (let de = 0; ; de += passo) {
    const { data, error } = await sb.from(tabela).select(colunas)
      .gte("created_at", inicio.toISOString()).lt("created_at", fim.toISOString())
      .order("created_at", { ascending: true }).order("id", { ascending: true })
      .range(de, de + passo - 1);
    if (error) throw error;
    linhas.push(...data);
    if (data.length < passo) break;
  }
  return linhas;
}

async function carregarPeriodo(p) {
  const [eventos, feirantes, inscricoes] = await Promise.all([
    buscarTodos("eventos", "id,tipo,origem,created_at", p.inicio, p.fim),
    buscarTodos("feirantes", "id,origem,created_at", p.inicio, p.fim),
    buscarTodos("inscricoes", "id,origem,created_at", p.inicio, p.fim)
  ]);
  const linhas = agregarOrigens(eventos, feirantes, inscricoes);
  return { eventos, linhas, totais: somarTotais(linhas) };
}

/* ================= Tela ================= */

const origemEstado = { atual: null, anterior: null, periodo: null, ordem: "visitas", direcao: "desc", token: 0, carregado: false };

function elo(id) { return document.getElementById(id); }

function copiarTexto(texto) {
  if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(texto);
  return new Promise((resolve, reject) => {
    const area = document.createElement("textarea");
    area.value = texto;
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    try { document.execCommand("copy") ? resolve() : reject(new Error("copy")); } catch (e) { reject(e); } finally { area.remove(); }
  });
}

function mostrarAba(nome) {
  const origem = nome === "origem";
  elo("tab-gestao").setAttribute("aria-selected", String(!origem));
  elo("tab-origem").setAttribute("aria-selected", String(origem));
  elo("view-gestao").hidden = origem;
  elo("view-origem").hidden = !origem;
  if (origem && !origemEstado.carregado) {
    origemEstado.carregado = true;
    atualizarOrigem();
    atualizarResumoSemana();
  }
}

function compararLinhas(a, b) {
  const chave = origemEstado.ordem;
  const dir = origemEstado.direcao === "asc" ? 1 : -1;
  if (chave === "origem") return a.origem.localeCompare(b.origem, "pt-BR") * dir;
  const va = a[chave], vb = b[chave];
  if (va == null && vb == null) return a.origem.localeCompare(b.origem, "pt-BR");
  if (va == null) return 1;
  if (vb == null) return -1;
  return (va - vb) * dir || a.origem.localeCompare(b.origem, "pt-BR");
}

/* Junta cada linha atual com a mesma origem do período anterior. */
function linhasComComparacao() {
  const anteriores = new Map(origemEstado.anterior.linhas.map((l) => [l.origem, l]));
  return origemEstado.atual.linhas.map((l) => {
    const ant = anteriores.get(l.origem);
    return {
      ...l,
      dVisitas: ant ? variacaoPercentual(l.visitas, ant.visitas) : null,
      dConversao: ant ? variacaoPontos(l.conversao, ant.conversao) : null
    };
  });
}

function renderTabela() {
  const linhas = linhasComComparacao().sort(compararLinhas);
  elo("origem-corpo").innerHTML = linhas.map((l) =>
    `<tr><td>${escapeHtml(l.origem)}</td><td class="num">${fmtNum(l.visitas)}</td><td class="num">${fmtNum(l.grupo)}</td>` +
    `<td class="num">${fmtNum(l.feirantes)}</td><td class="num">${fmtNum(l.avise)}</td><td class="num">${fmtNum(l.mapa)}</td>` +
    `<td class="num">${fmtConversao(l.conversao)}</td><td class="num">${fmtVariacao(l.dVisitas, "%")}</td>` +
    `<td class="num">${fmtVariacao(l.dConversao, " pp")}</td></tr>`).join("");

  const t = origemEstado.atual.totais, ta = origemEstado.anterior.totais;
  elo("origem-rodape").innerHTML =
    `<tr><td>Total</td><td class="num">${fmtNum(t.visitas)}</td><td class="num">${fmtNum(t.grupo)}</td><td class="num">${fmtNum(t.feirantes)}</td>` +
    `<td class="num">${fmtNum(t.avise)}</td><td class="num">${fmtNum(t.mapa)}</td><td class="num">${fmtConversao(t.conversao)}</td>` +
    `<td class="num">${fmtVariacao(variacaoPercentual(t.visitas, ta.visitas), "%")}</td>` +
    `<td class="num">${fmtVariacao(variacaoPontos(t.conversao, ta.conversao), " pp")}</td></tr>`;

  document.querySelectorAll("#origem-tabela th[data-sort]").forEach((th) => {
    const ativo = th.dataset.sort === origemEstado.ordem;
    if (ativo) th.setAttribute("aria-sort", origemEstado.direcao === "asc" ? "ascending" : "descending");
    else th.removeAttribute("aria-sort");
  });
}

function renderCards() {
  const t = origemEstado.atual.totais, ta = origemEstado.anterior.totais;
  const convPontos = variacaoPontos(t.conversao, ta.conversao);
  const convPct = (t.conversao != null && ta.conversao) ? variacaoPercentual(t.conversao, ta.conversao) : null;
  const convVar = convPontos == null ? '<span class="var-nd">—</span>' : `${fmtVariacao(convPontos, " pp")} (${fmtVariacao(convPct, "%")})`;
  elo("origem-cards").innerHTML =
    `<div class="origem-card"><small>Visitas</small><strong>${fmtNum(t.visitas)}</strong><span>${fmtVariacao(variacaoPercentual(t.visitas, ta.visitas), "%")} vs. anterior (${fmtNum(ta.visitas)})</span></div>` +
    `<div class="origem-card"><small>Resultados</small><strong>${fmtNum(t.resultados)}</strong><span>${fmtVariacao(variacaoPercentual(t.resultados, ta.resultados), "%")} vs. anterior (${fmtNum(ta.resultados)})</span></div>` +
    `<div class="origem-card"><small>Taxa de conversão</small><strong>${fmtConversao(t.conversao)}</strong><span>${convVar} vs. anterior (${fmtConversao(ta.conversao)})</span></div>`;
}

function renderRankings() {
  const linhas = origemEstado.atual.linhas;
  const reais = linhas.filter((l) => l.origem !== SEM_ORIGEM);
  const lista = (itens, detalhe) => itens.length
    ? `<ol>${itens.map((l) => `<li>${escapeHtml(l.origem)} — <strong>${detalhe(l)}</strong></li>`).join("")}</ol>`
    : '<p class="admin-empty" style="margin:0">Nenhuma origem ainda neste período.</p>';
  const feir = reais.filter((l) => l.feirantes > 0).sort((a, b) => b.feirantes - a.feirantes);
  const publico = reais.filter((l) => l.grupo + l.avise > 0).sort((a, b) => (b.grupo + b.avise) - (a.grupo + a.avise));
  elo("origem-rank-feirantes").innerHTML = lista(feir, (l) => `${l.feirantes} ${l.feirantes === 1 ? "candidatura" : "candidaturas"}`);
  elo("origem-rank-publico").innerHTML = lista(publico, (l) => `${l.grupo} no grupo · ${l.avise} no Avise-me`);
  const sem = linhas.find((l) => l.origem === SEM_ORIGEM);
  if (sem && sem.resultados > 0) {
    elo("origem-rank-publico").insertAdjacentHTML("beforeend",
      `<p class="admin-empty" style="margin:8px 0 0">${fmtNum(sem.resultados)} resultado(s) sem origem registrada (sem aceite dos cookies ou anteriores ao rastreio) não entram nos rankings.</p>`);
  }
}

function svgGrafico(dias, series) {
  const W = 640, H = 240, esq = 36, dir = 6, topo = 10, base = 26;
  const larg = (W - esq - dir) / dias.length;
  const folga = dias.length > 45 ? 0 : 2;
  const totais = dias.map((_, i) => series.reduce((a, s) => a + s.valores[i], 0));
  const maximo = Math.max(1, ...totais);
  const altura = H - topo - base;
  let barras = "";
  dias.forEach((dia, i) => {
    let y = H - base;
    series.forEach((s, k) => {
      const n = s.valores[i];
      if (!n) return;
      const h = (n / maximo) * altura;
      y -= h;
      const [, mes, d] = dia.split("-");
      barras += `<rect x="${(esq + i * larg).toFixed(2)}" y="${y.toFixed(2)}" width="${Math.max(larg - folga, 0.5).toFixed(2)}" height="${h.toFixed(2)}" fill="${CORES_GRAFICO[k % CORES_GRAFICO.length]}"><title>${d}/${mes} — ${escapeHtml(s.origem)}: ${n}</title></rect>`;
    });
  });
  const rotulo = (i, ancora) => {
    const [, mes, d] = dias[i].split("-");
    const x = ancora === "start" ? esq + i * larg : ancora === "end" ? esq + (i + 1) * larg : esq + (i + 0.5) * larg;
    return `<text x="${x.toFixed(1)}" y="${H - 8}" font-size="11" text-anchor="${ancora}" fill="#123D22">${d}/${mes}</text>`;
  };
  const meio = dias.length > 2 ? rotulo(Math.floor(dias.length / 2), "middle") : "";
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Visitas por dia, empilhadas por origem. Máximo de ${maximo} visitas em um dia.">` +
    `<line x1="${esq}" y1="${H - base}" x2="${W - dir}" y2="${H - base}" stroke="#123D22" stroke-opacity=".4"/>` +
    `<text x="${esq - 6}" y="${topo + 8}" font-size="11" text-anchor="end" fill="#123D22">${maximo}</text>` +
    `<text x="${esq - 6}" y="${H - base}" font-size="11" text-anchor="end" fill="#123D22">0</text>` +
    barras + rotulo(0, "start") + meio + (dias.length > 1 ? rotulo(dias.length - 1, "end") : "") + `</svg>`;
}

function renderGrafico() {
  const { dias, series } = visitasPorDia(origemEstado.atual.eventos, origemEstado.periodo.inicio, origemEstado.periodo.fim);
  if (!series.length) {
    elo("origem-grafico").innerHTML = '<p class="admin-empty" style="margin:0">Nenhuma visita registrada neste período.</p>';
    elo("origem-legenda").innerHTML = "";
    return;
  }
  elo("origem-grafico").innerHTML = svgGrafico(dias, series);
  elo("origem-legenda").innerHTML = series.map((s, k) =>
    `<span><i style="background:${CORES_GRAFICO[k % CORES_GRAFICO.length]}"></i>${escapeHtml(s.origem)} (${fmtNum(s.total)})</span>`).join("");
}

function mensagemErroCarga(err) {
  const codigo = err && (err.code || "");
  if (["42P01", "42703", "PGRST205", "PGRST204"].includes(codigo)) {
    return "As tabelas de origem ainda não existem no banco. Rode o Passo 8 do SETUP.md no SQL Editor do Supabase.";
  }
  return "Não foi possível carregar os dados agora. Tente novamente em instantes.";
}

async function atualizarOrigem() {
  const token = ++origemEstado.token;
  const periodo = resolverPeriodo(elo("origem-periodo").value, elo("origem-de").value, elo("origem-ate").value);
  const vazio = elo("origem-vazio");
  if (!periodo) {
    vazio.textContent = "Escolha as datas inicial e final do período (a final não pode ser antes da inicial).";
    vazio.hidden = false;
    elo("origem-dados").hidden = true;
    elo("origem-aviso").hidden = true;
    return;
  }
  const anterior = periodoAnterior(periodo);
  elo("origem-periodo-texto").textContent =
    `${fmtDiaMesAno(periodo.inicio)} a ${fmtDiaMesAno(somarDias(periodo.fim, -1))} · comparado a ${fmtDiaMesAno(anterior.inicio)} a ${fmtDiaMesAno(somarDias(anterior.fim, -1))}`;
  vazio.textContent = "Carregando...";
  vazio.hidden = false;
  elo("origem-dados").hidden = true;
  elo("origem-aviso").hidden = true;

  try {
    const [atual, ant] = await Promise.all([carregarPeriodo(periodo), carregarPeriodo(anterior)]);
    if (token !== origemEstado.token) return; // chegou uma escolha mais nova
    origemEstado.atual = atual;
    origemEstado.anterior = ant;
    origemEstado.periodo = periodo;
    if (!temDados(atual.totais)) {
      vazio.textContent = "Ainda sem acessos registrados neste período";
      return;
    }
    vazio.hidden = true;
    elo("origem-dados").hidden = false;
    elo("origem-aviso").hidden = atual.totais.visitas >= MIN_VISITAS_CONFIANCA;
    renderCards();
    renderTabela();
    renderRankings();
    renderGrafico();
  } catch (err) {
    if (token !== origemEstado.token) return;
    console.error(err);
    vazio.textContent = mensagemErroCarga(err);
  }
}

let resumoSemanaTexto = "";

async function atualizarResumoSemana() {
  const caixa = elo("origem-resumo");
  const periodo = resolverPeriodo("7");
  try {
    const dados = await carregarPeriodo(periodo);
    const frases = montarResumo(dados.linhas, dados.totais, textoPeriodo(periodo));
    resumoSemanaTexto = frases.join("\n");
    caixa.innerHTML = frases.map((f) => `<p>${escapeHtml(f)}</p>`).join("");
  } catch (err) {
    console.error(err);
    resumoSemanaTexto = "";
    caixa.innerHTML = `<p>${escapeHtml(mensagemErroCarga(err))}</p>`;
  }
}

function exportarOrigemCsv() {
  const msg = elo("origem-periodo-texto");
  if (!origemEstado.atual || !temDados(origemEstado.atual.totais)) {
    msg.textContent = "Nada para exportar neste período.";
    return;
  }
  const cab = ["origem", "visitas", "cliques_entrar_no_grupo", "candidaturas_seja_feirante", "cadastros_avise_me", "cliques_ver_no_mapa", "resultados", "conversao_percentual"];
  const linhas = linhasComComparacao().sort(compararLinhas).concat([origemEstado.atual.totais]);
  const corpo = linhas.map((l) => [
    l.origem, l.visitas, l.grupo, l.feirantes, l.avise, l.mapa, l.resultados,
    l.conversao == null ? "" : (l.conversao * 100).toFixed(1)
  ].map(csvEscape).join(","));
  const csv = [cab.join(","), ...corpo].join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const p = origemEstado.periodo;
  a.href = url;
  a.download = `origem-do-acesso_${chaveDia(p.inicio)}_a_${chaveDia(somarDias(p.fim, -1))}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* ----- Gerador de links ----- */

const ATALHOS_UTM = [
  { rotulo: "Bio do Instagram", fonte: "instagram", meio: "bio" },
  { rotulo: "Stories do Instagram", fonte: "instagram", meio: "stories" },
  { rotulo: "Posts do Facebook", fonte: "facebook", meio: "post" },
  { rotulo: "Grupos do Facebook", fonte: "facebook", meio: "grupo" },
  { rotulo: "Grupo de avisos do WhatsApp", fonte: "whatsapp", meio: "grupo" },
  { rotulo: "Meta Ads", fonte: "meta", meio: "ads" }
];

function renderAtalhosUtm() {
  const destino = elo("utm-destino").value, campanha = elo("utm-campanha").value;
  elo("utm-atalhos").innerHTML = ATALHOS_UTM.map((a, i) => {
    const link = montarLinkUtm(destino, a.fonte, a.meio, campanha);
    return `<div class="utm-linha"><div><strong>${escapeHtml(a.rotulo)}</strong><code>${link ? escapeHtml(link) : "Endereço de destino inválido"}</code></div>` +
      `<button type="button" class="btn btn-secondary" data-utm="${i}" style="padding:8px 16px;font-size:13px"${link ? "" : " disabled"}>Copiar link</button></div>`;
  }).join("");
  const personalizado = montarLinkUtm(destino, elo("utm-origem").value, elo("utm-meio").value, campanha);
  elo("utm-resultado").textContent = personalizado || "Preencha origem e meio (e um destino válido) para gerar o link.";
}

async function copiarComAviso(texto, msgEl) {
  try {
    await copiarTexto(texto);
    showFormMessage(msgEl, "Copiado!", true);
  } catch (e) {
    showFormMessage(msgEl, "Não foi possível copiar automaticamente — selecione o texto e copie manualmente.", false);
  }
}

function iniciarPaginaOrigem() {
  elo("tab-gestao").addEventListener("click", () => mostrarAba("gestao"));
  elo("tab-origem").addEventListener("click", () => mostrarAba("origem"));

  if (!supabaseEnabled()) {
    elo("origem-local-msg").hidden = false;
    elo("origem-conteudo").hidden = true;
    return;
  }

  const personalizado = () => {
    const custom = elo("origem-periodo").value === "custom";
    elo("origem-custom").hidden = !custom;
    elo("origem-custom").style.display = custom ? "flex" : "none";
  };
  elo("origem-periodo").addEventListener("change", () => { personalizado(); atualizarOrigem(); });
  elo("origem-de").addEventListener("change", atualizarOrigem);
  elo("origem-ate").addEventListener("change", atualizarOrigem);
  elo("origem-exportar").addEventListener("click", exportarOrigemCsv);

  document.querySelector("#origem-tabela thead").addEventListener("click", (e) => {
    const th = e.target.closest("th[data-sort]");
    if (!th || !origemEstado.atual) return;
    const chave = th.dataset.sort;
    if (origemEstado.ordem === chave) origemEstado.direcao = origemEstado.direcao === "asc" ? "desc" : "asc";
    else { origemEstado.ordem = chave; origemEstado.direcao = chave === "origem" ? "asc" : "desc"; }
    renderTabela();
  });

  elo("origem-copiar-resumo").addEventListener("click", () => {
    if (!resumoSemanaTexto) return showFormMessage(elo("origem-resumo-msg"), "Ainda não há resumo para copiar.", false);
    copiarComAviso(resumoSemanaTexto, elo("origem-resumo-msg"));
  });

  const destino = (typeof FEIRA_CONFIG !== "undefined" && FEIRA_CONFIG.siteUrl) ? FEIRA_CONFIG.siteUrl : location.origin;
  elo("utm-destino").value = destino.replace(/\/+$/, "") + "/";
  ["utm-destino", "utm-campanha", "utm-origem", "utm-meio"].forEach((id) => elo(id).addEventListener("input", renderAtalhosUtm));
  elo("utm-atalhos").addEventListener("click", (e) => {
    const botao = e.target.closest("[data-utm]");
    if (!botao) return;
    const a = ATALHOS_UTM[Number(botao.dataset.utm)];
    const link = montarLinkUtm(elo("utm-destino").value, a.fonte, a.meio, elo("utm-campanha").value);
    if (link) copiarComAviso(link, elo("utm-msg"));
  });
  elo("utm-copiar").addEventListener("click", () => {
    const link = montarLinkUtm(elo("utm-destino").value, elo("utm-origem").value, elo("utm-meio").value, elo("utm-campanha").value);
    if (!link) return showFormMessage(elo("utm-msg"), "Preencha origem e meio, com um endereço de destino válido.", false);
    copiarComAviso(link, elo("utm-msg"));
  });
  renderAtalhosUtm();
}

document.addEventListener("DOMContentLoaded", iniciarPaginaOrigem);
