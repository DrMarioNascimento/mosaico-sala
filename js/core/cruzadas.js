/* Mosaico Sala · Palavras cruzadas (lógica pura, testada)
   O professor dá a palavra e a dica; a grade se monta sozinha (algoritmo guloso de cruzamento:
   a palavra mais longa no centro, as outras onde cruzam numa letra igual, sem encostar em outras;
   várias ordens com semente fixa, fica a grade mais compacta). Adaptado do protótipo feito no v0.
   Os alunos mandam a palavra inteira de uma dica; quem conduz confere e preenche a grade. */

import { embaralhar } from './desafios.js';

export const MAX_LADO = 15, MAX_PALAVRAS = 25;

/** "Hemácia" → "HEMACIA" (sem acento, sem espaço, maiúsculas). */
export const normalizarPalavra = s => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '');

function semente(seed) {
  return () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

function tentativa(ordem) {
  const tab = new Map(), k = (r, c) => r + ',' + c, postas = [], fora = [];
  let minR = 0, maxR = -1, minC = 0, maxC = -1;
  const por = (it, row, col, dir) => {
    const dr = dir === 'v' ? 1 : 0, dc = dir === 'h' ? 1 : 0;
    for (let i = 0; i < it.resposta.length; i++) {
      const r = row + dr * i, c = col + dc * i, cel = tab.get(k(r, c)) ?? { letra: it.resposta[i], h: false, v: false };
      cel[dir] = true; tab.set(k(r, c), cel);
    }
    const fr = row + dr * (it.resposta.length - 1), fc = col + dc * (it.resposta.length - 1);
    if (!postas.length) { minR = row; minC = col; maxR = fr; maxC = fc; }
    else { minR = Math.min(minR, row); minC = Math.min(minC, col); maxR = Math.max(maxR, fr); maxC = Math.max(maxC, fc); }
    postas.push({ ...it, row, col, dir });
  };
  const nota = (resp, row, col, dir) => {
    const dr = dir === 'v' ? 1 : 0, dc = dir === 'h' ? 1 : 0, n = resp.length;
    if (tab.has(k(row - dr, col - dc)) || tab.has(k(row + dr * n, col + dc * n))) return -1;
    let cruz = 0;
    for (let i = 0; i < n; i++) {
      const r = row + dr * i, c = col + dc * i, cel = tab.get(k(r, c));
      if (cel) { if (cel.letra !== resp[i] || cel[dir]) return -1; cruz++; }
      else if (tab.has(k(r + dc, c + dr)) || tab.has(k(r - dc, c - dr))) return -1;
    }
    const alt = Math.max(maxR, row + dr * (n - 1)) - Math.min(minR, row) + 1, larg = Math.max(maxC, col + dc * (n - 1)) - Math.min(minC, col) + 1;
    if (alt > MAX_LADO || larg > MAX_LADO) return -1;
    return cruz ? cruz * 1000 - alt * larg : -1;
  };
  for (const it of ordem) {
    if (it.resposta.length > MAX_LADO) { fora.push(it.entrada); continue; }
    if (!postas.length) { por(it, 0, 0, 'h'); continue; }
    let melhor = null;
    for (const [chave, cel] of tab) {
      const [r, c] = chave.split(',').map(Number);
      for (let i = 0; i < it.resposta.length; i++) {
        if (it.resposta[i] !== cel.letra) continue;
        for (const dir of ['h', 'v']) {
          if (cel[dir]) continue;
          const row = dir === 'v' ? r - i : r, col = dir === 'h' ? c - i : c, s = nota(it.resposta, row, col, dir);
          if (s > -1 && (!melhor || s > melhor.s)) melhor = { s, row, col, dir };
        }
      }
    }
    if (melhor) por(it, melhor.row, melhor.col, melhor.dir); else fora.push(it.entrada);
  }
  return { postas, fora, minR, minC, linhas: maxR - minR + 1, colunas: maxC - minC + 1 };
}

/**
 * Monta a grade.
 * @param palavras [{id, palavra, dica}]
 * @returns {linhas, colunas, celulas: (letra|null)[][], numeros: (n|null)[][], palavras: [{id, palavra, dica, resposta, row, col, dir, numero}], naoCouberam: [{id,…}]}
 */
export function montarGrade(palavras) {
  const validas = [], excedentes = [];
  for (const entrada of palavras || []) {
    const resposta = normalizarPalavra(entrada.palavra);
    if (resposta.length < 2 || !String(entrada.dica || '').trim()) continue;
    if (validas.length >= MAX_PALAVRAS) excedentes.push(entrada); else validas.push({ entrada, resposta });
  }
  if (!validas.length) return { linhas: 0, colunas: 0, celulas: [], numeros: [], palavras: [], naoCouberam: excedentes };
  const ord = [...validas].sort((a, b) => b.resposta.length - a.resposta.length);
  let melhor = tentativa(ord);
  for (let s = 1; s <= 12; s++) {
    const r = semente(s), resto = ord.slice(1);
    for (let i = resto.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [resto[i], resto[j]] = [resto[j], resto[i]]; }
    const t = tentativa([ord[0], ...resto]);
    if (t.postas.length > melhor.postas.length || (t.postas.length === melhor.postas.length && t.linhas * t.colunas < melhor.linhas * melhor.colunas)) melhor = t;
  }
  const celulas = Array.from({ length: melhor.linhas }, () => Array(melhor.colunas).fill(null));
  const numeros = Array.from({ length: melhor.linhas }, () => Array(melhor.colunas).fill(null));
  const ordenadas = melhor.postas.map(p => ({ ...p, row: p.row - melhor.minR, col: p.col - melhor.minC })).sort((a, b) => a.row - b.row || a.col - b.col);
  let prox = 1;
  const lista = ordenadas.map(p => {
    for (let i = 0; i < p.resposta.length; i++) celulas[p.row + (p.dir === 'v' ? i : 0)][p.col + (p.dir === 'h' ? i : 0)] = p.resposta[i];
    let numero = numeros[p.row][p.col];
    if (numero === null) { numero = prox++; numeros[p.row][p.col] = numero; }
    return { id: p.entrada.id, palavra: p.entrada.palavra, dica: p.entrada.dica, resposta: p.resposta, row: p.row, col: p.col, dir: p.dir, numero };
  });
  const pos = new Map((palavras || []).map((e, i) => [e.id, i]));
  return { linhas: melhor.linhas, colunas: melhor.colunas, celulas, numeros, palavras: lista,
    naoCouberam: [...melhor.fora, ...excedentes].sort((a, b) => (pos.get(a.id) ?? 0) - (pos.get(b.id) ?? 0)) };
}

/** Células de uma palavra da grade. */
export const celulasDa = p => Array.from({ length: p.resposta.length }, (_, i) => [p.row + (p.dir === 'v' ? i : 0), p.col + (p.dir === 'h' ? i : 0)]);

/**
 * Prepara quem resolve o quê.
 * @param conjuntos [{id, uids, grupos}] — uma grade por conjunto (grupo, ou a turma inteira)
 * config.dicas: 'fracionadas' (cada celular tem só algumas dicas) | 'todas'
 * Na grade da turma com dicas fracionadas, as palavras se dividem entre os grupos e, dentro de cada grupo, entre os membros.
 * @returns {quadros: {conj: {membros, deUid: {uid: [índices de palavra]}, grupoDaPalavra?}}, conjDoUid}
 */
export function prepararCruzadas(config, grade, conjuntos, grupoDoUid = {}, rng = Math.random) {
  const n = grade.palavras.length, todas = [...Array(n).keys()], fracionadas = config.dicas !== 'todas';
  const quadros = {}, conjDoUid = {};
  for (const c of conjuntos) {
    if (!c.uids?.length || !n) continue;
    const membros = embaralhar(c.uids, rng), deUid = {};
    for (const u of c.uids) conjDoUid[u] = c.id;
    if (!fracionadas) { for (const u of membros) deUid[u] = todas; quadros[c.id] = { membros, deUid }; continue; }
    const grupos = [...new Set(membros.map(u => grupoDoUid[u] || c.id))];
    if (grupos.length > 1) {                      // grade da turma: palavras por grupo, depois por membro
      const ordem = embaralhar(todas, rng), porGrupo = Object.fromEntries(grupos.map(g => [g, []]));
      ordem.forEach((i, k) => porGrupo[grupos[k % grupos.length]].push(i));
      for (const g of grupos) {
        const ms = membros.filter(u => (grupoDoUid[u] || c.id) === g);
        ms.forEach(u => { deUid[u] = []; });
        porGrupo[g].forEach((i, k) => deUid[ms[k % ms.length]].push(i));
      }
    } else {
      membros.forEach(u => { deUid[u] = []; });
      embaralhar(todas, rng).forEach((i, k) => deUid[membros[k % membros.length]].push(i));
    }
    for (const u of membros) deUid[u].sort((a, b) => a - b);
    quadros[c.id] = { membros, deUid };
  }
  return { quadros, conjDoUid };
}

/**
 * Estado de cada grade a partir dos envios (etapa__uid__wN, {palavra: índice, texto}).
 * Só vale a palavra de uma dica que a pessoa tem; acentos e maiúsculas não importam.
 */
export function estadoCruzadas(config, grade, prep, envios) {
  const ord = [...envios].sort((x, y) => (x.t - y.t) || String(x.id).localeCompare(String(y.id)));
  const E = {};
  for (const [c, q] of Object.entries(prep.quadros || {})) E[c] = { resolvidas: {}, tentativas: 0, erros: 0, porUid: Object.fromEntries(q.membros.map(u => [u, { acertos: 0, erros: 0, ultimo: null }])), concluido: false, concluidoEm: null, total: grade.palavras.length };
  for (const e of ord) {
    const c = prep.conjDoUid?.[e.autor], S = E[c], d = e.dados || {};
    if (!S || S.concluido) continue;
    const i = Number(d.palavra), p = grade.palavras[i];
    if (!p || S.resolvidas[i]) continue;
    const minhas = prep.quadros[c].deUid[e.autor];
    if (minhas && !minhas.includes(i)) continue;
    const U = S.porUid[e.autor] || (S.porUid[e.autor] = { acertos: 0, erros: 0, ultimo: null });
    S.tentativas++;
    if (normalizarPalavra(d.texto) === p.resposta) { S.resolvidas[i] = { uid: e.autor, t: e.t }; U.acertos++; U.ultimo = { palavra: i, certo: true }; }
    else { S.erros++; U.erros++; U.ultimo = { palavra: i, certo: false, texto: String(d.texto || '').slice(0, 30) }; }
    if (Object.keys(S.resolvidas).length === grade.palavras.length) { S.concluido = true; S.concluidoEm = e.t; }
  }
  Object.entries(E).filter(([, S]) => S.concluido).sort((x, y) => x[1].concluidoEm - y[1].concluidoEm).forEach(([, S], i) => { S.posicao = i + 1; });
  for (const S of Object.values(E)) S.acertos = Object.keys(S.resolvidas).length;
  return E;
}

/** Grade para o celular/telão: só as letras das palavras resolvidas. */
export function gradeVisivel(grade, resolvidas) {
  const letras = grade.celulas.map(l => l.map(x => (x === null ? null : '')));
  for (const i of Object.keys(resolvidas || {})) for (const [r, c] of celulasDa(grade.palavras[i])) letras[r][c] = grade.celulas[r][c];
  return { linhas: grade.linhas, colunas: grade.colunas, letras, numeros: grade.numeros };
}
