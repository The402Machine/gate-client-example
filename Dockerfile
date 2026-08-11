FROM node:22-alpine
WORKDIR /app
COPY package.json ./
COPY src ./src
COPY public ./public
USER node
ENV PORT=4130
EXPOSE 4130
CMD ["node", "src/server.js"]
