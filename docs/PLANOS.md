# Planos e conexão direta

O SideQuest é uma vitrine de serviços e conexão entre cliente e profissional. O valor do serviço é negociado e recebido diretamente pelo prestador; o aplicativo não mantém dinheiro, processa pagamentos ou desconta comissão. A monetização proposta é a assinatura de visibilidade profissional.

## Interface

“Meu Plano / Assinatura”, no dropdown de Roberto, mostra o nome do plano atual em um badge e abre `openPlansModal()`. O modal “Planos & Destaque Profissional” usa bottom sheet em mobile e comparação em três colunas no desktop. O exemplo inicial é **Pro Ouro, ativo até 15/11/2026**.

| Plano | Mensalidade de referência | Fotos | Região | Recursos |
| --- | --- | --- | --- | --- |
| Gratuito / Básico | R$ 0,00 | Até 3 | Até 10 km na região | Busca simples |
| Pro Prata | R$ 29,90 | Até 10 | Até 20 km | Descrição personalizada e exemplo de métricas |
| Pro Ouro | R$ 49,90 | Sem limite numérico de plano | Até 50 km | Prata + destaque na Home, contato direto, selo Verificado Pro e indicação de alertas prioritários |

Somente um plano aparece como atual. Enquanto Ouro estiver ativo, Básico oferece “Mudar para Básico”; “Plano Atual (Básico)” só aparece quando Básico está selecionado. O Ouro recebe o selo Mais Popular.

O benefício “3x mais orçamentos fechados” vem acompanhado de uma nota explícita de potencial ilustrativo, sem medição ou garantia de resultado. Os contadores de visitas/contatos também são exemplos, não rastreamento real de visitantes.

## Interações e regras

- Mudar de plano abre uma revisão com mensalidade, limite de fotos, região e efeitos da alteração. Confirmar aplica a simulação; voltar não altera o plano. Não há checkout, cobrança, estorno ou captura de cartão.
- O downgrade preserva todas as fotos existentes. Se a quantidade ultrapassa o limite, bloqueia novas publicações até adequar o portfólio ou ampliar o plano. O formulário protege o limite também se outra aba mudar o plano enquanto a foto está sendo preparada.
- O Ouro remove o antigo limite fixo de 12 fotos. Cada arquivo continua limitado a JPG/PNG/WebP válido, não vazio, de até 10 MB. As fotos ficam na sessão e sujeitas aos recursos do navegador.
- A área de atendimento é reduzida ao máximo permitido pelo novo plano, com atualização da pílula, controle deslizante e filtros. Básico usa 10 km como definição de região da demonstração.
- Gerenciar assinatura permite cancelar ou reativar a renovação demonstrativa. Cancelar mantém o plano ativo até a data exibida; não há cancelamento imediato dos benefícios. O prazo é uma fixture do exemplo, sem motor de cobrança ou expiração contratado.
- Prata e Ouro permitem salvar uma descrição personalizada de até 500 caracteres, exibida no perfil. O Básico volta à biografia padrão, preservando a descrição personalizada para uma eventual mudança futura.
- O telefone público é opcional e precisa ser informado explicitamente pelo profissional. Sem telefone, a ação de contato orienta usar o chat; nenhum número fictício é usado como destinatário.
- No Ouro, os cards de Roberto exibem WhatsApp e ligação. Só o clique do cliente abre `wa.me` ou `tel:` para o telefone configurado. Os testes conferem as URLs sem disparar chamadas ou mensagens.
- O Ouro coloca Roberto primeiro na seção Profissionais em Destaque quando atende aos filtros de nota/distância escolhidos pelo cliente. Outros planos continuam na busca simples. O selo Pro e os contatos premium seguem o plano.
- A prioridade de alertas e as métricas são demonstrações visuais do benefício, sem transporte de notificações, captura de visitantes ou garantia de novas O.S.

## Pagamento direto

A proposta do prestador e o painel exibem:

> O SideQuest não cobra taxa sobre seus serviços. Todo o pagamento é negociado e recebido diretamente por você com o cliente.

A proposta do cliente informa que deve combinar e pagar diretamente ao profissional. A antiga carteira, saque Pix, cadastro bancário e campos de métodos de pagamento do cliente foram removidos. A aba Ganhos é agora Gestão de Serviços: valores combinados, metas, projeção e relatórios de serviços, sem saldos bancários ou confirmação de recebimento. Veja [Gestão de Serviços](FINANCEIRO.md).

## Estado e arquivos

`assets/plans.js` compartilha o catálogo e a assinatura demonstrativa. O estado fica na chave `sidequest.subscription.v1.roberto` do `localStorage`; eventos sincronizam as abas de cliente e prestador na mesma origem HTTP/HTTPS. Inclui plano, preferência de renovação, data de referência, descrição e contato explicitamente publicado. Não armazena dados bancários nem cartão. A cópia incorporada no cliente usa os marcadores `BEGIN/END SHARED PLANS JS` e deve acompanhar o arquivo compartilhado.

`assets/provider-plans.js` controla a interface, revisão, gerenciamento e limites. `assets/provider-plans.css` define os cards e a comparação responsiva. `assets/provider-home.js`, `assets/sidequest.js` e o cliente consomem as mesmas regras. Falha de armazenamento e revisão desatualizada exibem erros sem anunciar alteração concluída.

Este é um protótipo, sem backend de assinatura, autenticação comercial ou cobrança real. Alterações de plano e contato persistem somente nesse navegador; não sincronizam entre dispositivos ou usuários reais. Verificação de assinatura, permissões de plano, expiração e notificações de produção precisam de fonte confiável no servidor.

## Verificação

Com servidor local e Chrome DevTools conforme [Redesign](REDESIGN-UX.md#verificação), executar sequencialmente:

```bash
node tests/plans-check.mjs
node tests/provider-finance-check.mjs
node tests/provider-home-check.mjs
node tests/provider-profile-check.mjs
node tests/provider-modals-check.mjs
node tests/browser-check.mjs
node tests/proposal-check.mjs
```

**Resultado: 34 verificações de planos, 18 de gestão de serviços, 32 da Home, 32 do perfil, 180 dos modais, 46 gerais e 32 de propostas aprovadas**, sem exceções JavaScript não tratadas.

O teste específico usa duas páginas reais e verifica plano inicial, comparação, preços, cancelar revisão, mudar de plano, limites, preservação de fotos, destaque, contato público, descrição, renovação, conflitos entre abas, falha de armazenamento, recarga, transparência de serviços e responsividade. Capturas ficam em `/tmp/sidequest-plans`. O teste não faz ligação, envia mensagem ou cobra assinaturas. Teclado virtual e área segura exigem conferência adicional em aparelho real.
