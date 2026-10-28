/* Mosaico Sala · Lista de mestres (quem pode guardar atividades na biblioteca e abrir salas on-line).
   ADMINS repete os e-mails fixos de firestore.rules (função fixos()): mude nos dois lugares juntos. */

export const ADMINS = ['mariocnascimento@gmail.com', 'ramonmelo.com@gmail.com'];

export const ehAdmin = email => ADMINS.includes(String(email || '').trim().toLowerCase());

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Normaliza o que foi digitado (um ou vários e-mails separados por vírgula, espaço ou linha). */
export function lerEmails(texto) {
  const todos = String(texto || '').split(/[\s,;]+/).map(x => x.trim().toLowerCase()).filter(Boolean);
  return { validos: [...new Set(todos.filter(x => EMAIL.test(x)))], invalidos: todos.filter(x => !EMAIL.test(x)) };
}
