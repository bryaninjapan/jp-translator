# JP Legal Translator

A professional full-stack web application for high-precision Japanese to Simplified Chinese translation, specializing in legal and official documents.

## Features

- 🌐 **Full-Text Translation**: Complete document translation with natural flow
- 📚 **Professional Interpretation**: Deep analysis of legal terms and nuances
- 🤖 **Multi-Model Support**: Gemini 3.0 Pro, 2.5 Pro, 2.0 Flash, and GPT-4
- 💾 **Local Storage**: API keys saved securely in browser
- 📄 **Export to DOCX**: Download translations as Word documents

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes (or Client-side API for static deployment)
- **AI Models**: Google Gemini API, OpenAI GPT-4

## Getting Started

### Local Development

1. Clone the repository:
```bash
git clone https://github.com/bryaninjapan/jp-translator.git
cd jp-translator
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### GitHub Pages Deployment

The project is configured to automatically deploy to GitHub Pages using GitHub Actions.

1. **Enable GitHub Pages**:
   - Go to your repository Settings → Pages
   - Source: Select "GitHub Actions"

2. **Repository Name**:
   - If your repository is named `jp-translator`, the site will be available at:
     `https://bryaninjapan.github.io/jp-translator/`
   - If you want to deploy to the root domain, update `NEXT_PUBLIC_BASE_PATH` in `.github/workflows/deploy.yml`

3. **Push to main branch**:
   - The GitHub Action will automatically build and deploy on every push to `main`

### Configuration

The app works in two modes:

- **Server Mode** (Development): Uses Next.js API Routes for secure server-side API calls
- **Client Mode** (GitHub Pages): Uses client-side API calls directly (requires user to input API key)

## Usage

1. Paste Japanese legal text in the input area
2. Select an AI model (Gemini 3.0 Pro recommended for best quality)
3. Enter your API Key (saved locally in browser)
4. Click "Translate Full Text"
5. Review the translation and professional interpretation
6. Export to DOCX if needed

## API Keys

- **Google Gemini**: Get your key from [Google AI Studio](https://aistudio.google.com/api-keys)
- **OpenAI**: Get your key from [OpenAI Platform](https://platform.openai.com/api-keys)

**Note**: API keys are stored locally in your browser and never sent to our servers.

## License

MIT

