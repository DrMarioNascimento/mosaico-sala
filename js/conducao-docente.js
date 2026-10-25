import { h } from './ui.js';
import { editarRelogio } from './core/ergonomia.js';
const ROTEIROS = {
  investigacao_fragmentos:'Oriente os grupos a usar apenas as evidências recebidas e justificar a hipótese. A integração das informações acontece na etapa seguinte.',
  comparar_hipoteses:'Peça que comparem as conclusões dos grupos e indiquem qual evidência mudou ou fortaleceu sua interpretação.',
  questao_individual:'Peça que cada participante responda sozinho. Depois, discuta a justificativa da resposta com a turma.',
  montagem_pecas:'Explique como juntar as peças. Observe se todos participam e reserve um momento para interpretar o conjunto.',
  cartoes_arrastar:'Explique o critério de organização e peça que o grupo justifique a posição dos cartões antes de confirmar.',
  quiz_grupos:'Confirme quem representa cada grupo e explique a regra de repasse antes da primeira pergunta.',
  cadeado_grupo:'Oriente cada participante a resolver sua parte. O grupo precisa reunir as contribuições para destravar.',
  pares:'Peça que expliquem a relação entre os conteúdos, além de encontrar os pares.',
  corrida:'Explique como o desempenho contribui para o grupo e combine o uso dos recursos opcionais.',
  cruzadas:'Oriente o compartilhamento das dicas e a justificativa dos termos usados.',
  sequencia:'Faça uma rodada de demonstração e explique que o resultado desta mecânica representa o desempenho no jogo.',
  quiz_pensar:'Explique quando a resposta é individual e quando é discutida pelo grupo. Reserve tempo para justificar as decisões.',
  analise_imagem:'Apresente a tarefa de observação e os critérios de resposta antes de liberar a interação.',
  escala_padronizada:'Explique a finalidade de reflexão e preserve a privacidade das respostas individuais.',
  jogo_economico:'Explique as regras e o caráter simulado das decisões. Discuta os resultados sem julgar individualmente os participantes.'
};
const RELOGIO_SUGERIDO = ['investigacao_fragmentos','comparar_hipoteses','questao_individual','montagem_pecas'];
export function melhorarConducao({ alvo, atividade, sala, atualizarSala, encerrarSala, baixarRelatorio, relatorioBaixado, falha }) {
  if(!sala) return;
  const seq=[...atividade.etapas].sort((a,b)=>a.ordem-b.ordem), e=seq.find(e=>e.id===sala.etapaAtual);
  if(e && sala.fase==='etapa') {
    const card=alvo.querySelector('.cartao.destaque');
    if(card){
      const guia=h('details',{class:'roteiro-docente'},h('summary',{},'Roteiro do professor · etapa '+(seq.indexOf(e)+1)+' de '+seq.length),h('p',{},atividade.docente?.roteiro?.[e.id]||ROTEIROS[e.typeId]||e.instrucao),h('p',{class:'sutil'},'Instrução apresentada aos participantes: '+(e.instrucao||'Confira a tarefa nos celulares.')));
      card.insertBefore(guia,card.children[1]||null);
      if(RELOGIO_SUGERIDO.includes(e.typeId)) {
        const atualizar=acao=>atualizarSala({etapaInfo:editarRelogio(sala.etapaInfo,acao)}).catch(falha);
        card.insertBefore(h('div',{class:'linha-botoes controles-tempo'},h('button',{class:'btn pequeno',onclick:()=>atualizar(sala.etapaInfo?.pausadoEm?'retomar':'pausar')},sala.etapaInfo?.pausadoEm?'Retomar cronômetro':'Pausar cronômetro'),h('button',{class:'btn pequeno',onclick:()=>atualizar(1)},'+1 min'),h('button',{class:'btn pequeno',onclick:()=>atualizar(5)},'+5 min'),h('small',{},'Controla o tempo sugerido da etapa; as respostas continuam liberadas.')),card.children[2]||null);
      }
      const btn=[...card.querySelectorAll('button')].find(b=>b.textContent==='Encerrar etapa');
      if(btn){const barra=h('div',{class:'barra-etapa'},h('small',{},'Etapa '+(seq.indexOf(e)+1)+' de '+seq.length+' · '+e.titulo),btn);card.append(barra);document.body.classList.add('com-barra-etapa');}
    }
  } else document.body.classList.remove('com-barra-etapa');
  if(sala.fase==='final') {
    const final=alvo.querySelector('.cartao.destaque');
    if(final) { const botaoRelatorio=[...final.querySelectorAll('button')].find(b=>b.textContent==='Baixar relatório da aula (planilha)'); final.querySelectorAll('p.sutil').forEach(p=>p.remove()); final.append(h('div',{class:'fechar-aula'},h('h3',{},'Concluir a aula'),h('p',{},'1 · Discuta o resultado e as justificativas. 2 · Baixe o relatório. 3 · Encerre a sala para apagar os dados da sessão.'),botaoRelatorio || h('button',{class:'btn',onclick:baixarRelatorio},'Baixar relatório da aula (planilha)'),h('button',{class:'btn perigo',onclick:()=>{
      const d=h('dialog',{class:'explica'},h('h2',{},'Encerrar e apagar esta sala?'),h('p',{},relatorioBaixado?'O relatório foi solicitado neste aparelho. Confirme que o arquivo foi salvo antes de apagar a sessão.':'O relatório ainda não foi solicitado neste aparelho. Ao encerrar, os resultados serão apagados.'),h('button',{class:'btn',onclick:()=>baixarRelatorio()},'Baixar relatório'),h('button',{class:'btn perigo',onclick:async()=>{d.close();d.remove();await encerrarSala();}},'Encerrar e apagar dados da sala'),h('button',{class:'btn',onclick:()=>{d.close();d.remove();}},'Continuar a discussão'));document.body.append(d);d.showModal();
    }},'Encerrar sala'))); }
  }
}
export function indicarConexao(alvo) {
  const atualizar=()=>{alvo.textContent=!navigator.onLine?'Sem internet · aguardando reconexão':document.hidden?'Condução em segundo plano':'Conexão disponível · mantenha a condução aberta';alvo.dataset.tipo=navigator.onLine?'ok':'alerta';};
  addEventListener('online',atualizar);addEventListener('offline',atualizar);document.addEventListener('visibilitychange',atualizar);atualizar();
}
