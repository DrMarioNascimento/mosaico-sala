import { painelImagem } from './midia-docente.js';
import { cadeadoIcone } from './lock-icons.js';
import { criarHistorico, recortarPrevia } from './core/ergonomia.js';
import { abrirAutoria } from './autoria-docente.js';
import { percursoDocente, numeroPasso } from './percurso-docente.js';
import { painelRevisaoDocente } from './revisao-docente.js';
/* MOSAICO · Planejamento: montar, revisar, guardar e pré-visualizar atividades.
   - Contas da lista de mestres: biblioteca fechada no Firestore.
   - Qualquer outra conta: edita e exporta planilha (modo aberto, nada guardado). */

import { backend, EM_ENSAIO, link } from './backend.js';
import { $, h, limpar, campoArquivo, aviso, corDoGrupo, chipGrupo, iconeGrupo, VISUAL_GRUPOS } from './ui.js';
import { validarAtividade, temErros, SCHEMA_VERSION } from './core/validacao.js';
import { sugerirEquilibrio, avisoGramatica } from './core/equilibrio.js';
import { TIPOS, obterTipo } from './core/tipos.js';
import { etapasOrdenadas } from './core/motor.js';
import { gerarPrompt, gerarGuiaMd } from './core/prompt.js';
import { abrirImpressao } from './imprimir.js';
import { lerArquivoAtividade, baixarPlanilha } from './planilha-xlsx.js';
import { CASOS, carregarCaso } from './casos.js';
import { ehAdmin, lerEmails, ADMINS } from './mestres.js';
import { svgPeca, comprimirImagem, montarPecasEtapa } from './quebra-cabeca.js';
import { unidadesDoTexto, sugerirCortes, pecasRepetidas, embaralharSemOrdemCerta } from './core/montagem.js';
import { LETRAS, fragmentosDoTexto, prepararCadeado } from './core/desafios.js';
import { cartoesDoTexto, prepararCartoes } from './core/cartoes.js';
import { criarEditores } from './planejar-tipos.js';
import { ico, ilustra } from './icones.js';

const b = await backend();
const RASCUNHO_BASE = 'mosaico-planejar-rascunho' + (EM_ENSAIO ? '-ensaio' : '');
let RASCUNHO = RASCUNHO_BASE, RASCUNHOS = '', historico = null, salvoEm = null, falhaRascunho = false, rascunhoId = null;
const PARA_CONDUZIR = 'mosaico-para-conduzir' + (EM_ENSAIO ? '-ensaio' : '');
const P = { adm: null, mestres: null, conta: null, A: null, origem: null, secao: 'geral', sujo: false, dispensadas: new Set(), bib: null, bibErro: null, importacao: [] };
const NOMES_TIPO = { investigacao_fragmentos: 'Investigação por fragmentos', comparar_hipoteses: 'Comparação entre grupos', questao_individual: 'Questão individual', montagem_pecas: 'Quebra-cabeça: texto ou imagem', cadeado_grupo: 'Cadeado do grupo', quiz_grupos: 'Quiz entre grupos', cartoes_arrastar: 'Cartões de arrastar', pares: 'Pares', corrida: 'Corrida', cruzadas: 'Palavras cruzadas', sequencia: 'Sequência (Genius)', quiz_pensar: 'Quiz que faz pensar', analise_imagem: 'Análise de imagem', escala_padronizada: 'Escala padronizada', jogo_economico: 'Jogo econômico' };
// Editores dos tipos novos: js/planejar-tipos.js
const ED = criarEditores({ campo: (...a) => campo(...a), seletor: (...a) => seletor(...a), mudar: fn => mudar(fn), tocar: () => tocar(), novoId: (p, u) => novoId(p, u), idsDe: l => idsDe(l),
  editorPerguntas: (e, o) => editorPerguntas(e, o), avisoGeral: (t, k) => avisoGeral(t, k), comprimirImagem: f => comprimirImagem(f), A: () => P.A });
/** Cardápio por categoria (ideia do protótipo feito no v0). */
const CATEGORIAS = [
  ['Investigar e discutir', ['investigacao_fragmentos', 'comparar_hipoteses', 'analise_imagem']],
  ['Desafios cooperativos', ['montagem_pecas', 'cadeado_grupo', 'cartoes_arrastar', 'pares', 'cruzadas']],
  ['Quizzes e jogos', ['quiz_grupos', 'corrida', 'quiz_pensar', 'sequencia']],
  ['Verificação individual', ['questao_individual']],
  ['Escalas e jogos padronizados', ['escala_padronizada', 'jogo_economico']]
];
/** “Ideal para” de cada tipo, na tela de nova etapa (ideia do protótipo do v0). */
const IDEAL_PARA = {
  investigacao_fragmentos: 'Abrir o tema com um problema', comparar_hipoteses: 'Depois de uma investigação', analise_imagem: 'Lâminas, gráficos, mapas e anatomia',
  montagem_pecas: 'Textos, contas e imagens', cadeado_grupo: 'Revisão com desafio', cartoes_arrastar: 'Processos, categorias e debates', pares: 'Relacionar conceitos',
  cruzadas: 'Vocabulário e conceitos-chave', quiz_grupos: 'Fechar a aula com energia', corrida: 'Revisão rápida e competitiva', quiz_pensar: 'Argumentar, decidir e refletir',
  sequencia: 'Memorizar sequências e termos', questao_individual: 'Verificar o que cada um aprendeu',
  escala_padronizada: 'Refletir sobre traços de personalidade', jogo_economico: 'Discutir cooperação, justiça e confiança'
};
const ROT_PART = { grupos: 'Em grupos', individual: 'Individual', representante: 'Representante envia', desligada: 'Desligada', meta: 'Contra a meta', entre_grupos: 'Entre grupos', representantes: 'Entre grupos (só representantes)', nenhum: 'Sem envio (vale o tempo)' };
const avisoGeral = (t, tipo = 'info') => { aviso($('avisoGeral'), t, tipo); };

// Recolhe as ações depois da escolha e mantém a navegação fora da barra fixa.
$('acoes').addEventListener('click',ev=>{if(ev.target.closest('button')){const menu=ev.target.closest('details.acoes-mais');if(menu)menu.open=false;}});
// O menu abre alinhado à direita do botão; se o botão quebrou para a esquerda da tela, alinha à esquerda para não sair pela borda.
document.addEventListener('toggle',ev=>{const d=ev.target;if(!d.matches?.('details.acoes-mais')||!d.open)return;const m=d.querySelector('.acoes-menu');if(!m)return;m.style.left='';m.style.right='';if(m.getBoundingClientRect().left<8){m.style.left='0';m.style.right='auto';}},true);
document.addEventListener('keydown',ev=>{if(ev.key==='Escape')document.querySelectorAll('details.acoes-mais[open]').forEach(d=>{d.open=false;d.querySelector('summary')?.focus();});});
const topoDocente=document.querySelector('header.topo');
if(topoDocente && typeof ResizeObserver!=='undefined')new ResizeObserver(()=>document.documentElement.style.setProperty('--topo-docente',(topoDocente.getBoundingClientRect().height+12)+'px')).observe(topoDocente);
let autoriaInicialAberta = false;
window.addEventListener('hashchange',()=>{if(P.A && location.hash==='#revisao')irPara('revisao');});
// ============================================================ entrada
$('entrarGoogle').textContent = EM_ENSAIO ? 'Entrar (modo ensaio)' : 'Entrar com Google';
$('entrarGoogle').onclick = () => {
  const p = b.entrarGoogle(); $('entrarGoogle').disabled = true;
  p.then(iniciar).catch(e => { $('entrarGoogle').disabled = false; aviso($('avisoLogin'), e.code === 'auth/popup-closed-by-user' ? 'Login cancelado.' : 'Não foi possível entrar. Confira a internet.', 'erro'); });
};
(async () => { const c = await b.contaAtual(); if (c) iniciar(c); else if(EM_ENSAIO && new URLSearchParams(location.search).has('demonstracao')) iniciar(await b.entrarGoogle()); })();

async function iniciar(conta) {
  P.conta = conta; RASCUNHO = RASCUNHO_BASE + ':' + conta.uid; RASCUNHOS = RASCUNHO + ':lista'; $('login').hidden = true; $('app').hidden = false; $('acoes').hidden = false;
  await carregarBiblioteca();
  if (souAdmin()) carregarMestres();
  try { const r = JSON.parse(localStorage.getItem(RASCUNHO) || 'null'); if (r?.A) { P.A = r.A; P.origem = r.origem; P.sujo = !!r.sujo; rascunhoId = r.rascunhoId; salvoEm = r.salvoEm; historico = criarHistorico(P.A); marcarHistorico(); avisoGeral('Rascunho retomado de onde você parou.'); } } catch {}
  if(location.hash==='#revisao' && P.A)P.secao='revisao';
  render();
  if(!autoriaInicialAberta && new URLSearchParams(location.search).get('criar')==='texto'){autoriaInicialAberta=true;abrirIA();}
}

async function carregarBiblioteca() {
  try { P.bib = await b.listarBiblioteca(); P.bibErro = null; }
  catch (e) { P.bib = null; P.bibErro = e?.code === 'permission-denied' || /permission/i.test(e?.message || '') ? 'fora' : 'falha'; }
}
const temBiblioteca = () => Array.isArray(P.bib);
const souAdmin = () => EM_ENSAIO || ehAdmin(P.conta?.email);

