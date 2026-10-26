// Segurança da importação: imagens só como data URI de imagem válida · node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validarAtividade } from '../js/core/validacao.js';

const caso = n => { const j = JSON.parse(readFileSync(new URL('../casos/' + n + '.json', import.meta.url), 'utf8')); return j.atividade || j; };

test('as imagens dos modelos prontos passam na validação completa da data URI', () => {
  for (const n of ['citologia-completa', 'cancao-exilio-completa']) {
    const a = caso(n);
    const erros = validarAtividade(a).filter(d => d.severidade === 'erro' && /imagem/.test(d.local));
    assert.deepEqual(erros, [], n);
  }
});

test('imagem com HTML escondido depois do prefixo é recusada', () => {
  const a = caso('citologia-completa');
  const e = a.etapas.find(x => x.config?.imagem?.dados);
  e.config.imagem.dados = 'data:image/png;base64,AAAA" onerror="alert(1)';
  const i = a.etapas.indexOf(e);
  assert.ok(validarAtividade(a).some(d => d.severidade === 'erro' && d.local.startsWith(`etapas[${i}]`) && /imagem/.test(d.local)));
});
