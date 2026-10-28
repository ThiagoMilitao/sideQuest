# SideQuest Pro — Home do prestador

A página `SideQuestPrestador.html` usa `data-theme="emerald"`, os mesmos tokens, botões e microinterações do cliente. O header contém perfil de Roberto, dropdown de conta e pílula de raio. A marca “SideQuest Pro” e o aviso de demonstração foram retirados do topo.

## Comportamento

- Resumo mensal: **R$ 2.850,00**, **+18%**, **2 O.S. em andamento**, **4.9** e **42 avaliações**. O painel de ganhos e o gráfico foram alinhados ao total mensal; o mês anterior no gráfico é R$ 2.415.
- Busca ao digitar por chamado, cliente, serviço ou bairro, ignorando acentos.
- Chips **Todas**, **Elétrica**, **Urgentes** e **Até 5 km**. Elétrica, urgência e distância podem ser combinadas. “Todas” limpa os chips, mantendo a busca e o raio escolhido.
- Contadores dos chips refletem a busca e a área de atendimento. Estado vazio oferece limpar a busca/filtros ou ajustar a área.
- Raio entre 1 e 50 km e cidade base editáveis. A distância exibida nos dados do protótipo é relativa a Santos; selecionar outra cidade não reutiliza esses chamados como se a distância fosse calculada para o novo local.
- Cards apresentam categoria, prazo, bairro, distância, demanda, descrição e ação **Enviar Proposta**. A ação abre o formulário de orçamento existente e preserva rascunhos por cliente.
- Bottom Nav mantém Oportunidades, Mensagens, Ganhos e Perfil. O badge inicia em duas oportunidades novas e diminui ao abrir o formulário de proposta correspondente.

O formulário e o card de orçamento compartilham valor, previsão, duração e escopo. Envio, aprovação, ajuste e recusa sincronizam entre as páginas na mesma origem e navegador. Detalhes e limites: [Propostas](PROPOSTAS.md).

## Dropdown da conta

1. **Meu Perfil & Portfólio:** abre a gestão existente de perfil e fotos.
2. **Meus Serviços & Categorias:** seleciona serviços, exige pelo menos uma categoria e atualiza o resumo do perfil. Não oculta automaticamente chamados de outras especialidades na opção “Todas”.
3. **Meu Plano / Assinatura:** mostra o plano ativo e abre o comparativo, gerenciamento de renovação e configuração de contato público. As mudanças são demonstrativas, sem cobrança. Veja [Planos](PLANOS.md).
4. **Raio de Atendimento:** abre o mesmo controle da pílula do header.
5. **Configurações:** permite reduzir movimento, respeitando também a preferência do sistema.
6. **Alternar para Modo Cliente:** abre a visão demonstrativa de Mariana, usando somente a marca booleana de acesso já existente no cliente.
7. **Sair da Conta:** limpa as marcas de acesso demonstrativo e retorna ao login do cliente.

O dropdown usa `details/summary`, botões nativos, foco visível, navegação com setas, Escape e fechamento ao interagir fora. Os painéis usam diálogos nativos e as transições já existentes.

## Perfil e portfólio

O Perfil reúne apresentação profissional, selos, especialidades, métricas, fotos locais de serviços e avaliações. A publicação de trabalhos usa dropzone, título obrigatório, prévia e Desfazer. Detalhes e fontes: [Perfil](PERFIL.md).

## Painel Financeiro

A aba Ganhos agora representa Gestão de Serviços: valores combinados, status de execução, meta, projeção e relatórios, sem processamento de pagamento. Não há carteira nem dedução por serviço. Veja [Financeiro](FINANCEIRO.md) para regras, cálculos, arquivos e testes.

## Mensagens e conversa individual

A aba **Mensagens** abre `screen-provider-messages`, com conversas recentes de Mariana e Carlos. Cada card mostra avatar (ou iniciais), nome, horário, prévia da última mensagem/orçamento, status da proposta e não lidas. Mariana começa com uma não lida; abrir a conversa zera o contador. Respostas ao orçamento recebidas enquanto a conversa está fechada atualizam a lista e as não lidas.

O chat individual não tem seletor de destinatário. O cabeçalho mostra nome, bairro e presença demonstrativa; tocar na identidade abre o bottom sheet de detalhes da cliente, com solicitação e atalho para o orçamento. **✕** retorna à lista e restaura o foco ao card correspondente. A aba Mensagens permanece ativa nas duas telas.

