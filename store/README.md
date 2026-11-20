# Materiais da Google Play — rascunho para revisão

Nome público escolhido: **Mês de Boa**. A disponibilidade da marca e dos perfis ainda precisa ser verificada antes da divulgação; o identificador do pacote não acompanha a mudança de nome. Os arquivos em `pt-BR/` contêm título, descrição curta (até 80 caracteres), descrição completa (até 4.000) e notas de versão. Revisar o nome e a disponibilidade real das funções no candidato final antes de enviar.

Os recursos PNG preparados localmente ficam em `../work/play-store/` a partir da raiz do repositório:

| Arquivo | Dimensão | Conteúdo |
| --- | --- | --- |
| `icone-512.png` | 512 × 512 | Identidade atual do app; PNG com canal alfa |
| `recurso-grafico-1024x500.png` | 1024 × 500 | Capa da loja; fundo opaco |
| `01-visao-geral.png` a `06-categorias.png` | 1080 × 1920 | Interface nativa compilada, somente dados fictícios |

As capturas foram feitas em navegador isolado com os **arquivos de produção nativa**, sem moldura ou barra de sistema simulada. São prévias do conteúdo da WebView, não prova de instalação pela Play. Antes do envio definitivo, conferir o mesmo conteúdo na versão instalada pela loja; substituir as capturas se houver diferenças visíveis. Nenhum lançamento real, identidade Google ou backup pessoal foi utilizado. O banner/capa é ilustrativo; não representa valores de um usuário.

O gerador e a conferência visual usados nesta máquina estão em `../work/verify-sprint5.cjs`, fora do repositório. Os PNGs são materiais de trabalho; renomear o app exigirá revisar o título da capa e da descrição. Não há envio automático desses materiais.

Contato autorizado pelo responsável: **Willian Batista Santiago — willbatista27@gmail.com**. Não incluir chave de assinatura, senha, `google-services.json` ou credenciais nos materiais enviados à loja.

Referências: [recursos gráficos e capturas](https://support.google.com/googleplay/android-developer/answer/9866151?hl=pt-BR) e [configuração do app e nome do pacote](https://support.google.com/googleplay/android-developer/answer/9859152?hl=pt-BR).
