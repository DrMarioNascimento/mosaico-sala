/* MOSAICO · Catálogo de tipos de atividade (ActivityType)
   Especificação v2, seção 12.

   Primeiro corte: três tipos, que juntos formam um mosaico completo
   (fracionar → investigar em grupo → cooperar entre grupos → transferir).

   Cada tipo declara: configuração, portas de entrada e saída, capacidades
   de participação, políticas de conclusão/avaliação/contingência e uma
   função de validação. Componentes de tela são do código da plataforma
   (js/telas/...), nunca indicados pelo arquivo importado. */

const texto = (v, max = 2000) => typeof v === 'string' && v.trim().length > 0 && v.length <= max;

export const TIPOS = {
  investigacao_fragmentos: {
    typeId: 'investigacao_fragmentos',
    typeVersion: '1.0.0',
    nome: 'Investigação por fragmentos',
    descricao: 'Cada grupo recebe parte das evidências, analisa e escolhe a hipótese que suas peças sustentam, indicando quais evidências usou.',
    configuracao: {
      pergunta: 'texto obrigatório: o que o grupo precisa decidir',
      hipotesesCandidatas: 'lista obrigatória (2 a 6) de {id, texto}',
      minEvidencias: 'inteiro opcional (padrão 1): quantas peças o grupo precisa indicar',
      justificativa: "'nenhuma' | 'opcional' | 'obrigatoria' (padrão 'opcional')"
    },
    acceptedInputs: [],
    producedOutputs: [{
      portId: 'hipotese_grupo', escopo: 'grupo', cardinalidade: 'uma_por_grupo',
      dados: '{hipoteseId, evidencias:[pecaId], justificativa?}', disponivelQuando: 'envio_confirmado'
    }],
    participacao: { organizacao: ['grupos', 'individual'], envio: ['representante', 'individual'], competicao: ['desligada', 'meta', 'entre_grupos'] },
    completionPolicy: 'envio_confirmado',
    assessmentPolicy: 'nao_avaliada',            // hipótese inicial é material de trabalho, não nota
    contingencyPolicy: ['aguardar', 'executor_adicional', 'execucao_docente'],
    usaPecas: true,
    validar(etapa, ctx) {
      const d = [], c = etapa.config || {};
      if (!texto(c.pergunta, 500)) d.push(erro('config.pergunta', 'A etapa precisa de uma pergunta para o grupo.'));
      const hs = c.hipotesesCandidatas;
      if (!Array.isArray(hs) || hs.length < 2 || hs.length > 6) d.push(erro('config.hipotesesCandidatas', 'Informe de 2 a 6 hipóteses candidatas.'));
      else {
        const ids = hs.map(h => h.id);
        if (new Set(ids).size !== ids.length) d.push(erro('config.hipotesesCandidatas', 'IDs de hipótese repetidos.'));
        hs.forEach((h, i) => { if (!texto(h.texto, 300)) d.push(erro(`config.hipotesesCandidatas[${i}]`, 'Hipótese sem texto.')); });
      }
      const pecas = ctx.atividade.pecas.filter(p => p.etapaId === etapa.id);
      if (!pecas.length) d.push(erro('pecas', 'Nenhuma peça destinada a esta etapa.'));
      for (const g of ctx.atividade.grupos) {
        if (etapa.participacao?.organizacao === 'grupos' && !pecas.some(p => p.destinatarios.includes(g.id)))
          d.push(aviso('pecas', `O grupo "${g.nome}" não recebe nenhuma peça nesta etapa.`));
      }
      const min = c.minEvidencias ?? 1;
      if (!Number.isInteger(min) || min < 0) d.push(erro('config.minEvidencias', 'minEvidencias deve ser inteiro ≥ 0.'));
      return d;
    }
  },

  comparar_hipoteses: {
    typeId: 'comparar_hipoteses',
    typeVersion: '1.0.0',
    nome: 'Comparação de hipóteses entre grupos',
    descricao: 'Cada grupo vê as hipóteses e as evidências escolhidas pelos outros grupos e decide qual explicação integra melhor o conjunto.',
    configuracao: {
      pergunta: 'texto obrigatório',
      hipotesesCandidatas: 'lista obrigatória (2 a 6) de {id, texto}',
      aceitaParcial: 'booleano (padrão false): permite iniciar sem a hipótese de todos os grupos',
      justificativa: "'nenhuma' | 'opcional' | 'obrigatoria' (padrão 'obrigatoria')"
    },
    acceptedInputs: [{
      portId: 'hipoteses_recebidas', escopo: 'grupo', cardinalidade: 'uma_por_grupo_planejado',
      aceita: ['investigacao_fragmentos.hipotese_grupo'], obrigatoria: true,
      disponivelQuando: 'envio_confirmado_e_liberacao_docente'
    }],
    producedOutputs: [{
      portId: 'decisao_grupo', escopo: 'grupo', cardinalidade: 'uma_por_grupo',
      dados: '{hipoteseId, justificativa?}', disponivelQuando: 'envio_confirmado'
    }],
    participacao: { organizacao: ['grupos'], envio: ['representante'], competicao: ['desligada', 'meta', 'entre_grupos'] },
    completionPolicy: 'envio_confirmado',
    assessmentPolicy: 'gabarito_docente',
    contingencyPolicy: ['aguardar', 'executor_adicional', 'execucao_docente', 'aceitar_parcial_registrado'],
    usaPecas: false,
    validar(etapa) {
      const d = [], c = etapa.config || {};
      if (!texto(c.pergunta, 500)) d.push(erro('config.pergunta', 'A etapa precisa de uma pergunta.'));
      const hs = c.hipotesesCandidatas;
      if (!Array.isArray(hs) || hs.length < 2 || hs.length > 6) d.push(erro('config.hipotesesCandidatas', 'Informe de 2 a 6 hipóteses candidatas.'));
      if (etapa.participacao?.organizacao !== 'grupos') d.push(erro('participacao.organizacao', 'Comparação entre grupos exige organização em grupos.'));
      return d;
    }
  },

  montagem_pecas: {
    typeId: 'montagem_pecas',
    typeVersion: '1.0.0',
    nome: 'Montagem em peças',
    descricao: 'Cada celular mostra uma peça (trecho de texto, conta ou recorte de imagem) em formato de quebra-cabeça. Só pondo os celulares na ordem certa dá para entender o todo. Não há envio: vale o tempo da etapa, e a etapa seguinte cobra o que foi visto.',
    configuracao: {
      modo: "'texto' (texto ou conta) | 'imagem'",
      texto: 'no modo texto: o texto completo, com os cortes marcados por | ou por − entre espaços',
      imagem: 'no modo imagem: {dados: data URL (webp/png/jpeg, leve), largura, altura}',
      corte: "no modo imagem: {tipo: 'colunas'|'linhas'|'grade', n: quantidade de peças, colunas?: para grade}",
      quantidade: "'fixa' (as peças definidas) | 'celulares' (uma por celular presente)",
      ocultarAoFim: 'booleano (padrão true): as peças somem quando o tempo acaba',
      revelarAoEncerrar: 'booleano (padrão false): ao encerrar a etapa, o telão mostra o todo montado'
    },
    acceptedInputs: [],
    producedOutputs: [],
    participacao: { organizacao: ['grupos', 'representantes'], envio: ['nenhum'], competicao: ['desligada', 'meta', 'entre_grupos'] },
    completionPolicy: 'tempo',
    assessmentPolicy: 'nao_avaliada',
    contingencyPolicy: ['aguardar'],
    usaPecas: false,
    validar(etapa) {
      const d = [], c = etapa.config || {};
      if (!['texto', 'imagem'].includes(c.modo)) d.push(erro('config.modo', "Escolha o modo: 'texto' ou 'imagem'."));
      if (c.modo === 'texto') {
        const n = String(c.texto || '').split(/\r?\n/).flatMap(l => l.split(/\s*\|\s*|\s+[−–]\s+/)).map(s => s.trim()).filter(Boolean).length;
        if (n < 2) d.push(erro('config.texto', 'Marque ao menos um corte no texto (use | ou − entre espaços).'));
        if (n > 30) d.push(aviso('config.texto', `São ${n} peças; acima de 20 fica difícil de montar.`));
      }
      if (c.modo === 'imagem') {
        if (!c.imagem?.dados || !/^data:image\/(webp|png|jpe?g);base64,/.test(c.imagem.dados)) d.push(erro('config.imagem', 'Envie a imagem que será cortada.'));
        else if (c.imagem.dados.length > 950000) d.push(erro('config.imagem', 'Imagem pesada demais. Envie de novo para ser reduzida.'));
        if (!['colunas', 'linhas', 'grade'].includes(c.corte?.tipo)) d.push(erro('config.corte', 'Escolha como cortar a imagem.'));
        if (c.quantidade !== 'celulares' && !(Number.isInteger(c.corte?.n) && c.corte.n >= 2 && c.corte.n <= 20)) d.push(erro('config.corte', 'A imagem precisa de 2 a 20 peças.'));
      }
      if (!['fixa', 'celulares'].includes(c.quantidade || 'fixa')) d.push(erro('config.quantidade', "Quantidade deve ser 'fixa' ou 'celulares'."));
      if (!etapa.tempoMin) d.push(aviso('tempoMin', 'A montagem vale pelo tempo: defina o tempo da etapa.'));
      return d;
    }
  },

  cadeado_grupo: {
    typeId: 'cadeado_grupo',
    typeVersion: '1.0.0',
    nome: 'Cadeado do grupo',
    descricao: 'Escape room: cada aluno responde a própria pergunta no celular. O grupo destrava quando X membros acertam, ou quando junta os pedaços revelados pelos acertos (um número, um termo, uma palavra) e o líder digita o código.',
    configuracao: {
      regra: "'acertos' (destrava com X acertos) | 'fragmentos' (cada acerto revela um pedaço; o líder digita o código)",
      perguntas: 'lista (1 a 60) de {id, enunciado, alternativas: [{id, texto}] (2 a 5)}; a correta fica em docente.respostas[etapa].perguntas[id].corretaId',
      distribuicao: "'diferente' (cada aluno recebe uma pergunta diferente) | 'mesma' (todos do grupo recebem a mesma)",
      minAcertos: "regra 'acertos': quantos membros precisam acertar (0 = todos)",
      fragmentos: "regra 'fragmentos': lista dos pedaços, em ordem (2 a 20); o código esperado fica em docente.respostas[etapa].codigo",
      espera: 'segundos de espera para tentar de novo depois de errar (padrão 30; 0 = sem espera)',
      mensagem: 'texto opcional que aparece para o grupo quando o cadeado abre'
    },
    acceptedInputs: [],
    producedOutputs: [],
    participacao: { organizacao: ['grupos'], envio: ['individual'], competicao: ['desligada', 'meta', 'entre_grupos'] },
    completionPolicy: 'destravar',
    assessmentPolicy: 'gabarito_docente',
    contingencyPolicy: ['aguardar'],
    usaPecas: false,
    validar(etapa) {
      const d = [], c = etapa.config || {};
      if (!['acertos', 'fragmentos'].includes(c.regra)) d.push(erro('config.regra', "Escolha a regra: 'acertos' ou 'fragmentos'."));
      d.push(...validarPerguntas(c.perguntas));
      if (!['diferente', 'mesma'].includes(c.distribuicao || 'diferente')) d.push(erro('config.distribuicao', "Distribuição deve ser 'diferente' ou 'mesma'."));
      if (c.regra === 'acertos' && !(Number.isInteger(c.minAcertos ?? 0) && (c.minAcertos ?? 0) >= 0 && (c.minAcertos ?? 0) <= 30)) d.push(erro('config.minAcertos', 'Acertos necessários: inteiro de 0 (todos) a 30.'));
      if (c.regra === 'fragmentos') {
        const f = c.fragmentos;
        if (!Array.isArray(f) || f.length < 2 || f.length > 20 || f.some(x => !texto(x, 200))) d.push(erro('config.fragmentos', 'Informe de 2 a 20 pedaços do código.'));
        if ((c.distribuicao || 'diferente') === 'diferente' && Array.isArray(f) && Array.isArray(c.perguntas) && c.perguntas.length < f.length)
          d.push(aviso('config.perguntas', `São ${f.length} pedaços e ${c.perguntas.length} pergunta(s): algumas perguntas vão se repetir no grupo.`));
      }
      const esp = c.espera ?? 30;
      if (!(Number.isFinite(esp) && esp >= 0 && esp <= 600)) d.push(erro('config.espera', 'Espera deve ficar entre 0 e 600 segundos.'));
      if (c.mensagem !== undefined && c.mensagem !== '' && !texto(c.mensagem, 1000)) d.push(erro('config.mensagem', 'Mensagem longa demais.'));
      if (etapa.participacao?.organizacao !== 'grupos') d.push(erro('participacao.organizacao', 'O cadeado é sempre em grupos.'));
      return d;
    },
    validarRespostas(etapa, r) {
      const d = [], c = etapa.config || {};
      for (const p of c.perguntas || []) {
        const certa = r?.perguntas?.[p.id]?.corretaId;
        if (!(p.alternativas || []).some(a => a.id === certa)) d.push(erro(`docente.respostas.${etapa.id}.perguntas.${p.id}`, `Marque a alternativa correta da pergunta "${String(p.enunciado || p.id).slice(0, 40)}".`));
      }
      if (c.regra === 'fragmentos' && !texto(String(r?.codigo ?? ''), 200)) d.push(erro(`docente.respostas.${etapa.id}.codigo`, `Informe o código que abre o cadeado de "${etapa.titulo}".`));
      return d;
    }
  },

  quiz_grupos: {
    typeId: 'quiz_grupos',
    typeVersion: '1.0.0',
    nome: 'Quiz entre grupos',
    descricao: 'A cada pergunta o sistema sorteia o grupo da vez (sem repetir até todos jogarem). A pergunta aparece só no celular do líder desse grupo; o telão mostra de quem é a vez e o placar. Se errar, a pergunta passa para outro grupo sorteado ou a resposta é revelada.',
    configuracao: {
      perguntas: 'lista (1 a 60) de {id, enunciado, alternativas: [{id, texto}] (2 a 5)}; a correta fica em docente.respostas[etapa].perguntas[id].corretaId',
      aoErrar: "'repassar' (vai para outro grupo sorteado, uma vez) | 'revelar' (mostra a resposta e segue)",
      segundos: 'tempo para responder cada pergunta (10 a 600; padrão 60)',
      mostrarNoTelao: 'booleano (padrão false): o telão mostra a pergunta junto (sem a resposta)',
      mostrarResposta: 'booleano (padrão true): depois de cada pergunta, o telão mostra a resposta e a explicação'
    },
    acceptedInputs: [],
    producedOutputs: [],
    participacao: { organizacao: ['grupos'], envio: ['representante'], competicao: ['entre_grupos', 'meta', 'desligada'] },
    completionPolicy: 'rodadas',
    assessmentPolicy: 'gabarito_docente',
    contingencyPolicy: ['aguardar', 'executor_adicional'],
    usaPecas: false,
    validar(etapa) {
      const d = [], c = etapa.config || {};
      d.push(...validarPerguntas(c.perguntas));
      if (!['repassar', 'revelar'].includes(c.aoErrar || 'repassar')) d.push(erro('config.aoErrar', "Ao errar: 'repassar' ou 'revelar'."));
      const s = c.segundos ?? 60;
      if (!(Number.isFinite(s) && s >= 10 && s <= 600)) d.push(erro('config.segundos', 'Tempo por pergunta entre 10 e 600 segundos.'));
      if (etapa.participacao?.organizacao !== 'grupos') d.push(erro('participacao.organizacao', 'O quiz entre grupos é sempre em grupos.'));
      return d;
    },
    validarRespostas(etapa, r) {
      const d = [];
      for (const p of etapa.config?.perguntas || []) {
        const certa = r?.perguntas?.[p.id]?.corretaId;
        if (!(p.alternativas || []).some(a => a.id === certa)) d.push(erro(`docente.respostas.${etapa.id}.perguntas.${p.id}`, `Marque a alternativa correta da pergunta "${String(p.enunciado || p.id).slice(0, 40)}".`));
      }
      return d;
    }
  },

  questao_individual: {
    typeId: 'questao_individual',
    typeVersion: '1.0.0',
    nome: 'Questão individual',
    descricao: 'Cada participante responde uma questão de múltipla escolha, por exemplo de transferência do que foi integrado.',
    configuracao: {
      enunciado: 'texto obrigatório',
      alternativas: 'lista obrigatória (2 a 5) de {id, texto}'
    },
    acceptedInputs: [],
    producedOutputs: [{
      portId: 'resposta_individual', escopo: 'participante', cardinalidade: 'uma_por_participante',
      dados: '{alternativaId}', disponivelQuando: 'envio_confirmado'
    }],
    participacao: { organizacao: ['individual'], envio: ['individual'], competicao: ['desligada', 'meta', 'entre_grupos'] },
    completionPolicy: 'envio_confirmado',
    assessmentPolicy: 'gabarito_docente',
    contingencyPolicy: ['aguardar'],
    usaPecas: false,
    validar(etapa) {
      const d = [], c = etapa.config || {};
      if (!texto(c.enunciado, 1000)) d.push(erro('config.enunciado', 'Questão sem enunciado.'));
      const as = c.alternativas;
      if (!Array.isArray(as) || as.length < 2 || as.length > 5) d.push(erro('config.alternativas', 'Informe de 2 a 5 alternativas.'));
      else if (new Set(as.map(a => a.id)).size !== as.length) d.push(erro('config.alternativas', 'IDs de alternativa repetidos.'));
      if (etapa.participacao?.organizacao !== 'individual') d.push(erro('participacao.organizacao', 'Questão individual exige organização individual.'));
      return d;
    }
  }
};

