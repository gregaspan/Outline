# Outline

**Outline** helps Slovenian-speaking students streamline thesis writing by automatically validating document structure, analyzing content, and providing AI-driven feedback.

## 🔗 Quick Links

[![Frontend](https://img.shields.io/badge/Frontend-Visit-blue)](https://hioutline.vercel.app/)
[![API](https://img.shields.io/badge/API-Endpoint-green)](https://outline-api.onrender.com/)
[![Docs](https://img.shields.io/badge/Documentation-Read-orange)](https://outline-1.gitbook.io/outline)
[![API Docs](https://img.shields.io/badge/API-Documentation-yellow)](https://outline-api.onrender.com/docs)
[![Slides](https://img.shields.io/badge/Presentation-View-red)](https://docs.google.com/presentation/d/11TM090TTfFLzfuxOkDBz5fUKdauTpoYypmjBFcOKiiE/edit?usp=sharing)
[![Walkthrough](https://img.shields.io/badge/Walkthrough-Watch-purple)](https://www.loom.com/share/009831feafe14009ae718fbc9fb5678a)

## 📂 Repository Structure

```
outline/
├── README.md
├── .env.example          # Environment variables template
├── next.config.js        # Next.js configuration
├── package.json          # Project dependencies
├── app/                  # Next.js App Router
├── components/           # Reusable React components
├── libs/                 # Helper utilities
├── public/              # Static assets
└── service/             # FastAPI microservice
    ├── main.py
    ├── requirements.txt
    └── tests/           # pytest tests
```

## 🚀 Getting Started

### Prerequisites
- Node.js 16+
- Python 3.8+
- Git

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/gregaspan/outline.git
cd outline
```

2. **Set up environment variables**
```bash
cp .env.example .env.local
```

Required environment variables:
```env
NEXT_PUBLIC_SUPABASE_URL=<YOUR_SUPABASE_URL>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<YOUR_SUPABASE_ANON_KEY>
SUPABASE_SERVICE_ROLE_KEY=<YOUR_SERVICE_ROLE_KEY>
GEMINI_API_KEY=<YOUR_GEMINI_API_KEY>
NEXT_PUBLIC_GEMINI_API_KEY=<YOUR_PUBLIC_GEMINI_API_KEY>
ELEVENLABS_API_KEY=<YOUR_ELEVENLABS_API_KEY>
NEXT_PUBLIC_ELEVENLABS_VOICE_ID=<YOUR_VOICE_ID>
WINSTON_AI_API_KEY=<YOUR_WINSTON_AI_API_KEY>
```

3. **Install dependencies**
```bash
# Frontend dependencies
npm install

# Backend dependencies
cd service
pip install -r requirements.txt
cd ..
```

4. **Run development servers**
```bash
# Start Next.js frontend (http://localhost:3000)
npm run dev

# Start FastAPI backend (http://localhost:8000)
cd service
uvicorn main:app --reload
```

## ☁️ Deployment

### Frontend (Vercel)
1. Login to Vercel:
```bash
vercel login
vercel --prod
```

2. Configure environment variables in Vercel dashboard:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_GEMINI_API_KEY`
- `NEXT_PUBLIC_ELEVENLABS_VOICE_ID`
- `NEXT_PUBLIC_WINSTON_AI_API_KEY`

### Backend (Render)
1. Push `service/` directory to GitHub
2. Configure on Render:
   - Build command: `pip install -r requirements.txt`
   - Start command: `uvicorn main:app --host 0.0.0.0 --port 8000`
3. Set required environment variables

### Supabase Setup
1. Configure Auth Redirect URL:
   - Dashboard → Auth → Settings → Redirect URLs
   - Add: `https://<your-vercel-domain>/api/auth/callback`
2. Set up storage bucket permissions
3. Configure RLS policies for documents and document_paragraphs

## 📚 Documentation

- [Architecture Overview](https://outline-1.gitbook.io/outline/design-and-architecture/architecture-overview)
- [Data Model (ER Diagram)](https://outline-1.gitbook.io/outline/design-and-architecture/data-model)
- [UML Diagrams](https://outline-1.gitbook.io/outline/design-and-architecture/uml-diagrams)
- [Testing Guidelines](https://outline-1.gitbook.io/outline/quality-and-testing/testing)
- [Code Quality](https://outline-1.gitbook.io/outline/quality-and-testing/code-quality)
- [Project Management](https://outline-1.gitbook.io/outline/project-management/project-management)

## 📝 License

This project is licensed under the MIT License.