// ============================================================ estado
function rascunhosLocais() { try { return JSON.parse(localStorage.getItem(RASCUNHOS) || '[]'); } catch { return []; } }
function salvarRascunho() {
  if (!P.A) return;
  const agora = Date.now(); rascunhoId ||= 'r' + agora.toString(36) + Math.random().toString(36).slice(2,6);
  const r = { A:P.A, origem:P.origem, sujo:P.sujo, rascunhoId, salvoEm:agora };
  try {
    localStorage.setItem(RASCUNHO, JSON.stringify(r));
    const lista = rascunhosLocais().filter(x => x.rascunhoId !== rascunhoId); lista.unshift(r);
    localStorage.setItem(RASCUNHOS, JSON.stringify(lista)); salvoEm = agora; falhaRascunho = false;
  } catch { falhaRascunho = true; }
  estadoSalvamento();
}
/** Tira rascunhos deste navegador (um ou vários). A biblioteca em nuvem não é tocada. */
function apagarRascunhos(ids, pergunta) {
  if (!confirmar(pergunta)) return;
  try {
    localStorage.setItem(RASCUNHOS, JSON.stringify(rascunhosLocais().filter(x => !ids.includes(x.rascunhoId))));
    const atual = JSON.parse(localStorage.getItem(RASCUNHO) || 'null'); if (atual && ids.includes(atual.rascunhoId)) localStorage.removeItem(RASCUNHO);
  } catch {}
  render(); avisoGeral(ids.length > 1 ? 'Rascunhos apagados deste navegador.' : 'Rascunho apagado deste navegador.', 'ok');
}
function estadoSalvamento() {
  const alvo = document.getElementById('estadoSalvamento'); if (!alvo) return;
  alvo.textContent = falhaRascunho ? 'Falha ao guardar rascunho: exporte uma cópia antes de sair.' : P.sujo ? 'Rascunho salvo neste navegador' + (salvoEm ? ' às ' + new Date(salvoEm).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}) : '') : 'Salvo na sua biblioteca';
  alvo.dataset.tipo = falhaRascunho ? 'erro' : 'ok';
}
function restaurarHistorico(refazer = false) {
  clearTimeout(tempo); historico?.registrar(P.A);
  const a = refazer ? historico?.refazer() : historico?.desfazer(); if (!a) return;
  P.A = a; P.sujo = true; salvarRascunho(); render();
}
addEventListener('keydown', e => {
  if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 'z' || /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName) || !P.A || document.querySelector('dialog[open]')) return;
  e.preventDefault(); restaurarHistorico(e.shiftKey);
});
let tempo = null;
/** Mudança de texto: guarda sem redesenhar (não perde o foco); atualiza navegação/revisão logo depois. */
function tocar() { P.sujo = true; if(P.A.docente) { delete P.A.docente.revisadoEm; if(P.secao.startsWith('etapa:')) delete P.A.docente.revisoes?.[P.secao.slice(6)]; else delete P.A.docente.revisoes; } salvarRascunho(); clearTimeout(tempo); tempo = setTimeout(() => { historico?.registrar(P.A); renderNav(); renderAcoes(); atualizarRevEtapa(); }, 350); }
/** Mudança de estrutura: guarda e redesenha. */
function mudar(fn) { clearTimeout(tempo); historico?.registrar(P.A); const antes=JSON.stringify(P.A); fn(P.A); if(JSON.stringify(P.A)!==antes) { P.sujo = true; if(P.A.docente) { delete P.A.docente.revisadoEm; if(P.secao.startsWith('etapa:')) delete P.A.docente.revisoes?.[P.secao.slice(6)]; else delete P.A.docente.revisoes; } historico?.registrar(P.A); salvarRascunho(); } render(); }

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

function abrir(atividade, origem, idRascunho = null) {
  avisoGeral('');
  rascunhoId = idRascunho || (origem?.bibId ? rascunhosLocais().find(r=>r.origem?.bibId===origem.bibId)?.rascunhoId : null); P.A = JSON.parse(JSON.stringify(atividade)); historico = criarHistorico(P.A); P.origem = origem || null; P.sujo = !origem; P.secao = 'geral'; P.dispensadas = new Set(); P.importacao = [];   // sujo: nova, importada ou modelo ainda não está na biblioteca
  salvarRascunho(); marcarHistorico(); render(); window.scrollTo({ top: 0 });
}
function fechar() { clearTimeout(tempo); if(P.A) salvarRascunho(); P.A = null; P.origem = null; P.sujo = false; historico = null; try { localStorage.removeItem(RASCUNHO); } catch {} render(); window.scrollTo({ top: 0 }); }

// ============================================================ navegação (botões e o “voltar” do navegador)
/** Partes da atividade, na ordem em que se planeja. */
function secoes() {
  if (!P.A) return [];
  return [['geral', 'Geral e meta', 'geral'], ['grupos', 'Grupos', 'grupos'],
    ...etapasOrdenadas(P.A).map((e, i) => ['etapa:' + e.id, `Etapa ${i + 1}: ${e.titulo || NOMES_TIPO[e.typeId]}`, null, e.typeId]),
    ['fontes', 'Fontes', 'fontes'], ['revisao', 'Revisão', 'revisao']];
}
const nomeSecao = s => s === 'nova-etapa' ? 'Nova etapa' : (secoes().find(x => x[0] === s)?.[1] || '');
function marcarHistorico() { try { history.pushState({ plan: P.secao }, '', location.pathname + location.search + '#' + encodeURIComponent(P.secao)); } catch {} }
function irPara(secao) {
  if (!P.A) return;
  if (P.secao !== secao) { P.secao = secao; marcarHistorico(); }
  renderNav(); renderEditor(); renderMigalhas(); window.scrollTo({ top: 0 }); const titulo=document.querySelector('#editor h2'); if(titulo){titulo.setAttribute('tabindex','-1');titulo.focus({preventScroll:true});}
}
function voltarMinhas() {
  if (falhaRascunho && !confirmar('Não foi possível guardar o rascunho. Exporte uma cópia antes de voltar. Voltar mesmo assim?')) return false;
  fechar(); try { history.replaceState(null, '', location.pathname + location.search); } catch {}
  return true;
}
addEventListener('popstate', ev => {
  if (!P.A) return;
  const alvo = ev.state?.plan;
  if (alvo && (alvo === 'nova-etapa' || secoes().some(x => x[0] === alvo))) { P.secao = alvo; renderNav(); renderEditor(); renderMigalhas(); window.scrollTo({ top: 0 }); return; }
  if (!voltarMinhas()) marcarHistorico();     // desistiu: continua na atividade
});
function renderMigalhas() {
  const alvo = document.getElementById('migalhas'); if (!alvo || !P.A) return;
  limpar(alvo,
    h('button', { class: 'btn pequeno', 'data-sem-ico': '', onclick: () => voltarMinhas() }, ico('voltar'), 'Minhas atividades'),
    h('span', { class: 'sep', 'aria-hidden': 'true' }, '›'), h('strong', { class: 'tit' }, P.A.titulo || '(sem título)'),
    h('span', { class: 'sep', 'aria-hidden': 'true' }, '›'), h('span', { class: 'sutil' }, nomeSecao(P.secao)));
}
/** Anterior / próxima no fim de cada parte. */
function passosSecao() {
  const l = secoes(), i = l.findIndex(x => x[0] === P.secao);
  const ant = i > 0 ? l[i - 1] : null, prox = i >= 0 && i < l.length - 1 ? l[i + 1] : null;
  const rot = x => x[1].replace(/^Etapa (\d+): .*/, 'Etapa $1');
  return h('nav', { class: 'passos-nav', 'aria-label': 'Parte anterior e próxima' },
    ant ? h('button', { class: 'btn', 'data-sem-ico': '', onclick: () => irPara(ant[0]) }, ico('voltar'), h('span', { class: 'rot-longo' }, 'Anterior: ' + rot(ant)), h('span', { class: 'rot-curto' }, 'Anterior'))
      : h('button', { class: 'btn discreto', 'data-sem-ico': '', onclick: () => voltarMinhas() }, ico('voltar'), h('span', { class: 'rot-longo' }, 'Minhas atividades'), h('span', { class: 'rot-curto' }, 'Voltar')),
    prox ? h('button', { class: 'btn primario proximo', 'data-sem-ico': '', onclick: () => irPara(prox[0]) }, h('span', { class: 'rot-longo' }, 'Próxima: ' + rot(prox)), h('span', { class: 'rot-curto' }, 'Próxima'), ico('avancar'))
      : P.secao === 'revisao' ? h('button', { class: 'btn primario proximo', 'data-sem-ico': '', disabled: temErros(validarAtividade(P.A)), onclick: previa }, numeroPasso(6),ico('previa'), 'Ver como fica') : null);
}

// ============================================================ renderização geral
function render() {
  document.body.classList.toggle('planejando',!!P.A);
  renderAcoes();
  $('statusTopo').textContent = P.A ? (P.A.titulo || '(sem título)') + (P.sujo ? ' · rascunho' : '') : (EM_ENSAIO ? 'ENSAIO' : (P.conta?.email || ''));
  if (!P.A) return limpar($('app'), P.adm && souAdmin() ? telaAdmin() : telaInicio());
  limpar($('app'), percursoDocente(5,true), h('div', { class: 'plan-migalhas', id: 'migalhas' }), h('nav', { class: 'plan-passos3', id: 'passos3', 'aria-label': 'Passos do planejamento' }), h('div', { class: 'plan-grade' }, h('nav', { class: 'plan-nav', id: 'nav', 'aria-label': 'Partes da atividade' }), h('section', { class: 'plan-editor', id: 'editor' })));
  renderNav(); renderEditor(); renderMigalhas();
}

function renderAcoes() {
  const alvo = $('acoes');
  if (!P.A) return limpar(alvo);
  const diags = validarAtividade(P.A);
  limpar(alvo,
    h('span', { id:'estadoSalvamento', class:'estado-salvamento', role:'status', 'aria-live':'polite' }),
    h('button', { class:'btn pequeno', disabled:!historico?.podeDesfazer, onclick:()=>restaurarHistorico() }, 'Desfazer'),
    h('button', { class:'btn pequeno', disabled:!historico?.podeRefazer, onclick:()=>restaurarHistorico(true) }, 'Refazer'),
    h('button', { class:'btn primario', onclick:()=>P.A.docente?.revisadoEm && temBiblioteca() && !temErros(diags) ? conduzirAgora() : irPara('revisao') }, numeroPasso(P.A.docente?.revisadoEm && temBiblioteca() && !temErros(diags)?8:5),P.A.docente?.revisadoEm && temBiblioteca() && !temErros(diags) ? 'Dar esta aula' : 'Revisar conteúdo'),
    h('button', { class:'btn', title:temErros(diags)?'Veja o que falta completar para simular':'Experimentar a aula com turma simulada', onclick:()=>previa() },numeroPasso(6), 'Ver como fica'),
    
    h('button',{class:'btn acao-imprimir',title:'Abrir o material para impressão',onclick:()=>{document.querySelectorAll('details.acoes-mais[open]').forEach(d=>d.open=false);abrirImpressao(P.A);}},'Imprimir'),
    h('details',{class:'acoes-mais'},h('summary',{class:'btn'},'Guardar e exportar'),
      h('div',{class:'acoes-menu'},
        h('button',{class:'btn so-celular',disabled:!historico?.podeDesfazer,onclick:()=>restaurarHistorico()},'Desfazer'),
        h('button',{class:'btn so-celular',disabled:!historico?.podeRefazer,onclick:()=>restaurarHistorico(true)},'Refazer'),
        temBiblioteca() && h('button',{class:'btn',onclick:()=>dialogoSalvar()},numeroPasso(7),P.sujo?'Salvar na biblioteca':'Salvo na biblioteca ✓'),
        temBiblioteca() && h('button',{class:'btn',onclick:continuarNoCelular},'Continuar no celular'),
        h('button',{class:'btn',onclick:()=>baixarPlanilha(P.A).catch(e=>avisoGeral(e.message,'erro'))},'Baixar planilha'),
        h('button',{class:'btn',onclick:()=>baixarJSON(P.A)},'Baixar arquivo da atividade'),
        h('button',{class:'btn',onclick:()=>abrirIA(P.A)},'Ajustar com IA'))),
    h('button',{class:'btn discreto',onclick:()=>voltarMinhas()},'Minhas atividades'));
  estadoSalvamento();
  $('statusTopo').textContent = (P.A.titulo || '(sem título)') + (P.sujo ? ' · rascunho' : '');
}
const confirmar = t => window.confirm(t);

