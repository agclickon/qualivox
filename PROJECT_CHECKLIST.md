# LeadFlow CRM — Checklist de Execução

## Objetivo do Projeto
Plataforma SaaS multi-tenant white label de CRM com integração nativa ao WhatsApp e qualificação automática por IA — comercializável via revenda, sublicenciamento e acesso direto, com controle centralizado de propriedade intelectual pelo titular.

## Stack Tecnológica Real
- **Frontend:** Next.js 14 (App Router) + React 18 + TypeScript
- **UI:** shadcn/ui + Tailwind CSS + Radix UI
- **Backend:** Next.js API Routes
- **Banco de dados:** SQLite via Prisma 5 (SQLite por tenant para isolamento de dados)
- **WhatsApp:** @whiskeysockets/baileys v7 (sem Evolution API)
- **IA:** Módulo unificado — OpenAI, Anthropic, Gemini, Grok, DeepSeek
- **Automação:** N8N via webhook
- **Modelo comercial:** SaaS puro hospedado — parceiros e clientes acessam via browser, nenhum código é distribuído

## Hierarquia de Acesso (4 Níveis)
```
Owner Master (super_admin)  →  gerencia tudo: parceiros, empresas, planos, branding
  └── Parceiro / Revendedor (partner_admin)  →  gerencia carteira própria de clientes + white label
        └── Empresa Cliente (admin)  →  opera o CRM: leads, agentes, integrações
              └── Usuário Operacional (user)  →  acesso restrito ao escopo definido pelo admin
```

## Público-Alvo
- **Clientes diretos:** Pequenas empresas, consultores, agências, vendedores autônomos
- **Parceiros/Revendedores:** Empresas que revendem acesso à plataforma com sua própria marca

---

## COMO USAR ESTE CHECKLIST

- `[x]` — Implementado e funcionando
- `[ ]` — Pendente
- **Para Agentes de IA:** leia os itens marcados para entender o que existe; continue a partir dos itens `[ ]`

---

## FASES CONCLUÍDAS

### Fase 1: Planejamento e Arquitetura ✅ v1.0.0

- [x] Arquitetura Next.js 14 App Router definida
- [x] Schema Prisma com todos os modelos de dados
- [x] Configuração do ambiente de desenvolvimento
- [x] Estrutura de pastas e convenções definidas

### Fase 2: Autenticação e Base ✅ v1.0.0

- [x] Login com email + senha (bcrypt + JWT)
- [x] Refresh tokens com rotação automática
- [x] Cadastro com validação de email único
- [x] Recuperação e redefinição de senha
- [x] Middleware de autenticação em rotas protegidas
- [x] 3 níveis de acesso: `super_admin`, `admin`, `user`
- [x] Perfil do usuário com upload de avatar
- [x] Sidebar responsiva com item ativo e avatar

### Fase 3: CRM Core ✅ v1.0.0

- [x] Módulo de gestão de leads (CRUD completo)
- [x] Kanban interativo com drag-and-drop
- [x] Pipeline de vendas customizável (stages com cor e ordem)
- [x] Dashboard principal com métricas e KPIs
- [x] Gráficos de performance (Recharts)
- [x] Sistema de tags/etiquetas para leads
- [x] Lifecycle stages de lead (prospect → cliente → churned)
- [x] Score de qualificação e campo de notas livre
- [x] Módulo de relatórios avançados

### Fase 4: WhatsApp e IA ✅ v1.1.0

- [x] Integração WhatsApp via Baileys (multi-conexão, sem Evolution API)
- [x] Autenticação por QR Code na interface
- [x] Chat em tempo real com SSE (Server-Sent Events)
- [x] Suporte a mensagens: texto, imagem, áudio, vídeo, documento, sticker
- [x] Criação automática de lead ao receber mensagem nova
- [x] Qualificação automática de leads por IA (score 0-100, quente/morno/frio)
- [x] Análise de sentimento e extração de dados (orçamento, prazo, objeções)
- [x] Geração de sugestão de resposta contextualizada
- [x] Sumarização de conversas longas
- [x] Sistema de follow-up agendado com templates
- [x] Templates de mensagens com variáveis personalizáveis
- [x] Automações de workflow
- [x] Integração N8N via webhook
- [x] Chat interno entre membros da equipe
- [x] Notificações em tempo real

### Fase 5: Atendentes, Timeline e Anotações ✅ v1.2.0

