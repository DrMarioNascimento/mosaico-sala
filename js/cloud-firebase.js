/* Mosaico Sala · Backend Firebase (Firestore + Auth), SDK 12.3.0 por CDN, como no Eita!.
   Estrutura:
     rooms/{codigo}                 estado público da sala (sem material docente)
     rooms/{codigo}/members/{uid}   nome de quem entrou
     rooms/{codigo}/pacotes/{id}    projeção da etapa atual por grupo (ou "individual")
     rooms/{codigo}/envios/{id}     envios (só criação; nunca sobrescreve)            */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js';
import { getAuth, signInAnonymously, GoogleAuthProvider, signInWithPopup, signOut } from 'https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js';
import { getFirestore, doc, collection, getDoc, getDocs, setDoc, updateDoc, deleteDoc, onSnapshot, runTransaction, serverTimestamp, Timestamp, writeBatch, query, where } from 'https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.js';

// ?perfil=N (simulador de aula): cada "celular" simulado usa uma instância própria do Firebase,
// com login anônimo próprio — vira um participante diferente, e se mantém ao recarregar.
const PERFIL = new URLSearchParams(location.search).get('perfil');
const app = PERFIL ? initializeApp(firebaseConfig, 'perfil-' + PERFIL.replace(/\W/g, '')) : initializeApp(firebaseConfig);
const auth = getAuth(app), db = getFirestore(app);
const sala = c => doc(db, 'rooms', c);
const google = u => !!u?.providerData.some(p => p.providerId === 'google.com');

/* Prazo da sala (expiresAt) repetido em membros, pacotes e envios: a política de TTL do Firestore apaga
   cada documento vencido sozinha, mesmo que o professor nunca volte (o TTL não apaga subcoleções). */
const prazos = new Map();
async function prazoDe(c) {
  if (!prazos.has(c)) { const s = await getDoc(sala(c)); prazos.set(c, s.exists() ? s.data().expiresAt || null : null); }
  return prazos.get(c);
}
/** Grava com o prazo; se as regras publicadas ainda não aceitam o campo, grava sem ele (aluno nunca fica de fora). */
async function comPrazo(c, gravar) {
  const p = await prazoDe(c).catch(() => null);
  if (!p) return gravar({});
  try { return await gravar({ expiresAt: p }); }
  catch (e) { if (e?.code === 'permission-denied' || e?.message === 'recusado') return gravar({}); throw e; }
}