function renderNav() {
  const nav = document.getElementById('nav'); if (!nav || !P.A) return;
  const diags = validarAtividade(P.A), nErros = diags.filter(d => d.severidade === 'erro').length;
  const item = (secao, conteudo, extra = {}) => h('button', { 'aria-current': String(P.secao === secao), onclick: () => irPara(secao), ...extra }, conteudo);
  const errosEtapa = new Map(P.A.etapas.map(e => [e.id, diagsDaEtapa(e, diags).filter(d => d.severidade === 'erro').length]));
  renderPassos3(nErros, [...errosEtapa.values()].reduce((x, y) => x + y, 0));
  limpar(nav,
    item('geral', [ico('geral'), h('span', { class: 'rot' }, 'Geral e meta')]),
    item('grupos', [ico('grupos'), h('span', { class: 'rot' }, 'Grupos'), h('span', { class: 'selo ok' }, P.A.grupos.length)]),
    h('div', { class: 'divisor' }, 'Etapas'),
    etapasOrdenadas(P.A).map((e, i) => { const n = errosEtapa.get(e.id) || 0; return item('etapa:' + e.id, [ilustra(e.typeId, 26), h('span', { class: 'num' }, i + 1), h('span', { class: 'rot' }, e.titulo || '(sem título)'), n > 0 && h('span', { class: 'selo erro', title: 'Pendências nesta etapa' }, n)], { class: 'sub', title: NOMES_TIPO[e.typeId] || e.typeId }); }),
    item('nova-etapa', [ico('mais'), h('span', { class: 'rot' }, 'Nova etapa')], { class: 'sub nova' }),
    h('div', { class: 'divisor' }, 'Mais'),
    item('fontes', [ico('fontes'), h('span', { class: 'rot' }, 'Fontes'), h('span', { class: 'selo ok' }, P.A.fontes.length)]),
    item('revisao', [ico('revisao'), h('span', { class: 'rot' }, 'Revisão'), h('span', { class: 'selo ' + (nErros ? 'erro' : 'ok') }, nErros ? nErros + ' a completar' : 'ok')]));
}

/** Os 3 passos do planejamento (Sobre a turma → Etapas → Revisar), com as pendências de cada um. */
function renderPassos3(nErros, nErrosEtapas) {
  const alvo = document.getElementById('passos3'); if (!alvo || !P.A) return;
  const s = P.secao, primeira = etapasOrdenadas(P.A)[0];
  const passos = [
    ['Sobre a turma', s === 'geral' || s === 'grupos', 'geral', nErros - nErrosEtapas],
    ['Etapas', s.startsWith('etapa:') || s === 'nova-etapa' || s === 'fontes', primeira ? 'etapa:' + primeira.id : 'nova-etapa', P.A.etapas.length ? nErrosEtapas : -1],
    ['Revisar e preparar aula', s === 'revisao', 'revisao', nErros]
  ];
  limpar(alvo, passos.map(([rot, atual, destino, n], i) => h('button', { class: 'passo3', 'aria-current': atual ? 'step' : null, onclick: () => irPara(destino) },
    h('span', { class: 'n' }, i===2?'5':'•'), h('span', { class: 'rot' }, rot),
    h('small', { class: n === 0 ? 'ok' : 'pend' }, n === 0 ? (i === 2 ? (P.A.docente?.revisadoEm ? 'revisada' : 'estrutura completa') : 'ok') : n < 0 ? 'nenhuma ainda' : `${n} pendência(s)`))));
}

function renderEditor() {
  const alvo = document.getElementById('editor'); if (!alvo) return;
  const s = P.secao;
  const mostrar = x => limpar(alvo, x, passosSecao());
  if (s === 'geral') return mostrar(editorGeral());
  if (s === 'grupos') return mostrar(editorGrupos());
  if (s === 'fontes') return mostrar(editorFontes());
  if (s === 'revisao') return mostrar(editorRevisao());
  if (s === 'nova-etapa') return limpar(alvo, editorNovaEtapa(), h('nav', { class: 'passos-nav' }, h('button', { class: 'btn', 'data-sem-ico': '', onclick: () => history.back() }, ico('voltar'), 'Voltar')));
  if (s.startsWith('etapa:')) { const e = etapa(s.slice(6)); if (e) return mostrar(editorEtapa(e)); }
  P.secao = 'geral'; renderEditor();
}

// ============================================================ campos (sem redesenhar a cada tecla)
function campo(rotulo, valor, aoMudar, { tipo = 'text', area = false, linhas = 3, id, ajuda, max } = {}) {
  const idc = id || 'c' + Math.random().toString(36).slice(2, 8);
  const el = area ? h('textarea', { id: idc, rows: linhas, maxlength: max }, valor ?? '') : h('input', { id: idc, type: tipo, value: valor ?? '', maxlength: max });
  if(ajuda) el.setAttribute('aria-describedby',idc+'-ajuda');
  el.addEventListener('input', () => { aoMudar(tipo === 'number' ? (el.value === '' ? undefined : Number(el.value)) : el.value); tocar(); });
  return h('div', {}, h('label', { for: idc }, rotulo), el, ajuda && h('small', {id:idc+'-ajuda'}, ajuda));
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
  let antigo; try{antigo=JSON.parse(localStorage.getItem(RASCUNHO_BASE)||'null');}catch{}
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
  // Quem chega aqui já entrou: nada de tutorial. Primeiro as três ações, depois as atividades, o resto recolhido.
  const ir = destino => document.getElementById(destino)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const acao = (ilu, titulo, texto, onclick, principal) => h('button', { class: 'acao-professor' + (principal ? ' principal' : ''), 'data-sem-ico': '', onclick }, ilustra(ilu, 72), h('strong', {}, titulo), h('span', {}, texto));
  const aplicar = id => link('conduzir.html', { atividade: id });
  const bib = temBiblioteca() ? P.bib : [];
  // Rascunho de uma atividade já salva e sem mudanças é a mesma coisa que o item da biblioteca: não repete na lista.
  const rasc = rascunhosLocais().filter(r => !(r.origem?.bibId && !r.sujo && bib.some(x => x.id === r.origem.bibId)));
  return h('div', { class: 'painel-professor' },
    h('div', { class: 'cab-professor' }, h('h1', {}, 'O que vamos fazer hoje?'), souAdmin() && h('button', { class: 'btn', 'data-sem-ico': '', onclick: () => carregarAdmin() }, ico('geral'), 'Administração')),
    h('div', { class: 'acoes-professor' },
      acao('e_material', 'Criar com IA', 'Cole um texto ou envie um arquivo. A IA monta a proposta para você revisar.', () => abrirIA(), true),
      acao('e_conduzir', 'Aplicar em sala', 'Abra a sala com uma atividade pronta e acompanhe a turma.', () => { location.href = link('conduzir.html'); }),
      acao('e_planejar', 'Usar um modelo', 'Comece de um exemplo e ajuste ao conteúdo da sua aula.', () => ir('modelosProntos'))),
    antigo?.A && h('p',{class:'aviso'},'Há um rascunho anterior neste navegador. ',h('button',{class:'btn pequeno',onclick:()=>{abrir(antigo.A,antigo.origem);avisoGeral('Rascunho anterior recuperado. Confira o conteúdo antes de guardar na biblioteca.');}},'Recuperar rascunho anterior')),
    !temBiblioteca() && h('p', { class: 'aviso', 'data-tipo': P.bibErro === 'fora' ? 'alerta' : 'erro' }, P.bibErro === 'fora'
      ? 'Você pode preparar atividades e guardar rascunhos neste navegador. Biblioteca em nuvem e salas on-line exigem autorização do administrador. Exporte uma cópia para levar a outro aparelho.'
      : 'Não foi possível abrir a biblioteca agora. Confira a internet; você ainda pode montar e exportar a planilha.'),
    h('section', { class: 'cartao', id: 'minhasAtividades' }, h('h2', {}, ico('biblioteca'), 'Minhas atividades'),
      rasc.length > 1 && h('div', { class: 'linha-botoes' }, h('button', { class: 'btn pequeno discreto', onclick: () => apagarRascunhos(rasc.map(r => r.rascunhoId), `Apagar os ${rasc.length} rascunhos deste navegador? O que estiver salvo na biblioteca continua lá.`) }, ico('apagar'), `Apagar os ${rasc.length} rascunhos`)),
      rasc.length || bib.length ? h('ul', { class: 'lista-bib' },
        rasc.map(r => h('li', {}, h('div', { class: 'tit' }, h('strong', {}, r.A.titulo), h('small', {}, (r.origem?.bibId ? 'Alterações não salvas na biblioteca · ' : 'Rascunho neste navegador · ') + new Date(r.salvoEm).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }))),
          h('div', { class: 'mini' }, h('button', { class: 'btn pequeno', onclick: () => { abrir(r.A, r.origem, r.rascunhoId); P.sujo = !!r.sujo; salvarRascunho(); render(); } }, 'Continuar'),
            h('button', { class: 'btn pequeno discreto', title: 'Apagar rascunho', 'aria-label': 'Apagar rascunho ' + r.A.titulo, onclick: () => apagarRascunhos([r.rascunhoId], `Apagar o rascunho “${r.A.titulo}” deste navegador? O que estiver salvo na biblioteca continua lá.`) }, ico('apagar'))))),
        bib.map(item => h('li', {},
          h('div', { class: 'tit' }, h('strong', {}, item.titulo || '(sem título)'), h('small', {}, (item.atualizadoEm ? new Date(item.atualizadoEm).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '') + (item.minha ? '' : ' · de ' + (item.autor || 'outro mestre')))),
          item.compartilhada && h('span', { class: 'etiqueta' }, 'compartilhada'),
          h('div', { class: 'mini' },
            h('a', { class: 'btn pequeno primario', href: aplicar(item.id) }, 'Aplicar'),
            h('button', { class: 'btn pequeno', onclick: () => abrirDaBiblioteca(item, false) }, 'Abrir'),
            h('button', { class: 'btn pequeno discreto', title: 'Duplicar', 'aria-label': 'Duplicar', onclick: () => abrirDaBiblioteca(item, true) }, ico('copiar')),
            item.minha && h('button', { class: 'btn pequeno discreto', title: 'Apagar', 'aria-label': 'Apagar ' + item.titulo, onclick: () => apagarDaBiblioteca(item) }, ico('apagar'))))))
        : h('p', { class: 'sutil' }, 'Nenhuma atividade ainda. Comece por “Criar com IA” ou por um modelo.')),
    h('section', { class: 'cartao', id: 'modelosProntos' }, h('h2', {}, ico('abrir'), 'Modelos prontos'),
      h('ul', { class: 'lista-bib' }, CASOS.map(c => h('li', {},
        h('div', { class: 'tit' }, h('strong', {}, c.titulo), h('small', {}, c.resumo)),
        h('div', { class: 'mini' }, h('button', { class: 'btn pequeno', onclick: () => abrirModelo(c.id) }, 'Abrir')))))),
    h('details', { class: 'cartao mais-opcoes' }, h('summary', {}, 'Mais opções: criar do zero, importar, telão, simulador'),
      h('div', { class: 'plan-inicio' },
        h('div', { class: 'cartao' }, h('h2', {}, ilustra('e_planejar', 36), 'Criar do zero'),
          h('label', { for: 'novoTitulo' }, 'Título'), titulo,
          h('div', { class: 'campos-2' }, h('div', {}, h('label', { for: 'novoGrupos' }, 'Grupos'), nGr), h('div', {}, h('label', { for: 'novoModelo' }, 'Começar com'), tipoModelo)),
          h('div', { class: 'linha-botoes' }, h('button', { class: 'btn primario bloco', onclick: () => abrir(modelo(titulo.value.trim() || 'Nova atividade', Number(nGr.value), tipoModelo.value === 'mosaico'), null) }, 'Criar'))),
        h('div', { class: 'cartao' }, h('h2', {}, ico('importar'), 'Importar'),
          h('p', { class: 'sutil' }, 'Planilha (.xlsx) do MOSAICO ou arquivo .json (por exemplo, o devolvido pela IA).'),
          h('label', { for: 'arqImport' }, 'Arquivo'), campoArquivo(arquivo),
          P.importacao.length > 0 && h('ul', { class: 'diag' }, P.importacao.map(d => h('li', { class: d.severidade }, d.mensagem))),
          h('div', { class: 'linha-botoes' },
            h('button', { class: 'btn discreto', onclick: () => baixarPlanilha(modelo('Modelo', 5, true)).catch(e => avisoGeral(e.message, 'erro')) }, 'Baixar planilha-modelo'))),
        h('div', { class: 'cartao' }, h('h2', {}, ilustra('e_telao', 36), 'Telão e simulador'),
          h('p', { class: 'sutil' }, 'O telão mostra o QR, o andamento e os resultados no projetor. O simulador testa a aula com uma turma fictícia.'),
          h('div', { class: 'linha-botoes' }, h('a', { class: 'btn', href: link('telao.html'), 'data-ico': 'telao' }, 'Abrir telão'), h('a', { class: 'btn', href: link('simulador.html'), 'data-ico': 'simulador' }, 'Simulador'))),
        h('details', { class: 'cartao' }, h('summary', {}, ico('ia'), 'Pedido para uma IA externa'), cartaoPrompt()))));
}

