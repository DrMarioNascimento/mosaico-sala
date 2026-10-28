/* Mosaico Sala · Jogos econômicos padronizados (ética comportamental).
   Todos usam o "método da estratégia": cada aluno decide uma vez, ao mesmo tempo, sem saber com quem joga.
   Depois, quem conduz forma os pares ao acaso (num anel: cada um joga com o próximo) e calcula os ganhos.
   O telão mostra só a distribuição da turma; cada celular vê o próprio ganho. Nada identifica ninguém. */

export const JOGOS = {
  ditador: {
    nome: 'Jogo do ditador',
    resumo: 'Você recebe pontos e decide quantos dar a um colega anônimo. Ele não pode recusar.',
    pergunta: 'Quantos pontos você dá ao colega?',
    principal: 'dar', rotulo: 'pontos dados'
  },
  ultimato: {
    nome: 'Jogo do ultimato',
    resumo: 'Você propõe uma divisão a um colega anônimo. Se ele recusar, os dois ficam com zero.',
    pergunta: 'Quantos pontos você oferece? E qual é a menor oferta que você aceitaria?',
    principal: 'oferta', rotulo: 'pontos oferecidos'
  },
  confianca: {
    nome: 'Jogo da confiança',
    resumo: 'Você pode enviar pontos a um colega anônimo; o que enviar é multiplicado. Ele decide quanto devolve.',
    pergunta: 'Quantos pontos você envia? E, quando receber, que parte devolve?',
    principal: 'enviar', rotulo: 'pontos enviados'
  },
  bens_publicos: {
    nome: 'Jogo dos bens públicos',
    resumo: 'Cada um decide quanto põe no fundo do grupo. O fundo é multiplicado e dividido igualmente entre todos, inclusive quem não pôs nada.',
    pergunta: 'Quantos pontos você põe no fundo do grupo?',
    principal: 'contribuir', rotulo: 'pontos no fundo'
  }
};

const inteiro = (v, min, max) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : null; };
const arred = (x, c = 1) => Math.round(x * 10 ** c) / 10 ** c;

/** Decisão válida para o jogo (números dentro dos limites), ou null. */
export function decisaoValida(config, d) {
  const D = Number(config.dotacao) || 10;
  if (!d || typeof d !== 'object') return null;
  if (config.formato === 'ditador') { const dar = inteiro(d.dar, 0, D); return dar === null ? null : { dar }; }
  if (config.formato === 'ultimato') { const oferta = inteiro(d.oferta, 0, D), minimo = inteiro(d.minimo, 0, D); return oferta === null || minimo === null ? null : { oferta, minimo }; }
  if (config.formato === 'confianca') { const enviar = inteiro(d.enviar, 0, D), devolver = inteiro(d.devolver, 0, 100); return enviar === null || devolver === null ? null : { enviar, devolver }; }
  if (config.formato === 'bens_publicos') { const contribuir = inteiro(d.contribuir, 0, D); return contribuir === null ? null : { contribuir }; }
  return null;
}

/** Embaralha e fecha um anel: cada um "joga para" o seguinte. Com menos de 2 pessoas, não há par. */
export function anel(ids, rng = Math.random) {
  const l = [...ids];
  for (let i = l.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [l[i], l[j]] = [l[j], l[i]]; }
  return l.length < 2 ? {} : Object.fromEntries(l.map((id, i) => [id, l[(i + 1) % l.length]]));
}

/**
 * Calcula os ganhos e o resumo da turma.
 * decisoes: {uid: decisão válida}; grupoDe: {uid: grupoId} (usado nos bens públicos).
 * Devolve { porUid: {uid: {ganho, linhas: [texto]}}, resumo, valores: {uid: decisão principal} }.
 */
