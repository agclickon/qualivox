# Arquitetura do Sistema

# Documentação de Arquitetura - Sistema de Gestão de Leads com IA

## 1. Visão Geral da Arquitetura

O sistema é uma plataforma SaaS desenvolvida com arquitetura moderna baseada em microserviços, utilizando React/Next.js no frontend e Node.js no backend, com PostgreSQL como banco de dados principal.

### 1.1 Arquitetura de Alto Nível

```mermaid
graph TB
    subgraph "Frontend"
        A[React/Next.js App]
        B[shadcn/ui Components]
        C[Real-time Chat]
    end
    
    subgraph "Backend Services"
        D[API Gateway]
        E[Auth Service]
        F[Lead Management Service]
        G[WhatsApp Integration Service]
        H[AI Qualification Service]
        I[Notification Service]
        J[Reporting Service]
    end
    
    subgraph "External APIs"
        K[Evolution API]
        L[OpenAI/Gemini]
        M[N8N Workflows]
    end
    
    subgraph "Data Layer"
        N[PostgreSQL]
        O[Redis Cache]
        P[File Storage]
    end
    
    A --> D
    D --> E
    D --> F
    D --> G
    D --> H
    D --> I
    D --> J
    
    G --> K
    H --> L
    F --> M
    
    E --> N
    F --> N
    G --> N
    H --> N
    I --> N
    J --> N
    
    F --> O
    G --> O
    I --> O
```

### 1.2 Fluxo de Dados Principal

```mermaid
sequenceDiagram
    participant WA as WhatsApp
    participant EV as Evolution API
    participant WS as WhatsApp Service
    participant AI as AI Service
    participant LM as Lead Management
    participant DB as PostgreSQL
    participant FE as Frontend
    
    WA->>EV: Nova mensagem
    EV->>WS: Webhook notificação
    WS->>AI: Qualificar lead
    AI->>AI: Processar com IA
    AI->>LM: Score e classificação
    LM->>DB: Salvar dados
    LM->>FE: Notificação real-time
    FE->>FE: Atualizar kanban
```

## 2. Componentes de Sistema

### 2.1 Frontend (React/Next.js)

**Responsabilidades:**
- Interface do usuário responsiva
- Gestão de estado da aplicação
- Comunicação real-time via WebSockets
- Renderização de componentes shadcn/ui

