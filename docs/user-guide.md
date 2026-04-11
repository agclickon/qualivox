# Guia do Usuário

# Guia do Usuário - Gestão de Lead com IA

## 📋 Visão Geral

O **Gestão de Lead com IA** é uma plataforma completa de CRM que revoluciona o atendimento e qualificação de leads através da integração inteligente com WhatsApp. Nossa solução utiliza inteligência artificial para automatizar a qualificação de prospects, organizá-los em um sistema visual de kanban e otimizar todo o processo de vendas.

### ✨ Principais Benefícios
- **Qualificação Automática**: IA analisa conversas e pontua leads automaticamente
- **Integração WhatsApp**: Conecta diretamente com sua conta do WhatsApp Business
- **Gestão Visual**: Kanban interativo para acompanhar o pipeline de vendas
- **Automação Completa**: Follow-ups automáticos e workflows personalizados
- **Relatórios Inteligentes**: Dashboard com métricas em tempo real

### 🎯 Ideal Para
- Pequenas e médias empresas
- Consultores e freelancers
- Agências de marketing
- Vendedores autônomos
- Qualquer segmento que use WhatsApp para vendas

---

## 🚀 Getting Started

### 1. Primeiro Acesso

1. **Acesse o Sistema**
   - Digite o endereço da plataforma no navegador
   - Clique em "Fazer Login" ou "Criar Conta"

2. **Criação da Conta**
   - Preencha: Nome, Email e Senha
   - Confirme o email de verificação
   - Complete seu perfil básico

3. **Configuração Inicial**
   - Defina o nome da sua empresa
   - Configure seu fuso horário
   - Escolha o idioma (português padrão)

### 2. Conectando o WhatsApp

1. **Acesse Configurações → Integrações → WhatsApp**
2. **Conecte sua conta:**
   - Clique em "Conectar WhatsApp"
   - Escaneie o QR Code com seu celular
   - Aguarde confirmação da conexão

3. **Configure as Mensagens Automáticas:**
   - Mensagem de boas-vindas
   - Horário de funcionamento
   - Mensagem fora do expediente

### 3. Configurando a IA

1. **Acesse Configurações → Inteligência Artificial**
2. **Defina Critérios de Qualificação:**
   - Palavras-chave importantes
   - Critérios de pontuação
   - Regras de categorização

3. **Teste a Qualificação:**
   - Use o simulador de conversas
   - Ajuste os parâmetros conforme necessário

---

## 🛠️ Funcionalidades

### Dashboard Principal

O dashboard é sua central de controle com todas as informações importantes:

**Métricas em Destaque:**
- Total de leads do mês
- Taxa de conversão
- Leads qualificados hoje
- Performance da equipe

**Gráficos Interativos:**
- Funil de vendas
- Evolução temporal dos leads
- Origem dos contatos
- Status do pipeline

### Gestão de Leads

#### Kanban de Pipeline
O sistema organiza seus leads em colunas personalizáveis:

1. **Novo Lead** - Contatos recém-chegados
2. **Qualificado** - Leads aprovados pela IA
3. **Em Negociação** - Propostas em andamento
4. **Fechado** - Vendas concluídas
5. **Perdido** - Oportunidades não convertidas

**Como usar:**
- Arraste e solte cards entre colunas
- Clique no card para ver detalhes
- Use filtros por data, origem ou pontuação

#### Perfil Detalhado do Lead
Cada lead possui um perfil completo:
- **Dados pessoais** e de contato
- **Histórico** de todas as interações
- **Pontuação da IA** com justificativa
- **Tags** personalizáveis
- **Timeline** de atividades
- **Anotações** da equipe

### Chat e Comunicação

#### WhatsApp Integrado
- Veja todas as conversas em uma interface única
- Responda diretamente pela plataforma
- Histórico completo sincronizado
- Status de entrega das mensagens

#### Chat Interno da Equipe
- Converse com colegas sobre leads específicos
- Notificações instantâneas
- Compartilhe arquivos e informações
- Marque membros da equipe (@menção)

