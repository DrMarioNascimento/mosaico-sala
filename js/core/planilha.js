/* MOSAICO · Formato de planilha da atividade (modo aberto e troca de arquivos)
   Módulo puro: converte atividade ⇄ abas (listas de linhas). A leitura/escrita
   do arquivo .xlsx fica em js/planilha-xlsx.js (navegador).

   Abas:
     Atividade  campo | valor               (dados gerais, meta, guia, pendências)
     Grupos     ordem | id | nome | funcao
     Etapas     ordem | id | titulo | tipo | organizacao | envio | competicao | tempo_min |
                instrucao | pergunta | enunciado | justificativa | min_evidencias |
                aceita_parcial | recebe_de | explicacao
     Opcoes     etapa | id | texto | correta      (hipóteses e alternativas; "x" marca a correta)
     Pecas      id | etapa | grupos | natureza | fonte | conteudo   (grupos separados por ;)
     Fontes     id | descricao | localizacao | trecho
   A resposta correta e a explicação são material de quem conduz: quem for
   distribuir a planilha a outras pessoas deve saber que ela contém o gabarito. */

import { TIPOS } from './tipos.js';
import { SCHEMA_VERSION } from './validacao.js';

export const ABAS = {
  Atividade: ['campo', 'valor'],
  Grupos: ['ordem', 'id', 'nome', 'funcao'],
  Etapas: ['ordem', 'id', 'titulo', 'tipo', 'organizacao', 'envio', 'competicao', 'tempo_min', 'instrucao', 'pergunta', 'enunciado', 'justificativa', 'min_evidencias', 'aceita_parcial', 'recebe_de', 'explicacao'],
  Opcoes: ['etapa', 'id', 'texto', 'correta'],
  Pecas: ['id', 'etapa', 'grupos', 'natureza', 'fonte', 'conteudo'],
  Fontes: ['id', 'descricao', 'localizacao', 'trecho']
};

const LISTAS = ['objetivos', 'pendencias', 'guia', 'pontos_de_discussao', 'meta_etapas'];

/** Normaliza nomes de coluna/aba: minúsculas, sem acentos, espaços viram _. */
export const norm = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase().replace(/[\s-]+/g, '_');
const txt = v => (v === undefined || v === null) ? '' : String(v).trim();
const sim = v => /^(x|sim|s|true|verdadeiro|1|yes)$/i.test(txt(v));
const num = v => { const t = txt(v).replace(',', '.').replace('%', ''); if (!t) return undefined; const n = Number(t); return Number.isFinite(n) ? n : undefined; };
const linhas = v => txt(v).split(/\r?\n/).map(x => x.trim()).filter(Boolean);