export const backend = {
  modo: 'firebase',

  async identificar() {
    await auth.authStateReady();
    if (!auth.currentUser) await signInAnonymously(auth);
    return auth.currentUser.uid;
  },

  /** Chamar direto no toque do botão (antes de qualquer await), senão o iPhone bloqueia o pop-up. */
  entrarGoogle() {
    const u = auth.currentUser;
    const p = google(u) ? Promise.resolve(u) : signInWithPopup(auth, new GoogleAuthProvider()).then(c => c.user);
    return p.then(u => ({ uid: u.uid, email: u.email }));
  },
  sair() { return signOut(auth); },

  async contaAtual() {
    await auth.authStateReady();
    const u = auth.currentUser;
    return google(u) ? { uid: u.uid, email: u.email } : null;
  },

  async criarSala(dados) {
    for (let t = 0; t < 6; t++) {
      const codigo = String(100000 + crypto.getRandomValues(new Uint32Array(1))[0] % 900000);
      try {
        await runTransaction(db, async tx => {
          if ((await tx.get(sala(codigo))).exists()) throw new Error('colisao');
          const expiresAt = Timestamp.fromMillis(Date.now() + 24 * 3600e3);
          tx.set(sala(codigo), { ...dados, createdAt: serverTimestamp(), expiresAt });
          prazos.set(codigo, expiresAt);
        });
        return codigo;
      } catch (e) { if (e.message !== 'colisao') throw e; }
    }
    throw new Error('Não foi possível gerar um código de sala.');
  },

  async lerSala(c) { const s = await getDoc(sala(c)); if (s.exists() && s.data().expiresAt) prazos.set(c, s.data().expiresAt); return s.exists() ? s.data() : null; },
  observarSala(c, cb, erro) { return onSnapshot(sala(c), s => cb(s.exists() ? s.data() : null), erro); },
  atualizarSala(c, patch) { return updateDoc(sala(c), patch); },

  async lerMembro(c, uid) { const s = await getDoc(doc(sala(c), 'members', uid)); return s.exists() ? s.data() : null; },
  entrar(c, uid, nome) { return comPrazo(c, extra => setDoc(doc(sala(c), 'members', uid), { nome, entrouEm: Date.now(), ...extra })); },
  observarMembros(c, cb, erro) { return onSnapshot(collection(sala(c), 'members'), s => cb(s.docs.map(d => ({ uid: d.id, ...d.data() }))), erro); },

  gravarPacote(c, id, dados) { return comPrazo(c, extra => setDoc(doc(sala(c), 'pacotes', id), { ...dados, ...extra })); },
  observarPacote(c, id, cb, erro) { return onSnapshot(doc(sala(c), 'pacotes', id), s => cb(s.exists() ? s.data() : null), erro); },

  async enviar(c, id, dados) { return comPrazo(c, extra => this.enviarSemPrazo(c, id, { ...dados, ...extra })); },
  async enviarSemPrazo(c, id, dados) {
    const ref = doc(sala(c), 'envios', id);
    // A regra deixa ler um envio inexistente ou o próprio; nunca permite sobrescrever.
    try {
      await runTransaction(db, async tx => {
        if ((await tx.get(ref)).exists()) throw new Error('ja-enviado');
        tx.set(ref, { ...dados, enviadoEm: serverTimestamp() });
      });
    } catch (e) {
      if (e.message === 'ja-enviado') throw e;
      throw e.code === 'permission-denied' ? new Error('recusado') : e;
    }
  },
  observarEnvios(c, cb, erro) { return onSnapshot(collection(sala(c), 'envios'), s => cb(s.docs.map(d => ({ id: d.id, ...d.data() }))), erro); },

  // ---------- biblioteca fechada (só contas da lista de mestres; regras no firestore.rules) ----------
  /** Lista as atividades da própria conta e as compartilhadas entre mestres. Recusa = conta não autorizada. */
  async listarBiblioteca() {
    const u = auth.currentUser; if (!u) throw new Error('sem-login');
    const col = collection(db, 'biblioteca');
    const [minhas, comp] = await Promise.all([getDocs(query(col, where('owner', '==', u.uid))), getDocs(query(col, where('compartilhada', '==', true)))]);
    const mapa = new Map();
    for (const d of [...minhas.docs, ...comp.docs]) mapa.set(d.id, { id: d.id, ...d.data(), minha: d.data().owner === u.uid });
    return [...mapa.values()].map(x => ({ ...x, atualizadoEm: x.atualizadoEm?.toMillis?.() ?? 0 })).sort((x, y) => y.atualizadoEm - x.atualizadoEm);
  },
  async lerBiblioteca(id) { const s = await getDoc(doc(db, 'biblioteca', id)); return s.exists() ? { id, ...s.data() } : null; },
  /** Salva (cria ou atualiza). Devolve o id. */
  async salvarBiblioteca(id, { titulo, conteudo, compartilhada = false, autor = '', fechado = undefined, rascunho = undefined, modo = 'nova' }) {
    const u = auth.currentUser;
    const ref = id ? doc(db, 'biblioteca', id) : doc(collection(db, 'biblioteca'));
    const base = { owner: u.uid, autor, titulo, compartilhada: !!compartilhada, atualizadoEm: serverTimestamp() };
    if (modo === 'rascunho' && id) {
      try { await updateDoc(ref, { rascunho: rascunho ?? conteudo, atualizadoEm: serverTimestamp() }); }
      catch (e) {
        if (e?.code === 'permission-denied') throw new Error('Para guardar o ajuste sem substituir a versão fechada, publique as regras novas do Firestore (firestore.rules).');
        throw e;
      }
      return ref.id;
    }
    const corpo = modo === 'fechar'
      ? { conteudo, fechado: conteudo, rascunho: null }
      : { conteudo, fechado: fechado ?? null, rascunho: rascunho ?? null };
    try { await setDoc(ref, { ...base, ...corpo }); }
    catch (e) {
      if (e?.code !== 'permission-denied') throw e;
      await setDoc(ref, { ...base, conteudo });
    }
    return ref.id;
  },
  apagarBiblioteca(id) { return deleteDoc(doc(db, 'biblioteca', id)); },

  async listarAplicacoes() {
    const u = auth.currentUser; if (!u) throw new Error('sem-login');
    const s = await getDocs(query(collection(db, 'aplicacoes'), where('owner', '==', u.uid)));
    return s.docs.map(d => ({ id: d.id, ...d.data(), atualizadoEm: d.data().atualizadoEm?.toMillis?.() ?? 0 })).sort((x, y) => y.atualizadoEm - x.atualizadoEm);
  },
  async lerAplicacao(id) { const s = await getDoc(doc(db, 'aplicacoes', id)); return s.exists() ? { id, ...s.data() } : null; },
  async salvarAplicacao(id, dados) {
    const u = auth.currentUser;
    const ref = id ? doc(db, 'aplicacoes', id) : doc(collection(db, 'aplicacoes'));
    await setDoc(ref, { owner: u.uid, autor: dados.autor || '', titulo: dados.titulo || '', turma: dados.turma || '', origemTipo: dados.origemTipo, origemId: dados.origemId, etapas: dados.etapas, atualizadoEm: serverTimestamp() });
    return ref.id;
  },
  apagarAplicacao(id) { return deleteDoc(doc(db, 'aplicacoes', id)); },

  // ---------- manual do professor (só mestres leem; só administradores publicam; regras no firestore.rules) ----------
  async lerManual() { const s = await getDoc(doc(db, 'manual', 'atual')); if (!s.exists()) return null; const x = s.data(); return { ...x, atualizadoEm: x.atualizadoEm?.toMillis?.() ?? 0 }; },
  salvarManual({ html, versao = '', autor = '' }) { return setDoc(doc(db, 'manual', 'atual'), { html, versao, autor, atualizadoEm: serverTimestamp() }); },

  // ---------- administração (só os administradores fixos; regras no firestore.rules) ----------
  /** Todas as atividades de todos os professores, com o conteúdo para abrir e o tamanho. */
  async listarTodaBiblioteca() {
    const s = await getDocs(collection(db, 'biblioteca'));
    return s.docs.map(d => ({ id: d.id, ...d.data(), atualizadoEm: d.data().atualizadoEm?.toMillis?.() ?? 0 })).sort((x, y) => y.atualizadoEm - x.atualizadoEm);
  },
  /** Salas desta conta, em qualquer aparelho (para a faxina das vencidas). Regras antigas recusam: devolve []. */
  async listarMinhasSalas() {
    const u = auth.currentUser; if (!u) return [];
    try {
      const s = await getDocs(query(collection(db, 'rooms'), where('owner', '==', u.uid)));
      return s.docs.map(d => { const x = d.data(); return { codigo: d.id, status: x.status, venceEm: x.expiresAt?.toMillis?.() ?? 0, criadaEm: x.createdAt?.toMillis?.() ?? 0, titulo: x.publico?.titulo || '', participantes: Object.keys(x.nomes || {}).length }; });
    } catch { return []; }
  },
  /** Todas as salas, abertas ou esquecidas (o servidor não apaga sozinho as vencidas). */
  async listarSalas() {
    const s = await getDocs(collection(db, 'rooms'));
    return s.docs.map(d => { const x = d.data(); return { codigo: d.id, owner: x.owner, status: x.status, fase: x.fase || '', titulo: x.publico?.titulo || '', participantes: Object.keys(x.nomes || {}).length,
      criadaEm: x.createdAt?.toMillis?.() ?? 0, venceEm: x.expiresAt?.toMillis?.() ?? 0 }; }).sort((x, y) => y.criadaEm - x.criadaEm);
  },

  // ---------- lista de mestres (só administradores gravam; regras no firestore.rules) ----------
  async lerMestres() { const s = await getDoc(doc(db, 'config', 'mestres')); return s.exists() ? (s.data().emails || []) : []; },
  salvarMestres(emails) { return setDoc(doc(db, 'config', 'mestres'), { emails }); },

  /** Encerrar apaga tudo da sessão: envios, pacotes, membros e a sala. */
  async apagarSala(c) {
    for (const nome of ['envios', 'pacotes', 'members']) {
      const docs = (await getDocs(collection(sala(c), nome))).docs;
      for (let i = 0; i < docs.length; i += 400) { const b = writeBatch(db); docs.slice(i, i + 400).forEach(d => b.delete(d.ref)); await b.commit(); }
    }
    const b = writeBatch(db); b.delete(sala(c)); await b.commit();
  }
};
