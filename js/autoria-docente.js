import { h, campoArquivo } from './ui.js';
import { OBJETIVOS_AUTORIA, pedidoAutoria, lerProposta, mensagemErroIA } from './core/autoria.js';
import { resumoAlteracoes } from './core/ergonomia.js';
import { TIPOS } from './core/tipos.js';
import { gerarComIA, iaDisponivel } from './ia-firebase.js';
import { lerMaterialDocente } from './material-docente.js';

const NOMES = { titulo:'Título', publico:'Público', duracaoMin:'Duração', objetivos:'Objetivos', introducao:'Introdução', etapas:'Etapas', pecas:'Evidências', fontes:'Fontes', docente:'Material docente', meta:'Meta', grupos:'Grupos', conexoes:'Conexões', pendencias:'Pendências' };
export function abrirAutoria({ contaId = 'local', atual = null, aplicar }) {
  const chave = 'mosaico-autoria:' + contaId;
  let guardado; try { guardado = JSON.parse(localStorage.getItem(chave) || 'null'); } catch {}
  let cfg = { publico: atual?.publico || '', duracaoMin: atual?.duracaoMin || 50, numeroGrupos: atual?.grupos.length || 5, organizacao:'grupos', objetivo:'investigar', aprendizagem:'', regime: atual?.regime || 'fiel', preferencias:'', tipos:[], idsGrupos:atual?.grupos.map(g=>g.id), ...(atual ? {} : guardado?.cfg) };
  let material = atual?.docente?.materialBase || guardado?.material || '', proposta = null, passo = 0, ocupado = false, ajuste = '', descartar = false;
  const d = h('dialog', { class:'autoria-dialog', 'aria-labelledby':'autoriaTitulo' });
  const corpo = h('div'), aviso = h('p', { class:'aviso', role:'status', 'aria-live':'polite', hidden:true });
  const estado = h('small', { class:'sutil', role:'status', 'aria-live':'polite' });
  const msg = (t, tipo='info') => { aviso.textContent=t; aviso.dataset.tipo=tipo; aviso.hidden=!t; };
  const guardar = () => { try { localStorage.setItem(chave, JSON.stringify({ cfg, material })); estado.textContent='Material salvo neste navegador.'; } catch { estado.textContent='Não foi possível salvar o material no navegador. Copie seu texto antes de sair.'; } };
  const campo = (rotulo, valor, mudar, op={}) => {
    const id='au-'+Math.random().toString(36).slice(2,9);
    const el=op.opcoes ? h('select',{id},op.opcoes.map(([v,t])=>h('option',{value:v,selected:String(v)===String(valor)},t))) : op.area ? h('textarea',{id,rows:op.rows||3,maxlength:op.max||60000},valor) : h('input',{id,type:op.tipo||'text',value:valor,min:op.min,max:op.max});
    el.addEventListener(op.opcoes?'change':'input',()=>{mudar(op.tipo==='number'?Number(el.value):el.value);guardar();});
    return h('div',{},h('label',{for:id},rotulo),el,op.ajuda&&h('small',{},op.ajuda));
  };
  const lerArquivo = h('input',{type:'file',accept:'.txt,.md,.pdf,.docx','aria-label':'Importar material da aula'});
  lerArquivo.onchange=async()=>{const f=lerArquivo.files[0];if(!f)return;msg('Lendo o material neste navegador…');try{const t=await lerMaterialDocente(f);if(t.length>60000)throw new Error('O texto ultrapassa 60 mil caracteres. Cole apenas o trecho que será usado.');material=t;guardar();render();msg('Texto extraído. Confira o conteúdo antes de gerar.','ok');}catch(e){msg(e.message,'erro');}};
  const gerar = async()=>{
    try {
      const prompt=pedidoAutoria(cfg,material,atual,ajuste);
      ocupado=true;render();msg('Gerando uma proposta. Você poderá revisar tudo antes de aplicar.');
      const texto=await gerarComIA(prompt);
      proposta=lerProposta(texto,cfg);proposta.atividade.docente.materialBase=material;
      passo=2;msg('Proposta recebida. Confira as etapas, as fontes e as respostas esperadas.','ok');
    } catch(e){msg(mensagemErroIA(e),'erro');} finally{ocupado=false;render();}
  };
  function render(){
    corpo.replaceChildren(h('nav',{class:'autoria-passos','aria-label':'Criação da atividade'},['1 · Material','2 · Planejar','3 · Revisar proposta'].map((x,i)=>h('button',{class:'btn pequeno',disabled:ocupado||(i===2&&!proposta),'aria-current':passo===i?'step':null,onclick:()=>{passo=i;render();}},x))));
    if(passo===0){corpo.append(h('p',{},'Inclua o conteúdo que seus alunos vão trabalhar. Confira a extração antes de continuar.'),campoArquivo(lerArquivo,'PDF, Word, texto ou Markdown'),campo('Material da aula',material,v=>{material=v;},{area:true,rows:12,ajuda:'Até 60 mil caracteres. Arquivos são lidos localmente; a geração envia o texto ao Gemini somente quando você solicita.'}),h('button',{class:'btn primario',disabled:ocupado,onclick:()=>{if(material.trim().length<80){msg('Inclua ao menos um parágrafo (80 caracteres).','erro');return;}passo=1;msg('');render();}},'Continuar: planejar a atividade'));}
    if(passo===1){
      corpo.append(h('div',{class:'campos-2'},campo('Para quem é a aula?',cfg.publico,v=>cfg.publico=v,{ajuda:'Ex.: graduação em Fisioterapia, primeiro ano.'}),campo('Tempo disponível (minutos)',cfg.duracaoMin,v=>cfg.duracaoMin=v,{tipo:'number',min:5,max:240})),campo('O que os alunos deverão fazer?',cfg.objetivo,v=>cfg.objetivo=v,{opcoes:OBJETIVOS_AUTORIA.map(x=>[x[0],x[1]])}),campo('Ao final, o aluno deverá…',cfg.aprendizagem,v=>cfg.aprendizagem=v,{area:true,rows:2,ajuda:'Ex.: explicar a sequência e justificar a conclusão com evidências.'}),h('div',{class:'campos-2'},campo('Organização',cfg.organizacao,v=>{cfg.organizacao=v;cfg.tipos=cfg.tipos.filter(t=>v!=='individual'||TIPOS[t].participacao.organizacao.includes('individual'));render();},{opcoes:[['grupos','Em grupos'],['individual','Individual']]}),cfg.organizacao==='grupos'&&campo('Número fixo de grupos',cfg.numeroGrupos,v=>cfg.numeroGrupos=v,{tipo:'number',min:1,max:10})),campo('Como usar o material',cfg.regime,v=>cfg.regime=v,{opcoes:[['fiel','Usar somente informações do texto'],['simulacao','Permitir situações fictícias identificadas']]}));
      const tipos=h('div',{class:'opcoes'},Object.values(TIPOS).filter(t=>cfg.organizacao!=='individual'||t.participacao.organizacao.includes('individual')).map(t=>h('label',{class:'opcao'},h('input',{type:'checkbox',checked:cfg.tipos.includes(t.typeId),onchange:e=>{cfg.tipos=e.target.checked?[...cfg.tipos,t.typeId]:cfg.tipos.filter(x=>x!==t.typeId);guardar();}}),h('span',{},h('strong',{},t.nome),h('small',{style:{display:'block'}},t.descricao)))));
      corpo.append(h('details',{},h('summary',{},'Quero escolher os formatos (opcional)'),h('p',{class:'sutil'},'Sem seleção, os formatos são sugeridos pelo objetivo. A ordem da seleção será a ordem das etapas.'),tipos),campo('Outras orientações (opcional)',cfg.preferencias,v=>cfg.preferencias=v,{area:true,rows:2}));
      if(atual)corpo.append(campo('O que você quer ajustar?',ajuste,v=>ajuste=v,{area:true,rows:3}),h('div',{class:'linha-botoes'},['Simplificar a linguagem','Reduzir a leitura mantendo as informações essenciais','Criar alternativas mais plausíveis','Ajustar ao tempo disponível','Apontar informações sem sustentação no texto'].map(t=>h('button',{class:'btn pequeno',onclick:()=>{ajuste=t;render();}},t))));
      const externo=h('textarea',{rows:7,readonly:true,'aria-label':'Pedido para usar em uma IA externa',hidden:true});
      const retorno=h('textarea',{rows:6,'aria-label':'Resposta da IA externa',placeholder:'Cole aqui a resposta completa da IA. A plataforma identifica a atividade.'});
      if(!iaDisponivel())corpo.append(h('p',{class:'aviso'},'A geração integrada aguarda configuração do administrador. O caminho com IA externa está disponível abaixo.'));corpo.append(h('button',{class:'btn primario',disabled:ocupado||!iaDisponivel(),onclick:()=>{if(!cfg.publico.trim()||!cfg.aprendizagem.trim()||cfg.duracaoMin<5||cfg.duracaoMin>240||(cfg.organizacao==='grupos'&&(!Number.isInteger(cfg.numeroGrupos)||cfg.numeroGrupos<1||cfg.numeroGrupos>10))){msg('Informe público, objetivo, tempo entre 5 e 240 minutos e de 1 a 10 grupos.','erro');return;}gerar();}},ocupado?'Gerando proposta…':atual?'Propor ajustes com IA':'Gerar atividade com IA'),h('details',{class:'autoria-externa'},h('summary',{},'Usar uma IA externa'),h('p',{},'Prepare o pedido, copie para sua IA e cole a resposta de volta aqui. O material da aula já acompanha o pedido.'),h('button',{class:'btn',disabled:ocupado,onclick:()=>{try{externo.value=pedidoAutoria(cfg,material,atual,ajuste);externo.hidden=false;externo.focus();externo.select();msg('Pedido pronto. Copie o texto selecionado para a IA de sua preferência.');}catch(e){msg(e.message,'erro');}}},'Preparar pedido completo'),externo,retorno,h('button',{class:'btn',disabled:ocupado,onclick:()=>{try{proposta=lerProposta(retorno.value,cfg);proposta.atividade.docente.materialBase=material;passo=2;render();msg('Proposta importada para revisão.','ok');}catch(e){msg(e.message,'erro');}}},'Revisar a resposta recebida')));
    }
    if(passo===2&&proposta){
      const a=proposta.atividade;
      corpo.append(h('h3',{},a.titulo),h('p',{},a.publico+' · '+a.duracaoMin+' min · '+a.grupos.length+' grupos · '+a.etapas.length+' etapas'),h('p',{},a.perguntaCentral||''));
      if(atual)corpo.append(h('p',{class:'aviso'},'Partes alteradas: '+resumoAlteracoes(atual,a).map(k=>NOMES[k]||k).join(', ')+'. Ao aplicar, você poderá desfazer no editor.'));
      corpo.append(h('ol',{class:'roteiro'},[...a.etapas].sort((x,y)=>x.ordem-y.ordem).map(e=>h('li',{},h('strong',{},e.titulo),h('p',{},e.instrucao||''),h('small',{},(e.tempoMin||'?')+' min · '+(TIPOS[e.typeId]?.nome||e.typeId))))));
      const erros=proposta.diagnosticos.filter(d=>d.severidade==='erro');
      corpo.append(h('p',{class:'aviso'},erros.length?erros.length+' itens precisam ser completados no editor antes da aula.':'Estrutura completa. A revisão do conteúdo é responsabilidade do professor.'),h('button',{class:'btn primario',onclick:()=>{descartar=true;aplicar(a);d.close();}},atual?'Aplicar proposta e revisar no editor':'Abrir proposta no editor'),h('button',{class:'btn',onclick:()=>{passo=1;render();}},'Voltar e ajustar o pedido'));
    }
    corpo.setAttribute('aria-busy',String(ocupado));
    corpo.querySelectorAll('input,textarea,select').forEach(el=>el.disabled=ocupado);
  }
  d.append(h('div',{class:'autoria-cab'},h('h2',{id:'autoriaTitulo'},atual?'Ajustar atividade com IA':'Criar atividade a partir de um texto'),h('button',{class:'btn pequeno',onclick:()=>d.close()},'Fechar')),estado,aviso,corpo);
  d.addEventListener('close',()=>{if(!descartar)guardar();d.remove();});
  document.body.append(d);render();d.showModal();
}