- [x] Atribuição de conversas a atendentes
- [x] Transferência de conversas com auditoria (`ConversationTransfer`)
- [x] Atendente padrão configurável por conexão WhatsApp
- [x] Badge "Em espera" para `status = "waiting"` (sem atendente)
- [x] Timeline de interações por lead (pipeline_move, assignment, transfer, follow_up_sent)
- [x] Anotações manuais na timeline com data/hora e autor
- [x] Edição e exclusão de anotações (somente criador ou super_admin)
- [x] Filtros de tipo na timeline
- [x] Lista de conversas com Nome / Telefone·Empresa / Última mensagem
- [x] Dot verde de presença na lista de conversas

### Fase 6: Multi-provedor IA ✅ v1.2.0

- [x] Módulo unificado `ai-provider.ts` com roteamento por provedor ativo
- [x] Suporte a OpenAI (GPT-4o, GPT-4o-mini)
- [x] Suporte a Anthropic Claude (claude-sonnet-4-6, claude-opus-4-6)
- [x] Suporte a Google Gemini (gemini-2.0-flash, gemini-1.5-pro)
- [x] Suporte a xAI Grok (grok-3, grok-3-mini)
- [x] Suporte a DeepSeek (deepseek-chat, deepseek-reasoner)
- [x] Cards 2-por-linha na tela de Integrações
- [x] Seleção de modelo com dropdown customizado (sem select nativo)
- [x] Troca de provedor ativo sem reiniciar o servidor

### Fase 7: API, Webhooks e Compliance ✅ v1.2.0

- [x] API REST completa (leads, conversas, mensagens, usuários, settings)
- [x] Sistema de webhooks
- [x] LGPD — modelo `LgpdConsent` com rastreabilidade
- [x] Logs de auditoria (`AuditLog`) para todas as ações sensíveis
- [x] Hash de senhas com bcrypt, sessões httpOnly

---

## FASES PLANEJADAS

### Fase 8: Sistema de Agentes IA 🔜 v1.3.0

Implementação de um sistema completo de agentes de IA para atendimento autônomo e assistido via WhatsApp.

#### 8.1 — Gerenciamento de Agentes (UI + CRUD) ✅

- [x] Página `/agentes` no dashboard
- [x] CRUD completo de agentes (nome, descrição, personalidade, tom)
- [x] Campo de prompt de sistema (instrução base do agente)
- [x] Configuração de provedor/modelo por agente (herda global ou sobrescreve)
- [x] Toggle ativo/inativo por agente
- [x] Associação de agente a conexões WhatsApp específicas
- [x] Modo de atuação: autônomo | assistido (sugere, humano aprova) | híbrido

#### 8.2 — RAG (Retrieval Augmented Generation)

- [x] Upload de arquivos de conhecimento por agente (PDF, TXT, DOCX, MD)
- [x] Processamento e chunking de documentos
- [x] Interface para gerenciar base de conhecimento (listar, adicionar, remover)
- [x] Geração de embeddings (OpenAI `text-embedding-3-small` ou Gemini `text-embedding-004`)
- [x] Armazenamento vetorial (AgentKnowledgeChunk com embedding JSON + cosine similarity em Node.js)
- [x] Busca semântica nos documentos ao responder (fallback para keyword se sem embeddings)
- [x] Indicação de fonte usada na resposta (citação natural via system prompt)

#### 8.3 — Orquestrador e Sub-agentes ✅

- [x] Agente orquestrador: decide qual sub-agente acionar
- [x] Sub-agente de qualificação de leads (via RAG + contexto do lead)
- [x] Sub-agente de suporte (responde dúvidas com base de conhecimento)
- [x] Integração do agente ativo com o chat WhatsApp (responde automaticamente)
- [x] Lógica de escalada: agente passa para humano quando confiança < threshold
- [x] Log de decisões do orquestrador na timeline (tipo agent_action)
- [x] Sub-agente de follow-up inteligente (agendamento autônomo via JSON response do LLM)

#### 8.4 — Transcrição de Áudio e Visão Computacional ✅

- [x] Transcrição automática de mensagens de áudio (Whisper API)
- [x] Leitura de imagens enviadas pelo lead (vision — GPT-4o / Gemini / Anthropic / Grok)
- [x] Exibição da transcrição/descrição na interface do chat (abaixo do balão de mídia)
- [x] Uso da transcrição/imagem como contexto para o agente responder

#### 8.5 — Voz com ElevenLabs ✅

- [x] Configuração da API Key da ElevenLabs nas Integrações
- [x] Seleção de voz por agente (lista de vozes disponíveis na conta)
- [x] Síntese de voz: agente pode responder com mensagem de áudio
- [x] Configuração de quando usar voz (sempre, nunca, somente se lead enviou áudio, decisão inteligente)
- [x] Ajustes de voz ElevenLabs (velocidade, estabilidade, similaridade)
- [ ] Player de áudio inline no chat para ouvir respostas do agente

