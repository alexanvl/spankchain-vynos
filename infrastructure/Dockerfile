# Note: intended to be run with:
#  $ cd vynos
#  $ docker build -f infrastructure/Dockerfile .
FROM node:9.3.0

WORKDIR /home/node/app

ADD package.json .
ADD yarn.lock .
ADD infrastructure/yarn-install-with-retry .

RUN ./yarn-install-with-retry

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

ARG INGRID_ADDRESS=0xbb1699d16368ebc13bdc29e6a1aad50a21be45eb
ENV INGRID_ADDRESS=${INGRID_ADDRESS}

ARG CONTRACT_ADDRESS=0x0010822efcbbea5ceabf1b180bc9c73c6dfffbb0
ENV CONTRACT_ADDRESS=${CONTRACT_ADDRESS}

RUN rm -rf ./dist && yarn build
