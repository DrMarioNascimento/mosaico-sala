import { h } from './ui.js';
import { numeroPasso } from './percurso-docente.js';
import { etapasOrdenadas } from './core/motor.js';
export function painelRevisaoDocente(a, { editar, guardar, atualizar }) {
  const etapas=etapasOrdenadas(a), minutos=etapas.reduce((n,e)=>n+(Number(e.tempoMin)||0),0);
  const salvar=()=>{guardar();atualizar();};
  return h('div',{class:'cartao'},h('h2',{},numeroPasso(5),'Revisão do professor'),h('p',{},'Confira o que os alunos receberão e a justificativa de cada resposta. A validação da estrutura não verifica a correção científica do conteúdo.'),h('p',{class:'aviso'},minutos+' min de etapas para uma aula de '+(a.duracaoMin||'?')+' min. Reserve tempo para entrada, instruções e discussão.'),
    etapas.map(e=>h('details',{class:'revisao-item'},h('summary',{},e.titulo),e.instrucao!==e.titulo&&h('p',{},e.instrucao||'Sem instrução escrita.'),h('button',{class:'btn pequeno',onclick:()=>editar(e.id)},'Editar esta etapa'),h('h3',{},'Resposta esperada e justificativa'),respostaLegivel(e,a.docente.respostas?.[e.id]),
      a.pecas.filter(p=>p.etapaId===e.id).map(p=>{const f=a.fontes.find(f=>f.id===p.origem?.fonteId);return h('div',{class:'evidencia-revisao'},h('p',{},p.conteudo),h('small',{},({citacao:'Citação',parafrase:'Paráfrase',inferencia:'Inferência',sintetico:'Criação fictícia'})[p.origem?.natureza]||'Origem não informada',f?' · '+f.descricao+' · '+f.localizacao:' · confira a origem'),f?.trecho&&h('blockquote',{},f.trecho));}),
      h('label',{class:'opcao'},h('input',{type:'checkbox',checked:!!a.docente.revisoes?.[e.id],onchange:ev=>{a.docente.revisoes={...a.docente.revisoes,[e.id]:ev.target.checked};delete a.docente.revisadoEm;salvar();}}),h('span',{},'Conferi o conteúdo desta etapa')))),
    h('label',{class:'opcao'},h('input',{type:'checkbox',checked:!!a.docente.revisadoEm,onchange:ev=>{if(ev.target.checked)a.docente.revisadoEm=new Date().toISOString();else delete a.docente.revisadoEm;salvar();}}),h('span',{},'Revisei o conteúdo, as fontes e as respostas esperadas para esta turma')));
}

/** A solução de cada formato em linguagem de professor (nada de ids nem JSON). */
function respostaLegivel(e,r) {
  const c=e.config||{}, txt=id=>(c.cartoes||[]).find(x=>x.id===id)?.texto||id;
  const opcoes=c.alternativas||c.hipotesesCandidatas||[], certa=r&&opcoes.find(o=>o.id===r.corretaId);
  const partes=[];
  if(certa) partes.push(h('p',{},h('strong',{},'Resposta esperada: '),certa.texto));
  if(r?.perguntas) partes.push(h('ol',{},(c.perguntas||[]).map(q=>h('li',{},q.enunciado,h('p',{},'Resposta: '+(q.alternativas.find(o=>o.id===r.perguntas[q.id]?.corretaId)?.texto||'não marcada no editor')),r.perguntas[q.id]?.explicacao&&h('p',{},r.perguntas[q.id].explicacao)))));
  if(r?.ordem?.length) partes.push(h('p',{},h('strong',{},'Ordem esperada:')),h('ol',{},r.ordem.map(id=>h('li',{},txt(id)))));
  if(r?.colunaDe) partes.push(h('ul',{},(c.colunas||[]).map(col=>h('li',{},h('strong',{},col.titulo+': '),Object.keys(r.colunaDe).filter(k=>r.colunaDe[k]===col.id).map(txt).join(', ')||'nenhum cartão'))));
  if(r?.posicao) partes.push(Object.keys(r.posicao).length?h('ul',{},Object.entries(r.posicao).map(([id,n])=>h('li',{},`${txt(id)}: ${n} de 100`))):h('p',{},'Etapa só de debate: não há posição certa nem nota.'));
  if(r?.posicoes) partes.push(h('ul',{},(c.marcadores||[]).map(m=>h('li',{},`${m.rotulo}: marcado na imagem (${Math.round(r.posicoes[m.id]?.x??0)}% da largura, ${Math.round(r.posicoes[m.id]?.y??0)}% da altura)`))));
  if(c.pares?.length) partes.push(h('ul',{},c.pares.map(p=>h('li',{},`${p.a} ↔ ${p.b}`))));
  if(c.palavras?.length) partes.push(h('ul',{},c.palavras.map(p=>h('li',{},h('strong',{},p.palavra),' — '+p.dica))));
  if(c.elos?.length) partes.push(h('ol',{},[c.gatilho,...c.elos.map(x=>x.consequencia)].filter(Boolean).map(t=>h('li',{},t))),h('small',{class:'sutil'},'Os distratores de cada elo ficam no editor.'));
  if(c.cenarios?.length){const fim=Object.fromEntries(c.cenarios.map(x=>[x.id,x]));partes.push(h('ul',{},c.cenarios.filter(x=>!x.final).flatMap(x=>x.opcoes.map(o=>h('li',{},o.texto+' → '+({bom:'final bom',ruim:'final ruim',neutro:'final neutro'}[fim[o.destino]?.desfecho]||'continua'))))));}
  if(c.termos?.length) partes.push(h('p',{},`Banco de ${c.termos.length} termos: `+c.termos.map(t=>t.termo).join(', ')+'.'));
  if(e.typeId==='montagem_pecas') partes.push(h('p',{},c.modo==='texto'&&c.texto?'Ordem certa: '+c.texto.split('|').map(s=>s.trim()).join(' → '):'A ordem certa é a da imagem original.'));
  if(r?.explicacao) partes.push(h('p',{},r.explicacao));
  if(!partes.length) partes.push(h('p',{class:'sutil'},e.typeId==='investigacao_fragmentos'?'Sem gabarito nesta etapa: cada grupo escolhe a hipótese que as próprias peças sustentam, e as escolhas diferentes alimentam a comparação.':e.typeId==='analise_imagem'?'Resposta aberta: o que cada grupo observa vai para o telão, sem gabarito.':'Esta etapa não tem resposta esperada registrada. Confira o critério no editor.'));
  return h('div',{class:'resposta-docente'},partes);
}
