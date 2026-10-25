/* MOSAICO · Corrida (lógica pura, testada; roda no aparelho de quem conduz)
   Cada jogador (aluno, ou o grupo pelo líder) avança na própria sequência, no próprio ritmo,
   e os pontos somam para o grupo. Três formatos:
     quiz     → perguntas de múltipla escolha (aba Perguntas), como no Quizizz
     corrente → corrente de causa e efeito: cada acerto libera a próxima consequência; um erro quebra a corrente
     direcao  → depois de um estímulo, marcar ↑, ↓ ou = para cada variável
   Power-ups (opcionais), ganhos com sequências de acertos. O mesmo motor serve ao quiz de
   metacognição (resposta + o quanto tem certeza) e às perguntas da análise de imagem. */

import { embaralhar, LETRAS } from './desafios.js';

export const DIRECOES = ['sobe', 'desce', 'igual'];
export const POWER_UPS = {
  dobrar: { nome: 'Dobrar', efeito: 'Dobra os pontos do grupo por 30 s', escopo: 'dentro', icone: '×2' },
  congelar: { nome: 'Congelar', efeito: 'Para o próprio relógio nesta pergunta', escopo: 'dentro', icone: '❄' },
  escudo: { nome: 'Escudo', efeito: 'O próximo erro não quebra a sequência', escopo: 'dentro', icone: '🛡' },
  ajuda: { nome: 'Ajuda do grupo', efeito: 'Tira uma alternativa errada da pergunta de um colega', escopo: 'dentro', icone: '🤝' },
  congelar_rival: { nome: 'Congelar rival', efeito: 'O grupo que está na frente fica 10 s sem responder', escopo: 'entre', icone: '🧊' },
  roubar: { nome: 'Roubar pontos', efeito: 'Tira até 100 pontos do grupo que está na frente e soma ao seu', escopo: 'entre', icone: '💰' },
  embaralhar_rival: { nome: 'Embaralhar', efeito: 'Embaralha as alternativas do grupo que está na frente', escopo: 'entre', icone: '🔀' },
  bloquear: { nome: 'Bloqueio', efeito: 'O próximo power-up do grupo que está na frente não funciona', escopo: 'entre', icone: '⛔' }
};
export const PONTOS_CONFIANCA = { certeza: [3, -2], duvida: [2, 0], chute: [1, 0] };   // [certo, errado]

/**
 * Itens da corrida, na ordem do professor. A resposta certa vem do gabarito (docente.respostas).
 * Item: {id, tipo: 'mc'|'direcao', enunciado, alternativas?: [{id, texto}], certa?, variaveis?: [{id, nome}], certas?: {varId: direção}, explicacao?}
 */
export function itensCorrida(config, gabarito) {
  if (config.formato === 'corrente') {
    const elos = config.elos || [];
    return elos.map((el, i) => ({
      id: el.id, tipo: 'mc', enunciado: i === 0 ? config.gatilho || '' : elos[i - 1].consequencia, pergunta: i === 0 ? 'O que acontece primeiro?' : 'E depois?',
      alternativas: [el.consequencia, ...(el.distratores || []).filter(Boolean)].map((texto, k) => ({ id: LETRAS[k], texto })), certa: 'a'
    }));
  }
  if (config.formato === 'direcao') return (config.rodadas || []).map(r => ({
    id: r.id, tipo: 'direcao', enunciado: r.estimulo, variaveis: (r.variaveis || []).map(v => ({ id: v.id, nome: v.nome })),
    certas: Object.fromEntries((r.variaveis || []).map(v => [v.id, gabarito?.direcoes?.[v.id]]))
  }));
  return (config.perguntas || []).map(q => ({ id: q.id, tipo: 'mc', enunciado: q.enunciado, alternativas: q.alternativas, certa: gabarito?.perguntas?.[q.id]?.corretaId, explicacao: gabarito?.perguntas?.[q.id]?.explicacao || '' }));
}

/**
 * Prepara a sequência de cada jogador.
 * @param jogadores [{id, grupo}] — alunos (cada um soma para o grupo) ou os próprios grupos
 * @returns {jogadores: {id: {grupo, ordem: [índices de item], perm: {item: [posições originais]}}}, grupos: [ids]}
 *   perm: ordem embaralhada das alternativas (os ids a, b, c… são renumerados: a posição não entrega a resposta)
 */