### Automações

#### Follow-up Automático
Configure sequências de mensagens:
1. **Primeira mensagem** - Após 2 horas sem resposta
2. **Segunda mensagem** - Após 1 dia
3. **Terceira mensagem** - Após 3 dias
4. **Mensagem de despedida** - Após 1 semana

#### Templates de Mensagens
Crie modelos reutilizáveis:
- Saudação inicial
- Apresentação da empresa
- Envio de propostas
- Agradecimento pós-venda

#### Workflows com N8N
Integre com outras ferramentas:
- Envio automático para planilhas
- Criação de tarefas em outros sistemas
- Notificações no Slack/Discord
- Sincronização com calendários

### Relatórios e Análises

#### Relatórios Disponíveis
- **Performance de Vendas**: Conversões por período
- **Análise de Leads**: Qualidade e origem dos contatos
- **Produtividade da Equipe**: Desempenho individual
- **Funil de Vendas**: Análise por etapa do pipeline
- **ROI de Campanhas**: Retorno por fonte de tráfego

#### Exportação de Dados
- Relatórios em PDF
- Planilhas Excel/CSV
- Dados via API
- Agendamento automático de relatórios

### Gestão de Equipe

#### Usuários e Permissões
- **Administrador**: Acesso total ao sistema
- **Gerente**: Visualiza equipe e relatórios
- **Vendedor**: Acesso aos próprios leads
- **Visualizador**: Apenas consulta relatórios

#### Distribuição de Leads
Configure regras de distribuição:
- **Round Robin**: Alternância entre vendedores
- **Por Região**: Baseado na localização
- **Por Especialidade**: Conforme perfil do lead
- **Manual**: Atribuição pelo gestor

---

## 🔧 Troubleshooting

### Problemas com WhatsApp

**❌ WhatsApp não conecta**
- Verifique se o QR Code não expirou (renove se necessário)
- Certifique-se de usar WhatsApp Business
- Verifique sua conexão com a internet
- Tente desconectar e conectar novamente

**❌ Mensagens não chegam**
- Confirme se o WhatsApp está online no celular
- Verifique se não há bloqueios da operadora
- Consulte o log de envios em Configurações → Logs
- Contate suporte se persistir por mais de 30 minutos

**❌ Histórico incompleto**
- A sincronização pode demorar até 10 minutos
- Verifique se as mensagens não são anteriores à conexão
- Mensagens deletadas no celular não aparecem no sistema

### Problemas com IA

**❌ IA não qualifica leads corretamente**
- Revise os critérios configurados
- Adicione mais palavras-chave relevantes
- Use o modo de treinamento com exemplos reais
- Ajuste os pesos de pontuação

**❌ Pontuação muito baixa ou alta**
- Recalibre os parâmetros na configuração
- Analise leads qualificados manualmente
- Ajuste sensibilidade da IA
- Considere retreinar o modelo

### Problemas de Performance

**❌ Sistema lento**
- Limpe cache do navegador (Ctrl+F5)
- Feche abas desnecessárias
- Verifique sua conexão com internet
- Use navegadores atualizados (Chrome, Firefox, Edge)

**❌ Relatórios não carregam**
- Reduza o período de análise
- Remova filtros complexos
- Tente em horários de menor uso
- Contate suporte para otimizações

### Problemas de Login

**❌ Esqueci minha senha**
- Clique em "Esqueci a senha" na tela de login
- Verifique sua caixa de email (incluindo spam)
- Use o link dentro de 24 horas
- Entre em contato se não receber o email

**❌ Conta bloqueada**
- Aguarde 15 minutos após múltiplas tentativas
- Verifique se está usando email correto
- Entre em contato com administrador da conta
- Solicite desbloqueio via suporte

---

## ❓ FAQ - Perguntas Frequentes

### Sobre o Sistema

**🔹 O sistema funciona no celular?**
Sim! A plataforma é totalmente responsiva e funciona perfeitamente em smartphones e tablets através do navegador.

