/* MOSAICO · Painel de quem conduz (celular)
   O "cérebro" da sala: só este aparelho tem o material docente.
   Publica no servidor apenas o estado público da sala e o pacote de cada grupo. */

import { backend, link, EM_ENSAIO } from './backend.js';
import { melhorarConducao, indicarConexao } from './conducao-docente.js';
import { CASOS, carregarCaso } from './casos.js';
import { $, h, limpar, campoArquivo, aviso, corDoGrupo, chipGrupo, iconeGrupo, escalaVisual, contagemRegressiva, pl } from './ui.js';
import { validarAtividade, temErros, lerJsonImportado } from './core/validacao.js';
import { sugerirEquilibrio, avisoGramatica } from './core/equilibrio.js';
import { distribuir, calcularVagas, diagnosticarComposicao, grupoParaEntradaTardia, moverParticipante } from './core/distribuicao.js';
import { relatorioAula, relatorioCSV } from './core/relatorio.js';
import { etapasOrdenadas, projecaoGrupo, prontidaoEtapa, calcularMeta, escalaDesempenho, montarResultado, registrarContingencia } from './core/motor.js';
import { obterTipo } from './core/tipos.js';
import { gerarPrompt } from './core/prompt.js';
import { lerArquivoAtividade } from './planilha-xlsx.js';
import { montarPecasEtapa } from './quebra-cabeca.js';
import { distribuirPecas } from './core/montagem.js';
import { prepararCadeado, estadoCadeado, sortearGrupo, respostaCerta } from './core/desafios.js';
import { abrirImpressao } from './imprimir.js';
import { prepararCartoes, estadoCartoes, conferirQuadro, distribuicaoTermometro, temGabaritoTermometro, respostaEsperadaTexto, quadroCompleto, conjuntosPorTrechos } from './core/cartoes.js';
import { ligarComoCartoes } from './core/pares.js';
import { criarTipos } from './conduzir-tipos.js';
import { ico, ilustra } from './icones.js';

const b = await backend();
// ?previa (aberta pelo Planejamento): ensaio automático com a atividade em edição.
const PREVIA = EM_ENSAIO && new URLSearchParams(location.search).has('previa');
const SUF = EM_ENSAIO ? (PREVIA ? '-previa' : '-ensaio') : '';
const GUARDA = 'mosaico-conducao' + SUF, PENDENTES = 'mosaico-salas-pendentes' + SUF;
let relatorioBaixado = false; const gruposExpandidos = new Set();
const E = { conta: null, atividade: null, diags: [], importacao: [], dispensadas: new Set(), codigo: null, sala: null, membros: [], envios: [], contingencias: [], jogo: {}, pub: {}, aba: 'atividade', promptGerado: '' };
let inscricoes = [], relogio = null;

// ---------------- persistência local ----------------
function salvar() {
  try { localStorage.setItem(GUARDA, JSON.stringify({ atividade: E.atividade, codigo: E.codigo, dispensadas: [...E.dispensadas], contingencias: E.contingencias, jogo: E.jogo })); } catch {}
}
/** Atividade enviada pelo botão “Dar esta aula” do Planejamento. Fica guardada até poder entrar (sem sala aberta). */
const PARA_CONDUZIR = 'mosaico-para-conduzir' + (EM_ENSAIO ? '-ensaio' : '');
function doPlanejamento() { if (PREVIA) return null; try { return JSON.parse(localStorage.getItem(PARA_CONDUZIR) || 'null'); } catch { return null; } }
/** Carrega a atividade vinda do Planejamento, se houver e não houver sala aberta. Devolve se carregou. */
function receberDoPlanejamento() {
  const a = doPlanejamento(); if (!a || E.codigo) return false;
  try { localStorage.removeItem(PARA_CONDUZIR); } catch {}
  if (!aceitar(a, 'do Planejamento')) return false;   // com erros: aparecem na aba Atividade
  mostrarAba('atividade'); renderTudo();
  avisoGeral(`“${a.titulo}” está pronta. Confira e abra a sala.`, 'ok');
  return true;
}
function lerGuardado() { try { return JSON.parse(localStorage.getItem(GUARDA) || 'null'); } catch { return null; } }
function pendentes() { try { return JSON.parse(localStorage.getItem(PENDENTES) || '[]'); } catch { return []; } }
function marcarPendente(c, sim) { try { const l = pendentes().filter(x => x !== c); if (sim) l.push(c); localStorage.setItem(PENDENTES, JSON.stringify(l.slice(-20))); } catch {} }

const avisoGeral = (t, tipo = 'info') => { aviso($('avisoGeral'), t, tipo); if (t) $('avisoGeral').scrollIntoView({ block: 'nearest' }); };

// ---------------- entrada ----------------
$('entrarGoogle').replaceChildren(ico('sair') || '', EM_ENSAIO ? 'Entrar (modo ensaio, sem internet)' : 'Entrar com Google');   // textContent apagaria o ícone
$('entrarGoogle').onclick = () => {
  const p = b.entrarGoogle();     // sem await antes: o iPhone exige o pop-up direto no toque
  $('entrarGoogle').disabled = true;
  p.then(iniciar).catch(e => {
    $('entrarGoogle').disabled = false;
    const m = { 'auth/popup-blocked': 'O navegador bloqueou a janela do Google. Permita pop-ups e tente de novo.', 'auth/popup-closed-by-user': 'Login cancelado.', 'auth/unauthorized-domain': 'Abra pelo endereço oficial do MOSAICO para entrar com Google.', 'auth/operation-not-allowed': 'Ative o login Google no Authentication do projeto mosaico-sala.' };
    aviso($('avisoLogin'), m[e.code] || 'Não foi possível entrar. Confira a internet.', 'erro');
  });
};
(async () => {
  if (PREVIA) { try { localStorage.removeItem(GUARDA); } catch {} return iniciarPrevia(); }
  const c = await b.contaAtual(); if (c) iniciar(c); else if(EM_ENSAIO) iniciar(await b.entrarGoogle()); else $('login').hidden = false;
})();

/** Pré-visualização: entra sozinho, carrega a atividade do Planejamento, abre a sala e avisa a página-mãe. */
async function iniciarPrevia() {
  await iniciar(await b.entrarGoogle());
  let a = null; try { a = JSON.parse(localStorage.getItem('mosaico-previa') || 'null'); } catch {}
  if (!a) return avisoGeral('Nada para pré-visualizar. Abra pelo Planejamento.', 'erro');
  if (!aceitar(a, 'pré-visualização')) return avisoGeral('A atividade tem erros. Corrija na Revisão do Planejamento.', 'erro');
  await abrirSala();
  mostrarAba('sala');
  const alvo = new URLSearchParams(location.search).get('etapa');
  if (E.codigo) irDiretoParaEtapa(alvo && etapa(alvo) ? alvo : etapasOrdenadas(A())[0]?.id).catch(falha);
}

/** “Ver esta etapa”: espera a turma simulada entrar, sorteia os grupos e começa a etapa pedida. */
async function irDiretoParaEtapa(etapaId) {
  if (!etapaId) return;
  const espera = ms => new Promise(r => setTimeout(r, ms));
  let antes = -1;
  for (let i = 0; i < 60; i++) {   // até a quantidade de participantes parar de crescer
    await espera(800);
    const n = Object.keys(E.sala?.nomes || {}).length;
    if (n > 0 && n === antes) break;
    antes = n;
  }
  if (!Object.keys(E.sala?.nomes || {}).length) return;
  await formarGrupos();
  await espera(600);
  mostrarAba('conducao');
  if(PREVIA && A().etapas.some(e=>e.id==='ensaio-origem')) {
    const hip=etapa(etapaId).config.hipotesesCandidatas;
    for(const [i,g] of A().grupos.entries()) await b.enviar(E.codigo,'ensaio-origem__'+g.id,{etapaId:'ensaio-origem',escopo:'grupo',grupoId:g.id,autor:E.conta.uid,dados:{hipoteseId:hip[i%hip.length].id,evidencias:['ensaio-p'+i],justificativa:'Contribuição fictícia criada exclusivamente para esta prévia.'},contingencia:true});
    await b.atualizarSala(E.codigo,{encerradas:['ensaio-origem']});
  }
  await iniciarEtapa(etapa(etapaId));
}

async function iniciar(conta) {
  E.conta = conta;
  $('login').hidden = true; $('abas').hidden = false;
  const g = lerGuardado();
  if (g?.atividade) { E.atividade = g.atividade; E.dispensadas = new Set(g.dispensadas || []); E.contingencias = g.contingencias || []; E.jogo = g.jogo || {}; revalidar(); }
  if (g?.codigo) {
    try {
      const s = await b.lerSala(g.codigo);
      if (s && s.owner === conta.uid && s.status === 'open') conectarSala(g.codigo);
      else { E.codigo = null; salvar(); }
    } catch { E.codigo = null; }
  }
  const idBiblioteca=new URLSearchParams(location.search).get('atividade');
  if(idBiblioteca && !E.codigo) {
    try {
      if(!/^[a-zA-Z0-9_-]{1,128}$/.test(idBiblioteca)) throw new Error('Identificador de atividade inválido.');
      const doc=await b.lerBiblioteca(idBiblioteca); if(!doc)throw new Error('Atividade não encontrada na sua biblioteca.');
      if(aceitar(JSON.parse(doc.conteudo),'da sua biblioteca')){mostrarAba('atividade');renderTudo();avisoGeral('Atividade pronta. Confira e abra a sala: este aparelho conduzirá a aula.','ok');return faxina();}
    } catch(e){avisoGeral('Não foi possível recuperar a atividade. Entre com a mesma conta Google que a salvou.','erro');}
  }
  if (receberDoPlanejamento()) return faxina();
  mostrarAba(E.codigo ? 'conducao' : 'atividade');
  renderTudo();
  if (E.codigo && doPlanejamento()) avisoGeral('Há uma sala aberta. A atividade que veio do Planejamento entra assim que você encerrar esta sala.', 'alerta');
  faxina();
}

// ---------------- abas ----------------
$('abas').addEventListener('click', e => { const a = e.target.closest('button')?.dataset.aba; if (a) mostrarAba(a); });
function mostrarAba(nome) {
  E.aba = nome;
  for (const btn of $('abas').querySelectorAll('button')) btn.setAttribute('aria-selected', String(btn.dataset.aba === nome));
  for (const n of ['atividade', 'sala', 'grupos', 'conducao']) $('aba-' + n).hidden = n !== nome;
  aviso($('avisoGeral'), '');
  renderPassos();
  window.scrollTo({ top: 0 });
}
/** Anterior / próximo passo da condução (Atividade → Sala → Grupos → Condução), embaixo de cada aba. */
const ABAS = [['atividade', 'Conferir'], ['sala', 'Sala'], ['grupos', 'Grupos'], ['conducao', 'Condução']];
function renderPassos() {
  const alvo = $('passosNav'); if (!alvo) return;
  const i = ABAS.findIndex(x => x[0] === E.aba), ant = ABAS[i - 1], prox = ABAS[i + 1];
  alvo.hidden = !E.conta;
  limpar(alvo,
    ant ? h('button', { class: 'btn', 'data-sem-ico': '', onclick: () => mostrarAba(ant[0]) }, ico('voltar'), ant[1])
      : h('a', { class: 'btn discreto', href: 'planejar.html' }, ico('planejar'), 'Planejamento'),
    prox ? h('button', { class: 'btn primario proximo', 'data-sem-ico': '', onclick: () => mostrarAba(prox[0]) }, 'Próximo: ' + prox[1], ico('avancar'))
      : E.codigo ? h('a', { class: 'btn proximo', href: link('telao.html', { sala: E.codigo }), target: '_blank', rel: 'noopener' }, ico('telao'), 'Abrir o telão') : null);
}
function renderTudo() { renderAtividade(); renderSala(); renderGrupos(); renderConducao(); renderTopo(); renderPassos(); }

// ---------------- auxiliares da atividade ----------------
const A = () => E.atividade;
const etapa = id => A().etapas.find(e => e.id === id);
const nomeGrupo = id => A().grupos.find(g => g.id === id)?.nome || id;
const nomeDe = uid => E.sala?.nomes?.[uid] || (uid === E.conta?.uid ? 'quem conduz' : '—');
const grupoDoUid = uid => Object.entries(E.sala?.composicao || {}).find(([, m]) => m.includes(uid))?.[0] || null;
const chip = g => chipGrupo(A(), g, nomeGrupo(g));

function revalidar() { E.diags = A() ? validarAtividade(A()) : []; }

function publico() {
  const a = A();
  return {
    titulo: a.titulo, introducao: a.introducao || '', perguntaCentral: a.perguntaCentral || '',
    grupos: a.grupos.map(g => ({ id: g.id, nome: g.nome, funcao: g.funcao || '', ordemAlocacao: g.ordemAlocacao })),
    etapas: etapasOrdenadas(a).map(e => ({ id: e.id, titulo: e.titulo, ordem: e.ordem, typeId: e.typeId, organizacao: e.participacao.organizacao })),
    meta: a.meta && a.meta.ativa !== false ? { descricao: a.meta.descricao || '', limiar: a.meta.limiar } : null
  };
}

