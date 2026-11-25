# Empresa e impostos

Resumo para levar ao contador. Você estuda Contábeis, então vai direto ao ponto. Regras tributárias mudam: confirme cada item com o contador antes de abrir.

## Decisão

**Abrir uma ME (Sociedade Limitada Unipessoal) no Simples Nacional**, com atividade principal de licenciamento de software não customizável (o mesmo app para todas as clientes).

| Item | Recomendação | Por quê |
| --- | --- | --- |
| Tipo | SLU (sócia única), porte ME | Separa seu patrimônio do negócio |
| MEI? | Não | Licenciar ou desenvolver software não está entre as ocupações permitidas ao MEI |
| CNAE principal | 6203-1/00 (desenvolvimento e licenciamento de programas de computador não customizáveis) | É o que o Domeni vende: acesso a um software por assinatura |
| CNAE secundário | 6311-9/00 (tratamento de dados, provedores de serviços de aplicação e hospedagem) | Cobre a parte de nuvem e sincronização |
| Regime | Simples Nacional | Uma guia só (DAS), alíquota inicial baixa |
| Nota fiscal | NFS-e de Curitiba (ou do município da sede) | Serviço tributado pelo ISS municipal |

## Anexo do Simples e Fator R

As atividades de software ficam no **Anexo III ou no Anexo V**, conforme o **Fator R** (folha de salários, incluindo pró-labore, dos últimos 12 meses dividida pela receita bruta dos últimos 12 meses):

- Fator R de 28% ou mais: **Anexo III**, alíquota nominal inicial de 6%.
- Abaixo de 28%: **Anexo V**, alíquota nominal inicial de 15,5%.

Na prática: definir um pró-labore que mantenha o Fator R em pelo menos 28% costuma sair mais barato no começo (o pró-labore tem INSS de 11%). Peça ao contador a simulação com a receita prevista. (Faixas e alíquotas conferidas pela regra geral do Simples; confirme os valores vigentes.)

## Receitas por canal

| Canal | Quem cobra | Observação para o contador |
| --- | --- | --- |
| Site (Stripe): cartão e Pix | Stripe repassa para sua conta bancária | Emitir NFS-e para cada assinatura paga (dá para automatizar com um emissor ligado ao Stripe, como eNotas ou NFE.io). As operadoras informam vendas à Receita (DIMP) |
| App Store | Apple vende e repassa a você | A Apple é a vendedora para a consumidora; você recebe da Apple (empresa no exterior). Pergunte sobre tratamento como exportação de serviço (pode afastar ISS, PIS e Cofins no Simples) |
| Google Play | Google vende e repassa a você | Mesmo ponto da Apple |

## Antes da primeira venda

- [ ] CNPJ aberto e conta bancária PJ.
- [ ] Stripe com os dados do CNPJ (pode começar com CPF e migrar).
- [ ] Inscrição municipal para emitir NFS-e.
- [ ] Dados da empresa no rodapé do site (variáveis `NEXT_PUBLIC_COMPANY_*`), exigência do Decreto 7.962/2013 para quem vende pela internet.
- [ ] Contrato do contador incluindo NFS-e recorrentes e DAS mensal.

## Depois da colação de grau (CRP)

O Domeni é software de estudo, não serviço psicológico. Ainda assim, quando você tiver CRP, a sua imagem como psicóloga passa a seguir as regras de publicidade do Conselho. Mantenha o marketing do Domeni como produto de estudo (sem promessa de resultado, sem depoimento de paciente, sem usar a profissão como chamariz) e consulte a orientação do CRP-SP antes da transição. Veja [09-regras-eticas.md](09-regras-eticas.md).
