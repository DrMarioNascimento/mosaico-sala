/* MOSAICO · Cadeado do grupo e Quiz entre grupos (lógica pura, roda no aparelho de quem conduz)

   Cadeado do grupo (escape room): cada aluno responde a(s) própria(s) pergunta(s) no celular.
     regra 'acertos'    → o grupo destrava quando X membros acertam.
     regra 'fragmentos' → cada acerto revela um pedaço (número, termo, palavra); com os pedaços
                          o grupo monta o código, e o líder digita para abrir.
   Quiz entre grupos: a cada pergunta o sistema sorteia o grupo da vez; só o líder dele vê a pergunta.

   O gabarito (docente.respostas) nunca sai deste aparelho: os celulares mandam a escolha,
   e quem conduz devolve só "certo/errado" (e o pedaço, quando a regra é de fragmentos). */

export const LETRAS = ['a', 'b', 'c', 'd', 'e'];

/** Embaralha (Fisher–Yates) sem alterar a lista original. */
export function embaralhar(lista, rng = Math.random) {
  const a = [...lista];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/** Normaliza o código digitado: ignora maiúsculas, espaços e vírgula/ponto decimal ("13,50" = "13.5"). */
export function normalizarCodigo(s) {
  const t = String(s ?? '').normalize('NFKC').toLowerCase().replace(/\s+/g, '');
  const n = t.replace(',', '.');
  if (/^[-+]?\d+(\.\d+)?$/.test(n)) return String(Number(n));
  return t.replace(/[.;:!?]+$/, '');
}
/** O código esperado pode ter alternativas separadas por ";" (ex.: "13,5; 13.5 ml"). */
export function codigoConfere(tentativa, esperado) {
  const t = normalizarCodigo(tentativa);
  return !!t && String(esperado ?? '').split(';').some(e => normalizarCodigo(e) === t);
}

/** Pedaços da regra 'fragmentos' (o professor escreve separados por | ou um por linha). */
export function fragmentosDoTexto(texto) {
  return String(texto || '').split(/\r?\n|\s*\|\s*/).map(s => s.trim()).filter(Boolean);
}

/**
 * Distribui as tarefas de cada grupo.
 * Tarefa = {perguntaId, fragmento: índice do pedaço | null}.
 * @param grupos [{id, uids}] só os grupos com gente
 * @returns {[grupoId]: {membros, tarefas[], deUid: {uid: [índices de tarefa]}}}
 */
export function prepararCadeado(config, grupos, rng = Math.random) {
  const pool = (config.perguntas || []).map(p => p.id), P = pool.length;
  const diferente = (config.distribuicao || 'diferente') === 'diferente';
  const fragmentos = config.regra === 'fragmentos' ? config.fragmentos || [] : [];
  const out = {};
  for (const g of grupos) {
    const membros = embaralhar(g.uids, rng), m = membros.length;
    if (!m || !P) continue;
    const desloc = Math.floor(rng() * P);
    const pergunta = i => pool[(desloc + (diferente ? i : 0)) % P];
    const deUid = {};
    let tarefas;
    if (fragmentos.length) {
      const n = fragmentos.length;
      tarefas = fragmentos.map((_, i) => ({ perguntaId: pergunta(i), fragmento: i }));
      membros.forEach((u, j) => {
        // mais gente que pedaços: pedaços repetidos (todos participam); menos gente: alguém leva dois
        deUid[u] = m >= n ? [j % n] : tarefas.map((_, i) => i).filter(i => i % m === j);
      });
    } else {
      tarefas = membros.map((_, j) => ({ perguntaId: pergunta(j), fragmento: null }));
      membros.forEach((u, j) => { deUid[u] = [j]; });
    }
    out[g.id] = { membros, tarefas, deUid };
  }
  return out;
}

/** Quantos acertos o grupo precisa (regra 'acertos'). 0 ou vazio = todos. */
export const necessarios = (config, nMembros) => Math.max(1, Math.min(nMembros, config.minAcertos > 0 ? config.minAcertos : nMembros));

/**
 * Estado do cadeado de cada grupo, recalculado do zero a partir dos envios (determinístico).
 * @param gabarito docente.respostas[etapaId] = {perguntas: {pid: {corretaId}}, codigo}
 * @param envios [{id, autor, grupoId, dados:{tarefa, alternativaId} | {codigo}, t (ms do servidor)}]
 */
export function estadoCadeado(config, gabarito, prep, envios) {
  const espera = Math.max(0, Number(config.espera ?? 30)) * 1000;
  const ordem = [...envios].sort((x, y) => (x.t - y.t) || String(x.id).localeCompare(String(y.id)));
  const grupos = {};
  for (const [g, p] of Object.entries(prep)) {
    const porUid = {};
    for (const u of p.membros) porUid[u] = (p.deUid[u] || []).map(i => ({ tarefa: i, perguntaId: p.tarefas[i].perguntaId, fragmento: p.tarefas[i].fragmento, estado: 'aberta', tentativas: 0, liberaEm: 0, certaEm: null }));
    grupos[g] = {
      porUid, membros: p.membros.length,
      necessarios: config.regra === 'fragmentos' ? null : necessarios(config, p.membros.length),
      totalFragmentos: config.regra === 'fragmentos' ? (config.fragmentos || []).length : 0,
      revelados: [], acertos: 0, destravado: false, destravadoEm: null,
      codigo: { tentativas: 0, liberaEm: 0 }
    };
  }
  const grupoDoUid = {};
  for (const [g, p] of Object.entries(prep)) for (const u of p.membros) grupoDoUid[u] = g;

  for (const e of ordem) {
    const d = e.dados || {};
    if (d.codigo !== undefined) {                       // tentativa de código (só regra fragmentos, pelo líder)
      const G = grupos[e.grupoId];
      if (!G || config.regra !== 'fragmentos' || G.destravado || e.t < G.codigo.liberaEm) continue;
      G.codigo.tentativas++;
      if (codigoConfere(d.codigo, gabarito?.codigo)) { G.destravado = true; G.destravadoEm = e.t; }
      else G.codigo.liberaEm = e.t + espera;
      continue;
    }
    const g = grupoDoUid[e.autor], G = grupos[g];
    if (!G) continue;
    const t = G.porUid[e.autor].find(x => x.tarefa === d.tarefa);
    if (!t || t.estado === 'certa' || e.t < t.liberaEm) continue;
    t.tentativas++;
    const certo = gabarito?.perguntas?.[t.perguntaId]?.corretaId;
    if (certo && d.alternativaId === certo) {
      t.estado = 'certa'; t.certaEm = e.t;
      if (t.fragmento !== null && !G.revelados.includes(t.fragmento)) G.revelados.push(t.fragmento);
    } else { t.estado = 'espera'; t.liberaEm = e.t + espera; }
    if (config.regra !== 'fragmentos') {
      G.acertos = Object.values(G.porUid).filter(l => l.some(x => x.estado === 'certa')).length;
      if (!G.destravado && G.acertos >= G.necessarios) { G.destravado = true; G.destravadoEm = e.t; }
    }
  }
  for (const G of Object.values(grupos)) {
    if (config.regra === 'fragmentos') G.acertos = G.revelados.length;
    G.revelados.sort((x, y) => x - y);
  }
  // ordem de abertura (para a competição entre grupos)
  Object.entries(grupos).filter(([, G]) => G.destravado).sort((x, y) => x[1].destravadoEm - y[1].destravadoEm)
    .forEach(([, G], i) => { G.posicao = i + 1; });
  return grupos;
}

/**
 * Quiz entre grupos: sorteia o próximo grupo sem repetir até todos terem jogado.
 * @param fila  grupos ainda não sorteados neste ciclo
 * @param disponiveis grupos com gente (ou cobertos)
 * @param excluir grupos que não podem receber agora (ex.: já tentaram esta pergunta)
 */
export function sortearGrupo(fila, disponiveis, excluir = [], rng = Math.random) {
  const ok = g => disponiveis.includes(g) && !excluir.includes(g);
  let f = (fila || []).filter(g => disponiveis.includes(g));
  let i = f.findIndex(ok);
  if (i < 0) {                                         // ciclo completo: nova rodada de sorteio
    const resto = embaralhar(disponiveis.filter(g => !f.includes(g)), rng);
    f = [...f, ...resto];
    i = f.findIndex(ok);
    if (i < 0) return { grupo: null, fila: f };
  }
  const grupo = f[i];
  return { grupo, fila: f.filter((_, k) => k !== i) };
}

/** Texto da alternativa correta de uma pergunta (para revelar). */
export function respostaCerta(pergunta, gabarito) {
  const r = gabarito?.perguntas?.[pergunta.id];
  return { texto: (pergunta.alternativas || []).find(a => a.id === r?.corretaId)?.texto || '', explicacao: r?.explicacao || '' };
}
