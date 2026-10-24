/* MOSAICO · Motor da sessão (lógica pura, roda no aparelho de quem conduz)
   Especificação v2, seções 9.5, 11, 12.4, 12.6 e ADR-001.

   O "cérebro" da sala fica no celular de quem conduz: só ele conhece o
   material docente. Para cada grupo/participante, publica apenas a
   projeção autorizada da etapa atual. Este módulo não fala com o Firebase. */

import { obterTipo } from './tipos.js';

export const etapasOrdenadas = a => [...a.etapas].sort((x, y) => x.ordem - y.ordem);

/** Remove tudo que é docente. Usado antes de qualquer publicação. */
export function versaoPublica(a) {
  const { docente, pendencias, ...resto } = a;
  return JSON.parse(JSON.stringify(resto));
}

/** Grupos planejados que produzem a coleção esperada por uma entrada (TYP-04). */
export function origensEsperadas(a, etapaConsumidoraId) {
  const conexoes = a.conexoes.filter(c => c.para.etapaId === etapaConsumidoraId);
  const esperadas = [];
  for (const c of conexoes) {
    const produtora = a.etapas.find(e => e.id === c.de.etapaId);
    if (produtora?.participacao?.organizacao === 'grupos') a.grupos.forEach(g => esperadas.push({ etapaId: produtora.id, grupoId: g.id }));
  }
  return esperadas;
}

/**
 * Confere uma coleção recebida contra as origens esperadas.
 * A coleção só é completa se cada origem esperada chegou exatamente uma vez
 * (ou foi coberta por contingência registrada). Contar itens não basta.
 * @param recebidos [{etapaId, grupoId (planejado), ...}]
 * @param contingencias [{etapaId, grupoId, tipo, executadoPor}]
 */
export function conferirColecao(esperadas, recebidos, contingencias = []) {
  const chave = o => `${o.etapaId}::${o.grupoId}`;
  const contagem = new Map();
  for (const r of recebidos) contagem.set(chave(r), (contagem.get(chave(r)) || 0) + 1);
  const cobertasPorContingencia = new Set(contingencias.map(chave));
  const faltantes = esperadas.filter(o => !contagem.has(chave(o)) && !cobertasPorContingencia.has(chave(o)));
  const duplicadas = [...contagem.entries()].filter(([, n]) => n > 1).map(([k]) => k);
  const inesperadas = recebidos.filter(r => !esperadas.some(o => chave(o) === chave(r)));
  return { completa: !faltantes.length && !duplicadas.length && !inesperadas.length, faltantes, duplicadas, inesperadas: inesperadas.map(chave) };
}

/** Uma etapa pode iniciar? Se não, diz exatamente por quê (nunca fabrica resultado). */
export function prontidaoEtapa(a, etapaId, resultados, contingencias = []) {
  const etapa = a.etapas.find(e => e.id === etapaId);
  const tipo = obterTipo(etapa.typeId, etapa.typeVersion);
  const obrigatorias = tipo.acceptedInputs.filter(p => p.obrigatoria);
  if (!obrigatorias.length) return { pronta: true, motivo: null };
  const esperadas = origensEsperadas(a, etapaId);
  const recebidos = resultados.filter(r => esperadas.some(o => o.etapaId === r.etapaId));
  const c = conferirColecao(esperadas, recebidos, contingencias);
  if (c.completa) return { pronta: true, motivo: null, conferencia: c };
  if (etapa.config?.aceitaParcial && !c.duplicadas.length)
    return { pronta: true, parcial: true, motivo: `Coleção parcial aceita pela configuração: faltam ${c.faltantes.length}.`, conferencia: c };
  return { pronta: false, motivo: `Aguardando ${c.faltantes.length} resultado(s) obrigatório(s).`, conferencia: c };
}

