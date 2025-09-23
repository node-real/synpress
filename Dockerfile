# syntax=docker/dockerfile:1
FROM --platform=linux/amd64 synthetixio/docker-e2e:18.16-ubuntu as base

RUN mkdir /app
WORKDIR /app

RUN apt update && apt install -y nginx

COPY nginx.conf /etc/nginx/sites-available/default

COPY package.json ./
COPY pnpm-lock.yaml ./

FROM base as test

RUN pnpm install --frozen-lockfile --prefer-offline

# Install Chrome for Testing dependencies
RUN apt-get update && apt-get install -y \
    wget \
    unzip \
    && rm -rf /var/lib/apt/lists/*

COPY . .

# Setup Chrome for Testing
RUN echo "🔧 Setting up Chrome for Testing in Docker..." && \
    pnpm run chrome:download && \
    echo "✅ Chrome for Testing setup complete"
