import { cadeadoIcone } from './lock-icons.js';
/* MOSAICO · Planejamento: montar, revisar, guardar e pré-visualizar atividades.
   - Contas da lista de mestres: biblioteca fechada no Firestore.
   - Qualquer outra conta: edita e exporta planilha (modo aberto, nada guardado). */

import { backend, EM_ENSAIO } from './backend.js';
import { $, h, limpar, aviso, corDoGrupo, chipGrupo, iconeGrupo, VISUAL_GRUPOS } from './ui.js';
import { validarAtividade, temErros, SCHEMA_VERSION } from './core/validacao.js';
import { sugerirEquilibrio, avisoGramatica } from './core/equilibrio.js';
import { TIPOS, obterTipo } from './core/tipos.js';
import { etapasOrdenadas } from './core/motor.js';
import { gerarPrompt } from './core/prompt.js';
import { abrirImpressao } from './imprimir.js';
import { lerArquivoAtividade, baixarPlanilha } from './planilha-xlsx.js';
import { svgPeca, comprimirImagem, montarPecasEtapa } from './quebra-cabeca.js';
import { unidadesDoTexto, sugerirCortes, pecasRepetidas, embaralharSemOrdemCerta } from './core/montagem.js';
import { LETRAS, fragmentosDoTexto, prepararCadeado } from './core/desafios.js';

const b = await backend();
const RASCUNHO = 'mosaico-planejar-rascunho' + (EM_ENSAIO ? '-ensaio' : '');
const P = { conta: null, A: null, origem: null, secao: 'geral', sujo: false, dispensadas: new Set(), bib: null, bibErro: null, importacao: [] };
const NOMES_TIPO = { investigacao_fragmentos: 'Investigação por fragmentos', comparar_hipoteses: 'Comparação entre grupos', questao_individual: 'Questão individual', montagem_pecas: 'Montagem em peças', cadeado_grupo: 'Cadeado do grupo', quiz_grupos: 'Quiz entre grupos' };
const ROT_PART = { grupos: 'Em grupos', individual: 'Individual', representante: 'Representante envia', desligada: 'Desligada', meta: 'Contra a meta', entre_grupos: 'Entre grupos', representantes: 'Entre grupos (só representantes)', nenhum: 'Sem envio (vale o tempo)' };
const avisoGeral = (t, tipo = 'info') => { aviso($('avisoGeral'), t, tipo); };

// ============================================================ entrada
$('entrarGoogle').textContent = EM_ENSAIO ? 'Entrar (modo ensaio)' : 'Entrar com Google';
$('entrarGoogle').onclick = () => {
  const p = b.entrarGoogle(); $('entrarGoogle').disabled = true;
  p.then(iniciar).catch(e => { $('entrarGoogle').disabled = false; aviso($('avisoLogin'), e.code === 'auth/popup-closed-by-user' ? 'Login cancelado.' : 'Não foi possível entrar. Confira a internet.', 'erro'); });
};
(async () => { const c = await b.contaAtual(); if (c) iniciar(c); })();

async function iniciar(conta) {
  P.conta = conta; $('login').hidden = true; $('app').hidden = false; $('acoes').hidden = false;
  await carregarBiblioteca();
  try { const r = JSON.parse(localStorage.getItem(RASCUNHO) || 'null'); if (r?.A) { P.A = r.A; P.origem = r.origem; P.sujo = !!r.sujo; avisoGeral('Rascunho retomado de onde você parou.'); } } catch {}
  render();
}

async function carregarBiblioteca() {
  try { P.bib = await b.listarBiblioteca(); P.bibErro = null; }
  catch (e) { P.bib = null; P.bibErro = e?.code === 'permission-denied' || /permission/i.test(e?.message || '') ? 'fora' : 'falha'; }
}
const temBiblioteca = () => Array.isArray(P.bib);

// ============================================================ estado
function salvarRascunho() { try { localStorage.setItem(RASCUNHO, JSON.stringify({ A: P.A, origem: P.origem, sujo: P.sujo })); } catch {} }
let tempo = null;
/** Mudança de texto: guarda sem redesenhar (não perde o foco); atualiza navegação/revisão logo depois. */
function tocar() { P.sujo = true; salvarRascunho(); clearTimeout(tempo); tempo = setTimeout(() => { renderNav(); renderAcoes(); atualizarRevEtapa(); }, 350); }
/** Mudança de estrutura: guarda e redesenha. */
function mudar(fn) { fn(P.A); P.sujo = true; salvarRascunho(); render(); }

const slug = t => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'atividade';
function novoId(prefixo, usados) { let i = 1; while (usados.has(`${prefixo}${i}`)) i++; return `${prefixo}${i}`; }
const idsDe = lista => new Set(lista.map(x => x.id));
const etapa = id => P.A.etapas.find(e => e.id === id);

// ============================================================ modelos
function modelo(titulo, nGrupos, completo) {
  const grupos = Array.from({ length: nGrupos }, (_, i) => ({ id: 'g' + (i + 1), nome: 'Grupo ' + VISUAL_GRUPOS[i].nome, ordemAlocacao: i + 1 }));
  const a = {
    schemaVersion: SCHEMA_VERSION, id: slug(titulo), titulo, publico: '', duracaoMin: 50, regime: 'simulacao',
    perguntaCentral: '', objetivos: [], introducao: '', fontes: [], grupos, etapas: [], pecas: [], conexoes: [],
    meta: { ativa: false, descricao: '', etapas: [], limiar: 0.5 }, docente: { respostas: {}, guia: [], pontosDeDiscussao: [] }, pendencias: []
  };
  if (!completo) return a;
  const hip = [1, 2, 3].map(i => ({ id: 'h' + i, texto: '' }));
  a.etapas = [
    { id: 'e1', ordem: 1, titulo: 'Investigação por fragmentos', typeId: 'investigacao_fragmentos', typeVersion: '1.0.0', tempoMin: 15, instrucao: 'Leiam as peças do seu grupo e escolham a hipótese que elas sustentam. Vocês ainda não têm o quadro completo.', participacao: { organizacao: 'grupos', envio: 'representante', competicao: 'meta' }, config: { pergunta: '', hipotesesCandidatas: hip, minEvidencias: 1, justificativa: 'opcional' } },
    { id: 'e2', ordem: 2, titulo: 'Juntando o mosaico', typeId: 'comparar_hipoteses', typeVersion: '1.0.0', tempoMin: 15, instrucao: 'Vejam o que cada grupo concluiu e decidam qual explicação integra todas as peças.', participacao: { organizacao: 'grupos', envio: 'representante', competicao: 'meta' }, config: { pergunta: '', hipotesesCandidatas: hip.map(x => ({ ...x })), aceitaParcial: false, justificativa: 'obrigatoria' } },
    { id: 'e3', ordem: 3, titulo: 'Transferência', typeId: 'questao_individual', typeVersion: '1.0.0', tempoMin: 4, instrucao: 'Responda sozinho. Esta resposta conta para a meta da turma.', participacao: { organizacao: 'individual', envio: 'individual', competicao: 'meta' }, config: { enunciado: '', alternativas: ['a', 'b', 'c', 'd'].map(id => ({ id, texto: '' })) } }
  ];
  a.conexoes = [{ id: 'c_e1_e2', de: { etapaId: 'e1', portId: 'hipotese_grupo' }, para: { etapaId: 'e2', portId: 'hipoteses_recebidas' }, agregacao: 'colecao_uma_por_grupo_planejado' }];
  a.pecas = grupos.map((g, i) => ({ id: 'p' + (i + 1), etapaId: 'e1', destinatarios: [g.id], origem: { natureza: 'sintetico' }, conteudo: '' }));
  a.meta = { ativa: true, descricao: 'A turma vence se acertar pelo menos metade das respostas individuais.', etapas: ['e3'], limiar: 0.5 };
  return a;
}

function abrir(atividade, origem) {
  P.A = JSON.parse(JSON.stringify(atividade)); P.origem = origem || null; P.sujo = false; P.secao = 'geral'; P.dispensadas = new Set(); P.importacao = [];
  salvarRascunho(); render(); window.scrollTo({ top: 0 });
}
function fechar() { P.A = null; P.origem = null; P.sujo = false; try { localStorage.removeItem(RASCUNHO); } catch {} render(); }

// ============================================================ renderização geral
function render() {
  renderAcoes();
  $('statusTopo').textContent = P.A ? (P.A.titulo || '(sem título)') + (P.sujo ? ' · não salvo' : '') : (EM_ENSAIO ? 'ENSAIO' : (P.conta?.email || ''));
  if (!P.A) return limpar($('app'), telaInicio());
  limpar($('app'), h('div', { class: 'plan-grade' }, h('nav', { class: 'plan-nav', id: 'nav', 'aria-label': 'Partes da atividade' }), h('section', { class: 'plan-editor', id: 'editor' })));
  renderNav(); renderEditor();
}

function renderAcoes() {
  const alvo = $('acoes');
  if (!P.A) return limpar(alvo);
  const diags = validarAtividade(P.A);
  limpar(alvo,
    temBiblioteca() && h('button', { class: 'btn primario', onclick: dialogoSalvar }, P.sujo ? 'Salvar na biblioteca' : 'Salvo ✓'),
    h('button', { class: 'btn', disabled: temErros(diags), title: temErros(diags) ? 'Corrija os erros (veja Revisão)' : 'Abrir telão, condução e turma simulados', onclick: previa }, 'Ver como fica'),
    h('button', { class: 'btn', onclick: () => baixarPlanilha(P.A).catch(e => avisoGeral(e.message, 'erro')) }, 'Planilha'),
    h('button', { class: 'btn', onclick: () => baixarJSON(P.A) }, 'JSON'),
    h('button', { class: 'btn', onclick: () => abrirImpressao(P.A) }, 'Imprimir'),
    h('button', { class: 'btn discreto', onclick: () => { if (!P.sujo || confirmar('Fechar sem salvar? O rascunho será descartado.')) fechar(); } }, 'Fechar'));
  $('statusTopo').textContent = (P.A.titulo || '(sem título)') + (P.sujo ? ' · não salvo' : '');
}
const confirmar = t => window.confirm(t);

