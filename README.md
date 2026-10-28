# SideQuest

Vitrine de serviços residenciais que conecta clientes a profissionais da região. O cliente encontra um prestador, combina o orçamento e negocia o pagamento diretamente com ele. **O SideQuest não processa pagamentos de serviços nem cobra comissão por contratação.** A monetização proposta é por planos de assinatura e destaque para profissionais.

Este repositório contém um **protótipo front-end funcional**, com as visões do cliente e do prestador, desenvolvido em HTML, CSS e JavaScript, sem instalação ou build.

## Acesse a demonstração

- **Aplicativo:** [SideQuest no GitHub Pages](https://thiagomilitao.github.io/sideQuest/)
- **Cliente:** [Entrar como cliente](https://thiagomilitao.github.io/sideQuest/SideQuestPrototipo.html)
- **Prestador:** [Perfil demonstrativo de Roberto Alves](https://thiagomilitao.github.io/sideQuest/SideQuestPrestador.html)

O acesso é demonstrativo: não existe autenticação real. Na tela de entrada, uma das opções sociais permite explorar o cliente sem cadastrar credenciais reais. Na visão do prestador, Roberto já está disponível para testar oportunidades, propostas, perfil e planos.

## Funcionalidades

### Para o cliente

- Busca por nome, especialidade e categoria, filtros e profissionais em destaque.
- Oito categorias principais na Home e catálogo completo organizado por nichos.
- Perfis, avaliações, portfólio, favoritos e contato direto conforme o plano do profissional.
- Solicitação de serviço com descrição, data, endereço e até cinco fotos válidas.
- Conversas e propostas com valor, previsão de atendimento, duração e escopo.
- Aprovar orçamento, pedir ajuste ou recusar, mantendo os dados da proposta no pedido.
- Busca de endereço, locais salvos e GPS com permissão do navegador.

### Para o prestador

- Oportunidades com busca, filtros, região e raio de atendimento.
- Lista de conversas, chat individual e detalhes do cliente.
- Preparação de proposta, rascunho, edição e desfazer.
- Perfil com especialidades, selos e avaliações demonstrativas.
- Portfólio com dropzone, prévia, título, validação de imagem e desfazer.
- Gestão de Serviços com valores combinados, meta, projeção, gráfico e relatórios CSV/PDF.
- Gerenciamento de plano, revisão da mudança e renovação demonstrativa.

### Planos profissionais

| Plano | Mensalidade de referência | Portfólio | Região | Destaques |
| --- | --- | --- | --- | --- |
| Gratuito / Básico | R$ 0,00 | Até 3 fotos | Até 10 km | Busca simples na região |
| Pro Prata | R$ 29,90 | Até 10 fotos | Até 20 km | Descrição personalizada e exemplo de métricas |
| Pro Ouro | R$ 49,90 | Sem limite numérico de plano | Até 50 km | Home em destaque, contato direto, selo Pro e prioridade demonstrativa |

Roberto começa no **Pro Ouro**, com data de referência de vigência até **15/11/2026**. A mudança de plano ajusta os recursos do protótipo e preserva as fotos existentes. **Nenhuma assinatura é cobrada de verdade.** Métricas, selos e projeções são ilustrativos; não representam verificação ou garantia de contratação.

## Tecnologias

- HTML5, CSS e JavaScript sem framework de aplicação.
- Tailwind CSS e DaisyUI, com tema `emerald`.
- Font Awesome 6 para ícones.
- Chart.js para gráficos.
- APIs nativas do navegador: `dialog`, FileReader, Geolocation e armazenamento local.
- GitHub Actions e GitHub Pages para publicação estática.

As bibliotecas têm cópias em `assets/vendor`. O HTML do cliente usa CDN com fallback local; o prestador usa as cópias locais. Não há dependências para instalar ou etapa de compilação.

## Executar localmente

Com Git e Python 3 instalados:

```bash
git clone https://github.com/ThiagoMilitao/sideQuest.git
cd sideQuest
python3 -m http.server 8765 --bind 127.0.0.1
```

Abra [localhost:8765](http://127.0.0.1:8765/). O endereço inicial abre a visão do cliente. Para o prestador, use [SideQuestPrestador.html](http://127.0.0.1:8765/SideQuestPrestador.html).

Use HTTP local ou HTTPS para testar a sincronização. Abrir os HTMLs diretamente por `file://` não oferece o mesmo comportamento.

### Testar cliente e prestador juntos

1. Abra as duas visões em abas do mesmo navegador e na mesma origem.
2. No prestador, envie ou edite uma proposta para Mariana Silva.
3. No cliente, abra a conversa com Roberto para conferir o mesmo valor, prazo, duração e escopo.
4. Aceite ou solicite um ajuste e confira o status na aba do prestador.
5. Em **Meu Plano / Assinatura**, experimente as regras de fotos, região e destaque. Para ativar links de WhatsApp/ligação, informe explicitamente um telefone público; sem número, o contato orienta usar o chat.

## Estrutura

```text
.
├── index.html                 # Entrada do GitHub Pages
├── SideQuestPrototipo.html    # Visão do cliente
├── SideQuestPrestador.html    # Visão do prestador
├── assets/
│   ├── sidequest.js           # Fluxos do prestador
│   ├── proposals.js           # Modelo e card compartilhado de orçamento
│   ├── plans.js               # Catálogo e assinatura demonstrativa
│   ├── provider-*.js/css      # Home, chat, serviços, perfil, planos e modais
│   ├── motion.js/css          # Microinterações e movimento reduzido
│   ├── location.js            # Busca de endereço e GPS
│   ├── portfolio/             # Fotos ilustrativas locais
│   └── vendor/                # Bibliotecas e fontes
├── Images/                    # Marca e ícones
├── docs/                      # Decisões de UX, regras e verificação
├── tests/                     # Testes de navegador por Chrome DevTools
└── .github/workflows/pages.yml
```

O cliente incorpora cópias de módulos compartilhados para preservar o HTML copiável. Ao editar `proposals.js`, `proposals.css`, `plans.js`, estilos compartilhados, localização ou movimento, mantenha os blocos incorporados sincronizados com seus arquivos de origem.

## Verificação

Os testes usam Node.js 24 ou superior e o protocolo DevTools de um Chrome local, sem pacotes adicionais. Com o servidor HTTP em execução, abra outro terminal:

```bash
google-chrome --headless=new --remote-debugging-port=9222 --user-data-dir=/tmp/sidequest-test-browser about:blank
```

Execute as suítes sequencialmente, a partir da raiz:

```bash
node tests/plans-check.mjs
node tests/provider-finance-check.mjs
node tests/provider-home-check.mjs
node tests/provider-profile-check.mjs
node tests/provider-modals-check.mjs
node tests/browser-check.mjs
node tests/proposal-check.mjs
```

Também há suítes específicas de categorias, localização, chat e movimento em `tests/`. Os testes alteram os dados demonstrativos do navegador de teste; use um perfil isolado. Capturas e relatórios de teste ficam em `/tmp`.

As verificações cobrem fluxos, validação, dados sincronizados e larguras móveis/desktop. Câmera, teclado virtual, GPS e áreas seguras ainda precisam de conferência em dispositivos reais.

## Publicação no GitHub Pages

O workflow [pages.yml](.github/workflows/pages.yml) publica automaticamente a cada push em `main`, ou manualmente pela aba **Actions**. O GitHub Pages usa **GitHub Actions** como origem da publicação.

O artefato público contém apenas `index.html`, as duas páginas do aplicativo, `.nojekyll`, `assets` e `Images`. Arquivos de ferramentas locais, credenciais, testes e documentação não entram no artefato do site. O código e a documentação continuam disponíveis no repositório.

A configuração segue o [fluxo oficial de publicação do GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## Limites do protótipo

- Não há backend, autenticação real, cobrança de assinatura ou processamento de pagamento de serviços.
- Mensagens comuns, fotos publicadas, rascunhos e preferências ficam na sessão e são descartados na recarga.
- Propostas, respostas e assinatura demonstrativa persistem no armazenamento local. O pedido de uma proposta aceita é reconstruído a partir desse registro.
- Descrição personalizada e telefone publicado explicitamente ficam no estado local da assinatura. A sincronização funciona apenas entre páginas da mesma origem e navegador, não entre dispositivos ou usuários reais.
- Gestão de Serviços mostra valores de acordos ilustrativos, não recebimentos bancários ou documentos fiscais.
- Fotos remotas e consultas de endereço precisam de internet. O GPS depende da permissão do navegador; endereço, número e complemento continuam editáveis.
- Não foram implementados controle de acesso comercial, cobrança, expiração de assinatura em servidor, notificações push ou rastreamento de visitantes reais.

## Documentação

- [Redesign e princípios de interação](docs/REDESIGN-UX.md)
- [Planos, destaque e pagamento direto](docs/PLANOS.md)
- [Propostas sincronizadas](docs/PROPOSTAS.md)
- [Home e navegação do prestador](docs/PRESTADOR.md)
- [Perfil e portfólio, incluindo fontes das fotos](docs/PERFIL.md)
- [Gestão de Serviços e relatórios](docs/FINANCEIRO.md)
- [Endereços e GPS](docs/LOCALIZACAO.md)
- [Microinterações](docs/MICROINTERACOES.md)
