# Atlas

App pessoal de estudos de Psicologia. Funciona no iPad (instalado na Tela de Início) e no computador, inclusive sem internet. Os dados ficam no próprio aparelho.

## O que já existe (Fase 1)

- **Hoje**: próximo passo sugerido, aulas do dia, revisões vencidas, prazos e leituras prévias.
- **Cadernos**: Semestre > Disciplina > Aula.
- **Aula**: guia de estudo em quatro etapas (Antes, Durante, Depois, Revisão), editor de texto e salvamento automático.
- **Revisão espaçada**: agendada a partir da data da aula (1, 7 e 30 dias por padrão), com Fácil, Médio e Difícil.
- **Ajustes**: perfil, intervalos de revisão, tema claro/escuro, cor de destaque, backup e restauração em JSON.

## Rodar no computador

```bash
npm install
npm run dev        # desenvolvimento, em http://localhost:3000
npm run build      # versão final + service worker (uso offline)
npm run start      # serve a versão final
npm test           # testes da lógica (datas, revisões, backup, banco)
```

O modo offline só existe na versão final (`build` + `start`), não no `dev`.

## Como o código está organizado

| Pasta | Conteúdo |
| --- | --- |
| `src/lib` | Regras e dados: banco local (`db`, `store`), revisão espaçada (`reviews`), tela Hoje (`today`), backup, datas, rotas |
| `src/screens` | Uma tela por arquivo |
| `src/components` | Estrutura do app, formulários, editor e componentes de interface |
| `src/app` | Página única, estilos e manifesto |
| `scripts` | Geração do service worker no build |

Decisões que valem para as próximas fases:

- **Dados locais primeiro.** Tudo é gravado no IndexedDB do aparelho; nada depende de servidor.
- **Navegação por hash** (`#/aula/…`). Trocar de tela nunca usa a rede.
- **Regras da faculdade são configuráveis.** Nenhuma média, peso ou frequência fica fixa no código.
- **Chaves de IA só no servidor**, em variável de ambiente (a partir da Fase 5).

## Próximas fases

2. Importação do Notion, anexos, Entrada para arquivos do Teams, Apple Pencil
3. Notas, faltas, provas e prazos
4. Biblioteca, leitor de PDF, ABNT
5. Agentes de IA e Tutor
6. Questões, flashcards e simulados
7. Planejador do semestre e Tempo
8. Estágios, horas complementares e trilha de especialidade
9. Busca global, mapa de conexões, pacote NotebookLM/Thea e sincronização
