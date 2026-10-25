import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {criarHistorico, editarRelogio, recortarPrevia, resumoAlteracoes} from '../js/core/ergonomia.js';
import {pedidoAutoria, lerProposta, mensagemErroIA} from '../js/core/autoria.js';
import {validarAtividade} from '../js/core/validacao.js';
import {versaoPublica} from '../js/core/motor.js';
const caso=JSON.parse(await readFile(new URL('../casos/ciclista-altitude.json',import.meta.url),'utf8'));
test('Desfazer e refazer restauram conteúdo e IDs; nova edição abandona a linha futura',()=>{
 const a={etapas:[{id:'e1',texto:'original'}]},h=criarHistorico(a);a.etapas[0].texto='editado';h.registrar(a);
 assert.equal(h.desfazer().etapas[0].texto,'original');assert.equal(h.refazer().etapas[0].texto,'editado');h.desfazer();h.registrar({etapas:[]});assert.equal(h.podeRefazer,false);
});
test('Pausa congela o tempo sugerido e retoma sem perder o restante; extensão preserva o início',()=>{
 const a={inicio:1000,tempoMin:5};const pausado=editarRelogio(a,'pausar',61000);assert.equal(pausado.pausadoEm,61000);
 const retomado=editarRelogio(pausado,'retomar',121000);assert.equal(retomado.inicio,61000);assert.equal(retomado.pausadoEm,undefined);
 assert.deepEqual(editarRelogio(retomado,5,0),{inicio:61000,tempoMin:10});assert.deepEqual(a,{inicio:1000,tempoMin:5});
});
test('Prévia de etapa não depende de etapas futuras incompletas nem muda o plano',()=>{
 const a=structuredClone(caso), e=a.etapas.find(e=>e.typeId==='questao_individual');a.etapas.push({id:'futura',ordem:99,titulo:'Incompleta'});
 const p=recortarPrevia(a,e.id);assert.equal(p.etapas.length,1);assert.equal(validarAtividade(p).filter(x=>x.severidade==='erro').length,0);assert.equal(a.etapas.at(-1).id,'futura');
});
test('Prévia da comparação usa apenas contribuições fictícias, em cópia isolada',()=>{
 const e=caso.etapas.find(e=>e.typeId==='comparar_hipoteses');const p=recortarPrevia(caso,e.id);
 assert.equal(p.etapas[0].id,'ensaio-origem');assert.ok(p.pecas.every(x=>x.conteudo.includes('fictícia')));assert.equal(validarAtividade(p).filter(x=>x.severidade==='erro').length,0);assert.ok(!caso.etapas.some(x=>x.id==='ensaio-origem'));
});
test('Pedido docente numera a fonte, preserva limites e adapta o formato ao objetivo',()=>{
 const texto='Um material didático longo com evidências para o raciocínio e discussão dos alunos. '.repeat(4);
 const p=pedidoAutoria({objetivo:'relacionar',publico:'Graduação',organizacao:'grupos',numeroGrupos:5},texto);
 assert.ok(p.includes('[Parágrafo 1]'));assert.ok(p.includes('pares'));assert.throws(()=>pedidoAutoria({},'curto'),/80/);assert.throws(()=>pedidoAutoria({},'x'.repeat(60001)),/60 mil/);
});
test('Resposta malformada ou com quantidade diferente de grupos não substitui a atividade',()=>{
 assert.throws(()=>lerProposta('não é uma atividade'),/legível/);assert.throws(()=>lerProposta(JSON.stringify(caso),{organizacao:'grupos',numeroGrupos:3}),/grupos/);
 assert.equal(lerProposta(JSON.stringify(caso),{organizacao:'grupos',numeroGrupos:5}).atividade.id,caso.id);
});
test('Material de autoria, revisão e roteiro privados não entram na versão pública',()=>{
 const a=structuredClone(caso);a.docente.materialBase='texto privado';a.docente.revisadoEm='agora';a.docente.roteiro={e1:'guia privado'};
 const p=JSON.stringify(versaoPublica(a));assert.ok(!p.includes('texto privado'));assert.ok(!p.includes('guia privado'));assert.ok(!p.includes('revisadoEm'));
});
test('Diferenças da proposta identificam as partes alteradas, e falhas de quota têm orientação legível',()=>{
 const a=structuredClone(caso);a.titulo='Novo título';assert.deepEqual(resumoAlteracoes(caso,a),['titulo']);assert.match(mensagemErroIA({code:429}),/limite/);assert.match(mensagemErroIA({message:'[429 ] Your prepayment credits are depleted.'}),/créditos de IA do projeto acabaram/);
});
test('Uma resposta da IA nunca se declara revisada pelo professor',()=>{
 const a=structuredClone(caso);a.docente.revisadoEm='aprovação inventada';a.docente.revisoes={e1:true};const r=lerProposta(JSON.stringify(a),{organizacao:'grupos',numeroGrupos:5});assert.equal(r.atividade.docente.revisadoEm,undefined);assert.equal(r.atividade.docente.revisoes,undefined);
});
test('Atividade sem etapas ou sem organização de sala não fica pronta por engano',()=>{
 const a=structuredClone(caso);a.etapas=[];assert.ok(validarAtividade(a).some(x=>x.local==='etapas'&&x.severidade==='erro'));a.grupos=[];assert.ok(validarAtividade(a).some(x=>x.local==='grupos'&&x.severidade==='erro'));
});
test('Ajuste por IA preserva identificadores de grupos e respeita participação individual',()=>{
 assert.throws(()=>lerProposta(JSON.stringify(caso),{organizacao:'grupos',numeroGrupos:5,idsGrupos:['x1','x2','x3','x4','x5']}),/identificadores/);
 const a=structuredClone(caso);a.grupos=[a.grupos[0]];
 assert.throws(()=>lerProposta(JSON.stringify(a),{organizacao:'individual',numeroGrupos:1}),/individual/);
});
test('Planilha preserva material-base longo e roteiros privados, sem perder espaços ou caracteres Unicode',async()=>{
 const {atividadeParaAbas,abasParaAtividade}=await import('../js/core/planilha.js');const a=structuredClone(caso);
 a.docente.materialBase='  Fonte 😀 com acentos e quebras de linha.\n'.repeat(2000)+' fim  ';a.docente.roteiro={e1:'Pergunte o motivo.\nAguarde a discussão.',e2:'Compare as justificativas.'};
 const abas=atividadeParaAbas(a);assert.ok(abas.Docente.length>1);assert.ok(abas.Docente.every(p=>p.valor.length<=30000));
 const r=abasParaAtividade(abas);assert.deepEqual(r.problemas,[]);assert.equal(r.atividade.docente.materialBase,a.docente.materialBase);assert.deepEqual(r.atividade.docente.roteiro,a.docente.roteiro);
});
test('Planilha avisa se uma parte do complemento docente está ausente',async()=>{
 const {atividadeParaAbas,abasParaAtividade}=await import('../js/core/planilha.js');const a=structuredClone(caso);a.docente.materialBase='x'.repeat(61000);const abas=atividadeParaAbas(a);abas.Docente.splice(1,1);assert.ok(abasParaAtividade(abas).problemas.some(p=>p.startsWith('Complemento docente')));
});