function renderNav() {
  const nav = document.getElementById('nav'); if (!nav || !P.A) return;
  const diags = validarAtividade(P.A), nErros = diags.filter(d => d.severidade === 'erro').length;
  const item = (secao, conteudo, extra = {}) => h('button', { 'aria-current': String(P.secao === secao), onclick: () => { P.secao = secao; renderNav(); renderEditor(); window.scrollTo({ top: 0 }); }, ...extra }, conteudo);
  limpar(nav,
    item('geral', h('span', { class: 'rot' }, 'Geral e meta')),
    item('grupos', [h('span', { class: 'rot' }, 'Grupos'), h('span', { class: 'selo ok' }, P.A.grupos.length)]),
    h('div', { class: 'divisor' }, 'Etapas'),
    etapasOrdenadas(P.A).map((e, i) => item('etapa:' + e.id, [h('span', { class: 'num' }, i + 1), h('span', { class: 'rot' }, e.titulo || '(sem título)')], { class: 'sub', title: NOMES_TIPO[e.typeId] || e.typeId })),
    item('nova-etapa', h('span', { class: 'rot' }, '＋ Nova etapa'), { class: 'sub' }),
    h('div', { class: 'divisor' }, 'Mais'),
    item('fontes', [h('span', { class: 'rot' }, 'Fontes'), h('span', { class: 'selo ok' }, P.A.fontes.length)]),
    item('revisao', [h('span', { class: 'rot' }, 'Revisão'), h('span', { class: 'selo ' + (nErros ? 'erro' : 'ok') }, nErros ? nErros + ' erro(s)' : 'ok')]));
}

function renderEditor() {
  const alvo = document.getElementById('editor'); if (!alvo) return;
  const s = P.secao;
  if (s === 'geral') return limpar(alvo, editorGeral());
  if (s === 'grupos') return limpar(alvo, editorGrupos());
  if (s === 'fontes') return limpar(alvo, editorFontes());
  if (s === 'revisao') return limpar(alvo, editorRevisao());
  if (s === 'nova-etapa') return limpar(alvo, editorNovaEtapa());
  if (s.startsWith('etapa:')) { const e = etapa(s.slice(6)); if (e) return limpar(alvo, editorEtapa(e)); }
  P.secao = 'geral'; renderEditor();
}

// ============================================================ campos (sem redesenhar a cada tecla)
function campo(rotulo, valor, aoMudar, { tipo = 'text', area = false, linhas = 3, id, ajuda, max } = {}) {
  const idc = id || 'c' + Math.random().toString(36).slice(2, 8);
  const el = area ? h('textarea', { id: idc, rows: linhas, maxlength: max }, valor ?? '') : h('input', { id: idc, type: tipo, value: valor ?? '', maxlength: max });
  el.addEventListener('input', () => { aoMudar(tipo === 'number' ? (el.value === '' ? undefined : Number(el.value)) : el.value); tocar(); });
  return h('div', {}, h('label', { for: idc }, rotulo), el, ajuda && h('small', {}, ajuda));
}
function seletor(rotulo, valor, opcoes, aoMudar, { redesenhar = false } = {}) {
  const idc = 's' + Math.random().toString(36).slice(2, 8);
  const el = h('select', { id: idc }, opcoes.map(([v, t]) => h('option', { value: v, selected: String(v) === String(valor) }, t)));
  el.addEventListener('change', () => { if (redesenhar) mudar(() => aoMudar(el.value)); else { aoMudar(el.value); tocar(); } });
  return h('div', {}, h('label', { for: idc }, rotulo), el);
}
const listaTexto = v => String(v || '').split('\n').map(x => x.trim()).filter(Boolean);

// ============================================================ início
function telaInicio() {
  const titulo = h('input', { id: 'novoTitulo', placeholder: 'Ex.: A ciclista que voltou da altitude' });
  const nGr = h('select', { id: 'novoGrupos' }, Array.from({ length: 9 }, (_, i) => i + 2).map(n => h('option', { value: n, selected: n === 5 }, `${n} grupos`)));
  const tipoModelo = h('select', { id: 'novoModelo' }, h('option', { value: 'mosaico' }, 'Modelo MOSAICO: investigação → comparação → questão'), h('option', { value: 'branco' }, 'Em branco (sem etapas)'));
  const arquivo = h('input', { type: 'file', id: 'arqImport', accept: '.xlsx,.json,application/json' });
  arquivo.onchange = async () => {
    const f = arquivo.files[0]; if (!f) return;
    try {
      const r = await lerArquivoAtividade(f);
      if (!r.atividade) { P.importacao = r.diagnosticos; return render(); }
      abrir(r.atividade, null);
      if (r.diagnosticos.length) avisoGeral(r.diagnosticos.map(d => d.mensagem).join(' '), 'alerta');
      else avisoGeral(`“${r.atividade.titulo}” importada. Confira a Revisão.`, 'ok');
    } catch (e) { avisoGeral('Não foi possível ler o arquivo: ' + e.message, 'erro'); }
  };
  return h('div', {},
    h('h1', { style: { marginTop: '20px' } }, 'Minhas atividades'),
    !temBiblioteca() && h('p', { class: 'aviso', 'data-tipo': P.bibErro === 'fora' ? 'alerta' : 'erro' }, P.bibErro === 'fora'
      ? 'Sua conta não está na lista de mestres: a biblioteca fechada não fica disponível. Você pode montar e exportar a planilha normalmente (modo aberto, nada é guardado).'
      : 'Não foi possível abrir a biblioteca agora. Confira a internet; você ainda pode montar e exportar a planilha.'),
    h('div', { class: 'plan-inicio' },
      h('div', { class: 'cartao' }, h('h2', {}, 'Nova atividade'),
        h('label', { for: 'novoTitulo' }, 'Título'), titulo,
        h('div', { class: 'campos-2' }, h('div', {}, h('label', { for: 'novoGrupos' }, 'Grupos'), nGr), h('div', {}, h('label', { for: 'novoModelo' }, 'Começar com'), tipoModelo)),
        h('div', { class: 'linha-botoes' }, h('button', { class: 'btn primario bloco', onclick: () => abrir(modelo(titulo.value.trim() || 'Nova atividade', Number(nGr.value), tipoModelo.value === 'mosaico'), null) }, 'Criar'))),
      temBiblioteca() && h('div', { class: 'cartao' }, h('h2', {}, 'Biblioteca'),
        P.bib.length ? h('ul', { class: 'lista-bib' }, P.bib.map(item => h('li', {},
          h('div', { class: 'tit' }, h('strong', {}, item.titulo || '(sem título)'), h('small', {}, (item.atualizadoEm ? new Date(item.atualizadoEm).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '') + (item.minha ? '' : ' · de ' + (item.autor || 'outro mestre')))),
          item.compartilhada && h('span', { class: 'etiqueta' }, 'compartilhada'),
          h('div', { class: 'mini' },
            h('button', { class: 'btn pequeno', onclick: () => abrirDaBiblioteca(item, false) }, 'Abrir'),
            h('button', { class: 'btn pequeno discreto', title: 'Duplicar', onclick: () => abrirDaBiblioteca(item, true) }, '⧉'),
            item.minha && h('button', { class: 'btn pequeno discreto', title: 'Apagar', 'aria-label': 'Apagar ' + item.titulo, onclick: () => apagarDaBiblioteca(item) }, '🗑'))))) : h('p', { class: 'sutil' }, 'Nada guardado ainda. Crie ou importe uma atividade e use “Salvar na biblioteca”.')),
      h('div', { class: 'cartao' }, h('h2', {}, 'Importar'),
        h('p', { class: 'sutil' }, 'Planilha (.xlsx) do MOSAICO ou arquivo .json (por exemplo, o devolvido pela IA).'),
        h('label', { for: 'arqImport' }, 'Arquivo'), arquivo,
        P.importacao.length && h('ul', { class: 'diag' }, P.importacao.map(d => h('li', { class: d.severidade }, d.mensagem))),
        h('div', { class: 'linha-botoes' },
          h('button', { class: 'btn', onclick: async () => { try { abrir(await (await fetch('casos/ciclista-altitude.json', { cache: 'no-cache' })).json(), null); P.A.id = P.A.id + '-copia'; } catch (e) { avisoGeral(e.message, 'erro'); } } }, 'Abrir o caso piloto'),
          h('button', { class: 'btn discreto', onclick: () => baixarPlanilha(modelo('Modelo', 5, true)).catch(e => avisoGeral(e.message, 'erro')) }, 'Baixar planilha-modelo'))),
      h('div', { class: 'cartao' }, h('h2', {}, 'Montar com IA'), cartaoPrompt())));
}

