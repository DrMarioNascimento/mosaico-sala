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

// ---------------------------------------------------------------- Semelhança entre etapas próximas
/* Duas atividades muito parecidas, uma logo depois da outra, cansam a turma (repetição e amotivação) e
   rebaixam a nota de ritmo e de motivação das escalas de avaliação. A regra compara cada etapa com a
   seguinte (distância 1) e com a que vem duas posições depois (distância 2) e soma, de 0 a 1:
     · mesmo formato e mesma variação (ex.: Cartões · ordenar e Cartões · ordenar) ... 0,5
       ou mesmo formato com variação diferente (ex.: ordenar × classificar) ........ 0,35
       ou mesma família de mecânica (ver FAMILIAS) ................................. 0,3
     · mesma organização (grupos / individual) ............. 0,1
     · mesmo tipo de competição ............................ 0,1
     · conteúdo parecido (palavras em comum, Jaccard) ...... até 0,3 (cheio a partir de 50% de palavras em comum)
   Alerta quando a soma chega a LIMIAR_SEMELHANCA[1] (0,7) em etapas vizinhas, ou a LIMIAR_SEMELHANCA[2] (0,85)
   com uma etapa entre elas. Etapas ligadas por conexão (ex.: investigação → comparação de hipóteses) foram
   feitas para vir juntas e nunca geram alerta. É só aviso: nunca bloqueia nem troca sozinho. */
export const FAMILIAS = {
  investigar: ['investigacao_fragmentos', 'comparar_hipoteses', 'analise_imagem'],
  responder: ['quiz_grupos', 'questao_individual', 'quiz_pensar', 'corrida'],
  organizar: ['cartoes_arrastar', 'pares', 'montagem_pecas', 'cruzadas'],
  memoria: ['sequencia'],
  desafio: ['cadeado_grupo'],
  autoconhecimento: ['escala_padronizada', 'jogo_economico']
};
export const LIMIAR_SEMELHANCA = { 1: 0.7, 2: 0.85 };
const variacao = e => { const c = e.config || {}; return c.formato || c.modo || c.tarefa || c.jogo || ''; };
const familiaDe = typeId => Object.keys(FAMILIAS).find(f => FAMILIAS[f].includes(typeId)) || typeId;
const NOMES_FAMILIA = { investigar: 'investigação', responder: 'perguntas e respostas', organizar: 'organizar e montar', memoria: 'memória', desafio: 'desafio de código', autoconhecimento: 'autoconhecimento e decisão' };
const VAZIAS = new Set('para como mais entre sobre cada essa esse esta este isso isto pelo pela pelos pelas qual quais quando onde porque porquê depois antes ainda sempre nunca muito pouco todos todas outro outra outros outras grupo grupos etapa etapas resposta respostas voces vocês aluno alunos turma texto peca pecas peça peças certo certa correta correto escolha escolham leiam marque responda sozinho tambem também mesmo mesma seus suas nosso nossa'.split(' ').map(w => w.normalize('NFD').replace(/[̀-ͯ]/g, '')));
function textoDaEtapa(a, e) {
  const partes = [e.titulo, e.instrucao];
  const varrer = v => { if (typeof v === 'string') partes.push(v); else if (Array.isArray(v)) v.forEach(varrer); else if (v && typeof v === 'object') Object.values(v).forEach(varrer); };
  varrer(e.config);
  for (const p of a.pecas || []) if (p.etapaId === e.id) partes.push(p.conteudo);
  return partes.filter(Boolean).join(' ');
}
function palavras(t) {
  return new Set(String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length >= 4 && !VAZIAS.has(w)));
}
function jaccard(x, y) {
  if (!x.size || !y.size) return 0;
  let comum = 0; for (const w of x) if (y.has(w)) comum++;
  return comum / (x.size + y.size - comum);
}
const ligadas = (a, x, y) => (a.conexoes || []).some(c => (c.de?.etapaId === x.id && c.para?.etapaId === y.id) || (c.de?.etapaId === y.id && c.para?.etapaId === x.id));

/** Semelhança entre duas etapas (0 a 1) e os motivos, em linguagem do professor. */
export function semelhancaEtapas(a, x, y) {
  const motivos = []; let nota = 0;
  if (x.typeId === y.typeId && variacao(x) === variacao(y)) { nota += 0.5; motivos.push('mesmo formato'); }
  else if (x.typeId === y.typeId) { nota += 0.35; motivos.push('mesmo formato, em variações diferentes'); }
  else if (familiaDe(x.typeId) === familiaDe(y.typeId)) { nota += 0.3; motivos.push('mesma mecânica (' + (NOMES_FAMILIA[familiaDe(x.typeId)] || familiaDe(x.typeId)) + ')'); }
  const ox = x.participacao?.organizacao, oy = y.participacao?.organizacao;
  if (ox && ox === oy) { nota += 0.1; motivos.push(ox === 'individual' ? 'as duas individuais' : 'as duas em grupo'); }
  const cx = x.participacao?.competicao, cy = y.participacao?.competicao;
  if (cx && cx === cy) nota += 0.1;
  const j = jaccard(palavras(textoDaEtapa(a, x)), palavras(textoDaEtapa(a, y)));
  if (j > 0) { nota += 0.3 * Math.min(1, j / 0.5); if (j >= 0.25) motivos.push('conteúdo parecido'); }
  return { nota: Math.round(nota * 100) / 100, motivos, conteudo: Math.round(j * 100) / 100 };
}

