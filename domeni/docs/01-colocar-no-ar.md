# Colocar no ar: passo a passo

Tempo estimado: uma tarde. Faça tudo primeiro em **modo de teste** e só depois ligue o modo real.
Telas e nomes de menus mudam com o tempo; se algo não bater, procure pelo nome parecido.

## 1. Domínio

1. Escolha o nome. Sugestão: `domeni.app` (curto, combina com app) ou `domeni.com.br` (exige CNPJ ou CPF no Registro.br). Confira se está livre.
2. Compre no Registro.br (`.com.br`) ou direto na Vercel (`.app`). Preço anual: confira na hora da compra.
3. Crie um e-mail do negócio (ex.: `contato@seudominio`). Pode ser pelo Google Workspace, Zoho ou o encaminhamento de e-mail do próprio registro.

## 2. Supabase (contas, sincronização, cotas)

1. Crie a conta em supabase.com com o e-mail do negócio.
2. **New project**: nome `domeni`, região **South America (São Paulo)**, senha forte do banco (guarde num gerenciador de senhas).
3. **SQL Editor > New query**: cole todo o arquivo `supabase/migrations/0001_domeni.sql` e clique em **Run**. Ele cria as tabelas, as regras de segurança e o espaço de arquivos. Pode rodar de novo sem problema.
4. **Project Settings > API Keys**: copie
   - a URL do projeto (`NEXT_PUBLIC_SUPABASE_URL`);
   - a chave **publishable** (`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`);
   - a chave **secret** (`SUPABASE_SECRET_KEY`). Esta nunca vai para o navegador nem para o Instagram, print, nada.
5. **Authentication > URL Configuration**: Site URL = `https://seudominio/app`.
6. **Authentication > Sign In / Providers > Email**: deixe ligado. O app entra com código por e-mail, sem link.
7. **Authentication > Emails > SMTP Settings**: ligue o SMTP próprio com o Brevo (o e-mail padrão do Supabase manda pouquíssimos e-mails por hora e não serve para produção):
   - Host `smtp-relay.brevo.com`, porta `587`;
   - usuário e senha: em Brevo > SMTP e API > SMTP;
   - remetente: `Domeni <contato@seudominio>`.
8. **Authentication > Emails > Templates > Magic Link**: troque por este texto (o `{{ .Token }}` é o código):

   Assunto: `Seu código do Domeni: {{ .Token }}`

   ```html
   <h2>Seu código para entrar no Domeni</h2>
   <p style="font-size:28px;font-weight:700;letter-spacing:4px">{{ .Token }}</p>
   <p>Digite esse código no app. Ele vale por 1 hora.</p>
   <p>Se não foi você que pediu, pode ignorar este e-mail.</p>
   ```

9. **Authentication > Rate Limits**: confira o limite de e-mails por hora depois de ligar o SMTP (aumente para uns 100).
10. Quando tiver as primeiras assinantes, passe para o plano **Pro** (backups diários e sem pausa por inatividade).

## 3. Anthropic (IA)

1. Em console.anthropic.com, crie uma chave de API para o Domeni (`ANTHROPIC_API_KEY`).
2. Em **Settings > Limits**, coloque um limite mensal de gasto. O app também tem o seu teto (`AI_MONTHLY_BUDGET_USD`): quando ele é atingido, a IA das assinantes pausa até o mês seguinte e o resto do app segue normal.
3. Coloque créditos (é pré-pago).

## 4. Stripe (pagamentos no site)

1. Crie a conta em stripe.com (Brasil). Pode começar com CPF e trocar para o CNPJ quando a empresa sair.
2. **Settings > Business**: nome público "Domeni", e-mail de suporte, descrição na fatura do cartão `DOMENI`.
3. **Settings > Payment methods**: cartões ligados. Ligue o **Pix** se aparecer disponível para a sua conta.
4. **Settings > Billing > Subscriptions and emails** (nomes podem variar):
   - enviar lembrete antes do fim do teste grátis: **ligado** (prometemos isso na página de cancelamento);
   - enviar aviso antes da renovação anual: **ligado**;
   - recibos de pagamento e faturas: **ligados**;
   - Smart Retries para cobranças que falham: **ligado**, cancelar a assinatura se todas as tentativas falharem.
