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

#### 8.5 — Voz com ElevenLabs

- [ ] Configuração da API Key da ElevenLabs nas Integrações
- [ ] Seleção de voz por agente (lista de vozes disponíveis na conta)
- [ ] Síntese de voz: agente pode responder com mensagem de áudio
- [ ] Configuração de quando usar voz (sempre, nunca, somente se lead enviou áudio)
- [ ] Player de áudio inline no chat para ouvir respostas do agente

#### 8.6 — RAG Dinâmico (Aprendizado por Conversa)

- [ ] Indexação automática de conversas concluídas na base vetorial
- [ ] Configuração de política de aprendizado por agente (automático ou manual)
- [ ] Interface de revisão: humano aprova/rejeita conversas para indexar
- [ ] Atualização incremental dos embeddings sem reindexar tudo
- [ ] Estatísticas de base de conhecimento (documentos, chunks, conversas indexadas)

#### 8.7 — Análise de Sentimento e Escalada Inteligente

- [ ] Análise de sentimento em tempo real durante conversa
- [ ] Score de urgência calculado pelo agente
- [ ] Regras de escalada configuráveis (ex: sentimento < -50 → escalar imediatamente)
- [ ] Alerta visual no chat quando agente identifica lead frustrado
- [ ] Notificação push para atendente humano ao escalar
- [ ] Histórico de escaladas com motivo registrado

#### 8.8 — Métricas e Dashboard de Agentes

- [ ] Dashboard de performance por agente
- [ ] Métricas: mensagens respondidas, taxa de resolução, tempo médio de resposta
- [ ] Taxa de escalada para humanos (por agente e por período)
- [ ] Satisfação estimada com base no sentimento final da conversa
- [ ] Top perguntas respondidas (baseado em logs)
- [ ] Gráficos de tendência semanal/mensal
- [ ] Comparativo entre agentes (quando houver mais de um)

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
| Sistema de Agentes IA | v1.3.0 | 🔜 Planejado | 0% |
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
- [ ] Sistema de Agentes IA (RAG, orquestração, voz)
- [ ] Deploy em produção

---

*Atualizado em Abril/2026 — v1.2.0*
