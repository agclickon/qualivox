# Documentação Técnica

# Documentação Técnica - Sistema de Gestão de Leads com IA

## Índice
1. [Visão Geral](#visão-geral)
2. [Arquitetura do Sistema](#arquitetura-do-sistema)
3. [Stack Tecnológica](#stack-tecnológica)
4. [Requisitos do Sistema](#requisitos-do-sistema)
5. [Processo de Setup](#processo-de-setup)
6. [Estrutura do Banco de Dados](#estrutura-do-banco-de-dados)
7. [APIs e Integrações](#apis-e-integrações)
8. [Funcionalidades Principais](#funcionalidades-principais)
9. [Considerações de Segurança](#considerações-de-segurança)
10. [Monitoramento e Performance](#monitoramento-e-performance)
11. [Deployment e DevOps](#deployment-e-devops)
12. [Manutenção e Suporte](#manutenção-e-suporte)

---

## Visão Geral

### Descrição do Projeto
O Sistema de Gestão de Leads com IA é uma plataforma SaaS desenvolvida para automatizar e otimizar processos de vendas através de integração inteligente com WhatsApp. O sistema oferece qualificação automática de leads por inteligência artificial, gestão visual via kanban e automação completa de follow-up.

### Objetivos Principais
- **Automatização Completa**: Integração WhatsApp via Evolution API com processamento automático de mensagens
- **Qualificação Inteligente**: Sistema de IA para classificação e pontuação automática de leads
- **Gestão Visual**: Interface kanban intuitiva para acompanhamento do pipeline de vendas
- **Automação de Processos**: Integração com N8N para workflows automatizados
- **Analytics Avançado**: Dashboard com métricas detalhadas e relatórios de performance

### Público-Alvo
- Pequenas e médias empresas
- Consultores independentes
- Agências de marketing digital
- Vendedores autônomos
- Equipes de vendas de qualquer segmento

### Indicadores de Sucesso
- Número de leads processados automaticamente
- Taxa de qualificação de leads por IA
- Tempo médio de resposta
- Taxa de conversão por canal
- Engajamento da equipe com a plataforma

---

## Arquitetura do Sistema

### Arquitetura Geral
```mermaid
graph TB
    A[Frontend - Next.js] --> B[API Gateway]
    B --> C[Backend - Node.js]
    C --> D[PostgreSQL]
    C --> E[Redis Cache]
    C --> F[Evolution API]
    F --> G[WhatsApp Business]
    C --> H[N8N Automação]
    C --> I[IA Qualificação]
    J[Vercel CDN] --> A
```

### Componentes Principais

#### 1. **Frontend Layer**
- **Framework**: Next.js 14 com App Router
- **UI Library**: shadcn/ui + Tailwind CSS
- **State Management**: Zustand para estado global
- **Real-time**: WebSocket para atualizações em tempo real
- **Charts**: Recharts para visualização de dados

#### 2. **Backend Layer**
- **Runtime**: Node.js 18+ com Express.js
- **ORM**: Prisma para manipulação do banco
- **Authentication**: JWT com refresh tokens
- **Real-time**: Socket.io para comunicação bidirecional
- **Queue System**: Bull/BullMQ para processamento assíncrono

#### 3. **Database Layer**
- **Primary DB**: PostgreSQL para dados relacionais
- **Cache**: Redis para sessões e cache de alta performance
- **Storage**: Vercel Blob para arquivos estáticos

#### 4. **Integration Layer**
- **WhatsApp**: Evolution API para integração
- **Automation**: N8N para workflows
- **AI Service**: OpenAI GPT-4 para qualificação
- **Notifications**: OneSignal para push notifications

### Padrões Arquiteturais

#### Clean Architecture
```
└── src/
    ├── domain/           # Entidades e regras de negócio
    ├── application/      # Casos de uso e serviços
    ├── infrastructure/   # Implementações externas
    └── presentation/     # Controllers e rotas
```

#### Microserviços Internos
- **Auth Service**: Autenticação e autorização
- **Lead Service**: Gestão de leads e pipeline
- **WhatsApp Service**: Integração com Evolution API
- **AI Service**: Processamento de qualificação
- **Notification Service**: Gestão de notificações
- **Analytics Service**: Relatórios e métricas

---

## Stack Tecnológica

### Frontend Stack
```json
{
  "framework": "Next.js 14",
  "language": "TypeScript",
  "styling": "Tailwind CSS",
  "components": "shadcn/ui",
  "state": "Zustand",
  "forms": "React Hook Form + Zod",
  "charts": "Recharts",
  "real-time": "Socket.io Client",
  "testing": "Jest + Testing Library"
}
```

### Backend Stack
```json
{
  "runtime": "Node.js 18+",
  "framework": "Express.js",
  "language": "TypeScript",
  "orm": "Prisma",
  "validation": "Zod",
  "auth": "JWT + Passport",
  "real-time": "Socket.io",
  "queue": "BullMQ",
  "testing": "Jest + Supertest"
}
```

### Database & Infrastructure
```json
{
  "database": "PostgreSQL 15+",
  "cache": "Redis 7+",
  "storage": "Vercel Blob",
  "deployment": "Vercel",
  "monitoring": "Vercel Analytics",
  "cdn": "Vercel Edge Network"
}
```

### External Services
```json
{
  "whatsapp": "Evolution API",
  "automation": "N8N",
  "ai": "OpenAI GPT-4",
  "notifications": "OneSignal",
  "email": "Resend",
  "sms": "Twilio (opcional)"
}
```

---

## Requisitos do Sistema

### Requisitos Funcionais

#### RF01 - Autenticação e Autorização
- Sistema de login/logout com JWT
- Recuperação de senha via email
- Gestão de perfis (Admin, Manager, Agent, Viewer)
- Autenticação de dois fatores (2FA)

#### RF02 - Integração WhatsApp
- Conexão automática via Evolution API
- Recepção de mensagens em tempo real
- Envio de mensagens automáticas e manuais
- Gestão de múltiplas instâncias WhatsApp
- Histórico completo de conversas

#### RF03 - Qualificação de Leads por IA
- Análise automática de mensagens recebidas
- Pontuação de leads (0-100)
- Categorização por interesse e qualificação
- Extração de informações estruturadas
- Sugestões de próximas ações

#### RF04 - Gestão Visual (Kanban)
- Pipeline personalizável por etapas
- Drag & drop para movimentação de leads
- Filtros avançados por status, origem, pontuação
- Visualização em lista e cards
- Bulk actions para múltiplos leads

#### RF05 - Chat Interno
- Comunicação entre membros da equipe
- Notas internas por lead
- Histórico de interações
- Notificações de menções
- Anexos e compartilhamento de arquivos

#### RF06 - Automação e N8N
- Integração nativa com N8N
- Triggers automáticos por eventos
- Workflows personalizáveis
- Execução de ações baseadas em regras
- Logs de execução de automações

#### RF07 - Dashboard e Relatórios
- Métricas de performance em tempo real
- Relatórios de conversão por período
- Análise de origem de leads
- Performance individual e da equipe
- Exportação de dados (CSV, PDF)

#### RF08 - Gestão de Equipes
- Cadastro e gestão de usuários
- Atribuição de leads por regras
- Permissões granulares por módulo
- Hierarquia organizacional
- Logs de auditoria

#### RF09 - Sistema de Notificações
- Push notifications no navegador
- Notificações por email
- Alertas para novos leads
- Lembretes de follow-up
- Notificações personalizáveis

#### RF10 - Integrações Externas
- API REST para integrações
- Webhooks para eventos
- Integração com CRMs existentes
- Conexão com ferramentas de marketing
- Sincronização de dados

### Requisitos Não-Funcionais

#### RNF01 - Performance
- Tempo de resposta < 200ms para operações básicas
- Suporte a 1000+ usuários simultâneos
- Processamento de 10k+ mensagens/hora
- Cache inteligente com 95% hit rate

#### RNF02 - Disponibilidade
- Uptime de 99.9%
- Recuperação automática de falhas
- Backup automático diário
- Failover transparente

#### RNF03 - Segurança
- Criptografia end-to-end
- Compliance com LGPD
- Logs de auditoria completos
- Rate limiting por usuário/IP
- Validação rigorosa de inputs

#### RNF04 - Escalabilidade
- Arquitetura horizontal
- Auto-scaling baseado em demanda
- Otimização de queries N+1
- CDN para assets estáticos

#### RNF05 - Usabilidade
- Interface responsiva (mobile-first)
- Tempo de carregamento < 3s
- Suporte a múltiplos idiomas
- Acessibilidade WCAG 2.1 AA

---

## Processo de Setup

### Pré-requisitos

#### Ambiente de Desenvolvimento
```bash
# Versões mínimas necessárias
Node.js >= 18.0.0
npm >= 9.0.0
PostgreSQL >= 15.0
Redis >= 7.0
Git >= 2.40.0
```

#### Serviços Externos Necessários
- Conta Vercel para deployment
- Instância Evolution API configurada
- Instância N8N operacional
- API Key OpenAI (GPT-4)
- Conta OneSignal para notificações

### Configuração Local

#### 1. Clonagem e Instalação
```bash
# Clone do repositório
git clone https://github.com/empresa/gestao-leads-ia.git
cd gestao-leads-ia

# Instalação de dependências
npm install

# Configuração do Husky (hooks Git)
npm run prepare
```

#### 2. Configuração de Ambiente
```bash
# Copiar arquivo de ambiente
cp .env.example .env.local

# Editar variáveis necessárias
nano .env.local
```

#### 3. Variáveis de Ambiente
```env
# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/gestao_leads"
REDIS_URL="redis://localhost:6379"

# Authentication
JWT_SECRET="sua-chave-jwt-super-secreta"
JWT_REFRESH_SECRET="sua-chave-refresh-super-secreta"
NEXTAUTH_SECRET="sua-chave-nextauth"
NEXTAUTH_URL="http://localhost:3000"

# WhatsApp Integration
EVOLUTION_API_URL="https://sua-instancia-evolution.com"
EVOLUTION_API_KEY="sua-api-key-evolution"

# AI Service
OPENAI_API_KEY="sk-sua-chave-openai"
OPENAI_MODEL="gpt-4"

# N8N Integration
N8N_URL="https://sua-instancia-n8n.com"
N8N_API_KEY="sua-api-key-n8n"

# Notifications
ONESIGNAL_APP_ID="seu-app-id-onesignal"
ONESIGNAL_REST_KEY="sua-rest-key-onesignal"

# Email
RESEND_API_KEY="sua-chave-resend"
FROM_EMAIL="noreply@seudominio.com"

# Storage
BLOB_READ_WRITE_TOKEN="sua-token-vercel-blob"

# Analytics
VERCEL_ANALYTICS_ID="seu-id-vercel-analytics"
```

#### 4. Setup do Banco de Dados
```bash
# Executar migrações
npx prisma migrate deploy

# Gerar cliente Prisma
npx prisma generate

# Seed inicial (opcional)
npx prisma db seed
```

#### 5. Inicialização
```bash
# Modo desenvolvimento
npm run dev

# Build de produção
npm run build
npm run start
```

### Configuração de Produção

#### 1. Deploy na Vercel
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy inicial
vercel

# Configurar domínio personalizado
vercel domains add seudominio.com
```

#### 2. Configuração de Database
```bash
# Usar Vercel Postgres ou Supabase
# Configurar connection string na Vercel
vercel env add DATABASE_URL
```

#### 3. Configuração de Redis
```bash
# Usar Upstash Redis
# Adicionar URL na Vercel
vercel env add REDIS_URL
```

#### 4. Configuração de Monitoring
```bash
# Ativar Vercel Analytics
vercel env add VERCEL_ANALYTICS_ID

# Configurar alertas
vercel env add WEBHOOK_ALERTS_URL
```

---

## Estrutura do Banco de Dados

### Schema Principal

#### Tabela: users
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role user_role NOT NULL DEFAULT 'agent',
  avatar_url VARCHAR(500),
  phone VARCHAR(20),
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP,
  email_verified BOOLEAN DEFAULT false,
  two_factor_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Tabela: leads
```sql
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) UNIQUE NOT NULL,
  email VARCHAR(255),
  whatsapp_number VARCHAR(20),
  status lead_status DEFAULT 'new',
  score INTEGER DEFAULT 0 CHECK (score >= 0 AND score <= 100),
  qualification_level qualification_level DEFAULT 'unqualified',
  source lead_source DEFAULT 'whatsapp',
  assigned_to UUID REFERENCES users(id),
  company_name VARCHAR(255),
  position VARCHAR(255),
  budget DECIMAL(15,2),
  urgency urgency_level DEFAULT 'low',
  last_interaction TIMESTAMP,
  tags TEXT[],
  notes TEXT,
  custom_fields JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Tabela: conversations
```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  whatsapp_chat_id VARCHAR(255) UNIQUE,
  is_group BOOLEAN DEFAULT false,
  last_message_at TIMESTAMP,
  unread_count INTEGER DEFAULT 0,
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Tabela: messages
```sql
CREATE TABLE messages (
  id

---
*Tipo: technical*
*Gerado pelo ForgeAI em 18/03/2026*
