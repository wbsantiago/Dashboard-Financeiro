export type TutorialTopic = 'inicio' | 'lancamentos' | 'planejamento' | 'dados';
export interface TutorialSection {
  id: string;
  title: string;
  text?: string;
  steps: string[];
  note?: string;
}
export interface Tutorial {
  id: string;
  title: string;
  description: string;
  topic: TutorialTopic;
  keywords: string[];
  // Add the actual YouTube URL here after recording. No API key or upload in the app.
  videoUrl: string | null;
  sections: TutorialSection[];
}

export const tutorialTopics: { id: TutorialTopic; label: string }[] = [
  { id: 'inicio', label: 'Primeiros passos' },
  { id: 'lancamentos', label: 'Lançamentos e cartões' },
  { id: 'planejamento', label: 'Planejamento e gráficos' },
  { id: 'dados', label: 'Conta e backups' },
];

export const tutorials: Tutorial[] = [
  {
    id: 'primeiros-passos', title: 'Seu primeiro mês no aplicativo', topic: 'inicio',
    description: 'Escolha o mês, organize seu planejamento e registre a primeira movimentação.',
    keywords: ['começar', 'configurar', 'iniciante', 'salário', 'despesa'], videoUrl: null,
    sections: [
      { id: 'escolha-mes', title: 'Escolha o mês que vai organizar', steps: [
        'Use as setas ao lado do mês, no topo do aplicativo, para navegar pelo calendário.',
        'Na Visão geral, confira o resumo do mês e a área Seu planejamento.',
      ] },
      { id: 'defina-plano', title: 'Defina seu planejamento', steps: [
        'Em Seu planejamento, clique em Ajustar. Você também pode abrir Configurações → Orçamento do mês.',
        'Preencha a renda planejada e escolha o percentual que pretende guardar. São referências para organizar o mês.',
        'Confira a virada do cartão, se usar esse controle, e clique em Salvar Orçamento.',
      ], note: 'A renda planejada não cria uma entrada recebida. Registre o recebimento em Adicionar entrada para acompanhar o saldo real.' },
      { id: 'primeiro-registro', title: 'Registre e acompanhe', steps: [
        'Clique em Adicionar entrada para registrar um recebimento ou em Adicionar despesa para lançar um gasto.',
        'Informe a descrição, o valor, a data e a categoria. Confira os campos e salve o registro.',
        'Abra Lançamentos do mês para consultar ou corrigir o que cadastrou. Volte à Visão geral para ver os gráficos.',
        'Ao terminar, exporte uma cópia em Configurações → Dados e backups → Exportar backup.',
      ] },
    ],
  },
  {
    id: 'receitas-despesas', title: 'Adicionar receitas e despesas', topic: 'lancamentos',
    description: 'Registre o que entrou e saiu, encontre lançamentos e faça correções.',
    keywords: ['entrada', 'rendimento', 'gasto', 'categoria', 'editar', 'busca', 'filtro', 'pago'], videoUrl: null,
    sections: [
      { id: 'registrar', title: 'Cadastre uma movimentação', steps: [
        'Use Adicionar entrada para recebimentos e Adicionar despesa para gastos.',
        'Preencha uma descrição fácil de reconhecer, o valor, a data e a categoria. Nas despesas, confira também a forma de pagamento.',
        'Para um evento que acontece apenas uma vez, mantenha Único. Salve e confira o registro em Lançamentos do mês.',
      ] },
      { id: 'encontrar', title: 'Encontre o que cadastrou', steps: [
        'Selecione o mês no topo e abra Lançamentos do mês.',
        'Escolha a lista de despesas ou de entradas. Use a busca e os filtros disponíveis para reduzir os resultados.',
        'Se um lançamento não aparecer, confira o mês, a busca e os filtros antes de cadastrá-lo novamente.',
      ] },
      { id: 'corrigir', title: 'Corrija ou exclua um registro', steps: [
        'Localize a movimentação e abra a ação de editar para corrigir seus campos.',
        'Se o registro fizer parte de uma recorrência, confira se a alteração vale só para aquele mês ou também para os próximos.',
        'Antes de confirmar uma exclusão, leia a mensagem: uma compra parcelada pode ter outras parcelas removidas junto.',
      ], note: 'Marcar uma despesa como paga altera o seu status. O resumo de despesas considera os gastos lançados, inclusive os ainda não pagos.' },
    ],
  },
  {
    id: 'parcelas-recorrencias', title: 'Parcelas e recorrências mensais', topic: 'lancamentos',
    description: 'Entenda a diferença entre dividir uma compra e repetir um valor todo mês.',
    keywords: ['parcelamento', 'parcelado', 'mensalidade', 'assinatura', 'repetir', 'recorrente'], videoUrl: null,
    sections: [
      { id: 'diferenca', title: 'Escolha o tipo certo', text: 'Uma compra parcelada distribui o valor de uma compra pelos meses. Uma recorrência repete o valor inteiro a cada mês.', steps: [
        'Use Parcelado para uma compra dividida em prestações.',
        'Use Recorrente mensal para valores que se repetem, como uma assinatura ou um recebimento mensal.',
        'Use Único quando não houver parcelas nem repetição.',
      ] },
      { id: 'criar-serie', title: 'Confira a série antes de salvar', steps: [
        'Nas despesas, selecione Parcelado ou Recorrente mensal. Nas entradas, a repetição disponível é Recorrente mensal.',
        'Preencha a quantidade de parcelas ou a duração da recorrência. Na recorrência, o primeiro mês já conta na duração.',
        'No parcelamento, confira se está informando o Valor da Parcela ou o Valor Total da compra e selecione a opção correspondente.',
        'Confira os valores e o período apresentados no formulário antes de salvar.',
      ], note: 'A recorrência admite de 1 a 120 meses. Quando o dia escolhido não existir em um mês, o lançamento usa o último dia daquele mês.' },
      { id: 'alterar-serie', title: 'Altere sem perder os meses anteriores', steps: [
        'Abra o lançamento recorrente que deseja corrigir.',
        'Escolha Somente este mês para uma exceção, ou Este mês e os próximos para alterar o restante da série.',
        'Confira o alcance indicado também ao excluir. O histórico anterior da recorrência é preservado quando você escolhe os meses futuros.',
      ] },
    ],
  },
  {
    id: 'cartoes-faturas', title: 'Organizar cartões e faturas', topic: 'lancamentos',
    description: 'Cadastre seus cartões e acompanhe as compras e os pagamentos por mês.',
    keywords: ['crédito', 'cartão', 'fechamento', 'virada', 'competência', 'quitar', 'pagar'], videoUrl: null,
    sections: [
      { id: 'cadastrar-cartao', title: 'Cadastre um cartão', steps: [
        'Abra Configurações → Orçamento do mês e encontre o cadastro de cartões.',
        'Informe um nome ou apelido e somente os quatro últimos dígitos. Clique em Cadastrar Cartão.',
        'Ao adicionar uma despesa, escolha a forma de pagamento de cartão e selecione o cartão correspondente.',
      ], note: 'Esse cadastro é manual e serve para organizar os lançamentos. Ele não conecta o aplicativo ao banco.' },
      { id: 'conferir-mes', title: 'Confira o mês da compra', steps: [
        'Revise a data da compra e a configuração de virada do cartão.',
        'Depois de salvar, confirme em qual mês o lançamento foi incluído. O mês de controle pode ser diferente do mês da compra por causa da virada.',
        'Em Lançamentos do mês, use o filtro de cartão para consultar as compras daquele cartão.',
      ] },
      { id: 'marcar-pagamento', title: 'Marque o pagamento', steps: [
        'Depois de pagar a fatura no banco, confira as despesas do cartão no mês correspondente.',
        'Use a ação de quitação da fatura para marcar as despesas pendentes daquele cartão e mês como pagas, ou ajuste o status individualmente.',
        'Confira se está no cartão e mês corretos antes de confirmar.',
      ], note: 'A ação de quitação apenas registra o status no aplicativo; ela não efetua pagamentos no banco. Evite cadastrar o pagamento da fatura como outra despesa se as compras já foram lançadas.' },
    ],
  },
  {
    id: 'orcamento-limites', title: 'Planejar renda, poupança e limites', topic: 'planejamento',
    description: 'Configure suas referências e acompanhe a margem de gastos de cada categoria.',
    keywords: ['salário', 'teto', 'meta', 'guardar', 'economizar', 'categoria', 'planejado'], videoUrl: null,
    sections: [
      { id: 'renda-meta', title: 'Defina renda e meta do mês', steps: [
        'Selecione o mês e abra Seu planejamento → Ajustar.',
        'Informe a renda planejada e a meta percentual para guardar. Salve o orçamento.',
        'Registre os recebimentos reais em Adicionar entrada para comparar o que recebeu com o que planejou.',
      ] },
      { id: 'categorias', title: 'Ajuste os limites por categoria', steps: [
        'Na Visão geral, abra Gastos e limites → Ajustar limites.',
        'Defina o teto das categorias que deseja acompanhar e salve os valores.',
        'Confira o percentual de utilização de cada categoria. Um excesso é destacado, mas não impede novos lançamentos.',
      ], note: 'Uma categoria sem teto aparece como Sem limite. Quando o limite está zerado e há gasto, o aplicativo sinaliza excesso sem calcular uma divisão por zero.' },
      { id: 'entender-margem', title: 'Entenda a margem do mês', steps: [
        'O limite mensal parte da renda planejada menos o valor planejado para guardar.',
        'Entradas reais acima da renda planejada ampliam a margem de gastos, mantendo como referência o valor originalmente planejado para guardar.',
        'Use a explicação Como esse planejamento é calculado, na Visão geral, para conferir a regra durante o uso.',
      ], note: 'O aplicativo acompanha suas próprias metas de organização; os valores configurados não são uma recomendação de investimento.' },
    ],
  },
  {
    id: 'graficos-resumo-anual', title: 'Ler os gráficos e a visão do ano', topic: 'planejamento',
    description: 'Veja a distribuição das despesas e compare os meses do ano selecionado.',
    keywords: ['histórico', 'pizza', 'distribuição', 'anual', 'lista', 'percentual', 'saldo'], videoUrl: null,
    sections: [
      { id: 'resumo', title: 'Comece pelo resumo do mês', steps: [
        'Na Visão geral, confira Entradas do mês, Despesas lançadas e Saldo do mês.',
        'O saldo do mês representa entradas registradas menos despesas lançadas. Ele não é uma consulta ao saldo do banco.',
        'Confira também o mês selecionado antes de comparar os números.',
      ] },
      { id: 'distribuicao', title: 'Explore categorias e histórico', steps: [
        'Em Para onde foi, passe o mouse ou toque nas fatias para consultar categoria, valor e percentual.',
        'Use o botão de lista para ver os valores em outra apresentação.',
        'No Histórico de gastos no ano, consulte cada mês pelo mouse, toque ou setas do teclado. O gráfico usa o ano selecionado.',
      ] },
      { id: 'visao-anual', title: 'Abra a visão do ano', steps: [
        'Clique em Visão do ano e escolha o ano que deseja analisar.',
        'Compare as entradas e saídas e confira os totais mensais.',
        'Selecione um mês na tabela para abrir seus lançamentos e conferir os detalhes.',
      ], note: 'O botão Ocultar valores no topo troca os valores monetários por asteriscos. Categorias, percentuais e o formato dos gráficos continuam disponíveis.' },
    ],
  },
  {
    id: 'conta-backups', title: 'Conta Google, dados locais e backups', topic: 'dados',
    description: 'Entenda onde seus dados ficam e como salvar ou transferir uma cópia.',
    keywords: ['nuvem', 'firebase', 'login', 'exportar', 'importar', 'restaurar', 'json', 'navegador'], videoUrl: null,
    sections: [
      { id: 'local-nuvem', title: 'Escolha onde trabalhar', steps: [
        'Sem uma conta conectada, os dados financeiros ficam neste navegador e dispositivo.',
        'Para usar a nuvem, abra Meu perfil → Conectar com Google. Use a mesma conta para voltar a acessar seus dados.',
        'Uma conta nova começa com os padrões do aplicativo; seus dados locais não são importados automaticamente. Ao sair, o aplicativo volta à cópia do navegador.',
      ] },
      { id: 'salvar-copia', title: 'Exporte e restaure um backup', steps: [
        'Abra Configurações → Dados e backups. Confira se está usando os dados locais ou os dados da conta.',
        'Clique em Exportar backup para baixar um arquivo JSON dos dados em uso. Guarde-o em um local seguro.',
        'Para restaurar, use Importar backup e escolha um arquivo gerado pelo aplicativo. No modo local, ele substitui a cópia financeira do navegador; na nuvem, registros com os mesmos identificadores e configurações podem ser substituídos.',
      ], note: 'Esse arquivo é um backup do aplicativo. A importação não é uma leitura de fatura bancária, PDF, OFX ou CSV. Exporte uma cópia antes de restaurar outra.' },
      { id: 'enviar-nuvem', title: 'Envie a cópia local para sua conta', steps: [
        'Conecte a conta Google que vai receber os dados.',
        'Em Dados e backups, escolha Enviar dados do navegador.',
        'Confira a conta de destino e a mensagem antes de confirmar. Os dados existentes na nuvem podem ser substituídos; a cópia local é mantida.',
      ], note: 'Limpar os dados do navegador pode apagar os registros locais. Sair da conta não apaga a nuvem e não substitui um backup.' },
    ],
  },
];

export const tutorialFaqs = [
  { question: 'Preciso entrar com Google para começar?', answer: 'Não. Você pode usar o aplicativo neste navegador. A conta Google é usada para acessar os dados da nuvem; os dados locais não são enviados automaticamente.' },
  { question: 'Por que meu lançamento aparece em outro mês?', answer: 'Nas compras com cartão, confira a configuração de virada e o mês de competência. Confira também o mês selecionado e os filtros em Lançamentos do mês.' },
  { question: 'O aplicativo paga a fatura do meu cartão?', answer: 'Não. Marcar a fatura como paga registra o status das despesas no aplicativo. O pagamento é feito por você no banco.' },
  { question: 'Onde estarão os vídeos?', answer: 'Cada guia terá seu vídeo do YouTube nesta mesma página. Enquanto os vídeos são preparados, o passo a passo em texto já está disponível.' },
];
