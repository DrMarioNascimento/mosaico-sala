/* Mosaico Sala · Quiz que faz pensar (lógica pura, testada)
     equipe       → em equipe (TBL): cada aluno responde sozinho; depois o grupo debate e manda a resposta do grupo
     ramificado   → tomada de decisão: cada escolha do grupo leva a um cenário diferente, até um final
     metacognicao → resposta + o quanto tem certeza (usa o motor da corrida, com confiança)
   Quem conduz abre as fases da equipe (pergunta → grupo → revelar); o gabarito fica só com ele. */

/**
 * Equipe (TBL). Fases controladas por quem conduz: fases[q] = {i: t de abertura individual, g: t do grupo, r: t da revelação}.
 * Envios: individual etapa__uid__tN {q, alternativaId} · voto no grupo etapa__uid__vN {q, alternativaId} ·
 *         resposta do grupo (líder) etapa__grupo__gN {q, alternativaId}
 * consenso: 'lider' (o líder manda) | 'todos' (vale quando todos do grupo votam igual)
 */
export function estadoEquipe(config, gabarito, grupos, fases, envios, folga = 0) {
  const ord = [...envios].sort((x, y) => (x.t - y.t) || String(x.id).localeCompare(String(y.id)));
  const ps = config.perguntas || [];
  const certa = q => gabarito?.perguntas?.[ps[q]?.id]?.corretaId;
  const dentro = (f, t, de, ate) => f && f[de] !== undefined && t >= f[de] - folga && (f[ate] === undefined || t < f[ate] + folga);   // folga: relógio do servidor × deste aparelho
  const grupoDe = {};
  for (const [g, ms] of Object.entries(grupos)) for (const u of ms) grupoDe[u] = g;
  const P = {};
  ps.forEach((_, q) => { P[q] = { individuais: {}, votos: {}, grupo: {} }; });
  for (const e of ord) {
    const d = e.dados || {}, q = Number(d.q), f = fases?.[q], X = P[q];
    if (!X || !d.alternativaId) continue;
    const tipo = String(e.id).match(/__([a-z])\d+$/)?.[1], quem = String(e.id).split('__')[1];
    if (tipo === 't' && dentro(f, e.t, 'i', 'g') && grupoDe[quem] && !X.individuais[quem]) X.individuais[quem] = d.alternativaId;
    if (tipo === 'v' && dentro(f, e.t, 'g', 'r') && grupoDe[quem]) X.votos[quem] = d.alternativaId;
    if (tipo === 'g' && config.consenso !== 'todos' && dentro(f, e.t, 'g', 'r') && grupos[quem] && !X.grupo[quem]) X.grupo[quem] = { alternativaId: d.alternativaId, t: e.t };
  }
  if (config.consenso === 'todos') for (const X of Object.values(P)) for (const [g, ms] of Object.entries(grupos)) {
    const vs = ms.map(u => X.votos[u]);
    if (ms.length && vs.every(v => v && v === vs[0])) X.grupo[g] = { alternativaId: vs[0], consenso: true };
  }
  const placar = Object.fromEntries(Object.keys(grupos).map(g => [g, { individual: 0, grupo: 0, pontos: 0 }]));
  ps.forEach((_, q) => {
    if (fases?.[q]?.r === undefined) return;                            // só conta depois de revelada
    const X = P[q], c = certa(q);
    for (const [u, a] of Object.entries(X.individuais)) if (a === c && placar[grupoDe[u]]) { placar[grupoDe[u]].individual++; placar[grupoDe[u]].pontos += 100; }
    for (const [g, r] of Object.entries(X.grupo)) if (r.alternativaId === c && placar[g]) { placar[g].grupo++; placar[g].pontos += 200; }
  });
  return { perguntas: P, placar };
}

