import { before, after, test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, getDocs, collection, serverTimestamp, Timestamp } from 'firebase/firestore';
if(!process.env.FIRESTORE_EMULATOR_HOST) throw new Error('Execute apenas no emulador Firestore. Nenhum projeto real será usado.');
let env;
const google=email=>({email,email_verified:true,firebase:{sign_in_provider:'google.com'}});
const db=(uid,email)=>env.authenticatedContext(uid,email?google(email):{}).firestore();
before(async()=>{
 env=await initializeTestEnvironment({projectId:'demo-mosaico-sala',firestore:{rules:await readFile(new URL('../../firestore.rules',import.meta.url),'utf8')}});
 await env.withSecurityRulesDisabled(async c=>{
  const d=c.firestore();
  await setDoc(doc(d,'config/mestres'),{emails:['professor@exemplo.com']});
  await setDoc(doc(d,'rooms/123456'),{owner:'professor',status:'open',entradaAberta:true,fase:'etapa',etapaAtual:'e1',nomes:{aluno:'Aluno'},composicao:{g1:['aluno'],g2:['outro']},representantes:{g1:'aluno'},executores:{},leitoresExtra:{},revelacao:null,createdAt:Timestamp.now(),expiresAt:Timestamp.fromMillis(Date.now()+3600000)});
  await setDoc(doc(d,'rooms/123456/pacotes/g1'),{conteudo:'Do grupo 1'});
  await setDoc(doc(d,'rooms/123456/pacotes/g2'),{conteudo:'Do grupo 2',owner:'aluno'});
  await setDoc(doc(d,'biblioteca/privada'),{owner:'professor',autor:'Professor',titulo:'Privada',conteudo:'material docente',compartilhada:false,atualizadoEm:Timestamp.now()});
 });
});
after(async()=>{await env?.cleanup();});
test('Lista administrativa: anônimo e professor comum não leem; administrador verificado lê',async()=>{
 await assertFails(getDoc(doc(db('anonimo'),'config/mestres')));
 await assertFails(getDoc(doc(db('professor','professor@exemplo.com'),'config/mestres')));
 await assertSucceeds(getDoc(doc(db('admin','mariocnascimento@gmail.com'),'config/mestres')));
});
test('Ninguém se promove alterando a lista de mestres; administrador mantém o formato',async()=>{
 await assertFails(setDoc(doc(db('intruso','intruso@exemplo.com'),'config/mestres'),{emails:['intruso@exemplo.com']}));
 await assertFails(setDoc(doc(db('admin','mariocnascimento@gmail.com'),'config/mestres'),{emails:[],admin:true}));
});
test('E-mail sem verificação não concede administração',async()=>{
 const d=env.authenticatedContext('nao-verificado',{email:'mariocnascimento@gmail.com',email_verified:false,firebase:{sign_in_provider:'google.com'}}).firestore();
 await assertFails(getDoc(doc(d,'config/mestres')));
});
test('Professor autorizado continua criando sala sem poder atribuir a propriedade a outro',async()=>{
 const d=db('professor','professor@exemplo.com'); const dados={owner:'professor',status:'open',createdAt:serverTimestamp(),expiresAt:Timestamp.fromMillis(Date.now()+3600000)};
 await assertSucceeds(setDoc(doc(d,'rooms/654321'),dados));
 await assertFails(setDoc(doc(d,'rooms/654322'),{...dados,owner:'intruso'}));
 await assertFails(updateDoc(doc(d,'rooms/654321'),{owner:'intruso'}));
});
test('Copiar owner no pacote não permite ler nem escrever no grupo de outra pessoa',async()=>{
 const d=db('aluno'); await assertSucceeds(getDoc(doc(d,'rooms/123456/pacotes/g1')));
 await assertFails(getDoc(doc(d,'rooms/123456/pacotes/g2')));
 await assertFails(setDoc(doc(d,'rooms/123456/pacotes/g2'),{owner:'aluno',conteudo:'fraude'}));
});
test('Envio é autoral, vinculado à etapa e não pode ser sobrescrito',async()=>{
 const d=db('aluno');const envio={etapaId:'e1',escopo:'participante',grupoId:'g1',autor:'aluno',dados:{alternativaId:'a'},contingencia:false,enviadoEm:serverTimestamp()};
 await assertSucceeds(setDoc(doc(d,'rooms/123456/envios/e1__aluno'),envio));
 await assertFails(updateDoc(doc(d,'rooms/123456/envios/e1__aluno'),{dados:{alternativaId:'b'}}));
 await assertFails(setDoc(doc(d,'rooms/123456/envios/e2__aluno'),{...envio,etapaId:'e2'}));
 await assertFails(setDoc(doc(d,'rooms/123456/envios/e1__outro'),{...envio,autor:'outro'}));
});
test('Gabarito na biblioteca permanece privado para aluno e professor não autorizado',async()=>{
 await assertSucceeds(getDoc(doc(db('professor','professor@exemplo.com'),'biblioteca/privada')));
 await assertFails(getDoc(doc(db('aluno'),'biblioteca/privada')));
 await assertFails(getDoc(doc(db('intruso','intruso@exemplo.com'),'biblioteca/privada')));
});
test('Pacote órfão não autoriza escrita mesmo com owner forjado',async()=>{
 await assertFails(setDoc(doc(db('aluno'),'rooms/000000/pacotes/g1'),{owner:'aluno',conteudo:'fraude'}));
});

