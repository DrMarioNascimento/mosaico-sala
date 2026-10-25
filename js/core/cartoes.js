/* MOSAICO · Cartões de arrastar (lógica pura, testada; roda no aparelho de quem conduz)

   Um motor de arrastar e soltar, três formatos:
     ordenar     → pôr os cartões em sequência (dominó de causa e efeito)
     classificar → arrastar cada cartão para uma coluna (card sorting)
     termometro  → posicionar cada caso numa linha entre dois polos (0 a 100)

   Quadro compartilhado: cada movimento é um envio (etapa__uid__mN) e o líder confirma
   o quadro (etapa__grupo__fN). Quem conduz aplica tudo em ordem e devolve o estado.
   O gabarito (docente.respostas[etapa]) nunca sai do aparelho de quem conduz. */

import { embaralhar } from './desafios.js';

export const FORMATOS = ['ordenar', 'classificar', 'termometro'];

/** Cartões colados, um por linha (linhas vazias ignoradas). */
export function cartoesDoTexto(texto) {
  return String(texto || '').split(/\r?\n/).map(s => s.replace(/^\s*(\d+[).]|[-•*])\s*/, '').trim()).filter(Boolean);
}

/** Embaralha evitando, quando possível, devolver a ordem original. */
function embaralharDiferente(lista, rng) {
  if (lista.length < 2) return [...lista];
  for (let t = 0; t < 20; t++) { const c = embaralhar(lista, rng); if (c.some((x, i) => x !== lista[i])) return c; }
  return [...lista.slice(1), lista[0]];
}

/**
 * Prepara os quadros da etapa.
 * @param conjuntos [{id, uids, grupos: [grupoIds]}] — um quadro por conjunto (grupo, ou todos os representantes)
 * @returns {quadros: {conjId: {membros, ordem, dono}}, conjDoUid, conjDoGrupo}
 *   ordem = ordem de exibição dos cartões (embaralhada); dono = {cartaoId: uid} quando fracionado
 */
export function prepararCartoes(config, conjuntos, rng = Math.random) {
  const ids = (config.cartoes || []).map(c => c.id);
  const fracionado = config.distribuicao === 'fracionado';
  const quadros = {}, conjDoUid = {}, conjDoGrupo = {};
  for (const c of conjuntos) {
    const seus = c.ids || ids;                                         // por trechos: cada grupo com uma parte da cadeia
    if (!c.uids?.length || !seus.length) continue;
    const membros = embaralhar(c.uids, rng), ordem = embaralharDiferente(seus, rng);
    const dono = {};
    if (fracionado) ordem.forEach((id, i) => { dono[id] = membros[i % membros.length]; });
    quadros[c.id] = { membros, ordem, dono, ...(c.ids ? { ids: c.ids, gabOrdem: c.ids } : {}) };
    for (const u of c.uids) conjDoUid[u] = c.id;
    for (const g of c.grupos || [c.id]) conjDoGrupo[g] = c.id;
  }
  return { quadros, conjDoUid, conjDoGrupo };
}

/** Quadro vazio: todos os cartões fora (null). */
export const quadroVazio = ids => Object.fromEntries(ids.map(id => [id, null]));

/**
 * Aplica um movimento e devolve um quadro novo (ou o mesmo, se o movimento é inválido).
 * para: null = de volta para a mão · ordenar: índice da posição · classificar: id da coluna · termometro: 0..100
 */