function aceitar(obj, origem) {
  const d = validarAtividade(obj);
  if (temErros(d)) { E.importacao = d; renderAtividade(); return false; }
  E.atividade = obj; E.importacao = []; E.dispensadas = new Set(); E.contingencias = []; E.jogo = {};
  revalidar(); salvar(); renderTudo();
  avisoGeral(`Atividade “${obj.titulo}” carregada${origem ? ' (' + origem + ')' : ''}.`, 'ok');
  return true;
}

function ajustar(fn) {
  fn(A()); revalidar(); salvar(); renderAtividade(); renderTopo();
  if (E.codigo) b.atualizarSala(E.codigo, { publico: publico() }).catch(falha);
}

function falha(e) {
  if(PREVIA&&window.parent!==window)window.parent.postMessage({tipo:'mosaico-previa-erro',mensagem:e?.message||'Confira a revisão da atividade.'},location.origin);
  console.error(e);
  const negado = e?.code === 'permission-denied' || /permission/i.test(e?.message || '');
  avisoGeral(negado ? 'O servidor recusou a operação. Confira se sua conta está na lista de quem conduz e se as regras do Firestore foram publicadas.' : 'Falha de conexão: ' + (e?.message || e), 'erro');
}

// =====================================================================
// ABA ATIVIDADE
// =====================================================================
function renderAtividade() {
  const alvo = $('aba-atividade');
  if (!A()) return limpar(alvo, cartaoCarregar());
  const a = A(), salaAberta = !!E.codigo;
  const naoErros = E.diags.filter(d => d.severidade !== 'erro');
  const sugestoes = sugerirEquilibrio(a, { dispensadas: E.dispensadas });
  const gram = avisoGramatica(a);

  const ORG = { grupos: 'em grupos', individual: 'individual', representantes: 'entre grupos (representantes)' };
  // "conta para a meta" sai da mesma lista que faz a conta (meta.etapas), não do rótulo de cada etapa
  const naMeta = new Set(a.meta?.ativa !== false ? a.meta?.etapas || [] : []);
  const comp = e => naMeta.has(e.id) ? 'conta para a meta' : e.participacao.competicao === 'entre_grupos' ? 'entre grupos' : 'sem competição';
  const avisos = naoErros.length + (gram ? 1 : 0);
  const gruposOrd = [...a.grupos].sort((x, y) => x.ordemAlocacao - y.ordemAlocacao);
  limpar(alvo,
    h('div', { class: 'cartao conferencia' },
      h('span', { class: 'guia-selo' }, salaAberta ? 'SALA ABERTA' : 'CONFERIR E ABRIR A SALA'),
      h('h1', {}, a.titulo),
      h('p', { class: 'sutil' }, [a.duracaoMin && a.duracaoMin + ' min', `${a.grupos.length} grupos`, `${a.etapas.length} etapas`, a.meta?.ativa !== false && a.meta?.limiar ? `meta de ${Math.round(a.meta.limiar * 100)}%` : 'sem meta'].filter(Boolean).join(' · ')),
      h('ol', { class: 'roteiro' }, etapasOrdenadas(a).map(e => h('li', {},
        h('strong', {}, e.titulo), ' ',
        h('small', { class: 'sutil' }, [e.tempoMin && e.tempoMin + ' min', ORG[e.participacao.organizacao] || e.participacao.organizacao, comp(e)].filter(Boolean).join(' · '))))),
      h('div', { class: 'conferencia-grupos', 'aria-label': 'Grupos planejados' }, gruposOrd.map(g => chipGrupo(a, g.id, g.nome))),
      salaAberta
        ? h('button', { class: 'btn primario bloco', onclick: () => mostrarAba('sala') }, 'Ir para a sala aberta')
        : h('button', { class: 'btn primario bloco grande', disabled: temErros(E.diags), onclick: async () => { await abrirSala(); if (E.codigo) mostrarAba('sala'); } }, 'Abrir sala'),
      !salaAberta && h('p', { class: 'sutil' }, 'Tudo certo? Abra a sala: o QR aparece aqui e no telão. Precisa mudar algo? Use “Ajustar” logo abaixo, sem sair desta tela.'),
      h('div', { class: 'linha-botoes' },
        h('button', { class: 'btn pequeno', onclick: () => abrirImpressao(a) }, 'Imprimir'),
        h('button', { class: 'btn pequeno', onclick: () => baixar(a) }, 'Baixar arquivo'),
        h('button', { class: 'btn pequeno discreto', disabled: salaAberta, title: salaAberta ? 'Encerre a sala para trocar' : null, onclick: () => { E.atividade = null; E.diags = []; salvar(); renderTudo(); } }, 'Trocar atividade'))),

    h('details', { class: 'cartao', open: !!E.ajustesAbertos, ontoggle: ev => { E.ajustesAbertos = ev.target.open; } }, h('summary', {}, h('strong', {}, 'Ajustar: tempo, competição, nomes dos grupos e meta')),
      h('h3', {}, 'Etapas'),
      etapasOrdenadas(a).map(e => {
        const t = obterTipo(e.typeId, e.typeVersion);
        return h('div', { class: 'cartao', style: { margin: '10px 0', padding: '14px' } },
          h('h3', {}, `${e.titulo}`),
          h('p', { class: 'sutil' }, `${t?.nome || e.typeId} · ${{ grupos: 'em grupos', individual: 'individual', representantes: 'entre grupos (representantes)' }[e.participacao.organizacao] || e.participacao.organizacao}`),
          h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' } },
            h('div', {}, h('label', { for: 'tempo-' + e.id }, 'Tempo (min)'),
              h('input', { id: 'tempo-' + e.id, type: 'number', min: 1, max: 120, value: e.tempoMin ?? '', onchange: ev => ajustar(x => { const v = Number(ev.target.value); x.etapas.find(y => y.id === e.id).tempoMin = v > 0 ? v : undefined; }) })),
            h('div', {}, h('label', { for: 'comp-' + e.id }, 'Competição'),
              h('select', { id: 'comp-' + e.id, onchange: ev => ajustar(x => { x.etapas.find(y => y.id === e.id).participacao.competicao = ev.target.value; }) },
                (t?.participacao.competicao || []).map(c => h('option', { value: c, selected: e.participacao.competicao === c }, { desligada: 'Desligada', meta: 'Contra a meta', entre_grupos: 'Entre grupos' }[c] || c))))));
      }),
      h('h3', {}, 'Grupos e meta'),
      a.grupos.slice().sort((x, y) => x.ordemAlocacao - y.ordemAlocacao).map(g => h('div', {},
        h('label', { for: 'gn-' + g.id }, chipGrupo(a, g.id, `Posição ${g.ordemAlocacao}`)),
        h('input', { id: 'gn-' + g.id, maxlength: 40, value: g.nome, onchange: ev => { const v = ev.target.value.trim(); if (v) ajustar(x => { x.grupos.find(y => y.id === g.id).nome = v; }); } }))),
      a.meta && h('div', {},
        h('label', { for: 'metaLimiar' }, 'Meta da turma'),
        h('select', { id: 'metaLimiar', onchange: ev => ajustar(x => { if (ev.target.value === 'off') x.meta.ativa = false; else { x.meta.ativa = true; x.meta.limiar = Number(ev.target.value); } }) },
          h('option', { value: 'off', selected: a.meta.ativa === false }, 'Sem meta'),
          [0.4, 0.5, 0.6, 0.8].map(v => h('option', { value: v, selected: a.meta.ativa !== false && a.meta.limiar === v }, `${v * 100}% de acertos`))),
        h('p', { class: 'sutil' }, a.meta.descricao || ''))),

    // Avisos e sugestões são do planejamento: na hora de aplicar ficam recolhidos, para não atrasar a abertura da sala.
    avisos + sugestoes.length > 0 && h('details', { class: 'cartao' }, h('summary', {}, h('strong', {}, `Avisos e sugestões do planejamento (${avisos + sugestoes.length})`)),
      gram && h('p', { class: 'aviso' }, gram.mensagem),
      naoErros.length > 0 && listaDiag(naoErros),
      sugestoes.length > 0 && h('div', {}, h('h3', {}, 'Sugestões de equilíbrio'),
        h('p', { class: 'sutil' }, 'São só propostas. A decisão é sua.'),
        h('ul', { class: 'diag' }, sugestoes.map(s => h('li', { class: 'info' }, s.mensagem, ' ',
          h('button', { class: 'btn pequeno discreto', onclick: () => { E.dispensadas.add(s.id); salvar(); renderAtividade(); } }, 'Dispensar')))))),

    h('details', { class: 'cartao' }, h('summary', {}, h('strong', {}, 'Material de quem conduz')),
      (a.docente?.guia || []).length > 0 && h('div', {}, h('h3', {}, 'Guia'), h('ol', {}, a.docente.guia.map(x => h('li', {}, x)))),
      h('h3', {}, 'Respostas esperadas'),
      etapasOrdenadas(a).filter(e => a.docente?.respostas?.[e.id]).map(e => {
        const r = a.docente.respostas[e.id];
        if (e.typeId === 'cartoes_arrastar') return h('div', { style: { marginBottom: '12px' } }, h('strong', {}, e.titulo + ': '), respostaEsperadaTexto(e.config, r) || 'só debate (sem posição esperada)', r.explicacao && h('p', { class: 'sutil' }, r.explicacao));
        if (T.tem(e) || ehQuadro(e)) return h('div', { style: { marginBottom: '12px' } }, h('strong', {}, e.titulo + ': '), T.respostaTexto(e) || '—', r.explicacao && h('p', { class: 'sutil' }, r.explicacao));
        if (r.perguntas) return h('details', { style: { marginBottom: '12px' } }, h('summary', {}, h('strong', {}, e.titulo), r.codigo ? ` · código: ${r.codigo}` : ''),
          h('ol', {}, (e.config?.perguntas || []).map(q => h('li', {}, q.enunciado, ' → ', h('strong', {}, respostaCerta(q, r).texto)))));
        const op = (e.config?.alternativas || e.config?.hipotesesCandidatas || []).find(o => o.id === r.corretaId);
        return h('div', { style: { marginBottom: '12px' } }, h('strong', {}, e.titulo + ': '), op?.texto || r.corretaId, h('p', { class: 'sutil' }, r.explicacao || ''));
      }),
      (a.pendencias || []).length > 0 && h('div', {}, h('h3', {}, 'Pendências'), h('ul', {}, a.pendencias.map(x => h('li', {}, x))))));
}

function listaDiag(ds) {
  return h('ul', { class: 'diag' }, ds.map(d => h('li', { class: d.severidade }, d.mensagem, h('code', {}, d.local))));
}

function cartaoCarregar() {
  const arquivo = h('input', { type: 'file', accept: '.xlsx,.json,application/json', id: 'arquivoJson' });
  arquivo.onchange = async () => {
    const f = arquivo.files[0]; if (!f) return;
    try { const r = await lerArquivoAtividade(f); if (!r.atividade) { E.importacao = r.diagnosticos; return renderAtividade(); } aceitar(r.atividade, f.name); }
    catch (e) { avisoGeral('Não foi possível ler o arquivo: ' + e.message, 'erro'); }
  };
  const minhas = h('div', { class: 'cartao', hidden: true }, h('h2', {}, 'Minhas atividades'), h('p', { class: 'sutil' }, 'Carregando…'));
  carregarMinhas(minhas);
  const colado = h('textarea', { id: 'jsonColado', placeholder: 'Ou cole aqui o JSON devolvido pela IA' });
  const cfg = { publico: '', duracaoMin: 50, numeroGrupos: 5, regime: 'fiel', preferencias: '' };
  const saida = h('textarea', { readonly: true, hidden: !E.promptGerado }, E.promptGerado);

  return h('div', {},
    minhas,
    h('div', { class: 'cartao' }, h('h1', {}, 'Escolha a atividade'),
      h('p', { class: 'sutil' }, 'Modelos prontos:'),
      h('div', { class: 'linha-botoes' }, CASOS.map((c, i) => h('button', { class: 'btn bloco' + (i === 0 ? ' primario' : ''), onclick: () => usarModelo(c) }, c.titulo)))),
    h('div', { class: 'cartao' }, h('h2', {}, 'Importar atividade'),
      h('label', { for: 'arquivoJson' }, 'Planilha (.xlsx) ou arquivo .json'), campoArquivo(arquivo),
      h('label', { for: 'jsonColado' }, 'Texto colado'), colado,
      h('div', { class: 'linha-botoes' }, h('button', { class: 'btn', onclick: () => importarTexto(colado.value, 'texto colado') }, 'Importar texto colado')),
      E.importacao.length > 0 && h('div', {}, h('p', { class: 'aviso', 'data-tipo': 'erro' }, 'O arquivo não foi aceito. Corrija os pontos abaixo (ou peça à IA para corrigir) e importe de novo. Nada foi alterado automaticamente.'), listaDiag(E.importacao))),
    h('details', { class: 'cartao' }, h('summary', {}, h('strong', {}, 'Montar com uma IA externa')),
      h('p', { class: 'sutil' }, 'Gere o prompt, cole na IA de sua preferência junto com o seu material e importe o JSON que ela devolver.'),
      h('label', { for: 'pPublico' }, 'Público'), h('input', { id: 'pPublico', placeholder: 'Ex.: Graduação em Fisioterapia, 3º período', oninput: e => cfg.publico = e.target.value }),
      h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' } },
        h('div', {}, h('label', { for: 'pDur' }, 'Duração (min)'), h('input', { id: 'pDur', type: 'number', value: 50, oninput: e => cfg.duracaoMin = Number(e.target.value) || 50 })),
        h('div', {}, h('label', { for: 'pGr' }, 'Grupos'), h('input', { id: 'pGr', type: 'number', min: 1, max: 10, value: 5, oninput: e => cfg.numeroGrupos = Math.min(10, Math.max(1, Number(e.target.value) || 5)) }))),
      h('label', { for: 'pReg' }, 'Regime'),
      h('select', { id: 'pReg', onchange: e => cfg.regime = e.target.value },
        h('option', { value: 'fiel' }, 'Fiel ao material (não inventa dados)'),
        h('option', { value: 'simulacao' }, 'Simulação (permite dados sintéticos marcados)')),
      h('label', { for: 'pPref' }, 'Preferências por etapa (opcional)'),
      h('textarea', { id: 'pPref', placeholder: 'Ex.: começar com investigação em grupos, terminar com 2 questões individuais', oninput: e => cfg.preferencias = e.target.value }),
      h('div', { class: 'linha-botoes' },
        h('button', { class: 'btn primario', onclick: async () => {
          let exemplo = null; try { exemplo = await (await fetch('casos/ciclista-altitude.json')).json(); } catch {}
          E.promptGerado = gerarPrompt({ ...cfg, organizacao: 'grupos', exemplo });
          saida.value = E.promptGerado; saida.hidden = false;
        } }, 'Gerar prompt'),
        h('button', { class: 'btn', onclick: async () => { try { await navigator.clipboard.writeText(saida.value); avisoGeral('Prompt copiado.', 'ok'); } catch { saida.select(); avisoGeral('Selecione e copie o texto do prompt.'); } } }, 'Copiar')),
      saida));
}

