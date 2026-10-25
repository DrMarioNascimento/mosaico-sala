/* MOSAICO · Sequência (Genius) — lógica pura, testada
   A mecânica do Genius/Simon original (1978): o painel acende um botão; o aluno repete; a cada acerto o jogo
   repete toda a sequência e acrescenta mais um botão sorteado. Errou (ou demorou), acabou a partida.
   Aqui os botões são termos sorteados de um banco grande: cada partida usa um painel diferente.
   Cada celular joga sozinho (luz e som no próprio aparelho) e, ao fim de cada partida, manda só o resultado;
   quem conduz junta os recordes, o placar dos grupos e o ranking do telão. */

/** Tempos do Genius original: o tom encurta conforme a sequência cresce; 3 s para cada toque.
 *  'calma' é a versão para a sala que está começando (mais lenta e com mais tempo para tocar). */
export const VELOCIDADES = {
  classica: { nome: 'Clássica (tempos do Genius original)', tons: [[5, 420], [13, 320], [Infinity, 220]], pausa: 50, limite: 3000 },
  calma: { nome: 'Calma (mais lenta, 6 s para cada toque)', tons: [[5, 650], [13, 520], [Infinity, 420]], pausa: 160, limite: 6000 }
};
export const MAX_PASSOS = 99;

/** Duração do tom (ms) do n-ésimo passo (1, 2, …) de uma sequência com `tamanho` passos. */
export function duracaoTom(tamanho, velocidade = 'classica') {
  const v = VELOCIDADES[velocidade] || VELOCIDADES.classica;
  return v.tons.find(([ate]) => tamanho <= ate)[1];
}

/** Frequências (Hz) dos botões. 4 botões: as notas do Genius original (sol#3, si3, ré#4, sol#4 — um acorde
 *  que soa bem em qualquer ordem). 6 botões: escala pentatônica de dó (também sem notas que brigam). */
export function frequencias(n) {
  if (n <= 4) return [415.3, 310.0, 252.0, 209.0].slice(0, n);
  return [261.63, 293.66, 329.63, 392.0, 440.0, 523.25].slice(0, n);
}
export const TOM_ERRO = 42;   // o "zumbido" grave do Genius quando se erra

/** Lê um banco colado: um termo por linha, com definição opcional depois de "|" (ou tabulação). */
export function lerTermos(texto, existentes = []) {
  const usados = new Set(existentes.map(t => normalizar(t.termo)));
  const ids = new Set(existentes.map(t => t.id));
  const out = [];
  let k = 1;
  for (const linha of String(texto || '').split(/\r?\n/)) {
    const [termo, ...resto] = linha.split(/\s*[|\t]\s*/);
    const t = String(termo || '').trim().replace(/^[-•*]\s*/, '').slice(0, 40);
    if (!t || usados.has(normalizar(t))) continue;
    while (ids.has('t' + k)) k++;
    ids.add('t' + k); usados.add(normalizar(t));
    out.push({ id: 't' + k, termo: t, definicao: resto.join(' ').trim().slice(0, 200) });
  }
  return out;
}
export const normalizar = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();

/** Sorteia n termos diferentes do banco (Fisher–Yates parcial). */
export function sortearPainel(termos, n, rng = Math.random) {
  const l = [...termos];
  for (let i = 0; i < Math.min(n, l.length); i++) { const j = i + Math.floor(rng() * (l.length - i)); [l[i], l[j]] = [l[j], l[i]]; }
  return l.slice(0, n);
}

/** Próximo botão da sequência (como no original: qualquer um, inclusive repetido). */
export const proximoBotao = (n, rng = Math.random) => Math.floor(rng() * n);

/**
 * Confere um toque. seq: índices dos botões; feitos: quantos toques certos já houve nesta rodada.
 * @returns 'certo' | 'rodada' (completou a sequência inteira) | 'erro'
 */
export function conferirToque(seq, feitos, botao) {
  if (seq[feitos] !== botao) return 'erro';
  return feitos + 1 === seq.length ? 'rodada' : 'certo';
}

/**
 * Junta os resultados. Envios: etapa__uid__sN {partida, pontos, termos: [ids], erro: {esperado, tocado}}
 * pontos = rodadas completas (o "placar" do Genius). Cada aluno pode jogar várias partidas; vale o recorde.
 * config.partidas: máximo de partidas por aluno (0 = sem limite). config.placar: 'soma' | 'media' dos recordes do grupo.
 * @param jogadores [{id, grupo}]
 */
export function estadoSequencia(config, jogadores, envios) {
  const lim = Number(config.partidas) || 0;
  const J = {}, grupoDe = {};
  for (const { id, grupo } of jogadores) { grupoDe[id] = grupo; J[id] = { grupo, partidas: 0, recorde: 0, ultima: null, historico: [] }; }
  const ord = [...envios].sort((x, y) => (x.t - y.t) || String(x.id).localeCompare(String(y.id)));
  const derrubou = {};
  for (const e of ord) {
    const partes = String(e.id).split('__'); if (partes.length !== 3 || !/^s\d+$/.test(partes[2])) continue;
    const quem = partes[1], S = J[quem]; if (!S) continue;
    if (lim && S.partidas >= lim) continue;
    const p = Number(e.dados?.pontos);
    if (!Number.isInteger(p) || p < 0 || p > MAX_PASSOS) continue;
    S.partidas++;
    S.ultima = { pontos: p, t: e.t };
    S.historico.push(p);
    if (p > S.recorde) { S.recorde = p; S.recordeEm = e.t; }
    const esp = e.dados?.erro?.esperado;
    if (esp) derrubou[esp] = (derrubou[esp] || 0) + 1;
  }
  const grupos = {};
  for (const [id, S] of Object.entries(J)) {
    const G = grupos[S.grupo] ||= { soma: 0, jogadores: 0, jogaram: 0, total: 0, melhor: 0 };
    G.jogadores++; G.soma += S.recorde; if (S.partidas) G.jogaram++; G.melhor = Math.max(G.melhor, S.recorde);
  }
  for (const G of Object.values(grupos)) G.total = config.placar === 'media' ? (G.jogaram ? Math.round(10 * G.soma / G.jogaram) / 10 : 0) : G.soma;
  // ranking: recorde maior primeiro; empate → quem chegou antes
  const ranking = Object.entries(J).filter(([, S]) => S.partidas).sort((x, y) => (y[1].recorde - x[1].recorde) || ((x[1].recordeEm ?? 0) - (y[1].recordeEm ?? 0))).map(([id, S], k) => ({ id, grupo: S.grupo, recorde: S.recorde, partidas: S.partidas, posicao: k + 1 }));
  for (const r of ranking) J[r.id].posicao = r.posicao;
  const podeJogar = id => !!J[id] && (!lim || J[id].partidas < lim);
  return { jogadores: J, grupos, ranking, derrubou, podeJogar, partidas: Object.values(J).reduce((s, S) => s + S.partidas, 0) };
}

/** Os termos que mais derrubaram a turma (o termo que era o certo quando alguém errou). */
export function termosQueDerrubaram(estado, termos, n = 3) {
  const porId = Object.fromEntries(termos.map(t => [t.id, t]));
  return Object.entries(estado.derrubou).filter(([id]) => porId[id]).sort((x, y) => y[1] - x[1]).slice(0, n).map(([id, v]) => ({ termo: porId[id].termo, definicao: porId[id].definicao || '', vezes: v }));
}
