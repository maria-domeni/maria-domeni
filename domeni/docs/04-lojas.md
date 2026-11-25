# App Store e Google Play

Os projetos nativos estão em `ios/` e `android/` (Capacitor). O app das lojas é o mesmo do site, empacotado com os arquivos dentro dele (abre sem internet), e fala com o servidor publicado para conta, IA e assinatura. Regras e limites das lojas mudam: confira as páginas oficiais antes de enviar.

## O que você precisa

| Item | Custo | Observação |
| --- | --- | --- |
| Conta Apple Developer | US$ 99 por ano | Como **organização** (com CNPJ e número D-U-N-S, gratuito, pedido no site da Apple) aparece "Domeni" como vendedora; como pessoa física aparece seu nome |
| Conta Google Play Console | US$ 25 uma vez | Conta **pessoal** criada depois de 13/11/2023 precisa de teste fechado com 12 testadoras por 14 dias antes de publicar. Conta de **organização** (com D-U-N-S) não tem essa exigência |
| Um Mac com Xcode | | Para gerar o app de iPhone/iPad. Sem Mac: serviços de build na nuvem (Codemagic, Ionic Appflow) ou um Mac emprestado |
| Android Studio | grátis | Roda no Windows, Mac ou Linux |
| RevenueCat | grátis até um faturamento mensal na faixa de US$ 2.500 (confira) | Liga as compras da Apple e do Google ao plano da conta |

## 1. Gerar o app

```bash
cd domeni
NEXT_PUBLIC_API_BASE=https://seudominio \
NEXT_PUBLIC_SUPABASE_URL=... NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=... \
NEXT_PUBLIC_REVENUECAT_IOS_KEY=appl_... NEXT_PUBLIC_REVENUECAT_ANDROID_KEY=goog_... \
npm run build:native
npx cap open ios       # abre no Xcode (Mac)
npx cap open android   # abre no Android Studio
```

O identificador do app é `app.domeni` (em `capacitor.config.ts`). Troque **antes** da primeira publicação se quiser outro; depois não muda mais.

## 2. Assinaturas dentro do app

A Apple exige compra dentro do app para liberar recursos pagos no iPhone/iPad (diretriz 3.1.1). Quem assinou pelo site entra com a mesma conta e já tem o Plus.

1. **App Store Connect > o app > Subscriptions**: grupo "Domeni Plus" com dois produtos:
   - `domeni_plus_mensal`: 1 mês, R$ 19,90;
   - `domeni_plus_anual`: 1 ano, R$ 179,90.
   - Teste grátis: opcional (introductory offer de 1 semana).
2. **Google Play Console > Monetize > Subscriptions**: os mesmos dois ids e preços.
3. **RevenueCat**: crie o projeto, ligue os dois apps (App Store e Play), importe os produtos, crie o entitlement `plus` e a offering padrão com os pacotes Monthly e Annual.
4. **RevenueCat > Integrations > Webhooks**: URL `https://seudominio/api/revenuecat/webhook` e um valor de **Authorization** que você inventa (ex.: `Bearer ` + uma senha longa). Coloque o mesmo valor em `REVENUECAT_WEBHOOK_AUTH` na Vercel.
5. Copie as chaves públicas do RevenueCat (iOS `appl_...`, Android `goog_...`) para o build do passo 1.
6. Entre no **Small Business Program** da Apple (comissão de 15%).

## 3. Textos da página (pt-BR)

**Nome (30):** `Domeni: Cadernos da Faculdade` (29)

**Subtítulo Apple (30):** `Aulas, PDFs, notas e faltas` (27)

**Palavras-chave Apple (100, sem repetir palavras do nome e do subtítulo, sem espaços):**
`estudo,universidade,provas,flashcards,revisão,anotações,caneta,planner,psicologia,resumo,média` (98 bytes, dentro do limite de 100)

**Descrição curta Google (80):** `Cadernos com caneta, PDFs, agenda, notas e faltas da faculdade no mesmo lugar.` (78)

**Texto promocional Apple (170, pode mudar sem nova versão):**
`Lançamento: de 1º a 7 de fevereiro, plano anual por preço de fundadora no site. No app, Plus mensal ou anual pela loja.` (troque depois do lançamento)

**Descrição (Apple e Google):**

```
Sua faculdade inteira num caderno só.

O Domeni junta o que fica espalhado entre caderno, pasta de PDFs, agenda e planilha de notas. Foi pensado primeiro para o iPad com caneta, e funciona também no celular e no computador.

CADERNOS DE VERDADE
• Um caderno por disciplina, separado por semestre, com capa do seu jeito.
• Cada aula vira uma folha: digite, escreva à mão, grife e cole imagens.
• Folha lisa, pautada, quadriculada ou pontilhada, como preferir.

FACULDADE ORGANIZADA
• Agenda com aulas, provas e entregas, com contagem regressiva.
• Notas e faltas com as regras da SUA faculdade: média, pesos e limite de faltas você define.
• Estágio e horas complementares no mesmo lugar, com aviso para nunca guardar dados de quem foi atendido.

ESTUDO ATIVO
• Revisões espaçadas das aulas e flashcards.
• Biblioteca com seus PDFs, leitura e busca.

IA SÓ QUANDO VOCÊ PEDE
• Resumo da aula, flashcards, questões no estilo de prova e explicação de conceitos, a partir das suas anotações.
• O que vem de fora das suas fontes aparece marcado para confirmar com o professor.
• Nada roda sozinho em segundo plano.

SEUS DADOS SÃO SEUS
• Funciona sem internet: tudo fica no seu aparelho.
• Sem anúncios. Exporte tudo ou exclua a conta quando quiser.

PLANOS
• Grátis: tudo acima, com 5 ações de IA por mês.
• Domeni Plus (mensal ou anual): sincronização entre aparelhos, backup na nuvem, 150 ações de IA e 15 pesquisas a fundo por mês.
A assinatura renova sozinha até você cancelar nos ajustes de assinaturas da loja, pelo menos 24 horas antes do fim do período.

Termos: https://seudominio/termos
Privacidade: https://seudominio/privacidade
```