export function prepararCorrida(config, itens, jogadores, rng = Math.random) {
  const idx = itens.map((_, i) => i), out = {};
  const embaralharItens = config.embaralhar !== false && config.formato !== 'corrente';
  for (const j of jogadores) {
    const perm = {};
    itens.forEach((it, i) => { if (it.tipo === 'mc') perm[i] = embaralhar(it.alternativas.map((_, k) => k), rng); });
    out[j.id] = { grupo: j.grupo, ordem: embaralharItens ? embaralhar(idx, rng) : [...idx], perm };
  }
  return { jogadores: out, grupos: [...new Set(jogadores.map(j => j.grupo))] };
}

/** O item como o jogador vê: alternativas na ordem dele, com ids renumerados. */
export function itemDoJogador(itens, P, pos) {
  const i = P.ordem[pos], it = itens[i];
  if (!it) return null;
  if (it.tipo !== 'mc') return { indice: i, tipo: it.tipo, enunciado: it.enunciado, variaveis: it.variaveis };
  return { indice: i, tipo: 'mc', enunciado: it.enunciado, pergunta: it.pergunta, alternativas: P.perm[i].map((k, n) => ({ id: LETRAS[n], texto: it.alternativas[k].texto })) };
}
/** Id que o jogador mandou → id original da alternativa. */
const original = (it, perm, idMandado) => { const n = LETRAS.indexOf(idMandado); return n >= 0 && perm?.[n] !== undefined ? it.alternativas[perm[n]]?.id : null; };

/**
 * Estado da corrida, recalculado do zero a partir dos envios (determinístico).
 * @param envios [{id, autor, grupoId, dados, t}]
 *   resposta: etapa__quem__tN {pos, alternativaId? | direcoes?: {varId: dir}, confianca?}
 *   power-up: etapa__quem__uN {usar, alvo?}
 *   (quem = uid do aluno ou id do grupo, conforme o jogador)
 * @param inicio t do início da etapa (para o relógio da 1ª pergunta)
 */