export function resolverJogo(config, decisoes, grupoDe = {}, rng = Math.random) {
  const D = Number(config.dotacao) || 10, ids = Object.keys(decisoes), porUid = {}, valores = {};
  const jogo = JOGOS[config.formato]; if (!jogo) throw new Error('Jogo desconhecido: ' + config.formato);
  for (const u of ids) { porUid[u] = { ganho: 0, linhas: [] }; valores[u] = decisoes[u][jogo.principal]; }
  const dist = Array.from({ length: D + 1 }, () => 0);
  for (const u of ids) dist[Math.min(D, Math.max(0, valores[u]))]++;
  const media = ids.length ? arred(ids.reduce((a, u) => a + valores[u], 0) / ids.length) : 0;
  const resumo = { formato: config.formato, n: ids.length, dotacao: D, media, distribuicao: dist };

  if (config.formato === 'ditador') {
    const para = anel(ids, rng);
    for (const [a, b] of Object.entries(para)) {
      const dar = decisoes[a].dar;
      porUid[a].ganho += D - dar; porUid[a].linhas.push(`Você ficou com ${D - dar} dos ${D} pontos.`);
      porUid[b].ganho += dar; porUid[b].linhas.push(`Um colega anônimo deu ${dar} ponto(s) a você.`);
    }
    resumo.deuZero = ids.filter(u => valores[u] === 0).length;
    resumo.deuMetade = ids.filter(u => valores[u] * 2 >= D).length;
  }
  if (config.formato === 'ultimato') {
    const para = anel(ids, rng); let recusadas = 0;
    for (const [a, b] of Object.entries(para)) {
      const o = decisoes[a].oferta, aceita = o >= decisoes[b].minimo;
      if (!aceita) recusadas++;
      porUid[a].ganho += aceita ? D - o : 0; porUid[a].linhas.push(aceita ? `Sua oferta de ${o} foi aceita: você ficou com ${D - o}.` : `Sua oferta de ${o} foi recusada: os dois ficaram com zero.`);
      porUid[b].ganho += aceita ? o : 0; porUid[b].linhas.push(aceita ? `Você recebeu uma oferta de ${o} e aceitou.` : `Você recebeu uma oferta de ${o}, abaixo do seu mínimo (${decisoes[b].minimo}): recusou.`);
    }
    resumo.recusadas = recusadas;
    resumo.mediaMinimo = ids.length ? arred(ids.reduce((a, u) => a + decisoes[u].minimo, 0) / ids.length) : 0;
  }
  if (config.formato === 'confianca') {
    const k = Number(config.multiplicador) || 3, para = anel(ids, rng);
    for (const [a, b] of Object.entries(para)) {
      const s = decisoes[a].enviar, recebe = s * k, volta = Math.round(recebe * decisoes[b].devolver / 100);
      porUid[a].ganho += D - s + volta; porUid[a].linhas.push(`Você enviou ${s}; o colega recebeu ${recebe} e devolveu ${volta}.`);
      porUid[b].ganho += recebe - volta; porUid[b].linhas.push(`Você recebeu ${recebe} (${s} × ${k}) e devolveu ${volta} (${decisoes[b].devolver}%).`);
    }
    // quem não é emparelhado (turma de 1) só fica com a dotação
    resumo.multiplicador = k;
    resumo.mediaDevolver = ids.length ? arred(ids.reduce((a, u) => a + decisoes[u].devolver, 0) / ids.length) : 0;
  }
  if (config.formato === 'bens_publicos') {
    const f = Number(config.fator) || 2, grupos = {};
    for (const u of ids) (grupos[grupoDe[u] || 'turma'] ||= []).push(u);
    resumo.fator = f; resumo.grupos = {};
    for (const [g, us] of Object.entries(grupos)) {
      const fundo = us.reduce((a, u) => a + decisoes[u].contribuir, 0), parte = arred(fundo * f / us.length);
      resumo.grupos[g] = { pessoas: us.length, fundo, parte };
      for (const u of us) { porUid[u].ganho += D - decisoes[u].contribuir + parte; porUid[u].linhas.push(`Você pôs ${decisoes[u].contribuir}. O fundo do grupo (${fundo}) virou ${arred(fundo * f)} e cada um recebeu ${parte}.`); }
    }
  }
  if (config.formato !== 'bens_publicos' && ids.length < 2) for (const u of ids) { porUid[u].ganho = D; porUid[u].linhas.push('Só você respondeu: não houve com quem jogar.'); }
  for (const u of ids) porUid[u].ganho = arred(porUid[u].ganho);
  resumo.ganhoMedio = ids.length ? arred(ids.reduce((a, u) => a + porUid[u].ganho, 0) / ids.length) : 0;
  return { porUid, resumo, valores };
}
