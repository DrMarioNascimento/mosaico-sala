/* MOSAICO · Ícones próprios da plataforma (desenhados para o MOSAICO Sala; não vêm de nenhum outro projeto)
   ico(nome)      → ícone de linha (24×24, usa a cor do texto) para navegação e botões
   ilustra(nome)  → ilustração colorida (64×64) de cada tipo de atividade e das entradas
   Os desenhos são constantes deste arquivo (nada vindo do usuário entra no SVG). */

const L = (d, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"${extra}>${d}</svg>`;

export const UI = {
  inicio: '<path d="M3 11 12 4l9 7"/><path d="M5.5 9.5V20h4.5v-6h4v6h4.5V9.5"/>',
  voltar: '<path d="M15 5 8 12l7 7"/>',
  avancar: '<path d="m9 5 7 7-7 7"/>',
  planejar: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 3h6v3H9z"/><path d="M8.5 11h7M8.5 15h4.5"/>',
  conduzir: '<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.3h2"/><path d="M10 7.5l4 2.5-4 2.5z"/>',
  telao: '<rect x="2.5" y="4" width="19" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>',
  simulador: '<rect x="3" y="3" width="18" height="10" rx="2"/><circle cx="6.5" cy="18.5" r="2"/><circle cx="12" cy="18.5" r="2"/><circle cx="17.5" cy="18.5" r="2"/>',
  participar: '<path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4"/><path d="M3 12h11M10 8l4 4-4 4"/>',
  previa: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  atividade: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>',
  sala: '<rect x="3" y="3" width="7" height="7" rx="1.2"/><rect x="14" y="3" width="7" height="7" rx="1.2"/><rect x="3" y="14" width="7" height="7" rx="1.2"/><path d="M14 14h3v3h-3zM20.5 14v.01M14 20.5h.01M17.5 20.5h3v-3"/>',
  grupos: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.5"/><path d="M16.5 14.2c2.7.4 4.5 2.6 4.5 5.8"/>',
  etapas: '<path d="M12 3 2 8l10 5 10-5z"/><path d="m2 13 10 5 10-5"/>',
  play: '<path d="M7 4.5v15l12-7.5z" fill="currentColor"/>',
  parar: '<rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/>',
  planilha: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M3 15h18M10 4v16"/>',
  json: '<path d="M8 4c-2 0-3 1-3 3v2c0 1.2-.8 2.3-2 3 1.2.7 2 1.8 2 3v2c0 2 1 3 3 3M16 4c2 0 3 1 3 3v2c0 1.2.8 2.3 2 3-1.2.7-2 1.8-2 3v2c0 2-1 3-3 3"/>',
  imprimir: '<path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M6 14h12v7H6z"/>',
  salvar: '<path d="M5 3h11l3 3v15H5z"/><path d="M8 3v5h7V3M8 21v-7h8v7"/>',
  fechar: '<path d="M6 6l12 12M18 6 6 18"/>',
  mais: '<path d="M12 5v14M5 12h14"/>',
  importar: '<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 15v5h16v-5"/>',
  baixar: '<path d="M12 4v12M7 11l5 5 5-5"/><path d="M4 15v5h16v-5"/>',
  ia: '<path d="M11 3l1.9 5.1L18 10l-5.1 1.9L11 17l-1.9-5.1L4 10l5.1-1.9z"/><path d="M18.5 14.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/>',
  fontes: '<path d="M3.5 5.5c3-1.5 5.8-1.5 8.5 0V20c-2.7-1.5-5.5-1.5-8.5 0z"/><path d="M12 5.5c2.7-1.5 5.5-1.5 8.5 0V20c-3-1.5-5.8-1.5-8.5 0"/>',
  geral: '<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
  revisao: '<circle cx="12" cy="12" r="9"/><path d="m8 12.2 2.8 2.8 5.2-6"/>',
  biblioteca: '<rect x="3" y="4" width="4" height="16" rx="1"/><rect x="9" y="4" width="4" height="16" rx="1"/><path d="m15 5.6 3.8-1 3.2 14.6-3.8 1z"/>',
  copiar: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
  apagar: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v5M14 11v5"/>',
  trofeu: '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 20.5h8M9 17h6"/>',
  meta: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/>',
  relogio: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 2"/>',
  licenca: '<path d="M12 4v16M7 20h10M4.5 7h15"/><path d="M4.5 7 2 13a2.5 2.5 0 0 0 5 0zM19.5 7 17 13a2.5 2.5 0 0 0 5 0z"/>',
  abrir: '<path d="M4 6h6l2 2h8v11H4z"/>',
  sortear: '<path d="M3 7h3c4 0 6 10 10 10h4M3 17h3c1.6 0 2.8-1.6 3.8-3.6M14 9.5c.6-1.3 1.3-2.5 2-2.5h4"/><path d="m18 4 3 3-3 3M18 14l3 3-3 3"/>',
  sair: '<path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4"/><path d="M21 12H10M17 8l4 4-4 4"/>',
  olho: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  enviar: '<path d="M21 3 10 14M21 3l-7 18-4-7-7-4z"/>',
  revelar: '<path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/><circle cx="12" cy="12" r="3.5"/>',
  telaCheia: '<path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/>'
};

// Ilustrações (64×64), traço próprio: formas chapadas nas cores do logo do MOSAICO.
const C = { lar: '#ff8a3d', cia: '#3ddcff', lim: '#b7e33a', ros: '#ff5fa8', rox: '#9b6cf0', ama: '#f7c531', azu: '#4b9dff', cla: '#eef2fa', esc: '#1b2439', cin: '#8fa0bf' };
const boneco = (x, y, cor, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})" stroke="${cor}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" fill="none">
  <circle cx="13" cy="5" r="5" fill="${cor}" stroke="none"/>
  <path d="M11 12 6 26"/><path d="M10 15l8 5 4-5"/><path d="M10 15l-7 2-3-5"/><path d="M6 26l8 5-1 10"/><path d="M6 26l-4 9-7 2"/></g>`;
export const TIPOS_ILU = {
  investigacao_fragmentos: `<rect x="5" y="7" width="20" height="20" rx="4" fill="${C.lar}"/><rect x="29" y="5" width="15" height="15" rx="4" fill="${C.cia}"/><rect x="7" y="31" width="15" height="15" rx="4" fill="${C.ros}"/>
    <circle cx="37" cy="36" r="12" fill="rgba(61,220,255,.18)" stroke="${C.cla}" stroke-width="4.5"/><path d="M46 45l11 11" stroke="${C.cla}" stroke-width="7" stroke-linecap="round"/><path d="M31 31a7 7 0 0 1 6-3" stroke="#fff" stroke-width="2.5" stroke-linecap="round" fill="none" opacity=".8"/>`,
  comparar_hipoteses: `<path d="M32 9v42M21 55h22" stroke="${C.cla}" stroke-width="4.5" stroke-linecap="round"/><path d="M9 17h46" stroke="${C.cla}" stroke-width="4.5" stroke-linecap="round"/>
    <path d="M9 17 3 33M9 17l6 16M55 17l-6 13M55 17l6 13" stroke="${C.cin}" stroke-width="2"/><path d="M1.5 33a7.5 5.5 0 0 0 15 0z" fill="${C.lar}"/><path d="M47.5 30a7.5 5.5 0 0 0 15 0z" fill="${C.cia}"/><circle cx="32" cy="9" r="4.5" fill="${C.ama}"/>`,
  montagem_pecas: `<rect x="6" y="6" width="23" height="23" rx="4" fill="${C.lar}"/><rect x="31" y="6" width="23" height="23" rx="4" fill="${C.cia}"/><rect x="6" y="31" width="23" height="23" rx="4" fill="${C.lim}"/>
    <circle cx="30" cy="17.5" r="5.5" fill="${C.lar}"/><circle cx="17.5" cy="30" r="5.5" fill="${C.lim}"/>
    <g transform="translate(5 5) rotate(8 42.5 42.5)"><rect x="31" y="31" width="23" height="23" rx="4" fill="${C.ros}"/><circle cx="42.5" cy="30" r="5.5" fill="${C.ros}"/><circle cx="30" cy="42.5" r="5.5" fill="${C.ros}"/></g>`,
  cadeado_grupo: `<path d="M20 29v-8a12 12 0 0 1 24 0v8" fill="none" stroke="${C.cin}" stroke-width="6.5"/><rect x="11" y="28" width="42" height="29" rx="8" fill="${C.ama}"/>
    <rect x="11" y="28" width="42" height="7" rx="3.5" fill="#fff" opacity=".25"/><circle cx="32" cy="41" r="4.8" fill="#5a3d00"/><path d="M29.6 43h4.8l1.2 8h-7.2z" fill="#5a3d00"/>`,
  quiz_grupos: `<path d="M8 8h32a6 6 0 0 1 6 6v17a6 6 0 0 1-6 6H22l-9 8v-8H8a6 6 0 0 1-6-6V14a6 6 0 0 1 6-6z" fill="${C.rox}"/>
    <path d="M18.5 18a5.5 5.5 0 1 1 7.5 5.1c-1.8.8-2.3 1.8-2.3 3.6" stroke="#fff" stroke-width="3.6" stroke-linecap="round" fill="none"/><circle cx="23.7" cy="31.5" r="2.2" fill="#fff"/>
    <path d="M40 30h16a5 5 0 0 1 5 5v11a5 5 0 0 1-5 5h-2v6l-7-6h-7a5 5 0 0 1-5-5V35a5 5 0 0 1 5-5z" fill="${C.lim}"/><path d="M48 35v7" stroke="${C.esc}" stroke-width="3.6" stroke-linecap="round"/><circle cx="48" cy="46.5" r="2" fill="${C.esc}"/>`,
  cartoes_arrastar: `<rect x="7" y="13" width="25" height="33" rx="4" fill="${C.cia}" transform="rotate(-12 19.5 29.5)"/><rect x="20" y="10" width="25" height="33" rx="4" fill="${C.ros}" transform="rotate(5 32.5 26.5)"/>
    <path d="M25 19h14M25 25h10" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".85" transform="rotate(5 32.5 26.5)"/><path d="M34 53h21m-6-6 6 6-6 6" stroke="${C.cla}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
  pares: `<rect x="3" y="10" width="23" height="31" rx="4" fill="${C.lar}"/><rect x="38" y="23" width="23" height="31" rx="4" fill="${C.cia}"/>
    <path d="M9 20h11M9 26h8" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".85"/><path d="M44 33h11M44 39h8" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".85"/>
    <path d="M24 33c6-8 12-8 16-1" stroke="${C.cla}" stroke-width="4" stroke-linecap="round" fill="none" stroke-dasharray="1 7"/><circle cx="31" cy="27.5" r="4" fill="${C.ama}"/>`,
  corrida: `<path d="M2 59h60" stroke="${C.cin}" stroke-width="3" stroke-linecap="round" stroke-dasharray="6 5"/>
    ${boneco(30, 13, C.lar, 1)}${boneco(6, 21, C.cia, .78)}
    <path d="M55 8v42" stroke="${C.cla}" stroke-width="3" stroke-linecap="round"/><path d="M55 8h8v4h-4v4h4v4h-8z" fill="${C.cla}"/><path d="M59 8h4v4h-4zM55 12h4v4h-4zM59 16h4v4h-4z" fill="${C.esc}"/>`,
  cruzadas: `<g font-family="Archivo, system-ui, sans-serif" font-weight="900" font-size="12" text-anchor="middle">
    ${[[0, 2, 'R'], [1, 2, 'I'], [2, 0, 'A'], [2, 1, 'S'], [2, 2, 'M'], [2, 3, 'A'], [3, 0, 'T'], [4, 0, 'P']].map(([r, c, l]) => `<rect x="${4 + c * 12}" y="${2 + r * 12}" width="11" height="11" rx="2" fill="${r === 2 ? C.ama : c === 0 ? '#bfe9ff' : '#f6f1e7'}"/><text x="${9.5 + c * 12}" y="${11.6 + r * 12}" fill="${C.esc}">${l}</text>`).join('')}</g>
    <rect x="52" y="26" width="10" height="11" rx="2" fill="none" stroke="${C.cin}" stroke-width="2" stroke-dasharray="3 2"/>`,
  sequencia: `<rect x="2" y="2" width="60" height="60" rx="14" fill="#0a141d"/><rect x="8" y="8" width="22" height="22" rx="6" fill="#145a52"/><rect x="34" y="8" width="22" height="22" rx="6" fill="${C.ama}"/>
    <rect x="8" y="34" width="22" height="22" rx="6" fill="#5e2338"/><rect x="34" y="34" width="22" height="22" rx="6" fill="#174a66"/>
    <rect x="31" y="5" width="28" height="28" rx="9" fill="none" stroke="${C.ama}" stroke-width="2" opacity=".55"/><circle cx="51" cy="13" r="2" fill="#fff"/><path d="M38 14a6 6 0 0 1 5-3" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".8"/>`,
  quiz_pensar: `<path d="M32 4v-0M16 10l-3-3M48 10l3-3M8 25H4M56 25h4" stroke="${C.ama}" stroke-width="3.5" stroke-linecap="round"/>
    <path d="M32 6a19 19 0 0 0-11 34.5c2 1.5 3 3.5 3 6V49h16v-2.5c0-2.5 1-4.5 3-6A19 19 0 0 0 32 6z" fill="${C.ama}"/><path d="M21 15a13 13 0 0 1 8-4" stroke="#fff" stroke-width="3" stroke-linecap="round" fill="none" opacity=".7"/>
    <rect x="23" y="51" width="18" height="5" rx="2.5" fill="${C.cin}"/><rect x="26" y="57.5" width="12" height="4.5" rx="2.2" fill="${C.cin}"/>
    <path d="M26.5 22a5.5 5.5 0 1 1 7.6 5.1c-1.6.7-2.1 1.7-2.1 3.4" stroke="#5a3d00" stroke-width="3.6" stroke-linecap="round" fill="none"/><circle cx="32" cy="37" r="2.3" fill="#5a3d00"/>`,
  analise_imagem: `<rect x="3" y="9" width="50" height="40" rx="5" fill="${C.esc}" stroke="${C.cla}" stroke-width="3"/><circle cx="17" cy="21" r="5" fill="${C.ama}"/><path d="M6 46l14-14 9 9 7-6 14 11z" fill="${C.lim}"/>
    <path d="M49 30c-6.5 0-11 4.6-11 10.5C38 48 49 58 49 58s11-10 11-17.5C60 34.6 55.5 30 49 30z" fill="${C.ros}" stroke="#0b0f17" stroke-width="2"/><circle cx="49" cy="40.5" r="4" fill="#fff"/>`,
  questao_individual: `<circle cx="25" cy="18" r="10" fill="${C.cia}"/><path d="M6 54a19 19 0 0 1 38 0z" fill="${C.cia}"/>
    <circle cx="47" cy="44" r="12" fill="${C.lim}" stroke="#0b0f17" stroke-width="2.5"/><path d="M41.5 44.5l4 4 7.5-8.5" stroke="${C.esc}" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
  // entradas e fluxo
  e_planejar: `<rect x="10" y="6" width="38" height="52" rx="6" fill="${C.cla}"/><rect x="20" y="2" width="18" height="9" rx="3" fill="${C.cin}"/>
    <rect x="16" y="18" width="11" height="11" rx="3" fill="${C.lar}"/><rect x="30" y="18" width="11" height="11" rx="3" fill="${C.cia}"/><rect x="16" y="32" width="11" height="11" rx="3" fill="${C.lim}"/><rect x="30" y="32" width="11" height="11" rx="3" fill="${C.ros}"/>
    <path d="M16 50h18" stroke="${C.cin}" stroke-width="3" stroke-linecap="round"/><path d="M57 22 41 48l-6 3 1-6 16-26z" fill="${C.ama}" stroke="#0b0f17" stroke-width="2" stroke-linejoin="round"/>`,
  e_conduzir: `<rect x="16" y="4" width="32" height="56" rx="7" fill="${C.esc}" stroke="${C.cla}" stroke-width="3"/><rect x="21" y="11" width="22" height="38" rx="3" fill="#24304b"/>
    <path d="M28 22v14l11-7z" fill="${C.lar}"/><path d="M28 54h8" stroke="${C.cla}" stroke-width="3" stroke-linecap="round"/><circle cx="50" cy="14" r="7" fill="${C.lim}"/><path d="M47 14l2 2 4-4.5" stroke="${C.esc}" stroke-width="2.4" stroke-linecap="round" fill="none"/>`,
  e_telao: `<rect x="3" y="8" width="58" height="38" rx="5" fill="${C.esc}" stroke="${C.cla}" stroke-width="3"/><path d="M22 58h20M32 46v12" stroke="${C.cla}" stroke-width="3.5" stroke-linecap="round"/>
    <rect x="10" y="15" width="12" height="12" rx="3" fill="${C.lar}"/><rect x="25" y="15" width="12" height="12" rx="3" fill="${C.cia}"/><rect x="10" y="30" width="12" height="10" rx="3" fill="${C.lim}"/><rect x="25" y="30" width="12" height="10" rx="3" fill="${C.ros}"/>
    <path d="M42 18h12M42 24h9M42 30h12M42 36h7" stroke="${C.cin}" stroke-width="2.6" stroke-linecap="round"/>`,
  e_participar: `<rect x="20" y="4" width="28" height="54" rx="7" fill="${C.esc}" stroke="${C.cla}" stroke-width="3"/>
    <circle cx="34" cy="22" r="7" fill="${C.lar}"/><path d="M27 36l7-11 7 11z" fill="${C.cia}"/><rect x="27" y="38" width="14" height="10" rx="3" fill="${C.lim}"/>
    <path d="M4 30h12m-4-4 4 4-4 4" stroke="${C.ama}" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
  e_simulador: `<rect x="5" y="4" width="54" height="30" rx="5" fill="${C.esc}" stroke="${C.cla}" stroke-width="3"/><path d="M14 12h18M14 18h26M14 24h14" stroke="${C.cin}" stroke-width="2.6" stroke-linecap="round"/>
    ${[[7, C.lar], [22, C.cia], [37, C.lim]].map(([x, c]) => `<rect x="${x}" y="38" width="13" height="23" rx="3" fill="${c}"/><rect x="${x + 2.5}" y="41" width="8" height="13" rx="1.5" fill="#0b0f17" opacity=".35"/>`).join('')}
    <rect x="52" y="38" width="9" height="23" rx="3" fill="none" stroke="${C.cin}" stroke-width="2" stroke-dasharray="3 2"/>`
};

