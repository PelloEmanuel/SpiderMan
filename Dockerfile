FROM php:8.3-apache

# Driver de PostgreSQL para PDO
RUN apt-get update \
    && apt-get install -y --no-install-recommends libpq-dev \
    && docker-php-ext-install pdo_pgsql \
    && rm -rf /var/lib/apt/lists/*

# Copia el juego (index.html, style.css, src/, assets/, scores.php...)
COPY . /var/www/html/

# Render asigna el puerto en la variable PORT: Apache debe escuchar ahí
CMD ["sh", "-c", "sed -i \"s/Listen 80/Listen ${PORT:-80}/\" /etc/apache2/ports.conf && sed -i \"s/<VirtualHost \\*:80>/<VirtualHost *:${PORT:-80}>/\" /etc/apache2/sites-available/000-default.conf && apache2-foreground"]
