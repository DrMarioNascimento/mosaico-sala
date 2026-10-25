/* MOSAICO · Prévia ao vivo do Planejamento
   Monta, a partir da atividade em edição, uma versão que a sala de ensaio aceita
   enquanto o professor ainda está escrevendo: só a etapa aberta (e a investigação
   de que uma comparação depende), com "…" no lugar do que está em branco e um
   gabarito provisório onde ele falta. Nada disso volta para a atividade.
   Módulo puro: sem DOM. Testado em tests/previa-ao-vivo.test.mjs. */

import { validarAtividade, temErros } from './validacao.js';
import { TIPOS } from './tipos.js';

const VAZIO = '…';
// Campos de texto que aparecem para a turma; em branco, viram "…" na prévia.
const TEXTOS = new Set(['texto', 'enunciado', 'pergunta', 'conteudo', 'a', 'b', 'termo', 'dica', 'titulo', 'estimulo', 'gatilho', 'consequencia', 'rotulo', 'esquerda', 'direita', 'nome']);

function preencher(v) {
  if (Array.isArray(v)) return v.map(preencher);
  if (!v || typeof v !== 'object') return v;
  const o = {};
  for (const [k, x] of Object.entries(v)) o[k] = TEXTOS.has(k) && typeof x === 'string' && !x.trim() ? VAZIO : preencher(x);
  return o;
}

/** Gabarito provisório: a primeira opção, a ordem escrita, um código qualquer. Só para a prévia abrir. */
function gabaritoProvisorio(e, r = {}) {
  const c = e.config || {}, out = JSON.parse(JSON.stringify(r || {}));
  const opcoes = c.hipotesesCandidatas || c.alternativas;
  if (Array.isArray(opcoes) && opcoes.length && !opcoes.some(o => o.id === out.corretaId) && ['comparar_hipoteses', 'questao_individual'].includes(e.typeId)) out.corretaId = opcoes[0].id;
  if (Array.isArray(c.perguntas)) {
    out.perguntas ||= {};
    for (const q of c.perguntas) {
      const alts = q.alternativas || [];
      if (alts.length && !alts.some(a => a.id === out.perguntas[q.id]?.corretaId)) out.perguntas[q.id] = { ...(out.perguntas[q.id] || {}), corretaId: alts[0].id };
    }
  }
  if (e.typeId === 'cadeado_grupo' && c.regra === 'fragmentos' && !String(out.codigo ?? '').trim()) out.codigo = (c.fragmentos || []).join('') || '1';
  if (e.typeId === 'cartoes_arrastar' && c.formato === 'ordenar') {
    const ids = (c.cartoes || []).map(x => x.id);
    if (!Array.isArray(out.ordem) || out.ordem.length !== ids.length || out.ordem.some(id => !ids.includes(id))) out.ordem = ids;
  }
  if (e.typeId === 'cartoes_arrastar' && c.formato === 'classificar') {
    out.colunaDe ||= {};
    for (const x of c.cartoes || []) if (!out.colunaDe[x.id]) out.colunaDe[x.id] = c.colunas?.[0]?.id;
  }
  return out;
}

/**
 * Atividade para a prévia ao vivo.
 * @param a atividade em edição
 * @param etapaId etapa aberta no editor (ou null: só a abertura, com a primeira etapa)
 * @returns {atividade, etapaId, problemas: [mensagem]} — com problemas, a prévia não abre e mostra a lista
 */
export function atividadeParaPrevia(a, etapaId = null) {
  if (!a || !Array.isArray(a.etapas) || !a.etapas.length) return { atividade: null, etapaId: null, problemas: ['Adicione uma etapa para ver a prévia.'] };
  const ordenadas = [...a.etapas].sort((x, y) => x.ordem - y.ordem);
  const alvo = ordenadas.find(e => e.id === etapaId) || null;
  const base = alvo || ordenadas[0];
  const manter = new Set([base.id]);
  // A comparação só abre recebendo as hipóteses de uma investigação anterior
  for (const c of a.conexoes || []) if (c.para?.etapaId === base.id) manter.add(c.de.etapaId);
  const etapas = ordenadas.filter(e => manter.has(e.id)).map((e, i) => {
    const x = { ...preencher(e), ordem: i + 1, typeId: e.typeId, typeVersion: e.typeVersion };
    if (!String(e.config?.enunciado ?? '').trim() && ['cartoes_arrastar', 'pares'].includes(e.typeId)) x.config = { ...x.config, enunciado: e.config?.enunciado ?? '' };   // aqui o comando é opcional: em branco, some
    if (x.config?.relacionarCom && !manter.has(x.config.relacionarCom)) { x.config = { ...x.config }; delete x.config.relacionarCom; }   // relação com etapa que ficou de fora
    return x;
  });
  const respostas = {};
  for (const e of etapas) if (TIPOS[e.typeId]?.assessmentPolicy === 'gabarito_docente' || a.docente?.respostas?.[e.id]) respostas[e.id] = gabaritoProvisorio(e, a.docente?.respostas?.[e.id]);
  const grupos = (a.grupos || []).map(g => ({ ...g, nome: g.nome?.trim() ? g.nome : VAZIO }));
  const p = {
    ...a, titulo: a.titulo?.trim() || 'Nova atividade', grupos, etapas,
    pecas: (a.pecas || []).filter(x => manter.has(x.etapaId)).map(x => ({ ...x, conteudo: x.conteudo?.trim() ? x.conteudo : VAZIO, origem: x.origem?.natureza ? x.origem : { natureza: 'sintetico' } })),
    conexoes: (a.conexoes || []).filter(c => manter.has(c.de?.etapaId) && manter.has(c.para?.etapaId)),
    meta: { ativa: false, descricao: '', etapas: [], limiar: 0.5 },
    docente: { ...(a.docente || {}), respostas },
    fontes: a.fontes || [], pendencias: []
  };
  const erros = validarAtividade(p).filter(d => d.severidade === 'erro').map(d => d.mensagem);
  return { atividade: temErros(validarAtividade(p)) ? null : p, etapaId: alvo ? alvo.id : null, problemas: [...new Set(erros)] };
}
