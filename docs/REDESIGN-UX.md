# SideQuest — relatório de redesign UX/UI e IxD

Data: 27/10/2026. Escopo: interfaces de cliente e prestador, no protótipo HTML existente.

## Entrega e direção visual

Abra `SideQuestPrototipo.html` para acessar como cliente e `SideQuestPrestador.html` para acessar o prestador. Não há build nem instalação de dependências. Mantenha as pastas `assets` e `Images` ao lado dos arquivos.

A reformulação mantém a identidade verde e a logo original, com verde escuro nas ações, superfícies claras, texto mais legível e hierarquia entre título, instrução, campo e ação. O cliente ganhou espaço de trabalho de até 1120 px no desktop; categorias e profissionais reorganizam-se conforme a largura. No celular, a navegação continua fixa e identificada por ícone e texto. A ação “Solicitar” integra a barra, sem se sobrepor ao formulário ou ao chat.

HTML, DaisyUI, Tailwind e JavaScript foram preservados. `assets/redesign.css` concentra o sistema visual do prestador; uma cópia está incorporada ao HTML do cliente para preservar seu uso independente. Alterações futuras no sistema visual devem atualizar ambas as cópias.

## Diagnóstico da interface original

- O cliente limitava o conteúdo a 420 px inclusive no desktop; vários rótulos e metadados eram pequenos.
- Categorias sem profissionais substituíam os resultados por profissionais de todas as áreas. A chave parcial “Ar” também encontrava “Marcenaria”.
- A busca usava o primeiro profissional encontrado para abrir uma categoria inteira. Sem correspondência, mostrava apenas uma notificação.
- Todos os avisos globais tinham aparência de sucesso e desapareciam depois de 4,5 segundos, incluindo mensagens de erro.
- Os filtros do prestador não alteravam a lista. A contagem indicava 12 pedidos, embora apenas dois estivessem disponíveis.
- O formulário de orçamento ignorava os valores preenchidos e abria uma conversa fixa. Não havia separação de históricos por cliente.
- O portfólio simulava recorte sobre uma imagem fixa, sem seleção ou recorte funcional.
- O cadastro de prestador também levava ao painel da cliente Mariana.

## Mapeamento dos sete princípios

| Princípio | Elemento ou fluxo | Aplicação concreta |
| --- | --- | --- |
| Visibilidade | Início, pesquisa, navegação e oportunidades | Título explica a tarefa; busca tem botão de envio visível e filtro separado; navegação combina ícones e rótulos; `aria-current` identifica a tela; contagens refletem os dados locais. |
| Feedback | `showFeedback`, formulários, resultados, GPS e arquivos | Notificações distinguem sucesso, informação e erro; erros são anunciados com `role="alert"`; resultados têm contagem com `role="status"`; campos recebem `aria-invalid` e mensagens associadas; leitura de imagens informa processamento e conclusão. |
| Consistência | Cliente e prestador | Mesmos tokens de cor, foco, botões, campos, raios e notificações. Termos principais: “solicitação”, “proposta”, “mensagens” e “pedidos”. Textos de formulários usam caixa de frase. |
| Restrições | Solicitação, orçamento, anexos e portfólio | Categoria, descrição, endereço e data são validados; data passada é rejeitada; descrição tem até 500 caracteres; pedido aceita até cinco fotos de até 10 MB; orçamento exige de R$ 1 a R$ 100.000 e até duas casas decimais; portfólio respeita o plano (Básico 3, Prata 10, Ouro ilimitado) e exige decodificação válida; mensagem vazia do prestador não pode ser enviada. |
| Mapeamento | Categorias, filtros, cadastro e propostas | Categoria usa comparação exata; busca retorna todas as correspondências; filtros mantêm categoria e tela; filtro “Urgentes” realmente altera as oportunidades; proposta usa valor, duração e escopo preenchidos, na conversa do cliente selecionado; cadastro de prestador abre o prestador. |
| Indicação de uso | Controles de ação, galeria e arquivos | Ações usam botões com texto; ícones sem texto têm nome acessível; estados de pressionamento e foco são perceptíveis; seleção de foto apresenta instruções, limites, prévia e confirmação; filtros ativos expõem `aria-pressed`. |
| Controle do usuário | Rascunhos, favoritos, pedidos, propostas e portfólio | Voltar mantém o rascunho da solicitação; propostas guardam rascunhos por cliente; é possível editar proposta e desfazer sua alteração; pedido pendente pode ser cancelado e restaurado; remoção de favorito pela lista e adição/remoção de fotos têm desfazer; modais permitem cancelar, fechar ou usar Escape. |

