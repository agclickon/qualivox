# LeadFlow — Manual do Usuário

> CRM de Gestão de Leads com Integração WhatsApp e Qualificação por IA

---

## Sumário

1. [Primeiros Passos](#1-primeiros-passos)
2. [Login e Autenticação](#2-login-e-autenticação)
3. [Dashboard](#3-dashboard)
4. [Gestão de Leads](#4-gestão-de-leads)
5. [Kanban (Pipeline)](#5-kanban-pipeline)
6. [WhatsApp](#6-whatsapp)
7. [Chat Interno](#7-chat-interno)
8. [Automações](#8-automações)
9. [Relatórios](#9-relatórios)
10. [Templates de Mensagens](#10-templates-de-mensagens)
11. [Notificações](#11-notificações)
12. [Equipe](#12-equipe)
13. [Perfil do Usuário](#13-perfil-do-usuário)
14. [Configurações](#14-configurações)
15. [Tema Claro / Escuro](#15-tema-claro--escuro)
16. [Navegação Mobile](#16-navegação-mobile)
17. [Atalhos e Dicas](#17-atalhos-e-dicas)
18. [Perguntas Frequentes (FAQ)](#18-perguntas-frequentes-faq)

---

## 1. Primeiros Passos

### Requisitos
- Navegador moderno (Chrome, Firefox, Edge ou Safari)
- Conexão com a internet

### Acesso ao sistema
Abra o navegador e acesse o endereço fornecido pelo administrador. Você será direcionado para a tela de login.

### Credenciais padrão (ambiente de desenvolvimento)
| Perfil | E-mail | Senha |
|--------|--------|-------|
| Super Admin | admin@leadflow.com | admin123 |

> **Importante:** Altere a senha padrão no primeiro acesso em **Perfil → Alterar Senha**.

---

## 2. Login e Autenticação

### Fazer login
1. Acesse a página de login
2. Preencha **E-mail** e **Senha**
3. Clique em **Entrar**
4. Você será redirecionado ao **Dashboard**

### Visualizar/ocultar senha
- Clique no ícone de **olho** ao lado do campo de senha para mostrar ou esconder os caracteres digitados

### Criar uma conta
1. Na tela de login, clique em **Criar conta**
2. Preencha: Nome, E-mail, Telefone, Senha e Confirme a Senha
3. Aceite os termos de uso
4. Clique em **Criar Conta**

### Esqueci minha senha
1. Na tela de login, clique em **Esqueci minha senha**
2. Informe seu e-mail
3. Clique em **Enviar link de recuperação**
4. Verifique sua caixa de entrada e siga as instruções

### Sair do sistema
1. Clique no seu **avatar** (canto superior direito)
2. Selecione **Sair**

---

## 3. Dashboard

O Dashboard é a página inicial após o login. Ele apresenta uma visão geral do seu CRM.

### Métricas exibidas
- **Total de Leads** — quantidade total de leads cadastrados
- **Novos Hoje** — leads criados no dia atual
- **Taxa de Conversão** — percentual de leads que se tornaram clientes (ganhos ÷ total)
- **Score Médio** — pontuação média de qualificação dos leads

### Gráficos
- **Leads por Status** — gráfico de barras mostrando a distribuição por estágio
- **Leads por Origem** — gráfico de pizza com as fontes de captação

### Leads Recentes
Lista os últimos leads cadastrados com nome, estágio no pipeline e data de criação.

---

## 4. Gestão de Leads

Acesse pelo menu lateral: **Leads**

### Visualizar leads
A tabela exibe todos os leads com colunas ordenáveis: Nome, E-mail, Status, Score, Origem e Data de Criação. Clique no cabeçalho de qualquer coluna para ordenar.

### Buscar leads
Use o campo de busca no topo para filtrar por nome, e-mail ou telefone. A busca é feita automaticamente conforme você digita.

### Filtros avançados
1. Clique no botão **Filtros**
2. Selecione o **Status** desejado (Novo, Contatado, Qualificado, etc.)
3. Selecione a **Origem** (WhatsApp, Website, Indicação, etc.)
4. Para limpar, clique em **Limpar filtros**

> O badge no botão de filtros indica quantos filtros estão ativos.

### Criar novo lead
1. Clique em **Novo Lead**
2. Preencha os campos:
   - **Nome** (obrigatório)
   - **E-mail**
   - **Telefone**
   - **Empresa**
   - **Origem** (selecione da lista)
   - **Observações**
3. Clique em **Criar Lead**

### Visualizar detalhes
Clique no ícone de **olho** (👁) na linha do lead para abrir o modal com todos os detalhes: dados de contato, status, score, tags, responsável e data de criação.

### Editar lead
1. Clique no ícone de **lápis** (✏️) na linha do lead
2. Altere os campos desejados: nome, e-mail, telefone, empresa, origem ou status
3. Clique em **Salvar Alterações**

> Você também pode clicar em **Editar** dentro do modal de detalhes.

### Excluir lead
1. Clique no ícone de **lixeira** (🗑) na linha do lead
2. Confirme a exclusão no modal de confirmação
3. Clique em **Excluir**

> Esta ação não pode ser desfeita.

### Exportar para CSV
1. Clique em **Exportar CSV**
2. Um arquivo `.csv` será baixado com todos os leads visíveis na tabela (respeitando filtros ativos)

### Paginação
Use os botões **◀** e **▶** no rodapé da tabela para navegar entre as páginas.

---

## 5. Kanban (Pipeline)

Acesse pelo menu lateral: **Kanban**

O Kanban exibe seus leads organizados em colunas que representam os estágios do pipeline de vendas.

### Estágios padrão
- Novo Lead → Contatado → Qualificado → Em Negociação → Proposta Enviada → Fechado (Ganho/Perdido)

### Mover leads entre estágios
1. Clique e segure um card de lead
2. Arraste-o para a coluna desejada
3. Solte o card — a mudança é salva automaticamente

### Informações no card
Cada card exibe:
- Nome e empresa do lead
- Barra de score
- Avatar do responsável
- Tags (até 3)

---

## 6. WhatsApp

Acesse pelo menu lateral: **WhatsApp**

Interface de conversas estilo WhatsApp para comunicação com seus leads.

### Lista de conversas
- No painel esquerdo, veja todas as conversas ordenadas pela última mensagem
- Conversas com mensagens não lidas exibem um **badge verde** com a contagem
- Use o campo de busca para encontrar uma conversa por nome ou telefone

### Enviar mensagem
1. Selecione uma conversa no painel esquerdo
2. Digite sua mensagem no campo inferior
3. Pressione **Enter** ou clique no botão **Enviar**

### Identificação
- Mensagens enviadas aparecem em **verde** (à direita)
- Mensagens recebidas aparecem em **cinza** (à esquerda)
- O horário é exibido abaixo de cada mensagem

---

## 7. Chat Interno

Acesse pelo menu lateral: **Chat Interno**

Canal de comunicação entre os membros da equipe, estilo Slack.

### Canais disponíveis
- **#geral** — comunicação geral
- **#vendas** — assuntos de vendas
- **#suporte** — suporte ao cliente

### Enviar mensagem
1. Selecione um canal no painel esquerdo
2. Digite a mensagem no campo inferior
3. Pressione **Enter** ou clique em **Enviar**

### Buscar canais
Use o campo de busca no topo para filtrar canais pelo nome.

---

## 8. Automações

Acesse pelo menu lateral: **Automações**

Configure workflows automatizados para otimizar seu processo de vendas.

### Visão geral
Os cards de estatísticas mostram:
- **Total de automações** criadas
- **Ativas** — quantas estão em funcionamento
- **Execuções totais** — quantas vezes foram disparadas

### Cada automação exibe
- **Nome e descrição**
- **Status** (Ativa/Inativa)
- **Gatilho** — evento que dispara a automação (ex: "Quando lead é criado")
- **Ações** — o que acontece quando o gatilho é ativado (ex: "Enviar template", "Notificar equipe")
- **Execuções** — contador de quantas vezes rodou

### Excluir automação
Clique no ícone de lixeira e confirme no modal.

---

## 9. Relatórios

Acesse pelo menu lateral: **Relatórios**

Análises detalhadas de performance do seu CRM.

### KPIs exibidos
- **Total Leads** — com novos do dia
- **Taxa de Conversão** — com total de convertidos
- **Taxa de Perda** — com total de perdidos
- **Score Médio** — com barra de progresso
- **Pipeline** — leads em andamento

### Gráficos
- **Funil de Vendas** — gráfico horizontal mostrando a progressão dos leads
- **Leads por Origem** — gráfico de pizza com as fontes
- **Distribuição por Status** — gráfico de barras com todos os status

---

## 10. Templates de Mensagens

Acesse pelo menu lateral: **Templates**

Gerencie modelos de mensagens reutilizáveis para WhatsApp e automações.

### Visualizar templates
Cada card exibe:
- Nome e categoria (ex: boas-vindas, follow-up, proposta)
- Conteúdo completo da mensagem
- Variáveis dinâmicas (ex: `{{nome}}`, `{{empresa}}`)

### Copiar template
Clique em **Copiar** para copiar o conteúdo para a área de transferência.

### Excluir template
Clique no ícone de lixeira e confirme no modal de confirmação.

---

## 11. Notificações

### Badge no header
O ícone de **sino** no cabeçalho exibe um badge vermelho com a contagem de notificações não lidas. Clique nele para ir à página de notificações.

### Página de notificações
Acesse pelo menu lateral: **Notificações**

- Notificações não lidas aparecem com **fundo destacado** e um ponto azul
- Clique em uma notificação não lida para marcá-la como lida
- Use o botão **Marcar todas como lidas** para limpar todas de uma vez

### Tipos de notificação
| Ícone | Tipo |
|-------|------|
| 👤 | Novo lead |
| 💬 | Mensagem recebida |
| 🎯 | Lead atribuído |
| ⏰ | Follow-up pendente |
| ⚙️ | Sistema |
| ⚠️ | Lembrete |

---

## 12. Equipe

Acesse pelo menu lateral: **Equipe** (apenas Admin e Super Admin)

### Visão geral
Cards de estatísticas mostram: Total de membros, Ativos, Administradores e Leads atribuídos.

### Lista de membros
Cada membro exibe:
- Avatar com iniciais
- Nome e cargo (Super Admin, Administrador, Vendedor)
- E-mail e telefone
- Quantidade de leads atribuídos
- Último acesso

### Ações
- **Menu (⋮)** → **Remover** — remove o membro com confirmação

---

## 13. Perfil do Usuário

Acesse clicando no **avatar** → **Perfil** ou pelo menu lateral.

### Dados pessoais
Edite seu nome, e-mail e telefone. Clique em **Salvar Alterações**.

### Foto de perfil
1. Clique em **Alterar foto**
2. Selecione uma imagem (JPG, PNG ou WebP, máximo 5MB)
3. A prévia será exibida imediatamente
4. Para remover, clique em **Remover foto**

### Alterar senha
1. Preencha a **Senha atual**
2. Digite a **Nova senha** (mínimo 6 caracteres)
3. Confirme a nova senha
4. Clique em **Alterar Senha**

> Use o ícone de olho para visualizar as senhas enquanto digita.

---

## 14. Configurações

Acesse pelo menu lateral: **Configurações** (apenas Admin e Super Admin)

### Geral
- Nome do sistema
- Idioma do sistema (Português)

### Aparência
Escolha o tema visual:
- **Claro** — fundo branco
- **Escuro** — fundo escuro
- **Sistema** — segue a configuração do seu dispositivo

### Segurança & LGPD
- **Autenticação em dois fatores (2FA)** — ativar/desativar
- **Logs de auditoria** — manter registro de ações
- **Registro de consentimento LGPD** — habilitar tracking de consentimento
- **Direito ao esquecimento** — permitir exclusão de dados

### Notificações
- **Novos leads** — receber notificação quando um lead é criado
- **Mensagens WhatsApp** — alertas de novas mensagens
- **Lembretes de follow-up** — avisos de acompanhamento pendente
- **Resumo semanal** — relatório semanal por e-mail

### Integrações
Configure as chaves de API para serviços externos:
- **WhatsApp (Evolution API)** — URL da API e chave
- **N8N (Automações)** — URL e chave do webhook
- **OpenAI (Qualificação IA)** — chave da API e modelo

---

## 15. Tema Claro / Escuro

O LeadFlow suporta dois temas visuais:

### Alternar tema
- Clique no ícone de **sol/lua** no cabeçalho (ao lado do sino)
- O tema é alternado instantaneamente e a preferência é salva

### Via Configurações
- Acesse **Configurações → Aparência**
- Escolha entre Claro, Escuro ou Sistema

---

## 16. Navegação Mobile

O LeadFlow é totalmente responsivo e funciona em celulares e tablets.

### Menu mobile
- A sidebar fica oculta em telas pequenas
- Toque no ícone de **menu (☰)** no canto superior esquerdo para abrir
- Toque em qualquer item do menu para navegar
- Toque no **X** ou no fundo escuro para fechar

### Breadcrumbs
Em telas internas, os breadcrumbs no topo indicam sua localização. Exemplo: **🏠 → Leads**

---

## 17. Atalhos e Dicas

| Ação | Como fazer |
|------|-----------|
| Buscar leads | Digite no campo de busca (filtra automaticamente) |
| Mover lead no Kanban | Arraste e solte entre colunas |
| Enviar mensagem | Digite + **Enter** (WhatsApp ou Chat) |
| Copiar template | Botão **Copiar** no card do template |
| Exportar leads | Botão **Exportar CSV** na página de leads |
| Alternar tema | Clique no ícone sol/lua no header |
| Marcar todas notificações | Botão **Marcar todas como lidas** |

---

## 18. Perguntas Frequentes (FAQ)

### Quantos leads posso cadastrar?
Não há limite de leads no sistema.

### Posso usar no celular?
Sim. O LeadFlow é totalmente responsivo e funciona em qualquer dispositivo.

### Como altero minha senha?
Acesse **Perfil → Alterar Senha**. Você precisa informar a senha atual.

### Quem pode ver a página de Equipe e Configurações?
Apenas usuários com perfil **Admin** ou **Super Admin**.

### O que acontece se eu excluir um lead?
O lead e todos os dados relacionados (conversas, análises IA, interações) serão removidos permanentemente. Esta ação não pode ser desfeita.

### Como funciona o score do lead?
O score (0-100) é calculado automaticamente pela IA com base no perfil do lead, interações e probabilidade de conversão.

### Posso exportar meus dados?
Sim. Na página de **Leads**, use o botão **Exportar CSV** para baixar os dados em formato planilha.

### O sistema está em conformidade com a LGPD?
Sim. O LeadFlow possui APIs de consentimento, exportação de dados pessoais e direito ao esquecimento, configuráveis em **Configurações → Segurança & LGPD**.

---

## Níveis de Acesso

| Nível | Acesso |
|-------|--------|
| **Super Admin** | Acesso total: equipe, configurações, todos os leads, relatórios |
| **Admin** | Gerencia equipe, configurações e visualiza todos os dados |
| **Vendedor** | Acesso aos próprios leads, kanban, whatsapp, chat e templates |

---

## Suporte

Em caso de dúvidas ou problemas, entre em contato com o administrador do sistema.

---

*Manual gerado para LeadFlow v1.0 — Março 2026*
