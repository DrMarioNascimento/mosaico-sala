// Relatório da aula: números por etapa e grupo, sem dados de participantes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { relatorioAula, relatorioCSV } from '../js/core/relatorio.js';
import { montarResultado } from '../js/core/motor.js';

const caso = () => JSON.parse(readFileSync(new URL('../casos/ciclista-altitude.json', import.meta.url), 'utf8'));

test('Conta envios, avaliados e acertos por etapa e grupo', () => {
  const a = caso();
  const res = [
    montarResultado({ etapaId: 'e_comparacao', grupoPlanejadoId: 'g_sangue', autoria: { tipo: 'grupo', grupoId: 'g_sangue' }, dados: { hipoteseId: 'h_ferro' } }),
    montarResultado({ etapaId: 'e_comparacao', grupoPlanejadoId: 'g_medula', autoria: { tipo: 'grupo', grupoId: 'g_medula' }, dados: { hipoteseId: 'h_tardio' } }),
    montarResultado({ etapaId: 'e_transferencia_1', participanteId: 'uid-secreto', autoria: { tipo: 'participante', uid: 'uid-secreto', grupoId: 'g_sangue' }, dados: { alternativaId: 'a' } }),
    montarResultado({ etapaId: 'e_transferencia_1', participanteId: 'uid-2', autoria: { tipo: 'participante', uid: 'uid-2', grupoId: 'g_sangue' }, dados: { alternativaId: 'b' } })
  ];
  const rel = relatorioAula(a, res);
  const l = (etapa, grupo) => rel.linhas.find(x => x.etapa === etapa && x.grupo === grupo);
  assert.deepEqual({ ...l('Juntando o mosaico', 'Laboratório de Sangue') }, { etapa: 'Juntando o mosaico', organizacao: 'em grupos', grupo: 'Laboratório de Sangue', envios: 1, avaliados: 1, acertos: 1 });
  assert.equal(l('Juntando o mosaico', 'Medula e Ferro').acertos, 0);
  assert.equal(l('Transferência: o primeiro exame', 'Laboratório de Sangue').avaliados, 2);
  assert.equal(l('Transferência: o primeiro exame', 'Laboratório de Sangue').acertos, 1);
  assert.equal(rel.linhas.find(x => x.etapa === 'Transferência: a próxima viagem').envios, 0);   // etapa sem envios aparece zerada
  assert.equal(rel.meta.acertos, 1);
});

test('CSV não leva nomes nem identificadores de participantes', () => {
  const a = caso();
  const res = [montarResultado({ etapaId: 'e_transferencia_1', participanteId: 'uid-secreto', autoria: { tipo: 'participante', uid: 'uid-secreto', grupoId: 'g_ar', nome: 'Maria' }, dados: { alternativaId: 'a' } })];
  const csv = relatorioCSV(relatorioAula(a, res), new Date(2026, 9, 25));
  assert.ok(csv.startsWith('﻿Atividade;A ciclista que voltou da altitude'));
  assert.ok(csv.includes('Transferência: o primeiro exame;individual;Ar e Ventilação;1;1;1;100%'));
  assert.ok(!csv.includes('uid-secreto') && !csv.includes('Maria'));
});