## Tratamento das situações

| Situação | Local | Resposta e recuperação |
| --- | --- | --- |
| Cadastro concluído | Acesso do cliente | “Cadastro de demonstração realizado. Busque um profissional ou crie sua primeira solicitação.” O cabeçalho usa o nome informado. Prestador é encaminhado à página do prestador, que identifica o ambiente demonstrativo. |
| Publicação concluída | Nova solicitação | Cria um pedido em “Aguardando propostas”, abre Meus pedidos e informa onde acompanhar. Não avança etapas automaticamente. |
| Orçamento inválido | Preparar proposta | Explica a faixa e as casas decimais do valor, pede duração e escopo. Associa cada erro ao campo e leva o foco ao primeiro problema, preservando o preenchimento. |
| Arquivo inválido | Fotos do pedido, chat e portfólio | Explicita formatos e tamanho máximo. Portfólio e chat do prestador também rejeitam arquivos vazios e falhas de leitura/decodificação. O portfólio não habilita a confirmação enquanto a prévia não estiver pronta. |
| Pesquisa ou categoria vazia | Resultados do cliente | “Nenhum profissional encontrado”, com instruções e ações “Ver todos os profissionais” e “Criar solicitação”. Não apresenta profissionais de outra categoria como se fossem resultados válidos. |
| Filtros sem correspondência | Destaques e oportunidades | Explica ausência de resultados e oferece limpar/remover filtros. Os filtros não trocam a categoria ou a tela atual do cliente. |
| Listas sem dados | Pedidos, histórico e favoritos | Mantém os estados orientativos existentes, com explicação do que aparecerá ali e, quando adequado, ação de criar solicitação. |
| Processamento de imagem | Portfólio e chat | Informa “Preparando prévia da imagem…” ou “Processando imagem…”. Na prévia do portfólio, usa `aria-busy`, mantém a confirmação desabilitada e depois orienta a conferir a foto. Cancelar invalida callbacks pendentes. |
| GPS demorado ou negado | Endereço da solicitação | Mantém “Buscando sua localização…”, botão ocupado e bloqueado durante a consulta. Em recusa ou falha, permite preencher o endereço manualmente. Coordenadas não são apresentadas como rua geocodificada. |
| Proposta adicionada/editada | Mensagens do prestador | Confirma o cliente e o próximo passo; o cartão apresenta valor, duração e escopo reais. “Editar proposta” e “Desfazer” mantêm autonomia. |
| Cancelamento | Detalhes do pedido pendente | Cancela apenas pedidos que aguardam propostas, atualiza a lista e oferece “Desfazer cancelamento”. Restaura os dados e as fotos ao desfazer. |

Notificações sem ação desaparecem após sete segundos e podem ser fechadas. Erros e notificações com desfazer permanecem até serem fechados ou substituídos por uma nova notificação. Não há atrasos artificiais: publicar, filtrar e adicionar uma proposta são operações locais imediatas. Os indicadores de processamento correspondem à leitura de arquivos e à consulta de GPS.

## Changelog e motivo das decisões

