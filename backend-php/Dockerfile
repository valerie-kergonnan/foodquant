FROM php:8.2-cli

RUN docker-php-ext-install pdo_mysql

COPY . /app
WORKDIR /app

EXPOSE 8080

CMD php -S 0.0.0.0:${PORT:-8080} -t /app