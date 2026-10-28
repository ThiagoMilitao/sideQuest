# Perfil e portfólio do prestador

O Perfil mantém o header compartilhado de Roberto, o tema emerald e a navegação inferior. O card apresenta foto com selo verde, título “Eletricista Residencial e Comercial”, badges NR-10 e verificação e três métricas: nota 4.9, 142 O.S. e 5 anos. Os selos e as avaliações são exemplos demonstrativos, sem verificação externa.

“Sobre e Especialidades” inclui biografia e quatro tags elétricas. “Categorias atendidas” continua ligada à seleção do menu da conta, sem substituir o título profissional. As avaliações de Mariana e Fernando aparecem em cards curtos com nome, estrelas e comentário.

## Galeria

A grade inicial contém três fotografias locais de trabalho elétrico, sem imagens de retrato ou atividades não relacionadas. Cada foto tem título e texto alternativo; mouse e foco de teclado revelam a legenda. Em dispositivos de toque a legenda já está visível. Selecionar uma imagem abre um diálogo com foto ampliada e o mesmo título; Escape, fundo e botão permitem fechar.

Imagens iniciais são ilustrativas, não um registro comprovado de trabalhos de Roberto. Fontes dos arquivos locais:

- `assets/portfolio/quadro-eletrico.jpg`: [foto 9679179 no Pexels](https://www.pexels.com/photo/9679179/), usada como montagem de quadro elétrico.
- `assets/portfolio/comando-eletrico.jpg`: [arquivo de referência no Unsplash](https://images.unsplash.com/photo-1621905251189-08b45d6a269e), instalação de comando elétrico.
- `assets/portfolio/conexoes-eletricas.jpg`: [arquivo de referência no Unsplash](https://images.unsplash.com/photo-1621905251918-48416bd8575a), revisão de conexões elétricas.

As fotos da galeria funcionam sem conexão externa quando o projeto completo está disponível. A foto de perfil permanece na URL remota existente.

## Publicar um trabalho

1. **Adicionar Foto** abre o bottom sheet “Adicionar Trabalho ao Portfólio”.
2. A dropzone abre o seletor nativo de imagens, por toque ou teclado. O sistema pode oferecer câmera e biblioteca conforme o dispositivo. O navegador não é forçado a usar apenas a câmera. No desktop também é possível arrastar uma foto para a área.
3. Uma foto por vez, JPG/PNG/WebP de até 10 MB, não vazia e com conteúdo de imagem decodificável. Erros explicam formato, tamanho, quantidade ou conteúdo inválido. Selecionar uma nova foto invalida a prévia anterior.
4. A interface mostra nome do arquivo, processamento e prévia. **Título / Descrição do trabalho** é obrigatório, com até 120 caracteres. Publicar só é habilitado com foto pronta e título válido.
5. Publicar adiciona foto e título à galeria, atualiza o contador e oferece Desfazer. O título é inserido como texto, sem interpretar HTML.
6. Trabalhos adicionados podem ser removidos e restaurados com Desfazer na posição original. Básico permite 3 fotos; Prata, 10; Ouro não impõe limite numérico de plano. Ao atingir o limite, a ação orienta ampliar o plano e a publicação é protegida.

Cancelar fecha sem publicar e descarta os campos e a foto desse formulário. Respostas de leituras antigas não podem reabrir uma prévia depois do cancelamento ou substituir uma seleção mais recente. Fotografias publicadas permanecem somente na sessão; recarregar volta à galeria inicial. Não há envio externo nem recorte de imagem.

## Implementação e verificação

- `SideQuestPrestador.html`: perfil, biografia, galeria, avaliações, formulário e visualização ampliada.
- `assets/provider-profile.css`: métricas, badges, imagens, legendas, dropzone e layout responsivo.
- `assets/sidequest.js`: leitura de imagem, validação, títulos, publicação, contador, visualização, remoção e Desfazer.
- `assets/portfolio`: as três fotos iniciais locais.

Com o servidor e Chrome DevTools descritos no [relatório de redesign](REDESIGN-UX.md#verificação), executar sequencialmente:

```bash
node tests/provider-profile-check.mjs
node tests/browser-check.mjs
node tests/provider-home-check.mjs
node tests/provider-modals-check.mjs
```

O teste específico aprovou **32 verificações**, sem exceções JavaScript não tratadas: conteúdo do perfil, fotos locais, visualização, dropzone, arquivo vazio, inválido, grande ou corrompido, múltiplos arquivos, título, publicação, remoção, Desfazer, cancelamento durante leitura, texto com HTML, limites por plano e layout em 320, 390, 768 e 1280 px. Também passaram 46 verificações gerais, 32 da Home e 180 dos modais. Capturas ficam em `/tmp/sidequest-provider-profile`.

A emulação não verifica a câmera nativa, o teclado virtual ou as áreas seguras de um aparelho físico. Esses comportamentos precisam de conferência adicional no dispositivo.

As regras atuais de fotos, descrição, selo Pro e região estão em [Planos](PLANOS.md). O antigo limite único de 12 fotos foi substituído pelo plano.
