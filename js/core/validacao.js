/* Mosaico Sala · Validação estrutural de uma atividade configurada
   Especificação v2, seções 6.3, 11, 12.9 e 17.1.

   Recebe um objeto (já lido do JSON) e devolve diagnósticos localizados:
   {severidade: 'erro'|'aviso'|'info', local, mensagem}.
   Erro impede aplicar; aviso e info não.
   Nada aqui executa conteúdo do arquivo nem corrige automaticamente. */

import { TIPOS, obterTipo, portasCompativeis, erro, aviso, info } from './tipos.js';

export const SCHEMA_VERSION = 'mosaico-atividade-0.1';
const ID = /^[a-z0-9][a-z0-9_-]{0,63}$/;
const NATUREZAS = ['citacao', 'parafrase', 'inferencia', 'sintetico'];

export function validarAtividade(a) {
  const d = [];
  if (!a || typeof a !== 'object' || Array.isArray(a)) return [erro('raiz', 'O arquivo não contém um objeto de atividade.')];

  if (a.schemaVersion !== SCHEMA_VERSION)
    d.push(erro('schemaVersion', `Versão de esquema "${a.schemaVersion ?? '(ausente)'}" não suportada. Esperado: ${SCHEMA_VERSION}.`));

  for (const campo of ['id', 'titulo', 'regime', 'fontes', 'grupos', 'etapas', 'pecas', 'conexoes', 'meta', 'docente'])
    if (a[campo] === undefined) d.push(erro(campo, `Campo obrigatório ausente: ${campo}.`));
  if (d.some(x => x.severidade === 'erro' && x.local !== 'schemaVersion')) return d;

  if (!ID.test(a.id)) d.push(erro('id', 'ID da atividade inválido (use letras minúsculas, números, _ ou -).'));
  if (!['fiel', 'simulacao'].includes(a.regime)) d.push(erro('regime', "Regime deve ser 'fiel' ou 'simulacao'."));

  for (const lista of ['fontes', 'grupos', 'etapas', 'pecas', 'conexoes'])
    if (!Array.isArray(a[lista])) d.push(erro(lista, `${lista} deve ser uma lista.`));
  if (d.some(x => x.severidade === 'erro')) return d;

  if(typeof a.titulo!=='string'||!a.titulo.trim()) d.push(erro('titulo','Informe um título para a atividade.'));
  if(!a.etapas.length) d.push(erro('etapas','Inclua ao menos uma etapa para preparar a aula.'));
  if(!a.grupos.length) d.push(erro('grupos','Inclua pelo menos um grupo para organizar a sala, mesmo com respostas individuais.'));

  // IDs únicos e bem formados por coleção
  const mapas = {};
  for (const lista of ['fontes', 'grupos', 'etapas', 'pecas', 'conexoes']) {
    mapas[lista] = new Map();
    a[lista].forEach((item, i) => {
      const local = `${lista}[${i}]`;
      if (!item || !ID.test(item.id)) { d.push(erro(local, 'ID ausente ou inválido.')); return; }
      if (mapas[lista].has(item.id)) d.push(erro(local, `ID repetido: ${item.id}.`));
      mapas[lista].set(item.id, item);
    });
  }
  const { fontes, grupos, etapas, pecas } = mapas;

  // Grupos planejados (ADR-001) — no máximo 10: um ícone/forma distinto para cada grupo
  if (a.grupos.length > 10) d.push(erro('grupos', `São ${a.grupos.length} grupos; o máximo é 10 (um ícone diferente para cada).`));
  const ordens = a.grupos.map(g => g.ordemAlocacao);
  a.grupos.forEach((g, i) => {
    if (typeof g.nome !== 'string' || !g.nome.trim()) d.push(erro(`grupos[${i}].nome`, 'Grupo sem nome visível.'));
    if (!Number.isInteger(g.ordemAlocacao) || g.ordemAlocacao < 1) d.push(erro(`grupos[${i}].ordemAlocacao`, 'ordemAlocacao deve ser inteiro ≥ 1.'));
  });
  if (new Set(ordens).size !== ordens.length) d.push(erro('grupos', 'Duas posições de grupo com a mesma ordem de alocação.'));
  if ('membros' in (a.grupos[0] || {}) || a.grupos.some(g => 'membros' in g || 'participantes' in g))
    d.push(erro('grupos', 'O plano reutilizável não pode conter pessoas: a composição pertence à sala (ADR-001).'));

  // Fontes
  a.fontes.forEach((f, i) => {
    if (typeof f.descricao !== 'string' || !f.descricao.trim()) d.push(aviso(`fontes[${i}]`, 'Fonte sem descrição.'));
    if (typeof f.localizacao !== 'string' || !f.localizacao.trim()) d.push(aviso(`fontes[${i}]`, 'Fonte sem localização verificável (página, seção ou parágrafo).'));
  });

  // Etapas e tipos
  const ordensEtapa = new Set();
  a.etapas.forEach((e, i) => {
    const local = `etapas[${i}]`;
    if (!Number.isInteger(e.ordem)) d.push(erro(`${local}.ordem`, 'Etapa sem ordem numérica.'));
    else if (ordensEtapa.has(e.ordem)) d.push(erro(`${local}.ordem`, `Duas etapas com ordem ${e.ordem}.`));
    else ordensEtapa.add(e.ordem);
    if (typeof e.titulo !== 'string' || !e.titulo.trim()) d.push(erro(`${local}.titulo`, 'Etapa sem título.'));

    const tipo = obterTipo(e.typeId, e.typeVersion);
    if (!tipo) {
      const conhecido = TIPOS[e.typeId];
      d.push(erro(`${local}.typeId`, conhecido
        ? `Versão ${e.typeVersion} do tipo "${e.typeId}" não está disponível (disponível: ${conhecido.typeVersion}). Nada foi substituído automaticamente.`
        : `Tipo "${e.typeId}" não existe no catálogo. Nenhum código externo é carregado.`));
      return;
    }
    const p = e.participacao || {};
    for (const [dim, valor] of [['organizacao', p.organizacao], ['envio', p.envio], ['competicao', p.competicao]])
      if (!tipo.participacao[dim].includes(valor))
        d.push(erro(`${local}.participacao.${dim}`, `"${valor}" não é suportado por ${tipo.nome} (aceita: ${tipo.participacao[dim].join(', ')}).`));
    if (p.organizacao === 'grupos' && a.grupos.length < 1) d.push(erro(local, 'Etapa em grupos, mas o plano não tem grupos.'));
    if (e.tempoMin !== undefined && !(Number.isFinite(e.tempoMin) && e.tempoMin > 0)) d.push(erro(`${local}.tempoMin`, 'Tempo deve ser positivo.'));
    for (const diag of tipo.validar(e, { atividade: a })) d.push({ ...diag, local: `${local}.${diag.local}` });
  });

  // Peças
  a.pecas.forEach((p, i) => {
    const local = `pecas[${i}]`;
    if (typeof p.conteudo !== 'string' || !p.conteudo.trim()) d.push(erro(`${local}.conteudo`, 'Peça sem conteúdo.'));
    if (!etapas.has(p.etapaId)) d.push(erro(`${local}.etapaId`, `Etapa inexistente: ${p.etapaId}.`));
    else {
      const t = obterTipo(etapas.get(p.etapaId).typeId, etapas.get(p.etapaId).typeVersion);
      if (t && !t.usaPecas) d.push(aviso(`${local}.etapaId`, `A etapa "${etapas.get(p.etapaId).titulo}" não exibe peças; esta peça não aparecerá.`));
    }
    if (!Array.isArray(p.destinatarios) || !p.destinatarios.length) d.push(erro(`${local}.destinatarios`, 'Peça sem destinatário.'));
    else p.destinatarios.forEach(g => { if (!grupos.has(g)) d.push(erro(`${local}.destinatarios`, `Grupo inexistente: ${g}.`)); });
    const o = p.origem || {};
    if (!NATUREZAS.includes(o.natureza)) d.push(erro(`${local}.origem.natureza`, `Natureza deve ser: ${NATUREZAS.join(', ')}.`));
    if (o.natureza === 'sintetico' && a.regime === 'fiel') d.push(erro(`${local}.origem`, 'Conteúdo sintético não é permitido no regime fiel ao material.'));
    if (o.natureza && o.natureza !== 'sintetico' && !fontes.has(o.fonteId)) d.push(erro(`${local}.origem.fonteId`, `Fonte inexistente: ${o.fonteId ?? '(ausente)'}.`));
    if (/\b(pe[cç]a|pista|carta)\s*(n[ºo°]\s*)?\d+\b/i.test(p.conteudo || ''))
      d.push(aviso(`${local}.conteudo`, 'A peça exibe uma numeração visível; isso facilita decorar entre aplicações.'));
  });

  // Conexões (portas tipadas) e ausência de ciclos de liberação
  a.conexoes.forEach((c, i) => {
    const local = `conexoes[${i}]`;
    const ep = etapas.get(c.de?.etapaId), ec = etapas.get(c.para?.etapaId);
    if (!ep || !ec) { d.push(erro(local, 'Conexão aponta para etapa inexistente.')); return; }
    const tp = obterTipo(ep.typeId, ep.typeVersion), tc = obterTipo(ec.typeId, ec.typeVersion);
    if (!tp || !tc) return;
    if (!portasCompativeis(tp, c.de.portId, tc, c.para.portId))
      d.push(erro(local, `A saída ${tp.typeId}.${c.de.portId} não é aceita pela entrada ${tc.typeId}.${c.para.portId}.`));
    if (Number.isInteger(ep.ordem) && Number.isInteger(ec.ordem) && ep.ordem >= ec.ordem)
      d.push(erro(local, `"${ec.titulo}" consome um resultado de "${ep.titulo}", que vem depois ou na mesma posição. Isso criaria um bloqueio.`));
    if (ep.participacao?.organizacao !== 'grupos' && c.de.portId === 'hipotese_grupo')
      d.push(erro(local, 'A hipótese por grupo só existe quando a etapa produtora é em grupos.'));
  });
  for (const e of a.etapas) {
    const tipo = obterTipo(e.typeId, e.typeVersion);
    if (!tipo) continue;
    for (const entrada of tipo.acceptedInputs.filter(x => x.obrigatoria))
      if (!a.conexoes.some(c => c.para?.etapaId === e.id && c.para?.portId === entrada.portId))
        d.push(erro(`etapas[${a.etapas.indexOf(e)}]`, `"${e.titulo}" precisa receber ${entrada.portId}, mas nenhuma etapa anterior está conectada.`));
  }

  // Material docente separado e gabarito válido
  const respostas = a.docente?.respostas || {};
  for (const e of a.etapas) {
    const tipo = obterTipo(e.typeId, e.typeVersion);
    if (!tipo || tipo.assessmentPolicy !== 'gabarito_docente') continue;
    const r = respostas[e.id];
    if (tipo.validarRespostas) { d.push(...tipo.validarRespostas(e, r)); continue; }
    const opcoes = e.typeId === 'questao_individual' ? (e.config?.alternativas || []) : (e.config?.hipotesesCandidatas || []);
    if (!r || !opcoes.some(o => o.id === r.corretaId)) d.push(erro(`docente.respostas.${e.id}`, `Falta resposta esperada válida para "${e.titulo}".`));
    else if (!r.explicacao) d.push(aviso(`docente.respostas.${e.id}`, 'Resposta esperada sem explicação para a discussão.'));
  }
  for (const id of Object.keys(respostas)) if (!etapas.has(id)) d.push(erro(`docente.respostas.${id}`, 'Resposta para etapa inexistente.'));
  if (JSON.stringify(a.etapas).match(/"(corretaId|correta|gabarito)"\s*:/))
    d.push(erro('etapas', 'Há gabarito dentro das etapas. Respostas esperadas ficam apenas em docente.respostas.'));

  // Meta
  const m = a.meta;
  if (m && m.ativa !== false) {
    if (!(typeof m.limiar === 'number' && m.limiar > 0 && m.limiar <= 1)) d.push(erro('meta.limiar', 'Limiar da meta deve estar entre 0 e 1 (ex.: 0.5).'));
    if (!Array.isArray(m.etapas) || !m.etapas.length) d.push(erro('meta.etapas', 'Indique as etapas que contam para a meta.'));
    else m.etapas.forEach(id => {
      const e = etapas.get(id);
      if (!e) d.push(erro('meta.etapas', `Etapa inexistente: ${id}.`));
      else if (obterTipo(e.typeId, e.typeVersion)?.assessmentPolicy !== 'gabarito_docente')
        d.push(erro('meta.etapas', `"${e.titulo}" não tem resposta esperada; não pode contar para a meta.`));
      else if (e.typeId === 'cartoes_arrastar' && e.config?.formato === 'termometro' && !Object.values(respostas[e.id]?.posicao || {}).some(v => v !== null && v !== '' && Number.isFinite(Number(v))))
        d.push(erro('meta.etapas', `"${e.titulo}" é um termômetro só de debate (sem posição esperada); não pode contar para a meta.`));
      else if ((e.typeId === 'analise_imagem' && e.config?.tarefa === 'observar') || (e.typeId === 'pares' && e.config?.formato === 'memoria' && e.participacao?.organizacao === 'representantes'))
        d.push(erro('meta.etapas', `"${e.titulo}" não tem acerto por grupo para contar na meta.`));
    });
  }

  // Os celulares sorteiam a ordem, mas a planilha, a impressão e a conversa em sala usam a letra escrita: certa sempre na mesma letra vira padrão.
  for (const e of a.etapas) {
    const qs = e.config?.perguntas, rp = respostas[e.id]?.perguntas;
    if (!Array.isArray(qs) || qs.length < 3 || !rp) continue;
    const letras = qs.map(q => rp[q.id]?.corretaId).filter(Boolean);
    if (letras.length === qs.length && new Set(letras).size === 1)
      d.push(aviso(`docente.respostas.${e.id}`, `Em "${e.titulo}", a resposta certa é sempre a alternativa ${String(letras[0]).toUpperCase()}. Varie a posição para a turma não decorar o padrão.`));
  }

  // LGPD: casos devem ser fictícios. Avisa (não bloqueia) quando um texto parece ter dado pessoal real.
  const textos = [['introducao', a.introducao], ['perguntaCentral', a.perguntaCentral],
    ...a.pecas.map((p, i) => [`pecas[${i}].conteudo`, p.conteudo]),
    ...a.etapas.map((e, i) => [`etapas[${i}]`, [e.instrucao, e.config?.pergunta, e.config?.enunciado, e.config?.texto, ...(e.config?.hipotesesCandidatas || e.config?.alternativas || []).map(o => o.texto),
      ...(e.config?.perguntas || []).flatMap(q => [q.enunciado, ...(q.alternativas || []).map(o => o.texto)]), ...(e.config?.fragmentos || []), e.config?.mensagem,
      ...(e.config?.cartoes || []).map(x => x.texto), ...(e.config?.colunas || []).map(x => x.titulo),
      ...(e.config?.pares || []).flatMap(x => [x.a, x.b]), e.config?.gatilho, ...(e.config?.elos || []).flatMap(x => [x.consequencia, ...(x.distratores || [])]),
      ...(e.config?.rodadas || []).flatMap(r => [r.estimulo, ...(r.variaveis || []).map(v => v.nome)]), ...(e.config?.palavras || []).map(x => x.dica), ...(e.config?.termos || []).flatMap(x => [x.termo, x.definicao]),
      ...(e.config?.cenarios || []).flatMap(c => [c.texto, ...(c.opcoes || []).flatMap(o => [o.texto, o.feedback])]), ...(e.config?.marcadores || []).map(m => m.rotulo)].join(' ')])];
  for (const [local, t] of textos) {
    const tipo = dadoPessoal(t);
    if (tipo) d.push(aviso(local, `Parece conter ${tipo}. Use casos fictícios, sem dados de pessoas reais.`));
  }

  // Etapa marcada para competir pela meta, mas fora da conta (meta.etapas): a turma acha que conta e não conta.
  if (a.meta?.ativa !== false && Array.isArray(a.meta?.etapas)) {
    const fora = a.etapas.filter(e => e.participacao?.competicao === 'meta' && !a.meta.etapas.includes(e.id));
    if (fora.length) d.push(aviso('meta.etapas', `${fora.length} etapa(s) marcadas para a meta não entram na conta: ${fora.map(e => '"' + e.titulo + '"').join(', ')}. Marque-as em "Etapas que contam para a meta" ou mude a competição delas.`));
  }

  // A introdução é pública (telão e espera dos celulares): texto dirigido ao professor ali vaza para a turma.
  if (falaComQuemConduz(a.introducao))
    d.push(aviso('introducao', 'A introdução aparece para os alunos, mas parece falar com quem conduz (plano, material de origem, gabarito). Leve esse texto para o guia de condução.'));

  if (Array.isArray(a.pendencias) && a.pendencias.length)
    d.push(info('pendencias', `${a.pendencias.length} pendência(s) registrada(s) pela montagem para revisão docente.`));
  return d;
}

