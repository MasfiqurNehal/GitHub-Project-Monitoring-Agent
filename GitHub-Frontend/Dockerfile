FROM node:20-alpine

WORKDIR /app

# Copy package dependency definitions
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application source code
COPY tsconfig.json next.config.mjs tailwind.config.ts postcss.config.js ./
COPY src ./src

# Set build-time environment variables for Next.js public client variables
ARG NEXT_PUBLIC_API_BASE_URL=http://localhost:5001/api
ARG NEXT_PUBLIC_AI_SERVICE_URL=http://localhost:8000
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_AI_SERVICE_URL=$NEXT_PUBLIC_AI_SERVICE_URL

# Build Next.js application
RUN npm run build

# Expose Next.js port
EXPOSE 3000

ENV PORT=3000
ENV NODE_ENV=production

# Start Next.js production server
CMD ["npm", "run", "start"]
