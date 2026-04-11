# LeadFlow CRM — Checklist de Execução

## Objetivo do Projeto
CRM de gestão de leads com integração nativa ao WhatsApp e qualificação automática por IA para automatizar e otimizar o processo de vendas.

## Stack Tecnológica Real
- **Frontend:** Next.js 14 (App Router) + React 18 + TypeScript
- **UI:** shadcn/ui + Tailwind CSS + Radix UI
- **Backend:** Next.js API Routes
- **Banco de dados:** SQLite via Prisma 5
- **WhatsApp:** @whiskeysockets/baileys v7 (sem Evolution API)
- **IA:** Módulo unificado — OpenAI, Anthropic, Gemini, Grok, DeepSeek
- **Automação:** N8N via webhook

## Público-Alvo
Pequenas empresas, consultores, agências de marketing, vendedores autônomos

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

### Fase 11 — Conversão Lead → Cliente com Exportação via Webhook 🔜 v1.5.0

Quando um lead é convertido (ganho), o sistema transforma o `lifecycleStage` para `cliente` e dispara um webhook enriquecido para integração com CRMs externos (HubSpot, Pipedrive, RD Station, Salesforce, Zoho, etc.).

#### 11.1 — Gatilhos de Conversão

- [ ] Conversão automática ao mudar `status` para `fechado_ganho` na API PUT `/api/leads/:id`
- [ ] Botão "Converter para Cliente" no modal de detalhes do lead (com confirmação)
- [ ] Atualização do `lifecycleStage` para `cliente` + registro na timeline do lead
- [ ] Badge "Cliente" visível no card do Kanban e na listagem de leads

#### 11.2 — Payload Enriquecido

- [ ] Evento `lead.converted` com dados completos do lead
- [ ] Inclusão de `notes[]` — todas as anotações registradas na timeline
- [ ] Inclusão de `aiAnalysis` — resumo IA, sentimento, score de urgência, tópicos-chave
- [ ] Inclusão de `tags[]`, `pipelineStage`, `assignedTo`, `convertedAt`
- [ ] Campo `source` identificando origem da conversão (manual ou automático)

#### 11.3 — Infraestrutura de Disparo

- [ ] Função `fireWebhook(event, payload)` centralizada com assinatura HMAC-SHA256
- [ ] Header `X-LeadFlow-Signature: sha256=<hmac>` em todos os disparos
- [ ] Integração com endpoints já cadastrados em Configurações → Webhooks
- [ ] Filtro por evento: apenas endpoints com `lead.converted` habilitado recebem o disparo

#### 11.4 — Log de Entregas (`webhook_deliveries`)

- [ ] Tabela `webhook_deliveries` no schema Prisma (endpointId, event, payload, statusCode, attempt)
- [ ] Registro de cada tentativa com statusCode e responseBody
- [ ] Retry automático com backoff: imediato → +1min → +5min → +30min (máx 4 tentativas)
- [ ] Status final: `success`, `failed`, `pending`

#### 11.5 — UI em Configurações → Webhooks

- [ ] Log de entregas por endpoint (últimas 50 tentativas)
- [ ] Badge de status por entrega (verde/vermelho/cinza)
- [ ] Botão "Reenviar" para entregas com falha
- [ ] Exibição do payload enviado e resposta recebida

---

## MELHORIAS TÉCNICAS PENDENTES

### Infraestrutura

- [ ] Executar `prisma generate` após restart (remover todos os `as any` casts temporários)
- [ ] Mover URL e API Key do N8N para tabela `Setting` (atualmente só lê de `process.env`)
- [ ] Avaliar migração de SQLite para PostgreSQL para produção com múltiplos usuários
- [ ] Deploy na Vercel / Railway / Coolify com variáveis de ambiente de produção
- [ ] Configurar domínio personalizado

### UX / Interface

- [ ] Paginação ou scroll infinito na lista de conversas do WhatsApp
- [ ] Busca global de leads por nome, telefone, empresa
- [ ] Importação de leads via CSV
- [ ] Exportação de leads e relatórios em CSV/PDF
- [ ] Notificações push no browser (Web Push API)
- [ ] Versão mobile responsiva do chat WhatsApp

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
| Conversão Lead → Cliente + Webhook | v1.5.0 | 🔜 Planejado | 0% |
| Melhorias Técnicas | — | 🔜 Planejado | 0% |

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
- [x] Sistema de Agentes IA (RAG, orquestração, voz)
- [x] Google Calendar integrado com agendamento automático por IA (SaaS-ready, credenciais por empresa)
- [x] Página de Agenda com views mês/semana/lista, criação manual e painel de detalhes
- [ ] Conversão Lead → Cliente com webhook enriquecido (notas + análise IA) para integração com CRMs externos
- [ ] Deploy em produção

---

*Atualizado em Abril/2026 — v1.4.0 — Fases 9 e 10 concluídas: Google Calendar SaaS-ready + Página de Agenda | Fase 11 planejada: Conversão Lead → Cliente + Webhook CRM*