function cartaoPrompt() {
  const cfg = { publico: '', duracaoMin: 50, numeroGrupos: 5, regime: 'fiel', preferencias: '' };
  const saida = h('textarea', { readonly: true, hidden: true, rows: 6 });
  return h('div', {},
    h('p', { class: 'sutil' }, 'Gere o prompt, cole na IA de sua preferência com o seu material e importe o JSON que ela devolver.'),
    h('div', { class: 'campos-2' },
      h('div', {}, h('label', { for: 'iaPub' }, 'Público'), h('input', { id: 'iaPub', oninput: e => cfg.publico = e.target.value })),
      h('div', {}, h('label', { for: 'iaGr' }, 'Grupos'), h('input', { id: 'iaGr', type: 'number', min: 1, max: 10, value: 5, oninput: e => cfg.numeroGrupos = Math.min(10, Math.max(1, Number(e.target.value) || 5)) }))),
    h('label', { for: 'iaPref' }, 'Preferências por etapa (opcional)'), h('textarea', { id: 'iaPref', rows: 2, oninput: e => cfg.preferencias = e.target.value }),
    h('div', { class: 'linha-botoes' },
      h('button', { class: 'btn', onclick: async () => { let ex = null; try { ex = await (await fetch('casos/ciclista-altitude.json')).json(); } catch {} saida.value = gerarPrompt({ ...cfg, organizacao: 'grupos', exemplo: ex }); saida.hidden = false; } }, 'Gerar prompt'),
      h('button', { class: 'btn discreto', onclick: async () => { try { await navigator.clipboard.writeText(saida.value); avisoGeral('Prompt copiado.', 'ok'); } catch { saida.select(); } } }, 'Copiar')),
    saida);
}

// ============================================================ biblioteca
async function abrirDaBiblioteca(item, duplicar) {
  try {
    const doc = item.conteudo ? item : await b.lerBiblioteca(item.id);
    const a = JSON.parse(doc.conteudo);
    if (duplicar || !item.minha) { a.titulo = a.titulo + ' (cópia)'; a.id = slug(a.titulo); abrir(a, null); avisoGeral(item.minha ? 'Cópia criada. Salve para guardar.' : 'Esta atividade é de outro mestre: você está editando uma cópia sua.', 'info'); }
    else abrir(a, { bibId: item.id, compartilhada: !!item.compartilhada });
  } catch (e) { avisoGeral('Não foi possível abrir: ' + e.message, 'erro'); }
}
async function apagarDaBiblioteca(item) {
  if (!confirmar(`Apagar “${item.titulo}” da biblioteca? Isso não pode ser desfeito.`)) return;
  try { await b.apagarBiblioteca(item.id); await carregarBiblioteca(); render(); avisoGeral('Apagada.', 'ok'); } catch (e) { avisoGeral('Não foi possível apagar: ' + e.message, 'erro'); }
}
function dialogoSalvar() {
  let comp = !!P.origem?.compartilhada;
  const d = h('dialog', { class: 'explica' },
    h('h2', {}, 'Salvar na biblioteca'),
    h('p', { class: 'sutil' }, 'A biblioteca é fechada: só contas da lista de mestres entram. Ela guarda a atividade (incluindo o gabarito), nunca dados de participantes.'),
    h('label', { class: 'opcao', style: { marginTop: '8px' } }, h('input', { type: 'checkbox', checked: comp, onchange: e => { comp = e.target.checked; } }), h('span', {}, 'Compartilhar com os outros mestres (eles podem ver e duplicar; só você edita)')),
    h('div', { class: 'linha-botoes' },
      h('button', { class: 'btn primario', onclick: async () => {
        try {
          if (JSON.stringify(P.A).length > 880000) throw new Error('A atividade ficou pesada demais para a biblioteca (imagens). Use imagens menores ou exporte a planilha.');
          const id = await b.salvarBiblioteca(P.origem?.bibId || null, { titulo: P.A.titulo || '(sem título)', conteudo: JSON.stringify(P.A), compartilhada: comp, autor: P.conta?.email || '' });
          P.origem = { bibId: id, compartilhada: comp }; P.sujo = false; salvarRascunho(); await carregarBiblioteca();
          d.close(); d.remove(); render(); avisoGeral('Salvo na biblioteca.', 'ok');
        } catch (e) { avisoGeral(/permission/i.test(e?.code || e?.message || '') ? 'O servidor recusou: confira se as regras do Firestore foram publicadas.' : 'Não foi possível salvar: ' + e.message, 'erro'); d.close(); d.remove(); }
      } }, 'Salvar'),
      h('button', { class: 'btn', onclick: () => { d.close(); d.remove(); } }, 'Cancelar')));
  document.body.append(d); d.showModal();
}
function baixarJSON(a) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(a, null, 2)], { type: 'application/json' }));
  const l = h('a', { href: url, download: (a.id || 'atividade') + '.json' }); document.body.append(l); l.click(); l.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30e3);
}

// ============================================================ pré-visualização
function previa() {
  try { localStorage.setItem('mosaico-previa', JSON.stringify(P.A)); } catch { return avisoGeral('O navegador não permitiu guardar a prévia.', 'erro'); }
  const url = new URL('previa.html', location.href); url.search = '?ensaio=1';
  window.open(url.href, '_blank');
}

// ============================================================ Geral e meta
function editorGeral() {
  const a = P.A, m = a.meta || (a.meta = { ativa: false, descricao: '', etapas: [], limiar: 0.5 });
  const comGabarito = etapasOrdenadas(a).filter(e => obterTipo(e.typeId, e.typeVersion)?.assessmentPolicy === 'gabarito_docente');
  return h('div', {},
    h('div', { class: 'cartao' }, h('h2', {}, 'Dados gerais'),
      campo('Título', a.titulo, v => { a.titulo = v; }, { max: 120 }),
      h('div', { class: 'campos-3' },
        campo('Público', a.publico, v => { a.publico = v; }),
        campo('Duração (min)', a.duracaoMin, v => { a.duracaoMin = v; }, { tipo: 'number' }),
        seletor('Regime', a.regime, [['fiel', 'Fiel ao material'], ['simulacao', 'Simulação (dados sintéticos)']], v => { a.regime = v; }, { redesenhar: true })),
      campo('Pergunta central', a.perguntaCentral, v => { a.perguntaCentral = v; }, { area: true, linhas: 2 }),
      campo('Introdução (lida no telão; não revela a solução)', a.introducao, v => { a.introducao = v; }, { area: true, linhas: 4 }),
      campo('Objetivos (um por linha)', (a.objetivos || []).join('\n'), v => { a.objetivos = listaTexto(v); }, { area: true, linhas: 3 })),
    h('div', { class: 'cartao' }, h('h2', {}, 'Meta da turma'),
      h('label', { class: 'opcao' }, h('input', { type: 'checkbox', checked: m.ativa !== false, onchange: e => mudar(() => { m.ativa = e.target.checked; }) }), h('span', {}, 'A turma compete para superar uma meta coletiva')),
      m.ativa !== false && h('div', {},
        h('div', { class: 'campos-2' },
          seletor('Meta de acertos', m.limiar, [0.4, 0.5, 0.6, 0.8].map(v => [v, Math.round(v * 100) + '%']), v => { m.limiar = Number(v); }),
          campo('Descrição', m.descricao, v => { m.descricao = v; })),
        h('label', {}, 'Etapas que contam para a meta'),
        comGabarito.length ? h('div', { class: 'opcoes' }, comGabarito.map(e => h('label', { class: 'opcao' },
          h('input', { type: 'checkbox', checked: (m.etapas || []).includes(e.id), onchange: ev => { m.etapas = ev.target.checked ? [...new Set([...(m.etapas || []), e.id])] : (m.etapas || []).filter(x => x !== e.id); tocar(); } }),
          h('span', {}, e.titulo || e.id)))) : h('p', { class: 'sutil' }, 'Nenhuma etapa com resposta esperada ainda (comparação entre grupos ou questão individual).'))),
    h('div', { class: 'cartao' }, h('h2', {}, 'Material de quem conduz'),
      h('p', { class: 'sutil' }, 'Não aparece para os participantes.'),
      campo('Guia de condução (um passo por linha)', (a.docente?.guia || []).join('\n'), v => { a.docente.guia = listaTexto(v); }, { area: true, linhas: 4 }),
      campo('Pontos de discussão (um por linha)', (a.docente?.pontosDeDiscussao || []).join('\n'), v => { a.docente.pontosDeDiscussao = listaTexto(v); }, { area: true, linhas: 3 }),
      campo('Pendências (um item por linha)', (a.pendencias || []).join('\n'), v => { a.pendencias = listaTexto(v); }, { area: true, linhas: 2 })));
}

// ============================================================ Grupos
function editorGrupos() {
  const a = P.A, gs = [...a.grupos].sort((x, y) => x.ordemAlocacao - y.ordemAlocacao);
  const trocar = (i, j) => mudar(() => { const x = gs[i].ordemAlocacao; gs[i].ordemAlocacao = gs[j].ordemAlocacao; gs[j].ordemAlocacao = x; });
  return h('div', { class: 'cartao' }, h('h2', {}, `Grupos (${gs.length} de no máximo 10)`),
    h('p', { class: 'sutil' }, 'A ordem define o ícone de cada grupo e quem recebe os participantes excedentes no sorteio. A presença na sala nunca cria nem remove grupos.'),
    gs.map((g, i) => h('div', {},
      h('div', { class: 'linha-item' },
        iconeGrupo(a, g.id, 40),
        h('input', { value: g.nome, maxlength: 40, 'aria-label': 'Nome do grupo ' + (i + 1), oninput: e => { g.nome = e.target.value; tocar(); } }),
        h('div', { class: 'mini' },
          h('button', { class: 'btn', disabled: i === 0, 'aria-label': 'Subir', onclick: () => trocar(i, i - 1) }, '↑'),
          h('button', { class: 'btn', disabled: i === gs.length - 1, 'aria-label': 'Descer', onclick: () => trocar(i, i + 1) }, '↓'),
          h('button', { class: 'btn perigo', disabled: gs.length <= 1, 'aria-label': 'Remover ' + g.nome, onclick: () => removerGrupo(g) }, '✕'))),
      h('input', { value: g.funcao || '', placeholder: 'Função do grupo (opcional): o que este grupo investiga', 'aria-label': 'Função do grupo ' + (i + 1), oninput: e => { g.funcao = e.target.value; tocar(); }, style: { marginLeft: '50px', width: 'calc(100% - 50px)' } }))),
    h('div', { class: 'linha-botoes' }, h('button', { class: 'btn', disabled: gs.length >= 10, onclick: () => mudar(x => {
      const id = novoId('g', idsDe(x.grupos)), ordem = Math.max(0, ...x.grupos.map(g => g.ordemAlocacao)) + 1;
      x.grupos.push({ id, nome: 'Grupo ' + VISUAL_GRUPOS[(ordem - 1) % 10].nome, ordemAlocacao: ordem });
    }) }, '＋ Adicionar grupo')));
}
function removerGrupo(g) {
  const usadas = P.A.pecas.filter(p => p.destinatarios.includes(g.id)).length;
  if (!confirmar(`Remover “${g.nome}”?` + (usadas ? ` Ele recebe ${usadas} peça(s); elas deixam de ir para esse grupo.` : ''))) return;
  mudar(a => {
    a.grupos = a.grupos.filter(x => x.id !== g.id);
    a.grupos.sort((x, y) => x.ordemAlocacao - y.ordemAlocacao).forEach((x, i) => { x.ordemAlocacao = i + 1; });
    a.pecas.forEach(p => { p.destinatarios = p.destinatarios.filter(d => d !== g.id); });
  });
}

