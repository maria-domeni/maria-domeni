# E-mails

Ferramenta: **Brevo** (grátis até 300 e-mails por dia). Também é o Brevo que entrega o código de login (SMTP), veja [01-colocar-no-ar.md](01-colocar-no-ar.md).

## Configurar o Brevo

1. Crie a conta com o e-mail do negócio e **autentique o domínio** (Senders & IP > Domains: DKIM e DMARC). Sem isso, os e-mails caem no spam.
2. Contacts > Lists: crie a lista **"Lista Domeni"** e anote o número dela (`BREVO_LIST_ID`).
3. Contacts > Settings > Contact attributes: crie os atributos de texto **SEMESTRE** e **FACULDADE** (o `FIRSTNAME` já existe).
4. SMTP & API > API Keys: crie uma chave (`BREVO_API_KEY`) e cadastre na Vercel.
5. Automations: crie a automação "Entrou na lista" (gatilho: contato adicionado à Lista Domeni) com o e-mail 1 abaixo.
6. Os outros e-mails são campanhas com data marcada (Campaigns > Create > agendar).

Regras: só manda para quem marcou o consentimento no site; todo e-mail tem o link de descadastro (o Brevo coloca); contas do app **não** entram na lista sem pedir.

Assine como você mesma. Substitua `{{ contact.FIRSTNAME | default: "oi" }}` conforme o editor do Brevo.

---

## Sequência da lista (aquecimento)

### 1. Boas-vindas (automático, na hora)

**Assunto:** Você está na lista do Domeni
**Pré-cabeçalho:** E o que vem por aí até fevereiro

