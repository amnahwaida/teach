FROM node:18-alpine

WORKDIR /app

# Install openssl for Prisma
RUN apk add --no-cache openssl

# Install dependencies
COPY package.json package-lock.json* ./
# Copy prisma schema so postinstall hook (prisma generate) works
COPY prisma ./prisma
RUN npm ci

# Copy all files
COPY . .

# Build Next.js app
RUN npm run build

EXPOSE 3000

# Push schema to database and start Next.js
CMD ["sh", "-c", "npx prisma db push && npm run start"]
