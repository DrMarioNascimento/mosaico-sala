# Ergonomia docente e autoria por material — 25/10/2026

## Percurso do professor

- Entrada orientada: criar a partir de um texto, usar um modelo e continuar rascunhos.
- Material colado ou extraído localmente de TXT, Markdown, PDF com texto selecionável e Word DOCX. Até 12 MB por arquivo, 60 páginas no PDF e 60 mil caracteres no material. A extração precisa ser conferida pelo professor; não há OCR automático.
- Objetivo pedagógico, público, duração, organização e quantidade fixa de grupos. Formatos sugeridos pelo objetivo, com escolha manual opcional.
- Proposta antes de abrir o editor. O caminho com IA externa inclui o material no pedido e aceita a resposta diretamente na mesma janela.
- Firebase AI Logic configurado e habilitado em `js/ai-config.js`, com Gemini Developer API e App Check obrigatório. Não há chave privada Gemini no cliente. O titular ativou o plano Blaze e autorizou os termos dos serviços. Após um erro inicial de cota e os ajustes de faturamento feitos pelo titular, uma geração real foi concluída e aberta no editor com estrutura completa.
- O professor pode pedir ajustes de linguagem, leitura, alternativas, duração e sustentação no material. A aplicação da proposta é explícita e pode ser desfeita no editor.

## Edição e revisão

- Desfazer/refazer com histórico de até 40 estados nesta sessão. O histórico não substitui o salvamento.
- Rascunhos locais vinculados à conta e ao navegador, com recuperação de versões anteriores ao novo formato. Falhas de armazenamento são visíveis.
- Estado distinto para rascunho local e biblioteca em nuvem. Exportações e ferramentas secundárias agrupadas.
- Correção da sobreposição do menu lateral. Foco de teclado e avisos acessíveis.
- Preenchimento incompleto aparece como itens a completar. Uma atividade sem etapas não é considerada pronta.
- Revisão docente separada de validação estrutural. Conferência por etapa, fontes das evidências e resposta esperada. A IA não pode declarar o conteúdo revisado pelo professor.
- Mudanças de conteúdo invalidam a revisão. Trocar um formato avisa sobre substituição da configuração e do gabarito; a mudança pode ser desfeita.
- Prévia parcial: etapas futuras incompletas não impedem experimentar uma etapa pronta. Comparação usa contribuições fictícias explicitamente identificadas, somente no ensaio, sem alterar o plano original.
- Roteiro privado do professor por etapa, guardado em `docente.roteiro`. A planilha preserva esse roteiro e o material-base em uma aba Docente, dividindo textos longos em partes compatíveis com o Excel. Partes incompletas geram erro de importação, sem substituição silenciosa da atividade. A revisão deve ser confirmada novamente ao importar.

## Condução

- A etapa atual recebe roteiro curto; etapas concluídas ficam recolhidas.
- Grupos pendentes têm intervenções sob expansão; envios concluídos ficam compactos.
- A ação de encerrar a etapa permanece na barra inferior em tela de celular.
- Pausar/retomar o **cronômetro sugerido da etapa**, com +1 e +5 minutos, nos formatos investigação, comparação, questão individual e montagem. Isso não pausa os envios nem os cronômetros próprios dos jogos.
- Indicação de internet disponível/indisponível e orientação para manter a condução aberta. Esse indicador não equivale à confirmação de cada escrita pelo servidor.
- Concluir aula reúne discussão, exportação do relatório e encerramento com explicação do apagamento. Solicitar um download não comprova que o arquivo foi salvo no aparelho.
- Continuação no celular recupera uma atividade da biblioteca após autenticação; o QR docente não contém material nem dá acesso sem as regras de segurança. Ensaio local permanece no mesmo navegador.

## Firebase: resposta às recomendações de autorização

1. **Custom Claims:** podem reduzir leituras de autorização. A implantação exige um ambiente administrativo confiável, rotina de concessão/revogação e renovação dos tokens. Não foram ativadas nesta atualização; a lista de professores existente continua operante. Fazer a troca sem esse processo pode bloquear professores ou deixar acessos antigos válidos por mais tempo.
2. **Bootstrap:** os administradores fixos existentes exigem Google com e-mail verificado. A migração para claims deve preservar um caminho de recuperação administrativa. Não se cria uma função pública para alguém promover a própria conta.
3. **Consultas da sala:** não foram substituídas por um `owner` fornecido pelo cliente. A composição, os representantes e as contingências mudam durante a aula. Uma cópia de owner sem validação e revogação equivalentes não é autorização segura. Chamadas repetidas podem ser reaproveitadas na avaliação das regras; não se deve estimar o custo apenas contando chamadas no texto das funções.
4. **Lista de professores:** foi identificada uma exposição adicional: `config/mestres` era legível por qualquer login, inclusive anônimo. A leitura passa a exigir administrador; o uso interno da lista pelas regras continua permitido. Testes verificam que o professor autorizado ainda pode criar sala.
5. **Realtime Database:** a aplicação usa Firestore. O bloqueio de leitura e escrita relatado pelo usuário deve ser mantido; esta atualização não abre esse banco.

As regras são uma alteração dirigida que precisa de revisão, não uma garantia de segurança integral. Testes no emulador não equivalem a testes de toda a infraestrutura em produção.

## Estado da IA integrada em 25/10/2026

