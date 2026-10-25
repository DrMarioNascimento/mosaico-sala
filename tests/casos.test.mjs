// Os modelos prontos (pasta casos/) precisam abrir sem erros e estar na lista de js/casos.js.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { validarAtividade } from '../js/core/validacao.js';
import { CASOS } from '../js/casos.js';

const pasta = new URL('../casos/', import.meta.url);
const arquivos = readdirSync(pasta).filter(f => f.endsWith('.json'));

for (const f of arquivos) {
  test(`Modelo ${f} passa na validação sem erros`, () => {
    const a = JSON.parse(readFileSync(new URL(f, pasta), 'utf8'));
    const erros = validarAtividade(a).filter(d => d.severidade === 'erro');
    assert.deepEqual(erros, []);
    assert.equal(a.id + '.json', f);
  });
}

test('Todo modelo da pasta casos/ aparece na lista e vice-versa', () => {
  assert.deepEqual(CASOS.map(c => c.id + '.json').sort(), [...arquivos].sort());
});