#### 8.6 — RAG Dinâmico (Aprendizado por Conversa) ✅

- [x] Indexação automática de conversas concluídas na base vetorial
- [x] Configuração de política de aprendizado por agente (automático ou manual)
- [x] Interface de revisão: humano aprova/rejeita conversas para indexar
- [x] Atualização incremental dos embeddings sem reindexar tudo
- [x] Estatísticas de base de conhecimento (documentos, chunks, conversas indexadas)

#### 8.7 — Análise de Sentimento e Escalada Inteligente ✅

- [x] Análise de sentimento em tempo real durante conversa
- [x] Score de urgência calculado pelo agente
- [x] Regras de escalada configuráveis (ex: sentimento < -50 → escalar imediatamente)
- [x] Alerta visual no chat quando agente identifica lead frustrado
- [x] Notificação push para atendente humano ao escalar
- [x] Histórico de escaladas com motivo registrado

#### 8.8 — Métricas e Dashboard de Agentes ✅

- [x] Dashboard de performance por agente
- [x] Métricas: mensagens respondidas, taxa de escalada, tempo médio de resposta
- [x] Taxa de escalada para humanos (por agente e por período)
- [x] Satisfação estimada com base no sentimento final da conversa
- [x] Top perguntas respondidas (baseado em logs)
- [x] Gráficos de tendência semanal/mensal
- [x] Comparativo entre agentes (quando houver mais de um)

### Fase 9: Google Calendar e Agendamento Inteligente ✅ v1.4.0

Integração nativa com o Google Calendar para agendamento automático por IA e gestão de compromissos por lead/conversa.

#### 9.1 — Infraestrutura OAuth e Credenciais por Tenant ✅

- [x] Tabela `calendar_integrations` (tokens OAuth por usuário/tenant)
- [x] Tabela `calendar_events` (eventos vinculados a leads e conversas)
- [x] Credenciais OAuth (Client ID + Client Secret) armazenadas no banco de dados por empresa — sem dependência de `.env` (arquitetura SaaS-ready)
- [x] Função `getGoogleCredentials()` com fallback para variáveis de ambiente
- [x] Rota OAuth connect (`/api/integrations/calendar/google/connect`) — gera URL de autorização
- [x] Rota OAuth callback (`/api/integrations/calendar/google/callback`) — troca code por tokens e persiste
- [x] Rota de status (`/api/integrations/calendar/google/status`) — verifica credenciais e conexão ativa
- [x] Rota de disconnect (`/api/integrations/calendar/google/disconnect`) — revoga sessão local
- [x] Auto-renovação de access token via event listener do googleapis

#### 9.2 — CRUD de Eventos ✅

- [x] `createCalendarEvent()` — cria no Google e persiste localmente com vínculo ao lead/conversa
- [x] `updateCalendarEvent()` — atualiza no Google e sincroniza local
- [x] `deleteCalendarEvent()` — cancela no Google e marca local como `cancelled`
- [x] `listUpcomingEvents()` — lista eventos futuros do Google Calendar
- [x] `listLocalEvents()` — filtra eventos locais por lead ou conversa
- [x] API REST completa: `GET/POST/PATCH/DELETE /api/integrations/calendar/events`
- [x] Suporte a Google Meet link (geração automática no evento)
- [x] Envio de convite por e-mail ao participante (`sendUpdates: "all"`)

#### 9.3 — Agendamento Automático pelo Agente IA ✅

- [x] Campo `calendarEvent` no JSON de resposta do agente orquestrador
- [x] Agente detecta intenção de agendamento e retorna data/hora/título/meetLink
- [x] Step 10 no `agent-orchestrator.ts`: verifica integração ativa e cria evento automaticamente
- [x] E-mail do lead usado como attendee quando disponível no contexto
- [x] Data/hora atual injetada no system prompt (fuso horário America/Sao_Paulo)

#### 9.4 — UI em Configurações → Integrações ✅

- [x] Card Google Calendar com campos para Client ID e Client Secret
- [x] Client Secret com toggle show/hide
- [x] URI de redirecionamento exibida para configurar no Google Cloud Console
- [x] Badge de status (Conectado / Desconectado)
- [x] Botão "Conectar Google Calendar" (habilitado somente após salvar credenciais)
- [x] Botão "Desconectar" com confirmação
- [x] Aviso "Salve as integrações antes de conectar" quando credenciais foram preenchidas mas não salvas
- [x] Credenciais incluídas no "Salvar Integrações" (mesma API de settings)

#### 9.5 — Card de Eventos no Painel da Conversa ✅

