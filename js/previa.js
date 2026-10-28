/* Mosaico Sala · Simular · só no PC (aberta pelo Planejamento, pela lista de atividades ou pela tela Simular)
   Tudo em modo ensaio, neste navegador: a condução (celular), o telão e uma turma
   simulada entram na mesma sala, já com a atividade escolhida. */
import { link, EM_ENSAIO } from './backend.js';

if (!EM_ENSAIO) { const u = new URL(location.href); u.searchParams.set('ensaio', '1'); location.replace(u.href); }
const $ = id => document.getElementById(id);
// Volta para onde veio: a tela Simular (escolher outra atividade) ou o planejamento (que abriu esta aba).
const DEMO = new URLSearchParams(location.search).has('demonstracao');   // veio da demonstração pública (sem conta)
if (new URLSearchParams(location.search).get('de') === 'simulador') {
  const v = $('voltar'); v.href = DEMO ? 'simulador.html?ensaio=1&demonstracao=1' : 'simulador.html'; v.lastChild.textContent = 'Escolher outra atividade';
}
// “Testar com meu celular” é o ensaio geral, com sala de verdade (fora do modo ensaio). Na demonstração não existe.
if (DEMO) $('comCelular').hidden = true;
let codigo = null, esperaSala = null;
const ETAPA = new URLSearchParams(location.search).get('etapa');   // “Ver esta etapa”: a condução já começa nela
// Os iframes focam campos e o navegador rola a página até eles; enquanto a turma entra, a página fica no topo.
let rolouSozinho = false, segurarTopo = 0;
for (const ev of ['wheel', 'touchmove', 'keydown', 'pointerdown']) addEventListener(ev, () => { rolouSozinho = true; }, { passive: true });
addEventListener('scroll', () => { if (!rolouSozinho && Date.now() < segurarTopo && scrollY > 0) scrollTo(0, 0); }, { passive: true });
const manterTopo = ms => { rolouSozinho = false; segurarTopo = Date.now() + ms; scrollTo(0, 0); };


function iniciar() {
  codigo = null;
  $('telao').innerHTML = ''; $('turma').innerHTML = '<p class="sutil">Os participantes aparecem assim que a sala abrir.</p>';
  $('conducao').src = link('conduzir.html', { previa: '1', t: Date.now(), ...(ETAPA ? { etapa: ETAPA } : {}) });
  $('info').textContent = 'Abrindo a sala de ensaio…';
}

function ajustarTelao() { const f = $('telao').querySelector('iframe'); if (f) f.style.transform = `scale(${$('telao').clientWidth / 1280})`; }
addEventListener('resize', ajustarTelao);
if ('ResizeObserver' in window) new ResizeObserver(ajustarTelao).observe($('telao'));   // recalcula também quando a coluna muda de largura

addEventListener('message', async e => {
  if(e.origin!==location.origin || e.source!==$('conducao').contentWindow) return;
  if(e.data?.tipo==='mosaico-previa-erro'){clearTimeout(esperaSala);$('info').textContent='Não foi possível abrir o ensaio: '+e.data.mensagem;return;}
  if(e.data?.tipo!=='mosaico-previa-sala'||codigo)return;
  clearTimeout(esperaSala);
  codigo = e.data.codigo;
  const t = document.createElement('iframe'); t.src = link('telao.html', { sala: codigo }); t.title = 'Telão'; t.allow = 'fullscreen'; t.allowFullscreen = true;
  $('telao').replaceChildren(t); ajustarTelao();
  $('turma').replaceChildren();
  const n = Math.min(20, Math.max(1, Number($('qtd').value) || 8));
  manterTopo(n * 250 + 6000);
  for (let i = 1; i <= n; i++) {
    const caixa = document.createElement('div'); caixa.className = 'pv-cel';
    const f = document.createElement('iframe'); f.title = 'Participante ' + i;
    f.src = link('participar.html', { sala: codigo, perfil: String(i), ...($('auto').checked ? { auto: '1' } : {}) });
    caixa.append(f); $('turma').append(caixa);
    await new Promise(r => setTimeout(r, 250));
  }
  $('info').textContent = ETAPA
    ? `Sala ${codigo} com ${n} participantes simulados. Os grupos são sorteados e a etapa começa sozinha.`
    : `Sala ${codigo} com ${n} participantes simulados. A primeira etapa começa automaticamente. Use Condução no painel do professor para encerrar a etapa e avançar.`;
});

$('auto').onchange = e => { for (const f of document.querySelectorAll('#turma iframe')) { try { f.contentWindow.mosaicoAuto?.(e.target.checked); } catch {} } };
$('recomecar').onclick = iniciar;
iniciar();