/** Lê a lista de mestres. Enquanto não chega (null) ou se falhou ('erro'), a lista não pode ser editada:
 *  salvar grava a lista inteira, então editar sem a lista carregada apagaria os professores que já estão nela. */
function carregarMestres() {
  P.mestres = null;
  b.lerMestres().then(l => { P.mestres = Array.isArray(l) ? l : 'erro'; }, () => { P.mestres = 'erro'; }).then(() => { if (!P.A) render(); });
}

/** Administradores: quem pode guardar na biblioteca e abrir salas on-line (config/mestres no Firestore). */
function cartaoMestres(contaPor = null) {
  const lista = P.mestres;
  if (!Array.isArray(lista)) return h('div', { class: 'cartao' }, h('h2', {}, ico('grupos'), 'Professores autorizados'),
    lista === 'erro'
      ? [h('p', { class: 'aviso', 'data-tipo': 'erro' }, 'Não foi possível ler a lista de professores. Nada foi alterado.'), h('button', { class: 'btn', onclick: () => { carregarMestres(); render(); } }, 'Tentar de novo')]
      : h('p', { class: 'sutil' }, 'Carregando a lista…'));
  const novo = h('input', { id: 'novoMestre', type: 'email', placeholder: 'email@exemplo.com', autocomplete: 'off' });
  const gravar = async emails => {
    try { await b.salvarMestres(emails); P.mestres = emails; render(); avisoGeral('Lista de professores atualizada.', 'ok'); }
    catch (e) { avisoGeral(/permission/i.test(e?.code || e?.message || '') ? 'O servidor recusou: publique as regras novas do Firestore (firestore.rules) e confira se sua conta é de administrador.' : 'Não foi possível salvar: ' + (e?.message || e), 'erro'); }
  };
  const adicionar = () => {
    const { validos, invalidos } = lerEmails(novo.value);
    if (invalidos.length) return avisoGeral('E-mail inválido: ' + invalidos.join(', '), 'erro');
    const juntos = [...new Set([...lista, ...validos])].filter(x => !ADMINS.includes(x));
    if (validos.length) gravar(juntos);
  };
  novo.addEventListener('keydown', ev => { if (ev.key === 'Enter') adicionar(); });
  return h('div', { class: 'cartao' }, h('h2', {}, ico('grupos'), 'Professores autorizados'),
    h('p', { class: 'sutil' }, 'Podem guardar atividades na biblioteca e abrir salas on-line. Tirar um professor corta o acesso dele; as atividades que ele já guardou continuam na lista acima até alguém apagá-las.'),
    h('ul', { class: 'lista-bib' },
        ADMINS.map(e => h('li', {}, h('div', { class: 'tit' }, h('strong', {}, e), h('small', {}, 'administrador' + (contaPor ? ' · ' + contaPor(e) + ' atividade(s) na biblioteca' : ''))))),
        lista.filter(e => !ADMINS.includes(e)).map(e => h('li', {}, h('div', { class: 'tit' }, h('strong', {}, e), contaPor && h('small', {}, contaPor(e) + ' atividade(s) na biblioteca')),
          h('div', { class: 'mini' }, h('button', { class: 'btn pequeno discreto', title: 'Remover', 'aria-label': 'Remover ' + e, onclick: () => { if (confirmar(`Remover ${e} da lista de professores?`)) gravar(lista.filter(x => x !== e)); } }, ico('apagar')))))),
    h('label', { for: 'novoMestre' }, 'Adicionar professor (conta Google)'), novo,
    h('div', { class: 'linha-botoes' }, h('button', { class: 'btn', onclick: adicionar }, ico('mais'), 'Adicionar')));
}

// ============================================================ administração (só os administradores fixos)
/* Vê e apaga tudo: atividades de todos os professores, salas abertas ou esquecidas e a lista de professores.
   As regras do Firestore (função admin()) são o que de fato libera isso; esta tela só aparece para eles. */
async function carregarAdmin() {
  P.adm = { carregando: true, filtro: P.adm?.filtro || '' }; render();
  const [bib, salas] = await Promise.allSettled([b.listarTodaBiblioteca(), b.listarSalas()]);
  P.adm = { ...P.adm, carregando: false,
    bib: bib.status === 'fulfilled' ? bib.value : null, salas: salas.status === 'fulfilled' ? salas.value : null,
    erro: [bib, salas].some(x => x.status === 'rejected') ? 'O servidor recusou parte da leitura. Publique as regras novas do Firestore (firestore.rules) e confira se a sua conta é de administrador.' : '' };
  if (!Array.isArray(P.mestres)) carregarMestres();
  render();
}
const dataCurta = ms => ms ? new Date(ms).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—';
async function admApagarAtividade(item) {
  if (!confirmar(`Apagar “${item.titulo}”, de ${item.autor || 'autor desconhecido'}? Isso não pode ser desfeito.`)) return;
  try { await b.apagarBiblioteca(item.id); P.adm.bib = P.adm.bib.filter(x => x.id !== item.id); render(); avisoGeral('Atividade apagada.', 'ok'); }
  catch (e) { avisoGeral('Não foi possível apagar: ' + e.message, 'erro'); }
}
async function admEncerrarSalas(codigos, pergunta) {
  if (!confirmar(pergunta)) return;
  let ok = 0;
  for (const c of codigos) { try { await b.apagarSala(c); ok++; } catch {} }
  await carregarAdmin();
  avisoGeral(ok === codigos.length ? `${ok} sala(s) encerrada(s). Participantes, envios e pacotes foram apagados.` : `Encerradas ${ok} de ${codigos.length}. Confira as regras do Firestore.`, ok === codigos.length ? 'ok' : 'erro');
}
function telaAdmin() {
  const A = P.adm || {}, agora = Date.now();
  const voltar = h('button', { class: 'btn pequeno', 'data-sem-ico': '', onclick: () => { P.adm = null; render(); } }, ico('voltar'), 'Minhas atividades');
  if (A.carregando) return h('div', { class: 'painel-admin' }, voltar, h('h1', {}, 'Administração'), h('p', { class: 'sutil' }, 'Carregando…'));
  const bib = A.bib || [], salas = A.salas || [];
  const nomeDe = uid => bib.find(x => x.owner === uid)?.autor || 'professor (' + String(uid || '').slice(0, 6) + '…)';
  const autores = [...new Set(bib.map(x => x.autor || '(sem e-mail)'))].sort();
  const lista = A.filtro ? bib.filter(x => (x.autor || '(sem e-mail)') === A.filtro) : bib;
  const vencidas = salas.filter(s => s.venceEm && s.venceEm < agora), abertas = salas.filter(s => !(s.venceEm && s.venceEm < agora));
  const contaPor = e => bib.filter(x => x.autor === e).length;
  const filtro = h('select', { 'aria-label': 'Filtrar por professor', onchange: ev => { P.adm.filtro = ev.target.value; render(); } },
    h('option', { value: '' }, `Todos os professores (${bib.length})`), autores.map(a => h('option', { value: a, selected: a === A.filtro }, `${a} (${bib.filter(x => (x.autor || '(sem e-mail)') === a).length})`)));
  const linhaSala = s => h('li', {},
    h('div', { class: 'tit' }, h('strong', {}, `Sala ${s.codigo}` + (s.titulo ? ' · ' + s.titulo : '')),
      h('small', {}, `${nomeDe(s.owner)} · ${s.participantes} participante(s) · aberta em ${dataCurta(s.criadaEm)} · ` + (s.venceEm && s.venceEm < agora ? 'vencida' : 'vence ' + dataCurta(s.venceEm)))),
    h('div', { class: 'mini' }, h('button', { class: 'btn pequeno perigo', onclick: () => admEncerrarSalas([s.codigo], `Encerrar a sala ${s.codigo}? Participantes, envios e pacotes serão apagados.`) }, 'Encerrar')));
  return h('div', { class: 'painel-admin' }, voltar,
    h('h1', {}, 'Administração'),
    A.erro && h('p', { class: 'aviso', 'data-tipo': 'erro' }, A.erro),
    h('div', { class: 'adm-resumo' },
      [[bib.length, 'atividades'], [autores.length, 'professores com atividades'], [abertas.length, 'salas abertas'], [vencidas.length, 'salas vencidas']].map(([n, t]) => h('div', { class: 'adm-num' }, h('strong', {}, n), h('span', {}, t))),
      h('button', { class: 'btn pequeno', onclick: () => carregarAdmin() }, 'Atualizar')),
    h('section', { class: 'cartao' }, h('h2', {}, ico('biblioteca'), 'Atividades de todos os professores'),
      h('label', {}, 'Professor'), filtro,
      lista.length ? h('ul', { class: 'lista-bib' }, lista.map(item => h('li', {},
        h('div', { class: 'tit' }, h('strong', {}, item.titulo || '(sem título)'), h('small', {}, `${item.autor || '(sem e-mail)'} · ${dataCurta(item.atualizadoEm)}` + (item.compartilhada ? ' · compartilhada' : ''))),
        h('div', { class: 'mini' },
          h('button', { class: 'btn pequeno', title: 'Abre uma cópia; a original continua do professor', onclick: () => { try { abrir(JSON.parse(item.conteudo), null); P.adm = null; avisoGeral('Cópia aberta. A original continua com ' + (item.autor || 'o professor') + '.'); } catch { avisoGeral('O conteúdo desta atividade não pôde ser lido.', 'erro'); } } }, 'Abrir cópia'),
          h('button', { class: 'btn pequeno discreto', title: 'Apagar', 'aria-label': 'Apagar ' + item.titulo, onclick: () => admApagarAtividade(item) }, ico('apagar'))))))
        : h('p', { class: 'sutil' }, 'Nenhuma atividade.')),
    h('section', { class: 'cartao' }, h('h2', {}, ico('sala'), 'Salas'),
      h('p', { class: 'sutil' }, 'Salas abertas agora e as esquecidas depois de vencer. Encerrar apaga participantes, envios e pacotes.'),
      vencidas.length > 0 && h('div', { class: 'linha-botoes' }, h('button', { class: 'btn perigo', onclick: () => admEncerrarSalas(vencidas.map(s => s.codigo), `Encerrar as ${vencidas.length} salas vencidas?`) }, `Encerrar as ${vencidas.length} salas vencidas`)),
      salas.length ? h('ul', { class: 'lista-bib' }, [...abertas, ...vencidas].map(linhaSala)) : h('p', { class: 'sutil' }, 'Nenhuma sala.')),
    cartaoMestres(contaPor));
}