function svgEm(cls, svg, rotulo) {
  const s = document.createElement('span');
  s.className = cls;
  s.innerHTML = svg;                     // constantes deste arquivo
  if (rotulo) { s.setAttribute('role', 'img'); s.setAttribute('aria-label', rotulo); } else s.setAttribute('aria-hidden', 'true');
  return s;
}
/* Padrão visual do MOSAICO: ícones 3D (como as formas dos grupos em assets/icones).
   Quando existe a versão 3D de um ícone, ela é usada; os desenhos acima são só provisórios até a versão 3D chegar.
   Todos saem de assets/ilustracoes/3d, recortados e no mesmo tamanho óptico (origens.json diz de onde veio cada um).
   Para trocar: gerar o 3D (prompts em ICONES-3D.md), normalizar como os demais e apontar o nome aqui. */
export const EM_3D = {
  // entradas e fluxo
  e_planejar: 'planejar', e_conduzir: 'conduzir', e_telao: 'telao', e_participar: 'participar', e_simulador: 'simulador',
  e_material: 'material', e_ia: 'ia', e_revisar: 'revisar',
  // tipos de atividade
  investigacao_fragmentos: 'investigar', comparar_hipoteses: 'comparar', montagem_pecas: 'montar', cadeado_grupo: 'cadeado',
  quiz_grupos: 'quiz-grupos', cartoes_arrastar: 'cartoes', pares: 'pares', corrida: 'corrida', cruzadas: 'cruzadas',
  sequencia: 'sequencia', quiz_pensar: 'quiz-pensar', analise_imagem: 'imagem', questao_individual: 'individual',
  escala_padronizada: 'escala', jogo_economico: 'economia',
  // botões e navegação
  ui_inicio: 'inicio', ui_voltar: 'voltar', ui_avancar: 'avancar', ui_planejar: 'planejar', ui_conduzir: 'conduzir',
  ui_telao: 'telao', ui_simulador: 'simulador', ui_participar: 'participar', ui_sair: 'sair', ui_atividade: 'atividade',
  ui_sala: 'sala', ui_grupos: 'grupos', ui_etapas: 'montar', ui_ia: 'ia', ui_fontes: 'material', ui_revisao: 'revisar',
  ui_biblioteca: 'biblioteca', ui_abrir: 'material', ui_meta: 'meta', ui_relogio: 'relogio', ui_trofeu: 'trofeu',
  ui_play: 'play', ui_parar: 'parar', ui_previa: 'olho', ui_olho: 'olho', ui_apagar: 'apagar', ui_fechar: 'fechar',
  ui_enviar: 'enviar', ui_baixar: 'baixar', ui_licenca: 'licenca'
};
const url3d = nome => `assets/ilustracoes/3d/${EM_3D[nome]}.webp`;
function img3d(cls, nome, tam, rotulo) {
  const el = document.createElement('img');
  el.className = cls + ' em-3d'; el.src = url3d(nome); el.alt = rotulo || ''; el.decoding = 'async'; el.loading = 'lazy';
  if (!rotulo) el.setAttribute('aria-hidden', 'true');
  if (tam) el.style.setProperty('--tam', tam + 'px');
  return el;
}
/** Ícone pequeno (botões e navegação): 3D quando houver (ui_<nome>), senão o provisório de linha. */
export const ico = (nome, rotulo) => EM_3D['ui_' + nome] ? img3d('ico', 'ui_' + nome, 0, rotulo) : UI[nome] ? svgEm('ico', L(UI[nome]), rotulo) : null;
/** Ilustração de um tipo de atividade (ou de uma entrada: e_planejar, e_conduzir…): 3D quando houver, senão o provisório. */
export function ilustra(nome, tam = 56, rotulo) {
  if (EM_3D[nome]) return img3d('ilu', nome, tam, rotulo);
  const d = TIPOS_ILU[nome]; if (!d) return null;
  const s = svgEm('ilu', `<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">${d}</svg>`, rotulo);
  s.style.setProperty('--tam', tam + 'px');
  return s;
}

