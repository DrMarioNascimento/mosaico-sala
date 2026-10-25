import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validarAtividade} from '../js/core/validacao.js';
import {atividadeParaAbas,abasParaAtividade} from '../js/core/planilha.js';
import {estadoRamificado} from '../js/core/pensar.js';
for(const id of ['cancao-exilio-completa','citologia-completa']){
 const a=JSON.parse(readFileSync(new URL('../casos/'+id+'.json',import.meta.url),'utf8'));
 test(id+': imagens, respostas e roteiro sobrevivem à planilha',()=>{
  const {atividade:b,problemas}=abasParaAtividade(atividadeParaAbas(a));assert.deepEqual(problemas,[]);
  assert.deepEqual(validarAtividade(b).filter(d=>d.severidade==='erro'),[]);
  assert.equal(b.docente.materialBase,a.docente.materialBase);
  for(const e of a.etapas){const t=b.etapas.find(x=>x.id===e.id);if(e.config.imagem)assert.deepEqual(t.config.imagem,e.config.imagem);
   if(e.config.perguntas)for(const q of e.config.perguntas){const nq=t.config.perguntas.find(x=>x.id===q.id);assert.equal(nq.enunciado,q.enunciado);const esperado=q.alternativas.find(x=>x.id===a.docente.respostas[e.id]?.perguntas?.[q.id]?.corretaId)?.texto;const recebido=nq.alternativas.find(x=>x.id===b.docente.respostas[e.id]?.perguntas?.[q.id]?.corretaId)?.texto;assert.equal(recebido,esperado);}
   assert.equal(b.docente.roteiro[e.id],a.docente.roteiro[e.id]);}
  assert.ok(Buffer.byteLength(JSON.stringify(a))<880000);
 });
 test(id+': os três caminhos chegam a desfechos distintos',()=>{
  const c=a.etapas.find(e=>e.config.formato==='ramificado').config;
  const envios=c.cenarios[0].opcoes.map((o,i)=>({id:'d'+i,grupoId:'g'+i,t:1000+i,dados:{cenario:c.cenarios[0].id,opcao:o.id}}));
  const r=estadoRamificado(c,['g0','g1','g2'],envios);
  assert.deepEqual(Object.values(r).map(x=>x.desfecho),['bom','neutro','ruim']);assert.ok(Object.values(r).every(x=>x.final));
 });
 test(id+': fonte e imagens incluídas, treze tipos pertinentes ao tema',()=>{
  assert.equal(new Set(a.etapas.map(e=>e.typeId)).size,13);assert.equal(a.etapas.length,22);
  for(const e of a.etapas.filter(e=>e.config.imagem)){assert.match(e.config.imagem.dados,/^data:image\/webp;base64,/);assert.ok(e.config.imagem.largura>0);}
  assert.ok(a.docente.guia.some(s=>s.includes('Escalas de personalidade')));
 });
}
