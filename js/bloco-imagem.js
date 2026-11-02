import { h } from './ui.js';
import { svgPeca } from './quebra-cabeca.js';
import { moverFragmento, blocoCompleto, restaurarPosicoes } from './core/bloco-imagem.js';

/** Montagem por toque/teclado ou arraste. Nenhuma imagem global é mostrada. */
export function jogoBlocoImagem(pk, { chave, armazenamento, cor = '#ff8a3d' }) {
  const local=pk.montagemLocal, raiz=h('section',{class:'bloco-local','aria-label':'Montar meu bloco de imagem'});
  const key='mosaico-bloco:'+chave+':'+pk.blocoId;
  let guardado=null;try{guardado=JSON.parse(armazenamento.getItem(key)||'null');}catch{}
  let posicoes=restaurarPosicoes(local.ordem,guardado), escolhido=null, aviso='', ampliado=blocoCompleto(local.ordem,posicoes);
  const porId=new Map(local.fragmentos.map(f=>[f.id,f]));
  const salvar=()=>{try{armazenamento.setItem(key,JSON.stringify(posicoes));}catch{}};
  const colocar=(id,pos)=>{if(!porId.has(id))return;posicoes=moverFragmento(posicoes,id,pos);escolhido=null;aviso='';salvar();if(blocoCompleto(local.ordem,posicoes))ampliado=true;desenhar();raiz.querySelector(ampliado?'.bloco-comandos button':'.bloco-slot')?.focus();};
  const selecionar=id=>{escolhido=id;aviso='Agora toque em um espaço do quadro.';desenhar();raiz.querySelector('.bloco-slot')?.focus();};
  function fragmento(id) {const f=porId.get(id);return f?h('img',{src:f.src,alt:'Fragmento do seu bloco',draggable:'false'}):null;}
  function ligarArraste(botao,id) {
    botao.addEventListener('pointerdown',ev=>{
      if(ev.button!==0 || ampliado)return;
      const x=ev.clientX,y=ev.clientY;let moveu=false;
      try{botao.setPointerCapture(ev.pointerId);}catch{}
      const mover=e=>{const dx=e.clientX-x,dy=e.clientY-y;if(Math.hypot(dx,dy)>8)moveu=true;if(moveu){botao.classList.add('bloco-arrastando');botao.style.transform=`translate(${dx}px,${dy}px)`;}};
      const limpar=()=>{botao.removeEventListener('pointermove',mover);botao.removeEventListener('pointerup',soltar);botao.removeEventListener('pointercancel',cancelar);botao.classList.remove('bloco-arrastando');botao.style.transform='';};
      const cancelar=()=>{limpar();};
      const soltar=e=>{limpar();if(!moveu)return;botao.style.pointerEvents='none';const alvo=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-bloco-pos]');botao.style.pointerEvents='';if(alvo&&raiz.contains(alvo))colocar(id,Number(alvo.dataset.blocoPos));else{escolhido=id;aviso='Toque em um espaço do quadro para colocar a peça.';desenhar();}};
      botao.addEventListener('pointermove',mover);botao.addEventListener('pointerup',soltar);botao.addEventListener('pointercancel',cancelar);
    });
  }
  function desenhar() {
    raiz.replaceChildren();
    if(blocoCompleto(local.ordem,posicoes)) {
      const quadro=h('div',{class:ampliado?'bloco-reunir':'bloco-pronto'},
        h('div',{class:'bloco-comandos'},h('button',{class:'btn pequeno',onclick:()=>{ampliado=!ampliado;desenhar();}},ampliado?'Voltar à etapa':'Ampliar meu bloco')),
        h('p',{class:'bloco-recado'},'Bloco montado! Reúna seu celular aos dos colegas para descobrir a imagem completa.'),
        h('div',{class:'bloco-imagem-pronta'},svgPeca(pk.pecas[0],{cor})));
      raiz.append(quadro);return;
    }
    const quadro=h('div',{class:'bloco-quadro',style:{gridTemplateColumns:`repeat(${local.colunas},minmax(0,1fr))`,aspectRatio:String(1/local.aspecto)},'aria-label':'Espaços para montar seu bloco'});
    posicoes.forEach((id,i)=>{
      const botao=h('button',{type:'button',class:'bloco-slot'+(id===escolhido?' escolhido':''),'data-bloco-pos':i,'aria-label':`Espaço ${i+1}${id?', com peça':', vazio'}`,'aria-pressed':String(!!id&&id===escolhido),onclick:()=>{if(escolhido)colocar(escolhido,i);else if(id)selecionar(id);}},id?fragmento(id):h('span',{},'+'));
      if(id)ligarArraste(botao,id);quadro.append(botao);
    });
    const bandeja=h('div',{class:'bloco-bandeja','aria-label':'Peças disponíveis'});
    local.fragmentos.forEach((f,i)=>{if(posicoes.includes(f.id))return;const botao=h('button',{type:'button',class:'bloco-fragmento'+(escolhido===f.id?' escolhido':''),'aria-label':`Selecionar peça ${i+1}`,'aria-pressed':String(escolhido===f.id),onclick:()=>selecionar(f.id)},fragmento(f.id));ligarArraste(botao,f.id);bandeja.append(botao);});
    raiz.append(h('h3',{},'1 · Monte seu bloco'),h('p',{},`Você recebeu ${local.fragmentos.length} peças. Arraste para os espaços ou toque na peça e depois no espaço. Você também pode trocar peças de lugar.`),quadro,bandeja,
      h('p',{role:'status','aria-live':'polite',class:'aviso'},aviso||'Depois de montar, confira o bloco para reuni-lo aos dos colegas.'),
      h('div',{class:'linha-botoes'},h('button',{class:'btn primario',onclick:()=>{if(posicoes.some(id=>!id))aviso='Coloque todas as peças no quadro antes de conferir.';else if(blocoCompleto(local.ordem,posicoes)){ampliado=true;salvar();}else aviso='Ainda há peças fora de posição. Compare as bordas da imagem e tente novamente.';desenhar();}},'Conferir meu bloco'),
      h('button',{class:'btn',onclick:()=>{posicoes=local.ordem.map(()=>null);escolhido=null;aviso='';salvar();desenhar();}},'Recomeçar meu bloco')));
  }
  desenhar();return raiz;
}