/** Pacote que um grupo recebe na etapa atual: só as peças destinadas a ele. */
export function projecaoGrupo(a, etapaId, grupoId, resultados = []) {
  const etapa = a.etapas.find(e => e.id === etapaId);
  const base = {
    etapaId, titulo: etapa.titulo, typeId: etapa.typeId, typeVersion: etapa.typeVersion,
    instrucao: etapa.instrucao || '', participacao: etapa.participacao, tempoMin: etapa.tempoMin ?? null,
    config: publicoConfig(etapa)
  };
  if (etapa.typeId === 'investigacao_fragmentos')
    base.pecas = a.pecas.filter(p => p.etapaId === etapaId && p.destinatarios.includes(grupoId))
      .map(p => ({ id: p.id, conteudo: p.conteudo, natureza: p.origem.natureza }));
  if (etapa.typeId === 'comparar_hipoteses') {
    // Cooperação: cada grupo vê as hipóteses e as evidências citadas pelos outros (só o que foi enviado).
    const ids = new Set(origensEsperadas(a, etapaId).map(o => o.etapaId));
    base.contribuicoes = resultados.filter(r => ids.has(r.etapaId)).map(r => ({
      grupoId: r.grupoId,
      grupoNome: a.grupos.find(g => g.id === r.grupoId)?.nome || '',
      hipoteseId: r.dados.hipoteseId,
      justificativa: r.dados.justificativa || '',
      evidencias: (r.dados.evidencias || []).map(pid => a.pecas.find(p => p.id === pid)).filter(Boolean).map(p => ({ id: p.id, conteudo: p.conteudo })),
      autoria: r.autoria || null
    }));
  }
  return base;
}

function publicoConfig(etapa) {
  const c = { ...(etapa.config || {}) };
  delete c.corretaId; delete c.gabarito;
  return c;
}

/** Avaliação pelo gabarito docente. Envio ≠ acerto ≠ conclusão (12.6). */
export function avaliar(a, etapaId, dados) {
  // cadeado e quiz: quem conduz já avaliou cada resultado (grupo destravou / grupo acertou a pergunta)
  if (typeof dados?.acertou === 'boolean') return { avaliada: true, correta: dados.acertou };
  const r = a.docente?.respostas?.[etapaId];
  if (!r) return { avaliada: false };
  const escolhida = dados.alternativaId ?? dados.hipoteseId;
  return { avaliada: true, correta: escolhida === r.corretaId };
}

/** Meta coletiva (competir para superar o desafio). Ausências não contam como acerto. */
export function calcularMeta(a, resultados) {
  const m = a.meta;
  if (!m || m.ativa === false) return null;
  const considerados = resultados.filter(r => m.etapas.includes(r.etapaId));
  const avaliados = considerados.map(r => avaliar(a, r.etapaId, r.dados)).filter(x => x.avaliada);
  const acertos = avaliados.filter(x => x.correta).length;
  const proporcao = avaliados.length ? acertos / avaliados.length : 0;
  return { acertos, total: avaliados.length, proporcao, limiar: m.limiar, atingida: avaliados.length > 0 && proporcao >= m.limiar };
}

/** Escala mostrada durante a atividade (sem pontos): 0..4. */
export function escalaDesempenho(meta) {
  if (!meta || !meta.total) return 0;
  return Math.min(4, Math.floor((meta.proporcao / meta.limiar) * 3) + (meta.atingida ? 1 : 0));
}

/** Registro de contingência para grupo vazio (ADR-001): preserva atribuição planejada e autoria real. */
export function registrarContingencia({ etapaId, grupoPlanejadoId, tipo, executadoPor, observacao = '' }) {
  const tipos = ['executor_adicional', 'execucao_docente', 'aceitar_parcial_registrado'];
  if (!tipos.includes(tipo)) throw new Error('Contingência não suportada: ' + tipo);
  if (tipo === 'executor_adicional' && !executadoPor) throw new Error('Informe o grupo que executará a tarefa.');
  return { etapaId, grupoId: grupoPlanejadoId, tipo, executadoPor: executadoPor ?? 'docente', observacao, registradaEm: new Date().toISOString() };
}

/**
 * Normaliza um envio para resultado. A autoria real (quem enviou) e a
 * atribuição planejada (grupo cuja tarefa foi cumprida) ficam separadas.
 */
export function montarResultado({ etapaId, grupoPlanejadoId = null, participanteId = null, autoria, dados, tentativa = 1 }) {
  return { etapaId, grupoId: grupoPlanejadoId, participanteId, autoria, dados, tentativa };
}
