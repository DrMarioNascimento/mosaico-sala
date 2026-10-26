/* MOSAICO · Backend Firebase (Firestore + Auth), SDK 12.3.0 por CDN, como no Eita!.
   Estrutura:
     rooms/{codigo}                 estado público da sala (sem material docente)
     rooms/{codigo}/members/{uid}   nome de quem entrou
     rooms/{codigo}/pacotes/{id}    projeção da etapa atual por grupo (ou "individual")
     rooms/{codigo}/envios/{id}     envios (só criação; nunca sobrescreve)            */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js';
import { getAuth, signInAnonymously, GoogleAuthProvider, signInWithPopup } from 'https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js';
import { getFirestore, doc, collection, getDoc, getDocs, setDoc, updateDoc, deleteDoc, onSnapshot, runTransaction, serverTimestamp, Timestamp, writeBatch, query, where } from 'https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.js';

// ?perfil=N (simulador de aula): cada "celular" simulado usa uma instância própria do Firebase,
// com login anônimo próprio — vira um participante diferente, e se mantém ao recarregar.
const PERFIL = new URLSearchParams(location.search).get('perfil');
const app = PERFIL ? initializeApp(firebaseConfig, 'perfil-' + PERFIL.replace(/\W/g, '')) : initializeApp(firebaseConfig);
const auth = getAuth(app), db = getFirestore(app);
const sala = c => doc(db, 'rooms', c);
const google = u => !!u?.providerData.some(p => p.providerId === 'google.com');

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
          tx.set(sala(codigo), { ...dados, createdAt: serverTimestamp(), expiresAt: Timestamp.fromMillis(Date.now() + 24 * 3600e3) });
        });
        return codigo;
      } catch (e) { if (e.message !== 'colisao') throw e; }
    }
    throw new Error('Não foi possível gerar um código de sala.');
  },

  async lerSala(c) { const s = await getDoc(sala(c)); return s.exists() ? s.data() : null; },
  observarSala(c, cb, erro) { return onSnapshot(sala(c), s => cb(s.exists() ? s.data() : null), erro); },
  atualizarSala(c, patch) { return updateDoc(sala(c), patch); },

  async lerMembro(c, uid) { const s = await getDoc(doc(sala(c), 'members', uid)); return s.exists() ? s.data() : null; },
  entrar(c, uid, nome) { return setDoc(doc(sala(c), 'members', uid), { nome, entrouEm: Date.now() }); },
  observarMembros(c, cb, erro) { return onSnapshot(collection(sala(c), 'members'), s => cb(s.docs.map(d => ({ uid: d.id, ...d.data() }))), erro); },

  gravarPacote(c, id, dados) { return setDoc(doc(sala(c), 'pacotes', id), dados); },
  observarPacote(c, id, cb, erro) { return onSnapshot(doc(sala(c), 'pacotes', id), s => cb(s.exists() ? s.data() : null), erro); },

  async enviar(c, id, dados) {
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
  async salvarBiblioteca(id, { titulo, conteudo, compartilhada = false, autor = '' }) {
    const u = auth.currentUser;
    const ref = id ? doc(db, 'biblioteca', id) : doc(collection(db, 'biblioteca'));
    await setDoc(ref, { owner: u.uid, autor, titulo, conteudo, compartilhada: !!compartilhada, atualizadoEm: serverTimestamp() });
    return ref.id;
  },
  apagarBiblioteca(id) { return deleteDoc(doc(db, 'biblioteca', id)); },

  // ---------- administração (só os administradores fixos; regras no firestore.rules) ----------
  /** Todas as atividades de todos os professores, com o conteúdo para abrir e o tamanho. */
  async listarTodaBiblioteca() {
    const s = await getDocs(collection(db, 'biblioteca'));
    return s.docs.map(d => ({ id: d.id, ...d.data(), atualizadoEm: d.data().atualizadoEm?.toMillis?.() ?? 0 })).sort((x, y) => y.atualizadoEm - x.atualizadoEm);
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