A conversa usa o mesmo card de orçamento do cliente, com ação **Editar proposta** antes da aprovação. Campos e respostas continuam sincronizados conforme [Propostas](PROPOSTAS.md). Mensagens comuns, anexos e rascunhos permanecem separados por cliente e apenas nesta sessão. O indicador **Online agora** é ilustrativo, sem serviço de presença real.

A barra com clipe, campo arredondado e envio circular fica fora da área de rolagem, imediatamente acima da Bottom Nav. Apenas o histórico rola; a altura acompanha `visualViewport` quando disponível. A navegação mantém Oportunidades, Mensagens, Ganhos e Perfil. Imagens aceitam JPG, PNG ou WebP não vazios de até 10 MB, com validação e mensagens de erro existentes.

`node tests/provider-chat-check.mjs` verifica lista, leitura, status, separação de mensagens/rascunhos, perfil, atalho para proposta, ordem da conversa e posição da barra entre 320 e 1280 px, incluindo altura reduzida. **27 verificações do chat aprovadas**, sem exceções JavaScript não tratadas. Também passaram 46 verificações gerais, 32 da Home, 32 de propostas e 116 dos modais. Capturas ficam em `/tmp/sidequest-provider-chat`. Teclado virtual e área segura exigem conferência adicional em dispositivo real.

## Modais responsivos

Os onze diálogos (planos, revisão de plano, meta, relatório, detalhes da cliente, raio, serviços, configurações, proposta, publicação e visualização de foto do portfólio) usam `modal modal-bottom sm:modal-middle`. A caixa ocupa toda a largura abaixo de 640 px, encosta na base e tem apenas os cantos superiores arredondados, com indicador visual no topo. A partir de 640 px, fica centralizada e limitada a 512 px, com todos os cantos arredondados. O comparativo de planos pode chegar a 1024 px para acomodar as três colunas.

`assets/provider-modals.css`, carregado após os estilos compartilhados, substitui as antigas margens e larguras que cortavam os painéis. `100dvh` acompanha a altura disponível; o conteúdo tem rolagem interna e padding para `safe-area-inset-*`. Campos têm pelo menos 16 px para evitar zoom automático no iOS; o valor da proposta mantém o destaque maior. O viewport permite que o teclado reduza a área disponível nos navegadores compatíveis.

O teste `node tests/provider-modals-check.mjs` mede todos os diálogos em 320, 390, 639, 640, 768 e 1280 px, incluindo alturas reduzidas e paisagem. Confere limites, alinhamento, cantos, puxador, acesso ao rodapé por rolagem, indicador de distância, salvar, cancelar e Escape. **180 verificações dos modais foram aprovadas**, sem exceções JavaScript não tratadas. Capturas ficam em `/tmp/sidequest-provider-modals`. A emulação não substitui a conferência em dispositivo real de teclado virtual, barras do navegador e área segura.

## Arquivos

- `SideQuestPrestador.html`: header, stats, busca, chips, cards, nav e painéis.
- `assets/provider-chat.css`: lista de conversas, identidade, perfil e layout do chat com barra de digitação fora da rolagem.
- `assets/provider-modals.css`: geometria mobile-first dos diálogos, área segura e rolagem.
- `assets/provider-home.css`: estilos específicos do prestador, sem alterar a visão do cliente.
- `assets/provider-home.js`: busca/filtros, conta, preferências, raio, categorias, limites do plano e navegação entre perfis.
- `assets/sidequest.js`: integração com a Home e com o fluxo existente de propostas; dados do gráfico atualizados.
- `assets/sidequest.css`: tema base habilitado para emerald, mantendo a compatibilidade com sidequest.

## Verificação

Com o servidor e o Chrome DevTools configurados no [relatório de redesign](REDESIGN-UX.md#verificação), executar sequencialmente:

```bash
node tests/provider-home-check.mjs
node tests/browser-check.mjs
```

Foram aprovadas **32 verificações da Home do prestador e 46 de regressão dos fluxos existentes**, sem exceções JavaScript não tratadas, cobrindo navegação, filtros, raio, validação dos painéis, redução de movimento, propostas, valores do gráfico e layout entre 320 e 1280 px. Capturas ficam em `/tmp/sidequest-provider`.

A aplicação continua sendo um protótipo: métricas, chamados, distâncias e ganhos são ilustrativos; não há recebimento financeiro ou envio externo de propostas. Alterações de raio, categorias e configurações são descartadas ao recarregar. Assinatura demonstrativa, descrição personalizada e contato público ficam no armazenamento local; não há backend de cobrança.
