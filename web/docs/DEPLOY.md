# Деплой и сервер

## Прод

- VPS: `ssh root@155.212.216.117` (Ubuntu, nginx 1.24)
- Домен: https://lab-career.ru, HTTP/2, gzip
- Рабочая копия: `/var/www/hr_platform` (деплой идёт отсюда)
- `/root/hr_platform` - СТАРАЯ копия (май 2026), не трогать/удалить
- Процесс: pm2, имя `lab-career`, запускает `npm start` в `/var/www/hr_platform/web`
- nginx-конфиг: `/etc/nginx/sites-enabled/lab-career` (прокси на Next.js)
- Секреты: `/var/www/hr_platform/web/.env.local` (в git не попадает)

## Как задеплоить

```bash
# локально: закоммитить и запушить в main
git push origin main

# на сервере
ssh root@155.212.216.117 'bash /root/deploy.sh'
```

`deploy.sh` делает: `git pull` -> `npm ci` -> `npm run build` -> `pm2 restart lab-career`.

## Локальная разработка

```bash
cd web
npm install
npm run dev        # нужен .env.local с переменными из DATABASE.md
```

## Диагностика на сервере

```bash
pm2 status && pm2 logs lab-career --lines 50
nginx -t && systemctl reload nginx
```

## Известные особенности

- Кеш Next.js агрессивный (`s-maxage=31536000` на prerender-страницах),
  после деплоя билд инвалидирует кеш сам
- www -> без-www редирект делает middleware приложения (308), не nginx