/** Lista de perguntas de múltipla escolha (cadeado e quiz). */
function validarPerguntas(ps) {
  const d = [];
  if (!Array.isArray(ps) || ps.length < 1 || ps.length > 60) return [erro('config.perguntas', 'Informe de 1 a 60 perguntas.')];
  const ids = ps.map(p => p.id);
  if (new Set(ids).size !== ids.length || ids.some(x => !/^[a-z0-9][a-z0-9_-]{0,31}$/.test(String(x)))) d.push(erro('config.perguntas', 'IDs de pergunta ausentes ou repetidos.'));
  ps.forEach((p, i) => {
    if (!texto(p.enunciado, 1000)) d.push(erro(`config.perguntas[${i}]`, `Pergunta ${i + 1} sem enunciado.`));
    const as = p.alternativas;
    if (!Array.isArray(as) || as.length < 2 || as.length > 5) d.push(erro(`config.perguntas[${i}]`, `Pergunta ${i + 1}: informe de 2 a 5 alternativas.`));
    else {
      if (new Set(as.map(a => a.id)).size !== as.length) d.push(erro(`config.perguntas[${i}]`, `Pergunta ${i + 1}: IDs de alternativa repetidos.`));
      if (as.some(a => !texto(a.texto, 300))) d.push(erro(`config.perguntas[${i}]`, `Pergunta ${i + 1}: alternativa sem texto.`));
    }
  });
  return d;
}