/** Texto escrito para quem conduz, não para a turma (usado na introdução, que é pública). */
export function falaComQuemConduz(texto) {
  return /(o|a) professor(a)? (pode|deve|decide|escolhe|use|usa)|banco de oficinas|gabarito|remover as (oficinas|etapas)|\.pdf|não (tente )?aplicar todas/i.test(String(texto || ''));
}

/** Detecta padrões de dado pessoal: CPF, e-mail, telefone celular brasileiro. */
export function dadoPessoal(texto) {
  const t = String(texto || '');
  if (/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/.test(t)) return 'um CPF';
  if (/[\w.+-]+@[\w-]+\.[\w.]{2,}/.test(t)) return 'um e-mail';
  if (/(\(\d{2}\)\s?|\b\d{2}\s)9\d{4}-?\d{4}\b/.test(t)) return 'um telefone';
  return null;
}

export const temErros = diags => diags.some(x => x.severidade === 'erro');

/** Leitura segura de JSON importado: só dados, tamanho limitado. */
export function lerJsonImportado(textoBruto, limiteBytes = 2_000_000) {
  if (typeof textoBruto !== 'string') return { diagnosticos: [erro('arquivo', 'Conteúdo não é texto.')] };
  if (textoBruto.length > limiteBytes) return { diagnosticos: [erro('arquivo', `Arquivo acima do limite (${Math.round(limiteBytes / 1e6)} MB).`)] };
  // Tolera o jeito como as IAs costumam responder: texto antes/depois e cercas de código ```json ... ```.
  const limpo = textoBruto.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
  try { return { atividade: JSON.parse(limpo), diagnosticos: [] }; }
  catch (e) {
    const cerca = /```(?:json)?\s*([\s\S]*?)```/i.exec(textoBruto)?.[1];
    const i = textoBruto.indexOf('{'), j = textoBruto.lastIndexOf('}');
    for (const candidato of [cerca, i >= 0 && j > i ? textoBruto.slice(i, j + 1) : null]) {
      if (!candidato) continue;
      try { return { atividade: JSON.parse(candidato), diagnosticos: [] }; } catch {}
    }
    return { diagnosticos: [erro('arquivo', 'JSON inválido: ' + e.message)] };
  }
}
