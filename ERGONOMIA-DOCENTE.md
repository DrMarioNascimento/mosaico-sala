# Ergonomia docente e autoria por material — 25/10/2026

## Percurso do professor

- Entrada orientada: criar a partir de um texto, usar um modelo e continuar rascunhos.
- Material colado ou extraído localmente de TXT, Markdown, PDF com texto selecionável e Word DOCX. Até 12 MB por arquivo, 60 páginas no PDF e 60 mil caracteres no material. A extração precisa ser conferida pelo professor; não há OCR automático.
- Objetivo pedagógico, público, duração, organização e quantidade fixa de grupos. Formatos sugeridos pelo objetivo, com escolha manual opcional.
- Proposta antes de abrir o editor. O caminho com IA externa inclui o material no pedido e aceita a resposta diretamente na mesma janela.
- A integração Firebase AI Logic está implementada, porém **desativada em `js/ai-config.js`** até concluir o provisionamento do serviço e o App Check. Não há chave privada Gemini no cliente. Nenhuma alteração de plano ou faturamento foi implementada.
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
- Roteiro privado do professor por etapa, guardado em `docente.roteiro`.

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

## Ativação da geração integrada, sem mudança de plano

No projeto **mosaico-sala**, concluir o fluxo oficial do Firebase AI Logic com Gemini Developer API e registrar o aplicativo web no App Check com reCAPTCHA Enterprise. Manter o projeto no Spark; se aparecer requisito de faturamento ou aceite de termos, o titular deve revisar antes de continuar.

Após confirmar a proteção e a disponibilidade, preencher a chave pública de site em `js/ai-config.js`, habilitar a integração e verificar uma geração real com texto fictício de teste. Modelo configurado: `gemini-3.8-flash`, listado pela documentação oficial como disponível sem exigência de Blaze em 25/10/2026. Não ativar a integração sem App Check. Limites e disponibilidade do provedor continuam aplicáveis.

O provisionamento automático foi interrompido pela revisão de aprovação ao tentar obter credenciais por uma fonte de metadados não prevista. A alternativa pendente é configuração pelo console autenticado e explicitamente autorizado; não foram contornadas as restrições.

## Verificação

- Testes puros do núcleo, dos modelos e das novas funções de autoria/histórico/relógio.
- Testes de aulas completas dos seis modelos existentes.
- Testes de autorização no emulador Firestore: leitura administrativa, autopromoção, propriedade, isolamento entre grupos, autoria dos envios e biblioteca privada.
- Inspeção manual no navegador do percurso material → pedido externo → proposta → editor → revisão → condução → resultado, além de desfazer/refazer e controles de tempo.
- Tela de 390 × 844 para a posição da ação principal; não equivale a teste em iPhone/Android físicos.

Leitores de arquivos carregados sob demanda: PDF.js (`pdfjs-dist` 6.4.299, Apache-2.0) e Mammoth 1.13.0 (BSD-2-Clause), preservadas as licenças dos respectivos projetos. Os documentos são processados no navegador; nenhuma extração executa código ou HTML do documento como interface.