async function abrirModelo(id) {
  try { const a=await carregarCaso(id); a.id+='-copia'; abrir(a,null); }
  catch (e) { avisoGeral('Não foi possível abrir o modelo: ' + e.message, 'erro'); }
}

function cartaoPrompt() {
  const cfg = { publico: '', duracaoMin: 50, numeroGrupos: 5, regime: 'fiel', preferencias: '', tipos: [] };
  const saida = h('textarea', { readonly: true, hidden: true, rows: 6 });
  const ordem = h('p', { class: 'sutil' }, 'Nenhuma escolhida: a IA propõe a sequência.');
  const mostrarOrdem = () => { ordem.textContent = cfg.tipos.length ? 'Ordem: ' + cfg.tipos.map((t, i) => `${i + 1}. ${TIPOS[t].nome}`).join(' · ') : 'Nenhuma escolhida: a IA propõe a sequência.'; };
  const exemplo = async () => { try { return await (await fetch('casos/ciclista-altitude.json')).json(); } catch { return null; } };
  return h('div', {},
    h('p', { class: 'sutil' }, 'Escolha as atividades (na ordem em que tocar), gere o prompt ou o guia .md, leve à IA de sua preferência com o seu material e importe o JSON que ela devolver.'),
    h('div', { class: 'campos-2' },
      h('div', {}, h('label', { for: 'iaPub' }, 'Público'), h('input', { id: 'iaPub', oninput: e => cfg.publico = e.target.value })),
      h('div', {}, h('label', { for: 'iaGr' }, 'Grupos'), h('input', { id: 'iaGr', type: 'number', min: 1, max: 10, value: 5, oninput: e => cfg.numeroGrupos = Math.min(10, Math.max(1, Number(e.target.value) || 5)) }))),
    h('details', {}, h('summary', {}, 'Escolher as atividades'),
      CATEGORIAS.map(([cat, ids]) => h('div', {}, h('small', { class: 'sutil' }, cat), h('div', { class: 'opcoes', style: { gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))' } }, ids.filter(id => TIPOS[id]).map(id =>
        h('label', { class: 'opcao' }, h('input', { type: 'checkbox', onchange: e => { cfg.tipos = e.target.checked ? [...cfg.tipos, id] : cfg.tipos.filter(x => x !== id); mostrarOrdem(); } }), h('span', {}, TIPOS[id].nome)))))),
      ordem),
    h('label', { for: 'iaPref' }, 'Preferências por etapa (opcional)'), h('textarea', { id: 'iaPref', rows: 2, oninput: e => cfg.preferencias = e.target.value }),
    h('div', { class: 'linha-botoes' },
      h('button', { class: 'btn', onclick: async () => { saida.value = gerarPrompt({ ...cfg, organizacao: 'grupos', exemplo: await exemplo() }); saida.hidden = false; } }, 'Gerar prompt'),
      h('button', { class: 'btn discreto', onclick: async () => { if(!saida.value.trim()) return avisoGeral('Gere o pedido antes de copiar.'); try { await navigator.clipboard.writeText(saida.value); avisoGeral('Prompt copiado.', 'ok'); } catch { saida.select(); } } }, 'Copiar'),
      h('button', { class: 'btn', onclick: async () => {
        const md = gerarGuiaMd({ ...cfg, organizacao: 'grupos', exemplo: await exemplo() });
        const url = URL.createObjectURL(new Blob([md], { type: 'text/markdown' }));
        const l = h('a', { href: url, download: 'guia-mosaico-ia.md' }); document.body.append(l); l.click(); l.remove(); setTimeout(() => URL.revokeObjectURL(url), 30e3);
      } }, 'Baixar guia .md')),
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
function painelFinalizarAtividade(erros) {
 const revisada=!!P.A.docente?.revisadoEm,liberada=!erros.length;
 const cartao=(n,t,descricao,botao)=>h('article',{class:'finalizar-passo'},h('h3',{},numeroPasso(n),t),h('p',{},descricao),botao);
 return h('section',{class:'cartao finalizar-atividade','aria-label':'Concluir a preparação da atividade'},h('h2',{},'Depois da revisão, conclua nesta ordem'),h('div',{class:'finalizar-grade'},
  cartao(6,'Experimente a atividade',liberada?'Abra a simulação e confira o que professor e alunos verão. Depois volte a esta aba.':'Complete os itens de estrutura acima para simular.',h('button',{class:'btn',onclick:()=>previa()},numeroPasso(6),'Ver como fica')),
  cartao(7,'Salve sua atividade',temBiblioteca()?'Guarde na biblioteca para recuperar em outro aparelho.':'Baixe uma cópia; o rascunho automático fica apenas neste navegador.',h('button',{class:'btn',onclick:()=>temBiblioteca()?dialogoSalvar():baixarJSON(P.A)},numeroPasso(7),temBiblioteca()?'Salvar na biblioteca':'Baixar cópia da atividade')),
  cartao(8,'Leve para a sala',!liberada?'Complete os itens de estrutura acima para continuar.':!revisada?'Marque a revisão do conteúdo acima antes de aplicar.':!temBiblioteca()?'Sua conta precisa de autorização para abrir salas on-line.':'A atividade está pronta para abrir a sala e receber os alunos.',h('button',{class:'btn primario',disabled:!liberada||!revisada||!temBiblioteca(),onclick:()=>conduzirAgora()},numeroPasso(8),'Abrir sala e conduzir'))));
}

function dialogoSalvar(aposSalvar = null) {
  let comp = !!P.origem?.compartilhada;
  const d = h('dialog', { class: 'explica' },
    h('h2', {}, numeroPasso(7),'Salvar na biblioteca'),
    h('p', { class: 'sutil' }, 'A biblioteca é fechada: só contas da lista de mestres entram. Ela guarda a atividade (incluindo o gabarito), nunca dados de participantes.'),
    h('label', { class: 'opcao', style: { marginTop: '8px' } }, h('input', { type: 'checkbox', checked: comp, onchange: e => { comp = e.target.checked; } }), h('span', {}, 'Compartilhar com os outros mestres (eles podem ver e duplicar; só você edita)')),
    h('div', { class: 'linha-botoes' },
      h('button', { class: 'btn primario', onclick: async () => {
        try {
          if (JSON.stringify(P.A).length > 880000) throw new Error('A atividade ficou pesada demais para a biblioteca (imagens). Use imagens menores ou exporte a planilha.');
          const id = await b.salvarBiblioteca(P.origem?.bibId || null, { titulo: P.A.titulo || '(sem título)', conteudo: JSON.stringify(P.A), compartilhada: comp, autor: P.conta?.email || '' });
          P.origem = { bibId: id, compartilhada: comp }; P.sujo = false; salvarRascunho(); await carregarBiblioteca();
          d.close(); d.remove(); render(); avisoGeral('Salvo na biblioteca. Próximo: 8 · Abrir sala e conduzir.', 'ok'); if(typeof aposSalvar === 'function') aposSalvar();
        } catch (e) { avisoGeral(/permission/i.test(e?.code || e?.message || '') ? 'O servidor recusou: confira se as regras do Firestore foram publicadas.' : 'Não foi possível salvar: ' + e.message, 'erro'); d.close(); d.remove(); }
      } }, numeroPasso(7),'Salvar'),
      h('button', { class: 'btn', onclick: () => { d.close(); d.remove(); } }, 'Cancelar')));
  document.body.append(d); d.showModal();
}
function baixarJSON(a) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(a, null, 2)], { type: 'application/json' }));
  const l = h('a', { href: url, download: (a.id || 'atividade') + '.json' }); document.body.append(l); l.click(); l.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30e3);
}

// ============================================================ pré-visualização
function previa(etapaId) {
  const copia=typeof etapaId==='string'?recortarPrevia(P.A,etapaId):P.A;
  const erros=validarAtividade(copia).filter(x=>x.severidade==='erro');
  if(erros.length){irPara('revisao');avisoGeral('Faltam '+erros.length+' itens para simular. Complete os itens indicados na revisão.','alerta');return;}
  try { localStorage.setItem('mosaico-previa', JSON.stringify(typeof etapaId==='string' ? recortarPrevia(P.A,etapaId) : P.A)); } catch { return avisoGeral('O navegador não permitiu guardar a prévia.', 'erro'); }
  const url = new URL('previa.html', location.href); url.search = '?ensaio=1' + (typeof etapaId === 'string' ? '&etapa=' + encodeURIComponent(etapaId) : '');
  const janela=window.open(url.href, '_blank');
  if(!janela) avisoGeral('O navegador bloqueou a simulação. ', 'alerta'), $('avisoGeral').append(h('a',{href:url.href,class:'btn'},'Abrir simulação nesta aba'));
}

