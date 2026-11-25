# Números: preço, custo por assinante e ponto de equilíbrio

Valores em novembro de 2026. Câmbio usado: US$ 1 = R$ 5,60 (**confira o câmbio do dia**). Taxas de terceiros mudam: confira nas páginas oficiais antes de decidir.

## Preços

| Plano | Preço | Por mês | Observação |
| --- | --- | --- | --- |
| Grátis | R$ 0 | R$ 0 | Tudo local, 5 ações de IA por mês com conta |
| Plus mensal | R$ 19,90 | R$ 19,90 | Cartão, 7 dias grátis na primeira assinatura |
| Plus anual | R$ 179,90 | R$ 14,99 | Cartão (renova) ou Pix (12 meses, não renova) |
| Fundadora (só de 1º a 7/2/2027) | R$ 129,90 por ano | R$ 10,83 | Mantém o preço enquanto a assinatura durar |

Referência de mercado (conferida em nov/2026): Goodnotes cobra R$ 59,90 por ano no Brasil, sem IA ilimitada. O Domeni vende organização da faculdade inteira + sincronização + IA, por isso pode ficar acima, mas não muito: o preço mensal fica abaixo de um lanche por semana, que é a comparação que estudante faz.

## Custo de IA por assinante (pior caso: usa toda a cota)

Modelo padrão das assinantes: Claude Haiku 5.5 (US$ 0,10 por milhão de tokens de entrada e US$ 0,50 de saída, para pedidos de até 100 mil tokens). Pesquisa na internet: US$ 10 por mil buscas.

| Uso | Conta | Custo |
| --- | --- | --- |
| Ação comum (resumo, flashcards, questões) | ~15 mil tokens de entrada + ~5 mil de saída | ~US$ 0,004 |
| 150 ações no mês | 150 × 0,004 | ~US$ 0,60 |
| Pesquisa a fundo (até 6 buscas) | buscas + ~40 mil tokens | ~US$ 0,07 |
| 15 pesquisas no mês | 15 × 0,07 | ~US$ 1,05 |
| **Total no pior caso** | | **~US$ 1,65 ≈ R$ 9,24** |

Uso típico esperado: 20% a 30% da cota, ou seja, R$ 2 a R$ 3 por mês. O teto global (`AI_MONTHLY_BUDGET_USD`) protege contra surpresas.

## Margem por assinatura mensal (R$ 19,90)

| Item | Valor |
| --- | --- |
| Receita | R$ 19,90 |
| Taxa do cartão (estimativa 3,99% + R$ 0,39; *não verificada, confira no Stripe*) | -R$ 1,18 |
| Simples Nacional, Anexo III, faixa inicial (6%) | -R$ 1,19 |
| IA, uso típico | -R$ 2,50 |
| Armazenamento na nuvem (estimativa) | -R$ 0,30 |
| **Sobra por assinante** | **~R$ 14,70** |

Pelas lojas, a Apple e o Google ficam com 15% no programa para pequenas empresas (confira a adesão ao *Small Business Program* da Apple e a taxa de 15% do Google para assinaturas). Sobra perto de R$ 12.

## Custos fixos mensais

| Item | Valor |
| --- | --- |
| Vercel Pro | US$ 20 ≈ R$ 112 |
| Supabase Pro (quando houver assinantes) | US$ 25 ≈ R$ 140 |
| Domínio e e-mail | ~R$ 15 |
| Apple Developer (US$ 99/ano) | ~R$ 46 |
| Contador | R$ 200 a R$ 400 (cotar) |
| **Total** | **~R$ 515 a R$ 715** |

**Ponto de equilíbrio: cerca de 35 a 50 assinantes mensais** (ou o equivalente em anuais). Com 300 nomes na lista e conversão de 10% a 15% na semana de lançamento, dá para empatar já em fevereiro.

## Metas do primeiro lançamento

| Métrica | Meta | Como medir |
| --- | --- | --- |
| Lista até 31/1/2027 | 300 nomes | Supabase > waitlist |
| Conversão da lista na semana de vendas | 10% | Assinaturas novas de 1 a 7/2 ÷ lista |
| Teste grátis que vira pagante | 50% | Stripe > Subscriptions |
| Cancelamento por mês | abaixo de 8% | Stripe > Billing > Churn |
