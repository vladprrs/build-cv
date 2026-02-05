# Contributing to Build CV

Thank you for your interest in contributing to Build CV! This document provides guidelines and information for contributors.

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

## How to Contribute

### Reporting Bugs

Before creating a bug report, please check existing issues to avoid duplicates.

When filing a bug report, include:
- A clear, descriptive title
- Steps to reproduce the issue
- Expected vs actual behavior
- Screenshots (if applicable)
- Environment details (OS, Node.js version, browser)

### Suggesting Features

Feature requests are welcome! Please:
- Check the [Roadmap](ROADMAP.md) first
- Search existing issues for similar suggestions
- Provide a clear use case and rationale

### Pull Requests

1. **Fork & Clone**
   ```bash
   git clone https://github.com/YOUR_USERNAME/build-cv.git
   cd build-cv
   npm install
   ```

2. **Create a Branch**
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b bugfix/issue-description
   ```

3. **Make Changes**
   - Follow existing code style
   - Write meaningful commit messages (Conventional Commits)
   - Add tests if applicable
   - Update documentation as needed

4. **Test Locally**
   ```bash
   npm run lint
   npm run build
   ```

5. **Submit PR**
   - Reference any related issues
   - Provide a clear description of changes
   - Be responsive to review feedback

## Development Setup

### Prerequisites
- Node.js 20+
- npm or pnpm

### Local Development
```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Start dev server
npm run dev
```

### Database Options

**Option 1: Local SQLite (recommended for development)**
```bash
# In .env.local
LOCAL_DB_PATH="./cv_data.db"
```

**Option 2: Turso Cloud**
```bash
# Get credentials from https://turso.tech
TURSO_DATABASE_URL="libsql://your-db.turso.io"
TURSO_AUTH_TOKEN="your-token"
```

### Database Commands
```bash
npm run db:generate   # Generate migrations
npm run db:push       # Push schema (dev only)
npm run db:migrate    # Run migrations
npm run db:studio     # Open Drizzle Studio
npm run db:seed       # Seed test data
```

## Code Style

- **TypeScript** everywhere
- **ESLint** for linting (`npm run lint`)
- **Prettier** for formatting
- Use **Server Actions** for mutations (not API routes)
- Use **Zod** for validation on both client and server
- Follow existing patterns in the codebase

## Commit Messages

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(scope): add new feature
fix(scope): fix bug description
docs: update documentation
refactor(scope): refactor code
test: add tests
chore: maintenance tasks
```

Examples:
```
feat(n8n): add agent-based workflow architecture
fix(export): correct date formatting in RAG export
docs: add API documentation
```

## Project Structure

```
src/
├── app/              # Next.js App Router pages
│   ├── actions.ts    # All Server Actions
│   └── */page.tsx    # Page components
├── components/       # React components
│   ├── ui/           # shadcn/ui components
│   └── *.tsx         # Feature components
├── db/
│   ├── schema.ts     # Drizzle ORM schema
│   └── index.ts      # Database connection
└── lib/
    ├── n8n/          # n8n workflow generator
    └── utils.ts      # Utilities
```

## Need Help?

- Check the [documentation](docs/)
- Open a [Discussion](https://github.com/vladprrs/build-cv/discussions)
- Review [existing issues](https://github.com/vladprrs/build-cv/issues)

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
