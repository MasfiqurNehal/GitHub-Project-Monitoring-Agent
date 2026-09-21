FROM node:20-alpine

WORKDIR /app

# Copy dependency files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code and config files
COPY tsconfig.json next.config.mjs tailwind.config.ts postcss.config.js ./
COPY src ./src

# Build Next.js application for production
ENV NODE_ENV=production
RUN npm run build

# Expose Next.js port
EXPOSE 3000

# Start Next.js server
CMD ["npm", "run", "start"]
