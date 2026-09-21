FROM node:20-alpine

WORKDIR /app

# Copy dependency definitions and prisma schema
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies and generate Prisma Client
RUN npm install
RUN npx prisma generate

# Copy source code and configuration
COPY tsconfig.json ./
COPY src ./src

# Build TypeScript application
RUN npm run build

# Expose backend port
EXPOSE 5000

# Start production server
CMD ["npm", "run", "start"]
