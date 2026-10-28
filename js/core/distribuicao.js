/* Mosaico Sala · Distribuição dos participantes entre grupos planejados
   Especificação v2, seção 9 e ADR-001.

   Regras:
   - A quantidade e a identidade dos grupos vêm do plano; a presença nunca
     cria, remove nem funde grupos.
   - base = floor(N / G); os N mod G excedentes vão para os primeiros grupos
     na ORDEM DE ALOCAÇÃO (campo ordemAlocacao), não na ordem visual.
   - O sorteio escolhe pessoas para as vagas; não muda IDs nem conteúdo.
   - Módulo puro: sem DOM, sem Firebase. Testado em tests/distribuicao.test.mjs. */

/** Grupos na ordem de alocação; empate desfeito pelo id (determinístico). */
export function ordenarParaAlocacao(grupos) {
  return [...grupos].sort((a, b) =>
    (a.ordemAlocacao ?? 0) - (b.ordemAlocacao ?? 0) || String(a.id).localeCompare(String(b.id)));
}

/** Tamanho de cada grupo para N presentes. Devolve [{grupoId, vagas}] na ordem de alocação. */
export function calcularVagas(grupos, n) {
  if (!Array.isArray(grupos) || grupos.length < 1) throw new Error('É preciso ao menos um grupo planejado.');
  if (!Number.isInteger(n) || n < 0) throw new Error('Número de participantes inválido.');
  const g = grupos.length, base = Math.floor(n / g), extra = n % g;
  return ordenarParaAlocacao(grupos).map((grupo, i) => ({ grupoId: grupo.id, vagas: base + (i < extra ? 1 : 0) }));
}

/** Embaralhamento de Fisher–Yates com gerador injetável (testes usam semente). */
export function embaralhar(lista, aleatorio = Math.random) {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(aleatorio() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

/** Gerador determinístico (mulberry32) para sorteios reproduzíveis. */
export function geradorComSemente(semente) {
  let a = semente >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Distribuição inicial equilibrada.
 * @param grupos planejados [{id, ordemAlocacao}]
 * @param participantes ids internos (nunca nomes)
 * @returns {composicao: {grupoId: [participanteId]}, vagas, gruposVazios}
 */
export function distribuir(grupos, participantes, aleatorio = Math.random) {
  const unicos = [...new Set(participantes)];
  if (unicos.length !== participantes.length) throw new Error('Participante duplicado na lista da sessão.');
  const vagas = calcularVagas(grupos, unicos.length);
  const sorteados = embaralhar(unicos, aleatorio);
  const composicao = {};
  let k = 0;
  for (const { grupoId, vagas: v } of vagas) {
    composicao[grupoId] = sorteados.slice(k, k + v);
    k += v;
  }
  return { composicao, vagas, gruposVazios: vagas.filter(v => v.vagas === 0).map(v => v.grupoId) };
}

/** Entrada tardia autorizada: grupo com menor ocupação, desempate pela ordem de alocação. */
export function grupoParaEntradaTardia(grupos, composicao) {
  const ordem = ordenarParaAlocacao(grupos);
  let escolhido = ordem[0].id, menor = Infinity;
  for (const g of ordem) {
    const ocupacao = (composicao[g.id] || []).length;
    if (ocupacao < menor) { menor = ocupacao; escolhido = g.id; }
  }
  return escolhido;
}

/** Diagnóstico da composição atual (após ajustes manuais ou saídas). Não corrige nada. */
export function diagnosticarComposicao(grupos, composicao) {
  const tamanhos = grupos.map(g => (composicao[g.id] || []).length);
  const todos = grupos.flatMap(g => composicao[g.id] || []);
  const duplicados = todos.filter((p, i) => todos.indexOf(p) !== i);
  const desconhecidos = Object.keys(composicao).filter(id => !grupos.some(g => g.id === id));
  const max = Math.max(...tamanhos), min = Math.min(...tamanhos);
  return {
    total: todos.length,
    diferenca: max - min,
    equilibrada: max - min <= 1,
    duplicados: [...new Set(duplicados)],
    gruposDesconhecidos: desconhecidos,
    gruposVazios: grupos.filter(g => !(composicao[g.id] || []).length).map(g => g.id)
  };
}

/** Move uma pessoa (ajuste manual). Devolve nova composição; não altera a original. */
export function moverParticipante(composicao, participanteId, destinoId) {
  const nova = {};
  for (const [g, membros] of Object.entries(composicao)) nova[g] = membros.filter(p => p !== participanteId);
  if (!nova[destinoId]) throw new Error('Grupo de destino inexistente no plano.');
  nova[destinoId].push(participanteId);
  return nova;
}
