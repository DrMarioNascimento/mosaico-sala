import { h } from './ui.js';
import { etapasOrdenadas } from './core/motor.js';
export function painelRevisaoDocente(a, { editar, guardar, atualizar }) {
  const etapas=etapasOrdenadas(a), minutos=etapas.reduce((n,e)=>n+(Number(e.tempoMin)||0),0);
  const salvar=()=>{guardar();atualizar();};
  return h('div',{class:'cartao'},h('h2',{},'Revisão do professor'),h('p',{},'Confira o que os alunos receberão e a justificativa de cada resposta. A validação da estrutura não verifica a correção científica do conteúdo.'),h('p',{class:'aviso'},minutos+' min de etapas para uma aula de '+(a.duracaoMin||'?')+' min. Reserve tempo para entrada, instruções e discussão.'),
    etapas.map(e=>h('details',{class:'revisao-item'},h('summary',{},e.titulo),h('p',{},e.instrucao||'Sem instrução escrita.'),h('button',{class:'btn pequeno',onclick:()=>editar(e.id)},'Editar esta etapa'),h('h3',{},'Resposta esperada e justificativa'),respostaLegivel(e,a.docente.respostas?.[e.id]),
      a.pecas.filter(p=>p.etapaId===e.id).map(p=>{const f=a.fontes.find(f=>f.id===p.origem?.fonteId);return h('div',{class:'evidencia-revisao'},h('p',{},p.conteudo),h('small',{},({citacao:'Citação',parafrase:'Paráfrase',inferencia:'Inferência',sintetico:'Criação fictícia'})[p.origem?.natureza]||'Origem não informada',f?' · '+f.descricao+' · '+f.localizacao:' · confira a origem'),f?.trecho&&h('blockquote',{},f.trecho));}),
      h('label',{class:'opcao'},h('input',{type:'checkbox',checked:!!a.docente.revisoes?.[e.id],onchange:ev=>{a.docente.revisoes={...a.docente.revisoes,[e.id]:ev.target.checked};delete a.docente.revisadoEm;salvar();}}),h('span',{},'Conferi o conteúdo desta etapa')))),
    h('label',{class:'opcao'},h('input',{type:'checkbox',checked:!!a.docente.revisadoEm,onchange:ev=>{if(ev.target.checked)a.docente.revisadoEm=new Date().toISOString();else delete a.docente.revisadoEm;salvar();}}),h('span',{},'Revisei o conteúdo, as fontes e as respostas esperadas para esta turma')));
}

function respostaLegivel(e,r) {
  if(!r) return h('p',{class:'sutil'},'Esta etapa não tem resposta esperada registrada. Confira o critério e o formato no editor.');
  const opcoes=e.config.alternativas||e.config.hipotesesCandidatas||[];
  const certa=opcoes.find(o=>o.id===r.corretaId);
  return h('div',{class:'resposta-docente'},certa&&h('p',{},h('strong',{},'Resposta esperada: '),certa.texto),r.explicacao&&h('p',{},r.explicacao),r.perguntas&&h('ol',{},(e.config.perguntas||[]).map(q=>h('li',{},q.enunciado,h('p',{},'Resposta: '+(q.alternativas.find(o=>o.id===r.perguntas[q.id]?.corretaId)?.texto||'Confira no editor')),r.perguntas[q.id]?.explicacao&&h('p',{},r.perguntas[q.id].explicacao)))),!certa&&!r.perguntas&&h('p',{},'Confira a solução e os critérios específicos no editor desta etapa.'),h('details',{},h('summary',{},'Detalhes da solução'),h('pre',{class:'resposta-docente'},JSON.stringify(r,null,2))));
}
