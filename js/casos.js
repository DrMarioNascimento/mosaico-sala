/* MOSAICO · Atividades prontas (pasta casos/). Servem de ponto de partida: abrir, ajustar e usar. */

export const CASOS = [
  { id: 'ciclista-altitude', titulo: 'A ciclista que voltou da altitude', resumo: 'Fisiologia do Exercício · investigação, comparação e transferência' },
  { id: 'ciclo-agua', titulo: 'Para onde foi a água da poça?', resumo: 'Ciências · 6º ano · investigar, comparar e verificar' },
  { id: 'etica-profissional', titulo: 'Onde fica a linha?', resumo: 'Ética profissional · termômetro, classificação e pares' },
  { id: 'personalidade-escolhas', titulo: 'Personalidade e escolhas éticas', resumo: 'Ética · escala Big Five/HEXACO, jogo do ditador e bens públicos' },
  { id: 'pressao-arterial', titulo: 'Quem controla a pressão?', resumo: 'Fisiologia · cartões, memória, corrida e cruzadas' }
];

export async function carregarCaso(id) {
  const r = await fetch(`casos/${id}.json`, { cache: 'no-cache' });
  if (!r.ok) throw new Error(`modelo “${id}” não encontrado.`);
  return r.json();
}
