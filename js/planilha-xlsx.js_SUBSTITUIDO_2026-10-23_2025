/* MOSAICO · Leitura e escrita da planilha .xlsx no navegador (SheetJS, carregado só quando precisa). */
import { ABAS, atividadeParaAbas, abasParaAtividade } from './core/planilha.js';
import { lerJsonImportado } from './core/validacao.js';

const SHEETJS = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
let carregando = null;
function xlsx() {
  if (window.XLSX) return Promise.resolve(window.XLSX);
  return carregando ||= new Promise((ok, falha) => {
    const s = document.createElement('script'); s.src = SHEETJS; s.async = true;
    s.onload = () => ok(window.XLSX); s.onerror = () => { carregando = null; falha(new Error('Não foi possível carregar o leitor de planilhas. Confira a internet.')); };
    document.head.append(s);
  });
}

const INSTRUCOES = [
  ['MOSAICO · planilha da atividade'],
  [''],
  ['Cada aba guarda uma parte da atividade. Não mude o nome das abas nem das colunas.'],
  ['Atividade: dados gerais, meta (meta_limiar em %), guia e pendências (um item por linha dentro da célula).'],
  ['Grupos: no máximo 10. A coluna ordem define o ícone e quem recebe os excedentes no sorteio.'],
  ['Etapas: tipo = investigacao_fragmentos | comparar_hipoteses | questao_individual. recebe_de = id da etapa anterior que alimenta esta.'],
  ['Opcoes: hipóteses e alternativas de cada etapa. Marque com x a correta (só nas etapas com gabarito).'],
  ['Pecas: grupos separados por ponto e vírgula. natureza = citacao | parafrase | inferencia | sintetico.'],
  ['Fontes: referências usadas pelas peças.'],
  [''],
  ['ATENÇÃO: esta planilha contém o gabarito (coluna correta e explicacao). Não distribua aos participantes.'],
  ['Use casos fictícios: não coloque nomes, CPF, telefone ou e-mail de pessoas reais.']
];

/** Lê .xlsx ou .json e devolve {atividade?, diagnosticos[]} (diagnósticos de leitura). */
export async function lerArquivoAtividade(arquivo) {
  if (/\.json$/i.test(arquivo.name) || arquivo.type === 'application/json') return lerJsonImportado(await arquivo.text());
  const X = await xlsx();
  const wb = X.read(await arquivo.arrayBuffer(), { type: 'array' });
  const abas = {};
  for (const nome of wb.SheetNames) if (nome !== 'Instrucoes') abas[nome] = X.utils.sheet_to_json(wb.Sheets[nome], { defval: '', raw: false });
  const { atividade, problemas } = abasParaAtividade(abas);
  return { atividade, diagnosticos: problemas.map(m => ({ severidade: 'erro', local: 'planilha', mensagem: m })) };
}

/** Gera e baixa a planilha .xlsx da atividade. */
export async function baixarPlanilha(atividade) {
  const X = await xlsx();
  const abas = atividadeParaAbas(atividade);
  const wb = X.utils.book_new();
  const inst = X.utils.aoa_to_sheet(INSTRUCOES); inst['!cols'] = [{ wch: 120 }];
  X.utils.book_append_sheet(wb, inst, 'Instrucoes');
  const larguras = { conteudo: 80, texto: 70, instrucao: 50, introducao: 60, valor: 80, descricao: 50, explicacao: 60, pergunta: 50, enunciado: 50, titulo: 30, nome: 26, funcao: 40 };
  for (const [nome, colunas] of Object.entries(ABAS)) {
    const ws = X.utils.json_to_sheet(abas[nome], { header: colunas });
    ws['!cols'] = colunas.map(c => ({ wch: larguras[c] || 14 }));
    X.utils.book_append_sheet(wb, ws, nome);
  }
  X.writeFile(wb, (atividade.id || 'atividade') + '.xlsx');
}

/** Planilha-modelo vazia (para quem prefere montar direto no Excel). */
export async function baixarModelo(modelo) { return baixarPlanilha(modelo); }