**Tecnologias:**
- Next.js 14+ (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui
- Zustand para gestão de estado
- Socket.io-client para real-time

### 2.2 API Gateway

**Responsabilidades:**
- Roteamento de requisições
- Autenticação e autorização
- Rate limiting
- Logging centralizado

**Implementação:**
- Express.js com middleware customizado
- JWT para autenticação
- CORS configurado
- Helmet para segurança

### 2.3 Serviços Backend

#### 2.3.1 Auth Service
```mermaid
graph LR
    A[Login Request] --> B[Validate Credentials]
    B --> C{Valid?}
    C -->|Yes| D[Generate JWT]
    C -->|No| E[Return Error]
    D --> F[Return Token]
    F --> G[Store Session]
```

#### 2.3.2 Lead Management Service
**Funcionalidades:**
- CRUD de leads
- Pipeline/Kanban management
- Histórico de interações
- Sistema de tags e categorização

#### 2.3.3 WhatsApp Integration Service
**Responsabilidades:**
- Integração com Evolution API
- Gerenciamento de sessões WhatsApp
- Templates de mensagens
- Automação de respostas

#### 2.3.4 AI Qualification Service
**Funcionalidades:**
- Análise de sentimento
- Scoring automático de leads
- Classificação por critérios
- Extração de informações relevantes

## 3. Modelo de Dados

### 3.1 Diagrama ER

```mermaid
erDiagram
    USERS ||--o{ TEAMS : belongs_to
    USERS ||--o{ LEADS : manages
    TEAMS ||--o{ LEADS : owns
    LEADS ||--o{ INTERACTIONS : has
    LEADS ||--o{ TAGS : has
    LEADS ||--o{ WHATSAPP_SESSIONS : connects
    WHATSAPP_SESSIONS ||--o{ MESSAGES : contains
    INTERACTIONS ||--o{ AI_ANALYSIS : generates
    
    USERS {
        uuid id PK
        string email
        string password_hash
        string name
        string role
        json permissions
        timestamp created_at
        timestamp updated_at
    }
    
    TEAMS {
        uuid id PK
        string name
        string description
        json settings
        timestamp created_at
        timestamp updated_at
    }
    
    LEADS {
        uuid id PK
        uuid team_id FK
        uuid assigned_user_id FK
        string name
        string phone
        string email
        string status
        integer score
        json metadata
        timestamp last_interaction
        timestamp created_at
        timestamp updated_at
    }
    
    INTERACTIONS {
        uuid id PK
        uuid lead_id FK
        uuid user_id FK
        string type
        text content
        string channel
        timestamp created_at
    }
    
    WHATSAPP_SESSIONS {
        uuid id PK
        uuid lead_id FK
        string session_id
        string status
        json settings
        timestamp last_message
        timestamp created_at
    }
    
    MESSAGES {
        uuid id PK
        uuid session_id FK
        string direction
        text content
        string message_type
        json metadata
        timestamp created_at
    }
    
    AI_ANALYSIS {
        uuid id PK
        uuid interaction_id FK
        integer sentiment_score
        json extracted_data
        integer lead_score
        string classification
        timestamp created_at
    }
```

## 4. Decisões Arquiteturais

### 4.1 Escolha do Stack Tecnológico

| Componente | Tecnologia | Justificativa |
|------------|------------|---------------|
| Frontend | Next.js + React | SSR, performance, SEO, ecosystem maduro |
| UI Library | shadcn/ui | Customização total, componentes modernos |
| Backend | Node.js + Express | JavaScript full-stack, performance para I/O |
| Banco de Dados | PostgreSQL | ACID, JSON support, escalabilidade |
| Cache | Redis | Performance, sessões, pub/sub |
| Deploy | Vercel | Otimizado para Next.js, CI/CD automático |

### 4.2 Padrões Arquiteturais

#### 4.2.1 Arquitetura em Camadas
- **Presentation Layer:** React components
- **Business Logic Layer:** API services
- **Data Access Layer:** Database repositories
- **Infrastructure Layer:** External APIs e serviços

#### 4.2.2 Event-Driven Architecture
```mermaid
graph LR
    A[WhatsApp Message] --> B[Message Event]
    B --> C[AI Processing Event]
    C --> D[Lead Update Event]
    D --> E[Notification Event]
    E --> F[UI Update]
```

### 4.3 Segurança

#### 4.3.1 Autenticação e Autorização
- JWT com refresh tokens
- Role-based access control (RBAC)
- Rate limiting por usuário
- Validação de entrada em todas as APIs

#### 4.3.2 Proteção de Dados (LGPD)
- Criptografia de dados sensíveis
- Logs de auditoria
- Política de retenção de dados
- Consentimento explícito para processamento

### 4.4 Escalabilidade

#### 4.4.1 Estratégias de Cache
```mermaid
graph TB
    A[Client Request] --> B{Cache Hit?}
    B -->|Yes| C[Return Cached Data]
    B -->|No| D[Query Database]
    D --> E[Store in Cache]
    E --> F[Return Data]
```

#### 4.4.2 Otimizações de Performance
- Connection pooling no PostgreSQL
- Lazy loading de componentes
- Compressão gzip/brotli
- CDN para assets estáticos

## 5. Integração com Serviços Externos

### 5.1 Evolution API (WhatsApp)
```mermaid
sequenceDiagram
    participant App as CRM App
    participant Evo as Evolution API
    participant WA as WhatsApp
    
    App->>Evo: Send Message Request
    Evo->>WA: Forward Message
    WA-->>Evo: Message Delivered
    Evo-->>App: Webhook Notification
    
    WA->>Evo: Incoming Message
    Evo->>App: Webhook with Message
    App->>App: Process with AI
    App->>Evo: Send Auto-Response
```

### 5.2 Integração com IA
**Providers Suportados:**
- OpenAI GPT-4/GPT-3.5
- Google Gemini
- Anthropic Claude

**Funcionalidades:**
- Análise de sentimento
- Extração de entidades
- Classificação de leads
- Geração de respostas automáticas

### 5.3 N8N Integration
- Webhook endpoints para automação
- Triggers baseados em eventos
- Workflows customizáveis
- Monitoramento de execução

## 6. Monitoramento e Observabilidade

### 6.1 Logging
```javascript
// Estrutura de logs padronizada
{
  timestamp: "2024-01-01T00:00:00.000Z",
  level: "info|warn|error",
  service: "lead-management",
  userId: "uuid",
  action: "create_lead",
  metadata: {
    leadId: "uuid",
    source: "whatsapp"
  }
}
```

### 6.2 Métricas de Sistema
- Tempo de resposta das APIs
- Taxa de erro por endpoint
- Número de leads processados
- Performance da IA
- Uso de recursos

### 6.3 Health Checks
```mermaid
graph TB
    A[Load Balancer] --> B[Health Check Endpoint]
    B --> C{Database OK?}
    B --> D{Redis OK?}
    B --> E{External APIs OK?}
    C -->|Yes| F[200 OK]
    C -->|No| G[503 Service Unavailable]
    D -->|Yes| F
    D -->|No| G
    E -->|Yes| F
    E -->|No| G
```

## 7. Estratégia de Deploy e CI/CD

### 7.1 Pipeline de Deploy
```mermaid
graph LR
    A[Git Push] --> B[GitHub Actions]
    B --> C[Build & Tests]
    C --> D{Tests Pass?}
    D -->|Yes| E[Deploy to Staging]
    D -->|No| F[Notify Developer]
    E --> G[Integration Tests]
    G --> H{Tests Pass?}
    H -->|Yes| I[Deploy to Production]
    H -->|No| F
```

### 7.2 Ambientes
- **Development:** Local development
- **Staging:** Vercel Preview Deployment
- **Production:** Vercel Production

### 7.3 Database Migrations
- Versionamento com Prisma/Drizzle
- Rollback automático em caso de erro
- Backup antes de migrações críticas

## 8. Considerações de Compliance

### 8.1 LGPD
- **Consentimento:** Opt-in explícito para processamento
- **Minimização:** Coleta apenas dados necessários
- **Transparência:** Política de privacidade clara
- **Portabilidade:** Export de dados do usuário
- **Esquecimento:** Exclusão completa de dados

### 8.2 Auditoria
```mermaid
graph TB
    A[User Action] --> B[Audit Log]
    B --> C[Encrypted Storage]
    C --> D[Retention Policy]
    D --> E[Automatic Cleanup]
```

## 9. Roadmap de Evolução

### 9.1 Fases de Desenvolvimento
1. **MVP (60 dias):** Core CRM + WhatsApp + IA básica
2. **V1.1:** Integrações avançadas + Analytics
3. **V1.2:** Mobile app + API pública
4. **V2.0:** Multi-tenant + Advanced AI

### 9.2 Tecnologias Futuras
- GraphQL para APIs mais eficientes
- WebRTC para chamadas de voz
- Machine Learning on-premise
- Blockchain para auditoria imutável

---

**Documento criado em:** 2026-03-18  
**Versão:** 1.0  
**Próxima revisão:** 2026-04-18

---
*Tipo: architecture*
*Gerado pelo ForgeAI em 18/03/2026*
