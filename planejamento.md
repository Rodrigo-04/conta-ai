# Planejamento: App para Dividir Contas de Restaurante

*Documento de planejamento inicial · 15/10/2026 · Versão 1.1*

## 1. Visão geral

App mobile para dividir a conta de restaurantes entre amigos. A pessoa tira uma foto da nota, o app extrai os itens com OCR no próprio aparelho, permite corrigir o que foi lido errado e calcula quanto cada um paga, incluindo a taxa de serviço (garçom). Quem pagou a conta pode acompanhar quem já devolveu o dinheiro (pago/pendente).

**Princípios**

- Uma única pessoa (o usuário logado) controla toda a divisão. Não há modo colaborativo.
- Os cálculos são feitos no aparelho, em **centavos inteiros**, e a soma sempre fecha exatamente no total da conta.
- O app funciona offline, inclusive a leitura da foto, pois o OCR roda no aparelho; só o login e a sincronização exigem internet.
- O módulo de cálculo é isolado, puro e fortemente testado, pois é onde os erros de centavos aparecem.

## 2. Decisões tomadas

| Tema | Decisão |
|---|---|
| Plataforma | App nativo com **Expo (React Native) + TypeScript** |
| Banco local | **SQLite** (`expo-sqlite`) |
| Login | **Supabase Auth**, com **Google e e-mail** |
| Dados | SQLite local com **sincronização na nuvem (Supabase)**, acesso em vários aparelhos |
| Leitura da nota | **OCR no aparelho**, gratuito e offline, com a **interpretação do texto** feita pelo próprio app |
| Pessoas | Existem **só dentro de cada conta** (nome + apelido), sem agenda reutilizável |
| Diferença de centavos | **Uma pessoa sorteada recebe toda a diferença**; o pagador **entra** no sorteio; é possível escolher manualmente ou sortear |
| Taxa de serviço | Dividida **igualmente** ou **proporcional ao consumo**, à escolha do usuário |
| Status de pagamento | Apenas **pago / pendente** (sem pagamento parcial por enquanto) |
| Cobrança | **Fora do escopo inicial** (sem WhatsApp nem Pix) |
| Colaborativo | **Fora do escopo** |
| Foto da nota | Guardada **só no aparelho**, com opção de apagar; não vai para a nuvem |

> A foto da nota foi assumida como local por padrão, por causa de dados sensíveis (CPF, cartão). Se quiser alterar, basta avisar.

## 3. Escopo

### 3.1 MVP

1. Login com Google ou e-mail.
2. Criar conta por **foto da nota** ou **manualmente**.
3. Leitura por OCR no aparelho e interpretação do texto: itens, quantidades, valor de cada linha, taxa de serviço e total.
4. Tela de revisão para corrigir nome e valor dos itens, com a foto visível e aviso de conferência (soma dos itens ≠ total da nota).
5. Cadastro de pessoas na conta (nome + apelido) e definição de quem pagou.
6. **Modo 1:** dividir o total igualmente entre N pessoas.
7. **Modo 2:** atribuir itens a cada pessoa, incluindo itens compartilhados por várias pessoas.
8. Taxa de serviço igual ou proporcional ao consumo.
9. Tratamento e sorteio da diferença de centavos.
10. Resultado em **cards por pessoa**, com marcação de pago/pendente.
11. Histórico de contas, com filtro de contas com pendências.
12. Sincronização entre aparelhos.

### 3.2 Fora do escopo inicial

- Modo colaborativo em tempo real.
- Agenda de amigos reutilizável e total devido entre contas.
- Pagamento parcial.
- Mensagem de cobrança por WhatsApp e Pix copia-e-cola.
- Leitura do QR code da NFC-e (SEFAZ).
- Desconto, couvert e cashback com rateio (o modelo de dados já reserva o campo de desconto).
- Notificações de lembrete.
- Backup/exportação das fotos.

## 4. Regras de negócio

### 4.1 Dinheiro