Antes de enviar, confira que nenhum texto fala em "melhor", "nº 1" ou "grátis" no título, e que o nome de outras marcas não aparece.

## 4. Capturas de tela

Prontas em `store/`:

| Pasta | Tamanho | Uso |
| --- | --- | --- |
| `store/ipad/01..05.png` | 2064 × 2752 (iPad 13") | App Store (iPad) e Google Play (tablet) |
| `store/iphone/01..05.png` | 1260 × 2736 (iPhone 6,9") | App Store (iPhone) e Google Play (celular) |
| `store/google-play-destaque.png` | 1024 × 500 | Arte de destaque do Google Play |
| `store/icone-1024.png`, `store/google-play-icone-512.png` | | Ícones |

Ordem: 1 Hoje (o dia organizado), 2 Cadernos, 3 Folha da aula com caneta, 4 Notas e faltas, 5 Agenda. São do app real com dados de exemplo (nome "Bia"). Quando tiver tempo, coloque uma legenda curta em cada uma (ex.: "Sua aula com caneta e marca-texto").

## 5. Privacidade nas lojas

**Apple (App Privacy):**

| Dado | Coletado? | Ligado à identidade? | Rastreamento? | Uso |
| --- | --- | --- | --- | --- |
| E-mail | Sim | Sim | Não | Funcionalidade do app (conta) |
| Conteúdo do usuário (anotações, fotos, áudio, arquivos) | Sim, só se ativar a sincronização do Plus | Sim | Não | Funcionalidade do app |
| Histórico de compras | Sim | Sim | Não | Funcionalidade do app |
| Dados de uso (contagem de ações de IA) | Sim | Sim | Não | Funcionalidade do app |
| Localização, contatos, saúde, anúncios | Não | | | |

**Google (Segurança dos dados):** mesmos itens; "os dados são criptografados em trânsito: sim"; "a pessoa pode pedir a exclusão: sim" (no app e por e-mail); nenhum dado compartilhado com terceiros para publicidade.

**Classificação etária:** Apple 4+ (sem conteúdo sensível); Google: questionário IARC, categoria "Educação" ou "Produtividade", sem conteúdo gerado compartilhado entre usuárias.

## 6. Notas para a revisão da Apple

Crie uma conta de teste com senha (em Conta > Segurança > Senha) e dê o Plus de cortesia a ela (Supabase > Table Editor > entitlements > linha com `source = cortesia`, `status = active`, `period_end` daqui a 3 meses). Texto sugerido:

```
Domeni é um app de organização de estudos para universitárias (cadernos com Apple Pencil, PDFs, agenda, notas, faltas e revisões). Tudo funciona sem conta e sem internet.

Conta de teste (com o plano Plus ativo):
E-mail: revisao@seudominio
Senha: (a senha)
Em Conta, toque em "Entrar com senha".

Assinaturas: Domeni Plus mensal e anual, compradas dentro do app pela App Store (StoreKit via RevenueCat). Quem já assina pelo nosso site entra com a mesma conta. A exclusão de conta fica em Conta > Excluir conta.

IA: os recursos de IA só rodam quando a pessoa toca num botão e usam o conteúdo que ela escolheu. O microfone só é usado ao tocar em "Gravar".
```

## 7. Riscos de recusa e como evitamos

| Diretriz | Risco | O que o app já faz |
| --- | --- | --- |
| 4.2 (funcionalidade mínima, "site embrulhado") | Apps que só abrem um site | O app vem com os arquivos dentro, abre sem internet, usa caneta, microfone, arquivos e compras nativas |
| 3.1.1 (compras) | Liberar recurso pago sem compra pela Apple | Compra pela App Store no app; o app das lojas não mostra o pagamento do site |
| 5.1.1(v) (exclusão de conta) | App com criação de conta precisa permitir excluir | Conta > Excluir conta |
| 2.3 (metadados) | Capturas que não mostram o app | Capturas do app real |
| 5.1.1 (permissões) | Texto vago no pedido de microfone e câmera | Textos em português explicando quando usamos |

No Brasil, depois do acordo da Apple com o CADE, é permitido também mostrar link para pagar fora do app, com regras e taxas próprias. As informações públicas sobre taxas e prazos ainda divergem (*não verificado*): por isso o app usa só a compra pela loja por enquanto.

## 8. Checklist de envio

- [ ] Build com `NEXT_PUBLIC_API_BASE` apontando para o site publicado.
- [ ] Produtos de assinatura criados e aprovados junto com a primeira versão.
- [ ] RevenueCat com webhook funcionando (o painel tem um botão de teste).
- [ ] Compra de teste no sandbox libera o Plus no app.
- [ ] Textos, capturas, ícone, privacidade e classificação preenchidos.
- [ ] Conta de teste para a revisão, com senha.
- [ ] Google: teste fechado de 14 dias com 12 testadoras (se a conta for pessoal).
