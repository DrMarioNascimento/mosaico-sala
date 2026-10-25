/* MOSAICO · Escalas padronizadas (autorrelato).
   Mini-IPIP6 (Sibley et al., 2011): os Big Five do Mini-IPIP (Donnellan et al., 2006) + Honestidade-Humildade,
   o fator que distingue o modelo HEXACO. 24 itens do International Personality Item Pool (IPIP), de domínio público:
   "permission has already been automatically granted for any person to use IPIP items, scales, and inventories
   for any purpose" (ipip.ori.org/newPermission.htm).
   Itens em inglês conferidos com a chave do IPIP (ipip.ori.org/MiniIPIP6Key.htm); 15 dos 24 são invertidos.
   A versão em português é tradução livre, não validada: serve para discussão em aula, não para diagnóstico.
   Privacidade: o celular manda só a média de cada fator (nunca as respostas item a item), e a turma só vê médias
   quando há pelo menos MINIMO_TURMA respostas. */

export const MINIMO_TURMA = 5;

/** Escala de resposta do IPIP (quão bem a frase descreve você), de 1 a 5. */
export const OPCOES_RESPOSTA = [
  { valor: 1, texto: 'Muito impreciso' },
  { valor: 2, texto: 'Um pouco impreciso' },
  { valor: 3, texto: 'Nem preciso nem impreciso' },
  { valor: 4, texto: 'Um pouco preciso' },
  { valor: 5, texto: 'Muito preciso' }
];

export const INSTRUMENTOS = {
  'mini-ipip6': {
    id: 'mini-ipip6',
    nome: 'Mini-IPIP6: Big Five + Honestidade-Humildade',
    curto: 'Mini-IPIP6',
    duracao: 'cerca de 4 minutos',
    instrucao: 'Leia cada frase e marque o quanto ela descreve você hoje, como você realmente é (não como gostaria de ser). Não há resposta certa. Suas respostas ficam neste celular: só a média de cada fator vai para a turma, sem o seu nome.',
    referencia: 'Sibley, C. G. et al. (2011). The Mini-IPIP6: Validation and extension of a short measure of the Big-Six factors of personality in New Zealand. New Zealand Journal of Psychology, 40(3), 142–159. Itens do IPIP (ipip.ori.org), domínio público.',
    traducao: 'Tradução livre para o português, não validada. Use para refletir e discutir, não para avaliar ou selecionar pessoas.',
    fatores: [
      { id: 'E', nome: 'Extroversão', alto: 'busca contato, fala e se energiza com outras pessoas', baixo: 'prefere ambientes calmos e poucas pessoas por vez' },
      { id: 'A', nome: 'Amabilidade', alto: 'se importa com os sentimentos e problemas dos outros', baixo: 'é mais distante e direto nas relações' },
      { id: 'C', nome: 'Conscienciosidade', alto: 'é organizado e faz as tarefas logo', baixo: 'é mais espontâneo e flexível com prazos e ordem' },
      { id: 'N', nome: 'Neuroticismo', alto: 'sente oscilações de humor e se chateia com facilidade', baixo: 'costuma ficar calmo e estável' },
      { id: 'O', nome: 'Abertura à experiência', alto: 'gosta de imaginar e de ideias abstratas', baixo: 'prefere o concreto e o conhecido' },
      { id: 'H', nome: 'Honestidade-Humildade', alto: 'não se sente com direito a mais que os outros e dá pouco valor a luxo e status', baixo: 'valoriza status, luxo e sente que merece mais' }
    ],
    // ordem do Mini-IPIP6 (itens 1–20 do Mini-IPIP; 21–24 Honestidade-Humildade); inv = invertido
    itens: [
      { id: 'i1', fator: 'E', inv: false, en: 'Am the life of the party.', texto: 'Sou a alma da festa.' },
      { id: 'i2', fator: 'A', inv: false, en: "Sympathize with others' feelings.", texto: 'Eu me compadeço dos sentimentos dos outros.' },
      { id: 'i3', fator: 'C', inv: false, en: 'Get chores done right away.', texto: 'Faço minhas tarefas do dia a dia logo.' },
      { id: 'i4', fator: 'N', inv: false, en: 'Have frequent mood swings.', texto: 'Tenho mudanças de humor frequentes.' },
      { id: 'i5', fator: 'O', inv: false, en: 'Have a vivid imagination.', texto: 'Tenho uma imaginação fértil.' },
      { id: 'i6', fator: 'E', inv: true, en: "Don't talk a lot.", texto: 'Não falo muito.' },
      { id: 'i7', fator: 'A', inv: true, en: "Am not interested in other people's problems.", texto: 'Não me interesso pelos problemas dos outros.' },
      { id: 'i8', fator: 'C', inv: true, en: 'Often forget to put things back in their proper place.', texto: 'Muitas vezes esqueço de guardar as coisas no lugar certo.' },
      { id: 'i9', fator: 'N', inv: true, en: 'Am relaxed most of the time.', texto: 'Fico relaxado(a) a maior parte do tempo.' },
      { id: 'i10', fator: 'O', inv: true, en: 'Am not interested in abstract ideas.', texto: 'Não me interesso por ideias abstratas.' },
      { id: 'i11', fator: 'E', inv: false, en: 'Talk to a lot of different people at parties.', texto: 'Converso com muitas pessoas diferentes nas festas.' },
      { id: 'i12', fator: 'A', inv: false, en: "Feel others' emotions.", texto: 'Sinto as emoções dos outros.' },
      { id: 'i13', fator: 'C', inv: false, en: 'Like order.', texto: 'Gosto de ordem.' },
      { id: 'i14', fator: 'N', inv: false, en: 'Get upset easily.', texto: 'Fico chateado(a) com facilidade.' },
      { id: 'i15', fator: 'O', inv: true, en: 'Have difficulty understanding abstract ideas.', texto: 'Tenho dificuldade para entender ideias abstratas.' },
      { id: 'i16', fator: 'E', inv: true, en: 'Keep in the background.', texto: 'Fico em segundo plano.' },
      { id: 'i17', fator: 'A', inv: true, en: 'Am not really interested in others.', texto: 'Não me interesso muito pelos outros.' },
      { id: 'i18', fator: 'C', inv: true, en: 'Make a mess of things.', texto: 'Costumo deixar as coisas bagunçadas.' },
      { id: 'i19', fator: 'N', inv: true, en: 'Seldom feel blue.', texto: 'Raramente me sinto para baixo.' },
      { id: 'i20', fator: 'O', inv: true, en: 'Do not have a good imagination.', texto: 'Não tenho uma boa imaginação.' },
      { id: 'i21', fator: 'H', inv: true, en: 'Feel entitled to more of everything.', texto: 'Sinto que tenho direito a mais de tudo.' },
      { id: 'i22', fator: 'H', inv: true, en: 'Deserve more things in life.', texto: 'Mereço ter mais coisas na vida.' },
      { id: 'i23', fator: 'H', inv: true, en: 'Would like to be seen driving around in a very expensive car.', texto: 'Gostaria de ser visto(a) dirigindo um carro muito caro.' },
      { id: 'i24', fator: 'H', inv: true, en: 'Would get a lot of pleasure from owning expensive luxury goods.', texto: 'Teria muito prazer em ter artigos de luxo caros.' }
    ]
  }
};

