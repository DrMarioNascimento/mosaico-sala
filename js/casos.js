/* MOSAICO · Atividades prontas (pasta casos/). Servem de ponto de partida: abrir, ajustar e usar. */

export const CASOS = [
  { id: 'cancao-exilio-completa', titulo: 'Canção do Exílio: ler, montar e interpretar', resumo: 'Língua Portuguesa · banco de 22 oficinas para vários encontros · imagem, quebra-cabeça, desafios e decisões com três finais' },
  { id: 'citologia-completa', titulo: 'Citologia: estruturas, funções e decisões no laboratório', resumo: 'Biologia · banco de 22 oficinas para vários encontros · a partir de Cito.pdf, com revisão conceitual e fontes complementares' },
  { id: 'ciclista-altitude', titulo: 'A ciclista que voltou da altitude', resumo: 'Fisiologia do Exercício · investigação, comparação e transferência' },
  { id: 'ciclo-agua', titulo: 'Para onde foi a água da poça?', resumo: 'Ciências · 6º ano · investigar, comparar e verificar' },
  { id: 'etica-profissional', titulo: 'Onde fica a linha?', resumo: 'Ética profissional · termômetro, classificação e pares' },
  { id: 'maratona-km38', titulo: 'O que derrubou a corredora no km 38?', resumo: 'Fisiologia do Exercício · mistério por relatos, cadeado e debate de responsabilidade' },
  { id: 'personalidade-escolhas', titulo: 'Personalidade e escolhas éticas', resumo: 'Ética · escala Big Five/HEXACO, jogo do ditador e bens públicos' },
  { id: 'pressao-arterial', titulo: 'Quem controla a pressão?', resumo: 'Fisiologia · cartões, memória, corrida e cruzadas' }
];

export async function carregarCaso(id) {
  const r = await fetch(`casos/${id}.json`, { cache: 'no-cache' });
  if (!r.ok) throw new Error(`modelo “${id}” não encontrado.`);
  return r.json();
}