/** Leva a atividade aberta direto para a Condução (sem escolher de novo lá). */
function continuarNoCelular() {
  if(EM_ENSAIO) { avisoGeral('O ensaio fica apenas neste navegador. Para continuar em outro aparelho, entre na versão on-line com sua conta autorizada e salve a atividade na biblioteca.'); return; }
  if(P.sujo || !P.origem?.bibId) return dialogoSalvar(continuarNoCelular);
  const url = new URL('conduzir.html',location.href); url.searchParams.set('atividade',P.origem.bibId); if(EM_ENSAIO)url.searchParams.set('ensaio','1');
  const qr=h('div',{class:'qr'}); qr.innerHTML=window.MosaicoQR.svg(url.href,{nivel:'M',margem:2,rotulo:'Continuar esta atividade no celular do professor'});
  const d=h('dialog',{class:'explica'},h('h2',{},'Continuar no celular'),h('p',{},'Leia este QR Code e entre com a mesma conta Google. O material será recuperado da sua biblioteca.'),qr,h('p',{class:'sutil'},'Este é o acesso docente. O QR dos alunos será criado ao abrir a sala.'),h('button',{class:'btn',onclick:()=>{d.close();d.remove();}},'Fechar'));
  document.body.append(d); d.showModal();
}
function abrirIA(atual=null) { if(!atual && P.A)salvarRascunho(); abrirAutoria({contaId:P.conta?.uid || 'local',atual,podeIA:temBiblioteca()||souAdmin(),aplicar:a=>{if(atual && P.A){mudar(x=>{Object.keys(x).forEach(k=>delete x[k]);Object.assign(x,a);});irPara('revisao');}else{abrir(a,null);irPara('revisao');}}}); }
function conduzirAgora() {
  try { localStorage.setItem(PARA_CONDUZIR, JSON.stringify(P.A)); } catch { return avisoGeral('O navegador não permitiu levar a atividade para a Condução.', 'erro'); }
  const url = new URL('conduzir.html', location.href); if (EM_ENSAIO) url.search = '?ensaio=1';
  location.href = url.href;
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
        seletor('Como usar o material', a.regime, [['fiel', 'Usar somente informações do texto'], ['simulacao', 'Permitir situações fictícias identificadas']], v => { a.regime = v; }, { redesenhar: true })),
      campo('Pergunta central', a.perguntaCentral, v => { a.perguntaCentral = v; }, { area: true, linhas: 2 }),
      campo('Introdução (aparece no telão e no celular dos alunos; não revela a solução)', a.introducao, v => { a.introducao = v; }, { area: true, linhas: 4 }),
      campo('Objetivos (um por linha)', (a.objetivos || []).join('\n'), v => { a.objetivos = listaTexto(v); }, { area: true, linhas: 3 })),
    h('div', { class: 'cartao' }, h('h2', {}, 'Meta da turma'),
      h('label', { class: 'opcao' }, h('input', { type: 'checkbox', checked: m.ativa !== false, onchange: e => mudar(() => { m.ativa = e.target.checked; }) }), h('span', {}, 'A turma compete para superar uma meta coletiva')),
      m.ativa !== false && h('div', {},
        h('div', { class: 'campos-2' },
          seletor('Quando a turma supera o desafio?', m.limiar, [...new Set([0.4, 0.5, 0.6, 0.7, 0.8, m.limiar].filter(Number.isFinite))].sort((x, y) => x - y).map(v => [v, Math.round(v * 100) + '%']), v => { m.limiar = Number(v); }),
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
    CATEGORIAS.map(([cat, ids]) => h('div', {}, h('h3', { style: { margin: '16px 0 8px' } }, cat),
      h('div', { class: 'tipo-cartoes' }, ids.filter(id => TIPOS[id]).map(id => { const t = TIPOS[id]; return h('button', { class: 'tipo-cartao', onclick: () => adicionarEtapa(t.typeId) }, ilustra(id, 60), h('div', {}, h('strong', {}, t.nome),
        h('span', { class: 'tipo-quem' }, quemResponde(t), IDEAL_PARA[id] && ' · ideal para ' + IDEAL_PARA[id].toLowerCase()), h('small', {}, t.descricao))); })))));
}
const quemResponde = t => [...new Set(t.participacao.organizacao.map(o => ({ grupos: 'Em grupos', individual: 'Individual', representantes: 'Entre grupos' })[o] || o))].join(' ou ');

function configInicial(typeId, base) {
  const novo = ED.configInicial(typeId); if (novo) return novo;
  if (typeId === 'cadeado_grupo') return { regra: 'fragmentos', perguntas: [perguntaVazia('p1')], distribuicao: 'diferente', minAcertos: 0, fragmentos: [], espera: 30, mensagem: '' };
  if (typeId === 'quiz_grupos') return { perguntas: [perguntaVazia('p1')], aoErrar: 'repassar', segundos: 60, mostrarNoTelao: false, mostrarResposta: true };
  if (typeId === 'cartoes_arrastar') return { formato: 'ordenar', enunciado: '', cartoes: ['c1', 'c2', 'c3', 'c4'].map(id => ({ id, texto: '' })), distribuicao: 'todos', tentativas: 'repetir', espera: 30, conferencia: 'posicao', revelarAoEncerrar: true };
  if (typeId === 'montagem_pecas') return { modo: 'texto', texto: '', quantidade: 'fixa', ocultarAoFim: true, revelarAoEncerrar: false, corte: { tipo: 'colunas', n: 4 } };
  const hip = base?.config?.hipotesesCandidatas || base?.config?.alternativas;
  if (typeId === 'investigacao_fragmentos') return { pergunta: base?.config?.pergunta || '', hipotesesCandidatas: (hip || [1, 2, 3].map(i => ({ id: 'h' + i, texto: '' }))).map(x => ({ ...x })), minEvidencias: 1, justificativa: 'opcional' };
  if (typeId === 'comparar_hipoteses') return { pergunta: base?.config?.pergunta || '', hipotesesCandidatas: (hip || [1, 2, 3].map(i => ({ id: 'h' + i, texto: '' }))).map(x => ({ ...x })), aceitaParcial: false, justificativa: 'obrigatoria' };
  return { enunciado: base?.config?.enunciado || '', alternativas: (hip && hip.length <= 5 ? hip : ['a', 'b', 'c', 'd'].map(id => ({ id, texto: '' }))).map(x => ({ ...x })) };
}
function participacaoPadrao(typeId) {
  const t = TIPOS[typeId];
  return { organizacao: t.participacao.organizacao[0], envio: t.participacao.envio[0], competicao: ['quiz_grupos', 'sequencia'].includes(typeId) ? 'entre_grupos' : t.participacao.competicao.includes('meta') ? 'meta' : t.participacao.competicao[0] };
}
function adicionarEtapa(typeId) {
  let novo;
  mudar(a => {
    const id = novoId('e', idsDe(a.etapas)), ordem = Math.max(0, ...a.etapas.map(e => e.ordem)) + 1;
    const anterior = etapasOrdenadas(a).at(-1);
    novo = { id, ordem, titulo: NOMES_TIPO[typeId], typeId, typeVersion: TIPOS[typeId].typeVersion, tempoMin: typeId === 'questao_individual' ? 4 : ['cartoes_arrastar', 'pares', 'corrida', 'sequencia'].includes(typeId) ? 8 : typeId === 'analise_imagem' ? 10 : typeId === 'escala_padronizada' ? 6 : typeId === 'jogo_economico' ? 5 : 15, instrucao: '', participacao: participacaoPadrao(typeId), config: configInicial(typeId, anterior) };
    a.etapas.push(novo);
    P.secao = 'etapa:' + id;
    if (typeId === 'comparar_hipoteses') {
      const fonte = etapasOrdenadas(a).filter(e => e.typeId === 'investigacao_fragmentos' && e.ordem < ordem).at(-1);
      if (fonte) a.conexoes.push({ id: `c_${fonte.id}_${id}`, de: { etapaId: fonte.id, portId: 'hipotese_grupo' }, para: { etapaId: id, portId: 'hipoteses_recebidas' }, agregacao: 'colecao_uma_por_grupo_planejado' });
    }
    if (typeId === 'investigacao_fragmentos') a.grupos.forEach(g => a.pecas.push({ id: novoId('p', idsDe(a.pecas)), etapaId: id, destinatarios: [g.id], origem: { natureza: 'sintetico' }, conteudo: '' }));
    P.secao = 'etapa:' + id;
  });
  marcarHistorico();
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
        h('div', { class: 'etapa-cab' }, ilustra(e.typeId, 52), h('div', {}, h('h2', { style: { margin: 0 } }, `Etapa ${pos + 1}`), h('small', { class: 'sutil' }, t?.nome || NOMES_TIPO[e.typeId] || e.typeId))),
        h('div', { class: 'mini' },
          h('button', { class: 'btn', disabled: pos === 0, 'aria-label': 'Mover para antes', onclick: () => mover(-1) }, '↑'),
          h('button', { class: 'btn', disabled: pos === seq.length - 1, 'aria-label': 'Mover para depois', onclick: () => mover(1) }, '↓'),
          h('button', { class: 'btn', title: temErros(validarAtividade(a)) ? 'Corrija os erros (veja Revisão)' : 'Abrir a turma simulada já nesta etapa', disabled: temErros(validarAtividade(recortarPrevia(a,e.id))), onclick: () => previa(e.id) }, ico('previa'), 'Ver esta etapa'),
          h('button', { class: 'btn', title: 'Duplicar etapa', onclick: () => duplicarEtapa(e) }, '⧉'),
          h('button', { class: 'btn perigo', 'aria-label': 'Remover etapa', onclick: () => removerEtapa(e) }, '✕'))),
      h('p',{class:'aviso'},'Tipo desta etapa: '+(TIPOS[e.typeId]?.nome || e.typeId)+'. O título é livre; para mudar o jogo, use Tipo abaixo.'),
      campo('Título', e.titulo, v => { e.titulo = v; }, { max: 120 }),
      h('div', { class: 'campos-3' },
        seletor('Tipo', e.typeId, Object.values(TIPOS).map(x => [x.typeId, x.nome]), v => trocarTipo(e, v), { redesenhar: true }),
        campo('Tempo (min)', e.tempoMin, v => { e.tempoMin = v > 0 ? v : undefined; }, { tipo: 'number' }),
        seletor('Competição', e.participacao.competicao, t.participacao.competicao.map(c => [c, ROT_PART[c] || c]), v => { e.participacao.competicao = v; })),
      h('div', { class: 'campos-2' },
        seletor('Organização', e.participacao.organizacao, t.participacao.organizacao.map(c => [c, ROT_PART[c] || c]), v => { e.participacao.organizacao = v; if (v === 'individual') e.participacao.envio = 'individual'; else if (e.participacao.envio === 'individual' && t.participacao.envio.includes('representante')) e.participacao.envio = 'representante'; }, { redesenhar: true }),
        seletor('Quem envia', e.participacao.envio, t.participacao.envio.map(c => [c, ROT_PART[c] || c]), v => { e.participacao.envio = v; })),
      campo('Instrução para os participantes', e.instrucao, v => { e.instrucao = v; }, { area: true, linhas: 2 }),
      campo('Roteiro do professor nesta etapa (opcional)', a.docente.roteiro?.[e.id] || '', v => { a.docente.roteiro = {...a.docente.roteiro,[e.id]:v}; }, {area:true,linhas:2,ajuda:'Orientação privada para você consultar durante a condução.'})),
    e.typeId === 'investigacao_fragmentos' && blocoInvestigacao(e),
    e.typeId === 'comparar_hipoteses' && blocoComparacao(e),
    e.typeId === 'questao_individual' && blocoQuestao(e),
    e.typeId === 'montagem_pecas' && blocoMontagem(e),
    e.typeId === 'cadeado_grupo' && blocoCadeado(e),
    e.typeId === 'quiz_grupos' && blocoQuiz(e),
    e.typeId === 'cartoes_arrastar' && blocoCartoes(e),
    ED[e.typeId] && ED[e.typeId](e),
    h('div', { id: 'revEtapa' }, revEtapa(diagsEtapa)));
}
const revEtapa = ds => ds.length ? h('div', { class: 'cartao' }, h('h3', {}, 'Revisão desta etapa'), h('ul', { class: 'diag' }, ds.map(d => h('li', { class: d.severidade }, d.mensagem)))) : h('p', { class: 'aviso', 'data-tipo': 'ok' }, 'Esta etapa não tem pendências.');
function diagsDaEtapa(e, diags = validarAtividade(P.A)) {
  const a = P.A, idx = a.etapas.indexOf(e);
  return diags.filter(d => d.local.startsWith(`etapas[${idx}]`) || (d.local.startsWith('pecas[') && a.pecas[Number(d.local.match(/pecas\[(\d+)\]/)?.[1])]?.etapaId === e.id) || d.local === `docente.respostas.${e.id}` || d.local.startsWith(`docente.respostas.${e.id}.`));
}
function atualizarRevEtapa() {
  const alvo = document.getElementById('revEtapa'); if (!alvo || !P.secao.startsWith('etapa:')) return;
  const e = etapa(P.secao.slice(6)); if (e) limpar(alvo, revEtapa(diagsDaEtapa(e)));
}

