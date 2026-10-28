FROM node:22.23.4-alpine3.24@sha256:fe4f6d74e20370acb04ad889077d14d0f64a9c8ea6a42bc60cddf1e844699914
WORKDIR /app
COPY package.json ./
COPY src ./src
COPY public ./public
USER node
ENV PORT=4130
EXPOSE 4130
CMD ["node", "src/server.js"]
