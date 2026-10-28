# Mosaico Sala — Ícones 3D para gerar

O padrão visual do Mosaico Sala são ícones **3D de plástico brilhante**, como as formas dos grupos (círculo, triângulo, quadrado, losango…) e o logo de peças. Hoje a plataforma usa desenhos provisórios onde ainda não há 3D. Cada ícone desta lista substitui um provisório.

## Padrão em uso (25/10/2026)

- Todos os ícones 3D da interface ficam em `assets/ilustracoes/3d/*.webp`, 256 × 256, recortados pelo alfa e com o **mesmo tamanho óptico**: a escala vem da área visível, limitada pelo lado maior (um quadrado cheio e uma lâmpada fina parecem do mesmo tamanho). `origens.json` diz de onde veio cada um.
- Fonte principal: o conjunto `G:\Meu Drive\A_mobile\mosaico-icons-512-transparent` (plástico brilhante, mesma luz). Do conjunto anterior ficaram só três que já seguiam o estilo: atividade, revisar e conduzir.
- Saíram os desenhos realistas (pasta com carimbo, livro fotográfico, escrivaninha, livros com maçã, bússola, Lego), que quebravam o padrão.
- Ícones grandes para o professor: cerca de 28 px em botões e navegação; ilustrações 35% acima do tamanho pedido por cada tela, até 140 px (`css/mosaico.css`, bloco "Ícones grandes").
- Evitar objetos escuros (celular preto, anel verde-escuro): somem no fundo escuro da plataforma.
- Ainda de linha, por falta de 3D legível: planilha, JSON, imprimir, salvar, mais, importar, geral, sortear, revelar, tela cheia.

## Como entregar

1. Gere cada imagem com o **estilo base** + o **assunto** do ícone.
2. Salve o PNG na pasta `G:\Meu Drive\A_mobile\Icones-mosaico` com o **nome do arquivo** indicado (ex.: `corrida.png`).
3. Avise: eu recorto o fundo se precisar, converto para WebP leve e encaixo. O provisório sai sozinho.

Pode entregar aos poucos — cada ícone entra assim que existir. Comece pelos **tipos de atividade** (aparecem no planejamento, na condução, no telão e no celular).

## Estilo base (colar no início de todos os prompts)

> 3D icon, glossy soft-plastic material like a polished toy, smooth rounded edges, subtle bevel, soft studio lighting from the top left, gentle specular highlights, vibrant saturated colors, single centered object, isolated on a fully transparent background, no text, no letters, no numbers, no ground shadow, no background scene, square 1:1, high detail, clean, same style as a set of glossy 3D shape icons (orange circle, cyan triangle, lime square, pink diamond).

**Cores do Mosaico Sala** (use as indicadas em cada ícone): laranja #FA7309 · ciano #14C5D6 · verde-limão #A4CE2F · rosa #F83D87 · amarelo #F3BF0A · roxo #8855C3 · azul #338DEC · vermelho #DE1B1A · prata/cinza claro.

## 1. Tipos de atividade (prioridade)

| Arquivo | Onde aparece | Assunto (depois do estilo base) |
|---|---|---|
| `investigacao_fragmentos.png` | Investigação por fragmentos | three small glossy square tiles (orange, cyan, pink) scattered, with a silver magnifying glass with a glass lens hovering over them |
| `comparar_hipoteses.png` | Comparação entre grupos | a balance scale in silver with two pans, one orange pan and one cyan pan, small yellow sphere on top, slightly tilted |
| `montagem_pecas.png` | Montagem em peças | four jigsaw puzzle pieces fitting together, orange, cyan, lime and pink, the pink piece about to snap into place |
| `cadeado_grupo.png` | Cadeado do grupo | **já existe** (cadeado 3D azul em `assets/icons/locks`); gerar só se quiser um amarelo: a chunky yellow padlock with a silver shackle and a dark keyhole |
| `quiz_grupos.png` | Quiz entre grupos | a purple speech bubble with a question mark shape cut out and a smaller lime speech bubble with an exclamation shape, overlapping |
| `cartoes_arrastar.png` | Cartões de arrastar | two rounded cards (cyan and pink) slightly fanned out, with a white curved arrow showing a drag movement |
| `pares.png` | Pares | two rounded cards, one orange and one cyan, connected by a small yellow chain link between them |
| `corrida.png` | Corrida | two cartoon running figures (simple rounded mannequins, no faces), one orange in front and one cyan behind, mid-stride, next to a small checkered finish flag |
| `cruzadas.png` | Palavras cruzadas | a small crossword grid made of glossy cream tiles forming a cross shape, a few tiles yellow, no letters |
| `sequencia.png` | Sequência (Genius) | a round memory game toy with four glossy quadrant buttons (teal, yellow, rose, blue), the yellow one glowing brightly as if lit, dark center |
| `quiz_pensar.png` | Quiz que faz pensar | a glossy yellow light bulb with a question mark shape inside, small rays around it, silver base |
| `analise_imagem.png` | Análise de imagem | a picture frame with a lime hill and yellow sun inside, and a pink map-pin marker standing on the frame corner |
| `questao_individual.png` | Questão individual | a simple cyan rounded person bust (no face) with a lime circular badge with a white check mark |