- [x] Seção "Agendamentos" no painel lateral (AI Analysis Panel) por conversa
- [x] Carrega eventos ao selecionar conversa (`/api/integrations/calendar/events?conversationId=`)
- [x] Exibe título, data/hora formatada (pt-BR), link do Google Meet
- [x] Eventos passados aparecem com opacidade reduzida
- [x] Eventos futuros destacados com borda colorida

### Fase 10 — Página de Agenda ✅ v1.4.0

Visualização e gestão completa de eventos do Google Calendar diretamente no CRM.

#### 10.1 — Infraestrutura e Navegação ✅

- [x] Rota `/agenda` criada no dashboard
- [x] Item "Agenda" adicionado ao sidebar (ícone `CalendarDays`, entre Agentes IA e Chat Interno)

#### 10.2 — KPIs e Indicadores ✅

- [x] Card "Hoje" — quantidade de eventos no dia atual
- [x] Card "Esta semana" — eventos da semana corrente
- [x] Card "Este mês" — total de eventos no mês
- [x] Card "Próximo" — horário e data do próximo evento futuro

#### 10.3 — Visualizações ✅

- [x] **Mês** — grade mensal com eventos por dia (até 3 visíveis + "+N mais"), click no dia abre criação
- [x] **Semana** — colunas por dia com cards de eventos ordenados por hora, dias livres indicados
- [x] **Lista** — eventos do mês em ordem cronológica com data block, separador colorido, badges de Meet e status

#### 10.4 — Filtros e Navegação ✅

- [x] Navegação por período (mês/semana) com botões chevron e "Hoje"
- [x] Filtro de status: Todos / Confirmados / Cancelados
- [x] Toggle de view: Mês / Semana / Lista

#### 10.5 — Criação Manual de Eventos ✅

- [x] Modal "+ Novo Evento" com: título, data, horário, duração (15min–2h), nome/e-mail do convidado, descrição
- [x] Toggle "Adicionar Google Meet" (habilitado por padrão)
- [x] Click em qualquer dia na view mensal pré-preenche a data no modal

#### 10.6 — Painel de Detalhe do Evento ✅

- [x] Painel lateral ao clicar em evento: título, data/hora completa, convidado, origem (agente IA ou manual)
- [x] Botão "Entrar no Google Meet" (quando disponível)
- [x] Link "Ver no Google Calendar"
- [x] Botão "Cancelar Evento" com confirmação (deleta no Google + marca local como cancelled)
- [x] Eventos passados e cancelados com visual diferenciado (opacidade, riscado, cores neutras)

### Fase 11 — Conversão Lead → Cliente com Exportação via Webhook ✅ v1.5.0

Quando um lead é convertido (ganho), o sistema transforma o `lifecycleStage` para `cliente` e dispara um webhook enriquecido para integração com CRMs externos (HubSpot, Pipedrive, RD Station, Salesforce, Zoho, etc.).

#### 11.1 — Gatilhos de Conversão

- [x] Conversão automática ao mudar `status` para `fechado_ganho` na API PUT `/api/leads/:id`
- [x] Botão "Converter para Cliente" no modal de detalhes do lead (com confirmação)
- [x] Atualização do `lifecycleStage` para `cliente` + registro na timeline do lead
- [x] Badge "Cliente" visível no card do Kanban e na listagem de leads

#### 11.2 — Payload Enriquecido

- [x] Evento `lead.converted` com dados completos do lead
- [x] Inclusão de `notes[]` — todas as anotações registradas na timeline
- [x] Inclusão de `aiAnalysis` — resumo IA, sentimento, score de urgência, tópicos-chave
- [x] Inclusão de `tags[]`, `pipelineStage`, `assignedTo`, `convertedAt`
- [x] Campo `source` identificando origem da conversão (manual ou automático)

#### 11.3 — Infraestrutura de Disparo

- [x] Função `fireWebhook(event, payload)` centralizada com assinatura HMAC-SHA256
- [x] Header `X-LeadFlow-Signature: sha256=<hmac>` em todos os disparos
- [x] Integração com endpoints já cadastrados em Configurações → Webhooks
- [x] Filtro por evento: apenas endpoints com `lead.converted` habilitado recebem o disparo

#### 11.4 — Log de Entregas (`webhook_deliveries`)

- [x] Tabela `webhook_deliveries` no schema Prisma (endpointId, event, payload, statusCode, attempt)
- [x] Registro de cada tentativa com statusCode e responseBody
- [x] Retry automático com backoff: imediato → +1min → +5min → +30min (máx 4 tentativas)
- [x] Status final: `success`, `failed`, `pending`

#### 11.5 — UI em Configurações → Webhooks