// ============================================================ Nova etapa (cardápio)
function editorNovaEtapa() {
  return h('div', { class: 'cartao' }, h('h2', {}, 'Nova etapa: escolha o tipo'),
    h('p', { class: 'sutil' }, 'A decisão é sua. A Revisão sugere equilíbrio (por exemplo, quando há muitas etapas iguais seguidas).'),
    h('div', { class: 'tipo-cartoes' }, Object.values(TIPOS).map(t => h('button', { class: 'tipo-cartao', onclick: () => adicionarEtapa(t.typeId) }, h('strong', {}, t.nome), h('small', {}, t.descricao)))),
    h('p', { class: 'sutil', style: { marginTop: '12px' } }, 'Próximo tipo previsto: deliberação em grupo.'));
}
function configInicial(typeId, base) {
  if (typeId === 'cadeado_grupo') return { regra: 'fragmentos', perguntas: [perguntaVazia('p1')], distribuicao: 'diferente', minAcertos: 0, fragmentos: [], espera: 30, mensagem: '' };
  if (typeId === 'quiz_grupos') return { perguntas: [perguntaVazia('p1')], aoErrar: 'repassar', segundos: 60, mostrarNoTelao: false, mostrarResposta: true };
  if (typeId === 'montagem_pecas') return { modo: 'texto', texto: '', quantidade: 'fixa', ocultarAoFim: true, revelarAoEncerrar: false, corte: { tipo: 'colunas', n: 4 } };
  const hip = base?.config?.hipotesesCandidatas || base?.config?.alternativas;
  if (typeId === 'investigacao_fragmentos') return { pergunta: base?.config?.pergunta || '', hipotesesCandidatas: (hip || [1, 2, 3].map(i => ({ id: 'h' + i, texto: '' }))).map(x => ({ ...x })), minEvidencias: 1, justificativa: 'opcional' };
  if (typeId === 'comparar_hipoteses') return { pergunta: base?.config?.pergunta || '', hipotesesCandidatas: (hip || [1, 2, 3].map(i => ({ id: 'h' + i, texto: '' }))).map(x => ({ ...x })), aceitaParcial: false, justificativa: 'obrigatoria' };
  return { enunciado: base?.config?.enunciado || '', alternativas: (hip && hip.length <= 5 ? hip : ['a', 'b', 'c', 'd'].map(id => ({ id, texto: '' }))).map(x => ({ ...x })) };
}
function participacaoPadrao(typeId) {
  const t = TIPOS[typeId];
  return { organizacao: t.participacao.organizacao[0], envio: t.participacao.envio[0], competicao: typeId === 'quiz_grupos' ? 'entre_grupos' : t.participacao.competicao.includes('meta') ? 'meta' : t.participacao.competicao[0] };
}
function adicionarEtapa(typeId) {
  let novo;
  mudar(a => {
    const id = novoId('e', idsDe(a.etapas)), ordem = Math.max(0, ...a.etapas.map(e => e.ordem)) + 1;
    const anterior = etapasOrdenadas(a).at(-1);
    novo = { id, ordem, titulo: NOMES_TIPO[typeId], typeId, typeVersion: TIPOS[typeId].typeVersion, tempoMin: typeId === 'questao_individual' ? 4 : 15, instrucao: '', participacao: participacaoPadrao(typeId), config: configInicial(typeId, anterior) };
    a.etapas.push(novo);
    if (typeId === 'comparar_hipoteses') {
      const fonte = etapasOrdenadas(a).filter(e => e.typeId === 'investigacao_fragmentos' && e.ordem < ordem).at(-1);
      if (fonte) a.conexoes.push({ id: `c_${fonte.id}_${id}`, de: { etapaId: fonte.id, portId: 'hipotese_grupo' }, para: { etapaId: id, portId: 'hipoteses_recebidas' }, agregacao: 'colecao_uma_por_grupo_planejado' });
    }
    if (typeId === 'investigacao_fragmentos') a.grupos.forEach(g => a.pecas.push({ id: novoId('p', idsDe(a.pecas)), etapaId: id, destinatarios: [g.id], origem: { natureza: 'sintetico' }, conteudo: '' }));
    P.secao = 'etapa:' + id;
  });
}

// ============================================================ Etapa
function editorEtapa(e) {
  const a = P.A, t = obterTipo(e.typeId, e.typeVersion) || TIPOS[e.typeId];
  const seq = etapasOrdenadas(a), pos = seq.findIndex(x => x.id === e.id);
  const idx = a.etapas.indexOf(e);
  const diagsEtapa = diagsDaEtapa(e);
  const mover = delta => mudar(() => { const outra = seq[pos + delta]; const o = e.ordem; e.ordem = outra.ordem; outra.ordem = o; });

  return h('div', {},
    h('div', { class: 'cartao' },
      h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap', alignItems: 'center' } },
        h('h2', { style: { margin: 0 } }, `Etapa ${pos + 1}`),
        h('div', { class: 'mini' },
          h('button', { class: 'btn', disabled: pos === 0, 'aria-label': 'Mover para antes', onclick: () => mover(-1) }, '↑'),
          h('button', { class: 'btn', disabled: pos === seq.length - 1, 'aria-label': 'Mover para depois', onclick: () => mover(1) }, '↓'),
          h('button', { class: 'btn', title: 'Duplicar etapa', onclick: () => duplicarEtapa(e) }, '⧉'),
          h('button', { class: 'btn perigo', 'aria-label': 'Remover etapa', onclick: () => removerEtapa(e) }, '✕'))),
      campo('Título', e.titulo, v => { e.titulo = v; }, { max: 120 }),
      h('div', { class: 'campos-3' },
        seletor('Tipo', e.typeId, Object.values(TIPOS).map(x => [x.typeId, x.nome]), v => trocarTipo(e, v), { redesenhar: true }),
        campo('Tempo (min)', e.tempoMin, v => { e.tempoMin = v > 0 ? v : undefined; }, { tipo: 'number' }),
        seletor('Competição', e.participacao.competicao, t.participacao.competicao.map(c => [c, ROT_PART[c] || c]), v => { e.participacao.competicao = v; })),
      h('div', { class: 'campos-2' },
        seletor('Organização', e.participacao.organizacao, t.participacao.organizacao.map(c => [c, ROT_PART[c] || c]), v => { e.participacao.organizacao = v; if (v === 'individual') e.participacao.envio = 'individual'; else if (e.participacao.envio === 'individual' && t.participacao.envio.includes('representante')) e.participacao.envio = 'representante'; }, { redesenhar: true }),
        seletor('Quem envia', e.participacao.envio, t.participacao.envio.map(c => [c, ROT_PART[c] || c]), v => { e.participacao.envio = v; })),
      campo('Instrução para os participantes', e.instrucao, v => { e.instrucao = v; }, { area: true, linhas: 2 })),
    e.typeId === 'investigacao_fragmentos' && blocoInvestigacao(e),
    e.typeId === 'comparar_hipoteses' && blocoComparacao(e),
    e.typeId === 'questao_individual' && blocoQuestao(e),
    e.typeId === 'montagem_pecas' && blocoMontagem(e),
    e.typeId === 'cadeado_grupo' && blocoCadeado(e),
    e.typeId === 'quiz_grupos' && blocoQuiz(e),
    h('div', { id: 'revEtapa' }, revEtapa(diagsEtapa)));
}
const revEtapa = ds => ds.length ? h('div', { class: 'cartao' }, h('h3', {}, 'Revisão desta etapa'), h('ul', { class: 'diag' }, ds.map(d => h('li', { class: d.severidade }, d.mensagem)))) : h('p', { class: 'aviso', 'data-tipo': 'ok' }, 'Esta etapa não tem pendências.');
function diagsDaEtapa(e) {
  const a = P.A, idx = a.etapas.indexOf(e);
  return validarAtividade(a).filter(d => d.local.startsWith(`etapas[${idx}]`) || (d.local.startsWith('pecas[') && a.pecas[Number(d.local.match(/pecas\[(\d+)\]/)?.[1])]?.etapaId === e.id) || d.local === `docente.respostas.${e.id}` || d.local.startsWith(`docente.respostas.${e.id}.`));
}
function atualizarRevEtapa() {
  const alvo = document.getElementById('revEtapa'); if (!alvo || !P.secao.startsWith('etapa:')) return;
  const e = etapa(P.secao.slice(6)); if (e) limpar(alvo, revEtapa(diagsDaEtapa(e)));
}