> Oi, {{ FIRSTNAME }}!
>
> Que bom ter você aqui. Eu sou a Eduarda, estudo Psicologia (e Contábeis, sim, as duas ao mesmo tempo) e fiz o Domeni porque cansei de ter aula num lugar, PDF em outro, nota numa planilha e prova anotada no celular.
>
> O que acontece agora:
> - **5 de janeiro:** chega aqui o planner do semestre, de graça.
> - **Fim de janeiro:** aulão ao vivo mostrando como eu monto meu sistema de estudos com o Domeni.
> - **1º a 7 de fevereiro:** lançamento oficial, com o plano anual por preço de fundadora (R$ 129,90 por ano enquanto você mantiver a assinatura). Só nesses 7 dias.
>
> Se quiser usar desde já, o plano grátis está aberto: [seudominio/app](https://seudominio/app).
>
> Uma pergunta: qual é a parte mais chata de estudar na faculdade pra você? Responde este e-mail, eu leio todos.
>
> Eduarda

### 2. Planner do semestre (5/1, 9h)

**Assunto:** Seu planner do semestre chegou
**Pré-cabeçalho:** Para montar o semestre em 20 minutos

> Oi, {{ FIRSTNAME }}!
>
> Como prometido, aqui está o planner do semestre: [link do planner].
>
> Como usar em 20 minutos:
> 1. Coloque as disciplinas e os horários.
> 2. Anote as datas de provas e entregas assim que saírem os planos de ensino.
> 3. Escreva a regra de média e de faltas de cada disciplina (cada faculdade tem a sua).
>
> Se preferir fazer isso no Domeni, ele calcula sozinho quanto você precisa tirar e quantas faltas ainda pode ter.
>
> Eduarda

### 3. A história (12/1)

**Assunto:** Por que eu fiz o Domeni
**Pré-cabeçalho:** Duas faculdades, um iPad e um sistema que virou app

> **Atenção: este e-mail precisa da SUA história real.** Troque o trecho entre colchetes por um momento que aconteceu de verdade. Nunca invente.
>
> [Conte um momento real em que a desorganização te custou algo: um texto que você não achou, uma prova que pegou de surpresa, uma falta que quase reprovou.]
>
> Foi aí que comecei a montar um sistema: um caderno por disciplina, uma folha por aula, os PDFs ligados à matéria e revisões marcadas para 1, 7 e 30 dias depois.
>
> O Domeni é esse sistema virando app. Ele não estuda por você. Ele tira do caminho o tempo que você gasta procurando as coisas.
>
> Na próxima semana te conto o que a IA dele faz (e o que ela não faz de propósito).
>
> Eduarda

### 4. A IA (19/1)

**Assunto:** A IA que não faz seu trabalho
**Pré-cabeçalho:** E por que isso é uma boa notícia

> A IA do Domeni tem três regras:
>
> 1. **Só roda quando você pede.** Nada fica estudando por você em segundo plano.
> 2. **Parte das suas anotações.** Resumo, flashcards e questões saem da sua aula, não de um texto genérico.
> 3. **Avisa o que é complemento.** Se ela acrescentar algo que não estava nas suas fontes, isso aparece marcado para você confirmar com o professor. E ela não inventa referência.
>
> O que funciona melhor: anotar a aula, pedir as questões no estilo de prova e errar algumas. Errar treinando é o que faz lembrar na prova.
>
> Eduarda

### 5. Convite do aulão (26/1)

**Assunto:** Aulão ao vivo: seu segundo cérebro da Psico
**Pré-cabeçalho:** Quarta, 28/1, às 20h no Instagram

> Quarta-feira, 28 de janeiro, às 20h, faço uma live mostrando do zero:
> - como organizo um semestre inteiro;
> - como anoto uma aula no iPad;
> - como transformo a aula em questões de prova com IA, sem deixar ela pensar por mim.
>
> No fim conto como funciona o lançamento da semana seguinte.
>
> Ative o lembrete aqui: [link da live no Instagram]
>
> Eduarda

### 6. Lembrete (28/1, 17h)

**Assunto:** Hoje, 20h
> Te vejo às 20h no Instagram: [link]. Leva uma aula de hoje que a gente usa de exemplo.

---

## Semana de lançamento

### 7. Abertura (1º/2, 9h)

**Assunto:** Abriu: Domeni Plus com preço de fundadora
**Pré-cabeçalho:** Só até domingo, 7/2

> {{ FIRSTNAME }}, abriu!
>
> De hoje até domingo (7/2, 23h59), o **plano anual do Domeni Plus sai por R$ 129,90 por ano** (em vez de R$ 179,90), e esse preço continua enquanto você mantiver a assinatura.
>
> O que o Plus tem:
> - seus cadernos iguais no iPad, no celular e no computador;
> - backup na nuvem;
> - 150 ações de IA e 15 pesquisas a fundo por mês.
>
> No cartão você ainda tem 7 dias grátis para testar. Se desistir depois de pagar, tem 7 dias para pedir o dinheiro de volta, sem pergunta.
>
> [Quero o preço de fundadora](https://seudominio/app#/conta)
>
> O plano grátis continua grátis, para sempre.
>
> Eduarda

### 8. Dúvidas (4/2)

**Assunto:** As 5 perguntas que mais recebi
> 1. **Funciona no meu iPad antigo?** Se ele abre o Safari atualizado, funciona. Teste no grátis antes.
> 2. **Serve para outro curso?** Serve. Você define as regras de nota e falta.
> 3. **E se eu não gostar?** Cancela em dois toques. E tem 7 dias de arrependimento.
> 4. **A IA vai fazer meu TCC?** Não, e de propósito. Ela organiza e te faz treinar.
> 5. **Tem Pix?** No anual, sim, com 12 meses de acesso. (O preço de fundadora é no cartão, porque ele vale enquanto a assinatura durar.)
>
> Preço de fundadora até domingo: [seudominio/app#/conta](https://seudominio/app#/conta)

### 9. Último dia (7/2, 9h)

**Assunto:** Último dia do preço de fundadora
> Hoje, às 23h59, o anual volta para R$ 179,90. Se você quer o Domeni para este semestre, este é o melhor preço que ele vai ter.
>
> [Assinar com preço de fundadora](https://seudominio/app#/conta)
>
> Se não for a hora, tudo bem: o grátis fica com você.

### 10. Últimas horas (7/2, 19h)

**Assunto:** Termina às 23h59
> Só passando para lembrar: o preço de fundadora acaba hoje às 23h59. Depois disso, não volta. [Link](https://seudominio/app#/conta)

---

## E-mails automáticos do Stripe (cobrança)

Ligue em Stripe > Settings > Billing (nomes podem variar): lembrete de fim de teste, aviso de renovação anual, recibo, falha de pagamento. Em "Branding", coloque o ícone e a cor `#1d1d1f`. Esses e-mails são transacionais e vão para todas as assinantes.