- Todo valor é guardado e calculado em **centavos inteiros**. Nunca float.
- A fonte de verdade de cada item é o **valor total da linha** (não o preço unitário × quantidade), pois o OCR pode confundir unitário e total.
- Quantidades fracionadas são aceitas (ex.: 0,45 kg em self-service).

### 4.2 Modo 1: divisão igual

1. Total da conta (com taxa, se estiver incluída) ÷ N pessoas, em divisão inteira.
2. A sobra (de 0 até N−1 centavos) é a **diferença** e segue a regra de sorteio (4.5).

### 4.3 Modo 2: divisão por itens

- Cada item é atribuído a uma ou mais pessoas. Em item compartilhado, a divisão entre os participantes é igual.
- O consumo de cada pessoa é a soma das suas frações de itens, em centavos.
- Item sem ninguém atribuído bloqueia o fechamento da conta, com aviso ("há itens sem dono").

### 4.4 Taxa de serviço

- Percentual configurável (padrão 10%), com opção de **remover** a taxa.
- **Igual:** valor da taxa ÷ N pessoas.
- **Proporcional:** cada pessoa paga a taxa na proporção do próprio consumo.
- Arredondamentos acontecem por etapa (itens, taxa), mas **a diferença de centavos é resolvida uma única vez, no total final**, para a soma fechar exatamente.

### 4.5 Diferença de centavos

1. Calcula-se o total de cada pessoa com arredondamento para baixo.
2. **Diferença = total da conta − soma dos totais das pessoas.**
3. Se a diferença for maior que zero, o app exibe o aviso **"Temos uma diferença de R$ X,XX"** com duas ações: **Sortear** ou **Escolher uma pessoa**.
4. A pessoa escolhida paga a diferença **inteira**. **Todos, inclusive o pagador, entram no sorteio.**
5. O resultado é **gravado** na conta. Reabrir a conta nunca refaz o sorteio. Mudar itens ou pessoas invalida a gravação e exige novo sorteio, com aviso.

> Com taxa proporcional e muitas pessoas, a diferença pode chegar a alguns centavos (aproximadamente até N centavos). Como a decisão é "uma pessoa fica com tudo", o app deve mostrar o valor com clareza.

### 4.6 Pagamento

- Cada conta tem um **pagador** (quem desembolsou o valor).
- Cada pessoa que não é o pagador tem uma **parcela** com valor devido e status **pendente** ou **pago** (com data).
- A parcela do próprio pagador não precisa de cobrança, e é marcada automaticamente como paga.
- Alterar a divisão de uma conta que já tem parcelas pagas exige confirmação, pois recalcula valores.

### 4.7 Conferência da nota

- Se a soma dos itens ≠ total lido da nota, mostrar aviso destacado.
- O usuário pode ajustar itens, ou aceitar a diferença informando o motivo (ex.: couvert, desconto), até haver suporte completo a descontos.

## 5. Fluxo e telas

1. **Login:** Google ou e-mail.
2. **Início:** lista de contas, destaque para contas com pendências, botão "Nova conta".
3. **Nova conta:** escolher entre tirar foto, escolher da galeria, ou preencher manualmente.
4. **Captura:** guia de enquadramento, recorte e redução da imagem.
5. **Processando:** indicador de progresso, com tratamento de erro e opção de digitar manualmente.
6. **Revisão da nota:** lista de itens editáveis (nome, quantidade, valor), foto de referência, aviso de conferência, adicionar e remover item, taxa e total.
7. **Pessoas:** adicionar com nome e apelido, indicar quem pagou.
8. **Modo de divisão:** igual ou por itens.
9. **Atribuição de itens** (modo por itens): marcar quem consumiu cada item, incluindo compartilhados.
10. **Taxa:** igual ou proporcional ao consumo.
11. **Diferença de centavos** (quando existir): aviso, sorteio ou escolha manual.
12. **Resultado:** cards por pessoa com valor, apelido e status pago/pendente (toque para alternar).
13. **Detalhe da conta:** itens, quem consome o quê, foto, edição, exclusão.
14. **Configurações:** conta, taxa padrão, apagar fotos locais, sair.