function trocarTipo(e, novo) {
  const a = P.A;
  e.typeId = novo; e.typeVersion = TIPOS[novo].typeVersion;
  e.config = configInicial(novo, e);
  e.participacao = participacaoPadrao(novo);
  delete a.docente.respostas[e.id];
  a.conexoes = a.conexoes.filter(c => c.de.etapaId !== e.id && c.para.etapaId !== e.id);
  if (novo !== 'investigacao_fragmentos') a.pecas = a.pecas.filter(p => p.etapaId !== e.id);
  if (novo === 'investigacao_fragmentos' && !a.pecas.some(p => p.etapaId === e.id)) a.grupos.forEach(g => a.pecas.push({ id: novoId('p', idsDe(a.pecas)), etapaId: e.id, destinatarios: [g.id], origem: { natureza: 'sintetico' }, conteudo: '' }));
  if (novo === 'comparar_hipoteses') {
    const fonte = etapasOrdenadas(a).filter(x => x.typeId === 'investigacao_fragmentos' && x.ordem < e.ordem).at(-1);
    if (fonte) a.conexoes.push({ id: `c_${fonte.id}_${e.id}`, de: { etapaId: fonte.id, portId: 'hipotese_grupo' }, para: { etapaId: e.id, portId: 'hipoteses_recebidas' }, agregacao: 'colecao_uma_por_grupo_planejado' });
  }
  if (a.meta?.etapas) a.meta.etapas = a.meta.etapas.filter(id => id !== e.id || TIPOS[novo].assessmentPolicy === 'gabarito_docente');
}
function removerEtapa(e) {
  const n = P.A.pecas.filter(p => p.etapaId === e.id).length;
  if (!confirmar(`Remover a etapa “${e.titulo}”?` + (n ? ` As ${n} peça(s) dela também serão removidas.` : ''))) return;
  mudar(a => {
    a.etapas = a.etapas.filter(x => x.id !== e.id);
    a.pecas = a.pecas.filter(p => p.etapaId !== e.id);
    a.conexoes = a.conexoes.filter(c => c.de.etapaId !== e.id && c.para.etapaId !== e.id);
    delete a.docente.respostas[e.id];
    if (a.meta?.etapas) a.meta.etapas = a.meta.etapas.filter(id => id !== e.id);
    etapasOrdenadas(a).forEach((x, i) => { x.ordem = i + 1; });
    P.secao = 'geral';
  });
}
function duplicarEtapa(e) {
  mudar(a => {
    const id = novoId('e', idsDe(a.etapas));
    etapasOrdenadas(a).filter(x => x.ordem > e.ordem).forEach(x => { x.ordem++; });
    const copia = JSON.parse(JSON.stringify(e)); copia.id = id; copia.ordem = e.ordem + 1; copia.titulo = e.titulo + ' (cópia)';
    a.etapas.push(copia);
    for (const p of a.pecas.filter(p => p.etapaId === e.id)) a.pecas.push({ ...JSON.parse(JSON.stringify(p)), id: novoId('p', idsDe(a.pecas)), etapaId: id });
    if (a.docente.respostas[e.id]) a.docente.respostas[id] = JSON.parse(JSON.stringify(a.docente.respostas[e.id]));
    for (const c of a.conexoes.filter(c => c.para.etapaId === e.id)) a.conexoes.push({ ...JSON.parse(JSON.stringify(c)), id: `c_${c.de.etapaId}_${id}`, para: { ...c.para, etapaId: id } });
    P.secao = 'etapa:' + id;
  });
}

// ---------- opções (hipóteses / alternativas) com ou sem gabarito ----------
function editorOpcoes(e, chave, { gabarito, rotulo, prefixo, max = 6 }) {
  const a = P.A, lista = e.config[chave] || (e.config[chave] = []);
  const r = a.docente.respostas[e.id];
  const outras = etapasOrdenadas(a).filter(x => x.id !== e.id && (x.config?.hipotesesCandidatas || x.config?.alternativas)?.length);
  return h('div', { class: 'cartao' },
    h('h3', {}, rotulo),
    gabarito && h('p', { class: 'sutil' }, 'Marque a resposta esperada. Ela fica só no material de quem conduz e aparece na revelação final.'),
    lista.map((o, i) => h('div', { class: 'opcao-edit' },
      gabarito ? h('label', { class: 'correta' }, h('input', { type: 'radio', name: 'cor-' + e.id, checked: r?.corretaId === o.id, onchange: () => { a.docente.respostas[e.id] = { corretaId: o.id, explicacao: a.docente.respostas[e.id]?.explicacao || '' }; tocar(); } }), 'certa') : h('span', { class: 'num', style: { marginTop: '14px' } }, String.fromCharCode(65 + i)),
      h('textarea', { rows: 2, 'aria-label': `${rotulo} ${i + 1}`, oninput: ev => { o.texto = ev.target.value; tocar(); } }, o.texto),
      h('button', { class: 'btn perigo pequeno', disabled: lista.length <= 2, 'aria-label': 'Remover opção ' + (i + 1), style: { marginTop: '6px' }, onclick: () => mudar(() => { e.config[chave] = lista.filter(x => x !== o); if (r?.corretaId === o.id) delete a.docente.respostas[e.id]; }) }, '✕'))),
    h('div', { class: 'linha-botoes' },
      h('button', { class: 'btn', disabled: lista.length >= max, onclick: () => mudar(() => { const usados = idsDe(lista); lista.push({ id: prefixo === 'a' ? 'abcdefghij'.split('').find(l => !usados.has(l)) : novoId('h', usados), texto: '' }); }) }, '＋ Adicionar'),
      outras.length > 0 && seletorCopiar(e, chave, outras)),
    gabarito && campo('Explicação para a discussão final', r?.explicacao || '', v => { a.docente.respostas[e.id] = { ...(a.docente.respostas[e.id] || {}), explicacao: v }; }, { area: true, linhas: 3 }));
}
function seletorCopiar(e, chave, outras) {
  const sel = h('select', { 'aria-label': 'Copiar opções de outra etapa', style: { width: 'auto' } }, h('option', { value: '' }, 'Copiar opções de…'), outras.map(x => h('option', { value: x.id }, x.titulo || x.id)));
  sel.onchange = () => {
    const src = etapa(sel.value); if (!src) return;
    const l = src.config.hipotesesCandidatas || src.config.alternativas;
    if (!confirmar('Substituir as opções desta etapa pelas da etapa escolhida?')) { sel.value = ''; return; }
    mudar(a => { e.config[chave] = l.slice(0, chave === 'alternativas' ? 5 : 6).map(x => ({ ...x })); delete a.docente.respostas[e.id]; });
  };
  return sel;
}

function blocoInvestigacao(e) {
  const a = P.A, c = e.config, pecas = a.pecas.filter(p => p.etapaId === e.id);
  const fontes = a.fontes;
  return h('div', {},
    h('div', { class: 'cartao' }, h('h3', {}, 'O que o grupo decide'),
      campo('Pergunta para o grupo', c.pergunta, v => { c.pergunta = v; }, { area: true, linhas: 2 }),
      h('div', { class: 'campos-2' },
        seletor('Justificativa', c.justificativa || 'opcional', [['nenhuma', 'Sem justificativa'], ['opcional', 'Opcional'], ['obrigatoria', 'Obrigatória']], v => { c.justificativa = v; }),
        campo('Peças mínimas como evidência', c.minEvidencias ?? 1, v => { c.minEvidencias = Math.max(0, Math.round(v ?? 0)); }, { tipo: 'number' }))),
    editorOpcoes(e, 'hipotesesCandidatas', { gabarito: false, rotulo: 'Hipóteses candidatas', prefixo: 'h' }),
    h('div', { class: 'cartao' },
      h('h3', {}, `Peças (${pecas.length})`),
      h('p', { class: 'sutil' }, 'Toque nos grupos para escolher quem recebe cada peça. Fracionar = cada grupo com uma parte; nenhum grupo deve resolver sozinho.'),
      h('div', { class: 'resumo-dist' }, [...a.grupos].sort((x, y) => x.ordemAlocacao - y.ordemAlocacao).map(g => chipGrupo(a, g.id, `${g.nome}: ${pecas.filter(p => p.destinatarios.includes(g.id)).length}`, 22))),
      pecas.map((p, i) => h('div', { class: 'peca-edit' },
        h('label', { for: 'pc-' + p.id }, `Peça ${i + 1} (o número não aparece para os participantes)`),
        h('textarea', { id: 'pc-' + p.id, rows: 3, oninput: ev => { p.conteudo = ev.target.value; tocar(); } }, p.conteudo),
        h('label', {}, 'Vai para'),
        h('div', { class: 'alvos' }, [...a.grupos].sort((x, y) => x.ordemAlocacao - y.ordemAlocacao).map(g => {
          const btn = h('button', { class: 'alvo', type: 'button', style: { '--cor': corDoGrupo(a, g.id) }, 'aria-pressed': String(p.destinatarios.includes(g.id)) }, iconeGrupo(a, g.id, 24), g.nome);
          btn.onclick = () => { p.destinatarios = p.destinatarios.includes(g.id) ? p.destinatarios.filter(x => x !== g.id) : [...p.destinatarios, g.id]; btn.setAttribute('aria-pressed', String(p.destinatarios.includes(g.id))); tocar(); };
          return btn;
        })),
        h('div', { class: 'rodape' },
          h('div', { class: 'campos-2', style: { flex: 1 } },
            seletor('Origem', p.origem?.natureza || 'sintetico', [['citacao', 'Citação'], ['parafrase', 'Paráfrase'], ['inferencia', 'Inferência'], ['sintetico', 'Dado sintético']], v => { p.origem = v === 'sintetico' && !p.origem?.fonteId ? { natureza: v } : { natureza: v, fonteId: p.origem?.fonteId || fontes[0]?.id || '' }; }, { redesenhar: true }),
            seletor('Fonte', p.origem?.fonteId || '', [['', fontes.length ? '— sem fonte —' : 'cadastre em Fontes'], ...fontes.map(f => [f.id, (f.descricao || f.id).slice(0, 60)])], v => { p.origem = v ? { ...p.origem, fonteId: v } : { natureza: p.origem?.natureza || 'sintetico' }; })),
          h('button', { class: 'btn perigo pequeno', onclick: () => mudar(x => { x.pecas = x.pecas.filter(y => y !== p); }) }, 'Remover peça')))),
      h('div', { class: 'linha-botoes' }, h('button', { class: 'btn', onclick: () => mudar(x => { x.pecas.push({ id: novoId('p', idsDe(x.pecas)), etapaId: e.id, destinatarios: [], origem: { natureza: x.regime === 'fiel' && x.fontes[0] ? 'parafrase' : 'sintetico', ...(x.regime === 'fiel' && x.fontes[0] ? { fonteId: x.fontes[0].id } : {}) }, conteudo: '' }); }) }, '＋ Adicionar peça'))));
}

