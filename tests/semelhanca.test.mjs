// Aviso de etapas muito parecidas e próximas · node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { alertasSemelhanca, semelhancaEtapas, sugerirEquilibrio, LIMIAR_SEMELHANCA } from '../js/core/equilibrio.js';

const caso = n => { const j = JSON.parse(readFileSync(new URL('../casos/' + n + '.json', import.meta.url), 'utf8')); return j.atividade || j; };
const etapa = (id, ordem, typeId, extra = {}) => ({ id, ordem, titulo: id, typeId, typeVersion: '1.0.0', instrucao: '', participacao: { organizacao: 'grupos', envio: 'representante', competicao: 'meta' }, config: {}, ...extra });
const ativ = etapas => ({ grupos: [{ id: 'g1' }, { id: 'g2' }], etapas, pecas: [], conexoes: [], meta: { ativa: true } });

test('dois quizzes iguais vizinhos geram alerta com troca sugerida', () => {
  const a = ativ([etapa('q1', 1, 'quiz_grupos'), etapa('q2', 2, 'quiz_grupos'), etapa('c', 3, 'cadeado_grupo'), etapa('p', 4, 'pares')]);
  const al = alertasSemelhanca(a);
  assert.equal(al.length, 1);
  assert.deepEqual(al[0].etapas, ['q1', 'q2']);
  assert.ok(al[0].troca, 'deve sugerir uma troca');
  // aplicar a troca sugerida resolve o alerta
  const x = a.etapas.find(e => e.id === al[0].troca.etapa), y = a.etapas.find(e => e.id === al[0].troca.com);
  [x.ordem, y.ordem] = [y.ordem, x.ordem];
  assert.equal(alertasSemelhanca(a).length, 0);
});

test('mesmo formato em variações diferentes, sem conteúdo em comum, não alerta', () => {
  const a = ativ([etapa('o', 1, 'cartoes_arrastar', { config: { formato: 'ordenar' } }), etapa('k', 2, 'cartoes_arrastar', { config: { formato: 'classificar' } })]);
  assert.equal(alertasSemelhanca(a).length, 0);
});

test('etapas ligadas por conexão nunca alertam', () => {
  const a = ativ([etapa('i', 1, 'investigacao_fragmentos', { titulo: 'hipóteses da fadiga' }), etapa('c', 2, 'comparar_hipoteses', { titulo: 'hipóteses da fadiga' })]);
  a.conexoes = [{ id: 'x', de: { etapaId: 'i', portId: 'hipotese_grupo' }, para: { etapaId: 'c', portId: 'hipoteses_recebidas' } }];
  assert.equal(alertasSemelhanca(a).length, 0);
});

test('a uma etapa de distância só alerta se for quase igual', () => {
  const t = 'débito cardíaco frequência cardíaca volume sistólico retorno venoso exercício';
  const a = ativ([etapa('a', 1, 'questao_individual', { titulo: t, participacao: { organizacao: 'individual', envio: 'individual', competicao: 'meta' } }), etapa('m', 2, 'cadeado_grupo'), etapa('b', 3, 'questao_individual', { titulo: t, participacao: { organizacao: 'individual', envio: 'individual', competicao: 'meta' } })]);
  const al = alertasSemelhanca(a);
  assert.equal(al.length, 1); assert.equal(al[0].distancia, 2);
  assert.ok(semelhancaEtapas(a, a.etapas[0], a.etapas[2]).nota >= LIMIAR_SEMELHANCA[2]);
});

test('a troca sugerida nunca põe a comparação antes da investigação que a alimenta', () => {
  const a = caso('ciclista-altitude');
  for (const al of alertasSemelhanca(a)) if (al.troca) {
    const s = JSON.parse(JSON.stringify(a)); const x = s.etapas.find(e => e.id === al.troca.etapa), y = s.etapas.find(e => e.id === al.troca.com);
    [x.ordem, y.ordem] = [y.ordem, x.ordem];
    for (const c of s.conexoes) assert.ok(s.etapas.find(e => e.id === c.de.etapaId).ordem < s.etapas.find(e => e.id === c.para.etapaId).ordem);
  }
});

test('o alerta entra nas sugestões de equilíbrio e pode ser dispensado', () => {
  const a = ativ([etapa('q1', 1, 'quiz_grupos'), etapa('q2', 2, 'quiz_grupos'), etapa('c', 3, 'cadeado_grupo')]);
  const s = sugerirEquilibrio(a); const id = s.find(x => x.id.startsWith('semelhanca:'))?.id;
  assert.ok(id);
  assert.ok(!sugerirEquilibrio(a, { dispensadas: new Set([id]) }).some(x => x.id === id));
});