**🔹 Posso usar mais de uma conta do WhatsApp?**
Atualmente suportamos uma conta por empresa. Para múltiplas contas, consulte nossos planos empresariais.

**🔹 Meus dados estão seguros?**
Absolutamente! Seguimos rigorosamente a LGPD, com criptografia de dados e backups automáticos diários.

**🔹 Quantos usuários posso cadastrar?**
Depende do seu plano. O plano básico inclui até 5 usuários, com possibilidade de expansão.

### Sobre Leads e Vendas

**🔹 Como funciona a pontuação da IA?**
A IA analisa o texto das conversas, identifica intenções de compra, urgência, orçamento e interesse, gerando uma pontuação de 0 a 100.

**🔹 Posso importar leads de outras ferramentas?**
Sim! Aceitamos importação via planilhas Excel/CSV. Vá em Leads → Importar → Selecionar arquivo.

**🔹 O sistema integra com meu CRM atual?**
Oferecemos integração via API e webhooks. Consulte a documentação técnica ou entre em contato conosco.

**🔹 Como personalizar o pipeline de vendas?**
Acesse Configurações → Pipeline → Editar Etapas. Você pode adicionar, remover e renomear as colunas conforme seu processo.

### Sobre Automações

**🔹 Posso desativar mensagens automáticas?**
Sim! Cada automação pode ser ativada/desativada individualmente em Configurações → Automações.

**🔹 Como criar templates de mensagens?**
Vá em Comunicação → Templates → Novo Template. Use variáveis como {nome} e {empresa} para personalização.

**🔹 O follow-up funciona fora do horário comercial?**
Por padrão, respeitamos seu horário configurado. Para envios 24/7, ajuste em Configurações → Horários.

### Sobre Relatórios

**🔹 Posso agendar relatórios automáticos?**
Sim! Configure em Relatórios → Agendar → Definir frequência (diária, semanal, mensal).

**🔹 Como compartilhar relatórios com a equipe?**
Gere o relatório e use a opção "Compartilhar por email" ou exporte em PDF para apresentações.

**🔹 Os relatórios incluem dados históricos?**
Mantemos histórico completo desde o início do uso. Dados anteriores à implementação não estarão disponíveis.

### Sobre Suporte

**🔹 Como entrar em contato com suporte?**
- Chat ao vivo: Clique no ícone de chat no canto inferior direito
- Email: suporte@gestaodelead.com.br
- WhatsApp: +55 11 99999-9999
- Horário: Segunda a sexta, 8h às 18h

**🔹 Vocês oferecem treinamento?**
Sim! Oferecemos onboarding gratuito e treinamentos personalizados. Agende através do suporte.

**🔹 Existe documentação técnica?**
Sim! Acesse nossa base de conhecimento completa em docs.gestaodelead.com.br

**🔹 Como cancelar minha conta?**
Entre em contato com suporte com 30 dias de antecedência. Seus dados serão mantidos por 90 dias para eventual reativação.

---

## 📞 Suporte e Contato

**Precisa de ajuda?**
Nossa equipe está pronta para auxiliá-lo!

- **Chat Online**: Disponível na plataforma (canto inferior direito)
- **Email**: suporte@gestaodelead.com.br
- **WhatsApp**: +55 11 99999-9999
- **Horário de Atendimento**: Segunda a sexta, 8h às 18h (horário de Brasília)

**Recursos Adicionais:**
- [Central de Ajuda](https://help.gestaodelead.com.br)
- [Documentação da API](https://docs.gestaodelead.com.br)
- [Vídeos Tutoriais](https://youtube.com/gestaodelead)
- [Blog com Dicas](https://blog.gestaodelead.com.br)

---

*Este guia foi criado para ajudá-lo a aproveitar ao máximo nossa plataforma. Mantenha-o como referência e não hesite em entrar em contato sempre que precisar!* 🚀

---
*Tipo: user-guide*
*Gerado pelo ForgeAI em 18/03/2026*