/** Lista da biblioteca fechada (só mestres). Some se a conta não tiver acesso. */
async function carregarMinhas(alvo) {
  if (PREVIA) return;
  let lista;
  try { lista = await b.listarBiblioteca(); } catch { return; }
  alvo.hidden = false;
  limpar(alvo, h('h2', {}, 'Minhas atividades'),
    lista.length ? h('div', { class: 'opcoes' }, lista.map(item => h('button', { class: 'opcao', style: { textAlign: 'left', color: 'inherit', font: 'inherit' }, onclick: async () => {
      try { const d = item.conteudo ? item : await b.lerBiblioteca(item.id); aceitar(JSON.parse(d.conteudo), 'biblioteca'); } catch (e) { avisoGeral('Não foi possível abrir: ' + e.message, 'erro'); }
    } }, h('span', {}, h('strong', {}, item.titulo || '(sem título)'), h('br'), h('small', { class: 'sutil' }, item.minha ? 'sua' : 'compartilhada por ' + (item.autor || 'outro mestre')))))) : h('p', { class: 'sutil' }, 'Nenhuma atividade guardada. Monte no Planejamento, no PC.'),
    h('p', { class: 'sutil' }, 'Para criar ou editar: ', h('a', { href: link('planejar.html'), target: '_blank' }, 'Planejamento')));
}

async function usarModelo(c) {
  try { aceitar(await carregarCaso(c.id), 'modelo pronto'); }
  catch (e) { avisoGeral('Não foi possível carregar o modelo: ' + e.message, 'erro'); }
}
function importarTexto(texto, origem) {
  const r = lerJsonImportado(texto);
  if (!r.atividade) { E.importacao = r.diagnosticos; return renderAtividade(); }
  aceitar(r.atividade, origem);
}
/** Relatório da aula: acertos por etapa e por grupo, sem nomes (planilha .csv). */
function baixarRelatorio() {
  relatorioBaixado = true;
  const csv = relatorioCSV(relatorioAula(A(), resultados()));
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const data = new Date().toISOString().slice(0, 10);
  const l = h('a', { href: url, download: `relatorio-${A().id || 'aula'}-${data}.csv` }); document.body.append(l); l.click(); l.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30e3);
}

function baixar(a) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(a, null, 2)], { type: 'application/json' }));
  const l = h('a', { href: url, download: (a.id || 'atividade') + '.json' }); document.body.append(l); l.click(); l.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30e3);
}

