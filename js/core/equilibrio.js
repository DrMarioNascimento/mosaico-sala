/* MOSAICO · Gramática MOSAICO e sugestões de equilíbrio
   Especificação v2, seções 7.1 a 7.4.

   Descreve a composição e propõe; nunca bloqueia e nunca aplica sozinho.
   Cada sugestão traz: id estável (para poder ser dispensada), posição,
   motivo e proposta. No máximo `limite` sugestões, por prioridade. */

import { obterTipo } from './tipos.js';

const ordenadas = a => [...a.etapas].sort((x, y) => x.ordem - y.ordem);

/** Elementos da gramática presentes na atividade (7.2). */
export function elementosDaGramatica(a) {
  const etapas = a.etapas;
  const pecasPorEtapa = new Map();
  for (const p of a.pecas) {
    if (!pecasPorEtapa.has(p.etapaId)) pecasPorEtapa.set(p.etapaId, new Set());
    p.destinatarios.forEach(g => pecasPorEtapa.get(p.etapaId).add(g));
  }
  const fracionamento = [...pecasPorEtapa.entries()].some(([etapaId]) => {
    const conj = a.pecas.filter(p => p.etapaId === etapaId);
    return conj.some(p => p.destinatarios.length < a.grupos.length) && pecasPorEtapa.get(etapaId).size > 1;
  });
  const interdependencia = a.conexoes.some(c => c.de?.portId === 'hipotese_grupo');
  const montagem = etapas.some(e => e.typeId === 'montagem_pecas');
  const cadeado = etapas.some(e => e.typeId === 'cadeado_grupo');
  // cadeado: perguntas diferentes por aluno ou pedaços do código = informação fracionada dentro do grupo
  const cadeadoFracionado = etapas.some(e => e.typeId === 'cadeado_grupo' && (e.config?.regra === 'fragmentos' || (e.config?.distribuicao || 'diferente') === 'diferente'));
  const cartoes = etapas.some(e => e.typeId === 'cartoes_arrastar');
  const cartoesFracionados = etapas.some(e => e.typeId === 'cartoes_arrastar' && e.config?.distribuicao === 'fracionado');
  const cooperacao = interdependencia || montagem || cadeado || cartoes || etapas.some(e => e.typeId === 'comparar_hipoteses');
  const superacao = (a.meta && a.meta.ativa !== false) || etapas.some(e => e.typeId === 'quiz_grupos' || (e.participacao?.competicao && e.participacao.competicao !== 'desligada'));
  const meta = !!(a.meta && a.meta.ativa !== false);
  return { fracionamento: fracionamento || montagem || cadeadoFracionado || cartoesFracionados, interdependencia, cooperacao, superacao, meta };
}

/**
 * Sugestões de equilíbrio.
 * @param dispensadas Set de ids de sugestão já dispensados nesta versão.
 */
