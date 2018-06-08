# Note: intended to be run with:
#  $ cd vynos
#  $ docker build -f infrastructure/Dockerfile .
FROM node:9.3.0

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

ARG HUB_URL
ENV HUB_URL=${HUB_URL}

ARG NETWORK_NAME=ropsten
ENV NETWORK_NAME=${NETWORK_NAME}

RUN rm -rf ./dist && yarn build