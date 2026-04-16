# use the official Bun image
# see all versions at https://hub.docker.com/r/oven/bun/tags

ARG BUN_VERSION=1

FROM oven/bun:${BUN_VERSION} AS dev
ARG DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    build-essential \
    git \
    curl \
    vim \
    tmux \
    htop \
    eslint \
    && rm -rf /var/lib/apt/lists/*

ARG NODE_VERSION=--lts
# install nvm
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.4/install.sh | bash

# set env
ENV NVM_DIR=/root/.nvm

# install node
RUN bash -c "source $NVM_DIR/nvm.sh && nvm install $NODE_VERSION"

# set ENTRYPOINT for reloading nvm-environment
# ENTRYPOINT ["bash", "-c", "source $NVM_DIR/nvm.sh && exec \"$@\"", "--"]

RUN . $NVM_DIR/nvm.sh && npm install -g eslint

RUN echo 'source $NVM_DIR/nvm.sh' >> ~/.bashrc

CMD ["/bin/bash"]

FROM oven/bun:${BUN_VERSION} AS base
WORKDIR /usr/src/app

# install dependencies into temp directory
# this will cache them and speed up future builds
FROM base AS install
RUN mkdir -p /temp/dev
COPY package.json bun.lock /temp/dev/
RUN cd /temp/dev && bun install --frozen-lockfile

# install with --production (exclude devDependencies)
RUN mkdir -p /temp/prod
COPY package.json bun.lock /temp/prod/
RUN cd /temp/prod && bun install --frozen-lockfile --production

# copy node_modules from temp directory
# then copy all (non-ignored) project files into the image
FROM base AS prerelease
COPY --from=install /temp/dev/node_modules node_modules
COPY . .

# [optional] tests & build
ENV NODE_ENV=production
RUN bun test
# RUN bun run build

# copy production dependencies and source code into final image
FROM base AS release
COPY --from=install /temp/prod/node_modules node_modules
COPY --from=prerelease /usr/src/app/src ./src
COPY --from=prerelease /usr/src/app/package.json .

# run the app
USER bun
EXPOSE 3000/tcp
ENTRYPOINT [ "bun", "run", "src/index.ts" ]
