FROM node:9.3.0 as builder

WORKDIR /home/node/app

ADD package.json .
ADD yarn.lock .

RUN yarn --production=false --frozen-lockfile --cache-folder /root/.yarn

ADD . .

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

ARG FRAME_URL
ENV FRAME_URL=${FRAME_URL}

ARG API_URL
ENV API_URL=${API_URL}

ARG NETWORK_NAME=ropsten
ENV NETWORK_NAME=${NETWORK_NAME}

RUN rm -rf ./dist && yarn build

FROM nginx:1.12-alpine

COPY --from=builder /home/node/app/dist/ /usr/share/nginx/html
