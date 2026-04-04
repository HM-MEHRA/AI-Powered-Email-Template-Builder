# AI Powered Email Template Builder

An AI-powered email template builder with a React frontend and Django backend. It generates multiple email variations from a subject, purpose, tone, and optional file context, then lets you edit, reopen, and export the results.

## Features

- Generate 1 to 4 email variations from a single prompt
- Choose different tones such as professional, formal, friendly, or persuasive
- Upload optional file context to guide the generated email
- Edit the selected draft before sending or exporting
- Open drafts directly in Gmail or your default mail client
- Download an HTML preview of the generated email
- Save and reopen past generations from history

## Tech Stack

- React
- Tailwind CSS
- Framer Motion
- Axios
- Django
- SQLite
- Ollama or OpenAI-compatible AI configuration

## Project Structure

```text
Email_template_builder/
|-- src/                          # React frontend
|-- public/
|-- Email_template_builder/       # Django backend project
|   |-- email_builder/
|   |-- templates_api/
|   `-- manage.py
|-- .env.example
|-- package.json
`-- README.md
```

## Setup

### 1. Frontend

```bash
npm install
npm start
```

The frontend runs on `http://localhost:3000`.

### 2. Backend

From the Django project folder:

```bash
cd Email_template_builder
python manage.py runserver
```

The API runs on `http://127.0.0.1:8000`.

## Environment Variables

Create a `.env` file in the project root based on `.env.example`.

Example:

```env
WATCHPACK_POLLING=true
CHOKIDAR_USEPOLLING=true
USE_OLLAMA_ONLY=true
OLLAMA_MODEL=llama3.2
OLLAMA_URL=http://127.0.0.1:11434/api/generate
```

If you want to use OpenAI instead of Ollama, set:

```env
USE_OLLAMA_ONLY=false
OPENAI_API_KEY=your_api_key_here
OPENAI_MODEL=gpt-4o-mini
```

## API Endpoints

- `POST /api/generateEmail/`
- `GET /api/history/`
- `POST /api/saveGeneratedHistory/`
- `POST /api/uploadImage/`
- `POST /api/uploadEmailConfig/`
- `POST /api/renderAndDownloadTemplate/`
- `GET /api/getEmailLayout/`

## Usage

1. Enter an email subject and purpose.
2. Pick a tone and number of variations.
3. Optionally upload a file for extra context.
4. Generate the drafts.
5. Edit the selected variation.
6. Copy, export, or open it in Gmail or Outlook.

## Notes

- The frontend currently calls the backend at `http://127.0.0.1:8000/api`.
- Email history is stored locally in SQLite.
- `.env` is ignored from Git tracking. Use `.env.example` for shared setup.

## License

This project is licensed under the MIT License.
