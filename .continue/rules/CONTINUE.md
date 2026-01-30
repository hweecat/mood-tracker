# Next.js Dashboard Project Guide

## Project Overview

This is a Next.js 14 dashboard application built with the App Router, designed to demonstrate modern web development practices with TypeScript, React, and PostgreSQL. The application features user authentication, data visualization, and a responsive dashboard interface.

### Key Technologies Used

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: Vercel Postgres
- **Authentication**: bcryptjs for password hashing
- **Validation**: Zod for schema validation
- **UI Components**: Custom component library with Heroicons
- **Build Tool**: Next.js compiler

### High-Level Architecture

The application follows a component-based architecture with a clear separation of concerns:
- `app/` - Contains route handlers and page components using Next.js App Router
- `components/` - Reusable UI components
- `lib/` - Business logic, data fetching, and utility functions
- `services/` - API service integrations
- `types/` - TypeScript type definitions
- `hooks/` - Custom React hooks
- `context/` - React context providers

Data flows from the database through service layers to the UI components, with authentication protecting sensitive routes.

## Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- PostgreSQL database (Vercel Postgres recommended)
- Environment variables configured (see .env.example)

### Installation Instructions

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd nextjs-dashboard
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your database credentials
   ```

4. Run database migrations (if applicable):
   ```bash
   # Add migration commands here
   ```

### Basic Usage Examples

Start the development server:
```bash
npm run dev
```

Build for production:
```bash
npm run build
```

Start production server:
```bash
npm start
```

### Running Tests

Linting:
```bash
npm run lint
```

Component and unit tests (if configured):
```bash
npm test
```

## Project Structure

### Main Directories

- `src/app/` - Next.js App Router pages and layouts
  - `(auth)/` - Authentication routes (login, signup)
  - `dashboard/` - Protected dashboard routes
  - `page.tsx` - Home page
  - `layout.tsx` - Root layout
- `src/components/` - Reusable UI components
- `src/lib/` - Data fetching, utilities, and business logic
- `src/services/` - API service integrations
- `src/types/` - TypeScript type definitions
- `src/hooks/` - Custom React hooks
- `src/context/` - React context providers
- `public/` - Static assets

### Key Files

- `src/app/layout.tsx` - Root application layout
- `src/lib/data.ts` - Data fetching functions
- `src/lib/auth.ts` - Authentication logic
- `src/components/Sidebar.tsx` - Main navigation component
- `src/services/api.ts` - API service base configuration

### Important Configuration Files

- `next.config.ts` - Next.js configuration
- `tsconfig.json` - TypeScript configuration
- `tailwind.config.ts` - Tailwind CSS configuration
- `postcss.config.mjs` - PostCSS configuration
- `eslint.config.mjs` - ESLint configuration

## Development Workflow

### Coding Standards

- TypeScript strict mode enabled
- ESLint with Next.js recommended rules
- Prettier for code formatting
- Component naming convention: PascalCase
- File naming convention: kebab-case for components, camelCase for utilities

### Testing Approach

- ESLint for static code analysis
- TypeScript for type safety
- Manual testing during development
- Component isolation testing (if Jest/React Testing Library configured)

### Build and Deployment Process

1. Build the application:
   ```bash
   npm run build
   ```

2. Deploy to Vercel (recommended):
   - Connect GitHub repository to Vercel
   - Configure environment variables in Vercel dashboard
   - Automatic deployments on push to main branch

3. Manual deployment:
   ```bash
   npm start
   ```

### Contribution Guidelines

1. Create feature branches from main
2. Follow commit message conventions
3. Ensure code passes linting checks
4. Update documentation as needed
5. Submit pull requests for review

## Key Concepts

### Domain-Specific Terminology

- **Dashboard**: The main authenticated user interface
- **Invoice**: Financial record with amount, customer, and status
- **Revenue**: Financial data visualization
- **Customer**: Entity associated with invoices

### Core Abstractions

- **Data Fetching Layer**: Centralized data fetching in `lib/data.ts`
- **Authentication Layer**: Authentication logic in `lib/auth.ts`
- **Service Layer**: API integrations in `services/` directory
- **Component Composition**: Reusable UI components with props

### Design Patterns Used

- **Container/Presentational**: Data fetching separated from UI components
- **Context API**: State management for global data
- **Custom Hooks**: Reusable logic encapsulation
- **Route Groups**: Logical grouping of routes in App Router

## Common Tasks

### Adding a New Page

1. Create a new directory in `src/app/` with the route name
2. Add a `page.tsx` file with the page component
3. Add any required `loading.tsx` or `error.tsx` files
4. Update navigation in `src/components/Sidebar.tsx` if needed

### Creating a New Component

1. Create a new directory in `src/components/` with the component name
2. Add the component file with proper TypeScript typing
3. Export the component for use in other files
4. Add to component index file if applicable

### Adding a New Data Fetching Function

1. Add the function to `src/lib/data.ts`
2. Use the `sql` function from `@vercel/postgres` for database queries
3. Add proper error handling and caching where appropriate
4. Use `noStore()` from `next/cache` to disable caching when needed

### Implementing Authentication

1. Use functions in `src/lib/auth.ts` for authentication logic
2. Protect routes with middleware or conditional rendering
3. Use `useAuth` hook (if available) for authentication state
4. Handle authentication errors gracefully

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Verify environment variables are correctly set
   - Check database credentials and connectivity
   - Ensure Vercel Postgres is properly configured

2. **TypeScript Compilation Errors**
   - Check type definitions in `src/types/`
   - Ensure all props are properly typed
   - Run `npm run lint` to identify issues

3. **Styling Issues**
   - Verify Tailwind CSS classes are correctly applied
   - Check `tailwind.config.ts` for custom configurations
   - Ensure PostCSS is properly configured

### Debugging Tips

- Use browser developer tools for client-side debugging
- Check server console logs for server-side errors
- Use `console.log` statements strategically in development
- Enable React DevTools for component debugging
- Check network tab for API request issues

## References

### Documentation

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Vercel Postgres Documentation](https://vercel.com/docs/storage/vercel-postgres)

### Important Resources

- [Next.js Learn Course](https://nextjs.org/learn)
- [React Best Practices](https://react.dev/learn/thinking-in-react)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [Tailwind CSS Best Practices](https://tailwindcss.com/docs/optimizing-for-production)