Gemini Developer API ativada pelo console autenticado, com autorização expressa do titular para os termos Gemini e Google Cloud. App web registrado no App Check com reCAPTCHA Enterprise (Fraud Defense), chave pública limitada a mosaico-sala.web.app e mosaico-sala.firebaseapp.com, validade do token de uma hora e sem desafio visual. App Check básico obrigatório para AI Logic e modo de usuários autenticados aplicado no serviço. Monitoramento opcional de IA desativado.

Modelo configurado: gemini-3.8-flash, conferido na documentação oficial. A integração exige login Google na interface; o texto só é enviado quando o professor solicita a geração. A configuração pública não contém chave privada da API Gemini. A atividade gerada continua sujeita à revisão humana.

Teste real no endereço publicado, em 25/10/2026: após o titular ajustar o faturamento, login Google, material fictício sobre retorno venoso pós-exercício, solicitação de 20 minutos e dois grupos, proposta recebida com três etapas (investigação, comparação e questão individual), estrutura validada e abertura no editor. Foram inspecionadas as respostas esperadas, justificativas e evidências de cada etapa. O editor preservou três pendências declaradas pela IA e não marcou a revisão docente como concluída. Esse teste confirma a integração de autoria; não equivale à validação científica automática nem à execução dessa nova atividade com turma real. Nenhum pagamento foi realizado pelo agente.

As regras restritivas do Firestore foram publicadas manualmente pelo console; a conta de serviço do fluxo automático ainda não tem permissão de publicação de regras (403). O site foi publicado pelo fluxo automático. A tentativa anterior de provisionamento via fonte de credenciais de metadados foi abandonada; a configuração foi feita pela interface autorizada.

## Verificação

- Testes puros do núcleo, dos modelos e das novas funções de autoria/histórico/relógio.
- Testes de aulas completas dos seis modelos existentes.
- Testes de autorização no emulador Firestore: leitura administrativa, autopromoção, propriedade, isolamento entre grupos, autoria dos envios e biblioteca privada.
- Inspeção manual no navegador do percurso material → pedido externo → proposta → editor → revisão → condução → resultado, além de desfazer/refazer e controles de tempo.
- Tela de 390 × 844 para a posição da ação principal; não equivale a teste em iPhone/Android físicos.

Leitores de arquivos carregados sob demanda: PDF.js (`pdfjs-dist` 6.4.299, Apache-2.0) e Mammoth 1.13.0 (BSD-2-Clause), preservadas as licenças dos respectivos projetos. Os documentos são processados no navegador; nenhuma extração executa código ou HTML do documento como interface.


## Orientação visual e imagens — 25/10/2026

A entrada do professor apresenta três passos: 1 inserir material, 2 revisar e experimentar, 3 aplicar em sala. A entrada dos alunos, o telão de apoio e o simulador ficam separados. O botão inicial abre o campo de material depois do login; um rascunho anterior é preservado ao iniciar uma nova proposta. No assistente, os três subpassos têm número, título e imagem; a geração permanece acessível na parte inferior. A condução identifica os quatro subpassos: atividade, sala, grupos e condução.

Foram selecionadas 30 imagens da pasta fornecida pelo titular, otimizadas para 256 × 256, preservando a proporção e a transparência original. Elas atendem a 43 posições de ilustrações e ícones, mantendo símbolos de ações sem substituto visual adequado. A origem de cada arquivo está em assets/ilustracoes/docente/origens.json. Os rótulos de texto continuam visíveis e as imagens decorativas não duplicam a leitura por tecnologias assistivas.

Validação: 113 testes do núcleo e sintaxe JavaScript; conferência da abertura direta do assistente, do botão de geração em tela de 390 × 844 e de imagens carregadas sem transbordamento horizontal. Não equivale a teste em aparelhos físicos.

## Sequência completa de preparação

A numeração é contínua: 1 entrar; 2 inserir material ou escolher um modelo; 3 planejar; 4 gerar com IA ou adaptar; 5 revisar conteúdo; 6 experimentar; 7 salvar; 8 aplicar em sala. As opções de modelo e retomada são alternativas do mesmo ponto de entrada, não etapas posteriores à criação por texto. A sequência completa aparece no início e pode ser expandida no assistente e no editor. Botões de geração, revisão, prévia e salvamento levam o número correspondente. A revisão termina com ações visíveis 6, 7 e 8; a liberação da sala respeita erros estruturais, revisão do conteúdo e autorização da conta. O ensaio orienta o retorno ao passo 7, e o salvamento indica o passo 8.


## Anexos e oficinas completas

A análise de imagem e o quebra-cabeça mostram uma confirmação persistente com prévia, nome, dimensões e remoção do anexo. Trocar uma imagem registra uma edição e permite desfazer. O original PDF/Word do assistente é identificado como material importado; a interface informa que a atividade guarda o texto extraído. A planilha preserva os nomes das imagens e o roteiro docente.

O tipo Montagem em peças passa a se chamar Quebra-cabeça: texto ou imagem. Botões de escolha tornam o modo imagem visível; o tipo efetivo aparece junto ao título livre da etapa. A montagem usa os aparelhos como peças físicas; Cartões de arrastar é a opção de quadro digital. O ensaio abre a primeira etapa e forma os grupos automaticamente.

Canção do Exílio e Citologia são bancos de 22 oficinas para vários encontros, com 13 tipos pertinentes aos conteúdos, imagens incorporadas e três finais na tomada de decisão. Escalas de personalidade e jogos econômicos não foram inseridos artificialmente nesses assuntos. O material de citologia distingue o PDF fornecido dos complementos conceituais nas fontes. A revisão docente permanece pendente; os exemplos não se declaram aprovados pelo professor.
