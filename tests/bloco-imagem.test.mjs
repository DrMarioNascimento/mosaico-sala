import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gradeLocal, gradeDosBlocos, moverFragmento, blocoCompleto, restaurarPosicoes } from '../js/core/bloco-imagem.js';
import { retangulos } from '../js/core/montagem.js';
import { obterTipo } from '../js/core/tipos.js';
import { atividadeParaAbas, abasParaAtividade } from '../js/core/planilha.js';

test('Duas fases: cada celular tem um bloco, sem áreas perdidas nem peças extras',()=>{
 for(let n=1;n<=40;n++){
  const r=retangulos(gradeDosBlocos(n,3));assert.equal(r.length,n);
  assert.ok(Math.abs(r.reduce((s,x)=>s+x.w*x.h,0)-1)<1e-10);
 }
 for(const k of [2,3,4])for(const aspecto of [.3,1,3]){
  const r=retangulos(gradeLocal(k,aspecto));assert.equal(r.length,k);
  assert.ok(Math.abs(r.reduce((s,x)=>s+x.w*x.h,0)-1)<1e-10);
 }
 assert.throws(()=>gradeLocal(5),RangeError);
});
test('Montagem local permite trocar peças sem duplicar, e só conclui a ordem inteira',()=>{
 const ordem=['a','b','c']; let p=[null,null,null];
 p=moverFragmento(p,'b',0);p=moverFragmento(p,'a',1);p=moverFragmento(p,'c',2);
 assert.equal(blocoCompleto(ordem,p),false);
 const anterior=[...p];p=moverFragmento(p,'a',0);
 assert.deepEqual(anterior,['b','a','c']);assert.deepEqual(p,ordem);assert.equal(blocoCompleto(ordem,p),true);
 assert.deepEqual(moverFragmento(p,'a',-1),p);
 assert.equal(blocoCompleto(ordem,['a','b']),false);
 assert.equal(blocoCompleto(ordem,['a',null,'c']),false);
});
test('Retomada do progresso rejeita peças estranhas, repetidas e outro tamanho de tabuleiro',()=>{
 const ordem=['a','b','c'];
 assert.deepEqual(restaurarPosicoes(ordem,['a','a','x']),['a',null,null]);
 assert.deepEqual(restaurarPosicoes(ordem,JSON.parse(JSON.stringify(['a',null,'c']))),['a',null,'c']);
 assert.deepEqual(restaurarPosicoes(ordem,['a','b']),[null,null,null]);
 assert.deepEqual(restaurarPosicoes(ordem,null),[null,null,null]);
});
const config={modo:'imagem',dinamica:'duas_fases',quantidade:'celulares',pecasPorCelular:3,corte:{tipo:'grade',n:6,colunas:3},imagem:{dados:'data:image/png;base64,AA==',largura:100,altura:100}};
const erros=c=>obterTipo('montagem_pecas','1.0.0').validar({config:c,tempoMin:5}).filter(d=>d.severidade==='erro');
test('Validação limita duas fases a imagens, uma por celular e 2–4 peças locais',()=>{
 assert.deepEqual(erros(config),[]);
 for(const k of [2,3,4])assert.deepEqual(erros({...config,pecasPorCelular:k}),[]);
 for(const k of [1,5,2.5])assert.ok(erros({...config,pecasPorCelular:k}).length);
 assert.ok(erros({...config,modo:'texto',texto:'a | b'}).length);
 assert.ok(erros({...config,quantidade:'fixa'}).length);
});
test('Planilha preserva a montagem em duas fases e a quantidade por celular',()=>{
 const a=JSON.parse(readFileSync(new URL('../casos/demonstracao-cones.json',import.meta.url),'utf8'));
 a.etapas=[{id:'bloco',typeId:'montagem_pecas',typeVersion:'1.0.0',titulo:'Montagem',ordem:1,tempoMin:5,participacao:{organizacao:'grupos',envio:'nenhum',competicao:'desligada'},config}];
 a.conexoes=[];a.docente.respostas={};a.meta.ativa=false;
 const {atividade:b,problemas}=abasParaAtividade(atividadeParaAbas(a));assert.deepEqual(problemas,[]);
 assert.equal(b.etapas[0].config.dinamica,'duas_fases');assert.equal(b.etapas[0].config.pecasPorCelular,3);assert.equal(b.etapas[0].config.quantidade,'celulares');
});
