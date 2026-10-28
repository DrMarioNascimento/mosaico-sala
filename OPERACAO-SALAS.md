# Mosaico Sala — Como as salas são apagadas

Toda sala nasce com um prazo de 24 horas (`expiresAt`). Os dados dos alunos (nomes, envios, pacotes) não podem ficar guardados depois da aula. São três camadas, da mais rápida à mais garantida:

1. **O professor encerra.** Aplicar em sala → aba "8.2 · Sala" → "Encerrar sala" (dois toques). Apaga na hora participantes, envios, pacotes e a sala.
2. **Faxina ao entrar.** Quando o professor abre "Aplicar em sala", a plataforma apaga sozinha as salas dele que já venceram (ou que ficaram fechadas sem apagar), em qualquer aparelho em que tenham sido abertas.
3. **TTL do Firestore (rede de segurança).** Mesmo que o professor nunca volte, o Firestore apaga cada documento vencido. Isso exige a configuração abaixo, feita uma vez.

A administração (Planejamento → Administração → Salas) mostra as salas abertas e as vencidas e encerra qualquer uma.

## Configurar o TTL (uma vez, no console do Firebase)

O prazo vai em quatro lugares: a sala e, dentro dela, cada participante, envio e pacote. O TTL não apaga subcoleções, por isso cada uma precisa da sua política.

1. Abra o [Firestore → TTL do projeto mosaico-sala](https://console.firebase.google.com/project/mosaico-sala/firestore/databases/-default-/ttl) (ou, no Google Cloud, Firestore → Time-to-live).
2. Crie **quatro políticas**, todas com o campo **`expiresAt`**:

   | Grupo de coleções | Campo |
   |---|---|
   | `rooms` | `expiresAt` |
   | `members` | `expiresAt` |
   | `envios` | `expiresAt` |
   | `pacotes` | `expiresAt` |

3. Cada política leva alguns minutos para ficar "Ativa".

**O que esperar:** o Firestore apaga os documentos vencidos em segundo plano, normalmente em até 24 horas depois do prazo, sem hora exata. Por isso a faxina ao entrar e o botão "Encerrar sala" continuam sendo o caminho principal; o TTL só garante que nada fique para sempre.

## Ordem de publicação

As regras do Firestore são publicadas à mão (Firestore → Regras, colando o `firestore.rules`). O site grava o prazo nos participantes e envios e, se as regras publicadas ainda não aceitarem o campo, grava sem ele — o aluno nunca fica de fora. Documentos gravados sem prazo não são apagados pelo TTL, mas continuam sendo apagados pelo professor, pela faxina e pela administração.
