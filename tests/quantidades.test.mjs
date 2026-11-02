import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { prepararMemoria, estadoMemoria, estadoMemoriaTelao } from '../js/core/pares.js';
import { pecasDeTexto, quantidadePecas, gradeDoCorte, retangulos } from '../js/core/montagem.js';
import { sortearPainel, frequencias } from '../js/core/sequencia.js';
import { obterTipo } from '../js/core/tipos.js';
import { atividadeParaAbas, abasParaAtividade } from '../js/core/planilha.js';
import { geradorComSemente } from '../js/core/distribuicao.js';
const banco = Array.from({length:12},(_,i)=>({id:'p'+i,a:'A'+i,b:'B'+i}));
const conjuntos = [{id:'g1',uids:['u1'],grupos:['g1']}];
const memoria = n => ({formato:'memoria',pares:structuredClone(banco),quantidadePares:n});
const erros = (tipo,config) => obterTipo(tipo,'1.0.0').validar({config,tempoMin:3,participacao:{organizacao:'grupos'}}).filter(x=>x.severidade==='erro');

test('Memória: de 2 a 12 pares, duas cartas por par, banco preservado e sorteio estável',()=>{
 for(const n of [2,5,12]) {
  const c=memoria(n), antes=structuredClone(c);
  const p=prepararMemoria(c,conjuntos,geradorComSemente(7));
  assert.equal(p.cartas.length,n*2);
  const ids=new Set(p.cartas.map(x=>x.par));assert.equal(ids.size,n);
  for(const id of ids)assert.deepEqual(p.cartas.filter(x=>x.par===id).map(x=>x.lado).sort(),['a','b']);
  assert.deepEqual(c,antes);
  assert.deepEqual(p,prepararMemoria(c,conjuntos,geradorComSemente(7)));
 }
 const c=memoria(undefined);delete c.quantidadePares;
 assert.equal(prepararMemoria(c,conjuntos).cartas.length,24);
});

test('Memória: finalizar os pares sorteados conclui a etapa nos dois modos',()=>{
 const c=memoria(2),p=prepararMemoria(c,conjuntos,geradorComSemente(3));
 const ids=[...new Set(p.cartas.map(x=>x.par))];
 const envios=ids.map((id,i)=>({id:'r'+i,autor:'u1',grupoId:'g1',t:i+1,dados:{cartas:p.cartas.map((x,k)=>x.par===id?k:-1).filter(k=>k>=0)}}));
 const g=estadoMemoria(c,p,envios).g1,t=estadoMemoriaTelao(c,p,envios);
 assert.equal(g.total,2);assert.equal(g.concluido,true);assert.equal(g.tentativas,2);
 assert.equal(t.total,2);assert.equal(t.concluido,true);assert.equal(t.placar.g1,2);
 for(const n of [1,13,2.5])assert.ok(erros('pares',memoria(n)).length);
 assert.ok(erros('pares',{...memoria(5),pares:banco.slice(0,4)}).length);
});

test('Genius: cada quantidade de 2 a 8 tem termos e frequências suficientes',()=>{
 const termos=banco.map(p=>({id:p.id,termo:p.a}));
 for(let n=2;n<=8;n++) {
  assert.equal(sortearPainel(termos,n,geradorComSemente(n)).length,n);
  assert.equal(frequencias(n).length,n);assert.ok(frequencias(n).every(x=>Number.isFinite(x)&&x>0));
  assert.deepEqual(erros('sequencia',{termos,botoes:n}),[]);
 }
 for(const n of [1,9,2.5])assert.ok(erros('sequencia',{termos,botoes:n}).length);
 assert.ok(erros('sequencia',{termos:termos.slice(0,7),botoes:8}).length);
});

test('Quebra-cabeça: quantidade fixa agrupa sem perder conteúdo nem alterar o modo por celular',()=>{
 const c={modo:'texto',quantidade:'fixa',texto:'Uma frase | com significado | e uma conta | 2 + 3 = 5',pecasTexto:2};
 const ps=pecasDeTexto(c,8);assert.equal(ps.length,2);assert.equal(ps.join(' '),'Uma frase com significado e uma conta 2 + 3 = 5');
 assert.equal(quantidadePecas(c,8),2);
 assert.equal(pecasDeTexto({...c,quantidade:'celulares'},3).length,3);
 assert.equal(pecasDeTexto({...c,pecasTexto:undefined},8).length,4);
 assert.throws(()=>pecasDeTexto({...c,pecasTexto:5},8),RangeError);
 for(const n of [1,5,21,2.5])assert.ok(erros('montagem_pecas',{...c,pecasTexto:n}).length);
});

test('Planilha preserva quantidade da memória, oito botões e agrupamento de texto',()=>{
 const a=JSON.parse(readFileSync(new URL('../casos/demonstracao-cones.json',import.meta.url),'utf8'));
 const config=[['pares',memoria(3)],['sequencia',{termos:banco.slice(0,8).map(p=>({id:p.id,termo:p.a})),botoes:8}],['montagem_pecas',{modo:'texto',quantidade:'fixa',texto:'a | b | c | d',pecasTexto:2}]];
 a.etapas=config.map(([typeId,config],i)=>({id:'e'+i,titulo:'Teste '+i,ordem:i+1,typeId,typeVersion:'1.0.0',tempoMin:3,participacao:{organizacao:typeId==='sequencia'?'individual':'grupos',envio:typeId==='sequencia'?'individual':'representante',competicao:'desligada'},config}));
 a.conexoes=[];a.docente.respostas={};
 const {atividade:b,problemas}=abasParaAtividade(atividadeParaAbas(a));assert.deepEqual(problemas,[]);
 assert.equal(b.etapas[0].config.quantidadePares,3);assert.equal(b.etapas[0].config.pares.length,12);
 assert.equal(b.etapas[1].config.botoes,8);assert.equal(b.etapas[2].config.pecasTexto,2);
});

test('Quebra-cabeça de imagem: grade respeita de 2 a 20 peças e cobre toda a imagem',()=>{
 for(let n=2;n<=20;n++)for(let cols=2;cols<=6;cols++) {
  const g=gradeDoCorte('grade',n,cols),r=retangulos(g);
  assert.equal(r.length,n);
  assert.ok(Math.abs(r.reduce((t,x)=>t+x.w*x.h,0)-1)<1e-10);
  assert.ok(r.every(x=>x.x>=0 && x.y>=0 && x.x+x.w<=1+1e-10 && x.y+x.h<=1+1e-10));
 }
});