/** Rótulos de botão → ícone (decoração automática, para todos os botões das telas). */
const POR_ROTULO = [
  [/^(Iniciar etapa|Começar|Iniciar|Simular)\b/, 'play'], [/^Encerrar (etapa|a sala|sala)/, 'parar'], [/^Abrir (a )?sala/, 'sala'], [/^Abrir telão|^Abrir o telão|^Mostrar$/, 'telao'],
  [/^Gerar atividade com IA|^Propor ajustes com IA|^Inserir texto/, 'ia'], [/^Revisar conteúdo|^Abrir proposta/, 'revisao'], [/^Ver como fica/, 'previa'], [/^Planilha$|planilha-modelo/i, 'planilha'], [/^JSON$/, 'json'], [/^Imprimir/, 'imprimir'], [/^Salvar|^Salvo/, 'salvar'], [/^Fechar$/, 'fechar'],
  [/^Criar$/, 'mais'], [/^＋|^\+ /, null], [/^Abrir$/, 'abrir'], [/^Abrir o caso piloto|^Usar o caso piloto/, 'abrir'], [/^Gerar prompt/, 'ia'], [/^Baixar/, 'baixar'], [/^Copiar$/, 'copiar'],
  [/^Revelar/, 'revelar'], [/^Sortear/, 'sortear'], [/^Entrar com Google|^Entrar \(modo ensaio/, 'sair'], [/^Entrar$|^Entrar com código|^Entrar na sala/, 'participar'], [/^Enviar|^Confirmar/, 'enviar'],
  [/^Próxima pergunta|^Passar para o grupo|^Ir para /, 'avancar'], [/^Recomeçar/, 'sortear'], [/^Área de condução/, 'conduzir'], [/^Planejar atividade/, 'planejar'], [/^Simulador/, 'simulador']
];
function decorar(btn) {
  if (btn.dataset.semIco !== undefined || btn.querySelector(':scope > .ico, :scope > .ilu')) return;
  const t = [...btn.childNodes].filter(n=>!(n instanceof Element && n.classList.contains('numero-fluxo'))).map(n=>n.textContent||'').join('').trim(); if (!t || t.length > 60) return;
  for (const [re, nome] of POR_ROTULO) if (re.test(t)) { if (nome) btn.prepend(ico(nome)); return; }
}
/** Coloca os ícones de [data-ico] e [data-ilu] e decora os botões (agora e quando a tela mudar). */
export function aplicarIcones(raiz = document) {
  const passar = el => {
    if (!(el instanceof Element)) return;
    for (const x of [el, ...el.querySelectorAll('[data-ico],[data-ilu],.btn')]) {
      if (x.dataset?.ico && !x.querySelector(':scope > .ico')) x.prepend(ico(x.dataset.ico) || '');
      if (x.dataset?.ilu && !x.querySelector(':scope > .ilu')) x.prepend(ilustra(x.dataset.ilu, Number(x.dataset.tam) || 56) || '');
      if (x.classList?.contains('btn')) decorar(x);
    }
  };
  passar(raiz.body || raiz);
  new MutationObserver(ms => { for (const m of ms) for (const n of m.addedNodes) passar(n); }).observe(raiz.body || raiz, { childList: true, subtree: true });
}
