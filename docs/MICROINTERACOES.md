# SideQuest — microinterações

Implementação em CSS e JavaScript nativos, sem dependências novas. As versões completas estão em `SideQuestPrototipo.html` e `SideQuestPrestador.html`.

| Interação | Implementação |
| --- | --- |
| Botões principais, aceitar proposta, “Solicitar”, “+” e Bottom Nav | Escala de 0,95 com transição de 150 ms. Pointer Events oferecem feedback imediato em navegadores de toque que adiam `:active`. Soltar, cancelar, rolar ou perder foco limpa o pressionamento. |
| Modais e bottom sheets | Slide-up e fade em 250 ms. O painel move-se por `transform`; o backdrop usa `opacity`. `showModal()`, `close()`, foco e Escape continuam nativos. Fechamento percorre o caminho inverso nos navegadores com suporte a transições discretas. |
| Criar solicitação e chat | As telas existentes recebem slide-up de 24 px em 250 ms, sem alterar sua estrutura de navegação. |
| Categorias e profissionais | Hover de -4 px em 200 ms para mouse. A sombra é estática em um pseudo-elemento; somente sua opacidade muda. Toque tem feedback durante o pressionamento, sem hover persistente. |
| Skeletons | Categorias e profissionais usam placeholders com pulso de opacidade. A simulação local dura 360 ms na entrada/troca de listas; a pulsação usa ciclo de 1,2 s. Não há requisição de rede artificial. |
| Avaliação | Radios nativos mantidos; preenchimento acompanha a nota. Estrelas selecionadas ganham escala breve de 250 ms. Após salvar, um ícone de confirmação faz pop sutil de 250 ms. |
| Mensagens | Apenas objetos de mensagens novos ganham subida de 8 px e fade de 300 ms, nos dois perfis. Reabrir conversa ou renderizar o histórico não repete o efeito. A classe é removida ao terminar. |

Curvas: `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)` e `--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1)`. Botões e cards usam transições, que podem mudar de direção durante a interação; movimentos programáticos pequenos usam Web Animations API. Não há loops JavaScript por frame, bibliotecas novas ou promoção permanente de camadas com `will-change`.

A preferência do sistema `prefers-reduced-motion` e a configuração de redução de movimento do aplicativo desativam os efeitos, inclusive animações já em execução. Navegação iniciada por teclado não simula espera ou movimento de tela. Foco e interação interrompem placeholders para não manter controles invisíveis. Trocas rápidas cancelam timers, e nenhum resultado é renderizado por callbacks atrasados.

## Arquivos

- `assets/motion.css`: transições, keyframes, skeletons e regras de movimento reduzido.
- `assets/motion.js`: ciclo de carregamento simulado, feedback de toque, entrada de telas, rastreamento de mensagens novas, estrelas e confirmação.
- `assets/sidequest.js`: pontos de integração do prestador.
- `SideQuestPrestador.html`: carrega os dois arquivos de motion antes da lógica da aplicação.
- `SideQuestPrototipo.html`: incorpora cópias idênticas de `motion.css` e `motion.js` para preservar o HTML independente. Os blocos estão delimitados por `BEGIN/END SIDEQUEST MOTION CSS/JS`; atualize as cópias ao editar os arquivos compartilhados.

## Verificação

Use o servidor local e o Chrome DevTools configurados no [relatório de redesign](REDESIGN-UX.md#verificação). Execute sequencialmente, para não disputar o foco do navegador:

```bash
node tests/browser-check.mjs
node tests/motion-check.mjs
```

**Resultado: 46 verificações de regressão e 24 de microinterações aprovadas, sem exceções JavaScript não tratadas.**

O primeiro script cobre os fluxos existentes. O segundo verifica skeletons e sua interrupção, pressionamento real por eventos de toque, entrada de telas, modais e backdrop, mensagens novas versus histórico, estrelas, confirmação, preferências de movimento reduzido e hover. Capturas são gravadas em `/tmp/sidequest-motion`.

As animações priorizam composição de `transform` e `opacity`. Isso reduz trabalho de layout e pintura; a taxa real de quadros ainda depende do aparelho e deve ser conferida no dispositivo final. Não foi medido desempenho em hardware móvel real.
