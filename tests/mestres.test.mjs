// Lista de mestres editada na tela (só administradores).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lerEmails, ehAdmin } from '../js/mestres.js';
test('Lista de mestres: normaliza e separa e-mails inválidos', () => {
  assert.deepEqual(lerEmails(' Ana@Escola.br, joao@x.com\nana@escola.br;  sem-arroba '), { validos: ['ana@escola.br', 'joao@x.com'], invalidos: ['sem-arroba'] });
  assert.ok(ehAdmin('MarioCNascimento@gmail.com'));
  assert.ok(!ehAdmin('outra@pessoa.com'));
});
