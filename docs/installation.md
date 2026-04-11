# Guia de Instalação

# Guia de Instalação - Gestão de Leads com IA

## 📋 Índice

- [Pré-requisitos](#pré-requisitos)
- [Configuração do Ambiente](#configuração-do-ambiente)
- [Instalação do Backend](#instalação-do-backend)
- [Instalação do Frontend](#instalação-do-frontend)
- [Configuração do Banco de Dados](#configuração-do-banco-de-dados)
- [Configuração de Integrações](#configuração-de-integrações)
- [Deploy na Vercel](#deploy-na-vercel)
- [Testes](#testes)
- [Troubleshooting](#troubleshooting)

## 🔧 Pré-requisitos

### Requisitos do Sistema

#### Software Necessário
- **Node.js**: versão 18.17.0 ou superior
- **npm**: versão 9.0.0 ou superior (ou yarn 1.22.0+)
- **PostgreSQL**: versão 14.0 ou superior
- **Git**: versão 2.34.0 ou superior

#### Contas e Serviços Externos
- Conta no [Vercel](https://vercel.com) para deploy
- Conta no [OpenAI](https://openai.com) para serviços de IA
- Instância do [Evolution API](https://doc.evolution-api.com) configurada
- Instância do [N8N](https://n8n.io) para automações
- WhatsApp Business configurado

#### Especificações Mínimas do Servidor
- **CPU**: 2 vCPUs
- **RAM**: 4GB
- **Armazenamento**: 20GB SSD
- **Largura de banda**: 1Gbps

### Verificação dos Pré-requisitos

```bash
# Verificar versão do Node.js
node --version
# Deve retornar v18.17.0 ou superior

# Verificar versão do npm
npm --version
# Deve retornar 9.0.0 ou superior

# Verificar versão do PostgreSQL
psql --version
# Deve retornar 14.0 ou superior

# Verificar versão do Git
git --version
# Deve retornar 2.34.0 ou superior
```

## ⚙️ Configuração do Ambiente

### 1. Clonagem do Repositório

```bash
# Clonar o repositório principal
git clone https://github.com/seu-usuario/crm-leads-ia.git
cd crm-leads-ia

# Verificar estrutura do projeto
ls -la
```

### 2. Configuração das Variáveis de Ambiente

#### Backend (.env)
```bash
# Copiar arquivo de exemplo
cd backend
cp .env.example .env

# Editar variáveis de ambiente
nano .env
```

```env
# Configurações do Servidor
PORT=3001
NODE_ENV=development

# Configurações do Banco de Dados
DATABASE_URL=postgresql://usuario:senha@localhost:5432/crm_leads_db
DB_HOST=localhost
DB_PORT=5432
DB_NAME=crm_leads_db
DB_USER=usuario
DB_PASSWORD=senha

# Configurações JWT
JWT_SECRET=sua_chave_secreta_super_segura_aqui
JWT_EXPIRES_IN=7d

# Configurações OpenAI
OPENAI_API_KEY=sk-sua_chave_openai_aqui
OPENAI_MODEL=gpt-4

# Configurações Evolution API
EVOLUTION_API_URL=https://sua-instancia-evolution.com
EVOLUTION_API_TOKEN=seu_token_evolution_aqui

# Configurações N8N
N8N_API_URL=https://sua-instancia-n8n.com
N8N_API_KEY=sua_chave_n8n_aqui

# Configurações de Email (Opcional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu-email@gmail.com
SMTP_PASS=sua_senha_app

# Configurações de Upload
MAX_FILE_SIZE=10485760
UPLOAD_DIR=./uploads

# Configurações CORS
CORS_ORIGIN=http://localhost:3000
```

#### Frontend (.env.local)
```bash
# Navegar para o frontend
cd ../frontend
cp .env.example .env.local

# Editar variáveis de ambiente
nano .env.local
```

```env
# URL da API
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Configurações de Upload
NEXT_PUBLIC_MAX_FILE_SIZE=10485760

# Configurações de Produção (para deploy)
NEXTAUTH_SECRET=sua_chave_nextauth_secreta
NEXTAUTH_URL=http://localhost:3000
```

## 🗄️ Configuração do Banco de Dados

### 1. Instalação do PostgreSQL

#### Ubuntu/Debian
```bash
# Atualizar repositórios
sudo apt update

# Instalar PostgreSQL
sudo apt install postgresql postgresql-contrib

# Iniciar serviço
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

#### macOS
```bash
# Usando Homebrew
brew install postgresql
brew services start postgresql
```

#### Windows
```bash
# Baixar e instalar do site oficial
# https://www.postgresql.org/download/windows/
```

### 2. Criação do Banco de Dados

```bash
# Conectar como superusuário
sudo -u postgres psql

# Executar comandos SQL
CREATE DATABASE crm_leads_db;
CREATE USER usuario WITH ENCRYPTED PASSWORD 'senha';
GRANT ALL PRIVILEGES ON DATABASE crm_leads_db TO usuario;
ALTER USER usuario CREATEDB;
\q
```

### 3. Teste de Conexão

```bash
# Testar conexão
psql -h localhost -U usuario -d crm_leads_db
```

## 🚀 Instalação do Backend

### 1. Instalação das Dependências

```bash
# Navegar para o diretório do backend
cd backend

# Instalar dependências
npm install

# Verificar se todas as dependências foram instaladas
npm list
```

### 2. Executar Migrações do Banco de Dados

```bash
# Gerar cliente Prisma
npx prisma generate

# Executar migrações
npx prisma migrate dev --name init

# Verificar status das migrações
npx prisma migrate status
```

### 3. Seed do Banco de Dados (Opcional)

```bash
# Executar seed com dados iniciais
npx prisma db seed

# Verificar dados inseridos
npx prisma studio
```

### 4. Inicialização do Servidor Backend

```bash
# Modo desenvolvimento
npm run dev

# Verificar se o servidor está rodando
curl http://localhost:3001/api/health
```

### 5. Verificação das Rotas da API

```bash
# Testar endpoint de saúde
curl -X GET http://localhost:3001/api/health

# Testar endpoint de autenticação
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Teste","email":"teste@teste.com","password":"123456"}'
```

## 🎨 Instalação do Frontend

### 1. Instalação das Dependências

```bash
# Navegar para o diretório do frontend
cd frontend

# Instalar dependências
npm install

# Verificar se shadcn/ui foi instalado corretamente
npx shadcn-ui@latest add button
```

### 2. Configuração do shadcn/ui

```bash
# Inicializar shadcn/ui (se não foi feito)
npx shadcn-ui@latest init

# Instalar componentes essenciais
npx shadcn-ui@latest add button card dialog form input label select table toast
```

### 3. Verificação da Configuração

```bash
# Verificar estrutura de componentes
ls -la src/components/ui/

# Verificar configuração do Tailwind
cat tailwind.config.js
```

### 4. Inicialização do Servidor Frontend

```bash
# Modo desenvolvimento
npm run dev

# Verificar se está acessível
curl http://localhost:3000
```

## 🔌 Configuração de Integrações

### 1. Evolution API

#### Verificação da Instância
```bash
# Testar conectividade
curl -X GET "https://sua-instancia-evolution.com/instance/list" \
  -H "Authorization: Bearer seu_token_aqui"
```

#### Configuração no Backend
```javascript
// backend/src/services/evolutionApi.js
const EVOLUTION_CONFIG = {
  baseURL: process.env.EVOLUTION_API_URL,
  token: process.env.EVOLUTION_API_TOKEN,
  instance: 'sua_instancia',
  webhook: `${process.env.APP_URL}/api/webhooks/whatsapp`
};
```

### 2. OpenAI API

#### Teste de Conectividade
```bash
# Testar API Key
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer sua_chave_aqui"
```

#### Configuração no Backend
```javascript
// backend/src/services/openai.js
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: 'sua_organizacao' // opcional
});
```

### 3. N8N Integration

#### Verificação da Instância
```bash
# Testar conectividade N8N
curl -X GET "https://sua-instancia-n8n.com/api/v1/workflows" \
  -H "X-N8N-API-KEY: sua_chave_aqui"
```

#### Configuração de Webhook
```javascript
// Configurar webhook no N8N
const webhookConfig = {
  url: `${process.env.APP_URL}/api/webhooks/n8n`,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.N8N_API_KEY}`
  }
};
```

## ☁️ Deploy na Vercel

### 1. Preparação para Deploy

#### Configuração do vercel.json
```json
{
  "version": 2,
  "builds": [
    {
      "src": "frontend/package.json",
      "use": "@vercel/next"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api/$1"
    },
    {
      "src": "/(.*)",
      "dest": "/frontend/$1"
    }
  ],
  "env": {
    "DATABASE_URL": "@database_url",
    "JWT_SECRET": "@jwt_secret",
    "OPENAI_API_KEY": "@openai_api_key"
  }
}
```

### 2. Configuração das Variáveis de Ambiente na Vercel

```bash
# Instalar Vercel CLI
npm i -g vercel

# Login na Vercel
vercel login

# Configurar projeto
vercel

# Adicionar variáveis de ambiente
vercel env add DATABASE_URL
vercel env add JWT_SECRET
vercel env add OPENAI_API_KEY
vercel env add EVOLUTION_API_URL
vercel env add EVOLUTION_API_TOKEN
```

### 3. Deploy

```bash
# Deploy para preview
vercel

# Deploy para produção
vercel --prod

# Verificar status do deploy
vercel ls
```

### 4. Configuração de Domínio Personalizado

```bash
# Adicionar domínio
vercel domains add seudominio.com

# Verificar DNS
vercel domains verify seudominio.com
```

## 🧪 Testes

### 1. Testes Backend

```bash
cd backend

# Executar todos os testes
npm test

# Executar testes com coverage
npm run test:coverage

# Executar testes específicos
npm test -- --testNamePattern="Auth"
```

### 2. Testes Frontend

```bash
cd frontend

# Executar testes unitários
npm test

# Executar testes E2E
npm run test:e2e

# Executar testes com watch mode
npm run test:watch
```

### 3. Testes de Integração

#### Teste da API
```bash
# Executar collection do Postman
newman run tests/api-collection.json -e tests/environment.json
```

#### Teste WhatsApp
```bash
# Enviar mensagem de teste
curl -X POST "http://localhost:3001/api/whatsapp/send" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer seu_token" \
  -d '{"number":"5511999999999","message":"Teste de integração"}'
```

### 4. Testes de Performance

```bash
# Instalar artillery
npm install -g artillery

# Executar teste de carga
artillery run tests/load-test.yml
```

## 🔧 Troubleshooting

### Problemas Comuns de Instalação

#### 1. Erro de Conexão com PostgreSQL

**Sintoma:**
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Soluções:**
```bash
# Verificar se PostgreSQL está rodando
sudo systemctl status postgresql

# Iniciar PostgreSQL se necessário
sudo systemctl start postgresql

# Verificar configurações de conexão
sudo nano /etc/postgresql/14/main/postgresql.conf

# Verificar pg_hba.conf
sudo nano /etc/postgresql/14/main/pg_hba.conf
```

#### 2. Erro de Migração Prisma

**Sintoma:**
```
Error: P1001: Can't reach database server
```

**Soluções:**
```bash
# Regenerar cliente Prisma
npx prisma generate

# Reset do banco de dados
npx prisma migrate reset

# Aplicar migrações novamente
npx prisma migrate dev
```

#### 3. Erro de Dependências do Node.js

**Sintoma:**
```
Module not found: Can't resolve 'some-module'
```

**Soluções:**
```bash
# Limpar cache do npm
npm cache clean --force

# Deletar node_modules e reinstalar
rm -rf node_modules package-lock.json
npm install

# Verificar versão do Node.js
nvm use 18.17.0
```

### Problemas de Integração

#### 1. Falha na Evolution API

**Sintoma:**
```
Error: Request failed with status code 401
```

**Soluções:**
```bash
# Verificar token
curl -X GET "https://sua-instancia-evolution.com/instance/list" \
  -H "Authorization: Bearer seu_token"

# Verificar status da instância
curl -X GET "https://sua-instancia-evolution.com/instance/status/sua_instancia" \
  -H "Authorization: Bearer seu_token"

# Regenerar token se necessário
```

#### 2. Problema com OpenAI API

**Sintoma:**
```
Error: You exceeded your current quota
```

**Soluções:**
```bash
# Verificar limite de uso
curl https://api.openai.com/v1/usage \
  -H "Authorization: Bearer sua_chave"

# Verificar billing
# Acessar: https://platform.openai.com/account/billing
```

### Problemas de Deploy

#### 1. Erro de Build na Vercel

**Sintoma:**
```
Error: Build failed with exit code 1
```

**Soluções:**
```bash
# Verificar logs de build
vercel logs

# Build local para debug
npm run build

# Verificar variáveis de ambiente
vercel env

---
*Tipo: installation*
*Gerado pelo ForgeAI em 18/03/2026*
