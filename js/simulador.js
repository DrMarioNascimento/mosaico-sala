/* MOSAICO · Simulador de aula no PC
   Mostra o telão e vários celulares simulados entrando na sala REAL.
   Quem conduz comanda tudo pelo próprio celular. Cada celular simulado é um
   participante independente (login anônimo próprio, ?perfil=N). */
import { link } from './backend.js';

const $ = id => document.getElementById(id);
const params = new URLSearchParams(location.search);
$('codigo').value = params.get('sala') || '';
let total = 0, codigo = null;
// Os celulares simulados focam campos dentro dos próprios iframes, e o navegador rola a página até eles,
// escondendo o telão sob a barra. Enquanto a turma entra, a página fica no topo, a menos que a pessoa role.
let rolouSozinho = false, segurarTopo = 0;
for (const ev of ['wheel', 'touchmove', 'keydown', 'pointerdown']) addEventListener(ev, () => { rolouSozinho = true; }, { passive: true });
addEventListener('scroll', () => { if (!rolouSozinho && Date.now() < segurarTopo && scrollY > 0) scrollTo(0, 0); }, { passive: true });
const manterTopo = ms => { rolouSozinho = false; segurarTopo = Date.now() + ms; scrollTo(0, 0); };

function ajustarTelao() {
  const box = $('telao'), f = box.querySelector('iframe');
  if (f) f.style.transform = `scale(${box.clientWidth / 1280})`;
}
addEventListener('resize', ajustarTelao);

function celular(n) {
  const url = link('participar.html', { sala: codigo, perfil: String(n), ...($('autoTodos').checked ? { auto: '1' } : {}) });
  const caixa = document.createElement('div'); caixa.className = 'sim-celular';
  const f = document.createElement('iframe'); f.src = url; f.title = 'Participante simulado ' + n;
  const r = document.createElement('span'); r.className = 'rotulo'; r.textContent = '#' + n;
  caixa.append(f, r); $('celulares').append(caixa);
}

$('iniciar').onclick = async () => {
  const c = $('codigo').value.trim();
  if (!/^\d{6}$/.test(c)) { $('info').textContent = 'Digite o código de 6 números da sala.'; return; }
  codigo = c; total = 0;
  const url = new URL(location.href); url.searchParams.set('sala', c); history.replaceState(null, '', url);
  $('telao').hidden = false;
  $('telao').innerHTML = '';
  const t = document.createElement('iframe'); t.src = link('telao.html', { sala: c }); t.title = 'Telão';
  $('telao').append(t); ajustarTelao();
  $('celulares').innerHTML = '';
  const n = Math.min(30, Math.max(1, Number($('qtd').value) || 12));
  manterTopo(n * 500 + 6000);
  $('info').textContent = `Entrando ${n} participantes simulados…`;
  // entradas espaçadas, como numa sala de verdade (e para não sobrecarregar o login)
  for (let i = 1; i <= n; i++) { celular(++total); await new Promise(r => setTimeout(r, 500)); }
  $('info').textContent = `${n} participantes simulados na sala ${c}. Conduza pelo celular.`;
};

$('mais').onclick = () => { if (codigo) { celular(++total); $('info').textContent = `${total} participantes simulados.`; } };

$('autoTodos').onchange = e => {
  for (const f of document.querySelectorAll('.sim-celular iframe')) { try { f.contentWindow.mosaicoAuto?.(e.target.checked); } catch {} }
};

$('escala').onchange = e => document.documentElement.style.setProperty('--esc', e.target.value);

if ($('codigo').value && params.has('auto')) $('iniciar').click();
