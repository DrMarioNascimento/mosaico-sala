import { test } from 'node:test';
import assert from 'node:assert/strict';
import { redistribuir, alterarTempo, alterarTotal, marcarEtapa, totalMarcado, escolhaInicial, dependenciaFaltando, atividadeDaSessao, planoFechado } from '../js/core/aplicacao.js';

const soma = xs => xs.reduce((a, b) => a + b, 0);

test('mudar uma etapa não mexe nas outras e o total soma de novo', () => {
  const base = [{ id: 'a', entra: true, tempoMin: 10 }, { id: 'b', entra: true, tempoMin: 20 }, { id: 'c', entra: false, tempoMin: 8 }];
  const novo = alterarTempo(base, 'a', 15);
  assert.equal(novo[1].tempoMin, 20);
  assert.equal(novo[2].tempoMin, 8);
  assert.equal(totalMarcado(novo), 35);
});

test('mudar o total redistribui na proporção, em minutos inteiros, com mínimo 1', () => {
  const base = [{ id: 'a', entra: true, tempoMin: 10 }, { id: 'b', entra: true, tempoMin: 20 }, { id: 'c', entra: false, tempoMin: 8 }];
  const novo = alterarTotal(base, 15);
  assert.equal(novo.find(e => e.id === 'c').tempoMin, 8);
  assert.equal(totalMarcado(novo), 15);
  assert.ok(novo.filter(e => e.entra).every(e => e.tempoMin >= 1));
  assert.equal(soma(redistribuir([5, 5, 5], 10)), 10);
  assert.deepEqual(redistribuir([40], 7), [7]);
  assert.deepEqual(redistribuir([5, 5], 1), [1, 1]);
});

test('desmarcar guarda o tempo e tira da soma; marcar devolve', () => {
  let e = [{ id: 'a', entra: true, tempoMin: 12 }, { id: 'b', entra: true, tempoMin: 8 }];
  e = marcarEtapa(e, 'b', false);
  assert.equal(e[1].tempoMin, 8);
  assert.equal(totalMarcado(e), 12);
  e = marcarEtapa(e, 'b', true);
  assert.equal(totalMarcado(e), 20);
});

test('etapa nova no plano nasce desmarcada; a primeira aplicação marca todas', () => {
  const plano = { etapas: [{ id: 'a', ordem: 1, titulo: 'A', tempoMin: 5 }, { id: 'b', ordem: 2, titulo: 'B', tempoMin: 9 }] };
  assert.equal(escolhaInicial(plano).every(e => e.entra), true);
  const deNovo = escolhaInicial(plano, [{ id: 'a', entra: true, tempoMin: 6 }]);
  assert.equal(deNovo.find(e => e.id === 'a').tempoMin, 6);
  assert.equal(deNovo.find(e => e.id === 'b').entra, false);
});

test('não abre a sala se a etapa marcada depende de outra desmarcada', () => {
  const plano = { etapas: [{ id: 'a', titulo: 'Investigar' }, { id: 'b', titulo: 'Comparar' }], conexoes: [{ de: { etapaId: 'a' }, para: { etapaId: 'b' } }] };
  const faltas = dependenciaFaltando(plano, [{ id: 'a', entra: false }, { id: 'b', entra: true }]);
  assert.equal(faltas.length, 1);
  assert.match(faltas[0].mensagem, /Comparar/);
  assert.equal(dependenciaFaltando(plano, [{ id: 'a', entra: true }, { id: 'b', entra: true }]).length, 0);
});

test('a sessão leva só as etapas marcadas e não é o plano', () => {
  const plano = { titulo: 'T', etapas: [{ id: 'a', ordem: 1, tempoMin: 10 }, { id: 'b', ordem: 2, tempoMin: 4 }], pecas: [{ etapaId: 'b' }], conexoes: [{ de: { etapaId: 'a' }, para: { etapaId: 'b' } }], meta: { etapas: ['a', 'b'] }, docente: { respostas: { a: { x: 1 }, b: { x: 2 } } } };
  const sessao = atividadeDaSessao(plano, [{ id: 'a', entra: true, tempoMin: 6 }, { id: 'b', entra: false, tempoMin: 4 }]);
  assert.deepEqual(sessao.etapas.map(e => e.id), ['a']);
  assert.equal(sessao.etapas[0].tempoMin, 6);
  assert.equal(sessao.pecas.length, 0);
  assert.equal(sessao.conexoes.length, 0);
  assert.deepEqual(sessao.meta.etapas, ['a']);
  assert.equal(plano.etapas.length, 2);
});

test('aplicar lê a versão fechada, não o rascunho', () => {
  const fechado = { titulo: 'Fechada', docente: { revisadoEm: 1 } };
  const rascunho = { titulo: 'Ajuste' };
  assert.equal(planoFechado({ fechado: JSON.stringify(fechado), conteudo: JSON.stringify(rascunho), rascunho: JSON.stringify(rascunho) }).titulo, 'Fechada');
  assert.equal(planoFechado({ conteudo: JSON.stringify(rascunho) }), null);
  assert.equal(planoFechado({ conteudo: JSON.stringify(fechado) }).titulo, 'Fechada');
});