export function erro(local, mensagem) { return { severidade: 'erro', local, mensagem }; }
export function aviso(local, mensagem) { return { severidade: 'aviso', local, mensagem }; }
export function info(local, mensagem) { return { severidade: 'info', local, mensagem }; }

export function obterTipo(typeId, typeVersion) {
  const t = TIPOS[typeId];
  return t && t.typeVersion === typeVersion ? t : null;
}

/** Resumo do catálogo para anexar ao prompt de importação (sem funções). */
export function catalogoParaPrompt() {
  return Object.values(TIPOS).map(t => ({
    typeId: t.typeId, typeVersion: t.typeVersion, nome: t.nome, descricao: t.descricao,
    configuracao: t.configuracao, acceptedInputs: t.acceptedInputs, producedOutputs: t.producedOutputs,
    participacao: t.participacao, completionPolicy: t.completionPolicy, assessmentPolicy: t.assessmentPolicy,
    contingencyPolicy: t.contingencyPolicy
  }));
}

/** Uma saída é compatível com uma entrada se a entrada a declara em `aceita`. */
export function portasCompativeis(tipoProdutor, portaSaida, tipoConsumidor, portaEntrada) {
  const entrada = tipoConsumidor.acceptedInputs.find(p => p.portId === portaEntrada);
  const saida = tipoProdutor.producedOutputs.find(p => p.portId === portaSaida);
  if (!entrada || !saida) return false;
  return (entrada.aceita || []).includes(`${tipoProdutor.typeId}.${portaSaida}`);
}