| Antes | Depois | Motivo |
| --- | --- | --- |
| Conteúdo estreito em qualquer resolução | Layout até 1120 px, categorias em quatro ou oito colunas e profissionais em uma ou duas colunas | Aproveitar desktop sem prejudicar o celular. |
| Tipografia miúda e pouca diferenciação de hierarquia | Títulos maiores, metadados mais legíveis, controles de pelo menos 44 px e foco visível | Facilitar leitura, toque e navegação por teclado. |
| FAB elevado sobre o conteúdo | Ação “Solicitar” alinhada à navegação | Evitar conflito com digitação e publicação. |
| Banner promocional alterado no redesign inicial | Banner verde de 15% restaurado conforme referência do usuário; início começa pela busca | Preservar a oferta e a composição visual solicitadas. |
| Contagens ilustrativas de profissionais e pedidos | Contagens calculadas a partir dos dados exibidos | Evitar expectativas incorretas. |
| Categorias vazias com resultados substitutos | Estado vazio com recuperação; comparação exata de categoria | Respeitar a escolha do usuário. |
| Primeiro resultado redirecionava para categoria | Busca por nome, especialidade e categoria retorna todos os correspondentes | Fazer o resultado refletir a consulta. |
| Filtros devolviam o cliente ao início | Aplicação na tela atual, mantendo contexto | Reduzir desorientação e retrabalho. |
| Aviso de erro com aparência de sucesso | Semântica, cor, texto e permanência próprios | Diferenciar falha de conclusão sem depender apenas de cor. |
| Orçamento e conversa fixos | Dados reais do formulário e histórico/rascunho por cliente | Relacionar cada controle ao seu efeito correto. |
| Simulador de recorte sem interação | Seleção real de arquivo, validação, prévia e confirmação | Oferecer uma ação compreensível e funcional. O novo fluxo não anuncia recorte. |
| Ações de remoção sem recuperação | Desfazer em favorito da lista, pedido pendente, proposta e fotos adicionadas | Permitir corrigir enganos sem confirmação bloqueante para cada ação. |
| Cadastro ignorava nome e perfil | Cliente usa nome preenchido; prestador abre a página correspondente | Respeitar a intenção informada. |
| Mudança de tela sem destino de foco definido | Foco vai ao título ou à seção; link “Pular para o conteúdo” | Tornar as transições perceptíveis para teclado e tecnologia assistiva. |

## Verificação

**Resultado executado: 46 verificações aprovadas no Chrome headless, sem exceções JavaScript não tratadas.**

Teste automatizado: `tests/browser-check.mjs`, usando Chrome headless e o protocolo DevTools, sem novas dependências. Asserções cobrem fluxos, dados, estados e ausência de erros JavaScript; capturas reais complementam a inspeção visual.

Executar em terminais separados, a partir da raiz:

```bash
python3 -m http.server 8765 --bind 127.0.0.1
```

```bash
google-chrome --headless=new --remote-debugging-port=9222 --user-data-dir=/tmp/sidequest-review-browser about:blank
```

```bash
node tests/browser-check.mjs
```

O script verifica acesso, campos inválidos e foco, abas por teclado, Escape em modal, correspondência exata de categorias, múltiplos resultados de busca, filtros, rascunhos, data passada, arquivo inválido, publicação, cancelamento e restauração, favoritos, propostas por cliente, edição e desfazer, separação de mensagens, prévia real e desfazer de foto, gráfico, movimento reduzido e encaminhamento de cadastro. Verifica ausência de rolagem horizontal no início do cliente e nas oportunidades do prestador em 320, 390, 768 e 1280 px. As capturas são gravadas em `/tmp/sidequest-review`.

## Capturas da interface

- [Início do cliente no celular](redesign/cliente-inicio-mobile.png)
- [Início do cliente no desktop](redesign/cliente-inicio-desktop.png)
- [Busca sem resultados](redesign/cliente-busca-vazia.png)
- [Proposta na conversa do prestador](redesign/prestador-proposta.png)

## Limites da entrega

O produto permanece um protótipo local. Cadastro, recuperação de senha, propostas, mensagens, pagamentos e ganhos não têm backend nem envio real. Dados de conta, pedidos avulsos, mensagens comuns, rascunhos e arquivos são descartados ao recarregar. A marca de acesso demonstrativo pode persistir conforme “Lembrar de mim”. Propostas enviadas e respostas agora persistem e sincronizam entre abas na mesma origem e navegador; o pedido de uma proposta aceita é reconstruído no cliente. Essa evolução e seus testes estão em [Propostas](PROPOSTAS.md). A página do prestador continua representando o perfil demonstrativo de Roberto.

As fotos remotas precisam de internet. O cliente preserva CDNs e tem fallback para as bibliotecas locais quando aberto com o projeto completo. Não foi feita auditoria completa de conformidade WCAG nem teste de GPS real, entrega de e-mail, cobrança ou transporte de mensagens. Os testes de responsividade cobrem os fluxos e larguras especificados acima, e não todos os conteúdos possíveis em todas as telas.
