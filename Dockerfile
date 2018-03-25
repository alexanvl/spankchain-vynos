FROM node:9.3.0 as builder

WORKDIR /home/node/app

ADD package.json .
ADD yarn.lock .

ADD xhr xhr
RUN yarn --production=false --frozen-lockfile --cache-folder /root/.yarn

ADD . .

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

RUN npm run build

FROM nginx:1.12-alpine

COPY --from=builder /home/node/app/dist/ /usr/share/nginx/html