// =====================================================================
// ABA SALA
// =====================================================================
function renderSala() {
  const alvo = $('aba-sala');
  if (!A()) return limpar(alvo, h('div', { class: 'cartao' }, h('p', {}, 'Escolha uma atividade primeiro.')));
  if (!E.codigo) return limpar(alvo, h('div', { class: 'cartao' },
    h('h1', {}, 'Abrir sala'),
    h('p', {}, 'Cria um código e um QR Code para os participantes entrarem sem cadastro. Ao encerrar, todos os dados da sala são apagados.'),
    h('button', { class: 'btn primario bloco', disabled: temErros(E.diags), onclick: abrirSala }, 'Abrir sala')));
  const s = E.sala;
  if (!s) return limpar(alvo, h('div', { class: 'cartao' }, h('p', {}, 'Conectando à sala…')));
  const urlP = link('participar.html', { sala: E.codigo }), urlT = link('telao.html', { sala: E.codigo });
  const qr = h('div', { class: 'qr' }); qr.innerHTML = window.MosaicoQR.svg(urlP, { nivel: 'M', margem: 2, rotulo: 'QR Code para entrar na sala' });
  const nomes = Object.entries(s.nomes || {}).sort((x, y) => x[1].localeCompare(y[1]));

  let armado = false;
  const btnEncerrar = h('button', { class: 'btn perigo bloco', onclick: async () => {
    if (!armado) { armado = true; btnEncerrar.textContent = 'Toque de novo para encerrar e apagar tudo'; setTimeout(() => { armado = false; btnEncerrar.textContent = 'Encerrar sala'; }, 6000); return; }
    btnEncerrar.disabled = true; await encerrarSala();
  } }, 'Encerrar sala');

  limpar(alvo,
    s.fase === 'lobby' && h('div', { class: 'cartao destaque comecar-aula' },
      h('h2', {}, nomes.length ? `${pl(nomes.length, 'pessoa')} na sala` : 'Aguardando a turma entrar…'),
      h('button', { class: 'btn primario bloco grande', disabled: !nomes.length, onclick: async ev => { ev.currentTarget.disabled = true; await formarGrupos(true); } }, 'Formar grupos e começar'),
      h('p', { class: 'sutil' }, 'Os grupos são sorteados de forma equilibrada; quem chegar depois entra no grupo com menos pessoas. Para conferir ou mover alguém, use a aba Grupos.')),
    h('div', { class: 'cartao' },
      h('p', { class: 'sutil' }, 'Código da sala'), h('div', { class: 'codigo' }, E.codigo),
      h('div', { style: { margin: '14px 0' } }, qr),
      h('div', { class: 'linha-botoes' },
        h('button', { class: 'btn', onclick: async () => { try { await navigator.clipboard.writeText(urlP); avisoGeral('Link copiado.', 'ok'); } catch { avisoGeral(urlP); } } }, 'Copiar link de entrada'),
        h('a', { class: 'btn', href: urlT, target: '_blank', rel: 'noopener' }, 'Abrir telão')),
      h('p', { class: 'sutil' }, 'No PC da sala, abra ', h('strong', {}, link('telao.html').replace(/^https?:\/\//, '').replace(/\.html(?=\?|$)/, '')), ' e digite o código: o telão abre sozinho.'),
      !EM_ENSAIO && h('details', {}, h('summary', {}, 'Testar com meu celular (turma fictícia no PC)'),
        h('p', { class: 'sutil' }, 'Ensaio geral com esta sala de verdade: abra no PC o endereço abaixo. Ele mostra o telão em cima e a turma fictícia embaixo, e você conduz por aqui normalmente. Ao terminar, encerre a sala.'),
        h('p', {}, h('a', { href: link('simulador.html', { sala: E.codigo }), target: '_blank', rel: 'noopener' }, link('simulador.html', { sala: E.codigo }).replace('simulador.html', 'simulador').replace(/^https?:\/\//, '')))),
      h('button', { class: 'btn bloco', onclick: () => b.atualizarSala(E.codigo, { entradaAberta: !s.entradaAberta }).catch(falha) }, s.entradaAberta ? 'Fechar a entrada' : 'Reabrir a entrada'),
      h('p', { class: 'sutil' }, s.entradaAberta ? 'Entrada aberta: novos participantes podem entrar. Depois da formação dos grupos, quem chega vai para o grupo com menos pessoas.' : 'Entrada fechada.')),
    h('div', { class: 'cartao' }, h('h2', {}, `${pl(nomes.length, 'participante')}`),
      nomes.length ? h('ul', {}, nomes.map(([u, n]) => h('li', {}, n, ' ', grupoDoUid(u) && chip(grupoDoUid(u))))) : h('p', { class: 'sutil' }, 'Ninguém entrou ainda.')),
    EM_ENSAIO && h('div', { class: 'cartao' }, h('h2', {}, 'Ensaio'),
      h('p', { class: 'sutil' }, 'Abra a tela de participante em outras abas ou acrescente participantes simulados.'),
      h('div', { class: 'linha-botoes' },
        h('button', { class: 'btn', onclick: () => simularEntradas(5) }, '+5 simulados'),
        h('button', { class: 'btn', onclick: () => simularEntradas(1) }, '+1 simulado'),
        h('a', { class: 'btn', href: urlP, target: '_blank' }, 'Abrir aba de participante'))),
    h('div', { class: 'cartao' },
      (s.encerradas || []).length > 0 && h('button', { class: 'btn bloco', style: { marginBottom: '10px' }, onclick: baixarRelatorio }, 'Baixar relatório da aula (planilha)'),
      btnEncerrar, h('p', { class: 'sutil' }, 'Encerrar apaga participantes, envios e a sala. Os resultados não ficam guardados: baixe o relatório antes.')));
}

async function abrirSala() {
  try {
    const codigo = await b.criarSala({
      owner: E.conta.uid, status: 'open', entradaAberta: true, fase: 'lobby', publico: publico(),
      nomes: {}, composicao: {}, representantes: {}, executores: {}, leitoresExtra: {},
      etapaAtual: null, etapaInfo: null, progresso: null, escala: null, encerradas: [], final: null, revelacao: null, jogo: null
    });
    E.contingencias = []; E.envios = []; E.jogo = {}; E.pub = {}; relatorioBaixado = false;
    marcarPendente(codigo, true);
    conectarSala(codigo); salvar(); renderTudo();
    if (PREVIA && window.parent !== window) window.parent.postMessage({ tipo: 'mosaico-previa-sala', codigo }, location.origin);
  } catch (e) { falha(e); }
}

function conectarSala(codigo) {
  E.codigo = codigo;
  inscricoes.forEach(f => f()); inscricoes = [];
  inscricoes.push(b.observarSala(codigo, s => {
    E.sala = s;
    if (!s) { E.codigo = null; salvar(); avisoGeral('A sala não existe mais.', 'alerta'); }
    renderSala(); renderGrupos(); renderConducao(); renderTopo();
    sincronizarProgresso(); atualizarJogo();
  }, falha));
  inscricoes.push(b.observarMembros(codigo, aoMudarMembros, falha));
  inscricoes.push(b.observarEnvios(codigo, lista => { E.envios = lista; atualizarJogo(); renderConducao(); sincronizarProgresso(); }, falha));
  clearInterval(relogio); relogio = setInterval(() => {
    const r = document.getElementById('relogioConducao'); if (r && E.sala?.etapaInfo) r.textContent = contagemRegressiva(E.sala.etapaInfo.inicio, E.sala.etapaInfo.tempoMin, E.sala.etapaInfo.pausadoEm);
    verificarTempoQuiz(); T.tique();
  }, 1000);
}

async function aoMudarMembros(lista) {
  E.membros = lista;
  const s = E.sala; if (!s) return;
  const patch = {}, nomes = { ...(s.nomes || {}) };
  let mudou = false;
  for (const m of lista) if (nomes[m.uid] !== m.nome) { nomes[m.uid] = m.nome; mudou = true; }
  if (mudou) patch.nomes = nomes;
  if (s.fase !== 'lobby') {
    // Entrada tardia: vai para o grupo com menor ocupação (desempate pela ordem de alocação).
    let comp = { ...s.composicao }; const reps = { ...s.representantes }, entrou = [];
    for (const m of lista) {
      if (Object.values(comp).some(arr => arr.includes(m.uid))) continue;
      const g = grupoParaEntradaTardia(A().grupos, comp);
      comp = { ...comp, [g]: [...(comp[g] || []), m.uid] };
      if (!reps[g]) reps[g] = m.uid;
      entrou.push(`${m.nome} → ${nomeGrupo(g)}`);
    }
    if (entrou.length) { patch.composicao = comp; patch.representantes = reps; avisoGeral('Entrada tardia: ' + entrou.join(', '), 'info'); }
  }
  if (Object.keys(patch).length) await b.atualizarSala(E.codigo, patch).catch(falha);
}

async function encerrarSala() {
  const c = E.codigo;
  inscricoes.forEach(f => f()); inscricoes = [];
  try { await b.apagarSala(c); marcarPendente(c, false); avisoGeral('Sala encerrada. Nenhum dado dos participantes ficou guardado.', 'ok'); }
  catch (e) {
    try { await b.atualizarSala(c, { status: 'closed' }); } catch {}
    avisoGeral('Sala encerrada, mas os dados não puderam ser apagados agora. Eles serão apagados na próxima vez que você entrar aqui.', 'alerta');
  }
  E.codigo = null; E.sala = null; E.envios = []; E.membros = []; E.contingencias = []; E.jogo = {};
  salvar(); renderTudo();
  receberDoPlanejamento();   // “Dar esta aula” enquanto havia sala aberta: agora entra
}

/** Salas que ficaram abertas (aba fechada, internet caiu) são apagadas quando a mesma pessoa volta. */
async function faxina() {
  for (const c of pendentes()) {
    if (c === E.codigo) continue;
    try {
      const s = await b.lerSala(c);
      if (!s || s.owner !== E.conta.uid) { marcarPendente(c, false); continue; }
      const criada = typeof s.createdAt === 'number' ? s.createdAt : s.createdAt?.toMillis?.() || 0;
      if (s.status === 'closed' || Date.now() - criada > 6 * 3600e3) { await b.apagarSala(c); marcarPendente(c, false); }
    } catch (e) { console.warn('faxina', c, e); }
  }
  // Salas da mesma conta abertas em outro aparelho: o servidor sabe quais são. Apaga as vencidas (prazo de 24 h) e as já fechadas.
  for (const s of await b.listarMinhasSalas().catch(() => [])) {
    if (s.codigo === E.codigo || !(s.status === 'closed' || (s.venceEm && s.venceEm < Date.now()))) continue;
    try { await b.apagarSala(s.codigo); marcarPendente(s.codigo, false); } catch (e) { console.warn('faxina', s.codigo, e); }
  }
}

// =====================================================================
// ABA GRUPOS
// =====================================================================
function renderGrupos() {
  const alvo = $('aba-grupos'), s = E.sala;
  if (!A() || !E.codigo || !s) return limpar(alvo, h('div', { class: 'cartao' }, h('p', {}, 'Abra a sala primeiro.')));
  const a = A(), n = Object.keys(s.nomes || {}).length;
  const comecou = !!s.etapaAtual || (s.encerradas || []).length > 0;

  if (s.fase === 'lobby') {
    const vagas = n ? calcularVagas(a.grupos, n) : [];
    return limpar(alvo, h('div', { class: 'cartao' },
      h('h1', {}, 'Formar grupos'),
      h('p', {}, `${pl(n, 'participante')} para ${a.grupos.length} grupos planejados.`),
      n > 0 && h('p', { class: 'sutil' }, 'Tamanhos: ' + vagas.map(v => `${nomeGrupo(v.grupoId)} ${v.vagas}`).join(' · ')),
      n > 0 && n < a.grupos.length && h('p', { class: 'aviso', 'data-tipo': 'alerta' }, 'Há menos participantes que grupos: alguns grupos ficarão vazios. Os grupos não são removidos; durante as etapas você poderá pedir a outro grupo para cobrir a tarefa.'),
      h('button', { class: 'btn primario bloco', disabled: !n, onclick: formarGrupos }, 'Sortear grupos equilibrados')));
  }

  const diag = diagnosticarComposicao(a.grupos, s.composicao || {});
  limpar(alvo,
    !diag.equilibrada && h('p', { class: 'aviso', 'data-tipo': 'alerta' }, `Composição desequilibrada (diferença de ${diag.diferenca} pessoas entre grupos). Isso é permitido; confira se é o que você quer.`),
    diag.gruposVazios.length > 0 && h('p', { class: 'aviso', 'data-tipo': 'alerta' }, 'Sem participantes: ' + diag.gruposVazios.map(nomeGrupo).join(', ') + '. Na etapa, use “Pedir a outro grupo” ou “Registrar pela condução”.'),
    h('div', { class: 'grade-grupos' }, [...a.grupos].sort((x, y) => x.ordemAlocacao - y.ordemAlocacao).map(g => {
      const membros = s.composicao?.[g.id] || [], rep = s.representantes?.[g.id];
      return h('div', { class: 'grupo', style: { '--cor': corDoGrupo(a, g.id) } },
        h('h3', { class: 'titulo-grupo' }, iconeGrupo(a, g.id, 34), g.nome, h('small', {}, ` · ${membros.length}`)),
        membros.length ? h('ul', {}, membros.map(u => h('li', { class: u === rep ? 'eh-rep' : null },
          h('span', {}, nomeDe(u), u === rep && h('span', { class: 'rep' }, ' REP')),
          h('span', { style: { display: 'flex', gap: '6px' } },
            u !== rep && h('button', { class: 'btn pequeno discreto', title: 'Tornar representante', 'aria-label': 'Tornar ' + nomeDe(u) + ' representante', onclick: () => b.atualizarSala(E.codigo, { representantes: { ...s.representantes, [g.id]: u } }).catch(falha) }, '★'),
            h('select', { 'aria-label': 'Mover ' + nomeDe(u), onchange: ev => mover(u, ev.target.value) },
              a.grupos.map(x => h('option', { value: x.id, selected: x.id === g.id }, x.nome)))))))
          : h('p', { class: 'sutil' }, 'Sem participantes'));
    })),
    h('div', { class: 'linha-botoes' }, h('button', { class: 'btn', disabled: comecou, onclick: formarGrupos }, 'Sortear de novo')),
    comecou && h('p', { class: 'sutil' }, 'A atividade já começou: o sorteio não pode ser refeito, mas você pode mover pessoas.'));
}

async function formarGrupos(eComecar = false) {
  const uids = Object.keys(E.sala.nomes || {});
  if (!uids.length) return avisoGeral('Ninguém entrou ainda.', 'alerta');
  const r = distribuir(A().grupos, uids);
  const reps = {};
  for (const g of A().grupos) if (r.composicao[g.id].length) reps[g.id] = r.composicao[g.id][0];
  await b.atualizarSala(E.codigo, { composicao: r.composicao, representantes: reps, executores: {}, leitoresExtra: {}, fase: 'grupos' }).catch(falha);
  mostrarAba(eComecar === true ? 'conducao' : 'grupos');
  if (eComecar === true) avisoGeral('Grupos formados: o telão mostra “Encontre seu grupo”. Com a turma reunida, inicie a primeira etapa.', 'ok');
}

async function mover(uid, destino) {
  const s = E.sala, origem = grupoDoUid(uid);
  if (origem === destino) return;
  const comp = moverParticipante(s.composicao, uid, destino), reps = { ...s.representantes };
  if (reps[origem] === uid) { if (comp[origem].length) reps[origem] = comp[origem][0]; else delete reps[origem]; }
  if (!reps[destino]) reps[destino] = uid;
  await b.atualizarSala(E.codigo, { composicao: comp, representantes: reps }).catch(falha);
}

// =====================================================================
// ABA CONDUÇÃO
// =====================================================================
function resultados() {
  return E.envios.filter(e => e.escopo !== 'tentativa').map(e => montarResultado({
    etapaId: e.etapaId,
    grupoPlanejadoId: e.escopo === 'grupo' ? e.grupoId : null,
    participanteId: e.escopo === 'participante' ? e.autor : null,
    autoria: { tipo: e.autor === E.conta.uid ? 'conducao' : e.escopo, uid: e.autor, grupoId: grupoDoUid(e.autor), contingencia: !!e.contingencia },
    dados: e.dados
  })).concat(resultadosDesafios());
}

function calcularProgresso() {
  const s = E.sala; if (!s || s.fase !== 'etapa' || !A()) return null;
  const e = etapa(s.etapaAtual); if (!e) return null;
  const envs = E.envios.filter(x => x.etapaId === e.id);
  if (e.typeId === 'montagem_pecas') return { montagem: true, enviados: 0, esperados: 0, porGrupo: {}, porParticipante: {} };
  if (e.typeId === 'cadeado_grupo') {
    const est = estadoAtualCadeado(e); if (!est) return null;
    const porGrupo = Object.fromEntries(Object.entries(est).map(([g, G]) => [g, { acertos: G.acertos, necessarios: G.necessarios, total: G.totalFragmentos, membros: G.membros, destravado: G.destravado, posicao: G.posicao ?? null }]));
    return { cadeado: true, regra: e.config.regra, porGrupo, enviados: Object.values(est).filter(G => G.destravado).length, esperados: Object.keys(est).length };
  }
  if (e.typeId === 'quiz_grupos') return { quiz: true };
  if (ehQuadro(e)) {
    const est = estadoAtualCartoes(e); if (!est) return null;
    const porGrupo = Object.fromEntries(Object.entries(est).map(([g, S]) => [g, { colocados: S.colocados, total: Object.keys(S.quadro).length, confirmacoes: S.confirmacoes, travado: S.travado, concluido: S.concluido, posicao: S.posicao ?? null, liberaEm: S.liberaEm }]));
    return { cartoes: true, formato: motorQuadro(e).c.formato, organizacao: e.participacao.organizacao, porGrupo, enviados: Object.values(est).filter(S => S.travado).length, esperados: Object.keys(est).length };
  }
  if (T.tem(e)) return T.progresso(e);
  if (e.participacao.organizacao === 'individual') {
    const por = {}; envs.filter(x => x.escopo === 'participante').forEach(x => { por[x.autor] = true; });
    return { enviados: Object.keys(por).length, esperados: Object.keys(s.nomes || {}).length, porGrupo: {}, porParticipante: por };
  }
  const por = {}; envs.filter(x => x.escopo === 'grupo').forEach(x => { por[x.grupoId] = true; });
  const esperados = A().grupos.filter(g => (s.composicao?.[g.id] || []).length || s.executores?.[g.id] || por[g.id]).length;
  return { enviados: Object.keys(por).length, esperados, porGrupo: por, porParticipante: {} };
}
async function sincronizarProgresso() {
  const p = calcularProgresso();
  if (p && JSON.stringify(p) !== JSON.stringify(E.sala.progresso)) await b.atualizarSala(E.codigo, { progresso: p }).catch(falha);
}

function renderConducao() {
  const alvo = $('aba-conducao'), s = E.sala;
  if (!A() || !E.codigo || !s) return limpar(alvo, h('div', { class: 'cartao' }, h('p', {}, 'Abra a sala e forme os grupos primeiro.')));
  if (s.fase === 'lobby') return limpar(alvo, h('div', { class: 'cartao' }, h('p', {}, 'Forme os grupos na aba Grupos para começar.'), h('button', { class: 'btn primario', onclick: () => mostrarAba('grupos') }, 'Ir para Grupos')));

  const encerradas = new Set(s.encerradas || []);
  const seq = etapasOrdenadas(A());
  const proxima = !s.etapaAtual ? seq.find(e => !encerradas.has(e.id)) : null;
  const res = resultados();

  limpar(alvo,
    seq.map(e => {
      const t = obterTipo(e.typeId, e.typeVersion);
      const atual = s.etapaAtual === e.id && s.fase === 'etapa', feita = encerradas.has(e.id);
      const caixa = h('div', { class: 'cartao' + (atual ? ' destaque' : '') },
        h('div', { class: 'etapa-linha' }, ilustra(e.typeId, 44), h('div', { style: { flex: 1, minWidth: 0 } }, h('h3', {}, e.titulo), h('div', { class: 'tipo' }, `${t?.nome} · ${{ grupos: 'grupos', individual: 'individual', representantes: 'entre grupos (representantes)' }[e.participacao.organizacao] || e.participacao.organizacao}${e.tempoMin ? ' · ' + e.tempoMin + ' min' : ''}`)),
          h('span', { class: 'estado ' + (feita ? 'ok' : atual ? 'pend' : '') }, feita ? 'encerrada' : atual ? 'em andamento' : '')));
      if (atual) caixa.append(painelEtapaAtual(e));
      else if (proxima?.id === e.id && s.fase !== 'final') caixa.append(painelProxima(e, res));
      if (feita || atual) caixa.append(resumoEnvios(e));
      if(feita) { const resumo=caixa.firstChild; const d=h('details',{class:'cartao etapa-concluida'},h('summary',{},resumo)); while(caixa.firstChild)d.append(caixa.firstChild); return d; }
      return caixa;
    }),
    s.fase !== 'final' && !s.etapaAtual && seq.every(e => encerradas.has(e.id)) && h('div', { class: 'cartao destaque' },
      h('h2', {}, 'Todas as etapas encerradas'),
      h('p', {}, 'Revelar mostra o resultado da meta e as explicações no telão e nos celulares.'),
      h('button', { class: 'btn primario bloco', onclick: revelarFinal }, 'Revelar resultado final')),
    s.fase === 'final' && h('div', { class: 'cartao destaque' }, h('h2', {}, 'Resultado revelado'),
      s.final?.meta && h('p', {}, `${s.final.meta.acertos} de ${s.final.meta.total} acertos · meta ${Math.round(s.final.meta.limiar * 100)}% · ${s.final.meta.atingida ? 'atingida' : 'não atingida'}`),
      h('button', { class: 'btn bloco', onclick: baixarRelatorio }, 'Baixar relatório da aula (planilha)'),
      h('p', { class: 'sutil' }, 'Acertos por etapa e por grupo, sem nomes. Baixe antes de encerrar: ao encerrar a sala, tudo é apagado.'),
      h('p', { class: 'sutil' }, 'Quando terminar a discussão, encerre a sala na aba Sala.')),
    EM_ENSAIO && s.fase === 'etapa' && h('div', { class: 'cartao' }, h('h3', {}, 'Ensaio'), h('button', { class: 'btn', onclick: pilotoAutomatico }, 'Simulados enviam agora')));
  melhorarConducao({alvo,atividade:A(),sala:s,atualizarSala:patch=>b.atualizarSala(E.codigo,patch),encerrarSala,baixarRelatorio,relatorioBaixado,falha});
}

function painelEtapaAtual(e) {
  const s = E.sala, p = s.progresso || {};
  const caixa = h('div', {});
  if (e.typeId === 'montagem_pecas') {
    caixa.append(h('p', {}, h('strong', { id: 'relogioConducao' }, contagemRegressiva(s.etapaInfo?.inicio, s.etapaInfo?.tempoMin, s.etapaInfo?.pausadoEm)), ' · montagem em andamento'),
      h('p', { class: 'sutil' }, e.participacao.organizacao === 'representantes' ? 'Os representantes de cada grupo montam juntos, com as peças nos celulares.' : 'Cada grupo monta as peças com os próprios celulares.'),
      h('p', { class: 'sutil' }, 'Não há envio: a etapa vale pelo tempo. Encerre quando achar adequado.'));
    caixa.append(h('button', { class: 'btn primario bloco', onclick: encerrarEtapa }, 'Encerrar etapa'));
    return caixa;
  }
  if (e.typeId === 'cadeado_grupo') return painelCadeado(e, caixa);
  if (e.typeId === 'quiz_grupos') return painelQuiz(e, caixa);
  if (ehQuadro(e)) return painelCartoes(e, caixa);
  if (T.tem(e)) return T.painel(e, caixa);
  caixa.append(h('p', {}, h('strong', { id: 'relogioConducao' }, contagemRegressiva(s.etapaInfo?.inicio, s.etapaInfo?.tempoMin, s.etapaInfo?.pausadoEm)), ' · ', `${p.enviados ?? 0} de ${p.esperados ?? 0} ${e.participacao.organizacao === 'individual' ? 'responderam' : 'grupos enviaram'}`));
  if (e.participacao.organizacao === 'grupos') {
    caixa.append(h('ul', { class: 'diag' }, A().grupos.map(g => {
      const ok = p.porGrupo?.[g.id], vazio = !(s.composicao?.[g.id] || []).length, cobre = s.executores?.[g.id];
      if(ok) return h('li',{class:'info'},chip(g.id),h('span',{class:'estado ok'},'enviou'));
      const texto=cobre?'coberto por '+nomeGrupo(grupoDoUid(cobre)):vazio?'sem participantes':'aguardando envio';
      return h('li',{class:'grupo-atencao'},h('details',{open:gruposExpandidos.has(g.id),ontoggle:ev=>{if(ev.target.open)gruposExpandidos.add(g.id);else gruposExpandidos.delete(g.id);}},h('summary',{},chip(g.id),' ',h('span',{class:'estado '+(vazio?'vazio':'pend')},texto)),h('div',{class:'linha-botoes'},h('button',{class:'btn pequeno',onclick:()=>dialogoCobrir(e,g.id)},'Pedir a outro grupo'),h('button',{class:'btn pequeno',onclick:()=>dialogoRegistrar(e,g.id)},'Registrar resposta pelo professor'))));
    })));
  }
  let armado = false;
  const faltam = (p.esperados ?? 0) - (p.enviados ?? 0);
  const btn = h('button', { class: 'btn primario bloco', onclick: () => {
    if (faltam > 0 && !armado) { armado = true; btn.textContent = `Ainda faltam ${faltam}. Toque de novo para encerrar assim mesmo`; setTimeout(() => { armado = false; btn.textContent = 'Encerrar etapa'; }, 6000); return; }
    encerrarEtapa();
  } }, 'Encerrar etapa');
  caixa.append(btn);
  return caixa;
}

function painelProxima(e, res) {
  const pr = prontidaoEtapa(A(), e.id, res, E.contingencias);
  const caixa = h('div', {});
  const vazios = e.participacao.organizacao === 'grupos' ? A().grupos.filter(g => !(E.sala.composicao?.[g.id] || []).length) : [];
  if (vazios.length) caixa.append(h('p', { class: 'aviso', 'data-tipo': 'alerta' }, 'Sem participantes: ' + vazios.map(g => g.nome).join(', ') + '. Durante a etapa, peça a outro grupo para cobrir ou registre pela condução.'));
  if (!pr.pronta) {
    const falt = pr.conferencia?.faltantes || [];
    caixa.append(h('p', { class: 'aviso', 'data-tipo': 'alerta' }, pr.motivo + (falt.length ? ' Faltam: ' + falt.map(f => nomeGrupo(f.grupoId)).join(', ') + '.' : '')),
      h('p', { class: 'sutil' }, 'Você pode seguir registrando a ausência: os outros grupos verão só as contribuições que existem.'),
      h('button', { class: 'btn bloco', onclick: () => {
        for (const f of falt) E.contingencias.push(registrarContingencia({ etapaId: f.etapaId, grupoPlanejadoId: f.grupoId, tipo: 'aceitar_parcial_registrado', observacao: 'Ausência aceita por quem conduz' }));
        salvar(); renderConducao();
      } }, 'Registrar ausência e liberar'));
    return caixa;
  }
  if (pr.parcial) caixa.append(h('p', { class: 'aviso' }, pr.motivo));
  caixa.append(h('button', { class: 'btn primario bloco', onclick: () => iniciarEtapa(e) }, 'Iniciar etapa'));
  return caixa;
}

function resumoEnvios(e) {
  if (e.typeId === 'cadeado_grupo' || e.typeId === 'quiz_grupos' || ehQuadro(e)) return resumoDesafio(e);
  if (T.tem(e)) return T.resumo(e);
  const envs = E.envios.filter(x => x.etapaId === e.id);
  if (!envs.length) return h('span');
  const correta = A().docente?.respostas?.[e.id]?.corretaId;
  if (e.participacao.organizacao === 'individual') {
    const n = envs.length, ac = correta ? envs.filter(x => x.dados?.alternativaId === correta).length : null;
    return h('p', { class: 'sutil' }, `${pl(n, 'resposta')}` + (ac !== null ? ` · ${pl(ac, 'correta')} (${Math.round(100 * ac / n)}%) — só você vê` : ''));
  }
  const opcoes = e.config?.hipotesesCandidatas || [];
  return h('details', {}, h('summary', {}, `Envios (${envs.length}) — só você vê`),
    h('ul', { class: 'diag' }, envs.map(x => {
      const hip = opcoes.find(o => o.id === x.dados?.hipoteseId);
      return h('li', { class: correta ? (x.dados?.hipoteseId === correta ? 'info' : 'aviso') : 'info' },
        chip(x.grupoId), ' ', hip?.texto || '—',
        x.contingencia && h('small', {}, ` (contingência: ${x.autor === E.conta.uid ? 'registrado pela condução' : 'executado por ' + nomeGrupo(grupoDoUid(x.autor))})`),
        x.dados?.justificativa && h('p', { class: 'sutil' }, '“' + x.dados.justificativa + '”'));
    })));
}

async function iniciarEtapa(e) {
  const res = resultados();
  const pr = prontidaoEtapa(A(), e.id, res, E.contingencias);
  if (!pr.pronta) return avisoGeral(pr.motivo, 'alerta');
  try {
    if (e.typeId === 'montagem_pecas') { avisoGeral('Preparando as peças…'); await prepararMontagem(e); avisoGeral(''); }
    else if (e.typeId === 'cadeado_grupo') prepararCadeadoEtapa(e);
    else if (ehQuadro(e)) prepararCartoesEtapa(e);
    else if (T.tem(e)) await T.preparar(e);
    else if (e.typeId === 'quiz_grupos') { E.jogo[e.id] = { tipo: 'quiz', fila: [], idx: -1, vez: null, historico: [], placar: {} }; salvar(); }
    else if (e.participacao.organizacao === 'grupos') for (const g of A().grupos) await b.gravarPacote(E.codigo, g.id, projecaoGrupo(A(), e.id, g.id, res));
    else await b.gravarPacote(E.codigo, 'individual', projecaoGrupo(A(), e.id, null, res));
    if (T.temMidia(e)) await T.gravarMidia(e);
    await b.atualizarSala(E.codigo, {
      fase: 'etapa', etapaAtual: e.id, executores: {}, leitoresExtra: {}, progresso: null, revelacao: T.temMidia(e) ? e.id : null, jogo: e.typeId === 'quiz_grupos' ? projecaoQuiz(e) : T.tem(e) ? T.jogoInicial(e) : null,
      etapaInfo: { titulo: e.titulo, ordem: e.ordem, typeId: e.typeId, organizacao: e.participacao.organizacao, tempoMin: e.tempoMin ?? null, inicio: Date.now(), instrucao: e.instrucao || '', ocultarAoFim: e.typeId === 'montagem_pecas' ? e.config.ocultarAoFim !== false : false,
        formato: e.config?.formato || e.config?.tarefa || null, quadro: ehQuadro(e), midia: T.temMidia(e) }
    });
  } catch (err) { falha(err); }
}

/** Montagem: corta as peças e entrega uma (ou mais) a cada celular, em ordem embaralhada. */
async function prepararMontagem(e) {
  const s = E.sala, c = e.config, todos = Object.keys(s.nomes || {});
  const conjuntos = e.participacao.organizacao === 'representantes'
    ? [{ nome: 'representantes', uids: A().grupos.map(g => s.executores?.[g.id] || s.representantes?.[g.id]).filter(Boolean) }]
    : A().grupos.map(g => ({ nome: g.id, uids: s.composicao?.[g.id] || [] })).filter(x => x.uids.length);
  const comPeca = new Set();
  for (const conj of conjuntos) {
    const pecas = await montarPecasEtapa(c, conj.uids.length);
    const mapa = distribuirPecas(pecas.length, conj.uids);
    for (const [uid, idx] of mapa) {
      comPeca.add(uid);
      await b.gravarPacote(E.codigo, uid, { etapaId: e.id, titulo: e.titulo, instrucao: e.instrucao || '', tipo: 'montagem', conjunto: conj.nome, total: pecas.length, pecas: idx.map(i => pecas[i]) });
    }
  }
  const motivo = e.participacao.organizacao === 'representantes' ? 'representantes' : 'sobrou';
  for (const uid of todos) if (!comPeca.has(uid)) await b.gravarPacote(E.codigo, uid, { etapaId: e.id, titulo: e.titulo, instrucao: e.instrucao || '', tipo: 'montagem', conjunto: null, total: 0, pecas: [], motivo });
}

async function encerrarEtapa() {
  const s = E.sala, a = A();
  const emJogo = etapa(s.etapaAtual);
  if (emJogo?.typeId === 'quiz_grupos') await fecharVezQuiz(emJogo, 'encerrada');
  const enc = [...new Set([...(s.encerradas || []), s.etapaAtual])];
  const patch = { fase: 'revisao', etapaAtual: null, encerradas: enc, executores: {}, leitoresExtra: {} };
  const atual = etapa(s.etapaAtual);
  if (atual?.typeId === 'montagem_pecas' && atual.config.revelarAoEncerrar) {
    // o telão mostra o todo montado, na ordem certa, para a discussão
    const todo = atual.config.modo === 'imagem' ? { tipo: 'imagem', dados: atual.config.imagem.dados } : { tipo: 'texto', pecas: (await montarPecasEtapa(atual.config, 0)).map(p => p.texto) };
    await b.gravarPacote(E.codigo, 'revelacao', { etapaId: atual.id, titulo: atual.titulo, ...todo }).catch(falha);
    patch.revelacao = atual.id;
  }
  if (ehQuadro(atual)) patch.jogo = projecaoCartoesFinal(atual);
  else if (T.tem(atual)) { await T.encerrar(atual); patch.jogo = T.jogoFinal(atual); }
  if (T.temMidia(atual)) patch.revelacao = atual.id;
  if (a.meta && a.meta.ativa !== false) {
    const parcial = calcularMeta({ ...a, meta: { ...a.meta, etapas: a.meta.etapas.filter(id => enc.includes(id)) } }, resultados());
    if (parcial && parcial.total) patch.escala = escalaDesempenho(parcial);
  }
  await b.atualizarSala(E.codigo, patch).catch(falha);
}

async function revelarFinal() {
  const a = A(), meta = calcularMeta(a, resultados());
  const explicacoes = etapasOrdenadas(a).filter(e => a.docente?.respostas?.[e.id]).map(e => {
    const r = a.docente.respostas[e.id];
    if (e.typeId === 'cartoes_arrastar') return { titulo: e.titulo, resposta: respostaEsperadaTexto(e.config, r), explicacao: r.explicacao || '' };
    if (T.tem(e) || ehQuadro(e)) return { titulo: e.titulo, resposta: T.respostaTexto(e), explicacao: r.explicacao || '' };
    if (r.perguntas) return { titulo: e.titulo, resposta: r.codigo ? 'código ' + String(r.codigo).split(';')[0].trim() : '', explicacao: r.explicacao || '' };
    const op = (e.config?.alternativas || e.config?.hipotesesCandidatas || []).find(o => o.id === r.corretaId);
    return { titulo: e.titulo, resposta: op?.texto || '', explicacao: r.explicacao || '' };
  });
  await b.atualizarSala(E.codigo, { fase: 'final', etapaAtual: null, final: { meta, explicacoes } }).catch(falha);
}


// =====================================================================
// CADEADO DO GRUPO e QUIZ ENTRE GRUPOS
// O gabarito fica aqui; os celulares recebem só "certo/errado" e, no cadeado por
// fragmentos, o pedaço de quem acertou.
// =====================================================================
const tMs = x => typeof x === 'number' ? x : x?.toMillis?.() ?? Date.now();
const lider = g => E.sala?.executores?.[g] || E.sala?.representantes?.[g] || null;
const tentativas = etapaId => E.envios.filter(x => x.etapaId === etapaId && x.escopo === 'tentativa')
  .map(x => ({ id: x.id, autor: x.autor, grupoId: x.grupoId, dados: x.dados, t: tMs(x.enviadoEm) }));
let fila = Promise.resolve();
const emSerie = fn => (fila = fila.then(fn).catch(falha));   // gravações na ordem, sem atropelar
// Tipos novos (pares na memória, corrida, cruzadas, quiz que faz pensar, análise de imagem): js/conduzir-tipos.js
const T = criarTipos({ E, b, A: () => A(), etapa: id => etapa(id), lider: g => lider(g), grupoDoUid: u => grupoDoUid(u), nomeGrupo: g => nomeGrupo(g), nomeDe: u => nomeDe(u), chip: g => chip(g),
  tentativas: id => tentativas(id), salvar: () => salvar(), falha: e => falha(e), encerrarEtapa: () => encerrarEtapa(), renderConducao: () => renderConducao(), emSerie: fn => emSerie(fn), avisoGeral: (t, k) => avisoGeral(t, k),
  ehQuadro: e => ehQuadro(e), motorQuadro: e => motorQuadro(e), estadoAtualCartoes: e => estadoAtualCartoes(e) });

/** Recalcula e publica o que mudou (chamado a cada envio e a cada mudança da sala). */
function atualizarJogo() {
  const s = E.sala; if (!s || s.fase !== 'etapa' || !A()) return;
  const e = etapa(s.etapaAtual); if (!e) return;
  if (e.typeId === 'cadeado_grupo') emSerie(() => publicarCadeado(e));
  if (e.typeId === 'quiz_grupos') emSerie(() => avaliarVezQuiz(e));
  if (ehQuadro(e)) emSerie(() => publicarCartoes(e));
  else if (T.tem(e)) emSerie(() => T.publicar(e));
}

function resultadosDesafios() {
  const out = [];
  for (const e of A()?.etapas || []) {
    const j = E.jogo[e.id]; if (!j) continue;
    if (j.tipo === 'cadeado') for (const [g, G] of Object.entries(estadoAtualCadeado(e) || {}))
      out.push(montarResultado({ etapaId: e.id, grupoPlanejadoId: g, autoria: { tipo: 'grupo', grupoId: g }, dados: { acertou: G.destravado } }));
    if (j.tipo !== 'cartoes' && T.tem(e)) { out.push(...T.resultados(e)); continue; }
    if (j.tipo === 'cartoes') {
      if (soDebate(e)) continue;   // só debate: não é avaliado
      for (const [g, S] of Object.entries(estadoAtualCartoes(e) || {}))
        out.push(montarResultado({ etapaId: e.id, grupoPlanejadoId: g === 'representantes' ? null : g, autoria: { tipo: 'grupo', grupoId: g }, dados: { acertou: !!(S.travado && S.ultimo?.certo), acertos: S.ultimo?.acertos ?? 0, total: S.ultimo?.total ?? 0 } }));
    }
    if (j.tipo === 'quiz') for (const r of j.historico)
      out.push(montarResultado({ etapaId: e.id, grupoPlanejadoId: r.grupoId, autoria: { tipo: 'grupo', grupoId: r.grupoId }, dados: { acertou: r.acertou, pergunta: r.idx } }));
  }
  return out;
}

// ---------------- cadeado ----------------
function prepararCadeadoEtapa(e) {
  const s = E.sala;
  const grupos = A().grupos.map(g => ({ id: g.id, uids: s.composicao?.[g.id] || [] })).filter(x => x.uids.length);
  E.jogo[e.id] = { tipo: 'cadeado', prep: prepararCadeado(e.config, grupos) };
  E.pub = {};
  salvar();
}
function estadoAtualCadeado(e) {
  const j = E.jogo[e.id]; if (!j?.prep) return null;
  return estadoCadeado(e.config, A().docente?.respostas?.[e.id], j.prep, tentativas(e.id));
}
async function publicarCadeado(e) {
  const est = estadoAtualCadeado(e); if (!est) return;
  const c = e.config, comTarefa = new Set();
  const base = { etapaId: e.id, titulo: e.titulo, instrucao: e.instrucao || '', tipo: 'cadeado', regra: c.regra, espera: c.espera ?? 30 };
  const resumo = G => ({ acertos: G.acertos, necessarios: G.necessarios, membros: G.membros, total: G.totalFragmentos, destravado: G.destravado, posicao: G.posicao ?? null });
  const gravar = async (uid, pk) => { const k = JSON.stringify(pk); if (E.pub[uid] === k) return; E.pub[uid] = k; await b.gravarPacote(E.codigo, uid, pk); };
  for (const [g, G] of Object.entries(est)) {
    const ld = lider(g);
    for (const [uid, ts] of Object.entries(G.porUid)) {
      comTarefa.add(uid);
      await gravar(uid, { ...base, grupoId: g, lider: uid === ld,
        proxima: E.envios.filter(x => x.etapaId === e.id && x.autor === uid && x.id.split('__')[1] === uid).length + 1,
        tarefas: ts.map(t => {
          const q = c.perguntas.find(x => x.id === t.perguntaId) || {};
          return { tarefa: t.tarefa, enunciado: q.enunciado || '', alternativas: q.alternativas || [], estado: t.estado, tentativas: t.tentativas, liberaEm: t.liberaEm,
            ...(t.estado === 'certa' && t.fragmento !== null ? { fragmento: c.fragmentos[t.fragmento] } : {}) };
        }),
        grupo: resumo(G),
        codigo: uid === ld && c.regra === 'fragmentos' ? { ...G.codigo, proxima: E.envios.filter(x => x.etapaId === e.id && x.id.startsWith(`${e.id}__${g}__c`)).length + 1 } : null,
        mensagem: G.destravado ? (c.mensagem || '') : '' });
    }
  }
  // quem entrou depois do início (ou ficou sem grupo) não tem pergunta: ajuda o grupo
  for (const uid of Object.keys(E.sala.nomes || {})) if (!comTarefa.has(uid)) {
    const g = grupoDoUid(uid);
    await gravar(uid, { ...base, grupoId: g, lider: false, tarefas: [], grupo: g && est[g] ? resumo(est[g]) : null, codigo: null, mensagem: '', motivo: 'sem-tarefa' });
  }
}

function painelCadeado(e, caixa) {
  const p = E.sala.progresso || {}, por = p.porGrupo || {};
  caixa.append(h('p', {}, h('strong', { id: 'relogioConducao' }, contagemRegressiva(E.sala.etapaInfo?.inicio, E.sala.etapaInfo?.tempoMin)), ` · ${p.enviados ?? 0} de ${p.esperados ?? 0} cadeados abertos`),
    h('p', { class: 'sutil' }, e.config.regra === 'fragmentos'
      ? 'Cada acerto revela um pedaço do código no celular de quem acertou. O líder digita o código para abrir.'
      : (e.config.minAcertos === 1 ? 'O grupo abre quando 1 membro acerta a própria pergunta.' : `O grupo abre quando ${pl(e.config.minAcertos > 0 ? e.config.minAcertos : 'todos os', 'membro')} acertam a própria pergunta.`)),
    h('ul', { class: 'diag' }, A().grupos.filter(g => por[g.id]).map(g => {
      const x = por[g.id];
      return h('li', { class: x.destravado ? 'info' : 'aviso' }, chip(g.id), ' ',
        h('span', { class: 'estado ' + (x.destravado ? 'ok' : 'pend') }, x.destravado ? `aberto (${x.posicao}º)` : e.config.regra === 'fragmentos' ? `${x.acertos} de ${x.total} pedaços` : `${x.acertos} de ${x.necessarios} acertos`));
    })));
  const j = E.jogo[e.id];
  if (j) caixa.append(h('details', {}, h('summary', {}, 'Respostas de cada aluno — só você vê'),
    h('ul', { class: 'diag' }, Object.entries(estadoAtualCadeado(e) || {}).flatMap(([g, G]) => Object.entries(G.porUid).map(([u, ts]) =>
      h('li', { class: 'info' }, chip(g), ' ', nomeDe(u), ': ', ts.map(t => t.estado === 'certa' ? '✔' : t.tentativas ? `✗×${t.tentativas}` : '…').join(' ')))))));
  caixa.append(h('button', { class: 'btn primario bloco', onclick: encerrarEtapa }, 'Encerrar etapa'));
  return caixa;
}

// ---------------- quiz ----------------
const idVezQuiz = (e, v) => `${e.id}__${v.grupoId}__r${v.idx + 1}`;
const gruposComGente = () => A().grupos.filter(g => (E.sala.composicao?.[g.id] || []).length || E.sala.executores?.[g.id]).map(g => g.id);

/** O que todos podem ver (vai no documento da sala): nunca a resposta antes da hora. */
function projecaoQuiz(e) {
  const j = E.jogo[e.id], c = e.config, v = j?.vez;
  const pub = { tipo: 'quiz', etapaId: e.id, total: c.perguntas.length, n: v ? v.idx + 1 : 0, placar: j?.placar || {}, fim: !!j && j.idx >= c.perguntas.length - 1 && (!v || v.estado !== 'respondendo') };
  if (!v) return pub;
  Object.assign(pub, { grupoId: v.grupoId, inicio: v.inicio, segundos: v.segundos, estado: v.estado, repasseDe: v.repasseDe || null });
  const q = c.perguntas[v.idx];
  if (c.mostrarNoTelao) Object.assign(pub, { enunciado: q.enunciado, alternativas: q.alternativas });
  if (v.estado !== 'respondendo' && c.mostrarResposta !== false) pub.revelacao = respostaCerta(q, A().docente?.respostas?.[e.id]);
  return pub;
}
async function publicarQuiz(e) { salvar(); await b.atualizarSala(E.codigo, { jogo: projecaoQuiz(e) }); }

async function proximaPerguntaQuiz(e) {
  const j = E.jogo[e.id]; if (!j || (j.vez && j.vez.estado === 'respondendo')) return;
  if (j.idx >= e.config.perguntas.length - 1) return;
  const r = sortearGrupo(j.fila, gruposComGente());
  if (!r.grupo) return avisoGeral('Nenhum grupo com participantes.', 'alerta');
  j.fila = r.fila; j.idx++;
  j.vez = { idx: j.idx, grupoId: r.grupo, tentados: [r.grupo], inicio: Date.now(), segundos: e.config.segundos ?? 60, estado: 'respondendo', repasseDe: null };
  await entregarPerguntaQuiz(e, j.vez);
  await publicarQuiz(e); renderConducao();
}
async function entregarPerguntaQuiz(e, v) {
  const q = e.config.perguntas[v.idx], ld = lider(v.grupoId);
  if (ld) await b.gravarPacote(E.codigo, ld, { tipo: 'quiz', etapaId: e.id, titulo: e.titulo, grupoId: v.grupoId, rodada: v.idx + 1, envioId: idVezQuiz(e, v), enunciado: q.enunciado, alternativas: q.alternativas, inicio: v.inicio, segundos: v.segundos, repasse: !!v.repasseDe });
}
async function recolherPerguntaQuiz(e, v) {
  const ld = lider(v.grupoId);
  if (ld) await b.gravarPacote(E.codigo, ld, { tipo: 'quiz', etapaId: e.id, rodada: v.idx + 1, encerrada: true });
}
/** Resposta do líder da vez (ou tempo esgotado). Errou: repassa uma vez a outro grupo sorteado, ou revela. */
async function avaliarVezQuiz(e, porTempo = false) {
  const j = E.jogo[e.id], v = j?.vez; if (!v || v.estado !== 'respondendo') return;
  const env = E.envios.find(x => x.id === idVezQuiz(e, v));
  if (!env && !porTempo) return;
  const certa = A().docente?.respostas?.[e.id]?.perguntas?.[e.config.perguntas[v.idx].id]?.corretaId;
  const acertou = !!env && env.dados?.alternativaId === certa;
  j.historico.push({ idx: v.idx, grupoId: v.grupoId, acertou, repasse: !!v.repasseDe, tempo: !env });
  await recolherPerguntaQuiz(e, v);
  if (acertou) { j.placar[v.grupoId] = (j.placar[v.grupoId] || 0) + 1; v.estado = 'certo'; }
  else if ((e.config.aoErrar || 'repassar') === 'repassar' && !v.repasseDe) {
    const r = sortearGrupo(j.fila, gruposComGente(), v.tentados);
    if (r.grupo) {
      j.fila = r.fila;
      j.vez = { idx: v.idx, grupoId: r.grupo, tentados: [...v.tentados, r.grupo], inicio: Date.now(), segundos: v.segundos, estado: 'respondendo', repasseDe: v.grupoId, motivoRepasse: env ? 'errou' : 'tempo' };
      await entregarPerguntaQuiz(e, j.vez);
      await publicarQuiz(e); renderConducao();
      return;
    }
    v.estado = env ? 'errado' : 'tempo';
  } else v.estado = env ? 'errado' : 'tempo';
  await publicarQuiz(e); renderConducao(); sincronizarMetaQuiz();
}
function verificarTempoQuiz() {
  const s = E.sala; if (!s || s.fase !== 'etapa') return;
  const e = etapa(s.etapaAtual); if (e?.typeId !== 'quiz_grupos') return;
  const v = E.jogo[e.id]?.vez;
  if (v?.estado === 'respondendo' && Date.now() > v.inicio + v.segundos * 1000 + 1500) emSerie(() => avaliarVezQuiz(e, true));
}
async function fecharVezQuiz(e) {
  const v = E.jogo[e.id]?.vez;
  if (v?.estado === 'respondendo') { await recolherPerguntaQuiz(e, v).catch(() => {}); v.estado = 'encerrada'; salvar(); }
}
function sincronizarMetaQuiz() {
  const a = A(); if (!a.meta || a.meta.ativa === false) return;
  const enc = [...(E.sala.encerradas || []), E.sala.etapaAtual];
  const parcial = calcularMeta({ ...a, meta: { ...a.meta, etapas: a.meta.etapas.filter(id => enc.includes(id)) } }, resultados());
  if (parcial && parcial.total) b.atualizarSala(E.codigo, { escala: escalaDesempenho(parcial) }).catch(falha);
}

/** Depois de encerrada: quem abriu o cadeado / placar do quiz (só quem conduz vê). */
function resumoDesafio(e) {
  const j = E.jogo[e.id]; if (!j || E.sala.etapaAtual === e.id) return h('span');
  if (j.tipo === 'cadeado') {
    const est = estadoAtualCadeado(e) || {};
    return h('p', { class: 'sutil' }, Object.entries(est).map(([g, G]) => `${nomeGrupo(g)}: ${G.destravado ? 'abriu (' + G.posicao + 'º)' : 'não abriu'}`).join(' · '));
  }
  if (j.tipo === 'cartoes') {
    const est = estadoAtualCartoes(e) || {};
    const so = soDebate(e);
    return h('p', { class: 'sutil' }, Object.entries(est).map(([g, S]) => `${g === 'representantes' ? 'Representantes' : nomeGrupo(g)}: ${!S.confirmacoes ? 'não enviou' : so ? 'fechou as posições' : `${S.ultimo.acertos} de ${S.ultimo.total}` + (S.concluido ? ` ✔ (${S.posicao}º)` : '')}`).join(' · '));
  }
  return h('p', { class: 'sutil' }, 'Placar: ' + Object.entries(j.placar).sort((x, y) => y[1] - x[1]).map(([g, n]) => `${nomeGrupo(g)} ${n}`).join(' · ') + ` · ${pl(j.historico.filter(r => r.acertou).length, 'acerto')} em ${pl(j.historico.length, 'resposta')}`);
}

function painelQuiz(e, caixa) {
  const j = E.jogo[e.id], v = j?.vez, c = e.config, total = c.perguntas.length;
  const fim = j && j.idx >= total - 1 && (!v || v.estado !== 'respondendo');
  if (v) {
    const q = c.perguntas[v.idx], rc = respostaCerta(q, A().docente?.respostas?.[e.id]);
    caixa.append(h('p', {}, h('strong', {}, `Pergunta ${v.idx + 1} de ${total}`), ' · vez de ', chip(v.grupoId), v.repasseDe ? ` (repassada por ${nomeGrupo(v.repasseDe)})` : ''),
      h('p', {}, q.enunciado), h('p', { class: 'sutil' }, 'Resposta: ' + rc.texto + ' — só você vê'),
      h('p', { class: 'estado ' + (v.estado === 'certo' ? 'ok' : v.estado === 'respondendo' ? 'pend' : '') }, { respondendo: 'Aguardando o líder responder…', certo: 'Acertou!', errado: 'Errou.', tempo: 'Tempo esgotado.', encerrada: 'Encerrada.' }[v.estado]));
    if (v.estado === 'respondendo') caixa.append(h('button', { class: 'btn bloco', onclick: () => emSerie(() => avaliarVezQuiz(e, true)) }, 'Encerrar esta pergunta (conta como erro)'));
  } else caixa.append(h('p', {}, `${pl(total, 'pergunta')}. A cada uma, o sistema sorteia o grupo da vez.`));
  caixa.append(h('p', { class: 'sutil' }, 'Placar: ' + (gruposComGente().map(g => `${nomeGrupo(g)} ${j?.placar?.[g] || 0}`).join(' · ') || '—')));
  if (!fim && (!v || v.estado !== 'respondendo')) caixa.append(h('button', { class: 'btn primario bloco', onclick: () => emSerie(() => proximaPerguntaQuiz(e)) }, v ? 'Sortear a próxima pergunta' : 'Sortear a primeira pergunta'));
  caixa.append(h('button', { class: 'btn ' + (fim ? 'primario ' : '') + 'bloco', onclick: encerrarEtapa }, fim ? 'Encerrar etapa (todas respondidas)' : 'Encerrar etapa'));
  return caixa;
}

// ---------------- quadro de arrastar (cartões, pares para ligar, marcar na imagem) ----------------
// Quadro compartilhado: cada movimento chega como envio (etapa__uid__mN) e o líder confirma
// (etapa__grupo__fN). Este aparelho aplica tudo em ordem e devolve o quadro aos celulares.
const ehQuadro = e => e?.typeId === 'cartoes_arrastar' || (e?.typeId === 'pares' && e.config?.formato === 'ligar') || (e?.typeId === 'analise_imagem' && e.config?.tarefa === 'marcar');
const nomeConj = g => g === 'representantes' ? 'Representantes' : nomeGrupo(g);
/** Configuração e gabarito do motor (os pares e a imagem viram um quadro de cartões). */
function motorQuadro(e) {
  const j = E.jogo[e.id];
  if (j?.cfg) return { c: j.cfg, gab: j.gab || {} };
  return { c: e.config, gab: A().docente?.respostas?.[e.id] || {} };
}
const soDebate = e => { const { c, gab } = motorQuadro(e); return c.formato === 'termometro' && !temGabaritoTermometro(gab); };
function prepararCartoesEtapa(e) {
  const s = E.sala, todos = A().grupos.map(g => g.id), r = A().docente?.respostas?.[e.id] || {};
  let cfg = null, gab = null;
  if (e.typeId === 'pares') ({ cfg, gab } = ligarComoCartoes(e.config));
  if (e.typeId === 'analise_imagem') {
    const c = e.config;
    cfg = { formato: 'imagem', cartoes: c.marcadores.map(m => ({ id: m.id, texto: m.rotulo })), tolerancia: c.tolerancia ?? 8, imagem: { largura: c.imagem?.largura, altura: c.imagem?.altura },
      distribuicao: c.distribuicao || 'todos', tentativas: c.tentativas || 'uma', espera: 30, enunciado: c.enunciado || '', revelarAoEncerrar: true };
    gab = { posicoes: r.posicoes || {} };
  }
  const c = cfg || e.config;
  const grupos = A().grupos.map(g => ({ id: g.id, uids: s.composicao?.[g.id] || [], grupos: [g.id] })).filter(x => x.uids.length);
  const conjuntos = e.participacao.organizacao === 'representantes'
    ? [{ id: 'representantes', uids: [...new Set(todos.map(lider).filter(Boolean))], grupos: todos }]
    : c.formato === 'ordenar' && c.modo === 'trechos' ? conjuntosPorTrechos(r.ordem?.length ? r.ordem : c.cartoes.map(x => x.id), grupos) : grupos;
  E.jogo[e.id] = { tipo: 'cartoes', prep: prepararCartoes(c, conjuntos), ...(cfg ? { cfg, gab } : {}) };
  E.pub = {};
  salvar();
}
function estadoAtualCartoes(e) {
  const j = E.jogo[e.id]; if (!j?.prep) return null;
  // em grupos, quem entrou depois (ou foi movido) também mexe no quadro do grupo em que está agora
  const conjDoUid = { ...j.prep.conjDoUid };
  if (e.participacao.organizacao !== 'representantes')
    for (const [g, m] of Object.entries(E.sala?.composicao || {})) if (j.prep.quadros[g]) for (const u of m) conjDoUid[u] = g;
  const { c, gab } = motorQuadro(e);
  return estadoCartoes(c, gab, { ...j.prep, conjDoUid }, tentativas(e.id));
}
const proximaConf = (e, g) => E.envios.filter(x => x.etapaId === e.id && x.id.startsWith(`${e.id}__${g}__f`)).length + 1;
async function publicarCartoes(e) {
  const est = estadoAtualCartoes(e); if (!est) return;
  const j = E.jogo[e.id], { c } = motorQuadro(e), rep = e.participacao.organizacao === 'representantes';
  const texto = id => c.cartoes.find(x => x.id === id)?.texto || '';
  const gravar = async (dest, pk) => { const k = JSON.stringify(pk); if (E.pub['c:' + dest] === k) return; E.pub['c:' + dest] = k; await b.gravarPacote(E.codigo, dest, JSON.parse(k)); };
  for (const [conj, S] of Object.entries(est)) {
    const P = j.prep.quadros[conj];
    const pk = {
      etapaId: e.id, titulo: e.titulo, instrucao: e.instrucao || '', tipo: 'cartoes', formato: c.formato, enunciado: c.enunciado || '',
      colunas: c.formato === 'classificar' ? c.colunas : null, polos: c.formato === 'termometro' ? c.polos : null,
      rotulos: c.rotulos || null, imagem: c.formato === 'imagem' ? c.imagem : null, trecho: P.ids ? { de: Object.keys(j.prep.quadros).indexOf(conj) + 1, total: Object.keys(j.prep.quadros).length } : null,
      tentativas: c.tentativas || 'uma', espera: c.espera ?? 30, conjunto: conj, representantes: rep,
      cartoes: P.ordem.map(id => ({ id, texto: texto(id) })),          // ordem embaralhada: nunca a ordem certa
      dono: P.dono, membros: P.membros, quadro: S.quadro, ultimoMov: S.ultimoMov,
      confirmacoes: S.confirmacoes, liberaEm: S.liberaEm, travado: S.travado, concluido: S.concluido, posicao: S.posicao ?? null,
      ultimo: S.ultimo ? { acertos: S.ultimo.acertos, total: S.ultimo.total, certo: S.ultimo.certo, semGabarito: !!S.ultimo.semGabarito } : null
    };
    if (rep) for (const u of P.membros) { const g = grupoDoUid(u); await gravar(u, { ...pk, grupoConfirma: g, proximaConf: proximaConf(e, g) }); }
    else await gravar(conj, { ...pk, grupoConfirma: conj, proximaConf: proximaConf(e, conj) });
  }
}
/** O que o telão mostra depois de encerrar: resultado de cada quadro e, se combinado, a resposta esperada. */
function projecaoCartoesFinal(e) {
  const est = estadoAtualCartoes(e) || {}, { c, gab } = motorQuadro(e), j = E.jogo[e.id];
  const revelar = c.revelarAoEncerrar !== false;
  const porGrupo = Object.fromEntries(Object.entries(est).map(([g, S]) => [g, { confirmou: S.confirmacoes > 0, acertos: S.ultimo?.acertos ?? null, total: S.ultimo?.total ?? null, concluido: S.concluido, posicao: S.posicao ?? null }]));
  const out = { tipo: 'cartoes', etapaId: e.id, formato: c.formato, polos: c.polos || null, porGrupo, semGabarito: soDebate(e) };
  const texto = id => c.cartoes.find(x => x.id === id)?.texto || '';
  if (c.formato === 'termometro') {
    out.distribuicao = distribuicaoTermometro(c, revelar ? gab : null, est);
    if (revelar) out.margem = gab.margem ?? 15;
  } else if (c.formato === 'imagem') {
    out.marcadores = c.cartoes.map(x => ({ id: x.id, rotulo: x.texto, pontos: Object.entries(est).filter(([, S]) => S.quadro[x.id]).map(([conj, S]) => ({ conj, ...S.quadro[x.id] })), ...(revelar && gab.posicoes?.[x.id] ? { esperado: gab.posicoes[x.id] } : {}) }));
    out.tolerancia = c.tolerancia;
  } else if (revelar) {
    if (c.rotulos) out.pares = c.rotulos.map((a, i) => ({ a, b: texto(gab.ordem[i]) }));
    else if (c.formato === 'ordenar') {
      out.ordem = (gab.ordem?.length ? gab.ordem : c.cartoes.map(x => x.id)).map(texto);
      if (Object.values(j?.prep?.quadros || {}).some(P => P.ids)) out.trechos = Object.entries(j.prep.quadros).map(([g, P]) => ({ grupo: g, cartoes: P.ids.map(texto) }));
    }
    else out.colunas = c.colunas.map(col => ({ titulo: col.titulo, cartoes: c.cartoes.filter(x => gab.colunaDe?.[x.id] === col.id).map(x => x.texto) }));
  }
  return out;
}
function painelCartoes(e, caixa) {
  const p = E.sala.progresso || {}, por = p.porGrupo || {}, { c, gab } = motorQuadro(e);
  const so = soDebate(e);
  const rot = { ordenar: c.rotulos ? 'Liguem cada cartão ao seu par.' : c.modo === 'trechos' ? 'Cada grupo ordena um trecho da cadeia; o telão junta tudo no fim.' : 'Ponham os cartões na ordem certa.', classificar: 'Separem os cartões nas colunas.', termometro: so ? 'Posicionem cada caso na linha (só debate: sem posição esperada).' : 'Posicionem cada caso na linha.', imagem: 'Marquem na imagem onde fica cada item.' }[c.formato];
  caixa.append(h('p', {}, h('strong', { id: 'relogioConducao' }, contagemRegressiva(E.sala.etapaInfo?.inicio, E.sala.etapaInfo?.tempoMin)), ` · ${p.enviados ?? 0} de ${p.esperados ?? 0} quadros fechados`),
    h('p', { class: 'sutil' }, rot + (c.distribuicao === 'fracionado' ? ' Cada celular segura alguns cartões.' : '') + (e.participacao.organizacao === 'representantes' ? ' Os representantes montam um quadro só, juntos.' : ' O líder de cada grupo confirma.')),
    h('ul', { class: 'diag' }, Object.entries(por).map(([g, x]) => h('li', { class: x.concluido ? 'info' : 'aviso' }, g === 'representantes' ? h('strong', {}, 'Representantes') : chip(g), ' ',
      h('span', { class: 'estado ' + (x.concluido ? 'ok' : 'pend') }, x.concluido ? (so ? 'fechou' : `certo (${x.posicao}º)`) : x.travado ? 'enviou (tentativa única)' : x.confirmacoes ? `tentou ${x.confirmacoes}×` : `${x.colocados} de ${x.total} colocados`)))));
  const est = estadoAtualCartoes(e);
  if (est) caixa.append(h('details', {}, h('summary', {}, 'Quadros agora — só você vê'),
    h('ul', { class: 'diag' }, Object.entries(est).map(([g, S]) => {
      const P = E.jogo[e.id].prep.quadros[g], r = conferirQuadro(c, P.ids ? { ...gab, ordem: P.gabOrdem } : gab, S.quadro), n = Object.keys(S.quadro).length;
      return h('li', { class: 'info' }, h('strong', {}, nomeConj(g) + ': '), so ? `${S.colocados} de ${n} posicionados` : `${r.acertos} de ${r.total} certos agora` + (quadroCompleto(S.quadro) ? '' : ` · ${S.colocados} de ${n} colocados`));
    }))));
  caixa.append(h('button', { class: 'btn primario bloco', onclick: encerrarEtapa }, 'Encerrar etapa'));
  return caixa;
}

// ---------------- contingências (ADR-001) ----------------
function dialogo(titulo, corpo, acoes) {
  const d = h('dialog', { class: 'explica' }, h('h2', {}, titulo), corpo,
    h('div', { class: 'linha-botoes' }, ...acoes.map(([rot, fn, cls]) => h('button', { class: 'btn ' + (cls || ''), onclick: async () => { if (fn && (await fn()) === false) return; d.close(); d.remove(); } }, rot))));
  document.body.append(d); d.showModal();
}

function dialogoCobrir(e, g) {
  const s = E.sala;
  const candidatos = A().grupos.filter(x => x.id !== g && (s.composicao?.[x.id] || []).length);
  if (!candidatos.length) return avisoGeral('Nenhum outro grupo com participantes.', 'alerta');
  let escolhido = candidatos[0].id;
  dialogo(`Cobrir a tarefa de ${nomeGrupo(g)}`,
    h('div', {}, h('p', {}, 'O grupo escolhido recebe as peças e a tarefa desse grupo. A autoria real fica registrada.'),
      h('select', { onchange: ev => { escolhido = ev.target.value; } }, candidatos.map(x => h('option', { value: x.id }, x.nome)))),
    [['Confirmar', async () => {
      const rep = s.representantes?.[escolhido];
      await b.atualizarSala(E.codigo, { executores: { ...s.executores, [g]: rep }, leitoresExtra: { ...s.leitoresExtra, [g]: s.composicao[escolhido] } }).catch(falha);
      E.contingencias.push(registrarContingencia({ etapaId: e.id, grupoPlanejadoId: g, tipo: 'executor_adicional', executadoPor: escolhido }));
      salvar();
    }, 'primario'], ['Cancelar']]);
}

function dialogoRegistrar(e, g) {
  const opcoes = e.config?.hipotesesCandidatas || [];
  if (!opcoes.length) return avisoGeral('Esta etapa não tem opções para registrar.', 'alerta');
  let escolha = null;
  dialogo(`Registrar por ${nomeGrupo(g)}`,
    h('div', {}, h('p', { class: 'sutil' }, 'Fica registrado que a decisão foi feita por quem conduz, não pelo grupo.'),
      h('div', { class: 'opcoes' }, opcoes.map(o => h('label', { class: 'opcao' }, h('input', { type: 'radio', name: 'reg', onchange: () => { escolha = o.id; } }), h('span', {}, o.texto))))),
    [['Registrar', async () => {
      if (!escolha) return false;
      try {
        await b.enviar(E.codigo, e.id + '__' + g, { etapaId: e.id, escopo: 'grupo', grupoId: g, autor: E.conta.uid, dados: { hipoteseId: escolha, evidencias: [], justificativa: 'Registrado por quem conduz' }, contingencia: true });
        E.contingencias.push(registrarContingencia({ etapaId: e.id, grupoPlanejadoId: g, tipo: 'execucao_docente' })); salvar();
      } catch (err) { avisoGeral(err.message === 'ja-enviado' ? 'Esse grupo já tinha enviado.' : err.message, 'alerta'); }
    }, 'primario'], ['Cancelar']]);
}

// ---------------- topo ----------------
function renderTopo() {
  const s = E.sala, partes = [];
  if (E.codigo) partes.push('Sala ' + E.codigo);
  if (s) partes.push(Object.keys(s.nomes || {}).length + ' pessoas');
  if (s?.etapaInfo && s.fase === 'etapa') partes.push(s.etapaInfo.titulo);
  else if (s?.fase === 'final') partes.push('Resultado');
  if (EM_ENSAIO) partes.push('ENSAIO');
  $('statusTopo').textContent = partes.join(' · ') || (A() ? A().titulo : 'Condução');
}

// ---------------- ensaio ----------------
async function simularEntradas(n) {
  const base = Object.keys(E.sala?.nomes || {}).length;
  for (let i = 1; i <= n; i++) await b.entrar(E.codigo, 'sim-' + Math.random().toString(36).slice(2, 8), `Simulado ${base + i}`).catch(falha);
}
async function pilotoAutomatico() {
  const s = E.sala, e = etapa(s.etapaAtual); if (!e) return;
  const escolher = l => l[Math.floor(Math.random() * l.length)];
  if (e.typeId === 'cadeado_grupo') {
    const j = E.jogo[e.id]; if (!j) return;
    const est = estadoAtualCadeado(e);
    for (const [g, P] of Object.entries(j.prep)) for (const u of P.membros) {
      if (!u.startsWith('sim-')) continue;
      for (const t of est[g].porUid[u]) {
        if (t.estado === 'certa' || Date.now() < t.liberaEm) continue;
        const q = e.config.perguntas.find(x => x.id === t.perguntaId);
        const n = E.envios.filter(x => x.etapaId === e.id && x.autor === u).length + 1;
        await b.enviar(E.codigo, `${e.id}__${u}__t${n}`, { etapaId: e.id, escopo: 'tentativa', grupoId: g, autor: u, dados: { tarefa: t.tarefa, alternativaId: escolher(q.alternativas).id }, contingencia: false }).catch(() => {});
      }
    }
    return;
  }
  if (T.tem(e)) return T.piloto(e);
  if (ehQuadro(e)) {
    const j = E.jogo[e.id]; if (!j) return;
    const est = estadoAtualCartoes(e), { c } = motorQuadro(e);
    for (const [g, P] of Object.entries(j.prep.quadros)) {
      const S = est[g]; if (!S || S.travado) continue;
      const sims = P.membros.filter(u => u.startsWith('sim-')); if (!sims.length) continue;
      if (quadroCompleto(S.quadro)) {                                  // tudo colocado: o líder simulado confirma
        const quem = g === 'representantes' ? sims[0] : lider(g), grupo = g === 'representantes' ? grupoDoUid(quem) : g;
        if (quem?.startsWith('sim-') && Date.now() >= S.liberaEm)
          await b.enviar(E.codigo, `${e.id}__${grupo}__f${proximaConf(e, grupo)}`, { etapaId: e.id, escopo: 'tentativa', grupoId: grupo, autor: quem, dados: { confirmar: true }, contingencia: false }).catch(() => {});
        continue;
      }
      const n = Object.keys(S.quadro).length, cont = {}, livres = c.formato === 'ordenar' ? [...Array(n).keys()].filter(i => !Object.values(S.quadro).includes(i)) : [];
      for (const id of P.ordem.filter(id => S.quadro[id] === null)) {
        const u = P.dono[id] || escolher(sims); if (!u?.startsWith('sim-')) continue;
        const para = c.formato === 'ordenar' ? livres.splice(Math.floor(Math.random() * livres.length), 1)[0] : c.formato === 'classificar' ? escolher(c.colunas).id : c.formato === 'imagem' ? { x: Math.random() * 100, y: Math.random() * 100 } : Math.round(Math.random() * 100);
        cont[u] = Math.max(cont[u] || 0, S.ultimoMov[u] || 0) + 1;
        await b.enviar(E.codigo, `${e.id}__${u}__m${cont[u]}`, { etapaId: e.id, escopo: 'tentativa', grupoId: grupoDoUid(u), autor: u, dados: { cartao: id, para }, contingencia: false }).catch(() => {});
      }
    }
    return;
  }
  if (e.typeId === 'quiz_grupos') {
    const v = E.jogo[e.id]?.vez; if (!v || v.estado !== 'respondendo') return;
    const lider = s.executores?.[v.grupoId] || s.representantes?.[v.grupoId];
    if (!lider?.startsWith('sim-')) return;
    const q = e.config.perguntas[v.idx];
    await b.enviar(E.codigo, idVezQuiz(e, v), { etapaId: e.id, escopo: 'tentativa', grupoId: v.grupoId, autor: lider, dados: { rodada: v.idx + 1, alternativaId: escolher(q.alternativas).id }, contingencia: false }).catch(() => {});
    return;
  }
  if (e.participacao.organizacao === 'individual') {
    for (const u of Object.keys(s.nomes)) if (u.startsWith('sim-') && !s.progresso?.porParticipante?.[u])
      await b.enviar(E.codigo, e.id + '__' + u, { etapaId: e.id, escopo: 'participante', grupoId: grupoDoUid(u), autor: u, dados: { alternativaId: escolher(e.config.alternativas).id }, contingencia: false }).catch(() => {});
    return;
  }
  for (const g of A().grupos) {
    const rep = s.executores?.[g.id] || s.representantes?.[g.id];
    if (!rep || !rep.startsWith('sim-') || s.progresso?.porGrupo?.[g.id]) continue;
    const pecas = A().pecas.filter(p => p.etapaId === e.id && p.destinatarios.includes(g.id)).map(p => p.id);
    const dados = { hipoteseId: escolher(e.config.hipotesesCandidatas).id, justificativa: 'Envio simulado no ensaio' };
    if (e.typeId === 'investigacao_fragmentos') dados.evidencias = pecas.slice(0, Math.max(e.config.minEvidencias ?? 1, 1));
    await b.enviar(E.codigo, e.id + '__' + g.id, { etapaId: e.id, escopo: 'grupo', grupoId: g.id, autor: rep, dados, contingencia: !!s.executores?.[g.id] }).catch(() => {});
  }
}

const sinalConexao=h('p',{class:'sinal-conexao',role:'status','aria-live':'polite'}); document.querySelector('main').prepend(sinalConexao); indicarConexao(sinalConexao);