// ---------- Administração: os administradores fixos veem e apagam tudo; os demais continuam barrados ----------
const ADM = () => db('admin', 'mariocnascimento@gmail.com');
test('Administrador lê e apaga atividade privada de outro professor; professor comum não', async () => {
 await env.withSecurityRulesDisabled(async c => { await setDoc(doc(c.firestore(), 'biblioteca/alheia'), { owner: 'outro', autor: 'outro@exemplo.com', titulo: 'Alheia', conteudo: '{}', compartilhada: false, atualizadoEm: Timestamp.now() }); });
 await assertFails(getDoc(doc(db('professor', 'professor@exemplo.com'), 'biblioteca/alheia')));
 await assertFails(deleteDoc(doc(db('professor', 'professor@exemplo.com'), 'biblioteca/alheia')));
 await assertSucceeds(getDocs(collection(ADM(), 'biblioteca')));
 await assertSucceeds(getDoc(doc(ADM(), 'biblioteca/alheia')));
 await assertSucceeds(deleteDoc(doc(ADM(), 'biblioteca/alheia')));
});
test('Administrador não edita a atividade de outra pessoa (só lê e apaga)', async () => {
 await assertFails(updateDoc(doc(ADM(), 'biblioteca/privada'), { titulo: 'Mexida', atualizadoEm: serverTimestamp() }));
});
test('Só o administrador lista as salas', async () => {
 await assertFails(getDocs(collection(db('anonimo'), 'rooms')));
 await assertFails(getDocs(collection(db('professor', 'professor@exemplo.com'), 'rooms')));
 await assertSucceeds(getDocs(collection(ADM(), 'rooms')));
});
test('Administrador encerra sala de outro professor, com membros, pacotes e envios; professor comum não', async () => {
 await env.withSecurityRulesDisabled(async c => {
  const d = c.firestore();
  await setDoc(doc(d, 'rooms/777777'), { owner: 'outro', status: 'open', createdAt: Timestamp.now(), expiresAt: Timestamp.fromMillis(Date.now() + 3600000) });
  await setDoc(doc(d, 'rooms/777777/members/u1'), { nome: 'A', entrouEm: Timestamp.now() });
  await setDoc(doc(d, 'rooms/777777/pacotes/g1'), { conteudo: 'x' });
  await setDoc(doc(d, 'rooms/777777/envios/e1__u1'), { autor: 'u1' });
 });
 const prof = db('professor', 'professor@exemplo.com');
 await assertFails(deleteDoc(doc(prof, 'rooms/777777')));
 await assertFails(getDocs(collection(prof, 'rooms/777777/envios')));
 for (const sub of ['members', 'pacotes', 'envios']) {
  const s = await assertSucceeds(getDocs(collection(ADM(), `rooms/777777/${sub}`)));
  for (const x of s.docs) await assertSucceeds(deleteDoc(x.ref));
 }
 await assertSucceeds(deleteDoc(doc(ADM(), 'rooms/777777')));
});
test('Administrador sem e-mail verificado não lista salas nem apaga atividades', async () => {
 const d = env.authenticatedContext('falso', { email: 'mariocnascimento@gmail.com', email_verified: false, firebase: { sign_in_provider: 'google.com' } }).firestore();
 await assertFails(getDocs(collection(d, 'rooms')));
 await assertFails(deleteDoc(doc(d, 'biblioteca/privada')));
});
