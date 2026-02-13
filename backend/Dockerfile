FROM node:20-slim

WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install --no-audit --no-fund

COPY . .

RUN npm run prisma:generate

ENV PORT=3000
EXPOSE 3000

CMD ["npm", "run", "dev"]