export function sugerirEquilibrio(a, { dispensadas = new Set(), limite = 3 } = {}) {
  const s = [];
  const seq = ordenadas(a);
  const nome = e => `“${e.titulo}”`;

  // 1. Repetição do mesmo tipo em sequência (3 ou mais)
  for (let i = 0; i + 2 < seq.length; i++) {
    const [x, y, z] = [seq[i], seq[i + 1], seq[i + 2]];
    if (x.typeId === y.typeId && y.typeId === z.typeId) {
      const tipo = obterTipo(x.typeId, x.typeVersion)?.nome || x.typeId;
      s.push({
        id: `repeticao:${x.id}:${z.id}`, prioridade: 2, posicao: { depoisDe: y.id },
        mensagem: `Há três etapas seguidas de ${tipo} (${nome(x)}, ${nome(y)}, ${nome(z)}). Uma etapa de outro formato entre ${nome(y)} e ${nome(z)} poderia variar o ritmo.`
      });
      i += 2;
    }
  }

  // 2. Elementos ausentes na atividade inteira
  const el = elementosDaGramatica(a);
  if (!el.interdependencia && a.grupos.length > 1)
    s.push({ id: 'ausente:interdependencia', prioridade: 1, posicao: null,
      mensagem: 'Nenhuma etapa depende de resultados de outro grupo. Fracionar as evidências e conectar a investigação a uma comparação entre grupos criaria troca entre eles.' });
  if (!el.meta)
    s.push({ id: 'ausente:meta', prioridade: 1, posicao: null,
      mensagem: 'A atividade não tem meta definida. Sugestão: meta coletiva de 50% de acertos na etapa final.' });

  // 3. Longas sequências só individuais (4+) ou só competitivas entre grupos (toda a atividade)
  let corrida = 0;
  for (let i = 0; i < seq.length; i++) {
    corrida = seq[i].participacao?.organizacao === 'individual' ? corrida + 1 : 0;
    if (corrida === 4) s.push({ id: `individuais:${seq[i - 3].id}`, prioridade: 2, posicao: { etapa: seq[i - 1].id },
      mensagem: `As etapas de ${nome(seq[i - 3])} a ${nome(seq[i])} são todas individuais. Uma investigação em grupo no meio poderia aumentar a interação.` });
  }
  if (seq.length >= 2 && seq.every(e => e.participacao?.competicao === 'entre_grupos'))
    s.push({ id: 'competicao:total', prioridade: 2, posicao: { etapa: seq[seq.length - 1].id },
      mensagem: 'Todas as etapas têm competição entre grupos. Uma meta coletiva da turma na etapa final poderia equilibrar.' });

  // 4. Concentração de carga de leitura
  const total = a.pecas.reduce((t, p) => t + (p.conteudo?.length || 0), 0);
  if (total > 0 && seq.length >= 3) {
    const carga = seq.map(e => ({ e, c: a.pecas.filter(p => p.etapaId === e.id).reduce((t, p) => t + p.conteudo.length, 0) }));
    const maior = carga.reduce((m, x) => x.c > m.c ? x : m);
    if (maior.c / total >= 0.8 && carga.filter(x => x.c > 0).length > 1)
      s.push({ id: `carga:${maior.e.id}`, prioridade: 3, posicao: { etapa: maior.e.id },
        mensagem: `${nome(maior.e)} concentra ${Math.round(100 * maior.c / total)}% da leitura. Redistribuir parte das peças pode equilibrar o tempo.` });
  }

  // 5. Leitura desigual entre grupos na mesma etapa (diferença > 2×)
  for (const e of seq) {
    if (e.participacao?.organizacao !== 'grupos') continue;
    const porGrupo = a.grupos.map(g => ({ g, c: a.pecas.filter(p => p.etapaId === e.id && p.destinatarios.includes(g.id)).reduce((t, p) => t + p.conteudo.length, 0) }));
    const comCarga = porGrupo.filter(x => x.c > 0);
    if (comCarga.length < 2) continue;
    const max = comCarga.reduce((m, x) => x.c > m.c ? x : m), min = comCarga.reduce((m, x) => x.c < m.c ? x : m);
    if (max.c > 2 * min.c)
      s.push({ id: `desigual:${e.id}`, prioridade: 3, posicao: { etapa: e.id },
        mensagem: `Em ${nome(e)}, o grupo “${max.g.nome}” lê mais que o dobro do grupo “${min.g.nome}”. Vale conferir se a carga está equivalente.` });
  }

  return s.filter(x => !dispensadas.has(x.id)).sort((x, y) => x.prioridade - y.prioridade).slice(0, limite);
}

/** Aviso único e discreto quando faltam elementos (7.4). Não invalida a atividade. */
export function avisoGramatica(a) {
  const el = elementosDaGramatica(a);
  const faltam = Object.entries(el).filter(([, v]) => !v).map(([k]) => k);
  return faltam.length ? { faltam, mensagem: `Esta atividade não usa: ${faltam.join(', ')}. Ela continua válida para aplicação.` } : null;
}
