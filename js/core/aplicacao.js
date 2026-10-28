/* Mosaico Sala · Aplicação de uma atividade fechada numa turma.
   A escolha (quais etapas, quantos minutos) não altera o planejamento. */

export function totalMarcado(etapas) {
  return (etapas || []).filter(e => e.entra).reduce((s, e) => s + Math.max(0, Math.round(Number(e.tempoMin) || 0)), 0);
}

/** Minutos inteiros, na mesma proporção, somando exatamente o total. Nenhuma fica abaixo de 1. */
export function redistribuir(tempos, total) {
  const n = tempos?.length || 0;
  if (!n) return [];
  const alvo = Math.max(n, Math.round(Number(total)) || n);
  if (n === 1) return [alvo];
  const pesos = tempos.map(t => Math.max(1, Math.round(Number(t) || 1)));
  const soma = pesos.reduce((a, b) => a + b, 0);
  const brutos = pesos.map(p => (alvo * p) / soma);
  const out = brutos.map(v => Math.floor(v));
  let resto = alvo - out.reduce((a, b) => a + b, 0);
  const ordem = brutos.map((v, i) => ({ i, f: v - Math.floor(v) })).sort((a, b) => b.f - a.f || a.i - b.i);
  for (let k = 0; resto > 0 && k < alvo + n; k++) { out[ordem[k % n].i] += 1; resto--; }
  for (let i = 0; i < n; i++) {
    while (out[i] < 1) {
      const j = out.findIndex((v, idx) => idx !== i && v > 1);
      if (j < 0) break;
      out[j]--; out[i]++;
    }
  }
  const diff = alvo - out.reduce((a, b) => a + b, 0);
  if (diff) out[n - 1] += diff;
  if (out[n - 1] < 1) out[n - 1] = 1;
  return out;
}

export function alterarTempo(etapas, id, minutos) {
  const n = Math.max(1, Math.round(Number(minutos) || 1));
  return etapas.map(e => e.id === id ? { ...e, tempoMin: n } : e);
}

export function alterarTotal(etapas, total) {
  const marcadas = etapas.filter(e => e.entra);
  const novos = redistribuir(marcadas.map(e => e.tempoMin), total);
  let k = 0;
  return etapas.map(e => e.entra ? { ...e, tempoMin: novos[k++] } : e);
}

export function marcarEtapa(etapas, id, entra) {
  return etapas.map(e => e.id === id ? { ...e, entra: !!entra } : e);
}

/** Sem aplicação anterior, todas entram. Etapa nova no plano nasce desmarcada. */
export function escolhaInicial(plano, anterior) {
  const porId = new Map((anterior || []).map(e => [e.id, e]));
  const temAnterior = porId.size > 0;
  return [...(plano?.etapas || [])].sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0)).map(e => {
    const velho = porId.get(e.id);
    const tempoPlano = Math.max(1, Math.round(Number(e.tempoMin) || 1));
    if (!velho) return { id: e.id, titulo: e.titulo || '', entra: !temAnterior, tempoMin: tempoPlano };
    return { id: e.id, titulo: e.titulo || '', entra: !!velho.entra, tempoMin: Math.max(1, Math.round(Number(velho.tempoMin) || tempoPlano)) };
  });
}

export function dependenciaFaltando(plano, escolha) {
  const entra = new Set((escolha || []).filter(e => e.entra).map(e => e.id));
  const nome = id => plano?.etapas?.find(e => e.id === id)?.titulo || id;
  const faltas = [];
  for (const c of plano?.conexoes || []) {
    const de = c.de?.etapaId, para = c.para?.etapaId;
    if (para && entra.has(para) && de && !entra.has(de)) faltas.push({ de, para, mensagem: `“${nome(para)}” usa o resultado de “${nome(de)}”. Marque as duas ou desmarque “${nome(para)}”.` });
  }
  return faltas;
}

/** Cópia só da sessão: etapas desmarcadas ficam de fora. Não grava de volta no plano. */
export function atividadeDaSessao(plano, escolha) {
  const a = JSON.parse(JSON.stringify(plano));
  const entra = new Set((escolha || []).filter(e => e.entra).map(e => e.id));
  const tempos = new Map((escolha || []).map(e => [e.id, Math.max(1, Math.round(Number(e.tempoMin) || 1))]));
  a.etapas = [...(a.etapas || [])].filter(e => entra.has(e.id)).sort((x, y) => (x.ordem ?? 0) - (y.ordem ?? 0)).map(e => ({ ...e, tempoMin: tempos.get(e.id) || e.tempoMin }));
  a.pecas = (a.pecas || []).filter(p => entra.has(p.etapaId));
  a.conexoes = (a.conexoes || []).filter(c => entra.has(c.de?.etapaId) && entra.has(c.para?.etapaId));
  if (a.meta?.etapas) a.meta.etapas = a.meta.etapas.filter(id => entra.has(id));
  if (a.docente?.respostas) a.docente.respostas = Object.fromEntries(Object.entries(a.docente.respostas).filter(([id]) => entra.has(id)));
  a.duracaoMin = a.etapas.reduce((s, e) => s + (Number(e.tempoMin) || 0), 0);
  return a;
}

/** O que a sala usa: a versão fechada, nunca o ajuste ainda aberto. */
export function planoFechado(doc) {
  if (!doc) return null;
  const bruto = doc.fechado || null;
  if (bruto) { try { return JSON.parse(bruto); } catch { return null; } }
  try {
    const a = JSON.parse(doc.conteudo || 'null');
    return a?.docente?.revisadoEm ? a : null;
  } catch { return null; }
}
