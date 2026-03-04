FROM dunglas/frankenphp:latest

RUN install-php-extensions pdo_mysql curl

WORKDIR /app/public

COPY . .

CMD ["frankenphp", "php-server", "--listen", ":${PORT:-8080}"]