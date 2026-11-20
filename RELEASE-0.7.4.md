# Mês de Boa — versão 0.7.4

Identidade aprovada: nome **Mês de Boa**, símbolo **M fluido** e ícones verdes com cantos arredondados. O domínio permanece https://dashboard-financeiro-liart.vercel.app/.

- Nome e marca atualizados no cabeçalho, favicon, instalação PWA, ícones e abertura Android, lembretes, tutoriais, atendimento e páginas públicas.
- Destaques em verde; no modo escuro, links e textos de ação usam um tom claro neutro. Indicadores positivos conservam sua cor.
- O símbolo também faz parte do cache estático para uso offline.
- Android: versão 0.7.4, código 16. Pacotes, assinatura, Firebase e chaves de armazenamento permanecem os mesmos para manter a continuidade das instalações e dados.
- Os novos backups usam o prefixo `mes-de-boa-backup`; seu formato continua compatível com arquivos anteriores.

## Validação

149 testes da aplicação, TypeScript e build web aprovados. Prévia local conferida nos temas claro e escuro entre 320 e 2560 pixels e em orientação horizontal, incluindo cabeçalho, instalação, tutoriais e páginas públicas. Reabertura offline e carregamento do símbolo verificados em perfil isolado, sem acessar contas reais.

O pacote Android de distribuição é compilado com a assinatura existente. Instalação e teste no aparelho desta versão serão registrados após a conexão USB; a compilação não significa publicação na Google Play. As pendências administrativas e de recuperação de chave documentadas em [RELEASE-0.7.3.md](RELEASE-0.7.3.md) continuam vigentes.
