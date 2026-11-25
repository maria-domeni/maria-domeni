# Domeni

Sua faculdade inteira num caderno só: cadernos com caneta (feito primeiro para iPad com Apple Pencil), PDFs, agenda, notas, faltas, revisões, estágio e horas, com IA que só roda quando a pessoa pede.

- **Site de vendas:** `/` (preços, lista de lançamento, perguntas), `/termos`, `/privacidade`, `/cancelamento`.
- **App:** `/app` (PWA instalável, funciona sem internet, dados no aparelho).
- **Lojas:** projetos Capacitor em `ios/` e `android/`.

Para colocar no ar e vender, comece por **[docs/00-comece-aqui.md](docs/00-comece-aqui.md)**.

## Planos

| | Grátis | Plus |
| --- | --- | --- |
| Cadernos, caneta, PDFs, agenda, notas, faltas, revisões | sim | sim |
| IA (ações por mês) | 5 (com conta) | 150 + 15 pesquisas a fundo |
| Sincronização entre aparelhos e backup na nuvem | | sim (até 3 GB de arquivos) |
| Preço | R$ 0 | R$ 19,90/mês ou R$ 179,90/ano |

Preços e cotas: `src/lib/pricing.ts` (cotas também por variável de ambiente).

## Como funciona por dentro

| Parte | Tecnologia | Onde |
| --- | --- | --- |
| App e site | Next.js 16, React 19, Tailwind 4 | `src/app`, `src/screens`, `src/components` |
| Dados no aparelho | IndexedDB (Dexie), com marcação de mudanças para sincronizar | `src/lib/db.ts`, `src/lib/cloud/track.ts` |
| Contas, cotas, sincronização | Supabase (Postgres com Row Level Security, Auth por código no e-mail, Storage) | `supabase/migrations`, `src/lib/cloud`, `src/server` |
| IA | API da Anthropic, só no servidor; Haiku 5.5 para assinantes, modelo à escolha da dona | `src/app/api/ia`, `src/server/prompts.ts` |
| Pagamentos no site | Stripe Checkout, portal e webhooks | `src/app/api/assinatura`, `src/app/api/stripe` |
| Pagamentos nas lojas | RevenueCat (App Store e Google Play) | `src/lib/cloud/native.ts`, `src/app/api/revenuecat` |
| Lista de espera | Supabase + Brevo | `src/app/api/lista` |

Sem as variáveis de ambiente, o app funciona como antes: tudo local, sem conta. Veja `.env.example`.

## Comandos

```bash
npm install
npm run dev            # desenvolvimento em http://localhost:3000 (app em /app)
npm test               # testes (lógica, sincronização, webhooks)
npm run lint
npm run build          # produção (gera também o service worker)
npm run stripe:setup   # cria produto, preços, portal e webhook no Stripe
NEXT_PUBLIC_API_BASE=https://seudominio npm run build:native   # app das lojas (pasta out + cap sync)
```

O banco: rode `supabase/migrations/0001_domeni.sql` no SQL Editor do Supabase.

## Regras que o app segue

- IA só quando a pessoa toca num botão; nada em segundo plano gastando créditos.
- A IA parte das fontes da pessoa, marca o que é complemento e não inventa referência.
- Nenhuma regra de faculdade inventada: média, pesos e faltas são configuráveis.
- No estágio, aviso fixo para nunca guardar nome ou dado que identifique a pessoa atendida.
- A chave da Anthropic e as chaves secretas ficam só no servidor.
