# ClassConnect: University Repository & Communication Platform

A comprehensive web application designed to combine all course materials of a university into a single platform, with integrated communication tools for students, lecturers, and student tutors.

## 🚀 Features

- **Multi-Role System**: Students, Lecturers, Student Tutors, and System Administrators
- **Unified Course Material Repository**: All course materials organized in one place
- **Real-time Communication**: Built-in messaging and notifications using Socket.io
- **Interactive Notes**: Visual note-taking with Excalidraw integration
- **Google Workspace Integration**: OAuth2 authentication with institutional G Suite accounts
- **Automated Scheduling**: Assignment reminders and study routines with BullMQ and Redis
- **AI-Powered Summaries**: Automatic summarization of lecture notes for exam preparation
- **External API Integration**: Google Drive, Gmail, Open Library Books API, Cloudinary

## 🛠️ Tech Stack

- **Frontend**: Next.js 16 with Turbopack, React, TypeScript
- **Styling**: TailwindCSS
- **Database**: MySQL
- **Authentication**: NextAuth.js with Google OAuth2
- **Real-time**: Socket.io
- **Task Queue**: BullMQ with Redis
- **External APIs**: Google Workspace, Gmail, Cloudinary, Open Library Books, Excalidraw

## 📋 Prerequisites

- Node.js 20.0 or higher
- MySQL 8.0 or higher
- Redis 7.0 or higher
- Google Cloud Platform account (for OAuth2 credentials)
- NPM, Yarn, or PNPM package manager

## 🔧 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/classconnect.git
   cd classconnect
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   Update the following variables in `.env.local`:
   ```env
   # Database
   DB_HOST=localhost
   DB_USER=your_db_user
   DB_PASSWORD=your_db_password
   DB_NAME=classconnect_db
   DB_PORT=3306

   # NextAuth
   NEXTAUTH_URL=http://localhost:1295
   NEXTAUTH_SECRET=your-secret-key-min-32-chars

   # Google OAuth
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   GOOGLE_DOMAIN=your-university.edu

   # Redis
   REDIS_URL=redis://localhost:6379
   ```

4. **Set up the database**
   ```bash
   # Create database
   mysql -u root -p -e "CREATE DATABASE classconnect_db;"
   
   # Run migrations
   mysql -u root -p classconnect_db < src/lib/db/migrations/001_initial_users.sql
   ```

5. **Run the development server**
   ```bash
   npm run dev -- -p 1295
   # or
   yarn dev -- -p 1295
   ```

6. **Open the application**
   Visit [http://localhost:1295](http://localhost:1295) in your browser.

## 📁 Project Structure

```
classconnect/
├── src/
│   ├── app/
│   │   ├── api/              # API routes
│   │   ├── auth/             # Authentication pages
│   │   ├── dashboard/        # Dashboard pages
│   │   ├── notes/            # Notes feature
│   │   └── layout.tsx        # Root layout
│   ├── components/           # Reusable components
│   ├── lib/
│   │   ├── auth/            # Authentication logic
│   │   ├── db/              # Database utilities
│   │   └── redis/           # Redis session store
│   ├── types/               # TypeScript type definitions
│   ├── middleware.ts        # Next.js middleware
│   └── config/              # Configuration files
├── public/                  # Static assets
├── .env.local              # Environment variables
├── next.config.mjs         # Next.js configuration
├── package.json            # Dependencies and scripts
└── tsconfig.json           # TypeScript configuration
```

## 🔑 Authentication Flow

1. **User signs in** using their institutional G Suite account
2. **Domain validation** ensures only university email addresses are accepted
3. **Role mapping** automatically assigns user role based on email pattern
4. **Session management** uses Redis for secure session storage
5. **Permissions system** provides granular access control for each role

### User Roles & Permissions

| Role | Permissions |
|------|-------------|
| **ADMIN** | Full system access, user management, course management |
| **LECTURER** | Create courses, manage materials, grade assignments |
| **STUDENT_TUTOR** | Assist students, manage course materials |
| **STUDENT** | View courses, submit assignments, access materials |

## 📱 API Endpoints

### Authentication
- `GET /api/auth/session` - Get current session
- `DELETE /api/auth/session` - Terminate session
- `POST /api/auth/signin` - Initiate sign-in

### Notes
- `GET /api/notes?userId={id}&sectionId={id}` - Fetch notes for user
- `POST /api/notes` - Create a new note
- `GET /api/notes/{id}?userId={id}` - Fetch specific note
- `PUT /api/notes/{id}` - Update a note
- `DELETE /api/notes/{id}?userId={id}` - Archive or delete a note

### Dashboard
- `GET /api/dashboard` - Initialize dashboard with user data and permissions

## 🧪 Development

### Running with Different Ports
```bash
npm run dev -- -p 3000
# or
yarn dev -- -p 3000
```

### Building for Production
```bash
npm run build
npm start
```

### Linting
```bash
npm run lint
# or skip linting during build
next build --no-lint
```

**Built with ❤️ by the ClassConnect Team**