// ---------------------------------------------------------------- atividade → abas
export function atividadeParaAbas(a) {
  const r = a.docente?.respostas || {};
  const meta = a.meta || {};
  const geral = [
    ['id', a.id], ['titulo', a.titulo], ['publico', a.publico], ['duracao_min', a.duracaoMin], ['regime', a.regime],
    ['pergunta_central', a.perguntaCentral], ['introducao', a.introducao],
    ['objetivos', (a.objetivos || []).join('\n')],
    ['meta_ativa', meta.ativa === false || !a.meta ? 'não' : 'sim'], ['meta_limiar', meta.limiar !== undefined ? Math.round(meta.limiar * 100) + '%' : ''],
    ['meta_descricao', meta.descricao], ['meta_etapas', (meta.etapas || []).join('\n')],
    ['guia', (a.docente?.guia || []).join('\n')], ['pontos_de_discussao', (a.docente?.pontosDeDiscussao || []).join('\n')],
    ['pendencias', (a.pendencias || []).join('\n')]
  ].map(([campo, valor]) => ({ campo, valor: valor ?? '' }));

  const grupos = [...a.grupos].sort((x, y) => x.ordemAlocacao - y.ordemAlocacao)
    .map(g => ({ ordem: g.ordemAlocacao, id: g.id, nome: g.nome, funcao: g.funcao || '' }));

  const etapas = [...a.etapas].sort((x, y) => x.ordem - y.ordem).map(e => {
    const c = e.config || {};
    const conexao = a.conexoes.find(x => x.para.etapaId === e.id);
    return {
      ordem: e.ordem, id: e.id, titulo: e.titulo, tipo: e.typeId,
      organizacao: e.participacao?.organizacao, envio: e.participacao?.envio, competicao: e.participacao?.competicao,
      tempo_min: e.tempoMin ?? '', instrucao: e.instrucao || '', pergunta: c.pergunta || '', enunciado: c.enunciado || '',
      justificativa: c.justificativa || '', min_evidencias: c.minEvidencias ?? '', aceita_parcial: c.aceitaParcial ? 'sim' : '',
      recebe_de: conexao ? conexao.de.etapaId : '', explicacao: r[e.id]?.explicacao || ''
    };
  });

  const opcoes = [];
  for (const e of [...a.etapas].sort((x, y) => x.ordem - y.ordem)) {
    const lista = e.config?.hipotesesCandidatas || e.config?.alternativas || [];
    for (const o of lista) opcoes.push({ etapa: e.id, id: o.id, texto: o.texto, correta: r[e.id]?.corretaId === o.id ? 'x' : '' });
  }

  const pecas = a.pecas.map(p => ({ id: p.id, etapa: p.etapaId, grupos: p.destinatarios.join('; '), natureza: p.origem?.natureza || '', fonte: p.origem?.fonteId || '', conteudo: p.conteudo }));
  const fontes = a.fontes.map(f => ({ id: f.id, descricao: f.descricao || '', localizacao: f.localizacao || '', trecho: f.trecho || '' }));
  return { Atividade: geral, Grupos: grupos, Etapas: etapas, Opcoes: opcoes, Pecas: pecas, Fontes: fontes };
}

// ---------------------------------------------------------------- abas → atividade
/**
 * @param abas {nomeDaAba: [ {coluna: valor} ]} — nomes de aba/coluna em qualquer caixa e com ou sem acento.
 * Devolve {atividade, problemas[]}. Problemas de leitura (aba faltando, tipo desconhecido) não
 * substituem a validação completa, que roda depois em validarAtividade().
 */
