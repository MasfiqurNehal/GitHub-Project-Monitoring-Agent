FROM node:20-alpine

WORKDIR /app

# Copy dependency definitions and prisma schema
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies and generate Prisma Client
RUN npm install
RUN npx prisma generate || true

# Copy source code, database migrations, and config
COPY tsconfig.json ./
COPY src ./src
COPY database ./database
COPY config ./config

# Build TypeScript application
RUN npm run build

# Expose backend port
EXPOSE 5001

ENV PORT=5001

# Run migrations and start production server
CMD ["sh", "-c", "npm run migrate && npm run start"]