- [x] Log de entregas por endpoint (últimas 50 tentativas)
- [x] Badge de status por entrega (verde/vermelho/cinza)
- [x] Botão "Reenviar" para entregas com falha
- [x] Exibição do payload enviado e resposta recebida

### Fase 12 — SaaS v2.0: Plataforma Comercial Multi-tenant White Label 🔜 v2.0.0

Transformação do LeadFlow em plataforma SaaS comercial com 4 níveis hierárquicos (Owner → Parceiro → Cliente → Usuário), white label parametrizável por parceiro, billing recorrente e painel administrativo completo. Nenhum código é distribuído — modelo de concessão de uso via SaaS hospedado.

---

#### Arquitetura e Decisões Técnicas

| Decisão | Escolha | Motivo |
|---|---|---|
| Distribuição | SaaS hospedado — código nunca sai | Proteção máxima de PI |
| Isolamento de dados | SQLite por tenant (`data/tenants/leadflow-{id}.db`) | Já implementado, suficiente para MVP |
| Resolução de tenant | Login resolve o tenant via `companyId` do usuário | Sem subdomínio necessário em dev |
| Banco central | `leadflow-admin.db` — empresas, planos, parceiros, branding | Separado dos dados operacionais |
| Auth hierárquico | 4 roles: `super_admin`, `partner_admin`, `admin`, `user` | `partner_admin` é o único role novo |
| White label | CSS variables dinâmicas + branding por parceiro no DB | Sem bifurcação de código |
| Billing | Asaas (PIX + boleto + cartão, mercado BR) | A definir: Asaas ou Stripe |
| Storage de logos | Cloudflare R2 ou local para MVP | A definir com o owner |
| Domínio customizado | Pós-MVP (requer infra Nginx/Cloudflare) | Fora do escopo inicial |
| Modelo de comissão | A definir com parceiros | Repasse %, margem ou fee fixo |

---

#### O que já existe (base técnica pronta)

- [x] Infraestrutura multi-tenant: `tenant.ts` — factory Prisma por tenant, cache, provisionamento
- [x] Middleware `withTenant()` e `getPrismaFromRequest()` — resolução automática do banco por request
- [x] Schema: `SaasPlan`, `SaasCompany`, `SaasAuditLog` — modelos base no schema principal
- [x] Banco central `admin-db.ts` — conexão isolada para `leadflow-admin.db`
- [x] `plan-limits.ts` — estrutura de verificação de limites e feature flags
- [x] `checkTenantFeature()` — verificação de feature flag por plano
- [x] Painel `/admin` (UI parcial) — dashboard de empresas, criação, suspensão
- [x] APIs admin: `/api/admin/companies`, `/api/admin/plans`, `/api/admin/stats`
- [x] Registro `/registrar-empresa` — trial 14 dias, provisionamento de banco isolado
- [x] `verifyTenantAccess()` — base para impersonation

---

#### Fase 12.1 — Fundação e Correções 🔜
*Pré-requisito para tudo. Sem essa fase, os tenants misturam dados.*

- [ ] **[BUG CRÍTICO]** Corrigir `getCurrentUsage()` em `plan-limits.ts` — atualmente consulta o banco `default` em vez do banco isolado do tenant (leads e agentes são contados errado)
- [ ] Aplicar `getPrismaFromRequest(req)` em todas as rotas de leads, equipe, agentes e conexões WhatsApp (atualmente usam `import { prisma }` direto)
- [ ] Adicionar coluna `partner_id` à tabela `saas_companies` (empresa vinculada ao parceiro que a cadastrou)
- [ ] Criar tabela `partners` no schema admin: id, name, slug, email, phone, cnpj, status, commission_percent, max_clients, admin_name, admin_email, password_hash, branding_id
- [ ] Criar tabela `partner_sessions`: tokens de autenticação dos parceiros (separados dos tokens de usuário)
- [ ] Criar tabela `tenant_branding`: owner_type, owner_id, logo_url, favicon_url, primary_color, secondary_color, accent_color, company_name, custom_domain, support_email, support_phone, terms_url, privacy_url
- [ ] Adicionar role `partner_admin` ao sistema JWT (`src/lib/auth.ts` + `src/lib/jwt.ts`)
- [ ] Seed de planos padrão com preços e feature flags configurados (Starter R$29/mês, Pro R$99/mês, Enterprise R$299/mês)
- [ ] Executar `prisma generate` e validar que nenhuma rota usa `as any` por conta de schema desatualizado

---

#### Fase 12.2 — White Label Engine 🔜
*Permite que parceiros operem com a própria marca. Clientes do parceiro nunca veem "LeadFlow".*