/** Pares de etapas próximas e muito parecidas, cada um com uma troca de ordem sugerida (ou null). */
export function alertasSemelhanca(a) {
  const seq = ordenadas(a);
  const pares = seq => {
    const out = [];
    for (let i = 0; i < seq.length; i++) for (const d of [1, 2]) {
      const j = i + d; if (j >= seq.length) continue;
      const [x, y] = [seq[i], seq[j]];
      if (ligadas(a, x, y)) continue;
      const s = semelhancaEtapas(a, x, y);
      if (s.nota >= LIMIAR_SEMELHANCA[d]) out.push({ i, j, d, x, y, s });
    }
    // um par a dois passos que já tem os vizinhos alertados não precisa de aviso próprio
    return out.filter(p => p.d === 1 || !out.some(q => q.d === 1 && q.i >= p.i && q.j <= p.j));
  };
  const atuais = pares(seq);
  // ordem possível: quem recebe de uma conexão continua depois de quem envia
  const ordemValida = s => (a.conexoes || []).every(c => { const de = s.findIndex(e => e.id === c.de?.etapaId), para = s.findIndex(e => e.id === c.para?.etapaId); return de < 0 || para < 0 || de < para; });
  const chave = p => p.x.id + '|' + p.y.id;
  return atuais.map(p => {
    let troca = null, melhor = Infinity;
    for (let k = 0; k < seq.length; k++) {
      if (k === p.i || k === p.j) continue;
      const s = [...seq]; [s[p.j], s[k]] = [s[k], s[p.j]];
      if (!ordemValida(s)) continue;
      const depois = pares(s);
      if (depois.some(q => q.x.id === p.x.id && q.y.id === p.y.id || q.x.id === p.y.id && q.y.id === p.x.id)) continue;
      const antes = new Set(atuais.map(chave));
      if (depois.some(q => !antes.has(chave(q)))) continue;   // a troca não pode criar outro par parecido
      const dist = Math.abs(k - p.j);
      if (dist < melhor) { melhor = dist; troca = { etapa: p.y.id, com: seq[k].id }; }
    }
    const nx = `“${p.x.titulo}”`, ny = `“${p.y.titulo}”`;
    const onde = p.d === 1 ? 'vêm uma logo depois da outra' : 'estão muito próximas (só uma etapa entre elas)';
    const outra = troca && seq.find(e => e.id === troca.com);
    return {
      id: `semelhanca:${chave(p)}`, prioridade: 1, etapas: [p.x.id, p.y.id], distancia: p.d, nota: p.s.nota, motivos: p.s.motivos, troca,
      posicao: { etapa: p.y.id },
      mensagem: `${nx} e ${ny} são muito parecidas (${p.s.motivos.join(', ') || 'mecânica semelhante'}) e ${onde}. ` +
        (outra ? `Trocar ${ny} de lugar com “${outra.titulo}” afasta as duas e varia o ritmo da aula.` : 'Uma etapa de outro formato entre elas ajudaria a variar o ritmo da aula.')
    };
  });
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
        id: `repeticao:${x.id}:${z.id}`, prioridade: 2, etapas: [x.id, y.id, z.id], posicao: { depoisDe: y.id },
        mensagem: `Há três etapas seguidas de ${tipo} (${nome(x)}, ${nome(y)}, ${nome(z)}). Uma etapa de outro formato entre ${nome(y)} e ${nome(z)} poderia variar o ritmo.`
      });
      i += 2;
    }
  }

  // 1b. Etapas muito parecidas uma perto da outra (não repete o que a regra das três seguidas já disse)
  const cobertas = new Set(s.flatMap(x => x.etapas || []));
  for (const al of alertasSemelhanca(a)) if (!(cobertas.has(al.etapas[0]) && cobertas.has(al.etapas[1]))) s.push(al);

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

const NOMES_ELEMENTOS = { fracionamento: 'informação dividida entre os grupos', interdependencia: 'grupos que dependem do resultado uns dos outros', cooperacao: 'cooperação', superacao: 'superação', meta: 'meta da turma' };
/** Aviso único e discreto quando faltam elementos (7.4). Não invalida a atividade. */
export function avisoGramatica(a) {
  const el = elementosDaGramatica(a);
  const faltam = Object.entries(el).filter(([, v]) => !v).map(([k]) => k);
  return faltam.length ? { faltam, mensagem: `Esta atividade não usa: ${faltam.map(k => NOMES_ELEMENTOS[k] || k).join(', ')}. Ela continua válida para aplicação.` } : null;
}