function blocoComparacao(e) {
  const a = P.A, c = e.config;
  const conexao = a.conexoes.find(x => x.para.etapaId === e.id);
  const candidatas = etapasOrdenadas(a).filter(x => x.typeId === 'investigacao_fragmentos' && x.ordem < e.ordem && x.participacao.organizacao === 'grupos');
  return h('div', {},
    h('div', { class: 'cartao' }, h('h3', {}, 'Cooperação entre grupos'),
      seletor('Recebe as hipóteses de', conexao?.de.etapaId || '', [['', candidatas.length ? '— escolha a etapa —' : 'nenhuma investigação antes desta'], ...candidatas.map(x => [x.id, x.titulo || x.id])], v => {
        a.conexoes = a.conexoes.filter(x => x.para.etapaId !== e.id);
        if (v) a.conexoes.push({ id: `c_${v}_${e.id}`, de: { etapaId: v, portId: 'hipotese_grupo' }, para: { etapaId: e.id, portId: 'hipoteses_recebidas' }, agregacao: 'colecao_uma_por_grupo_planejado' });
      }, { redesenhar: true }),
      campo('Pergunta', c.pergunta, v => { c.pergunta = v; }, { area: true, linhas: 2 }),
      h('div', { class: 'campos-2' },
        seletor('Justificativa', c.justificativa || 'obrigatoria', [['nenhuma', 'Sem justificativa'], ['opcional', 'Opcional'], ['obrigatoria', 'Obrigatória']], v => { c.justificativa = v; }),
        seletor('Se faltar a hipótese de algum grupo', c.aceitaParcial ? 's' : 'n', [['n', 'Aguardar (padrão)'], ['s', 'Começar mesmo assim']], v => { c.aceitaParcial = v === 's'; }))),
    editorOpcoes(e, 'hipotesesCandidatas', { gabarito: true, rotulo: 'Hipóteses (marque a esperada)', prefixo: 'h' }));
}

function blocoQuestao(e) {
  const c = e.config;
  return h('div', {},
    h('div', { class: 'cartao' }, h('h3', {}, 'Questão'), campo('Enunciado', c.enunciado, v => { c.enunciado = v; }, { area: true, linhas: 3 })),
    editorOpcoes(e, 'alternativas', { gabarito: true, rotulo: 'Alternativas (marque a correta)', prefixo: 'a', max: 5 }));
}

// ============================================================ Montagem em peças
function blocoMontagem(e) {
  const c = e.config;
  const previa = h('div', { id: 'previaMontagem' });
  const nSim = { valor: 4 };
  const atualizar = () => desenharPreviaMontagem(e, previa, nSim.valor);
  const areaTexto = h('textarea', { id: 'mtTexto', rows: 5, placeholder: 'Ex.: VO₂ − = − 0,1 × velocidade − + 3,5 − = − 13,5 mL·kg⁻¹·min⁻¹' }, c.texto || '');
  areaTexto.addEventListener('input', () => { c.texto = areaTexto.value; tocar(); clearTimeout(areaTexto._t); areaTexto._t = setTimeout(atualizar, 250); });
  const aplicarCorte = modo => { c.texto = sugerirCortes(c.texto, modo); areaTexto.value = c.texto; tocar(); atualizar(); };
  const arquivo = h('input', { type: 'file', id: 'mtImg', accept: 'image/*' });
  arquivo.onchange = async () => {
    const f = arquivo.files[0]; if (!f) return;
    try { avisoGeral('Reduzindo a imagem…'); c.imagem = await comprimirImagem(f); avisoGeral(`Imagem pronta (${Math.round(c.imagem.dados.length / 1024)} KB${c.imagem.reduzida ? ', reduzida para ficar leve' : ''}).`, 'ok'); mudar(() => {}); }
    catch (err) { avisoGeral(err.message, 'erro'); }
  };
  setTimeout(atualizar, 0);
  return h('div', {},
    h('div', { class: 'cartao' }, h('h3', {}, 'O que vira peças'),
      h('div', { class: 'campos-2' },
        seletor('Tipo de conteúdo', c.modo, [['texto', 'Texto ou conta'], ['imagem', 'Imagem']], v => { c.modo = v; }, { redesenhar: true }),
        seletor('Quantidade de peças', c.quantidade || 'fixa', [['fixa', 'As que eu definir'], ['celulares', 'Uma por celular presente']], v => { c.quantidade = v; }, { redesenhar: true })),
      c.modo === 'texto' ? h('div', {},
        h('label', { for: 'mtTexto' }, 'Texto (marque os cortes com | ou com − entre espaços; use hífen "-" para subtração dentro de uma peça)'), areaTexto,
        h('div', { class: 'linha-botoes' },
          h('button', { class: 'btn pequeno', onclick: () => aplicarCorte('sinais') }, 'Cortar nos sinais (= + × ÷)'),
          h('button', { class: 'btn pequeno', onclick: () => aplicarCorte('palavras') }, 'Cortar por palavra'),
          h('button', { class: 'btn pequeno discreto', onclick: () => aplicarCorte('limpar') }, 'Tirar todos os cortes')),
        c.quantidade === 'celulares' && h('p', { class: 'sutil' }, 'Com "uma por celular", os trechos marcados são agrupados em tantas peças quantos forem os celulares, sempre na ordem.'))
      : h('div', {},
        h('label', { for: 'mtImg' }, c.imagem ? 'Trocar a imagem' : 'Enviar a imagem (ela é reduzida e comprimida automaticamente)'), arquivo,
        h('div', { class: 'campos-3' },
          seletor('Como cortar', c.corte?.tipo || 'colunas', [['colunas', 'Faixas lado a lado'], ['linhas', 'Faixas empilhadas'], ['grade', 'Grade']], v => { c.corte = { ...(c.corte || {}), tipo: v }; }, { redesenhar: true }),
          c.quantidade !== 'celulares' ? campo('Número de peças', c.corte?.n ?? 4, v => { c.corte = { ...(c.corte || {}), n: Math.max(2, Math.min(20, Math.round(v || 2))) }; atualizar(); }, { tipo: 'number' }) : h('div'),
          c.corte?.tipo === 'grade' ? campo('Colunas da grade', c.corte?.colunas ?? 3, v => { c.corte = { ...(c.corte || {}), colunas: Math.max(2, Math.min(6, Math.round(v || 2))) }; atualizar(); }, { tipo: 'number' }) : h('div'))),
      h('div', { class: 'opcoes', style: { marginTop: '10px' } },
        h('label', { class: 'opcao' }, h('input', { type: 'checkbox', checked: c.ocultarAoFim !== false, onchange: ev => { c.ocultarAoFim = ev.target.checked; tocar(); } }), h('span', {}, 'As peças somem dos celulares quando o tempo acaba')),
        h('label', { class: 'opcao' }, h('input', { type: 'checkbox', checked: !!c.revelarAoEncerrar, onchange: ev => { c.revelarAoEncerrar = ev.target.checked; tocar(); } }), h('span', {}, 'Ao encerrar a etapa, o telão mostra o todo montado')))),
    h('div', { class: 'cartao' }, h('h3', {}, 'Prévia das peças'),
      c.quantidade === 'celulares' && h('div', { style: { maxWidth: '260px' } }, campo('Simular quantos celulares', nSim.valor, v => { nSim.valor = Math.max(2, Math.min(20, Math.round(v || 2))); atualizar(); }, { tipo: 'number' })),
      previa),
    h('p', { class: 'sutil' }, 'Dica: coloque logo depois uma etapa (questão individual ou investigação) que só se resolve com o que foi montado. É ela que conta para a meta.'));
}

async function desenharPreviaMontagem(e, alvo, nSim) {
  const c = e.config, marca = Symbol(); alvo._marca = marca;
  try {
    if (c.modo === 'texto' && unidadesDoTexto(c.texto).length < 2) return limpar(alvo, h('p', { class: 'sutil' }, 'Marque pelo menos um corte para ver as peças.'));
    if (c.modo === 'imagem' && !c.imagem?.dados) return limpar(alvo, h('p', { class: 'sutil' }, 'Envie uma imagem para ver as peças.'));
    const pecas = await montarPecasEtapa(c, nSim);
    if (alvo._marca !== marca) return;
    const rep = c.modo === 'texto' ? pecasRepetidas(pecas.map(p => p.texto)) : [];
    const fila = lista => h('div', { class: 'pecas-fila' }, lista.map(p => svgPeca(p)));
    const grade = c.modo === 'imagem' && c.corte?.tipo !== 'colunas';
    const naOrdem = grade
      ? h('div', { style: { display: 'grid', gridTemplateColumns: `repeat(${c.corte.tipo === 'linhas' ? 1 : (c.corte.colunas || Math.ceil(Math.sqrt(pecas.length)))}, 120px)`, gap: '6px' } }, pecas.map(p => svgPeca(p)))
      : fila(pecas);
    limpar(alvo,
      h('p', {}, h('strong', {}, `${pecas.length} peças · na ordem certa`)), naOrdem,
      h('p', { style: { marginTop: '14px' } }, h('strong', {}, 'Como a turma recebe (embaralhado, sem números)')), fila(embaralharSemOrdemCerta(pecas)),
      rep.length > 0 && h('p', { class: 'aviso', 'data-tipo': 'alerta' }, `Peças repetidas (${rep.join(', ')}): a ordem entre elas fica ambígua. As saliências ajudam, mas considere juntar ou reescrever.`));
  } catch (err) { limpar(alvo, h('p', { class: 'aviso', 'data-tipo': 'erro' }, 'Não foi possível desenhar a prévia: ' + err.message)); }
}