- [ ] API `GET /api/branding` — retorna configuração de branding do tenant autenticado seguindo hierarquia: empresa própria → parceiro → padrão da plataforma
- [ ] API `PUT /api/branding` — salva configuração de branding (restrito ao dono do branding)
- [ ] Componente `BrandingProvider` no layout raiz — aplica CSS custom properties (`--color-primary`, `--color-secondary`, `--color-accent`) ao carregar
- [ ] Substituição de logo e nome da plataforma em toda a UI pelos dados do `BrandingProvider`
- [ ] Substituição de favicon dinamicamente via `next/head`
- [ ] Upload de logo e favicon: armazenamento em `public/uploads/branding/` (MVP) ou Cloudflare R2
- [ ] Página `/partner/marca` — formulário de configuração de branding do parceiro com preview ao vivo (logo, cores, nome, e-mail de suporte)
- [ ] Página `/configuracoes/marca` — configuração de branding para empresas com feature flag `white_label` habilitada
- [ ] Tela de login (`/login`) carrega branding correto baseado em query param `?partner=slug` ou domínio
- [ ] Branding do parceiro é aplicado automaticamente a todos os clientes vinculados a ele

---

#### Fase 12.3 — Portal do Parceiro `/partner` 🔜
*O parceiro opera de forma autônoma: cadastra, gerencia e monitora a própria carteira.*

- [ ] Auth de parceiros: rota `POST /api/partner/auth/login` com JWT próprio e cookie `partner_token`
- [ ] Rota `POST /api/partner/auth/logout` e verificação de sessão
- [ ] Middleware de proteção de rotas `/partner/*` — verifica `partner_token`
- [ ] Layout `/partner` com sidebar próprio: Visão Geral, Meus Clientes, White Label, Relatórios, Minha Conta
- [ ] **Dashboard do Parceiro** (`/partner`): KPIs — clientes ativos, em trial, suspensos, MRR estimado da carteira
- [ ] **Lista de Clientes** (`/partner/clientes`): tabela com nome, plano, status, uso, data de criação, botões de ação (entrar, suspender, editar)
- [ ] **Nova Empresa** (`/partner/clientes/novo`): formulário que provisiona novo tenant e o vincula ao parceiro automaticamente
- [ ] **Detalhe do Cliente** (`/partner/clientes/[id]`): métricas de uso do tenant, lista de usuários, eventos recentes, botão "Entrar como" (impersonation)
- [ ] **Impersonation pelo parceiro**: parceiro pode entrar no dashboard de um cliente para suporte, com banner de aviso "Você está visualizando como [Empresa]"
- [ ] **White Label** (`/partner/marca`): formulário + preview (implementado na Fase 12.2)
- [ ] **Relatórios** (`/partner/relatorios`): gráficos de crescimento de carteira, churn, receita por período
- [ ] **Minha Conta** (`/partner/conta`): dados cadastrais do parceiro, status do contrato, percentual de comissão, histórico
- [ ] Limite de clientes por parceiro (`max_clients`): bloqueia criação quando atingido com mensagem de upgrade

---

#### Fase 12.4 — Painel `/admin` Completo 🔜
*Owner tem visão e controle de toda a operação — parceiros, clientes, planos, branding global.*

- [ ] **Aba Parceiros** no `/admin`: lista de parceiros com status, carteira (n° clientes), MRR gerado, data de criação
- [ ] Formulário de novo parceiro: dados cadastrais + percentual de comissão + plano de parceria + limite de clientes + branding inicial
- [ ] Edição de parceiro: alterar dados, comissão, status, limite de clientes
- [ ] Suspensão/reativação de parceiro com bloqueio em cascata dos clientes do parceiro (opcional, configurável)
- [ ] Detalhe do parceiro: carteira de clientes, métricas consolidadas, histórico de auditoria
- [ ] Impersonation de parceiro: Owner entra no portal `/partner` de qualquer parceiro para suporte
- [ ] Impersonation de empresa: Owner entra no dashboard de qualquer cliente diretamente
- [ ] **Branding Global** no `/admin`: configura a identidade visual padrão da plataforma (usada quando não há branding de parceiro/empresa)
- [ ] Dashboard de métricas globais: MRR total, empresas por parceiro vs. diretas, growth mensal, churn rate
- [ ] CRUD completo de planos com feature flags editáveis (completar o que existe)
- [ ] Edição e exclusão de empresas (completar o que existe)
- [ ] Troca de plano de empresa com efeito imediato
- [ ] Log de auditoria global: todas as ações do `/admin` e `/partner` registradas em `saas_audit_logs`

---