function trocarTipo(e, novo) {
  if(novo===e.typeId) return;
  if(!confirmar('Trocar o formato substituirá a configuração e a resposta esperada desta etapa. Você poderá desfazer. Continuar?')) return;
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
    try { avisoGeral('Reduzindo a imagem…'); const imagem = await comprimirImagem(f); mudar(()=>{c.imagem=imagem;}); avisoGeral(`Imagem pronta (${Math.round(c.imagem.dados.length / 1024)} KB${c.imagem.reduzida ? ', reduzida para ficar leve' : ''}).`, 'ok'); }
    catch (err) { avisoGeral(err.message, 'erro'); }
  };
  setTimeout(atualizar, 0);
  return h('div', {},
    h('div', { class: 'cartao' }, h('h3', {}, 'Quebra-cabeça: o que vira peças'),
      h('p',{},'Escolha Texto ou Imagem. Cada celular recebe uma peça; o grupo aproxima os aparelhos para reconstruir o todo. Para arrastar cartões na tela, escolha Cartões de arrastar.'),
      h('div',{class:'linha-botoes'},...['texto','imagem'].map(m=>h('button',{class:'btn '+(c.modo===m?'primario':''),'aria-pressed':String(c.modo===m),onclick:()=>mudar(()=>{c.modo=m;if(m==='imagem')c.corte||={tipo:'grade',n:6,colunas:3};})},m==='imagem'?'Quebra-cabeça de imagem':'Montar texto ou conta'))),
      h('div', { class: 'campos-2' },
        seletor('Tipo de conteúdo', c.modo, [['texto', 'Texto ou conta'], ['imagem', 'Imagem']], v => { c.modo = v; if(v==='imagem')c.corte||={tipo:'grade',n:6,colunas:3}; }, { redesenhar: true }),
        seletor('Quantidade de peças', c.quantidade || 'fixa', [['fixa', 'As que eu definir'], ['celulares', 'Uma por celular presente']], v => { c.quantidade = v; }, { redesenhar: true })),
      c.modo === 'texto' ? h('div', {},
        h('label', { for: 'mtTexto' }, 'Texto (marque os cortes com | ou com − entre espaços; use hífen "-" para subtração dentro de uma peça)'), areaTexto,
        h('div', { class: 'linha-botoes' },
          h('button', { class: 'btn pequeno', onclick: () => aplicarCorte('sinais') }, 'Cortar nos sinais (= + × ÷)'),
          h('button', { class: 'btn pequeno', onclick: () => aplicarCorte('palavras') }, 'Cortar por palavra'),
          h('button', { class: 'btn pequeno discreto', onclick: () => aplicarCorte('limpar') }, 'Tirar todos os cortes')),
        c.quantidade === 'celulares' && h('p', { class: 'sutil' }, 'Com "uma por celular", os trechos marcados são agrupados em tantas peças quantos forem os celulares, sempre na ordem.'))
      : h('div', {},
        painelImagem(c.imagem,()=>mudar(()=>{delete c.imagem;})),
        h('label', { for: 'mtImg' }, c.imagem ? 'Trocar a imagem' : 'Enviar a imagem (ela é reduzida e comprimida automaticamente)'), campoArquivo(arquivo),
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
  const r = P.A.docente.respostas[e.id];
  if (r && typeof r === 'object' && !('corretaId' in r)) { r.perguntas ||= {}; return r; }
  return (P.A.docente.respostas[e.id] = { perguntas: {} });
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

// ============================================================ Cartões de arrastar
function gabCartoes(e) {
  const r = P.A.docente.respostas[e.id];
  return r && typeof r === 'object' && !r.perguntas && !('corretaId' in r) ? r : (P.A.docente.respostas[e.id] = {});
}
/** Mantém o gabarito coerente com o formato e com a lista de cartões. */
function ajustarGabaritoCartoes(e) {
  const c = e.config, r = gabCartoes(e), ids = c.cartoes.map(x => x.id);
  if (c.formato === 'ordenar') { r.ordem = ids; delete r.colunaDe; delete r.posicao; delete r.margem; }
  if (c.formato === 'classificar') { const cols = new Set((c.colunas || []).map(x => x.id)); r.colunaDe = Object.fromEntries(Object.entries(r.colunaDe || {}).filter(([k, v]) => ids.includes(k) && cols.has(v))); delete r.ordem; delete r.posicao; delete r.margem; }
  if (c.formato === 'termometro') { r.posicao = Object.fromEntries(Object.entries(r.posicao || {}).filter(([k]) => ids.includes(k))); r.margem ??= 15; delete r.ordem; delete r.colunaDe; }
}
function trocarFormato(e, f) {
  const c = e.config;
  c.formato = f;
  if (f === 'classificar' && !c.colunas?.length) c.colunas = [{ id: 'k1', titulo: '' }, { id: 'k2', titulo: '' }];
  if (f !== 'classificar') delete c.colunas;
  if (f === 'termometro') c.polos ||= { esquerda: '', direita: '' }; else delete c.polos;
  if (f === 'ordenar') c.conferencia ||= 'posicao'; else delete c.conferencia;
  ajustarGabaritoCartoes(e);
}

function blocoCartoes(e) {
  const c = e.config, r = gabCartoes(e), f = c.formato;
  // no ordenar, a lista é mostrada (e guardada) na ordem certa
  if (f === 'ordenar' && Array.isArray(r.ordem) && r.ordem.length === c.cartoes.length && r.ordem.every(id => c.cartoes.some(x => x.id === id)))
    c.cartoes = r.ordem.map(id => c.cartoes.find(x => x.id === id));
  ajustarGabaritoCartoes(e);
  const previa = h('div');
  const desenhar = () => limpar(previa, previaCartoes(e));
  const mexer = fn => mudar(() => { fn(); ajustarGabaritoCartoes(e); });
  setTimeout(desenhar, 0);
  const colar = h('textarea', { rows: 5, placeholder: f === 'ordenar' ? 'Renina\nAngiotensina I\nAngiotensina II\nVasoconstrição\n↑ Pressão arterial' : 'Um cartão por linha' });
  const dica = { ordenar: 'Escreva os cartões na ORDEM CERTA, de cima para baixo. Os celulares recebem embaralhado e sem números.', classificar: 'Escolha a coluna certa de cada cartão. O gabarito fica só com quem conduz.', termometro: 'A posição esperada é opcional (0 = polo da esquerda, 100 = da direita). Em branco em todos: a etapa é só para debate. Com posição, o grupo pontua quando fica dentro da margem.' }[f];
  return h('div', {},
    h('div', { class: 'cartao' }, h('h3', {}, 'Formato e regras'),
      h('div', { class: 'campos-2' },
        seletor('Formato', f, [['ordenar', 'Ordenar (sequência, causa e efeito)'], ['classificar', 'Classificar (separar em colunas)'], ['termometro', 'Termômetro (linha entre dois polos)']], v => trocarFormato(e, v), { redesenhar: true }),
        campo('Comando para o grupo (opcional)', c.enunciado || '', v => { c.enunciado = v; }, { max: 500 })),
      f === 'termometro' && h('div', { class: 'campos-2' },
        campo('Polo da esquerda (0)', c.polos?.esquerda || '', v => { c.polos.esquerda = v; }, { max: 80, ajuda: 'Ex.: Totalmente antiético · Leve' }),
        campo('Polo da direita (100)', c.polos?.direita || '', v => { c.polos.direita = v; }, { max: 80, ajuda: 'Ex.: Totalmente ético · Máxima' })),
      f === 'classificar' && h('div', {},
        h('label', {}, `Colunas (${c.colunas.length} de no máximo 6)`),
        c.colunas.map((col, i) => h('div', { class: 'linha-item' },
          h('span', { class: 'num' }, i + 1),
          h('input', { value: col.titulo, maxlength: 80, placeholder: 'Título da coluna', 'aria-label': 'Coluna ' + (i + 1), oninput: ev => { col.titulo = ev.target.value; document.querySelectorAll(`option[data-col="${col.id}"]`).forEach(o => { o.textContent = col.titulo || col.id; }); tocar(); } }),
          h('button', { class: 'btn perigo pequeno', disabled: c.colunas.length <= 2, 'aria-label': 'Remover coluna ' + (i + 1), onclick: () => mexer(() => { c.colunas = c.colunas.filter(x => x !== col); }) }, '✕'))),
        h('div', { class: 'linha-botoes' }, h('button', { class: 'btn pequeno', disabled: c.colunas.length >= 6, onclick: () => mexer(() => { c.colunas.push({ id: novoId('k', idsDe(c.colunas)), titulo: '' }); }) }, '＋ Coluna'))),
      h('div', { class: 'campos-2' },
        seletor('Cartões no grupo', c.distribuicao || 'todos', [['todos', 'Todos movem qualquer cartão'], ['fracionado', 'Cada celular segura alguns (fracionado)']], v => { c.distribuicao = v; desenhar(); }),
        seletor('Tentativas', c.tentativas || 'uma', [['uma', 'Uma só (o primeiro envio vale)'], ['repetir', 'Repetir até acertar']], v => { c.tentativas = v; }, { redesenhar: true })),
      h('div', { class: 'campos-2' },
        c.tentativas === 'repetir' ? seletor('Depois de errar, tentar de novo em', String(c.espera ?? 30), [['0', 'na hora'], ['15', '15 segundos'], ['30', '30 segundos'], ['60', '1 minuto'], ['120', '2 minutos']], v => { c.espera = Number(v); }) : h('div'),
        f === 'ordenar' ? seletor('Conferência', c.conferencia || 'posicao', [['posicao', 'Cada cartão no lugar exato'], ['vizinhos', 'Pares vizinhos na ordem (nota parcial)']], v => { c.conferencia = v; }) : h('div')),
      f === 'ordenar' && e.participacao.organizacao === 'grupos' && seletor('Quadro de cada grupo', c.modo || '', [['', 'A cadeia inteira (cada grupo ordena tudo)'], ['trechos', 'Um trecho da cadeia (entre grupos: o telão junta tudo no fim)']], v => { if (v) c.modo = v; else delete c.modo; }),
      h('label', { class: 'opcao', style: { marginTop: '10px' } }, h('input', { type: 'checkbox', checked: c.revelarAoEncerrar !== false, onchange: ev => { c.revelarAoEncerrar = ev.target.checked; tocar(); } }),
        h('span', {}, f === 'termometro' ? 'Ao encerrar, o telão mostra onde cada grupo pôs cada caso (e a posição esperada, se houver)' : 'Ao encerrar, o telão mostra a resposta esperada'))),
    h('div', { class: 'cartao' }, h('h3', {}, `Cartões (${c.cartoes.length} de no máximo 20)`),
      h('p', { class: 'sutil' }, dica),
      c.cartoes.map((x, i) => h('div', { class: 'linha-item cartao-edit' },
        h('span', { class: 'num' }, f === 'ordenar' ? i + 1 : '•'),
        h('input', { value: x.texto, maxlength: 200, placeholder: 'Texto do cartão', 'aria-label': 'Cartão ' + (i + 1), oninput: ev => { x.texto = ev.target.value; tocar(); clearTimeout(previa._t); previa._t = setTimeout(desenhar, 300); } }),
        f === 'classificar' && h('select', { 'aria-label': 'Coluna certa do cartão ' + (i + 1), style: { width: 'auto', minWidth: '130px' }, onchange: ev => { if (ev.target.value) r.colunaDe[x.id] = ev.target.value; else delete r.colunaDe[x.id]; tocar(); } },
          h('option', { value: '' }, 'coluna certa…'), c.colunas.map(col => h('option', { value: col.id, 'data-col': col.id, selected: r.colunaDe?.[x.id] === col.id }, col.titulo || col.id))),
        f === 'termometro' && h('input', { type: 'number', min: 0, max: 100, value: r.posicao?.[x.id] ?? '', placeholder: '—', title: 'Posição esperada (0 a 100), opcional', 'aria-label': 'Posição esperada do cartão ' + (i + 1), style: { width: '90px' },
          oninput: ev => { const v = ev.target.value; if (v === '') delete r.posicao[x.id]; else r.posicao[x.id] = Math.max(0, Math.min(100, Math.round(Number(v)))); tocar(); } }),
        h('div', { class: 'mini' },
          f === 'ordenar' && h('button', { class: 'btn pequeno', disabled: i === 0, 'aria-label': 'Subir cartão', onclick: () => mexer(() => { [c.cartoes[i - 1], c.cartoes[i]] = [c.cartoes[i], c.cartoes[i - 1]]; }) }, '↑'),
          f === 'ordenar' && h('button', { class: 'btn pequeno', disabled: i === c.cartoes.length - 1, 'aria-label': 'Descer cartão', onclick: () => mexer(() => { [c.cartoes[i + 1], c.cartoes[i]] = [c.cartoes[i], c.cartoes[i + 1]]; }) }, '↓'),
          h('button', { class: 'btn perigo pequeno', disabled: c.cartoes.length <= 2, 'aria-label': 'Remover cartão ' + (i + 1), onclick: () => mexer(() => { c.cartoes = c.cartoes.filter(y => y !== x); }) }, '✕')))),
      h('div', { class: 'linha-botoes' }, h('button', { class: 'btn', disabled: c.cartoes.length >= 20, onclick: () => mexer(() => { c.cartoes.push({ id: novoId('c', idsDe(c.cartoes)), texto: '' }); }) }, '＋ Adicionar cartão')),
      f === 'termometro' && h('div', { style: { maxWidth: '300px' } }, campo('Margem de acerto (±)', r.margem ?? 15, v => { r.margem = Math.max(1, Math.min(50, Math.round(v || 15))); }, { tipo: 'number', ajuda: 'Só vale quando há posição esperada.' })),
      h('details', { style: { marginTop: '10px' } }, h('summary', {}, 'Colar vários cartões de uma vez'),
        h('p', { class: 'sutil' }, f === 'ordenar' ? 'Um por linha, já na ordem certa. Os cartões vazios são substituídos.' : 'Um por linha. Os cartões vazios são substituídos.'),
        colar,
        h('div', { class: 'linha-botoes' }, h('button', { class: 'btn', onclick: () => {
          const novos = cartoesDoTexto(colar.value);
          if (!novos.length) return avisoGeral('Nenhum cartão reconhecido.', 'erro');
          mexer(() => {
            c.cartoes = c.cartoes.filter(x => x.texto.trim());
            for (const t of novos) if (c.cartoes.length < 20) c.cartoes.push({ id: novoId('c', idsDe(c.cartoes)), texto: t.slice(0, 200) });
          });
          avisoGeral(`${novos.length} cartão(ões) adicionado(s).`, 'ok');
        } }, 'Adicionar os cartões colados'))),
      campo('Explicação para a discussão (aparece na revelação final)', r.explicacao || '', v => { r.explicacao = v; }, { area: true, linhas: 2 })),
    h('div', { class: 'cartao' }, h('h3', {}, 'Como a turma recebe'), previa),
    h('p', { class: 'sutil' }, f === 'termometro'
      ? 'Dica: o termômetro rende mais no debate. Ao encerrar, o telão mostra as posições de todos os grupos e destaca o caso com maior divergência.'
      : 'Dica: com "fracionado", cada celular segura só alguns cartões. Ninguém resolve sozinho e o grupo precisa combinar quem põe o quê.'));
}
function previaCartoes(e) {
  const c = e.config, validos = c.cartoes.filter(x => x.texto.trim());
  if (validos.length < 2) return h('p', { class: 'sutil' }, 'Escreva pelo menos 2 cartões para ver a prévia.');
  const prep = prepararCartoes({ ...c, cartoes: validos }, [{ id: 'g', uids: ['Aluno 1', 'Aluno 2', 'Aluno 3', 'Aluno 4'], grupos: ['g'] }], (() => { let x = 0.37; return () => (x = (x * 9301 + 0.49297) % 1); })()).quadros.g;
  const texto = id => validos.find(x => x.id === id).texto;
  return h('div', {},
    h('p', {}, h('strong', {}, 'Embaralhado, sem números:')),
    h('div', { class: 'pecas-fila' }, prep.ordem.map(id => h('span', { class: 'cartao-arr', style: { fontSize: '.9rem', minHeight: 0, padding: '8px 10px' } }, texto(id)))),
    c.distribuicao === 'fracionado' && h('div', { style: { marginTop: '10px' } }, h('strong', {}, 'Num grupo de 4 (fracionado):'),
      h('ul', {}, ['Aluno 1', 'Aluno 2', 'Aluno 3', 'Aluno 4'].map(u => h('li', {}, `${u}: ${prep.ordem.filter(id => prep.dono[id] === u).map(texto).join(' · ') || '— (ajuda a decidir)'}`)))));
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
  // nunca mostrar o nome técnico do campo
  return { pendencias: 'Pendências', introducao: 'Introdução', perguntaCentral: 'Pergunta central', titulo: 'Título' }[local] || 'Geral';
}
function secaoDoLocal(local) {
  const a = P.A;
  let m = local.match(/^pecas\[(\d+)\]/); if (m && a.pecas[Number(m[1])]) return 'etapa:' + a.pecas[Number(m[1])].etapaId;
  m = local.match(/^etapas\[(\d+)\]/); if (m && a.etapas[Number(m[1])]) return 'etapa:' + a.etapas[Number(m[1])].id;
  m = local.match(/^docente\.respostas\.([^.]+)/); if (m && etapa(m[1])) return 'etapa:' + m[1];
  if (/^grupos/.test(local)) return 'grupos';
  if (/^fontes/.test(local)) return 'fontes';
  return 'geral';
}
const linhaDiag = x => h('li', { class: x.severidade }, x.mensagem, ' ',
  h('button', { class: 'btn pequeno discreto', onclick: () => irPara(secaoDoLocal(x.local)) }, 'Ir para ' + onde(x.local)));

function editorRevisao() {
  const a = P.A, d = validarAtividade(a), g = avisoGramatica(a), s = sugerirEquilibrio(a, { dispensadas: P.dispensadas });
  const erros = d.filter(x => x.severidade === 'erro'), outros = d.filter(x => x.severidade !== 'erro');
  return h('div', {},
    painelRevisaoDocente(a,{editar:id=>irPara('etapa:'+id),guardar:()=>{P.sujo=true;salvarRascunho();historico?.registrar(P.A);},atualizar:()=>{renderAcoes();renderNav();const painel=document.querySelector('.finalizar-atividade');if(painel)painel.replaceWith(painelFinalizarAtividade(validarAtividade(P.A).filter(d=>d.severidade==='erro')));}}),
    h('div', { class: 'cartao' + (erros.length ? '' : ' destaque') }, h('h2', {}, erros.length ? `${erros.length} itens a completar ou corrigir` : 'Estrutura completa'),
      erros.length ? h('ul', { class: 'diag' }, erros.map(linhaDiag)) : h('p', {}, 'A estrutura está completa. Confira o conteúdo, as fontes e as respostas esperadas; depois experimente a aula.')),
    (outros.length > 0 || g) && h('div', { class: 'cartao' }, h('h3', {}, 'Avisos'), g && h('p', { class: 'aviso' }, g.mensagem), h('ul', { class: 'diag' }, outros.map(linhaDiag))),
    painelFinalizarAtividade(erros),
    h('div',{class:'cartao'},h('h3',{},'Usar em papel'),h('p',{},'Abra as folhas da turma e o material de quem conduz para imprimir ou salvar em PDF.'),h('button',{class:'btn',onclick:()=>abrirImpressao(P.A)},'Imprimir atividade')),
    s.length > 0 && h('div', { class: 'cartao' }, h('h3', {}, 'Sugestões de equilíbrio'), h('p', { class: 'sutil' }, 'São só propostas. A decisão é sua.'),
      h('ul', { class: 'diag' }, s.map(x => h('li', { class: 'info' }, x.mensagem, ' ', h('button', { class: 'btn pequeno discreto', onclick: () => { P.dispensadas.add(x.id); renderEditor(); } }, 'Dispensar'))))));
}