// ============================================================ Cadeado do grupo e Quiz entre grupos
function perguntaVazia(id) { return { id, enunciado: '', alternativas: ['a', 'b', 'c', 'd'].map(l => ({ id: l, texto: '' })) }; }
const gabaritoDe = e => {
  const r = P.A.docente.respostas[e.id] && typeof P.A.docente.respostas[e.id] === 'object' && P.A.docente.respostas[e.id].perguntas ? P.A.docente.respostas[e.id] : (P.A.docente.respostas[e.id] = { perguntas: {} });
  return r;
};

/** Lê perguntas coladas: blocos separados por linha em branco; 1ª linha = enunciado; alternativas "a) …" ou "- …"; * marca a certa. */
function lerPerguntasColadas(texto) {
  const blocos = String(texto || '').split(/\n\s*\n/).map(b => b.split('\n').map(l => l.trim()).filter(Boolean)).filter(b => b.length >= 3);
  return blocos.map(linhas => {
    const alts = [], enun = [];
    let certa = null;
    for (const l of linhas) {
      const m = l.match(/^(\*)?\s*(?:([a-eA-E])[).:-]|[-•])\s*(.+?)\s*(\*)?$/);
      if (m && alts.length < 5 && (alts.length || enun.length)) { if (m[1] || m[4]) certa = LETRAS[alts.length]; alts.push(m[3]); }
      else if (!alts.length) enun.push(l.replace(/^\d+[).]\s*/, ''));
    }
    return { enunciado: enun.join(' '), alternativas: alts, certa };
  }).filter(q => q.enunciado && q.alternativas.length >= 2);
}

function editorPerguntas(e, { explicacao }) {
  const c = e.config, r = gabaritoDe(e), lista = c.perguntas || (c.perguntas = []);
  const colar = h('textarea', { rows: 6, placeholder: 'Qual hormônio aumenta na altitude?\n*a) Eritropoetina\nb) Insulina\nc) Glucagon\n\nPróxima pergunta…\na) …' });
  return h('div', { class: 'cartao' },
    h('h3', {}, `Perguntas (${lista.length})`),
    h('p', { class: 'sutil' }, 'Marque a alternativa certa de cada uma. O gabarito fica só no celular de quem conduz: os celulares dos alunos recebem apenas "certo" ou "errado".'),
    lista.map((q, i) => {
      const rq = r.perguntas[q.id] || {};
      return h('div', { class: 'pergunta-edit' },
        h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' } },
          h('strong', {}, `Pergunta ${i + 1}`),
          h('div', { class: 'mini' },
            h('button', { class: 'btn pequeno', disabled: i === 0, 'aria-label': 'Subir pergunta', onclick: () => mudar(() => { [lista[i - 1], lista[i]] = [lista[i], lista[i - 1]]; }) }, '↑'),
            h('button', { class: 'btn perigo pequeno', disabled: lista.length <= 1, 'aria-label': 'Remover pergunta ' + (i + 1), onclick: () => mudar(() => { c.perguntas = lista.filter(x => x !== q); delete r.perguntas[q.id]; }) }, '✕'))),
        h('textarea', { rows: 2, 'aria-label': `Enunciado da pergunta ${i + 1}`, placeholder: 'Enunciado', oninput: ev => { q.enunciado = ev.target.value; tocar(); } }, q.enunciado),
        q.alternativas.map((o, k) => h('div', { class: 'opcao-edit' },
          h('label', { class: 'correta' }, h('input', { type: 'radio', name: `cor-${e.id}-${q.id}`, checked: rq.corretaId === o.id, onchange: () => { r.perguntas[q.id] = { ...(r.perguntas[q.id] || {}), corretaId: o.id }; tocar(); } }), LETRAS[k].toUpperCase()),
          h('input', { type: 'text', value: o.texto, 'aria-label': `Alternativa ${LETRAS[k]} da pergunta ${i + 1}`, oninput: ev => { o.texto = ev.target.value; tocar(); } }),
          h('button', { class: 'btn perigo pequeno', disabled: q.alternativas.length <= 2, 'aria-label': 'Remover alternativa', onclick: () => mudar(() => { q.alternativas = q.alternativas.filter(x => x !== o); if (rq.corretaId === o.id) delete r.perguntas[q.id].corretaId; renomearLetras(q, r); }) }, '✕'))),
        h('div', { class: 'linha-botoes' }, h('button', { class: 'btn pequeno', disabled: q.alternativas.length >= 5, onclick: () => mudar(() => { q.alternativas.push({ id: LETRAS[q.alternativas.length], texto: '' }); }) }, '＋ Alternativa')),
        explicacao && campo('Explicação (aparece no telão depois da pergunta)', rq.explicacao || '', v => { r.perguntas[q.id] = { ...(r.perguntas[q.id] || {}), explicacao: v }; }, { area: true, linhas: 2 }));
    }),
    h('div', { class: 'linha-botoes' }, h('button', { class: 'btn', disabled: lista.length >= 60, onclick: () => mudar(() => { lista.push(perguntaVazia(novoId('p', idsDe(lista)))); }) }, '＋ Adicionar pergunta')),
    h('details', { style: { marginTop: '10px' } }, h('summary', {}, 'Colar várias perguntas de uma vez'),
      h('p', { class: 'sutil' }, 'Uma pergunta por bloco, separados por linha em branco. Primeira linha: enunciado. Alternativas começando com a) b) c)… Marque a certa com * no início.'),
      colar,
      h('div', { class: 'linha-botoes' }, h('button', { class: 'btn', onclick: () => {
        const novas = lerPerguntasColadas(colar.value);
        if (!novas.length) return avisoGeral('Nenhuma pergunta reconhecida. Confira o formato.', 'erro');
        mudar(() => {
          // substitui as perguntas vazias do começo
          c.perguntas = lista.filter(q => q.enunciado.trim() || q.alternativas.some(o => o.texto.trim()));
          for (const n of novas) {
            const id = novoId('p', idsDe(c.perguntas));
            c.perguntas.push({ id, enunciado: n.enunciado, alternativas: n.alternativas.map((t, k) => ({ id: LETRAS[k], texto: t })) });
            if (n.certa) r.perguntas[id] = { corretaId: n.certa };
          }
        });
        avisoGeral(`${novas.length} pergunta(s) adicionada(s).`, 'ok');
      } }, 'Adicionar as perguntas coladas'))));
}
/** Mantém as alternativas com ids a, b, c… (a planilha usa as letras). */
function renomearLetras(q, r) {
  const certa = r.perguntas[q.id]?.corretaId, antiga = q.alternativas.findIndex(o => o.id === certa);
  q.alternativas.forEach((o, k) => { o.id = LETRAS[k]; });
  if (r.perguntas[q.id]) { if (antiga >= 0) r.perguntas[q.id].corretaId = LETRAS[antiga]; else delete r.perguntas[q.id].corretaId; }
}

