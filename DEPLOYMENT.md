# Deployment Notes

This project is still best treated as a local/demo app, but it now has a repeatable Docker path for testing both services together.

## Local Docker Run

1. Copy the example environment file:

```bash
cp .env.example .env
```

2. Keep Ollama running on your machine and make sure the local models are installed:

```bash
ollama pull llama3.2:1b
ollama pull qwen2.5:1.5b
```

3. Start the app:

```bash
docker compose up --build
```

Frontend: `http://localhost:3000`

Backend API: `http://127.0.0.1:8000/api`

## Ollama From Docker

The compose file points Django to:

```env
OLLAMA_URL=http://host.docker.internal:11434/api/generate
```

That lets the backend container call the Ollama process running on your host machine. If you deploy to a Linux server, either run Ollama on the same host and keep the `extra_hosts` line, or change `OLLAMA_URL` to the server/container address where Ollama is reachable.

## Production Checklist

- Start from `.env.production.example` and replace every placeholder.
- Set `DJANGO_DEBUG=false`.
- Replace `DJANGO_SECRET_KEY` with a real secret.
- Set `DJANGO_ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`, and `CSRF_TRUSTED_ORIGINS` to your real domains.
- Use a production database instead of SQLite when users matter.
- Serve the React build through a static host or a web server instead of the dev server.
- Add real email verification before treating account security as production-grade.
- Put media uploads on durable storage if attachments need to survive deploys.
- Keep `/api/health/` reachable for uptime checks.

## Useful Commands

```bash
npm run build
cd Email_template_builder
python manage.py migrate
python manage.py test templates_api
python manage.py runserver
```
