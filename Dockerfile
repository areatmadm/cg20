#1단계: 빌드
FROM node:20-alpine AS builder

WORKDIR /cg20

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build


#2단계: 실행
FROM node:20-alpine AS runner

WORKDIR /cg20

COPY --from=builder /cg20/dist ./dist
COPY --from=builder /cg20/node_modules ./node_modules
COPY --from=builder /cg20/package.json ./package.json

EXPOSE 3000
CMD ["npm", "run", "preview"]