export function estadoCorrida(config, itens, prep, envios, inicio = 0) {
  const ord = [...envios].sort((x, y) => (x.t - y.t) || String(x.id).localeCompare(String(y.id)));
  const seg = Number(config.segundos) || 0, seq = Math.max(1, Number(config.sequencia) || 3);
  const ativos = (config.powerUps || []).filter(p => POWER_UPS[p]);
  const J = {}, G = {};
  for (const g of prep.grupos) G[g] = { pontos: 0, ajuste: 0, dobrarAte: 0, congeladoAte: 0, bloqueado: false, embaralhado: false, acertos: 0, respostas: 0 };
  for (const [id, P] of Object.entries(prep.jogadores)) J[id] = {
    grupo: P.grupo, pos: 0, inicioItem: inicio, pontos: 0, sequencia: 0, melhor: 0, acertos: 0, erros: 0, ganhos: 0,
    inventario: [], semTempo: false, escudo: false, ajuda: null, terminou: false, terminouEm: null, ultimo: null, historico: [], maxT: 0, maxU: 0
  };
  const feed = [], calib = { certeza: [0, 0], duvida: [0, 0], chute: [0, 0] };
  const lider = (exceto) => Object.entries(G).filter(([g]) => g !== exceto).sort((x, y) => (y[1].pontos + y[1].ajuste) - (x[1].pontos + x[1].ajuste) || x[0].localeCompare(y[0]))[0]?.[0] ?? null;
  const numero = id => Number(String(id).match(/__[a-z](\d+)$/)?.[1] || 0);

  for (const e of ord) {
    const quem = String(e.id).split('__')[1], S = J[quem], d = e.dados || {};
    if (!S) continue;
    const Gs = G[S.grupo];
    if (d.usar !== undefined) {                                    // ---------- power-up
      S.maxU = Math.max(S.maxU, numero(e.id));
      const k = S.inventario.indexOf(d.usar);
      if (k < 0) continue;
      S.inventario.splice(k, 1);
      const p = d.usar, info = POWER_UPS[p];
      if (Gs.bloqueado) { Gs.bloqueado = false; feed.push({ t: e.t, grupo: S.grupo, quem, usar: p, bloqueado: true }); continue; }
      let alvo = null;
      if (p === 'dobrar') Gs.dobrarAte = e.t + 30000;
      if (p === 'congelar') S.semTempo = true;
      if (p === 'escudo') S.escudo = true;
      if (p === 'ajuda') {
        const colegas = Object.entries(J).filter(([id, X]) => id !== quem && X.grupo === S.grupo && !X.terminou);
        const alvoId = colegas.find(([id]) => id === d.alvo)?.[0] ?? colegas.sort((x, y) => x[1].pos - y[1].pos)[0]?.[0];
        if (alvoId) { J[alvoId].ajuda = { pos: J[alvoId].pos }; alvo = alvoId; }
      }
      if (info.escopo === 'entre') {
        alvo = G[d.alvo] && d.alvo !== S.grupo ? d.alvo : lider(S.grupo);
        const A = G[alvo];
        if (A) {
          if (p === 'congelar_rival') A.congeladoAte = e.t + 10000;
          if (p === 'roubar') { const v = Math.min(100, Math.max(0, A.pontos + A.ajuste)); A.ajuste -= v; Gs.ajuste += v; }
          if (p === 'embaralhar_rival') A.embaralhado = true;
          if (p === 'bloquear') A.bloqueado = true;
        }
      }
      feed.push({ t: e.t, grupo: S.grupo, quem, usar: p, alvo });
      continue;
    }
    // ---------- resposta
    S.maxT = Math.max(S.maxT, numero(e.id));
    if (S.terminou || Number(d.pos) !== S.pos || e.t < Gs.congeladoAte) continue;
    const P = prep.jogadores[quem], i = P.ordem[S.pos], it = itens[i];
    if (!it) continue;
    const estourou = seg > 0 && !S.semTempo && e.t > S.inicioItem + seg * 1000 + 1500;
    let frac = 0;
    if (!estourou) {
      if (it.tipo === 'mc') frac = original(it, P.perm[i], d.alternativaId) === it.certa ? 1 : 0;
      else { const vs = it.variaveis || []; frac = vs.length ? vs.filter(v => d.direcoes?.[v.id] && d.direcoes[v.id] === it.certas[v.id]).length / vs.length : 0; }
    }
    const certo = frac === 1;
    let pts;
    if (config.confianca) {
      const c = PONTOS_CONFIANCA[d.confianca] ? d.confianca : 'chute';
      pts = PONTOS_CONFIANCA[c][certo ? 0 : 1] * (config.pontuarConfianca === false ? 0 : 1) + (config.pontuarConfianca === false && certo ? 1 : 0);
      calib[c][0]++; if (certo) calib[c][1]++;
    } else pts = Math.round(100 * frac);
    if (pts > 0 && e.t < Gs.dobrarAte) pts *= 2;
    S.pontos += pts; Gs.pontos += pts; Gs.respostas++;
    S.historico.push({ item: i, certo, frac, pts, tempo: estourou, confianca: d.confianca || null });
    S.ultimo = { certo, frac, pts, tempo: estourou, item: i };
    if (certo) {
      S.acertos++; Gs.acertos++; S.sequencia++; S.melhor = Math.max(S.melhor, S.sequencia);
      if (ativos.length && S.sequencia % seq === 0) { S.inventario.push(ativos[S.ganhos % ativos.length]); S.ganhos++; }
    } else {
      S.erros++;
      if (S.escudo) S.escudo = false; else S.sequencia = 0;
    }
    const quebra = !certo && config.formato === 'corrente' && config.aoQuebrar === 'recomecar';
    S.pos = quebra ? 0 : S.pos + 1;
    S.semTempo = false; S.ajuda = null; S.inicioItem = e.t;
    if (Gs.embaralhado) Gs.embaralhado = false;
    if (S.pos >= P.ordem.length) { S.terminou = true; S.terminouEm = e.t; }
  }
  for (const g of Object.keys(G)) G[g].total = G[g].pontos + G[g].ajuste;
  Object.entries(J).filter(([, S]) => S.terminou).sort((x, y) => x[1].terminouEm - y[1].terminouEm).forEach(([, S], i) => { S.posicao = i + 1; });
  return { jogadores: J, grupos: G, feed: feed.slice(-8), calibracao: calib };
}

/** Uma alternativa errada para tirar (power-up "ajuda"): a primeira errada na ordem do jogador. */
export function alternativaParaTirar(itens, P, pos) {
  const i = P.ordem[pos], it = itens[i];
  if (!it || it.tipo !== 'mc') return null;
  const n = P.perm[i].findIndex(k => it.alternativas[k].id !== it.certa);
  return n >= 0 ? LETRAS[n] : null;
}
