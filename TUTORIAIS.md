# Central de tutoriais

A central fica em `/#/tutoriais`, com acesso pelo link **Tutoriais** no rodapé e em **Configurações → Ajuda e contato**. Não exige conta Google. Os sete guias em texto estão disponíveis; os vídeos ainda serão gravados.

## Organização

| Guia | Identificador para o link |
| --- | --- |
| Seu primeiro mês no aplicativo | `primeiros-passos` |
| Adicionar receitas e despesas | `receitas-despesas` |
| Parcelas e recorrências mensais | `parcelas-recorrencias` |
| Organizar cartões e faturas | `cartoes-faturas` |
| Planejar renda, poupança e limites | `orcamento-limites` |
| Ler os gráficos e a visão do ano | `graficos-resumo-anual` |
| Conta Google, dados locais e backups | `conta-backups` |

Cada guia pode ser compartilhado pelo seu endereço, por exemplo `/#/tutoriais/conta-backups`. O painel permanece montado durante a navegação, preservando o mês, a visão e os filtros. Abrir os tutoriais não altera lançamentos.

## Passeio de primeiro acesso

No primeiro acesso ao painel, depois de resolver a escolha de armazenamento e identificar a sessão, aparece a recomendação **Conheça seu painel**, em uma janela centralizada com o painel escurecido ao fundo, com **Fazer passeio rápido** e **Agora não**. A janela mantém o foco dentro dela e pode ser dispensada também com Esc. Ela é independente para o uso local e cada conta Google neste navegador. Concluir ou dispensar fica registrado somente no navegador e não é sincronizado com o Firebase; outro dispositivo pode apresentar a recomendação novamente. Se o navegador bloquear o armazenamento, a escolha vale para a visita atual. Na demonstração, tudo fica em memória.

O passeio destaca os controles reais em cinco passos: mês, adicionar entrada, adicionar despesa, resumo mensal e abas dos lançamentos. A navegação do passeio não cria nem altera registros financeiros. Pode ser fechado pelo X ou Esc e reaberto em **Configurações → Ajuda e contato → Refazer passeio**.

Ao avançar ou voltar, a página mantém sua posição enquanto o controle destacado estiver visível. O destaque e o cartão explicativo mudam de lugar, sem alinhar cada controle ao topo. Em telas pequenas, só ocorre a rolagem mínima necessária para revelar um controle que esteja fora da tela; o cartão se adapta ao espaço disponível sem cobrir o destaque.

Clicar no logo ou no nome **Finanças10** retorna à Visão geral do painel, no topo, preservando o mês selecionado. O link **Voltar ao painel** dos tutoriais continua retornando à visão anteriormente aberta.

## Como adicionar os vídeos depois de gravar

1. Publique o vídeo no seu canal do YouTube e confira se ele permite incorporação. Use a visibilidade que deseja para o material; um vídeo privado pode não funcionar para os usuários.
2. No arquivo `src/content/tutorials.ts`, encontre o guia pelo `id` da tabela.
3. Substitua `videoUrl: null` pelo link real do vídeo, como uma URL de compartilhamento `https://youtu.be/…` ou de visualização `https://www.youtube.com/watch?v=…`.
4. Confira na prévia se o vídeo corresponde ao assunto, se o player funciona e se as legendas estão corretas. Quando necessário, o usuário também pode abrir o vídeo no YouTube.
5. Execute as verificações do projeto e revise antes da publicação. Adicionar um link localmente não publica a mudança por si só.

Não há upload pelo aplicativo, chave da API do YouTube ou necessidade de contratar um serviço de vídeos para montar esta estrutura. A gravação, o upload e a configuração do canal são feitos pelo responsável no próprio YouTube.

O player é criado somente depois do clique em **Carregar vídeo do YouTube**, usa `youtube-nocookie.com` e não inicia reprodução automaticamente. Não há miniaturas, scripts ou consultas ao YouTube antes dessa ação. Fechar o vídeo ou sair do guia remove o player. A aceitação das preferências de aparência não carrega vídeos.

Os links aceitos são HTTPS do YouTube, incluindo compartilhamentos, Shorts e lives com um ID de vídeo válido. Outros domínios não são incorporados. Antes de publicar, teste também o fallback **Abrir no YouTube**: o proprietário do vídeo pode restringir a reprodução incorporada.

Referências oficiais: [incorporar vídeos e modo de privacidade aprimorado](https://support.google.com/youtube/answer/171780?hl=pt-BR), [parâmetros do player](https://developers.google.com/youtube/player_parameters).

## Gravação sugerida

Grave primeiro o guia de primeiros passos e depois lançamentos, parcelas, cartões, orçamento, gráficos e backups. Use a demonstração local `?demo=2026` ou dados fictícios para não expor informações pessoais. O texto de cada guia já funciona como roteiro de gravação.
