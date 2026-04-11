-- Schema do Banco de Dados - Gestão de lead com IA
-- Gerado pelo ForgeAI em 18/03/2026

-- Tabela de usuários
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índice para email
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Tabela de sessões
CREATE TABLE IF NOT EXISTS sessions (
  sid VARCHAR(255) PRIMARY KEY,
  sess JSONB NOT NULL,
  expire TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_expire ON sessions(expire);

-- ============================================
-- ADICIONE SUAS TABELAS ESPECÍFICAS ABAIXO
-- ============================================

-- Exemplo baseado nas etapas do projeto:
-- CREATE TABLE planejamento (...);
-- CREATE TABLE design (...);
-- CREATE TABLE desenvolvimento (...);
-- CREATE TABLE testes (...);
-- CREATE TABLE deploy (...);

-- ============================================
-- INSTRUÇÕES
-- ============================================
-- 1. Revise e adapte este schema para suas necessidades
-- 2. Execute com: psql $DATABASE_URL < schema.sql
-- 3. Para Supabase: psql $SUPABASE_DATABASE_URL < schema.sql

-- Gerado pelo ForgeAI