/** Distribuição das respostas individuais de um grupo numa pergunta: {alternativaId: n}. */
export function distribuicaoIndividual(estado, q, membros) {
  const out = {};
  for (const u of membros) { const a = estado.perguntas[q]?.individuais[u]; if (a) out[a] = (out[a] || 0) + 1; }
  return out;
}

/**
 * Tomada de decisão com ramos. config.cenarios: [{id, texto, final, desfecho, opcoes: [{id, texto, destino, feedback}]}]; começa no primeiro.
 * Envios do líder: etapa__grupo__dN {cenario, opcao}
 * @returns {grupo: {atual, caminho: [{cenario, opcao, feedback}], final, desfecho, concluidoEm}}
 */
export function estadoRamificado(config, grupos, envios) {
  const ord = [...envios].sort((x, y) => (x.t - y.t) || String(x.id).localeCompare(String(y.id)));
  const cs = config.cenarios || [], porId = Object.fromEntries(cs.map(c => [c.id, c]));
  const E = {};
  for (const g of grupos) E[g] = { atual: cs[0]?.id ?? null, caminho: [], final: false, desfecho: null, concluidoEm: null };
  for (const e of ord) {
    const S = E[e.grupoId], d = e.dados || {};
    if (!S || S.final || d.cenario !== S.atual) continue;
    const c = porId[S.atual], op = c?.opcoes?.find(o => o.id === d.opcao);
    if (!op || !porId[op.destino]) continue;
    S.caminho.push({ cenario: c.id, opcao: op.id, feedback: op.feedback || '' });
    S.atual = op.destino;
    if (porId[op.destino].final) { S.final = true; S.desfecho = porId[op.destino].desfecho || 'neutro'; S.concluidoEm = e.t; }
    if (S.caminho.length > 60) { S.final = true; S.desfecho = S.desfecho || 'neutro'; }   // proteção contra ciclos
  }
  return E;
}

/** Problemas da árvore: opção sem destino, cenário inalcançável, nenhum final, ciclo sem saída. */
export function problemasRamos(cenarios) {
  const cs = cenarios || [], ids = new Set(cs.map(c => c.id)), out = [];
  if (cs.length < 2) return ['Crie o cenário inicial e pelo menos um final.'];
  if (!cs.some(c => c.final)) out.push('Nenhum cenário é um final.');
  if (cs[0]?.final) out.push('O primeiro cenário (início) não pode ser um final.');
  cs.forEach((c, i) => {
    if (!c.final && (c.opcoes || []).length < 2) out.push(`O cenário ${i + 1} precisa de pelo menos 2 opções.`);
    (c.opcoes || []).forEach((o, k) => { if (!ids.has(o.destino)) out.push(`Cenário ${i + 1}, opção ${k + 1}: escolha para onde ela leva.`); if (!String(o.texto || '').trim()) out.push(`Cenário ${i + 1}, opção ${k + 1}: sem texto.`); });
    if (!String(c.texto || '').trim()) out.push(`Cenário ${i + 1} sem texto.`);
  });
  const vistos = new Set(), pilha = cs[0] ? [cs[0].id] : [];
  while (pilha.length) { const id = pilha.pop(); if (vistos.has(id)) continue; vistos.add(id); for (const o of cs.find(c => c.id === id)?.opcoes || []) if (ids.has(o.destino)) pilha.push(o.destino); }
  cs.forEach((c, i) => { if (!vistos.has(c.id)) out.push(`O cenário ${i + 1} nunca é alcançado a partir do início.`); });
  // algum final alcançável a partir de cada cenário alcançável
  const chegaFinal = id => { const v = new Set(), p = [id]; while (p.length) { const x = p.pop(); if (v.has(x)) continue; v.add(x); const c = cs.find(y => y.id === x); if (c?.final) return true; for (const o of c?.opcoes || []) p.push(o.destino); } return false; };
  cs.forEach((c, i) => { if (vistos.has(c.id) && !c.final && !chegaFinal(c.id)) out.push(`A partir do cenário ${i + 1} não há como chegar a um final.`); });
  return out;
}
