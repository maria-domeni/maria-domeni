# Atlas

Central de estudos para a faculdade. Funciona no navegador do computador e instalado no iPad, tablet e celular, inclusive sem internet. Os dados ficam no próprio aparelho.

O Atlas organiza; quem estuda é você. Ele não gera resumos, questões nem respostas, e nada roda sozinho em segundo plano.

## O que já existe

- **Hoje**: capa personalizável, saudação, próximo passo, aulas do dia, revisões que vencem, prazos e leituras prévias. Os blocos podem ser escondidos e reordenados.
- **Cadernos**: Semestre > Disciplina > Aula, com cor (da paleta ou qualquer outra), símbolo e capa em cada disciplina.
- **Aula**: guia de estudo em quatro etapas (Antes, Durante, Depois, Revisão), editor de texto com imagens e salvamento automático.
- **Revisão espaçada**: agendada a partir da data da aula (1, 7 e 30 dias por padrão), com Fácil, Médio e Difícil.
- **Ajustes**: perfil com foto, tema claro/escuro, cor de destaque livre, fundo, fontes do app e dos títulos, tamanho do texto, capa e blocos da tela Hoje, intervalos de revisão, backup e restauração.

O "próximo passo" da tela Hoje é uma conta feita no próprio aparelho, a partir das datas das aulas, revisões e prazos. Não usa IA nem internet.

## Rodar no computador

```bash
npm install
npm run dev        # desenvolvimento, em http://localhost:3000
npm run build      # versão final + service worker (uso offline)
npm run start      # serve a versão final
npm test           # testes da lógica (datas, revisões, cores, imagens, backup, banco)
```

O modo offline só existe na versão final (`build` + `start`), não no `dev`.

## Como o código está organizado

| Pasta | Conteúdo |
| --- | --- |
| `src/lib` | Regras e dados: banco local (`db`, `store`), revisão espaçada (`reviews`), tela Hoje (`today`), aparência (`settings`, `color`), imagens, backup, datas, rotas |
| `src/screens` | Uma tela por arquivo |
| `src/components` | Estrutura do app, formulários, editor e componentes de interface |
| `src/app` | Página única, estilos, fontes e manifesto |
| `scripts` | Geração do service worker no build |

Decisões que valem para as próximas fases:

- **Dados locais primeiro.** Tudo é gravado no IndexedDB do aparelho, inclusive as imagens.
- **Navegação por hash** (`#/aula/…`). Trocar de tela nunca usa a rede.
- **Regras da faculdade são configuráveis.** Nenhuma média, peso ou frequência fica fixa no código.
- **Nada estuda por você.** Sem geração automática de conteúdo e sem tarefas em segundo plano.

## Fontes

Inter, Nunito, Lexend, Lora, Fraunces e Caveat, sob a SIL Open Font License 1.1 (permite uso comercial). Veja `src/app/fonts/LICENCA.md`.

## Próximas fases

2. Importação do Notion, anexos (PDF, slides, áudio), Entrada para arquivos do Teams, escrita com Apple Pencil
3. Notas, faltas, provas e prazos
4. Biblioteca, leitor de PDF com marcações, referência ABNT
5. Questões e flashcards que você mesma escreve, com repetição espaçada, simulados e caderno de erros
6. Planejador do semestre e Tempo (Pomodoro, horas por disciplina)
7. Estágios, horas complementares e trilha de especialidade
8. Busca global, mapa de conexões, pacote para NotebookLM/Thea
9. Contas, sincronização entre aparelhos e assinatura (para vender o Atlas)
