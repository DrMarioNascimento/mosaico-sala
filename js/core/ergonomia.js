/* Estado de autoria e relógio: funções puras, sem rede. */
export function criarHistorico(inicial, limite = 40) {
  let atual = JSON.stringify(inicial), passados = [], futuros = [];
  return {
    registrar(valor) { const novo = JSON.stringify(valor); if (novo === atual) return; passados.push(atual); if (passados.length > limite) passados.shift(); atual = novo; futuros = []; },
    desfazer() { if (!passados.length) return null; futuros.push(atual); atual = passados.pop(); return JSON.parse(atual); },
    refazer() { if (!futuros.length) return null; passados.push(atual); atual = futuros.pop(); return JSON.parse(atual); },
    get podeDesfazer() { return passados.length > 0; }, get podeRefazer() { return futuros.length > 0; }
  };
}
export function editarRelogio(info, acao, agora = Date.now()) {
  const novo = { ...info };
  if (acao === 'pausar' && !novo.pausadoEm) novo.pausadoEm = agora;
  if (acao === 'retomar' && novo.pausadoEm) { novo.inicio += agora - novo.pausadoEm; delete novo.pausadoEm; }
  if (typeof acao === 'number' && acao > 0) novo.tempoMin = (Number(novo.tempoMin) || 0) + acao;
  return novo;
}
export function recortarPrevia(atividade, etapaId) {
  const a = JSON.parse(JSON.stringify(atividade));
  if (!etapaId) return a;
  const alvo = a.etapas.find(e => e.id === etapaId);
  if (!alvo) throw new Error('Etapa não encontrada.');
  a.etapas = [alvo]; a.pecas = a.pecas.filter(p => p.etapaId === etapaId); a.conexoes = [];
  a.docente.respostas = a.docente.respostas?.[etapaId] ? { [etapaId]: a.docente.respostas[etapaId] } : {};
  a.meta = { ativa: false, descricao: '', etapas: [], limiar: .5 }; a.pendencias = [];
  if (alvo.typeId === 'comparar_hipoteses') {
    const id = 'ensaio-origem'; a.regime = 'simulacao';
    a.etapas.unshift({ id, ordem: alvo.ordem - 1, titulo: 'Contribuições simuladas para a prévia', typeId: 'investigacao_fragmentos', typeVersion: '1.0.0', tempoMin: 1, instrucao: 'Conteúdo fictício, apenas para experimentar a etapa seguinte.', participacao: { organizacao: 'grupos', envio: 'representante', competicao: 'desligada' }, config: { pergunta: 'Qual hipótese o grupo escolheu?', hipotesesCandidatas: JSON.parse(JSON.stringify(alvo.config.hipotesesCandidatas)), minEvidencias: 1, justificativa: 'opcional' } });
    a.pecas = a.grupos.map((g, i) => ({ id: 'ensaio-p' + i, etapaId: id, destinatarios: [g.id], origem: { natureza: 'sintetico' }, conteudo: 'Contribuição fictícia para testar a comparação. Revise as evidências reais antes da aula.' }));
    a.conexoes = [{ id: 'ensaio-conexao', de: { etapaId: id, portId: 'hipotese_grupo' }, para: { etapaId, portId: 'hipoteses_recebidas' }, agregacao: 'colecao_uma_por_grupo_planejado' }];
  }
  return a;
}
export function resumoAlteracoes(antes, depois) {
  return ['titulo','publico','duracaoMin','objetivos','introducao','etapas','pecas','fontes','docente','meta','grupos','conexoes','pendencias'].filter(k => JSON.stringify(antes?.[k]) !== JSON.stringify(depois?.[k]));
}
