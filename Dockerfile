FROM alpine:latest

WORKDIR /

COPY assets /src/assets
COPY content /src/content
COPY data /src/data
COPY layouts /src/layouts
COPY config.toml /src/config.toml

ARG HUGO_VERSION=0.94.1
ARG HUGO_BASEURL
ARG HUGO_PARAMS_baseDomain

RUN apk add --no-cache --virtual .build-deps \
    curl \
    git \
    openssh-client \
    rsync && \

    mkdir /hugo && \
    curl -L https://github.com/gohugoio/hugo/releases/download/v${HUGO_VERSION}/hugo_${HUGO_VERSION}_Linux-64bit.tar.gz | tar -xz -C /hugo && \

    cd src && \
    /hugo/hugo && \
    cd / && \

    mv /src/public /html && \

    apk del .build-deps && \
    rm -rf /src /hugo
