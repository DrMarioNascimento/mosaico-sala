/* MOSAICO · Relatório da aula (baixado por quem conduz ao fim da atividade).
   Só números por etapa e por grupo: nenhum nome, nenhum identificador de participante (LGPD). */
import { avaliar, calcularMeta, etapasOrdenadas } from './motor.js';

const ORG = { grupos: 'em grupos', individual: 'individual', representantes: 'entre grupos' };

/** Agrupa os resultados por etapa e grupo: envios, quantos foram avaliados e quantos acertaram. */
export function relatorioAula(a, resultados) {
  const nomeGrupo = id => a.grupos.find(g => g.id === id)?.nome || 'Sem grupo';
  const linhas = [];
  for (const e of etapasOrdenadas(a)) {
    const porGrupo = new Map();
    for (const r of resultados.filter(x => x.etapaId === e.id)) {
      const g = r.grupoId || r.autoria?.grupoId || null;
      const l = porGrupo.get(g) || { envios: 0, avaliados: 0, acertos: 0 };
      l.envios++;
      const av = avaliar(a, e.id, r.dados || {});
      if (av.avaliada) { l.avaliados++; if (av.correta) l.acertos++; }
      porGrupo.set(g, l);
    }
    const ordem = [...porGrupo.keys()].sort((x, y) => (a.grupos.find(g => g.id === x)?.ordemAlocacao ?? 99) - (a.grupos.find(g => g.id === y)?.ordemAlocacao ?? 99));
    for (const g of ordem) linhas.push({ etapa: e.titulo, organizacao: ORG[e.participacao?.organizacao] || e.participacao?.organizacao || '', grupo: nomeGrupo(g), ...porGrupo.get(g) });
    if (!ordem.length) linhas.push({ etapa: e.titulo, organizacao: ORG[e.participacao?.organizacao] || '', grupo: '', envios: 0, avaliados: 0, acertos: 0 });
  }
  return { titulo: a.titulo, linhas, meta: calcularMeta(a, resultados) };
}

/** CSV para abrir no Excel/Planilhas em português (separador ;, com BOM). */
export function relatorioCSV(rel, data = new Date()) {
  const cel = v => { const s = String(v ?? ''); return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const pct = l => l.avaliados ? Math.round(100 * l.acertos / l.avaliados) + '%' : '';
  const linhas = [
    ['Atividade', rel.titulo], ['Data', data.toLocaleDateString('pt-BR')],
    rel.meta ? ['Meta da turma', `${rel.meta.acertos} de ${rel.meta.total} acertos (${Math.round(rel.meta.proporcao * 100)}%) · meta ${Math.round(rel.meta.limiar * 100)}% · ${rel.meta.atingida ? 'atingida' : 'não atingida'}`] : ['Meta da turma', 'sem meta'],
    [],
    ['Etapa', 'Organização', 'Grupo', 'Envios', 'Avaliados', 'Acertos', '% de acertos'],
    ...rel.linhas.map(l => [l.etapa, l.organizacao, l.grupo, l.envios, l.avaliados, l.acertos, pct(l)])
  ];
  return '﻿' + linhas.map(l => l.map(cel).join(';')).join('\r\n') + '\r\n';
}
