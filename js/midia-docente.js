import { h } from './ui.js';
/** Confirmação persistente do anexo; os dados seguem dentro da atividade. */
export function painelImagem(imagem, remover) {
  if (!imagem?.dados) return h('p',{class:'aviso',role:'status'},'Nenhuma imagem anexada nesta etapa. Escolha um arquivo abaixo.');
  return h('figure',{class:'anexo-docente'},h('img',{src:imagem.dados,alt:imagem.descricao || 'Prévia da imagem anexada'}),
    h('figcaption',{},h('strong',{},'Imagem anexada: '+(imagem.nome || 'imagem desta atividade')),
      h('p',{class:'sutil'},[imagem.largura && imagem.altura ? imagem.largura+' × '+imagem.altura+' pixels':'',Math.ceil(imagem.dados.length*0.75/1024)+' KB na atividade'].filter(Boolean).join(' · ')),
      h('p',{},'Incluída na atividade. Use Salvar na biblioteca para guardá-la com os demais conteúdos.'),
      h('button',{type:'button',class:'btn perigo pequeno',onclick:remover},'Remover imagem')));
}
