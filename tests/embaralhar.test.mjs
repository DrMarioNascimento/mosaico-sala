// Ordem sorteada das alternativas: mede a POSIÇÃO SORTEADA, não a ordem escrita no arquivo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { embaralharPor, hashTexto } from '../js/core/embaralhar.js';

const alts = [{ id: 'a1', texto: 'certa' }, { id: 'a2', texto: 'b' }, { id: 'a3', texto: 'c' }];

test('Mesma semente → mesma ordem (a tela redesenha sem trocar a ordem debaixo do dedo)', () => {
  assert.deepEqual(embaralharPor(alts, 'u1|q1').map(a => a.id), embaralharPor(alts, 'u1|q1').map(a => a.id));
});

test('Não altera a lista original e não perde nem duplica alternativas', () => {
  const copia = JSON.stringify(alts);
  const r = embaralharPor(alts, 'x');
  assert.equal(JSON.stringify(alts), copia);
  assert.deepEqual(r.map(a => a.id).sort(), ['a1', 'a2', 'a3']);
  assert.deepEqual(embaralharPor(undefined, 'x'), []);
});

test('A primeira alternativa escrita cai em cada posição perto de 1/3 das vezes, entre alunos', () => {
  const N = 6000, cont = [0, 0, 0];
  for (let i = 0; i < N; i++) cont[embaralharPor(alts, `aluno${i}|etapa|q1`).findIndex(a => a.id === 'a1')]++;
  for (const c of cont) assert.ok(Math.abs(c / N - 1 / 3) < 0.03, `posições: ${cont.join(', ')}`);
});

test('Perguntas diferentes do mesmo aluno não saem correlacionadas', () => {
  let iguais = 0; const N = 3000;
  for (let i = 0; i < N; i++) {
    const p1 = embaralharPor(alts, `aluno${i}|q1`).findIndex(a => a.id === 'a1');
    const p2 = embaralharPor(alts, `aluno${i}|q2`).findIndex(a => a.id === 'a1');
    if (p1 === p2) iguais++;
  }
  assert.ok(Math.abs(iguais / N - 1 / 3) < 0.04, `mesma posição em ${iguais} de ${N}`);
});

test('Hash estável', () => {
  assert.equal(hashTexto('abc'), hashTexto('abc'));
  assert.notEqual(hashTexto('abc'), hashTexto('abd'));
});
