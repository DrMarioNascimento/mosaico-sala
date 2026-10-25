import { cadeadoIcone } from './lock-icons.js';
/* MOSAICO · Tela de quem participa (celular) */
import { backend } from './backend.js';
import { $, h, limpar, aviso, corDoGrupo, chipGrupo, iconeGrupo, explicar, escalaVisual } from './ui.js';
import { svgPeca } from './quebra-cabeca.js';
import { quadroCartoes, arrastando, definirAoSoltar, lugarAoAcaso } from './arrastar.js';
import { aplicarMovimento } from './core/cartoes.js';
import { criarTelas } from './participar-tipos.js';
import { ilustra } from './icones.js';

const b = await backend();
const params = new URLSearchParams(location.search);
// Simulador de aula: ?perfil=N cria um participante independente; &auto liga o piloto automático.
const PERFIL = params.get('perfil');
const SESSAO = 'mosaico-participante' + (PERFIL ? '-' + PERFIL : '');
let auto = !!PERFIL && params.has('auto');
let uid = null, codigo = null, sala = null, meuNome = '';
const pacotes = {}, inscricoes = {};
// Tipos novos (memória, corrida, cruzadas, quiz que faz pensar, análise de imagem): js/participar-tipos.js
const TP = criarTelas({ sala: () => sala, uid: () => uid, pacotes, b, explicar: (...a) => explicar(...a), carregando: () => carregando(),
  enviar: (prefixo, minimo, dados, grupoId) => enviarTentativa(prefixo, minimo, dados, grupoId), botaoConfirmar: (...a) => botaoConfirmar(...a), listaOpcoes: (...a) => listaOpcoes(...a),
  rascunho: k => rascunho(k), contador: (...a) => contador(...a), agora: () => Date.now(), grupoDe: s => grupoDe(s), nomeDe: (s, u) => nomeDe(s, u),
  redesenhar: () => { chaveRenderizada = ''; render(); }, aviso: (t, k) => aviso($('status'), t, k) });
const rascunhos = {};
let chaveRenderizada = '', autoTimer = null;

$('codigo').value = params.get('sala') || '';

