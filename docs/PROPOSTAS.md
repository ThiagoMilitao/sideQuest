# Preparar Proposta e orçamento no chat

O prestador e o cliente usam o mesmo modelo de orçamento e o mesmo renderizador de card. A solicitação identifica cliente, profissional e serviço; valor total, previsão, duração e escopo vêm do formulário, sem um segundo orçamento fixo na conversa.

## Fluxo e apresentação

- O modal mostra **Preparar Proposta**, cliente e título da solicitação em um badge. O valor tem prefixo R$ fixo, destaque e validação entre R$ 1,00 e R$ 100.000,00, com até duas casas decimais.
- Previsão de atendimento é texto livre, até 120 caracteres, permitindo data e hora ou expressões como “Amanhã às 10h”. A duração oferece sugestões e texto personalizado até 80 caracteres; não se trata de um agendador com disponibilidade real.
- Escopo obrigatório de até 1.000 caracteres. Cada linha não vazia vira um tópico no card; marcadores iniciais são removidos apenas na apresentação. Os dados são inseridos com `textContent`, preservando o texto sem interpretar HTML.
- **Enviar Proposta no Chat →** valida os quatro campos, indica envio em andamento e evita submissão duplicada. Falha mantém o conteúdo e explica o problema no formulário.
- **Guardar rascunho e fechar**, Escape e fechamento pelo fundo preservam o rascunho por cliente na sessão. Rascunhos não sobrevivem à recarga.
- O card contém selo oficial, status, serviço, total, previsão, duração, escopo e ações adequadas ao perfil. O cliente pode aceitar, pedir ajuste ou recusar com comentário. O prestador vê a resposta e pode reenviar uma versão revisada enquanto não houver contratação.
- A aprovação cria um único pedido com os mesmos dados e bloqueia edição do orçamento aceito. Ao recarregar o cliente, esse pedido é reconstruído a partir da proposta aceita.
- Desfazer restaura a versão anterior e guarda os campos enviados como rascunho. Se outra aba já respondeu ou alterou o registro, a operação é bloqueada e orienta conferir a versão atual.

## Sincronização e limites

`assets/proposals.js` armazena registros por solicitação no `localStorage`, sob o prefixo `sidequest.proposal.v1.`. Eventos `storage` atualizam outras abas; eventos locais atualizam a página emissora. Revisões detectam edições desatualizadas e Web Locks serializa operações nos navegadores que oferecem essa API. Sem Web Locks, permanece a verificação de revisão, sem garantia transacional entre abas concorrentes.

É necessário abrir as duas páginas pela **mesma origem HTTP/HTTPS**, por exemplo `http://127.0.0.1:8765`. Arquivos abertos diretamente por `file://` mostram uma orientação para usar servidor local ao enviar ou responder. Falhas de armazenamento não são anunciadas como envio concluído.

A conversa de Mariana com Roberto recebe somente a proposta dessa solicitação. O orçamento de Carlos fica separado na visão do prestador; não é entregue à conta demonstrativa de Mariana. O exemplo inicial de Mariana já contém todos os campos em ambos os perfis e é substituído ao enviar uma proposta.

Este é um protótipo, sem autenticação ou servidor. Não há sincronização entre dispositivos, contas reais ou navegadores diferentes. Mensagens comuns e outros dados do aplicativo não são sincronizados. Os registros locais não são proteção de acesso nem fonte confiável para cobrança; uma versão de produção precisa de persistência, autorização e transações no backend.

## Arquivos e verificação

- `assets/proposals.js`: contrato, persistência, conflitos, respostas e card compartilhado.
- `assets/proposals.css`: modal e card responsivos.
- `assets/sidequest.js` e `SideQuestPrestador.html`: formulário, rascunho, envio e integração do prestador.
- `SideQuestPrototipo.html`: integração do cliente; incorpora o JS e CSS compartilhados nos blocos `BEGIN/END SHARED PROPOSAL` para preservar o HTML copiável.

Com servidor e Chrome DevTools conforme o [relatório de redesign](REDESIGN-UX.md#verificação), executar sequencialmente:

```bash
node tests/proposal-check.mjs
node tests/browser-check.mjs
node tests/provider-home-check.mjs
```

Resultado: **32 verificações de propostas, 46 de regressão geral e 32 da Home do prestador aprovadas**, sem exceções JavaScript não tratadas. O teste de propostas usa duas abas reais e cobre transmissão de todos os campos, rascunho, desfazer, isolamento entre clientes, ajuste, recusa, aprovação, conflito, imutabilidade, recarga, falha de armazenamento, texto com HTML e layout em 320, 390 e 768 px. Capturas do fluxo ficam em `/tmp/sidequest-proposals`.
