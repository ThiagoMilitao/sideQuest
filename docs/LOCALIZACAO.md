# Seletor de endereço e localização

O modal `modal-location` substitui o seletor fixo de bairros e preserva a navegação, as transições e o tema emerald do cliente.

- GPS em destaque, com spinner, estado ocupado e alternativa em caso de recusa ou timeout.
- Busca por rua, CEP, bairro ou cidade. A digitação filtra endereços salvos/recentes; **Buscar** ou Enter faz a consulta online.
- Casa: Av. Ana Costa, 150 - Gonzaga, Santos / SP.
- Trabalho: Praça Mauá, 20 - Centro, Santos / SP.
- Linhas de endereço são botões nativos, com indicação de ativo. A seleção atualiza a pílula, o endereço da solicitação e fecha o modal.
- Até cinco endereços recentes na memória da página; não são salvos no armazenamento permanente do navegador.
- Endereços salvos vêm de `clientAccount.addresses`, compartilhados com o painel da conta.
- O endereço escolhido também define o valor padrão do formulário após sua publicação/reset, evitando voltar a um local diferente do mostrado no cabeçalho.

## Busca online

CEP de oito dígitos usa o [ViaCEP](https://viacep.com.br/), que documenta o formato e o retorno para CEP inexistente. A entrada inválida é rejeitada antes da requisição.

Ruas, bairros e cidades usam a [busca do Nominatim](https://nominatim.org/release-docs/latest/api/Search/). A consulta é explícita, restrita ao Brasil e limitada a cinco sugestões. Não há autocomplete remoto por tecla: isso segue a [política do serviço público](https://operations.osmfoundation.org/policies/nominatim/). O cliente usa cache de até 30 consultas na sessão e intervalo mínimo de 1,1 segundo entre chamadas de geocodificação. O modal apresenta atribuição ao OpenStreetMap e ao ViaCEP.

A consulta a serviços externos pode falhar; o modal mantém os endereços salvos e permite confirmar um endereço completo digitado. O modo de entrada manual não trata um CEP isolado como endereço completo.

## GPS

`useCurrentGPS()` usa `navigator.geolocation.getCurrentPosition`, com timeout de dez segundos e permissão do navegador. A [geocodificação reversa do Nominatim](https://nominatim.org/release-docs/latest/api/Reverse/) procura um endereço próximo; ela não garante a rua/número exatos. Por isso a confirmação pede para conferir número e complemento.

Se as coordenadas chegam, mas a consulta de rua falha, a pílula mostra **Localização atual**, as coordenadas são mantidas e o campo de endereço é esvaziado para preenchimento manual. O sistema não reutiliza o endereço anterior como se fosse o ponto capturado.

Fechar o modal, mudar a busca ou selecionar um endereço invalida operações anteriores. Requisições de rede são abortadas; callbacks tardios do GPS são ignorados. Escolher outro endereço também invalida um GPS pendente do formulário de solicitação.

## Estrutura

- `SideQuestPrototipo.html`: modal, gatilho e cópia incorporada da lógica.
- `assets/location.js`: busca, GPS, cache, cancelamento, seleção e recentes. A cópia no HTML está delimitada por `BEGIN/END SIDEQUEST LOCATION JS`; mantenha-as sincronizadas.
- `assets/redesign.css`: estilos do modal, incorporados também ao cliente.
- `tests/location-check.mjs`: testes do seletor no Chrome DevTools.

Os provedores podem ser configurados por `window.SIDEQUEST_LOCATION_CONFIG`, antes de inicializar o módulo, com `geocoder` e `cepService` como URLs base terminadas em `/`. O protótipo completo deve ser aberto em localhost/HTTPS para a busca geográfica identificada pelo Referer e para melhor compatibilidade com GPS. No arquivo aberto diretamente, endereços salvos, entrada manual e consulta de CEP permanecem disponíveis; a busca de rua depende de servir a página por HTTP/HTTPS.

## Verificação

Com o servidor e o Chrome DevTools descritos no [relatório](REDESIGN-UX.md#verificação), executar sequencialmente:

```bash
node tests/location-check.mjs
node tests/browser-check.mjs
```

Foram aprovadas **31 verificações do seletor**, com respostas controladas de busca/CEP e GPS simulado, sem enviar coordenadas de teste aos serviços públicos. Cobrem validação, cache, erros, recusa/timeout, seleção, recentes, endereços da conta, preservação do endereço no reset, respostas fora de ordem, cancelamento, teclado e layout de 320, 390 e 768 px.

Capturas: `/tmp/sidequest-location`. A leitura real do GPS depende do dispositivo e da permissão; não foi testado GPS em hardware móvel. Fotos, profissionais e distâncias da demonstração continuam ilustrativos e não são recalculados por geolocalização.