function blocoCadeado(e) {
  const c = e.config, r = gabaritoDe(e);
  const frag = c.regra === 'fragmentos';
  const areaFrag = h('textarea', { id: 'cdFrag', rows: 2, placeholder: 'Ex.: 0,1 | × 100 m/min | + 3,5 | = 13,5' }, (c.fragmentos || []).join(' | '));
  const previa = h('div', { id: 'previaCadeado' });
  const desenhar = () => limpar(previa, previaCadeado(e));
  areaFrag.addEventListener('input', () => { c.fragmentos = fragmentosDoTexto(areaFrag.value); tocar(); desenhar(); });
  setTimeout(desenhar, 0);
  return h('div', {},
    h('div', { class: 'cartao' }, h('h3', {}, cadeadoIcone(), ' Como o cadeado abre'),
      h('div', { class: 'campos-2' },
        seletor('Regra', c.regra || 'fragmentos', [['fragmentos', 'Pedaços do código (cada acerto revela um pedaço)'], ['acertos', 'Por acertos (X membros acertam)']], v => { c.regra = v; }, { redesenhar: true }),
        seletor('Perguntas no grupo', c.distribuicao || 'diferente', [['diferente', 'Cada aluno recebe uma diferente'], ['mesma', 'Todos do grupo recebem a mesma']], v => { c.distribuicao = v; desenhar(); })),
      frag ? h('div', {},
        h('label', { for: 'cdFrag' }, 'Pedaços do código, na ordem (separe com | ou um por linha)'), areaFrag,
        h('div', { class: 'campos-2' },
          campo('Código que abre o cadeado (só você vê)', r.codigo || '', v => { r.codigo = v; }, { id: 'cdCodigo', ajuda: 'Aceita vírgula ou ponto e ignora espaços. Para aceitar mais de uma forma, separe com ponto e vírgula (ex.: 13,5; 13,5 mL).' }),
          h('div'))) :
        campo('Quantos membros precisam acertar (0 = todos)', c.minAcertos ?? 0, v => { c.minAcertos = Math.max(0, Math.min(30, Math.round(v || 0))); desenhar(); }, { tipo: 'number' }),
      h('div', { class: 'campos-2' },
        seletor('Depois de errar, tentar de novo em', String(c.espera ?? 30), [['0', 'na hora'], ['15', '15 segundos'], ['30', '30 segundos'], ['60', '1 minuto'], ['120', '2 minutos']], v => { c.espera = Number(v); }),
        h('div')),
      campo('Mensagem quando o cadeado abre (opcional)', c.mensagem || '', v => { c.mensagem = v; }, { area: true, linhas: 2, ajuda: 'Ex.: a próxima pista, onde está o envelope, ou "Avisem o professor!"' })),
    h('div', { class: 'cartao' }, h('h3', {}, 'Como fica num grupo'), previa),
    editorPerguntas(e, { explicacao: false }),
    h('p', { class: 'sutil' }, frag
      ? 'Dica: o código pode ser o resultado de uma conta montada com os pedaços (ex.: VO₂ = 0,1 × 100 + 3,5 = 13,5). Quem acerta vê só o próprio pedaço: o grupo precisa juntar.'
      : 'Dica: com perguntas diferentes por aluno, ninguém resolve sozinho. Uma espera depois do erro evita o chute.'));
}
function previaCadeado(e) {
  const c = e.config, frag = c.regra === 'fragmentos';
  const exemplo = n => {
    const prep = prepararCadeado(c, [{ id: 'g', uids: Array.from({ length: n }, (_, i) => 'Aluno ' + (i + 1)) }], () => 0.3).g;
    if (!prep) return h('p', { class: 'sutil' }, 'Adicione perguntas.');
    return h('div', { class: 'cad-exemplo' }, h('strong', {}, `Grupo com ${n}`), h('ul', {}, prep.membros.slice().sort().map(u => h('li', {}, u + ': ',
      prep.deUid[u].map(i => { const t = prep.tarefas[i]; const k = c.perguntas.findIndex(q => q.id === t.perguntaId) + 1; return `pergunta ${k}` + (t.fragmento !== null ? ` → pedaço “${c.fragmentos[t.fragmento]}”` : ''); }).join(' · ')))),
      !frag && h('small', {}, `Abre com ${Math.max(1, Math.min(n, c.minAcertos > 0 ? c.minAcertos : n))} acerto(s).`));
  };
  if (frag && (c.fragmentos || []).length < 2) return h('p', { class: 'sutil' }, 'Escreva pelo menos 2 pedaços para ver a distribuição.');
  return h('div', {},
    frag && h('div', { class: 'fragmentos-fila' }, c.fragmentos.map(f => h('span', { class: 'fragmento mini' }, f))),
    h('div', { class: 'campos-2' }, exemplo(3), exemplo(5)));
}

function blocoQuiz(e) {
  const c = e.config;
  return h('div', {},
    h('div', { class: 'cartao' }, h('h3', {}, 'Como funciona o quiz'),
      h('p', { class: 'sutil' }, 'A cada pergunta, o sistema sorteia o grupo da vez (sem repetir até todos jogarem). A pergunta aparece só no celular do líder do grupo sorteado; o telão mostra de quem é a vez e o placar. Você avança as perguntas pelo celular.'),
      h('div', { class: 'campos-2' },
        seletor('Se o grupo errar', c.aoErrar || 'repassar', [['repassar', 'Passa para outro grupo sorteado (uma vez)'], ['revelar', 'Mostra a resposta e segue']], v => { c.aoErrar = v; }),
        campo('Tempo por pergunta (segundos)', c.segundos ?? 60, v => { c.segundos = Math.max(10, Math.min(600, Math.round(v || 60))); }, { tipo: 'number' })),
      h('div', { class: 'opcoes', style: { marginTop: '10px' } },
        h('label', { class: 'opcao' }, h('input', { type: 'checkbox', checked: !!c.mostrarNoTelao, onchange: ev => { c.mostrarNoTelao = ev.target.checked; tocar(); } }), h('span', {}, 'O telão mostra a pergunta junto (a turma toda pensa; sem marcar: só o líder vê e lê para o grupo)')),
        h('label', { class: 'opcao' }, h('input', { type: 'checkbox', checked: c.mostrarResposta !== false, onchange: ev => { c.mostrarResposta = ev.target.checked; tocar(); } }), h('span', {}, 'Depois de cada pergunta, o telão mostra a resposta e a explicação')))),
    editorPerguntas(e, { explicacao: true }));
}

// ============================================================ Fontes
function editorFontes() {
  const a = P.A;
  return h('div', { class: 'cartao' }, h('h2', {}, 'Fontes'),
    h('p', { class: 'sutil' }, 'Referências que sustentam as peças. No regime “fiel ao material”, toda peça precisa de fonte.'),
    a.fontes.map((f, i) => h('div', { class: 'cartao', style: { margin: '10px 0' } },
      h('div', { style: { display: 'flex', justifyContent: 'space-between' } }, h('strong', {}, `Fonte ${i + 1}`),
        h('button', { class: 'btn perigo pequeno', onclick: () => { const n = a.pecas.filter(p => p.origem?.fonteId === f.id).length; if (n && !confirmar(`${n} peça(s) usam esta fonte. Remover mesmo assim?`)) return; mudar(x => { x.fontes = x.fontes.filter(y => y !== f); x.pecas.forEach(p => { if (p.origem?.fonteId === f.id) p.origem = { natureza: 'sintetico' }; }); }); } }, 'Remover')),
      campo('Referência', f.descricao, v => { f.descricao = v; }, { area: true, linhas: 2 }),
      h('div', { class: 'campos-2' }, campo('Localização (página, seção)', f.localizacao, v => { f.localizacao = v; }), campo('Trecho ou resumo', f.trecho, v => { f.trecho = v; })))),
    h('div', { class: 'linha-botoes' }, h('button', { class: 'btn', onclick: () => mudar(x => { x.fontes.push({ id: novoId('f', idsDe(x.fontes)), descricao: '', localizacao: '', trecho: '' }); }) }, '＋ Adicionar fonte')));
}

// ============================================================ Revisão
/** Traduz o local técnico do diagnóstico para algo legível ("Peça 2 · Investigação…"). */
function onde(local) {
  const a = P.A;
  let m = local.match(/^pecas\[(\d+)\]/);
  if (m) { const p = a.pecas[Number(m[1])]; const e = p && etapa(p.etapaId); const n = p ? a.pecas.filter(x => x.etapaId === p.etapaId).indexOf(p) + 1 : ''; return `Peça ${n}` + (e ? ` · ${e.titulo}` : ''); }
  m = local.match(/^etapas\[(\d+)\]/);
  if (m) { const e = a.etapas[Number(m[1])]; return e ? `Etapa ${etapasOrdenadas(a).indexOf(e) + 1} · ${e.titulo}` : 'Etapa'; }
  m = local.match(/^docente\.respostas\.([^.]+)/);
  if (m) { const e = etapa(m[1]); return e ? `Gabarito · ${e.titulo}` : 'Gabarito'; }
  m = local.match(/^grupos/); if (m) return 'Grupos';
  m = local.match(/^meta/); if (m) return 'Meta';
  m = local.match(/^fontes/); if (m) return 'Fontes';
  return local;
}
function irPara(local) {
  const a = P.A;
  let m = local.match(/^pecas\[(\d+)\]/); if (m && a.pecas[Number(m[1])]) return 'etapa:' + a.pecas[Number(m[1])].etapaId;
  m = local.match(/^etapas\[(\d+)\]/); if (m && a.etapas[Number(m[1])]) return 'etapa:' + a.etapas[Number(m[1])].id;
  m = local.match(/^docente\.respostas\.([^.]+)/); if (m && etapa(m[1])) return 'etapa:' + m[1];
  if (/^grupos/.test(local)) return 'grupos';
  if (/^fontes/.test(local)) return 'fontes';
  return 'geral';
}
const linhaDiag = x => h('li', { class: x.severidade }, x.mensagem, ' ',
  h('button', { class: 'btn pequeno discreto', onclick: () => { P.secao = irPara(x.local); renderNav(); renderEditor(); window.scrollTo({ top: 0 }); } }, 'Ir para ' + onde(x.local)));

function editorRevisao() {
  const a = P.A, d = validarAtividade(a), g = avisoGramatica(a), s = sugerirEquilibrio(a, { dispensadas: P.dispensadas });
  const erros = d.filter(x => x.severidade === 'erro'), outros = d.filter(x => x.severidade !== 'erro');
  return h('div', {},
    h('div', { class: 'cartao' + (erros.length ? '' : ' destaque') }, h('h2', {}, erros.length ? `${erros.length} erro(s) para corrigir` : 'Pronta para aplicar'),
      erros.length ? h('ul', { class: 'diag' }, erros.map(linhaDiag)) : h('p', {}, 'Nenhum erro. Use “Ver como fica” para ensaiar com participantes simulados.')),
    (outros.length > 0 || g) && h('div', { class: 'cartao' }, h('h3', {}, 'Avisos'), g && h('p', { class: 'aviso' }, g.mensagem), h('ul', { class: 'diag' }, outros.map(linhaDiag))),
    s.length > 0 && h('div', { class: 'cartao' }, h('h3', {}, 'Sugestões de equilíbrio'), h('p', { class: 'sutil' }, 'São só propostas. A decisão é sua.'),
      h('ul', { class: 'diag' }, s.map(x => h('li', { class: 'info' }, x.mensagem, ' ', h('button', { class: 'btn pequeno discreto', onclick: () => { P.dispensadas.add(x.id); renderEditor(); } }, 'Dispensar'))))));
}
