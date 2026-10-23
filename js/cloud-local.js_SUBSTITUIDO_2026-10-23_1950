/* MOSAICO · Backend de ensaio (?ensaio)
   Mesma interface do Firebase, mas tudo fica no localStorage deste navegador.
   Abas diferentes = pessoas diferentes (cada aba tem seu uid na sessionStorage).
   Avisos entre abas pelo evento 'storage'. Nada sai do computador. */

const PREFIXO = 'mosaico-ensaio:';
const ouvintes = new Set();

function ler(chave) { try { return JSON.parse(localStorage.getItem(PREFIXO + chave) || 'null'); } catch { return null; } }
function gravar(chave, valor) {
  if (valor === null) localStorage.removeItem(PREFIXO + chave); else localStorage.setItem(PREFIXO + chave, JSON.stringify(valor));
  queueMicrotask(() => ouvintes.forEach(f => f(PREFIXO + chave)));
}
function chaves(prefixo) {
  const out = [];
  for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith(PREFIXO + prefixo)) out.push(k.slice(PREFIXO.length)); }
  return out;
}
addEventListener('storage', e => { if (e.key && e.key.startsWith(PREFIXO)) ouvintes.forEach(f => f(e.key)); });

function observar(teste, emitir) {
  const f = k => { if (teste(k.slice(PREFIXO.length))) emitir(); };
  ouvintes.add(f); queueMicrotask(emitir);
  return () => ouvintes.delete(f);
}

const PERFIL = new URLSearchParams(location.search).get('perfil');
function meuUid() {
  const k = 'mosaico-ensaio-uid' + (PERFIL ? '-' + PERFIL : '');
  let u = sessionStorage.getItem(k);
  if (!u) { u = 'u' + Math.random().toString(36).slice(2, 10); sessionStorage.setItem(k, u); }
  return u;
}

export const backend = {
  modo: 'ensaio',
  async identificar() { return meuUid(); },
  entrarGoogle() { return Promise.resolve({ uid: meuUid(), email: 'ensaio@local' }); },
  async contaAtual() { return sessionStorage.getItem('mosaico-ensaio-conduz') ? { uid: meuUid(), email: 'ensaio@local' } : null; },

  async criarSala(dados) {
    sessionStorage.setItem('mosaico-ensaio-conduz', '1');
    let c;
    do c = String(100000 + Math.floor(Math.random() * 900000)); while (ler('rooms/' + c));
    gravar('rooms/' + c, { ...dados, createdAt: Date.now(), expiresAt: Date.now() + 864e5 });
    return c;
  },
  async lerSala(c) { return ler('rooms/' + c); },
  observarSala(c, cb) { return observar(k => k === 'rooms/' + c, () => cb(ler('rooms/' + c))); },
  async atualizarSala(c, patch) { const s = ler('rooms/' + c); if (!s) throw new Error('Sala inexistente'); gravar('rooms/' + c, { ...s, ...patch }); },

  async lerMembro(c, uid) { return ler(`rooms/${c}/members/${uid}`); },
  async entrar(c, uid, nome) {
    const s = ler('rooms/' + c);
    if (!s || s.status === 'closed' || !s.entradaAberta) throw new Error('recusado');
    gravar(`rooms/${c}/members/${uid}`, { nome, entrouEm: Date.now() });
  },
  observarMembros(c, cb) {
    const p = `rooms/${c}/members/`;
    return observar(k => k.startsWith(p), () => cb(chaves(p).map(k => ({ uid: k.slice(p.length), ...ler(k) }))));
  },

  async gravarPacote(c, id, dados) { gravar(`rooms/${c}/pacotes/${id}`, dados); },
  observarPacote(c, id, cb) { const k0 = `rooms/${c}/pacotes/${id}`; return observar(k => k === k0, () => cb(ler(k0))); },

  async enviar(c, id, dados) {
    const k = `rooms/${c}/envios/${id}`;
    if (ler(k)) throw new Error('ja-enviado');
    const s = ler('rooms/' + c);
    if (!s || s.fase !== 'etapa' || s.etapaAtual !== dados.etapaId) {
      if (!(s && s.owner === dados.autor)) throw new Error('recusado');
    }
    gravar(k, { ...dados, enviadoEm: Date.now() });
  },
  observarEnvios(c, cb) {
    const p = `rooms/${c}/envios/`;
    return observar(k => k.startsWith(p), () => cb(chaves(p).map(k => ({ id: k.slice(p.length), ...ler(k) }))));
  },
  async apagarSala(c) { chaves(`rooms/${c}`).forEach(k => gravar(k, null)); }
};
