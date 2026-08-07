# Shop Tracker

A multi-tenant SaaS application for shop owners to track income and expenses.

## Features

- User authentication (sign up, sign in, sign out)
- Create and manage multiple stores
- Track work income and expenses
- Customer records (work done, IMEI, phone, CNIC, photo) with no payment data
- Filter transactions by month, year, or date
- View live totals (income, expense, balance)
- Mobile-responsive design
- Dark mode support

## Tech Stack

- **Frontend**: Vite, React, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui
- **Backend**: Supabase (Auth, Postgres, RLS)
- **State Management**: TanStack React Query
- **Forms**: React Hook Form + Zod

## Getting Started

### Prerequisites

- Node.js 20+
- Supabase account

### Setup

1. Clone the repository

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a Supabase project and run the migration:
   ```sql
   -- Run the SQL in supabase/migrations/001_initial_schema.sql
   ```

4. Copy the environment template and fill in your values:
   ```bash
   cp .env.example .env
   ```

5. Update `.env` with your Supabase credentials:
   ```
   VITE_SUPABASE_URL=your-project-url
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

6. Start the development server:
   ```bash
   npm run dev
   ```

## Deployment

### Vercel

1. Push your code to a Git repository
2. Import the project in Vercel
3. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy

## Project Structure

```
src/
├── components/
│   ├── ui/           # shadcn/ui components
│   ├── layout/       # App shell, sidebar, navigation
│   ├── auth/         # Auth forms, protected route
│   ├── stores/       # Store management
│   ├── customers/    # Customer records CRUD
│   └── transactions/ # Transaction CRUD
├── hooks/            # Custom React hooks
├── lib/              # Utilities, Supabase client
├── pages/            # Route pages
├── providers/        # Context providers
└── types/            # TypeScript types
```

## Database Schema

- **stores**: Store information (name, currency)
- **store_members**: User-store relationships with roles
- **transactions**: Income/expense entries
- **customers**: Customer job records (no payment data); photos live in the private
  `customer-photos` storage bucket at `{store_id}/{customer_id}.jpg`

All tables use Row Level Security (RLS) to ensure users can only access their own data.
Run every file in `supabase/migrations/` in order when setting up a new project.
