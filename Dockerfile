
FROM php:8.2-apache

WORKDIR /var/www/html

RUN apt-get update && apt-get install -y \
    git \
    unzip \
    curl \
    libpq-dev \
    libzip-dev \
    libpng-dev \
    libonig-dev \
    libxml2-dev \
    && docker-php-ext-install \
        pdo \
        pdo_pgsql \
        mbstring \
        bcmath \
        exif \
        pcntl \
        zip \
        xml \
    && a2enmod rewrite headers \
    && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get update \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

COPY . .

RUN composer install \
    --no-dev \
    --optimize-autoloader \
    --no-interaction \
    --prefer-dist

RUN npm install

RUN npm run build

RUN chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache \
    && chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache

RUN printf '%s\n' \
    '<VirtualHost *:80>' \
    '    DocumentRoot /var/www/html/public' \
    '    <Directory /var/www/html/public>' \
    '        AllowOverride All' \
    '        Require all granted' \
    '    </Directory>' \
    '    Header always set Access-Control-Allow-Origin "https://nexra-workspace.vercel.app"' \
    '    Header always set Access-Control-Allow-Methods "GET, POST, PUT, PATCH, DELETE, OPTIONS"' \
    '    Header always set Access-Control-Allow-Headers "Accept, Authorization, Content-Type, Origin, X-Requested-With, X-XSRF-TOKEN"' \
    '    Header always set Access-Control-Max-Age "86400"' \
    '    Header always merge Vary "Origin"' \
    '    ErrorLog ${APACHE_LOG_DIR}/error.log' \
    '    CustomLog ${APACHE_LOG_DIR}/access.log combined' \
    '</VirtualHost>' \
    > /etc/apache2/sites-available/000-default.conf

RUN printf '%s\n' \
    '#!/bin/sh' \
    'php artisan config:clear' \
    'php artisan migrate --force' \
    'php artisan storage:link' \
    'exec apache2-foreground' \
    > /usr/local/bin/start-laravel.sh \
    && chmod +x /usr/local/bin/start-laravel.sh

EXPOSE 80

CMD ["/usr/local/bin/start-laravel.sh"]
