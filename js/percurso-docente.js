import { h } from './ui.js';
export const PASSOS_DOCENTE = [
  ['Entrar','Use sua conta Google.'],
  ['Inserir material','Cole o texto, envie um arquivo ou abra um modelo.'],
  ['Planejar','Defina turma, objetivo, tempo e grupos.'],
  ['Gerar ou adaptar','Peça a proposta à IA ou adapte seu modelo.'],
  ['Revisar conteúdo','Confira perguntas, respostas, fontes e ajustes.'],
  ['Experimentar','Use “Ver como fica” com uma turma simulada.'],
  ['Salvar atividade','Guarde na biblioteca ou baixe uma cópia.'],
  ['Aplicar em sala','Abra a sala e compartilhe o código com a turma.']
];
export const numeroPasso = n => h('span',{class:'numero-fluxo','aria-hidden':'true'},String(n));
export function percursoDocente(atual=1, compacto=false) {
  const lista=h('ol',{class:'percurso-lista'},PASSOS_DOCENTE.map(([titulo,dica],i)=>h('li',{'aria-current':i+1===atual?'step':null},numeroPasso(i+1),h('span',{},h('strong',{},titulo),h('small',{},dica)))));
  return compacto ? h('details',{class:'percurso-docente compacto'},h('summary',{},numeroPasso(atual),h('strong',{},'Passo '+atual+' de 8 · '+PASSOS_DOCENTE[atual-1][0]),h('span',{class:'percurso-ver'},'Ver a sequência completa')),lista) : h('section',{class:'percurso-docente','aria-label':'Sequência completa do professor'},h('h2',{},'Do início à atividade pronta'),h('p',{},'Siga os números. Você pode voltar para ajustar o conteúdo quando precisar.'),lista);
}