#### Fase 12.5 — Registro Público e Onboarding 🔜
*Ativa o canal de entrada para clientes diretos sem intervenção manual.*

- [ ] Página pública `/register` com identidade visual da plataforma (ou do parceiro via `?partner=slug`)
- [ ] Formulário: razão social, CNPJ, e-mail, telefone, nome do responsável, senha, confirmação de senha
- [ ] Validações: CNPJ único, e-mail único, CNPJ válido (algoritmo), senha mínimo 8 caracteres
- [ ] Seleção de plano na tela de registro (ou trial automático no Pro)
- [ ] Trial de 14 dias automático após registro — provisiona banco isolado imediatamente
- [ ] E-mail transacional de boas-vindas: nome do responsável, nome da empresa, link de acesso, período de trial
- [ ] Banner de contagem de trial no dashboard: "X dias restantes no seu trial — Faça upgrade"
- [ ] Wizard de onboarding no primeiro login (3 passos): **1** Conectar WhatsApp → **2** Criar primeiro agente → **3** Importar ou criar primeiro lead
- [ ] Tela de trial expirado: bloqueia acesso ao dashboard e exibe página de upgrade (sem perder dados)
- [ ] Tela de conta suspensa: exibe contato do suporte

---

#### Fase 12.6 — Billing e Monetização 🔜
*Gera receita recorrente automaticamente. Sem essa fase, a plataforma não é comercializável.*

- [ ] Definição do gateway (Asaas ou Stripe) e configuração das credenciais no banco admin
- [ ] API `POST /api/billing/subscribe` — cria assinatura no gateway para a empresa
- [ ] API `POST /api/billing/webhook` — recebe eventos do gateway (pagamento confirmado, inadimplência, cancelamento)
- [ ] Ativação automática de empresa ao pagamento confirmado (status `active`)
- [ ] Suspensão automática ao inadimplir X dias (status `suspended`) com notificação por e-mail
- [ ] Cancelamento ao atingir deadline de inadimplência (status `cancelled`)
- [ ] Página `/configuracoes/plano` completa: plano atual, gráficos de uso por recurso, datas de renovação, histórico de faturas
- [ ] Cards de planos disponíveis com tabela comparativa de features
- [ ] Fluxo de upgrade: modal de confirmação → criação de nova assinatura no gateway → atualização imediata de limites
- [ ] Fluxo de downgrade: confirmação com aviso de perda de features → agendado para fim do ciclo atual
- [ ] Enforcement de limites em TODAS as rotas `POST` de criação (leads, usuários, conexões, agentes)
- [ ] Banners de aviso no dashboard quando uso ultrapassa 80% do limite de qualquer recurso
- [ ] Registro de receita por parceiro: quanto cada parceiro gerou no período para cálculo de comissão
- [ ] Relatório de comissões no portal do parceiro (valor gerado × percentual = comissão do período)
- [ ] Rate limiting por tenant nas APIs para evitar abuso

---

## MELHORIAS TÉCNICAS PENDENTES

### Infraestrutura

- [x] Executar `prisma generate` após restart (remover `as any` casts temporários)
- [ ] Mover URL e API Key do N8N para tabela `Setting` (atualmente lê de `process.env`)
- [ ] Deploy em Railway / Coolify / VPS com variáveis de ambiente de produção
- [ ] Script de backup automático por tenant (backup dos arquivos `.db` individualmente)
- [ ] Rate limiting global (next.js middleware ou upstash rate-limit)
- [ ] Monitoramento de erros em produção (Sentry ou equivalente)

### UX / Interface

- [ ] Paginação ou scroll infinito na lista de conversas do WhatsApp
- [ ] Busca global de leads por nome, telefone, empresa
- [ ] Importação de leads via CSV
- [ ] Exportação de leads e relatórios em CSV/PDF
- [ ] Notificações push no browser (Web Push API)
- [ ] Versão mobile responsiva do chat WhatsApp
- [ ] Player de áudio inline no chat para ouvir respostas do agente (Fase 8.5 pendente)

### Calendário e Agendamento

- [ ] Date picker com identidade visual da plataforma na página de Leads (filtro por data)
- [ ] Filtros de calendário por agenda (múltiplos calendários Google) na Agenda

---

## RESUMO DE PROGRESSO