const arred = (x, c = 2) => Math.round(x * 10 ** c) / 10 ** c;

/**
 * Média de cada fator (1 a 5), com os invertidos já invertidos (6 − resposta).
 * Fator com menos de 3 dos 4 itens respondidos fica null (regra de 75% de completude).
 */
export function pontuar(instrumentoId, respostas) {
  const ins = INSTRUMENTOS[instrumentoId]; if (!ins) throw new Error('Instrumento desconhecido: ' + instrumentoId);
  const out = {};
  for (const f of ins.fatores) {
    const itens = ins.itens.filter(i => i.fator === f.id);
    const vals = itens.map(i => Number(respostas?.[i.id])).map((v, k) => Number.isInteger(v) && v >= 1 && v <= 5 ? (itens[k].inv ? 6 - v : v) : null).filter(v => v !== null);
    out[f.id] = vals.length >= Math.ceil(itens.length * 0.75) ? arred(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
  }
  return out;
}

/** Escores válidos para enviar: um número de 1 a 5 (ou null) por fator do instrumento, e nada mais. */
export function escoresValidos(instrumentoId, escores) {
  const ins = INSTRUMENTOS[instrumentoId]; if (!ins || !escores || typeof escores !== 'object') return null;
  const out = {};
  for (const f of ins.fatores) { const v = escores[f.id]; out[f.id] = v === null || v === undefined ? null : Number.isFinite(Number(v)) && v >= 1 && v <= 5 ? arred(Number(v)) : null; }
  return Object.values(out).some(v => v !== null) ? out : null;
}

/** Médias da turma por fator. Com menos de `minimo` respostas, nada é mostrado (para ninguém ser identificado). */
export function resumoTurma(instrumentoId, lista, minimo = MINIMO_TURMA) {
  const ins = INSTRUMENTOS[instrumentoId]; if (!ins) return null;
  const n = lista.length;
  if (n < minimo) return { n, minimo, suprimido: true };
  const fatores = {};
  for (const f of ins.fatores) {
    const v = lista.map(x => x[f.id]).filter(x => Number.isFinite(x));
    if (!v.length) { fatores[f.id] = null; continue; }
    const m = v.reduce((a, b) => a + b, 0) / v.length;
    const dp = Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / Math.max(1, v.length - 1));
    const faixas = [0, 0, 0, 0, 0];   // 1–1,8 · 1,8–2,6 · 2,6–3,4 · 3,4–4,2 · 4,2–5
    for (const x of v) faixas[Math.min(4, Math.floor((x - 1) / 0.8))]++;
    fatores[f.id] = { media: arred(m), dp: arred(dp), n: v.length, faixas };
  }
  return { n, suprimido: false, fatores };
}

/** Correlação de Pearson; null se houver menos de 3 pares ou nenhuma variação. */
export function correlacao(xs, ys) {
  const pares = xs.map((x, i) => [x, ys[i]]).filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y));
  if (pares.length < 3) return null;
  const mx = pares.reduce((a, [x]) => a + x, 0) / pares.length, my = pares.reduce((a, [, y]) => a + y, 0) / pares.length;
  let sxy = 0, sxx = 0, syy = 0;
  for (const [x, y] of pares) { sxy += (x - mx) * (y - my); sxx += (x - mx) ** 2; syy += (y - my) ** 2; }
  return sxx && syy ? arred(sxy / Math.sqrt(sxx * syy)) : null;
}
