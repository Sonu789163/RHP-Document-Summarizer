# Smart DRHP Document Assistant (Frontend)

This is the frontend for the Smart RHP Document Assistant platform. It provides a modern, user-friendly interface for uploading, managing, summarizing, and chatting with your documents using AI.

## Features

- Secure authentication (email/password & Microsoft OAuth)
- Upload and manage PDF documents
- Generate and view AI-powered document summaries
- Chat with your documents to extract insights
- View chat and summary history
- Responsive, modern UI (React, Tailwind CSS, shadcn-ui)

## Main Pages & User Flows

- **Landing Page**: Introduction and call to action
- **Login/Register**: Secure authentication (email/password or Microsoft)
- **Dashboard**: Upload, view, rename, and delete documents
- **Document Chat**: Chat with your document and view summaries
- **Chat History**: Review past conversations
- **Settings**: Manage your account and preferences
- **404 Not Found**: Error page for invalid routes

## Tech Stack

- React + TypeScript
- Vite (build tool)
- Tailwind CSS, shadcn-ui (UI components)
- React Router (routing)
- Axios (API requests)
- @tanstack/react-query (data fetching/caching)

## Getting Started

### Prerequisites

- Node.js & npm installed

### Setup

1. Clone the repository:
   ```sh
   git clone <YOUR_GIT_URL>
   cd <YOUR_PROJECT_NAME>
   ```
2. Install dependencies:
   ```sh
   npm install
   ```
3. Start the development server:
   ```sh
   npm run dev
   ```
4. Open [https://rhp-document-summarizer.vercel.app/](https://rhp-document-summarizer.vercel.app/) in your browser.

### Build for Production

```sh
npm run build
```

### Preview Production Build

```sh
npm run preview
```

## Environment Variables

Create a `.env` file in the root with the following (adjust as needed):

```
VITE_API_URL=https://smart-rhtp-backend-2.onrender.com/api
```

## License

MIT