## 6. Arquitetura

```
Expo App (React Native + TS)
 ├─ Interface (telas, navegação)
 ├─ Leitura da nota (OCR no aparelho + interpretação do texto)
 ├─ Módulo de cálculo (TS puro, sem dependências)
 ├─ SQLite local (fonte de verdade no aparelho)
 └─ Camada de sincronização
        │
        ▼
Supabase
 ├─ Auth (Google + e-mail)
 └─ Postgres (cópia das contas, com RLS por usuário)
```

### 6.1 Abordagem local-first

- O app lê e escreve **sempre no SQLite**. A interface nunca espera a rede.
- A sincronização roda em segundo plano, quando há conexão, e ao abrir o app.
- Identificadores são **UUIDs gerados no aparelho**.
- Cada registro tem `updated_at` e `deleted_at` (exclusão lógica), para propagar alterações e remoções.
- **Conflito:** vence a última alteração (*last-write-wins*), por conta inteira. É adequado porque um único usuário edita as próprias contas.
- Segurança no Postgres: **Row Level Security** garantindo que cada usuário só acessa os próprios registros.

### 6.2 Leitura da nota (OCR no aparelho)

O OCR roda no aparelho: é gratuito, sem limite de uso e dispensa servidor, mas erra mais que um LLM e exige código próprio para interpretar o texto lido.

1. O app reduz e melhora a imagem (recorte, escala de cinza, contraste) antes da leitura.
2. Uma biblioteca de OCR no aparelho (por exemplo, ML Kit) devolve o texto com a posição de cada linha.
3. O interpretador agrupa as linhas por posição, separa nome, quantidade e valor de cada item e reconhece taxa de serviço e total por padrões ("SERVIÇO", "TOTAL", "10%").
4. O resultado vai para a tela de revisão, onde o usuário corrige o que for preciso. Nada sai do aparelho.

**Estrutura que o interpretador monta (conceitual)**

- `restaurante` e `data` (opcionais; costumam estar no cabeçalho da nota)
- `itens[]`: `nome`, `quantidade`, `valor_linha_centavos`
- `taxa_servico_centavos` e/ou percentual, quando impressos
- `desconto_centavos`, `couvert_centavos` (quando existirem)
- `total_centavos`
- `confianca` por linha (linhas incertas ficam destacadas na revisão)

### 6.3 Segurança e privacidade

- Não há chave de API de terceiros no app, pois o OCR roda no aparelho.
- Fotos ficam no armazenamento local do app, com opção de apagar. A imagem não é enviada a nenhum serviço na leitura.
- Dados de contas na nuvem protegidos por login e RLS.
- Avaliar o enquadramento na LGPD (finalidade, consentimento, exclusão de conta e dados).

## 7. Stack

| Camada | Tecnologia |
|---|---|
| App | Expo (React Native) + TypeScript |
| Navegação | `expo-router` |
| Banco local | `expo-sqlite` (com ORM leve opcional, como Drizzle) |
| Câmera / galeria | `expo-camera` / `expo-image-picker` |
| Redução e recorte | `expo-image-manipulator` |
| Autenticação | Supabase Auth (Google + e-mail) |
| Nuvem | Supabase (Postgres) |
| Leitura da nota | OCR no aparelho (por exemplo, ML Kit); exige development build do Expo, não roda no Expo Go |
| Testes | Vitest ou Jest para o módulo de cálculo |

## 8. Modelo de dados (rascunho)

Todas as tabelas têm: `id` (UUID), `user_id`, `created_at`, `updated_at`, `deleted_at`.

**conta**
- data, restaurante
- total_centavos, taxa_percentual, taxa_centavos, desconto_centavos
- modo_divisao (`igual` | `itens`)
- modo_taxa (`igual` | `proporcional`)
- pagador_id
- diferenca_centavos, pessoa_diferenca_id, sorteio_realizado (boolean)
- foto_caminho_local

**item**
- conta_id, nome, quantidade, valor_linha_centavos, ordem

**pessoa**
- conta_id, nome, apelido