## 2. Entradas (página inicial e fluxo)

| Arquivo | Onde aparece | Assunto |
|---|---|---|
| `e_planejar.png` | Planejar | a white clipboard with four small colored tiles (orange, cyan, lime, pink) on it and a yellow pencil leaning on it |
| `e_conduzir.png` | Conduzir | a dark smartphone with an orange play triangle on the screen and a small lime check badge on the corner |
| `e_telao.png` | Telão | a TV screen on a stand showing four colored tiles (orange, cyan, lime, pink) |
| `e_participar.png` | Participar | a dark smartphone showing an orange circle, a cyan triangle and a lime square, with a yellow arrow pointing into it |
| `e_simulador.png` | Simulador | a TV screen above a row of three small smartphones (orange, cyan, lime) |

## 3. Ícones pequenos de botões e navegação (depois)

Aparecem pequenos (cerca de 20 px), então precisam de **uma forma só, bem simples e de alto contraste**. Acrescente ao estilo base: *simple bold shape, readable at very small size*. Nome do arquivo = `ui_<nome>.png`.

| Arquivo | Assunto | Arquivo | Assunto |
|---|---|---|---|
| `ui_inicio.png` | a small house | `ui_voltar.png` | a left arrow |
| `ui_avancar.png` | a right arrow | `ui_planejar.png` | a clipboard |
| `ui_conduzir.png` | a smartphone with a play symbol | `ui_telao.png` | a TV screen |
| `ui_simulador.png` | a TV screen with three small dots below | `ui_participar.png` | a door with an arrow going in |
| `ui_atividade.png` | a document page | `ui_sala.png` | a QR code square |
| `ui_grupos.png` | two rounded people busts | `ui_play.png` | a play triangle |
| `ui_parar.png` | a stop square | `ui_previa.png` | an eye |
| `ui_planilha.png` | a spreadsheet grid | `ui_json.png` | curly braces |
| `ui_imprimir.png` | a printer | `ui_salvar.png` | a floppy disk |
| `ui_fechar.png` | an X | `ui_mais.png` | a plus sign |
| `ui_importar.png` | an upload arrow into a tray | `ui_baixar.png` | a download arrow into a tray |
| `ui_ia.png` | sparkles | `ui_fontes.png` | an open book |
| `ui_geral.png` | sliders | `ui_revisao.png` | a check mark in a circle |
| `ui_biblioteca.png` | books on a shelf | `ui_copiar.png` | two overlapping sheets |
| `ui_apagar.png` | a trash bin | `ui_trofeu.png` | a trophy |
| `ui_revelar.png` | a burst of light | `ui_sortear.png` | crossing shuffle arrows |
| `ui_enviar.png` | a paper plane | `ui_abrir.png` | a folder |
| `ui_sair.png` | a door with an arrow going out | `ui_licenca.png` | a balance scale |
| `ui_meta.png` | a target | `ui_relogio.png` | a clock |

Os ícones de botão em 3D podem ficar pesados para a tela. Se, depois de prontos, algum não ficar legível pequeno, mantenho o de linha naquele lugar e aviso.