export function abasParaAtividade(abas) {
  const problemas = [];
  const tab = {};
  for (const [nome, linhasAba] of Object.entries(abas || {})) {
    tab[norm(nome)] = (linhasAba || []).map(l => Object.fromEntries(Object.entries(l).map(([k, v]) => [norm(k), v])))
      .filter(l => Object.values(l).some(v => txt(v) !== ''));
  }
  for (const n of ['atividade', 'grupos', 'etapas']) if (!tab[n]) problemas.push(`Aba "${n[0].toUpperCase() + n.slice(1)}" não encontrada.`);

  const g = {};
  for (const l of tab.atividade || []) g[norm(l.campo)] = LISTAS.includes(norm(l.campo)) ? linhas(l.valor) : txt(l.valor);

  const etapasL = (tab.etapas || []).map(l => ({ ...l, ordem: num(l.ordem) }));
  const opcoesL = tab.opcoes || [];
  const respostas = {};
  const etapas = etapasL.map((l, i) => {
    const typeId = txt(l.tipo);
    const tipo = TIPOS[typeId];
    if (!tipo) problemas.push(`Etapa "${txt(l.titulo) || txt(l.id)}": tipo "${typeId}" desconhecido.`);
    const id = txt(l.id);
    const ops = opcoesL.filter(o => txt(o.etapa) === id).map(o => ({ id: txt(o.id), texto: txt(o.texto), correta: sim(o.correta) }));
    const config = {};
    if (typeId === 'investigacao_fragmentos' || typeId === 'comparar_hipoteses') {
      config.pergunta = txt(l.pergunta);
      config.hipotesesCandidatas = ops.map(({ id, texto }) => ({ id, texto }));
      if (txt(l.justificativa)) config.justificativa = txt(l.justificativa);
      if (typeId === 'investigacao_fragmentos' && num(l.min_evidencias) !== undefined) config.minEvidencias = num(l.min_evidencias);
      if (typeId === 'comparar_hipoteses') config.aceitaParcial = sim(l.aceita_parcial);
    } else if (typeId === 'questao_individual') {
      config.enunciado = txt(l.enunciado);
      config.alternativas = ops.map(({ id, texto }) => ({ id, texto }));
    }
    const correta = ops.find(o => o.correta);
    if (correta) respostas[id] = { corretaId: correta.id, explicacao: txt(l.explicacao) };
    const padrao = tipo?.participacao || { organizacao: ['grupos'], envio: ['representante'], competicao: ['meta'] };
    return {
      id, ordem: l.ordem ?? i + 1, titulo: txt(l.titulo), typeId, typeVersion: tipo?.typeVersion || '1.0.0',
      ...(num(l.tempo_min) ? { tempoMin: num(l.tempo_min) } : {}),
      instrucao: txt(l.instrucao),
      participacao: {
        organizacao: txt(l.organizacao) || padrao.organizacao[0],
        envio: txt(l.envio) || padrao.envio[0],
        competicao: txt(l.competicao) || (padrao.competicao.includes('meta') ? 'meta' : padrao.competicao[0])
      },
      config
    };
  });

  const conexoes = etapasL.filter(l => txt(l.recebe_de)).map(l => {
    const de = etapas.find(e => e.id === txt(l.recebe_de)), para = etapas.find(e => e.id === txt(l.id));
    const portaDe = TIPOS[de?.typeId]?.producedOutputs?.[0]?.portId || 'hipotese_grupo';
    const portaPara = TIPOS[para?.typeId]?.acceptedInputs?.[0]?.portId || 'hipoteses_recebidas';
    return { id: `c_${txt(l.recebe_de)}_${txt(l.id)}`.slice(0, 64), de: { etapaId: txt(l.recebe_de), portId: portaDe }, para: { etapaId: txt(l.id), portId: portaPara }, agregacao: 'colecao_uma_por_grupo_planejado' };
  });

  const limiar = num(g.meta_limiar);
  const atividade = {
    schemaVersion: SCHEMA_VERSION,
    id: g.id || 'atividade', titulo: g.titulo || '', publico: g.publico || '',
    duracaoMin: num(g.duracao_min) ?? 50, regime: g.regime || 'fiel',
    perguntaCentral: g.pergunta_central || '', objetivos: g.objetivos || [], introducao: g.introducao || '',
    fontes: (tab.fontes || []).map(l => ({ id: txt(l.id), descricao: txt(l.descricao), localizacao: txt(l.localizacao), trecho: txt(l.trecho) })),
    grupos: (tab.grupos || []).map((l, i) => ({ id: txt(l.id), nome: txt(l.nome), ordemAlocacao: num(l.ordem) ?? i + 1, ...(txt(l.funcao) ? { funcao: txt(l.funcao) } : {}) })),
    etapas,
    pecas: (tab.pecas || []).map(l => {
      const natureza = txt(l.natureza) || 'sintetico';
      return { id: txt(l.id), etapaId: txt(l.etapa), destinatarios: txt(l.grupos).split(/[;,]/).map(x => x.trim()).filter(Boolean), origem: natureza === 'sintetico' && !txt(l.fonte) ? { natureza } : { natureza, fonteId: txt(l.fonte) }, conteudo: txt(l.conteudo) };
    }),
    conexoes,
    meta: { ativa: !/^(nao|não|n|false|0)$/i.test(g.meta_ativa || 'sim'), descricao: g.meta_descricao || '', etapas: g.meta_etapas || [], limiar: limiar === undefined ? 0.5 : (limiar > 1 ? limiar / 100 : limiar) },
    docente: { respostas, guia: g.guia || [], pontosDeDiscussao: g.pontos_de_discussao || [] },
    pendencias: g.pendencias || []
  };
  return { atividade, problemas };
}