5. No terminal, na pasta `domeni`, com a chave **de teste**:

   ```bash
   STRIPE_SECRET_KEY=sk_test_... SITE_URL=https://seudominio npm run stripe:setup
   ```

   Ele cria o produto "Domeni Plus", os preços (mensal R$ 19,90, anual R$ 179,90, fundadora R$ 129,90, Pix anual R$ 179,90), o portal da assinante e o webhook, e mostra `STRIPE_PORTAL_CONFIGURATION` e `STRIPE_WEBHOOK_SECRET` para você copiar.
6. Mudou o preço em `src/lib/pricing.ts`? Rode o mesmo comando de novo: ele cria o preço novo e mantém quem já assina no preço antigo.

### Reembolso (direito de arrependimento)

Pedido em até 7 dias depois de um pagamento: no Stripe, abra o pagamento > **Refund** (total) e cancele a assinatura da cliente na hora (Customers > a cliente > assinatura > Cancel immediately). O app tira o Plus sozinho, pelo webhook.

## 5. Vercel (site, app e servidor)

1. Crie o projeto a partir do repositório no GitHub. **Root Directory**: `domeni`. Framework: Next.js (detectado sozinho).
2. Use o plano **Pro**: o plano Hobby da Vercel é para uso pessoal, não comercial.
3. **Settings > Functions > Region**: São Paulo (`gru1`), perto do Supabase.
4. **Settings > Environment Variables**: cadastre as variáveis do arquivo `.env.example` (todas as que você tiver). As que começam com `NEXT_PUBLIC_` vão para o navegador; as outras ficam só no servidor.
5. **Settings > Domains**: adicione o seu domínio e siga as instruções de DNS.
6. Faça um novo deploy depois de cadastrar as variáveis.

Variáveis principais:

| Variável | De onde vem |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | `https://seudominio` |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` | Supabase, passo 2.4 |
| `ANTHROPIC_API_KEY` | Anthropic, passo 3 |
| `OWNER_EMAILS` | o seu e-mail (você ganha Plus e IA sem limite) |
| `AI_MONTHLY_BUDGET_USD` | teto mensal da IA das assinantes, em dólares (comece com 60) |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PORTAL_CONFIGURATION` | Stripe, passo 4.5 |
| `STRIPE_PIX` | `1` depois de ligar o Pix |
| `BREVO_API_KEY`, `BREVO_LIST_ID` | Brevo, veja [05-emails.md](05-emails.md) |
| `NEXT_PUBLIC_SUPPORT_EMAIL`, `NEXT_PUBLIC_INSTAGRAM` | seus contatos |
| `NEXT_PUBLIC_COMPANY_NAME`, `NEXT_PUBLIC_COMPANY_CNPJ`, `NEXT_PUBLIC_COMPANY_ADDRESS` | dados da empresa (obrigatórios para vender) |

## 6. Testes antes de vender (modo de teste)

Marque cada item:

- [ ] O site abre em `https://seudominio` e o app em `https://seudominio/app`.
- [ ] Em Conta, o código chega no e-mail e entra.
- [ ] Assinar mensal com o cartão de teste `4242 4242 4242 4242` (qualquer data futura e CVC): volta para o app e mostra "Plus" em até 30 segundos.
- [ ] Em Conta, "Gerenciar assinatura" abre o portal; cancelar mostra "cancelado: vale até…".
- [ ] Com o Plus, "Sincronizar agora" funciona; num segundo aparelho (ou janela anônima) com a mesma conta, os cadernos aparecem.
- [ ] A IA responde com a conta grátis até a 5ª ação e depois mostra a oferta do Plus.
- [ ] A lista de espera do site grava (aparece em Supabase > Table Editor > waitlist e no Brevo).
- [ ] Excluir conta funciona com uma conta de teste.

Tudo certo? Repita o passo 4.5 com a chave **real** (`sk_live_...`), troque as variáveis do Stripe na Vercel pelas reais e faça um novo deploy.

## 7. Os seus cadernos

Seus cadernos de hoje estão guardados no seu iPad, no endereço onde você usa o app. Para levá-los para o endereço novo:

1. No app antigo: **Ajustes > Seus dados > Fazer backup**.
2. No app novo (`seudominio/app`): **Ajustes > Seus dados > Restaurar backup**.
3. Entre na sua conta (o e-mail de `OWNER_EMAILS`): você ganha o Plus. A partir daí a sincronização guarda tudo na nuvem também.

## 8. App das lojas

Veja [04-lojas.md](04-lojas.md). Em resumo: `NEXT_PUBLIC_API_BASE=https://seudominio npm run build:native`, depois abrir `ios/` no Xcode (num Mac) e `android/` no Android Studio.