export function aplicarMovimento(config, quadro, cartaoId, para) {
  if (!(cartaoId in quadro)) return quadro;
  const q = { ...quadro };
  if (para === null || para === undefined || para === 'mao') { q[cartaoId] = null; return q; }
  if (config.formato === 'ordenar') {
    const n = Object.keys(quadro).length, i = Number(para);
    if (!Number.isInteger(i) || i < 0 || i >= n) return quadro;
    const ocupante = Object.keys(q).find(k => q[k] === i && k !== cartaoId);
    if (ocupante) q[ocupante] = quadro[cartaoId];          // troca de lugar (ou volta para a mão)
    q[cartaoId] = i;
    return q;
  }
  if (config.formato === 'classificar') {
    if (!(config.colunas || []).some(c => c.id === para)) return quadro;
    q[cartaoId] = para;
    return q;
  }
  if (config.formato === 'termometro') {
    const v = Number(para);
    if (!Number.isFinite(v)) return quadro;
    q[cartaoId] = Math.max(0, Math.min(100, Math.round(v)));
    return q;
  }
  if (config.formato === 'imagem') {                     // marcar na imagem: {x, y} em % da largura e da altura
    const x = Number(para?.x), y = Number(para?.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return quadro;
    q[cartaoId] = { x: Math.max(0, Math.min(100, Math.round(x * 10) / 10)), y: Math.max(0, Math.min(100, Math.round(y * 10) / 10)) };
    return q;
  }
  return quadro;
}

/** Distância entre dois pontos da imagem, em % da largura (corrige a proporção da imagem). */
export function distanciaImagem(a, b, proporcao = 1) {
  return Math.hypot(a.x - b.x, (a.y - b.y) / (proporcao || 1));
}

/** Todos os cartões colocados? */
export const quadroCompleto = quadro => Object.values(quadro).every(v => v !== null && v !== undefined);

/** Termômetro: há posição esperada para algum cartão? */
export const temGabaritoTermometro = gabarito => Object.values(gabarito?.posicao || {}).some(v => Number.isFinite(Number(v)) && v !== '' && v !== null);

/**
 * Confere um quadro com o gabarito.
 * @returns {acertos, total, certo, semGabarito?}
 *   ordenar: conferencia 'posicao' (cartões no lugar exato) ou 'vizinhos' (pares vizinhos na ordem certa)
 *   classificar: cartões na coluna certa · termometro: cartões dentro da margem da posição esperada
 */
export function conferirQuadro(config, gabarito, quadro) {
  const ids = Object.keys(quadro);
  if (config.formato === 'ordenar') {
    const certa = (gabarito?.ordem?.length ? gabarito.ordem : (config.cartoes || []).map(c => c.id)).filter(id => ids.includes(id));
    const naPos = Array(ids.length).fill(null);
    for (const id of ids) if (Number.isInteger(quadro[id])) naPos[quadro[id]] = id;
    if (config.conferencia === 'vizinhos') {
      let acertos = 0;
      for (let i = 0; i + 1 < naPos.length; i++) if (naPos[i] && naPos[i + 1] && certa.indexOf(naPos[i]) + 1 === certa.indexOf(naPos[i + 1])) acertos++;
      const total = Math.max(1, certa.length - 1);
      return { acertos, total, certo: acertos === total && quadroCompleto(quadro) };
    }
    const acertos = certa.filter((id, i) => naPos[i] === id).length;
    return { acertos, total: certa.length, certo: acertos === certa.length };
  }
  if (config.formato === 'classificar') {
    const col = gabarito?.colunaDe || {};
    const acertos = ids.filter(id => quadro[id] !== null && quadro[id] === col[id]).length;
    return { acertos, total: ids.length, certo: acertos === ids.length };
  }
  if (config.formato === 'imagem') {
    const pos = gabarito?.posicoes || {}, tol = Number(config.tolerancia) || 8;
    const prop = (config.imagem?.largura && config.imagem?.altura) ? config.imagem.largura / config.imagem.altura : 1;
    const acertos = ids.filter(id => quadro[id] && pos[id] && distanciaImagem(quadro[id], pos[id], prop) <= tol).length;
    return { acertos, total: ids.length, certo: acertos === ids.length };
  }
  // termômetro
  const pos = gabarito?.posicao || {}, margem = Number.isFinite(Number(gabarito?.margem)) ? Number(gabarito.margem) : 15;
  const avaliados = ids.filter(id => pos[id] !== undefined && pos[id] !== null && pos[id] !== '' && Number.isFinite(Number(pos[id])));
  if (!avaliados.length) return { acertos: 0, total: 0, certo: true, semGabarito: true };
  const acertos = avaliados.filter(id => quadro[id] !== null && Math.abs(quadro[id] - Number(pos[id])) <= margem).length;
  return { acertos, total: avaliados.length, certo: acertos === avaliados.length };
}

/** Número do envio (…__m12 → 12). */
const numero = id => Number(String(id).match(/__[a-z](\d+)$/)?.[1] || 0);

/**
 * Estado de cada quadro, recalculado do zero a partir dos envios (determinístico).
 * @param envios [{id, autor, grupoId, dados: {cartao, para} | {confirmar: true}, t}]
 *   movimento: id etapa__uid__mN · confirmação: id etapa__grupo__fN
 */
export function estadoCartoes(config, gabarito, prep, envios) {
  const espera = Math.max(0, Number(config.espera ?? 30)) * 1000;
  const repetir = config.tentativas === 'repetir';
  const ordem = [...envios].sort((x, y) => (x.t - y.t) || String(x.id).localeCompare(String(y.id)));
  const ids = (config.cartoes || []).map(c => c.id);
  const Q = {};
  for (const [c, p] of Object.entries(prep.quadros || {})) Q[c] = {
    quadro: quadroVazio(p.ids || ids), movimentos: 0, ultimoMov: {}, confirmacoes: 0, liberaEm: 0,
    travado: false, ultimo: null, concluido: false, concluidoEm: null, membros: p.membros.length
  };
  for (const e of ordem) {
    const d = e.dados || {};
    if (d.confirmar) {
      const c = prep.conjDoGrupo?.[e.grupoId], S = Q[c];
      if (!S || S.travado || e.t < S.liberaEm) continue;
      S.confirmacoes++;
      const P = prep.quadros[c], r = conferirQuadro(config, P.ids ? { ...gabarito, ordem: P.gabOrdem } : gabarito, S.quadro);
      S.ultimo = { ...r, em: e.t };
      if (r.semGabarito || r.certo || !repetir) { S.travado = true; S.concluido = !!(r.semGabarito || r.certo); S.concluidoEm = e.t; S.fechadoEm = e.t; }
      else S.liberaEm = e.t + espera;
      continue;
    }
    const c = prep.conjDoUid?.[e.autor], S = Q[c];
    if (!S) continue;
    S.ultimoMov[e.autor] = Math.max(S.ultimoMov[e.autor] || 0, numero(e.id));
    if (S.travado || !(d.cartao in S.quadro)) continue;
    const dono = prep.quadros[c].dono?.[d.cartao];
    if (dono && dono !== e.autor) continue;                 // fracionado: só quem tem o cartão o move
    const novo = aplicarMovimento(config, S.quadro, d.cartao, d.para);
    if (novo !== S.quadro) { S.quadro = novo; S.movimentos++; }
  }
  Object.entries(Q).filter(([, S]) => S.concluido && S.ultimo && !S.ultimo.semGabarito).sort((x, y) => x[1].concluidoEm - y[1].concluidoEm)
    .forEach(([, S], i) => { S.posicao = i + 1; });
  for (const S of Object.values(Q)) S.colocados = Object.values(S.quadro).filter(v => v !== null).length;
  return Q;
}

/**
 * Termômetro: onde cada quadro pôs cada cartão, e a divergência (maior − menor posição).
 * @returns [{id, texto, pontos: [{conj, pos}], divergencia, esperado?}] ordenado pela divergência
 */
export function distribuicaoTermometro(config, gabarito, estado) {
  return (config.cartoes || []).map(c => {
    const pontos = Object.entries(estado).filter(([, S]) => S.quadro[c.id] !== null && S.quadro[c.id] !== undefined).map(([conj, S]) => ({ conj, pos: S.quadro[c.id] }));
    const ps = pontos.map(p => p.pos);
    const esp = gabarito?.posicao?.[c.id];
    return { id: c.id, texto: c.texto, pontos, divergencia: ps.length > 1 ? Math.max(...ps) - Math.min(...ps) : 0,
      ...(esp !== undefined && esp !== null && esp !== '' && Number.isFinite(Number(esp)) ? { esperado: Number(esp) } : {}) };
  }).sort((x, y) => y.divergencia - x.divergencia);
}

/** Texto da resposta esperada (para o material de quem conduz, a revelação final e a impressão). */
export function respostaEsperadaTexto(config, gabarito) {
  const texto = id => (config.cartoes || []).find(c => c.id === id)?.texto || id;
  if (config.formato === 'ordenar') return (gabarito?.ordem?.length ? gabarito.ordem : (config.cartoes || []).map(c => c.id)).map(texto).join(' → ');
  if (config.formato === 'classificar') return (config.colunas || []).map(col => `${col.titulo}: ${(config.cartoes || []).filter(c => gabarito?.colunaDe?.[c.id] === col.id).map(c => c.texto).join(', ') || '—'}`).join(' · ');
  const pos = gabarito?.posicao || {};
  const com = (config.cartoes || []).filter(c => pos[c.id] !== undefined && pos[c.id] !== null && pos[c.id] !== '');
  return com.length ? com.map(c => `${c.texto}: ${pos[c.id]}`).join(' · ') + ` (margem ±${gabarito?.margem ?? 15})` : '';
}

/**
 * Ordenar por trechos, entre grupos: a cadeia (na ordem certa) é cortada em partes seguidas,
 * uma por grupo. Cada grupo ordena só o próprio trecho; o telão junta a cadeia inteira no fim.
 * @returns [{id: grupo, uids, grupos: [grupo], ids: [cartões do trecho, na ordem certa], trecho: n}]
 */
export function conjuntosPorTrechos(ordemCerta, grupos) {
  const g = grupos.filter(x => x.uids?.length), n = ordemCerta.length, k = Math.max(1, Math.min(g.length, Math.floor(n / 2) || 1));
  const out = [];
  for (let i = 0; i < k; i++) {
    const de = Math.round((i * n) / k), ate = Math.round(((i + 1) * n) / k);
    out.push({ id: g[i].id, uids: g[i].uids, grupos: [g[i].id], ids: ordemCerta.slice(de, ate), trecho: i + 1 });
  }
  return out;
}
