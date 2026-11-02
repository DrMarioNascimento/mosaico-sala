/* Orientações da interface atual. O restante do manual continua privado no
   Firestore. Atualiza somente os três capítulos que descrevem a navegação. */
export function atualizarFluxoManual(raiz) {
  const capitulos = {
    professor: `<h2>5 Professor: os 8 passos</h2>
      <p>No painel, escolha <strong>Criar atividade</strong>, <strong>Ajustar uma atividade</strong> ou <strong>Aplicar em uma turma</strong>. A navegação superior mantém essas três entradas acessíveis.</p>
      <h3>1 · Entrar</h3><p>Use sua conta Google. Professores autorizados têm biblioteca em nuvem, salas on-line e geração integrada com IA.</p>
      <h3>2 · Inserir material</h3><p>Em Criar → A partir de um material, cole o texto ou importe PDF, Word, texto ou Markdown. Confira a extração. Arquivos digitalizados sem texto selecionável precisam de transcrição. O limite é de 60 mil caracteres.</p>
      <h3>3 · Planejar</h3><p>Informe público, tempo, objetivo, organização individual ou em grupos e como o material pode ser usado. A escolha de formatos é opcional.</p>
      <h3>4 · Gerar ou adaptar</h3><p>Solicite a proposta pela IA integrada, se sua conta estiver autorizada. Você também pode usar o pedido para IA externa, montar do zero, importar ou abrir um modelo em Ajustar. A geração integrada envia o texto ao Gemini somente quando solicitada.</p>
      <h3>5 · Revisar conteúdo</h3><p>Em Ajustar, use Continuar ou Abrir. Selecione Revisar conteúdo, abra cada etapa e confira o comando, as respostas e as justificativas. Marque as conferências e a confirmação geral de revisão. A validação da estrutura não verifica a correção científica.</p>
      <h3>6 · Simular</h3><p>O botão Simular no editor ou ao lado de uma atividade abre condução, telão e participantes fictícios. Use o painel de condução para encerrar cada etapa e iniciar a seguinte.</p>
      <h3>7 · Salvar e deixar pronta</h3><p>Depois da revisão, use Salvar na biblioteca e confirme Salvar. Com a confirmação geral marcada e a estrutura válida, a versão fica em Prontas. Antes disso, o salvamento guarda um rascunho em planejamento. Ajustes não concluídos preservam a versão pronta anterior.</p>
      <h3>8 · Aplicar</h3><p>Em Aplicar, escolha uma versão pronta ou um modelo. Confira turma, etapas e tempos antes de abrir a sala.</p>
      <p class="atencao">Rascunhos automáticos ficam neste navegador. A biblioteca permite recuperar em outro aparelho. Planilhas e impressões docentes incluem respostas esperadas: confira o material antes de entregá-lo aos alunos.</p>`,
    simular: `<h2>6 Simular antes da aula</h2>
      <h3>Demonstração pública</h3><p>Na página inicial, Quer conhecer antes? → Experimentar abre O mistério dos cones desaparecidos. É uma situação fictícia original, com quatro grupos, oito pistas e três etapas, sem login nem geração com IA.</p>
      <h3>Simular uma atividade</h3><p>Em Ajustar, clique em Simular ao lado do modelo ou da atividade. No editor, use Simular. A tela reúne o painel de condução, o telão e a turma fictícia. A primeira etapa começa automaticamente após a entrada dos participantes e a formação dos grupos.</p>
      <ol><li>Escolha a quantidade de participantes. Recomeçar aplica a quantidade escolhida e reinicia o ensaio.</li><li>Com Piloto automático marcado, os participantes fictícios respondem. Desmarque para interagir com os celulares simulados.</li><li>Na condução, use Encerrar etapa e depois Iniciar etapa para avançar. Um aviso pede confirmação se ainda faltarem respostas.</li><li>Ao fim, use Revelar resultado final para mostrar a meta e as justificativas.</li></ol>
      <p class="atencao">A sala do ensaio existe só neste navegador. O QR não conecta celulares físicos a ela. As respostas automáticas servem para testar o fluxo e podem incluir erros; não avaliam alunos.</p>
      <h3>Ensaio com celular físico</h3><p>Fora da demonstração pública, Testar com meu celular leva ao simulador de uma sala on-line. Abra uma sala real na área Aplicar, use o código no simulador e conduza pelo celular. Esse ensaio precisa de internet e autorização para abrir salas. Baixe o relatório antes de encerrar a sala.</p>`,
    aplicar: `<h2>7 Aplicar em sala, do QR ao resultado</h2>
      <p>Em Aplicar em uma turma, escolha uma atividade em Prontas ou um modelo. Se a atividade estiver Em planejamento, volte a Ajustar, confira a revisão, marque a confirmação geral e salve na biblioteca.</p>
      <h3>1 · Turma</h3><p>Informe a turma e selecione as etapas. Tempo das etapas selecionadas soma apenas as etapas marcadas. A duração sugerida da aula completa também reserva abertura, entrada e fechamento. Alterar o total redistribui os minutos entre as etapas selecionadas.</p>
      <h3>2 · Sala</h3><p>Use Abrir sala. Os alunos entram pelo QR ou código de seis números, sem cadastro. Acompanhe a entrada, abra o telão e use Formar grupos e começar quando a turma estiver pronta. Fechar a entrada impede novas entradas até você reabrir.</p>
      <h3>3 · Grupos</h3><p>Confira a distribuição e os representantes. Os grupos planejados são preservados; quem chega depois entra no grupo com menos participantes. Você pode mover participantes e trocar representantes.</p>
      <h3>4 · Condução</h3><p>Inicie cada etapa e acompanhe envios e tempo. Pausar cronômetro pausa o tempo sugerido, sem bloquear respostas. Encerre a etapa para avançar. Se faltar uma contribuição exigida, confira o aviso antes de registrar ausência e continuar.</p>
      <h3>Telão, resultado e encerramento</h3><p>Abra o telão e informe o código da sala. Ao concluir as etapas, revele o resultado final e discuta as justificativas. Baixe o relatório da aula antes de encerrar: o encerramento apaga os dados da sessão. Salas esquecidas vencem em até 24 horas.</p>`
  };
  for (const [id, html] of Object.entries(capitulos)) {
    const secao = raiz.querySelector('#' + id);
    if (!secao) continue;
    secao.innerHTML = html;
    secao.dataset.fluxoAtual = '2026-11-01';
  }
}
