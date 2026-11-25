# Domeni: comece aqui

Maria, este é o mapa do que foi entregue e do que só você pode fazer. Siga a ordem: cada passo destrava o seguinte.

## O que já está pronto (no código)

| Parte | Situação |
| --- | --- |
| App (cadernos, caneta, PDFs, agenda, notas, faltas, revisões, estágio, IA) | Pronto, testado de ponta a ponta |
| Versão limpa para vender | Pronta. Nenhum dado seu está no código: seus cadernos ficam só no seu iPad |
| Contas (código por e-mail ou senha) | Pronto, liga quando o Supabase for configurado |
| Sincronização entre aparelhos e backup na nuvem (Plus) | Pronta e testada |
| Cotas de IA por plano e teto de gasto mensal | Prontas |
| Assinatura mensal e anual (cartão, teste de 7 dias) e anual no Pix | Pronta, liga com as chaves do Stripe |
| Preço de fundadora só na semana de lançamento | Pronto, o prazo é conferido no servidor |
| Site de vendas, lista de espera, Termos, Privacidade e Cancelamento | Prontos em `/`, `/termos`, `/privacidade`, `/cancelamento` |
| Apps de iPhone/iPad e Android (Capacitor) | Projetos criados, com ícones, telas de abertura e compras pela loja |
| Kit de lançamento, e-mails, roteiros e respostas | Nesta pasta |

## O que só você pode fazer (em ordem)

| # | Tarefa | Onde | Custo | Guia |
| --- | --- | --- | --- | --- |
| 1 | Abrir a empresa (ME no Simples Nacional) com contador | Contador + Receita | honorários do contador | [02-empresa-e-impostos.md](02-empresa-e-impostos.md) |
| 2 | Comprar o domínio (ex.: domeni.app ou domeni.com.br) | Registro.br ou Vercel | cerca de R$ 40 a R$ 100 por ano (confira) | [01-colocar-no-ar.md](01-colocar-no-ar.md) |
| 3 | Criar o Supabase e rodar o SQL | supabase.com | grátis para começar; Pro US$ 25/mês | [01-colocar-no-ar.md](01-colocar-no-ar.md) |
| 4 | Criar a conta Stripe e rodar `npm run stripe:setup` | stripe.com | taxa por venda | [01-colocar-no-ar.md](01-colocar-no-ar.md) |
| 5 | Publicar na Vercel (plano Pro para uso comercial) | vercel.com | US$ 20/mês | [01-colocar-no-ar.md](01-colocar-no-ar.md) |
| 6 | Testar uma compra no modo de teste, depois ligar o modo real | Stripe | 0 | [01-colocar-no-ar.md](01-colocar-no-ar.md) |
| 7 | Criar o Brevo (e-mails da lista e código de login) | brevo.com | grátis até 300 e-mails/dia | [05-emails.md](05-emails.md) |
| 8 | Contas de desenvolvedora Apple e Google | developer.apple.com, play.google.com/console | US$ 99/ano e US$ 25 uma vez | [04-lojas.md](04-lojas.md) |
| 9 | Seguir o calendário de lançamento | Instagram, lista | 0 | [03-lancamento.md](03-lancamento.md) |

## Próximas 3 ações (esta semana)

1. Marcar conversa com um contador para abrir a ME (leve o [02-empresa-e-impostos.md](02-empresa-e-impostos.md)).
2. Criar as contas no Supabase, Stripe (modo de teste) e Brevo com o e-mail do negócio.
3. Me mandar o link de autorização da Vercel aprovado, para eu publicar o site.

## Índice

- [01-colocar-no-ar.md](01-colocar-no-ar.md): domínio, Supabase, Stripe, Vercel, variáveis, testes.
- [02-empresa-e-impostos.md](02-empresa-e-impostos.md): ME, CNAE, Simples, nota fiscal.
- [03-lancamento.md](03-lancamento.md): calendário até fevereiro, preço, metas.
- [04-lojas.md](04-lojas.md): App Store e Google Play, textos, privacidade, revisão.
- [05-emails.md](05-emails.md): sequências de e-mail prontas.
- [06-instagram.md](06-instagram.md): stories, reels e legendas.
- [07-objecoes-e-respostas.md](07-objecoes-e-respostas.md): dúvidas, objeções e respostas de DM.
- [08-numeros.md](08-numeros.md): preço, custos por assinante e ponto de equilíbrio.
- [09-regras-eticas.md](09-regras-eticas.md): o que nunca fazer no marketing.
