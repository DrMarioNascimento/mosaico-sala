/* Mosaico Sala · Montagem em peças (lógica pura, testada)
   Cada celular recebe uma peça (trecho de texto/conta ou recorte de imagem) no
   formato de quebra-cabeça. Só na ordem certa a turma entende o todo. Não há
   envio: a etapa vale pelo tempo, e a etapa seguinte cobra o que foi visto. */

/** Separadores de corte: "|" ou o sinal − (ou –) cercado de espaços. Para subtração dentro de uma peça, use o hífen "-". */
export const SEPARADOR = /\s*\|\s*|\s+[−–]\s+/;

/** Texto do professor → unidades (na ordem correta). */
export function unidadesDoTexto(texto) {
  return String(texto || '').split(/\r?\n/).flatMap(linha => linha.split(SEPARADOR)).map(s => s.trim()).filter(Boolean);
}

/** Propostas automáticas de corte para o texto (o professor escolhe e ajusta). */
export function sugerirCortes(texto, modo) {
  const limpo = String(texto || '').replace(/\s*\|\s*/g, ' ').replace(/\s+[−–]\s+/g, ' ').replace(/\s+/g, ' ').trim();
  if (modo === 'palavras') return limpo.split(' ').join(' | ');
  if (modo === 'sinais') return limpo.replace(/\s*([=≈+×÷])\s*/g, ' | $1 ').replace(/^\s*\|\s*/, '').replace(/\s+\|\s+\|\s+/g, ' | ');
  return limpo;
}

/** Junta unidades consecutivas em n peças com tamanhos equilibrados (preserva a ordem). */
export function dividirEmN(unidades, n) {
  const u = unidades.filter(Boolean);
  if (!u.length) return [];
  n = Math.max(1, Math.min(n, u.length));
  if (n === u.length) return [...u];
  const total = u.reduce((t, x) => t + x.length + 1, 0);
  const out = [];
  let atual = [], acumulado = 0;
  for (let i = 0; i < u.length; i++) {
    atual.push(u[i]); acumulado += u[i].length + 1;
    const restamPecas = n - out.length - 1, restamUnidades = u.length - i - 1;
    const alvo = (total / n) * (out.length + 1);
    if (restamPecas > 0 && (acumulado >= alvo || restamUnidades === restamPecas)) { out.push(atual.join(' ')); atual = []; }
  }
  if (atual.length) out.push(atual.join(' '));
  return out;
}

/** Grade de recorte da imagem. tipo: 'colunas' (lado a lado), 'linhas' (empilhadas) ou 'grade'. */
export function gradeDoCorte(tipo, n, colunasGrade) {
  n = Math.max(2, Math.round(n || 2));
  if (tipo === 'linhas') return { linhas: n, colunas: 1 };
  if (tipo === 'grade') { const c = Math.max(2, Math.round(colunasGrade || Math.ceil(Math.sqrt(n)))); return { linhas: Math.max(1, Math.ceil(n / c)), colunas: c }; }
  return { linhas: 1, colunas: n };
}

/** Retângulos (em fração 0..1 da imagem) de cada peça, na ordem de leitura. */
export function retangulos({ linhas, colunas }) {
  const r = [];
  for (let l = 0; l < linhas; l++) for (let c = 0; c < colunas; c++) r.push({ l, c, x: c / colunas, y: l / linhas, w: 1 / colunas, h: 1 / linhas });
  return r;
}

/**
 * Bordas de encaixe: cada lado é 0 (liso, borda externa), 1 (saliência) ou -1 (recorte).
 * Lados vizinhos são complementares; o desenho é sorteado a cada aplicação.
 */
export function bordas({ linhas, colunas }, aleatorio = Math.random) {
  const sorteia = () => (aleatorio() < 0.5 ? 1 : -1);
  const vert = Array.from({ length: linhas }, () => Array.from({ length: colunas - 1 }, sorteia));   // entre c e c+1
  const horiz = Array.from({ length: linhas - 1 }, () => Array.from({ length: colunas }, sorteia)); // entre l e l+1
  const out = [];
  for (let l = 0; l < linhas; l++) for (let c = 0; c < colunas; c++) out.push({
    topo: l === 0 ? 0 : -horiz[l - 1][c],
    direita: c === colunas - 1 ? 0 : vert[l][c],
    base: l === linhas - 1 ? 0 : horiz[l][c],
    esquerda: c === 0 ? 0 : -vert[l][c - 1]
  });
  return out;
}

/** Embaralha (Fisher–Yates) sem deixar a ordem correta, quando houver mais de uma peça. */
export function embaralharSemOrdemCerta(lista, aleatorio = Math.random) {
  if (lista.length < 2) return [...lista];
  for (let t = 0; t < 20; t++) {
    const c = [...lista];
    for (let i = c.length - 1; i > 0; i--) { const j = Math.floor(aleatorio() * (i + 1)); [c[i], c[j]] = [c[j], c[i]]; }
    if (c.some((x, i) => x !== lista[i])) return c;
  }
  return [...lista.slice(1), lista[0]];
}

/**
 * Distribui peças entre celulares. Mais peças que celulares: alguns recebem mais de uma.
 * Mais celulares que peças: os excedentes ficam sem peça (ajudam a ordenar).
 * @returns Map uid → [índices de peça]
 */
export function distribuirPecas(nPecas, uids, aleatorio = Math.random) {
  const pessoas = embaralharSemOrdemCerta(uids, aleatorio);
  const ordem = embaralharSemOrdemCerta(Array.from({ length: nPecas }, (_, i) => i), aleatorio);
  const mapa = new Map(uids.map(u => [u, []]));
  ordem.forEach((p, k) => mapa.get(pessoas[k % pessoas.length]).push(p));
  return mapa;
}

/** Quantas peças a etapa terá para um conjunto de celulares. */
export function quantidadePecas(config, nCelulares) {
  const base = config.modo === 'imagem' ? (config.corte?.n || 4) : unidadesDoTexto(config.texto).length;
  if (config.quantidade === 'celulares') return Math.max(2, config.modo === 'imagem' ? nCelulares : Math.min(nCelulares, base));
  return base;
}

/** Peças de texto finais (já agrupadas, se for "uma por celular"). */
export function pecasDeTexto(config, nCelulares) {
  const u = unidadesDoTexto(config.texto);
  return config.quantidade === 'celulares' ? dividirEmN(u, Math.max(2, nCelulares)) : u;
}

/** Aviso: peças iguais (a ordem entre elas fica ambígua). */
export function pecasRepetidas(unidades) {
  const vistos = new Set(), rep = new Set();
  for (const u of unidades) { const k = u.toLowerCase(); if (vistos.has(k)) rep.add(u); vistos.add(k); }
  return [...rep];
}
