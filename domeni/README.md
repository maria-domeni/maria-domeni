# Domeni

Central de estudos da faculdade, feita para iPad com Apple Pencil, mas que também funciona no computador e no celular. É um app instalável (PWA), funciona sem internet e guarda os dados no próprio aparelho.

## O que tem

- **Cadernos**: um caderno por semestre e um por disciplina, com capa personalizável (cor, estampa, foto, etiqueta, elástico e adesivos).
- **Página da aula**: folha infinita, sem quebra de página.
  - Texto como no Notion: títulos, listas, checklist, cores, tamanhos, grifo, alinhamento e imagens.
  - Caneta e marca-texto para a Apple Pencil, com borracha.
  - Imagens, adesivos e post-its soltos que dá para arrastar. O texto fica no lugar.
  - Gravação da aula com transcrição ao vivo (reconhecimento de voz do navegador, sem custo).
  - Imprimir, salvar em PDF, baixar e compartilhar.
- **Agenda**: mês e semana com aulas, provas, entregas e lembretes. Mostra os eventos do Google Agenda (pelo endereço iCal), tem link "Adicionar ao Google Agenda" e exporta em .ics.
- **Contagem regressiva** para provas e entregas, na tela Hoje.
- **Notas e faltas**: limite de faltas, aulas por dia, média e pesos são configurados por você (cada disciplina pode ter a sua regra). Estágios não entram na conta de faltas.
- **Personagem**: um bonequinho personalizável (rosto, cabelo, roupa, acessórios, nome e jeito de falar). Fica no canto da tela e avisa sobre faltas, notas, provas, revisões, leituras e horas. Responde buscas nas suas anotações de todos os semestres e na biblioteca. Esses avisos e buscas são calculados no aparelho, sem IA.
- **Biblioteca**: estante com livros físicos e PDFs, leitor, progresso de leitura e busca por palavra dentro dos PDFs.
- **Estudar**: flashcards com repetição espaçada, questões, simulado, jogo da memória e as revisões das aulas em 1, 7 e 30 dias.
- **Estágio**: diário de campo, horas e relatórios, com aviso fixo de sigilo.
- **Horas**: atividades complementares e de extensão, com a meta que você definir.
- **Música**: tocador do Spotify que continua tocando enquanto você navega.
- **Aparência**: 7 estilos prontos (Rosé, Lavanda, Matcha, Caderno, Minimal, Noite e Café), claro e escuro, tom do papel, cor livre, 10 fontes, fundo quadriculado ou pontilhado e tipo de folha.

## IA (só quando você pede)

Nada de IA roda sozinho nem em segundo plano. Cada recurso tem o seu botão:

- resumo e resumo aesthetic;
- flashcards e questões;
- jogo;
- aprofundar um tema, com pesquisa na internet;
- explicar um conceito;
- agente de cada disciplina;
- pergunta ao personagem;
- organizar a transcrição;
- agente de relatório de estágio, treinado no formato do relatório psicológico (I a V, referências e anexos).

As regras da IA são:

- basear-se nas suas fontes;
- marcar conhecimento geral como "complemento — confirmar com o professor";
- nunca inventar citação, página ou referência;
- nunca registrar dados de pessoa atendida.

A IA usa a API da Anthropic. A chave fica só no servidor. Para ligar, configure no servidor (por exemplo, nas variáveis de ambiente da Vercel):

| Variável | O que é |
| --- | --- |
| `ANTHROPIC_API_KEY` | Chave da API da Anthropic (console.anthropic.com). É cobrada à parte do Claude Pro. |
| `DOMENI_ACCESS_CODE` | Uma senha que você inventa. Coloque a mesma em Ajustes › IA. Sem ela, ninguém usa os seus créditos. |

O gasto estimado do mês aparece em Ajustes › IA.

## Desenvolvimento

```bash
npm install
npm run dev     # http://localhost:3000
npm test        # testes da lógica (faltas, notas, agenda, backup…)
npm run lint
npm run build   # build de produção + service worker para uso offline
```

Tecnologia:

- Next.js 16, React 19, Tailwind CSS 4 e TypeScript;
- Dexie (IndexedDB) para os dados;
- Tiptap para o texto, perfect-freehand para a caneta e pdf.js para os PDFs;
- SDK da Anthropic no servidor.

## Privacidade

Os dados ficam no seu aparelho. Para levar a outro aparelho ou guardar, use o backup em Ajustes › Seus dados. Ele inclui fotos, PDFs e gravações, mas não inclui o código da IA.

O servidor só recebe o que você manda para a IA quando toca num botão. Também recebe o endereço do Google Agenda, que ele busca e repassa sem guardar.

## Próximas fases

- Contas, sincronização entre aparelhos e assinatura, para vender o app.
- Notificações com o app fechado (push).
- Importação do Notion e do Teams.
