# Gestão de Serviços — pagamento direto

A aba Ganhos é um painel de gestão de acordos de serviços. O SideQuest não guarda dinheiro, processa o pagamento do cliente ou desconta comissão. Foram removidos os fluxos de carteira, saque, Pix do aplicativo e cadastro bancário. A receita comercial do produto vem dos [planos de assinatura e destaque](PLANOS.md).

## Indicadores

O exemplo tem 28 serviços concluídos, somando R$ 2.850,00 em valores combinados, e dois serviços em andamento que somam R$ 1.030,00. Esses valores não são saldo disponível nem confirmação de recebimento. Mariana, O.S. #2084, mantém o acordo integral de R$ 150,00, sem dedução.

O ticket médio é R$ 2.850,00 ÷ 28 = R$ 101,79, arredondado. A meta inicial de R$ 3.500,00 indica 81% de progresso. A meta pode ser editada e a projeção usa o ritmo diário de serviços, sem confirmar pagamentos futuros. Gráfico, metas e relatórios usam os mesmos registros, em centavos inteiros.

As três métricas são Em andamento, Concluídos no mês e Ticket médio. O gráfico permite Este Mês (acumulado diário), Últimos 3 Meses e Ano (totais mensais até o mês atual). Os valores também estão disponíveis em uma lista acessível. O histórico filtra Todas, Concluídos e Em andamento; expandir um acordo informa que o pagamento é combinado diretamente com o cliente.

## Exportação

O CSV e a impressão para salvar PDF incluem todos os serviços do mês, independentemente do filtro visual, com data, O.S., cliente, status do serviço e valor combinado. Não incluem transações bancárias, taxas ou valores descontados. O relatório explica que não é confirmação de recebimento nem documento fiscal.

O download CSV usa UTF-8 com BOM e separador ponto e vírgula. Para PDF, o usuário escolhe Salvar como PDF na janela nativa de impressão. Mês, datas e horários seguem America/Sao_Paulo.

## Arquivos e testes

- `SideQuestPrestador.html`: Gestão de Serviços, meta e relatório.
- `assets/provider-finance.js`: registros ilustrativos de acordos, cálculo dos indicadores, gráfico e exportação.
- `assets/provider-finance.css`: layout e impressão.
- `tests/provider-finance-check.mjs`: reconciliação, ausência de controles bancários, valor integral de Mariana, filtros, gráfico, meta, relatórios e layout de 320 a 1280 px.

Executar `node tests/provider-finance-check.mjs`, com servidor e Chrome conforme [Redesign](REDESIGN-UX.md#verificação). Os registros de exemplo são independentes dos pedidos do chat. Aceitar uma proposta não registra dinheiro recebido. Indicadores e metas continuam em memória e voltam ao exemplo ao recarregar.
