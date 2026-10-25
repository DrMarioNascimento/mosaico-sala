/* MOSAICO · Pares (lógica pura, testada)
   O professor define pares de conteúdo (não precisam ser duas imagens iguais): "Hemossiderina ↔ Fígado".
     ligar   → arrastar cada cartão até o seu par (usa o motor dos cartões de arrastar)
     memoria → cartas viradas; vira duas: se formam par, ficam abertas
   Na memória, a posição das cartas é sorteada aqui e o texto só sai quando a carta é virada. */

import { embaralhar } from './desafios.js';

/**
 * Pares → configuração do motor dos cartões (formato ordenar, um lugar por cartão A).
 * Os lugares mostram o lado A (em ordem sorteada); os cartões arrastados são o lado B.
 * @returns {cfg, gab} — gab.ordem[i] = par cujo B vai no lugar i
 */
export function ligarComoCartoes(config, rng = Math.random) {
  const pares = config.pares || [], ordemA = embaralhar(pares.map(p => p.id), rng);
  const cfg = {
    formato: 'ordenar', enunciado: config.enunciado || '', conferencia: 'posicao',
    cartoes: pares.map(p => ({ id: p.id, texto: p.b })),
    rotulos: ordemA.map(id => pares.find(p => p.id === id).a),
    distribuicao: config.distribuicao || 'todos', tentativas: config.tentativas || 'repetir', espera: config.espera ?? 15,
    revelarAoEncerrar: config.revelarAoEncerrar !== false
  };
  return { cfg, gab: { ordem: ordemA } };
}

/** Prepara os tabuleiros da memória: 2 cartas por par, em posições sorteadas (iguais para todos os tabuleiros). */
export function prepararMemoria(config, conjuntos, rng = Math.random) {
  const cartas = embaralhar((config.pares || []).flatMap(p => [{ par: p.id, lado: 'a' }, { par: p.id, lado: 'b' }]), rng);
  const quadros = {}, conjDoUid = {}, conjDoGrupo = {};
  for (const c of conjuntos) {
    if (!c.uids?.length) continue;
    quadros[c.id] = { membros: c.uids };
    for (const u of c.uids) conjDoUid[u] = c.id;
    for (const g of c.grupos || [c.id]) conjDoGrupo[g] = c.id;
  }
  return { cartas, quadros, conjDoUid, conjDoGrupo, ordemGrupos: embaralhar(conjuntos.filter(c => c.uids?.length).map(c => c.id), rng) };
}

/**
 * Memória em que cada grupo tem o próprio tabuleiro (jogadas: etapa__uid__jN {cartas: [i, j]}).
 * @returns {conj: {achados: {par: t}, abertas: Set-like [índices], tentativas, ultima, concluido, concluidoEm, posicao}}
 */
export function estadoMemoria(config, prep, envios) {
  const ord = [...envios].sort((x, y) => (x.t - y.t) || String(x.id).localeCompare(String(y.id)));
  const total = (config.pares || []).length, E = {};
  for (const c of Object.keys(prep.quadros || {})) E[c] = { achados: {}, tentativas: 0, ultima: null, concluido: false, concluidoEm: null, total };
  for (const e of ord) {
    const c = prep.conjDoUid?.[e.autor], S = E[c];
    if (!S || S.concluido) continue;
    jogar(prep, S, e.dados?.cartas, e.t, e.autor);
    if (Object.keys(S.achados).length === total) { S.concluido = true; S.concluidoEm = e.t; }
  }
  ordenarConclusao(E);
  return E;
}

function jogar(prep, S, cartas, t, quem) {
  const [i, j] = (cartas || []).map(Number), n = prep.cartas.length;
  if (!(Number.isInteger(i) && Number.isInteger(j)) || i === j || i < 0 || j < 0 || i >= n || j >= n) return null;
  const a = prep.cartas[i], b = prep.cartas[j];
  if (S.achados[a.par] || S.achados[b.par]) return null;
  S.tentativas++;
  const acertou = a.par === b.par;
  if (acertou) S.achados[a.par] = { t, quem };
  S.ultima = { cartas: [i, j], acertou, t, quem };
  return acertou;
}
function ordenarConclusao(E) {
  Object.entries(E).filter(([, S]) => S.concluido).sort((x, y) => x[1].concluidoEm - y[1].concluidoEm).forEach(([, S], i) => { S.posicao = i + 1; });
}

/**
 * Memória no telão, entre grupos: um tabuleiro só; o grupo da vez escolhe pelo celular do líder.
 * Acertou, joga de novo; errou (ou passou a vez), vai para o próximo grupo.
 * Envios: etapa__grupo__rN {cartas: [i, j]} (líder) · {passar: true} (quem conduz, ao estourar o tempo)
 */
export function estadoMemoriaTelao(config, prep, envios, inicio = 0) {
  const ord = [...envios].sort((x, y) => (x.t - y.t) || String(x.id).localeCompare(String(y.id)));
  const total = (config.pares || []).length, fila = prep.ordemGrupos || [];
  const S = { achados: {}, tentativas: 0, ultima: null, concluido: false, concluidoEm: null, total, vez: fila[0] ?? null, vezDesde: inicio, placar: Object.fromEntries(fila.map(g => [g, 0])), jogadas: 0 };
  const proximo = () => { if (!fila.length) return; S.vez = fila[(fila.indexOf(S.vez) + 1) % fila.length]; };
  for (const e of ord) {
    if (S.concluido) break;
    const d = e.dados || {};
    if (d.passar) { if (d.vez === S.vez && d.jogada === S.jogadas) { proximo(); S.vezDesde = e.t; S.jogadas++; } continue; }
    if (e.grupoId !== S.vez) continue;
    const r = jogar(prep, S, d.cartas, e.t, e.grupoId);
    if (r === null) continue;
    S.jogadas++;
    if (r) S.placar[S.vez] = (S.placar[S.vez] || 0) + 1; else proximo();
    S.vezDesde = e.t;
    if (Object.keys(S.achados).length === total) { S.concluido = true; S.concluidoEm = e.t; }
  }
  return S;
}

/** Tabuleiro visível: só o texto das cartas achadas e das duas da última jogada. */
export function tabuleiroVisivel(config, prep, S) {
  const texto = c => { const p = (config.pares || []).find(x => x.id === c.par); return p ? p[c.lado] : ''; };
  const ultima = new Set(S.ultima && !S.ultima.acertou ? S.ultima.cartas : []);
  return prep.cartas.map((c, i) => {
    const achada = S.achados[c.par];
    return achada ? { aberta: true, texto: texto(c), achada: true, por: achada.quem } : ultima.has(i) ? { aberta: true, texto: texto(c), errada: true } : { aberta: false };
  });
}