**consumo**
- item_id, pessoa_id (a divisão entre participantes do item é igual)

**parcela**
- conta_id, pessoa_id, valor_devido_centavos, status (`pendente` | `pago`), pago_em

> `foto_caminho_local` é um dado exclusivo do aparelho e **não** é sincronizado.

## 9. Testes do módulo de cálculo

Casos mínimos a cobrir antes da interface:

- R$ 100,00 ÷ 3 (sobra de 1 centavo).
- Taxa de 10% igual e proporcional, com consumos bem diferentes.
- Item compartilhado por 2, 3 e 7 pessoas.
- Uma pessoa sem consumo (paga só taxa igual, ou nada na proporcional).
- Total que não fecha com a soma dos itens (aviso de conferência).
- Conta com 1 pessoa e conta com muitas pessoas (ex.: 15).
- Quantidade fracionada (0,45 kg).
- Propriedade geral: **a soma dos valores das pessoas é sempre igual ao total**, para entradas aleatórias.
- Sorteio gravado não muda ao recalcular com os mesmos dados.

## 10. Riscos e pontos de atenção

| Risco | Mitigação |
|---|---|
| Erro de leitura do OCR (mais frequente que com LLM) | Tela de revisão com foto ao lado, linhas incertas destacadas e aviso de conferência |
| Foto ruim (nota térmica, amassada, luz) | Guia de enquadramento, recorte, ajuste de contraste |
| Interpretar o texto lido (itens, quantidades, valores) | Começar com padrões simples (itens, taxa, total), testar com notas reais e permitir inclusão manual |
| Complexidade da sincronização | Last-write-wins por conta, exclusão lógica, UUIDs no aparelho |
| Conflito ao editar em dois aparelhos | Regra simples e comunicada; possível aviso de "conta alterada em outro aparelho" |
| Alterar conta com parcelas já pagas | Confirmação e recálculo claro |
| Pessoas só por conta | Sem total devido entre contas; reavaliar se virar necessidade |
| Sem internet | Cálculo, edição e leitura da foto funcionam offline; só login e sincronização precisam de rede |
| Dados sensíveis na foto | Foto só local e nunca enviada a serviço externo, com opção de apagar |
| Notas fora do padrão (self-service, peso) | Quantidade fracionada e edição manual completa |

## 11. Roadmap

1. **Fundação:** projeto Expo com development build (necessário para o OCR), estrutura de pastas, SQLite e esquema de dados.
2. **Módulo de cálculo + testes:** igual, por itens, taxa, centavos, sorteio.
3. **Fluxo manual completo:** itens, pessoas, resultado em cards, pago/pendente, histórico.
4. **Login:** Supabase Auth com Google e e-mail.
5. **Leitura da nota:** OCR no aparelho, interpretação do texto, captura, revisão e conferência.
6. **Sincronização:** Postgres com RLS, sync em segundo plano, exclusão lógica.
7. **Acabamento:** estados de erro, performance, textos, privacidade e LGPD, testes em aparelho real.

A ordem permite ter um app útil já na etapa 3, sem depender de login, nuvem ou OCR.

## 12. Pendências para as próximas etapas

1. **Biblioteca de OCR** (ML Kit, Tesseract ou outra), a definir com testes em notas reais. Se o OCR errar demais, avaliar o reforço híbrido (OCR + LLM só com o texto).
2. **Nome do app.**
3. **Estratégia de sincronização:** implementação própria simples ou biblioteca pronta (por exemplo, PowerSync). Avaliar custo e complexidade.
4. **Login offline:** por quanto tempo o app funciona sem renovar a sessão.
5. **Plataformas-alvo:** Android, iOS ou ambos, e estratégia de distribuição.
6. **Padrões de nota aceitos na interpretação** no início (à la carte, self-service por peso, conferência de mesa).
7. **Exclusão de conta e de dados** (LGPD).
8. **Notas reais para teste:** reunir 10 a 20 fotos variadas (térmica, self-service, com couvert, com desconto) para validar o OCR antes de investir na interface.