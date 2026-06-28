FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY . .
RUN npx tsc

EXPOSE 3000
CMD ["node", "dist/app.js"]
