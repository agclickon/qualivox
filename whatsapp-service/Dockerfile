FROM node:20-slim

WORKDIR /app

# Instalar dependências do sistema para o Baileys
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copiar package.json e instalar
COPY package*.json ./
RUN npm install

# Copiar código fonte
COPY . .

# Build
RUN npm run build

# Criar diretório de auth
RUN mkdir -p /app/auth

EXPOSE 3001

CMD ["npm", "start"]