if (PERFIL) {
  const barra = h('div', { class: 'aviso', style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', margin: '8px 0' } },
    h('strong', {}, 'Simulado ' + PERFIL),
    h('label', { style: { margin: 0, display: 'flex', gap: '6px', alignItems: 'center' } },
      h('input', { type: 'checkbox', id: 'autoPiloto', checked: auto, onchange: e => definirAuto(e.target.checked) }), 'Piloto automático'));
  document.querySelector('main').prepend(barra);
  window.MOSAICO_SEM_EXPLICACAO = auto;
}
function definirAuto(v) {
  auto = !!v; window.MOSAICO_SEM_EXPLICACAO = auto;
  const c = document.getElementById('autoPiloto'); if (c) c.checked = auto;
  if (auto) agendarAuto(); else clearTimeout(autoTimer);
}
window.mosaicoAuto = definirAuto;   // o simulador liga/desliga todos de uma vez

$('entrar').onclick = async () => {
  const c = $('codigo').value.trim(), n = $('nome').value.trim().replace(/\s+/g, ' ');
  if (!/^\d{6}$/.test(c) || !n) return aviso($('avisoEntrada'), 'Informe o código de 6 números e seu nome.', 'erro');
  $('entrar').disabled = true;
  try {
    uid = await b.identificar();
    const s = await b.lerSala(c);
    if (!s || s.status !== 'open') throw new Error('Sala não encontrada ou já encerrada.');
    const existente = await b.lerMembro(c, uid);
    if (!existente) {
      if (!s.entradaAberta) throw new Error('A entrada nesta sala está fechada no momento. Peça a quem conduz para liberar.');
      await b.entrar(c, uid, n);
    }
    meuNome = existente?.nome || n;
    try { sessionStorage.setItem(SESSAO, JSON.stringify({ codigo: c, nome: meuNome })); } catch {}
    conectar(c);
  } catch (e) {
    aviso($('avisoEntrada'), e.message === 'recusado' ? 'A sala recusou a entrada (entrada fechada ou sala encerrada).' : e.message, 'erro');
    $('entrar').disabled = false;
  }
};

// Retomar depois de recarregar a página (ou entrar sozinho, no simulador)
(async () => {
  let salvo = null; try { salvo = JSON.parse(sessionStorage.getItem(SESSAO) || 'null'); } catch {}
  if (salvo) {
    uid = await b.identificar();
    if (await b.lerMembro(salvo.codigo, uid)) { meuNome = salvo.nome; conectar(salvo.codigo); return; }
  }
  if (PERFIL && $('codigo').value) {
    uid = await b.identificar();
    const existente = await b.lerMembro($('codigo').value, uid).catch(() => null);
    $('nome').value = existente?.nome || params.get('nome') || 'Simulado ' + PERFIL;
    $('entrar').click();
  }
})();

function conectar(c) {
  codigo = c;
  $('entrada').hidden = true; $('jogo').hidden = false;
  $('identidade').textContent = meuNome + ' · sala ' + c;
  b.observarSala(c, s => { sala = s; sincronizarPacotes(); render(); }, () => aviso($('status'), 'Conexão interrompida. Confira sua internet.', 'erro'));
}

// ---------- quem sou eu na sala ----------
const grupoDe = s => Object.entries(s?.composicao || {}).find(([, m]) => m.includes(uid))?.[0] || null;
const coberturas = s => Object.entries(s?.leitoresExtra || {}).filter(([, m]) => m.includes(uid)).map(([g]) => g);
const nomeGrupo = (s, g) => s.publico.grupos.find(x => x.id === g)?.nome || g;
const nomeDe = (s, u) => s.nomes?.[u] || 'alguém';

function pacotesNecessarios() {
  if (!sala || sala.fase !== 'etapa') return [];
  if (['montagem_pecas', 'cadeado_grupo', 'quiz_grupos'].includes(sala.etapaInfo?.typeId)) return [uid];
  if (sala.etapaInfo?.quadro || sala.etapaInfo?.typeId === 'cartoes_arrastar') return [...(sala.etapaInfo.organizacao === 'representantes' ? [uid] : [grupoDe(sala)].filter(Boolean)), ...(sala.etapaInfo.midia ? ['revelacao'] : [])];
  if (sala.etapaInfo && TP.tem(sala.etapaInfo)) return TP.pacotes(sala.etapaInfo);
  if (sala.etapaInfo?.organizacao === 'individual') return ['individual'];
  const g = grupoDe(sala);
  return [g, ...coberturas(sala)].filter(Boolean);
}
function sincronizarPacotes() {
  const quero = new Set(pacotesNecessarios());
  for (const id of Object.keys(inscricoes)) if (!quero.has(id)) { inscricoes[id](); delete inscricoes[id]; delete pacotes[id]; }
  for (const id of quero) if (!inscricoes[id]) inscricoes[id] = b.observarPacote(codigo, id, p => { pacotes[id] = p; render(); }, () => {});
}

// ---------- renderização ----------
definirAoSoltar(() => { chaveRenderizada = ''; render(); });
function render() {
  if (arrastando()) return;          // não redesenha no meio de um arraste (redesenha ao soltar)
  if (!sala || sala.status !== 'open') {
    limpar($('status')); limpar($('tarefa'), h('div', { class: 'cartao' }, h('h2', {}, 'Sala encerrada'), h('p', {}, 'Obrigado por participar!')));
    try { sessionStorage.removeItem(SESSAO); } catch {}
    return;
  }
  renderStatus();
  const g = grupoDe(sala);
  const chave = JSON.stringify([sala.fase, sala.etapaAtual, g, sala.representantes?.[g], sala.executores, coberturas(sala),
    pacotesNecessarios().map(id => pacotes[id] === undefined ? 'carregando' : pacotes[id]?.etapaId), enviados(), sala.final ? 1 : 0, montagemExpirou(), chaveDesafio()]);
  if (chave === chaveRenderizada) return;   // evita apagar o que está sendo escolhido/digitado
  chaveRenderizada = chave;
  renderTarefa();
  agendarAuto();
}

// ---------- piloto automático (simulador) ----------
// Age como uma pessoa: espera alguns segundos, escolhe uma opção ao acaso,
// marca as peças exigidas, escreve uma justificativa curta e confirma o envio.
function agendarAuto() {
  clearTimeout(autoTimer);
  if (auto) autoTimer = setTimeout(autoAgir, 2500 + Math.random() * 5000);
}
function autoAgir() {
  if (!auto) return;
  const escolher = l => l[Math.floor(Math.random() * l.length)];
  for (const inp of $('tarefa').querySelectorAll('input[data-codigo]')) { inp.value = String(Math.floor(Math.random() * 100)); inp.dispatchEvent(new Event('input')); }
  if ($('tarefa').querySelector('.quadro-cartoes')) window.__autoCartoes?.();
  else if (sala?.etapaInfo && TP.tem(sala.etapaInfo)) TP.auto($('tarefa'));
  for (const btn of $('tarefa').querySelectorAll('button.primario:not(:disabled)')) {
    const caixa = btn.parentElement;
    if (btn.dataset.auto === 'confirmar') { btn.click(); setTimeout(() => btn.click(), 400); continue; }
    if (btn.dataset.codigo !== undefined) { btn.click(); continue; }
    const radios = [...caixa.querySelectorAll(':scope > .opcoes input[type=radio]')];
    if (!radios.length) continue;
    const r = escolher(radios); r.checked = true; r.dispatchEvent(new Event('change'));
    const caixas = [...caixa.querySelectorAll(':scope > .peca input[type=checkbox]')];
    caixas.slice(0, 2).forEach(c => { c.checked = true; c.dispatchEvent(new Event('change')); });
    const ta = caixa.querySelector(':scope > textarea');
    if (ta) { ta.value = 'Escolha feita pelo participante simulado.'; ta.dispatchEvent(new Event('input')); }
    btn.click(); setTimeout(() => btn.click(), 400);
  }
  // Se algo falhou (ex.: conexão), tenta de novo em alguns segundos.
  setTimeout(() => { if (auto && $('tarefa').querySelector('button.primario:not(:disabled)')) agendarAuto(); }, 4000);
}

function enviados() {
  const p = sala.progresso || {};
  return { grupos: Object.keys(p.porGrupo || {}).sort(), eu: !!(p.porParticipante || {})[uid] };
}

function renderStatus() {
  const s = sala, g = grupoDe(s), p = s.progresso;
  const partes = [];
  if (s.fase === 'etapa' && s.etapaInfo?.typeId) partes.push(ilustra(s.etapaInfo.typeId, 38));
  if (g) partes.push(chipGrupo(s.publico.grupos, g, nomeGrupo(s, g)));
  if (s.fase === 'etapa' && p && !p.montagem && !p.cadeado && !p.quiz && !p.cartoes && !p.novo) partes.push(h('span', { class: 'sutil' }, ` ${p.enviados} de ${p.esperados} ${s.etapaInfo?.organizacao === 'individual' ? 'responderam' : 'grupos enviaram'}`));
  limpar($('status'), partes.length ? h('div', { class: 'linha-botoes' }, partes) : null);
}

function renderTarefa() {
  const s = sala, alvo = $('tarefa'), g = grupoDe(s);
  if (s.fase === 'lobby' || (!g && s.fase === 'grupos')) {
    return limpar(alvo, h('div', { class: 'cartao' }, h('h2', {}, s.publico.titulo), h('p', {}, 'Você está na sala. Aguarde a formação dos grupos.'), s.publico.introducao && h('p', { class: 'sutil' }, s.publico.introducao)));
  }
  if (s.fase === 'grupos') return limpar(alvo, cartaoGrupo(s, g, true));
  if (s.fase === 'revisao') return limpar(alvo, h('div', { class: 'cartao' }, h('h2', {}, 'Etapa encerrada'), h('p', {}, 'Aguarde a próxima etapa.')), s.escala != null && h('div', { class: 'cartao' }, h('h3', {}, 'Desempenho da turma'), escalaVisual(s.escala)));
  if (s.fase === 'final') return limpar(alvo, resultadoFinal(s));
  if (s.fase !== 'etapa') return limpar(alvo);

  const info = s.etapaInfo;
  if (info.typeId === 'montagem_pecas') return limpar(alvo, tarefaMontagem(info));
  if (info.typeId === 'cadeado_grupo') return limpar(alvo, tarefaCadeado(info));
  if (info.typeId === 'quiz_grupos') return limpar(alvo, tarefaQuiz(info));
  if (info.quadro || info.typeId === 'cartoes_arrastar') return limpar(alvo, tarefaCartoes(info));
  if (TP.tem(info)) return limpar(alvo, TP.tarefa(info));
  if (info.organizacao === 'individual') {
    const pk = pacotes.individual;
    if (!pk || pk.etapaId !== s.etapaAtual) return limpar(alvo, carregando());
    explicar('ind-' + s.etapaAtual, info.titulo, ['Esta etapa é individual. Responda sozinho, no seu celular.', 'Depois de enviar, não é possível alterar.']);
    return limpar(alvo, tarefaIndividual(pk));
  }
  if (!g) return limpar(alvo, h('div', { class: 'cartao' }, h('p', {}, 'Aguardando quem conduz incluir você em um grupo.')));
  const souRep = s.representantes?.[g] === uid;
  explicar(`grp-${s.etapaAtual}-${souRep}`, info.titulo, souRep
    ? ['Você é quem envia a decisão do seu grupo.', 'Discutam juntos e só envie quando houver acordo. Fique atento ao tempo.', 'Depois de enviar, não é possível alterar.']
    : [`Quem envia pelo seu grupo é ${nomeDe(s, s.representantes?.[g])}.`, 'Leiam as peças juntos e cheguem a um acordo. Só o representante envia.']);
  const blocos = [];
  const pk = pacotes[g];
  blocos.push(pk && pk.etapaId === s.etapaAtual ? tarefaGrupo(pk, g, souRep) : carregando());
  for (const extra of coberturas(s)) {
    const px = pacotes[extra];
    if (px && px.etapaId === s.etapaAtual) blocos.push(h('div', { class: 'cartao destaque' },
      h('h2', {}, 'Tarefa extra: cobrir o grupo ' + nomeGrupo(s, extra)),
      h('p', { class: 'sutil' }, 'Esse grupo ficou sem participantes. Quem conduz pediu que o seu grupo execute também a tarefa dele.'),
      tarefaGrupo(px, extra, s.executores?.[extra] === uid)));
  }
  limpar(alvo, blocos);
}

// ---------- montagem em peças ----------
function montagemExpirou() {
  const i = sala?.etapaInfo;
  if (!i || i.typeId !== 'montagem_pecas' || !i.ocultarAoFim || !i.tempoMin || !i.inicio) return false;
  return Date.now() > i.inicio + i.tempoMin * 60e3;
}
setInterval(() => { if (sala?.etapaInfo?.typeId === 'montagem_pecas') render(); }, 1000);

function tarefaMontagem(info) {
  const pk = pacotes[uid];
  explicar('mont-' + sala.etapaAtual, info.titulo, ['Seu celular mostra uma peça de quebra-cabeça. As saliências e os recortes indicam quem fica ao lado de quem.', 'Juntem os celulares na ordem certa para entender o todo. Não há botão de envio: prestem atenção, a próxima etapa depende do que vocês virem.']);
  if (pk === undefined) return carregando();
  const caixa = h('div', { class: 'cartao' }, h('h2', {}, info.titulo), info.instrucao && h('p', {}, info.instrucao));
  if (montagemExpirou()) { caixa.append(h('p', { class: 'aviso', 'data-tipo': 'alerta' }, 'Tempo esgotado: as peças foram recolhidas. Guarde o que vocês montaram.')); return caixa; }
  if (!pk || pk.etapaId !== sala.etapaAtual) { caixa.append(h('p', { class: 'aviso' }, 'As peças já foram distribuídas. Ajude seu grupo a colocar os celulares na ordem.')); return caixa; }
  if (!pk.pecas.length) {
    caixa.append(h('p', { class: 'aviso montagem-aviso' }, pk.motivo === 'representantes'
      ? 'Os representantes dos grupos estão montando as peças juntos. Acompanhe e ajude a interpretar.'
      : 'Seu grupo tem mais celulares que peças. Ajude a colocar os celulares na ordem certa.'));
    return caixa;
  }
  const g = grupoDe(sala), cor = g ? corDoGrupo(sala.publico.grupos, g) : '#ff8a3d';
  caixa.append(h('p', { class: 'sutil montagem-aviso' }, pk.pecas.length > 1 ? `Você tem ${pk.pecas.length} peças: deslize para ver todas.` : 'Esta é a sua peça. Coloquem os celulares lado a lado, na ordem certa.'),
    h('div', { class: 'pecas-carrossel' }, pk.pecas.map(p => h('div', {}, svgPeca(p, { cor })))));
  return caixa;
}


// ---------- cadeado do grupo e quiz entre grupos ----------
// O celular só manda a escolha; quem conduz confere e devolve certo/errado (e o pedaço, no cadeado por fragmentos).
const pendentes = {};          // tentativas enviadas, à espera da conferência
const proximos = {};           // contador local das tentativas (id do envio)
const agora = () => Date.now();
const liberado = t => t.estado !== 'certa' && agora() >= (t.liberaEm || 0);

function chaveDesafio() {
  const i = sala?.etapaInfo;
  if (sala?.fase !== 'etapa' || !i) return null;
  if (i.typeId === 'cadeado_grupo') {
    const pk = pacotes[uid];
    if (!pk || pk.etapaId !== sala.etapaAtual) return 'c-' + (pk === undefined);
    return JSON.stringify([pk, (pk.tarefas || []).map(liberado), pk.codigo ? agora() >= pk.codigo.liberaEm : null, Object.keys(pendentes).filter(k => pendentes[k] && agora() - pendentes[k].em < 8000)]);
  }
  if (i.quadro || i.typeId === 'cartoes_arrastar') {
    const pk = pacotes[i.organizacao === 'representantes' ? uid : grupoDe(sala)];
    if (!pk || pk.etapaId !== sala.etapaAtual) return 'k-' + (pk === undefined);
    return JSON.stringify([pk, agora() >= (pk.liberaEm || 0), (movsPendentes[pk.etapaId + '#' + pk.conjunto] || []).map(m => [m.cartao, m.para, m.enviado]), !!pacotes.revelacao?.imagem]);
  }
  if (TP.tem(i)) return TP.chave(i);
  if (i.typeId === 'quiz_grupos') {
    const pk = pacotes[uid], j = sala.jogo || {};
    return JSON.stringify([j, pk?.etapaId === sala.etapaAtual ? pk : null, j.estado === 'respondendo' && j.inicio && agora() > j.inicio + j.segundos * 1000]);
  }
  return null;
}
setInterval(() => {
  const t = sala?.etapaInfo?.typeId;
  if (t === 'cadeado_grupo' || t === 'quiz_grupos' || t === 'cartoes_arrastar' || sala?.etapaInfo?.quadro || (sala?.etapaInfo && TP.tem(sala.etapaInfo))) render();
  for (const el of document.querySelectorAll('[data-ate]')) {
    const r = Math.max(0, Math.ceil((Number(el.dataset.ate) - agora()) / 1000));
    el.textContent = el.dataset.formato === 'relogio' ? `${Math.floor(r / 60)}:${String(r % 60).padStart(2, '0')}` : `${r} s`;
  }
}, 1000);
const contador = (ate, formato) => { const r = Math.max(0, Math.ceil((ate - agora()) / 1000)); return h('strong', { 'data-ate': ate, 'data-formato': formato || '' }, formato === 'relogio' ? `${Math.floor(r / 60)}:${String(r % 60).padStart(2, '0')}` : `${r} s`); };

/** Envia uma tentativa com id novo (etapa__quem__t1, t2…); se o número já foi usado, tenta o seguinte. */
async function enviarTentativa(prefixo, minimo, dados, grupoId) {
  let n = Math.max(minimo || 1, proximos[prefixo] || 1);
  for (let k = 0; k < 8; k++, n++) {
    try { await b.enviar(codigo, prefixo + n, { etapaId: sala.etapaAtual, escopo: 'tentativa', grupoId, autor: uid, dados, contingencia: false }); proximos[prefixo] = n + 1; return; }
    catch (e) { if (e.message !== 'ja-enviado') throw e; }
  }
  throw new Error('Não foi possível enviar. Tente de novo.');
}

function placaCadeado(pk) {
  const G = pk.grupo; if (!G) return null;
  const aberto = G.destravado;
  const progresso = pk.regra === 'fragmentos' ? `${G.acertos} de ${G.total} pedaços revelados no grupo` : `${G.acertos} de ${G.necessarios} acertos no grupo`;
  const fr = pk.regra === 'fragmentos' ? G.acertos / Math.max(1, G.total) : G.acertos / Math.max(1, G.necessarios);
  return h('div', { class: 'cadeado-placa' + (aberto ? ' aberto' : '') },
    h('div', { class: 'cadeado-icone', 'aria-hidden': 'true' }, cadeadoIcone(aberto)),
    h('div', {}, h('strong', {}, aberto ? `Cadeado aberto!${G.posicao ? ' (' + G.posicao + 'º grupo)' : ''}` : 'Cadeado fechado'),
      h('div', { class: 'cadeado-barra' }, h('span', { style: { width: Math.round(100 * Math.min(1, fr)) + '%' } })),
      h('small', {}, progresso)));
}

function tarefaCadeado(info) {
  const pk = pacotes[uid];
  explicar('cad-' + sala.etapaAtual, info.titulo, ['Cada um responde a própria pergunta, no próprio celular. Ajudem-se: o cadeado é do grupo.',
    'Errou? Espere alguns segundos e tente de novo.', 'Quando o grupo cumprir a regra, o cadeado abre.']);
  if (pk === undefined || (pk && pk.etapaId !== sala.etapaAtual)) return carregando();
  if (!pk) return carregando();
  const g = grupoDe(sala), cor = g ? corDoGrupo(sala.publico.grupos, g) : '#ff8a3d';
  const caixa = h('div', { class: 'cartao', style: { '--cor': cor } }, h('h2', {}, pk.titulo), pk.instrucao && h('p', {}, pk.instrucao), placaCadeado(pk));
  if (pk.grupo?.destravado) {
    if (pk.mensagem) caixa.append(h('div', { class: 'cadeado-mensagem' }, pk.mensagem));
    else caixa.append(h('p', { class: 'aviso', 'data-tipo': 'ok' }, 'Vocês conseguiram! Aguardem a próxima etapa.'));
  }
  if (pk.motivo === 'sem-tarefa') { caixa.append(h('p', { class: 'aviso' }, 'Você entrou depois da distribuição das perguntas. Ajude seu grupo a pensar!')); return caixa; }
  pk.tarefas.forEach((t, i) => caixa.append(caixaPerguntaCadeado(pk, t, i)));
  if (pk.codigo && !pk.grupo?.destravado) caixa.append(caixaCodigo(pk));
  else if (pk.regra === 'fragmentos' && !pk.grupo?.destravado) caixa.append(h('p', { class: 'sutil' }, `Juntem os pedaços e digam o código para ${nomeDe(sala, sala.executores?.[g] || sala.representantes?.[g])}, que digita no celular dele.`));
  return caixa;
}

function caixaPerguntaCadeado(pk, t, i) {
  const chave = `${pk.etapaId}#${t.tarefa}`, r = rascunho('cad-' + chave), pend = pendentes[chave];
  if (pend && (t.tentativas !== pend.tentativas || agora() - pend.em > 8000)) delete pendentes[chave];
  const titulo = pk.tarefas.length > 1 ? `Pergunta ${i + 1}` : 'Sua pergunta';
  const box = h('div', { class: 'cadeado-pergunta estado-' + t.estado });
  box.append(h('h3', {}, titulo), h('p', {}, t.enunciado));
  if (t.estado === 'certa') {
    box.append(h('p', { class: 'aviso', 'data-tipo': 'ok' }, '✔ Você acertou!'));
    if (t.fragmento !== undefined) box.append(h('div', { class: 'fragmento' }, h('small', {}, 'Seu pedaço do código'), h('div', {}, t.fragmento)), h('p', { class: 'sutil' }, 'Mostre ao seu grupo: o código sai da junção dos pedaços.'));
    return box;
  }
  if (pendentes[chave]) { box.append(h('p', { class: 'aviso' }, 'Conferindo a resposta…')); return box; }
  if (!liberado(t)) {
    box.append(h('p', { class: 'aviso', 'data-tipo': 'erro' }, '✗ Não foi dessa vez. Tente de novo em ', contador(t.liberaEm), '.'));
    return box;
  }
  if (t.tentativas) box.append(h('p', { class: 'sutil' }, `Tentativa ${t.tentativas + 1}. Pense com o grupo antes de responder.`));
  box.append(listaOpcoes(t.alternativas, r, true, 'cad-' + chave));
  const msg = h('p', { class: 'aviso', hidden: true });
  const btn = h('button', { class: 'btn primario bloco', onclick: async () => {
    aviso(msg, '');
    if (!r.escolha) return aviso(msg, 'Escolha uma alternativa.', 'erro');
    btn.disabled = true; btn.textContent = 'Enviando…';
    try {
      await enviarTentativa(`${pk.etapaId}__${uid}__t`, pk.proxima, { tarefa: t.tarefa, alternativaId: r.escolha }, pk.grupoId);
      pendentes[chave] = { tentativas: t.tentativas, em: agora() }; r.escolha = null; render();
    } catch (e) { btn.disabled = false; btn.textContent = 'Responder'; aviso(msg, e.message === 'recusado' ? 'Envio recusado: a etapa pode ter sido encerrada.' : e.message, 'erro'); }
  } }, 'Responder');
  box.append(btn, msg);
  return box;
}

function caixaCodigo(pk) {
  const chave = pk.etapaId + '#codigo', r = rascunho('cad-' + chave), c = pk.codigo, pend = pendentes[chave];
  if (pend && (c.tentativas !== pend.tentativas || agora() - pend.em > 8000)) delete pendentes[chave];
  const box = h('div', { class: 'cadeado-codigo' }, h('h3', {}, '🔑 Código do cadeado'), h('p', { class: 'sutil' }, 'Você é o líder: junte os pedaços que o grupo revelou e digite o código.'));
  if (pendentes[chave]) { box.append(h('p', { class: 'aviso' }, 'Conferindo o código…')); return box; }
  if (agora() < c.liberaEm) { box.append(h('p', { class: 'aviso', 'data-tipo': 'erro' }, '✗ Código errado. Nova tentativa em ', contador(c.liberaEm), '.')); return box; }
  const inp = h('input', { type: 'text', inputmode: 'text', autocomplete: 'off', maxlength: 60, 'data-codigo': '', 'aria-label': 'Código do cadeado', value: r.justificativa || '', oninput: e => { r.justificativa = e.target.value; } });
  const msg = h('p', { class: 'aviso', hidden: true });
  const btn = h('button', { class: 'btn primario bloco', 'data-codigo': '', onclick: async () => {
    const v = (inp.value || '').trim(); if (!v) return aviso(msg, 'Digite o código.', 'erro');
    btn.disabled = true;
    try {
      await enviarTentativa(`${pk.etapaId}__${pk.grupoId}__c`, c.proxima, { codigo: v.slice(0, 60) }, pk.grupoId);
      pendentes[chave] = { tentativas: c.tentativas, em: agora() }; r.justificativa = ''; render();
    } catch (e) { btn.disabled = false; aviso(msg, e.message === 'recusado' ? 'Envio recusado.' : e.message, 'erro'); }
  } }, 'Abrir o cadeado');
  box.append(inp, btn, msg);
  return box;
}

function tarefaQuiz(info) {
  const j = sala.jogo || {}, g = grupoDe(sala), pk = pacotes[uid];
  explicar('quiz-' + sala.etapaAtual, info.titulo, ['A cada pergunta, o sistema sorteia o grupo da vez.', 'A pergunta aparece só no celular do líder do grupo sorteado. Fiquem atentos ao telão!']);
  const caixa = h('div', { class: 'cartao' }, h('h2', {}, info.titulo));
  const placar = () => h('div', { class: 'quiz-placar' }, sala.publico.grupos.filter(x => j.placar?.[x.id] !== undefined || (sala.composicao?.[x.id] || []).length)
    .sort((x, y) => (j.placar?.[y.id] || 0) - (j.placar?.[x.id] || 0))
    .map(x => h('span', { class: 'chip', style: { '--cor': corDoGrupo(sala.publico.grupos, x.id) } }, iconeGrupo(sala.publico.grupos, x.id, 22), x.nome, h('strong', {}, ' ' + (j.placar?.[x.id] || 0)))));
  if (!j.n) { caixa.append(h('p', {}, 'Aguardem o sorteio da primeira pergunta.'), placar()); return caixa; }
  const minhaVez = pk && pk.etapaId === sala.etapaAtual && !pk.encerrada && pk.rodada === j.n && pk.grupoId === j.grupoId && j.estado === 'respondendo';
  const vezDe = j.grupoId, nome = nomeGrupo(sala, vezDe);
  caixa.append(h('p', { class: 'sutil' }, `Pergunta ${j.n} de ${j.total}`));
  if (minhaVez) {
    const r = rascunho('quiz-' + pk.envioId), fim = pk.inicio + pk.segundos * 1000;
    caixa.append(h('div', { class: 'quiz-vez minha' }, h('strong', {}, pk.repasse ? 'A pergunta passou para o seu grupo!' : 'Sua vez!'), ' Tempo: ', contador(fim, 'relogio')),
      h('h3', {}, pk.enunciado), h('p', { class: 'sutil' }, 'Só você vê a pergunta: leia em voz alta para o grupo e decidam juntos.'),
      listaOpcoes(pk.alternativas, r, true, 'q-' + pk.envioId));
    const msg = h('p', { class: 'aviso', hidden: true });
    caixa.append(botaoConfirmar('Responder pelo grupo', async () => {
      if (!r.escolha) throw new Error('Escolham uma alternativa.');
      if (agora() > fim + 1000) throw new Error('O tempo acabou.');
      await b.enviar(codigo, pk.envioId, { etapaId: pk.etapaId, escopo: 'tentativa', grupoId: pk.grupoId, autor: uid, dados: { rodada: pk.rodada, alternativaId: r.escolha }, contingencia: false });
    }, msg), msg);
    return caixa;
  }
  const meu = vezDe === g;
  if (j.estado === 'respondendo') {
    caixa.append(h('div', { class: 'quiz-vez' + (meu ? ' minha' : ''), style: { '--cor': corDoGrupo(sala.publico.grupos, vezDe) } },
      iconeGrupo(sala.publico.grupos, vezDe, 40),
      h('div', {}, h('strong', {}, meu ? 'Vez do seu grupo!' : (/^grupo\b/i.test(nome) ? 'Vez do ' + nome : 'Vez do grupo ' + nome)), j.repasseDe ? h('small', {}, ` (repassada por ${nomeGrupo(sala, j.repasseDe)})`) : '', h('br'),
        h('small', {}, meu ? `Só ${nomeDe(sala, sala.executores?.[g] || sala.representantes?.[g])} tem a pergunta. Ajudem a responder!` : 'Acompanhe no telão.'), ' ', contador(j.inicio + j.segundos * 1000, 'relogio'))));
    if (j.enunciado) caixa.append(h('h3', {}, j.enunciado), listaOpcoes(j.alternativas || [], {}, false, 'qv'));
  } else {
    const txt = { certo: `${nome} acertou!`, errado: `${nome} errou.`, tempo: `O tempo de ${nome} acabou.`, encerrada: 'Pergunta encerrada.' }[j.estado] || '';
    caixa.append(h('p', { class: 'aviso', 'data-tipo': j.estado === 'certo' ? 'ok' : 'erro' }, txt));
    if (j.revelacao?.texto) caixa.append(h('p', {}, h('strong', {}, 'Resposta: '), j.revelacao.texto), j.revelacao.explicacao && h('p', { class: 'sutil' }, j.revelacao.explicacao));
    if (!j.fim) caixa.append(h('p', { class: 'sutil' }, 'Aguardem o sorteio da próxima pergunta.'));
  }
  caixa.append(h('h3', {}, 'Placar'), placar());
  return caixa;
}

// ---------- cartões de arrastar ----------
// Cada movimento vira um envio (etapa__uid__mN); o quadro mostra o movimento na hora
// (otimista) até quem conduz devolver o quadro oficial com ele aplicado.
const movsPendentes = {}, proxMov = {};
let filaMov = Promise.resolve();
function quadroAtual(pk) {
  const k = pk.etapaId + '#' + pk.conjunto, visto = pk.ultimoMov?.[uid] || 0;
  const lista = (movsPendentes[k] || []).filter(m => !pk.travado && !(m.enviado && m.n <= visto) && agora() - m.em < 15000);
  movsPendentes[k] = lista;
  return lista.reduce((q, m) => aplicarMovimento({ formato: pk.formato, colunas: pk.colunas }, q, m.cartao, m.para), { ...pk.quadro });
}
function moverCartao(pk, cartao, para) {
  if (pk.travado) return;
  const k = pk.etapaId + '#' + pk.conjunto, m = { cartao, para: para ?? null, enviado: false, em: agora() };
  (movsPendentes[k] ||= []).push(m);
  chaveRenderizada = ''; render();
  filaMov = filaMov.then(async () => {
    let n = Math.max(proxMov[k] || 1, (pk.ultimoMov?.[uid] || 0) + 1);
    for (let t = 0; t < 8; t++, n++) {
      try {
        await b.enviar(codigo, `${pk.etapaId}__${uid}__m${n}`, { etapaId: pk.etapaId, escopo: 'tentativa', grupoId: grupoDe(sala), autor: uid, dados: { cartao, para: m.para }, contingencia: false });
        m.n = n; m.enviado = true; proxMov[k] = n + 1; return;
      } catch (e) { if (e.message !== 'ja-enviado') break; }
    }
    movsPendentes[k] = (movsPendentes[k] || []).filter(x => x !== m);
    aviso($('status'), 'Um movimento não foi aceito (a etapa pode ter sido encerrada).', 'erro');
  }).finally(() => { chaveRenderizada = ''; render(); });
}

function tarefaCartoes(info) {
  const rep = info.organizacao === 'representantes', g = grupoDe(sala);
  const pk = rep ? pacotes[uid] : pacotes[g];
  explicar('cart-' + sala.etapaAtual, info.titulo, [
    'Arraste os cartões até o lugar certo. Se preferir, toque no cartão e depois toque no lugar.',
    rep ? 'Os representantes de cada grupo montam um quadro só, juntos.' : 'O quadro é do grupo: o que um move aparece no celular de todos.',
    'Quando estiver pronto, quem envia confirma o quadro.']);
  if (!rep && !g) return h('div', { class: 'cartao' }, h('p', {}, 'Aguardando quem conduz incluir você em um grupo.'));
  if (pk === undefined) return carregando();
  if (!pk || pk.etapaId !== sala.etapaAtual) return rep
    ? h('div', { class: 'cartao' }, h('h2', {}, info.titulo), info.instrucao && h('p', {}, info.instrucao), h('p', { class: 'aviso' }, 'Os representantes dos grupos estão montando um quadro só, juntos. Acompanhe no telão e ajude o representante do seu grupo.'))
    : carregando();
  const quadro = quadroAtual(pk), total = pk.cartoes.length;
  const colocados = Object.values(quadro).filter(v => v !== null && v !== undefined).length;
  const k = pk.etapaId + '#' + pk.conjunto, pend = (movsPendentes[k] || []).length;
  const lider = rep ? uid : (sala.executores?.[g] || sala.representantes?.[g]);
  const cor = g ? corDoGrupo(sala.publico.grupos, g) : '#ff8a3d';
  const meus = pk.cartoes.filter(c => pk.dono?.[c.id] === uid).length, fracionado = Object.keys(pk.dono || {}).length > 0;
  const caixa = h('div', { class: 'cartao', style: { '--cor': cor } }, h('h2', {}, pk.titulo), pk.instrucao && h('p', {}, pk.instrucao), pk.enunciado && h('h3', {}, pk.enunciado),
    pk.trecho && h('p', { class: 'aviso' }, `Seu grupo tem o trecho ${pk.trecho.de} de ${pk.trecho.total} da cadeia. Ponham na ordem: no fim, o telão junta os trechos de todos os grupos.`));

  const u = pk.ultimo, liberado = agora() >= (pk.liberaEm || 0);
  let placa;
  if (pk.travado && u?.semGabarito) placa = h('p', { class: 'aviso', 'data-tipo': 'ok' }, 'Posições fechadas. Aguardem a discussão no telão.');
  else if (pk.travado && pk.concluido) placa = h('p', { class: 'aviso', 'data-tipo': 'ok' }, `✔ Quadro certo!${pk.posicao ? ' (' + pk.posicao + 'º)' : ''} Aguardem a próxima etapa.`);
  else if (pk.travado) placa = h('p', { class: 'aviso', 'data-tipo': 'alerta' }, `Quadro enviado: ${u.acertos} de ${u.total} certos. Aguardem a discussão.`);
  else if (u && !u.certo) placa = liberado
    ? h('p', { class: 'aviso', 'data-tipo': 'alerta' }, `A conferência deu ${u.acertos} de ${u.total}. Ajustem e enviem de novo.`)
    : h('p', { class: 'aviso', 'data-tipo': 'erro' }, `A conferência deu ${u.acertos} de ${u.total}. Nova tentativa em `, contador(pk.liberaEm), '.');
  else placa = h('div', { class: 'cadeado-placa' }, h('div', { style: { flex: 1, display: 'grid', gap: '4px' } },
    h('strong', {}, `${colocados} de ${total} cartões ${pk.formato === 'termometro' ? 'posicionados' : 'colocados'}`),
    h('div', { class: 'cadeado-barra' }, h('span', { style: { width: Math.round(100 * colocados / Math.max(1, total)) + '%' } }))));
  caixa.append(placa);
  if (fracionado && !pk.travado) caixa.append(h('p', { class: 'sutil' }, meus
    ? `Você segura ${meus} cartão(ões) (os destacados). Só você pode movê-los: combinem quem põe o quê.`
    : 'Os cartões estão com seus colegas. Ajude a decidir onde vai cada um.'));

  caixa.append(quadroCartoes({ pk, quadro, uid, nomes: sala.nomes || {}, mover: (id, para) => moverCartao(pk, id, para), imagemDados: pacotes.revelacao?.etapaId === pk.etapaId ? pacotes.revelacao.imagem?.dados : null }));

  if (!pk.travado) {
    if (lider === uid) {
      const msg = h('p', { class: 'aviso', hidden: true });
      const btn = botaoConfirmar(pk.formato === 'termometro' ? 'Fechar as posições do grupo' : 'Enviar o quadro do grupo', async () => {
        await enviarTentativa(`${pk.etapaId}__${pk.grupoConfirma}__f`, pk.proximaConf, { confirmar: true }, pk.grupoConfirma);
      }, msg);
      btn.dataset.auto = 'confirmar';
      const falta = colocados < total ? `${pk.formato === 'imagem' ? 'Marquem todos os itens' : 'Coloquem todos os cartões'} para enviar (faltam ${total - colocados}).` : pend ? 'Aguardando o quadro sincronizar…' : !liberado ? 'Aguardem a espera acabar.' : '';
      btn.disabled = !!falta;
      caixa.append(...[btn, falta && h('p', { class: 'sutil' }, falta), msg, rep && h('p', { class: 'sutil' }, 'Qualquer representante pode enviar: combinem antes.')].filter(Boolean));
    } else caixa.append(h('p', { class: 'sutil' }, `Quem envia o quadro: ${nomeDe(sala, lider)}.`));
  }

  // piloto automático (simulador): coloca um dos próprios cartões; depois de um erro, mexe em algum
  window.__autoCartoes = () => {
    if (pk.travado) return;
    const q = quadroAtual(pk), ids = pk.cartoes.map(c => c.id).filter(id => !pk.dono?.[id] || pk.dono[id] === uid);
    const soltos = ids.filter(id => q[id] === null || q[id] === undefined);
    const um = l => l[Math.floor(Math.random() * l.length)];
    if (soltos.length) return moverCartao(pk, um(soltos), lugarAoAcaso(pk, q));
    if (u && !u.certo && liberado && ids.length && Math.random() < 0.6) moverCartao(pk, um(ids), lugarAoAcaso(pk, q));
  };
  return caixa;
}

const carregando = () => h('div', { class: 'cartao' }, h('p', { class: 'sutil' }, 'Carregando a etapa…'));

function cartaoGrupo(s, g, comExplicacao) {
  const membros = s.composicao[g] || [], rep = s.representantes?.[g];
  if (comExplicacao) explicar('grupo-' + g, 'Encontre seu grupo', [`Você está no grupo ${nomeGrupo(s, g)}.`, rep === uid ? 'Você foi indicado para enviar as decisões do grupo.' : `Quem envia as decisões do grupo é ${nomeDe(s, rep)}.`, 'Procure os colegas do seu grupo e sentem juntos.']);
  return h('div', { class: 'grupo cartao', style: { '--cor': corDoGrupo(s.publico.grupos, g) } },
    h('div', { class: 'grupo-destaque' }, iconeGrupo(s.publico.grupos, g, 96)),
    h('h2', { style: { textAlign: 'center' } }, nomeGrupo(s, g)),
    h('p', { class: 'sutil' }, s.publico.grupos.find(x => x.id === g)?.funcao || ''),
    h('ul', {}, membros.map(u => h('li', { class: u === rep ? 'eh-rep' : null }, nomeDe(s, u) + (u === uid ? ' (você)' : ''), u === rep && h('span', { class: 'rep' }, 'REPRESENTANTE')))));
}

function rascunho(chave) { return rascunhos[chave] ||= { escolha: null, evidencias: new Set(), justificativa: '' }; }

function tarefaGrupo(pk, g, possoEnviar) {
  const s = sala, r = rascunho(pk.etapaId + '__' + g), cfg = pk.config || {};
  const jaFoi = !!s.progresso?.porGrupo?.[g];
  const caixa = h('div', { class: 'cartao' });
  caixa.append(h('h2', {}, pk.titulo), pk.instrucao && h('p', {}, pk.instrucao));

  if (pk.typeId === 'investigacao_fragmentos') {
    caixa.append(h('h3', {}, 'Peças do grupo'));
    for (const p of pk.pecas || []) {
      const marcar = possoEnviar && !jaFoi && h('label', { class: 'marcar' },
        h('input', { type: 'checkbox', checked: r.evidencias.has(p.id), onchange: e => e.target.checked ? r.evidencias.add(p.id) : r.evidencias.delete(p.id) }), 'Usar como evidência');
      caixa.append(h('div', { class: 'peca' }, p.conteudo, marcar));
    }
  }
  if (pk.typeId === 'comparar_hipoteses') {
    caixa.append(h('h3', {}, 'O que cada grupo concluiu'));
    for (const c of pk.contribuicoes || []) {
      const hip = (cfg.hipotesesCandidatas || []).find(x => x.id === c.hipoteseId);
      caixa.append(h('div', { class: 'grupo', style: { '--cor': corDoGrupo(s.publico.grupos, c.grupoId), marginBottom: '12px' } },
        h('h3', { class: 'titulo-grupo' }, iconeGrupo(s.publico.grupos, c.grupoId, 28), c.grupoNome + (c.autoria?.contingencia ? ' (tarefa coberta)' : '')),
        h('p', {}, h('strong', {}, 'Hipótese: '), hip?.texto || '—'),
        c.justificativa && h('p', { class: 'sutil' }, '“' + c.justificativa + '”'),
        (c.evidencias || []).length ? h('div', {}, h('small', {}, 'Evidências citadas:'), c.evidencias.map(e => h('div', { class: 'peca' }, e.conteudo))) : h('small', {}, 'Nenhuma evidência citada.')));
    }
  }

  caixa.append(h('h3', {}, cfg.pergunta || 'Decisão do grupo'));
  caixa.append(listaOpcoes(cfg.hipotesesCandidatas || [], r, possoEnviar && !jaFoi, 'h-' + pk.etapaId + g));

  if (jaFoi) { caixa.append(h('p', { class: 'aviso', 'data-tipo': 'ok' }, 'Decisão do grupo enviada.')); return caixa; }
  if (!possoEnviar) { caixa.append(h('p', { class: 'aviso' }, `Discutam. Só ${nomeDe(s, (s.executores?.[g]) || s.representantes?.[g])} envia a decisão.`)); return caixa; }

  const just = cfg.justificativa || 'opcional';
  if (just !== 'nenhuma') {
    caixa.append(h('label', { for: 'j-' + g }, 'Justificativa ' + (just === 'obrigatoria' ? '(obrigatória)' : '(opcional)')),
      h('textarea', { id: 'j-' + g, maxlength: 400, oninput: e => { r.justificativa = e.target.value; } }, r.justificativa));
  }
  const msg = h('p', { class: 'aviso', hidden: true });
  const botao = botaoConfirmar('Enviar decisão do grupo', async () => {
    if (!r.escolha) throw new Error('Escolham uma hipótese.');
    const min = pk.typeId === 'investigacao_fragmentos' ? (cfg.minEvidencias ?? 1) : 0;
    if (r.evidencias.size < min) throw new Error(`Marquem pelo menos ${min} peça(s) como evidência.`);
    if (just === 'obrigatoria' && r.justificativa.trim().length < 10) throw new Error('Escrevam uma justificativa curta.');
    const dados = { hipoteseId: r.escolha, justificativa: r.justificativa.trim().slice(0, 400) };
    if (pk.typeId === 'investigacao_fragmentos') dados.evidencias = [...r.evidencias];
    await b.enviar(codigo, pk.etapaId + '__' + g, { etapaId: pk.etapaId, escopo: 'grupo', grupoId: g, autor: uid, dados, contingencia: g !== grupoDe(s) });
  }, msg);
  caixa.append(botao, msg);
  return caixa;
}

function tarefaIndividual(pk) {
  const r = rascunho(pk.etapaId + '__eu'), cfg = pk.config || {};
  const caixa = h('div', { class: 'cartao' }, h('h2', {}, pk.titulo), pk.instrucao && h('p', { class: 'sutil' }, pk.instrucao), h('h3', {}, cfg.enunciado));
  const jaFoi = !!sala.progresso?.porParticipante?.[uid];
  caixa.append(listaOpcoes(cfg.alternativas || [], r, !jaFoi, 'a-' + pk.etapaId));
  if (jaFoi) { caixa.append(h('p', { class: 'aviso', 'data-tipo': 'ok' }, 'Resposta enviada.')); return caixa; }
  const msg = h('p', { class: 'aviso', hidden: true });
  caixa.append(botaoConfirmar('Enviar resposta', async () => {
    if (!r.escolha) throw new Error('Escolha uma alternativa.');
    await b.enviar(codigo, pk.etapaId + '__' + uid, { etapaId: pk.etapaId, escopo: 'participante', grupoId: grupoDe(sala), autor: uid, dados: { alternativaId: r.escolha }, contingencia: false });
  }, msg), msg);
  return caixa;
}

function listaOpcoes(opcoes, r, editavel, nome) {
  return h('div', { class: 'opcoes', role: editavel ? 'radiogroup' : null }, opcoes.map(o => editavel
    ? h('label', { class: 'opcao' }, h('input', { type: 'radio', name: nome, value: o.id, checked: r.escolha === o.id, onchange: () => { r.escolha = o.id; } }), h('span', {}, o.texto))
    : h('div', { class: 'opcao leitura' + (r.escolha === o.id ? ' escolhida' : '') }, h('span', {}, '• ' + o.texto))));
}

/** Botão de dois toques: o primeiro pede confirmação, o segundo envia. */
function botaoConfirmar(rotulo, acao, msg) {
  let armado = false;
  const btn = h('button', { class: 'btn primario bloco', onclick: async () => {
    aviso(msg, '');
    if (!armado) { armado = true; btn.textContent = 'Toque de novo para confirmar (não dá para alterar)'; setTimeout(() => { armado = false; btn.textContent = rotulo; }, 6000); return; }
    btn.disabled = true; btn.textContent = 'Enviando…';
    try { await acao(); btn.textContent = 'Enviado'; aviso(msg, 'Enviado! Aguarde os demais.', 'ok'); }
    catch (e) {
      armado = false; btn.disabled = false; btn.textContent = rotulo;
      aviso(msg, e.message === 'ja-enviado' ? 'Isto já tinha sido enviado.' : e.message === 'recusado' ? 'Envio recusado: a etapa pode ter sido encerrada.' : e.message, 'erro');
    }
  } }, rotulo);
  return btn;
}

function resultadoFinal(s) {
  const f = s.final || {};
  const m = f.meta;
  return h('div', {},
    h('div', { class: 'cartao destaque' }, h('h2', {}, m ? (m.atingida ? 'A turma atingiu a meta!' : 'A turma não atingiu a meta desta vez') : 'Atividade concluída'),
      m && h('p', {}, `${m.acertos} acerto(s) em ${m.total} resposta(s) · meta de ${Math.round(m.limiar * 100)}%`)),
    (f.explicacoes || []).map(e => h('div', { class: 'cartao' }, h('h3', {}, e.titulo), e.resposta && h('p', {}, h('strong', {}, 'Resposta esperada: '), e.resposta), h('p', {}, e.explicacao))));
}