| Fase | Versão | Status | Conclusão |
|------|--------|--------|-----------|
| Planejamento e Arquitetura | v1.0.0 | ✅ Concluído | 100% |
| Autenticação e Base | v1.0.0 | ✅ Concluído | 100% |
| CRM Core | v1.0.0 | ✅ Concluído | 100% |
| WhatsApp e IA | v1.1.0 | ✅ Concluído | 100% |
| Atendentes, Timeline e Anotações | v1.2.0 | ✅ Concluído | 100% |
| Multi-provedor IA | v1.2.0 | ✅ Concluído | 100% |
| API, Webhooks e Compliance | v1.2.0 | ✅ Concluído | 100% |
| Sistema de Agentes IA | v1.4.0 | ✅ Concluído | 100% |
| Google Calendar e Agendamento | v1.4.0 | ✅ Concluído | 100% |
| Página de Agenda | v1.4.0 | ✅ Concluído | 100% |
| Conversão Lead → Cliente + Webhook | v1.5.0 | ✅ Concluído | 100% |
| 12.1 — Fundação e Correções | v2.0.0 | 🔜 Pendente | 0% |
| 12.2 — White Label Engine | v2.0.0 | 🔜 Pendente | 0% |
| 12.3 — Portal do Parceiro | v2.0.0 | 🔜 Pendente | 0% |
| 12.4 — Admin Panel Completo | v2.0.0 | 🔜 Pendente | 0% |
| 12.5 — Registro e Onboarding | v2.0.0 | 🔜 Pendente | 0% |
| 12.6 — Billing e Monetização | v2.0.0 | 🔜 Pendente | 0% |
| Melhorias Técnicas | — | 🔜 Pendente | 0% |

---

## ENTREGÁVEIS PRINCIPAIS

- [x] Autenticação e autorização com 3 níveis de acesso
- [x] Dashboard com métricas e KPIs de leads e vendas
- [x] Gestão de leads com Kanban, pipeline customizável e lifecycle stages
- [x] WhatsApp multi-conexão via Baileys (sem Evolution API)
- [x] Chat em tempo real com SSE
- [x] Qualificação automática por IA (score, classificação, sentimento)
- [x] Sistema de atendentes com atribuição, transferência e auditoria
- [x] Timeline de interações por lead com anotações permissionadas
- [x] Follow-up agendado com templates personalizáveis
- [x] Multi-provedor IA (5 provedores, troca sem restart)
- [x] Chat interno entre membros da equipe
- [x] Automações de workflow + integração N8N
- [x] Relatórios com gráficos de performance
- [x] Notificações em tempo real
- [x] Tags, LGPD, webhooks e logs de auditoria
- [x] Sistema de Agentes IA (RAG, orquestração, voz, aprendizado dinâmico)
- [x] Google Calendar integrado com agendamento automático por IA (SaaS-ready, credenciais por empresa)
- [x] Página de Agenda com views mês/semana/lista, criação manual e painel de detalhes
- [x] Conversão Lead → Cliente com webhook enriquecido para integração com CRMs externos
- [ ] **[12.1]** Fundação SaaS: schema expandido, auth 4 roles, bug de isolamento corrigido
- [ ] **[12.2]** White label por parceiro: logo, cores, nome, branding dinâmico na UI
- [ ] **[12.3]** Portal do Parceiro: gestão autônoma de carteira, onboarding de clientes, relatórios comerciais
- [ ] **[12.4]** Admin completo: gestão de parceiros, impersonation, métricas globais, branding da plataforma
- [ ] **[12.5]** Registro público: `/register`, wizard de onboarding, trial, e-mail de boas-vindas
- [ ] **[12.6]** Billing: assinatura recorrente, enforcement de limites, upgrade/downgrade, comissões de parceiros
- [ ] Deploy em produção com backup automático e monitoramento

---

## PENDÊNCIAS DE DECISÃO DO OWNER

Itens que precisam de definição antes da implementação das fases correspondentes:

| Decisão | Impacta | Opções |
|---|---|---|
| Gateway de pagamento | Fase 12.6 | **Asaas** (PIX/boleto/cartão BR) ou **Stripe** (cartão + internacional) |
| Storage de logos | Fase 12.2 | **Local** (`public/uploads/`) para MVP ou **Cloudflare R2** desde o início |
| Domínio customizado por parceiro | Pós-MVP | Incluir no MVP ou implementar após primeiro parceiro ativo |
| Modelo de comissão com parceiros | Fase 12.6 | **Repasse %** (parceiro recebe X% do que clientes pagam) / **Margem** (parceiro define preço) / **Fee fixo** (mensalidade pelo portal) |
| Preços dos planos | Fase 12.5/F | Starter R$29, Pro R$99, Enterprise R$299 — confirmar valores |

---

*Atualizado em Abril/2026 — v1.5.0 → v2.0.0 | Produto CRM concluído (v1.5) | Fase 12 planejada: SaaS comercial com 4 níveis hierárquicos, white label por parceiro, portal de revendedor, billing recorrente e painel admin completo*
