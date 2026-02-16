# Single-Tenant Application

A modern single-tenant application built with Vite, React, TypeScript, Tailwind CSS, and Supabase.

## Features

- ✅ User Authentication (Login/Register)
- ✅ Email Verification
- ✅ Password Reset
- ✅ Email Sending via Mailtrap Edge Function
- ✅ Single-Tenant Model (Each user belongs to one organization)
- ✅ Role-based Access Control (Owner, Admin, Member)
- ✅ Automatic Routing to Role-specific Pages
- ✅ Protected Routes
- ✅ Modern UI with Tailwind CSS
- ✅ TypeScript Support
- ✅ Supabase Backend with Edge Functions

## Tenant Model

This application implements a **single-tenant model** where:
- **Only ONE organization/tenant can exist in the system**
- The **first verified user** creates the organization and becomes the **Owner**
- **Subsequent signups are blocked** - only the first user can register
- All data is isolated within the single tenant using Row Level Security (RLS)
- Additional users must be invited by the Owner (invite system not yet implemented)

After the first user signs up:
- They are automatically assigned the Owner role
- Their organization is created
- All subsequent signup attempts will be rejected with a message to contact the organization owner

## Tech Stack

- **Frontend**: Vite + React + TypeScript
- **Styling**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth)
- **Routing**: React Router v6

## Prerequisites

- Node.js 18+ and npm
- A Supabase account ([sign up here](https://supabase.com))

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
npm install
```

### 2. Set Up Supabase

1. Create a new project in [Supabase Dashboard](https://app.supabase.com)
2. Go to Project Settings > API
3. Copy your project URL and anon/public key

### 3. Configure Environment Variables

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit `.env` and add your Supabase credentials:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Set Up Database

See [SUPABASE_SETUP.md](SUPABASE_SETUP.md) for detailed database setup instructions.

**Quick Setup:**
1. Go to Supabase Dashboard → SQL Editor
2. Copy the contents of `supabase-setup.sql`
3. Paste and run the script

This creates:
- `tenants` and `profiles` tables
- Row Level Security (RLS) policies
- Triggers for automatic user/tenant creation

### 5. Set Up Email Sending (Mailtrap Edge Function)

See [EDGE_FUNCTION_DEPLOYMENT.md](EDGE_FUNCTION_DEPLOYMENT.md) for step-by-step instructions.

**Quick Setup:**
1. Install Supabase CLI: `npm install -g supabase`
2. Login: `supabase login`
3. Link project: `supabase link --project-ref YOUR_PROJECT_REF`
4. Set secret: `supabase secrets set MAILTRAP_API_TOKEN=f207a474fb9630680f1087da90521f5c`
5. Deploy: `supabase functions deploy send-email`
6. Update `.env` with the Edge Function URL

### 6. Run the Application

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## Project Structure

```
src/
├── components/          # Reusable components
│   ├── DashboardLayout.tsx
│   └── ProtectedRoute.tsx
├── contexts/           # React contexts
│   └── AuthContext.tsx (includes tenant management)
├── lib/                # Third-party library configs
│   └── supabase.ts
├── pages/              # Page components
│   ├── dashboards/     # Role-specific dashboards (Owner/Admin/Member)
│   │   ├── OwnerDashboard.tsx
│   │   ├── AdminDashboard.tsx
│   │   └── MemberDashboard.tsx
│   ├── Dashboard.tsx   # Routes to role-specific pages
│   ├── Login.tsx
│   ├── Register.tsx    # Includes organization name
│   ├── ForgotPassword.tsx
│   ├── ResetPassword.tsx
│   └── VerifyEmail.tsx
├── types/              # TypeScript type definitions
│   └── auth.ts         # Includes Tenant type
├── App.tsx             # Main app component with routing
├── main.tsx            # Entry point
└── index.css           # Global styles
```

## Database Schema

### Tenants Table
- `id` - UUID (Primary Key)
- `name` - Organization name
- `created_at` - Timestamp
- `updated_at` - Timestamp

### Profiles Table
- `id` - UUID (Primary Key, references auth.users)
- `tenant_id` - UUID (Foreign Key to tenants)
- `email` - User email
- `role` - User role (owner/admin/member)
- `created_at` - Timestamp
- `updated_at` - Timestamp

## User Roles

The application supports three user roles within each tenant:

1. **Owner**: Full control over the organization/tenant
   - Manage all tenant settings and configuration
   - View and manage all users within the tenant
   - Billing and subscription management
   - Complete analytics and reporting
   - Security and compliance settings

2. **Admin**: Team and project management within the tenant
   - Manage team members and permissions
   - Create and oversee projects
   - Access team analytics
   - Moderate content and activities

3. **Member**: Basic access with personal workspace
   - View and complete assigned tasks
   - Collaborate with team members
   - Access personal dashboard and activity feed
   - Contribute to team projects

## User Flow

1. **First User Registration**: 
   - First person to register creates the organization
   - Automatically becomes the **Owner**
   - Organization name is set during registration
   - A single tenant is created (only one allowed)

2. **Subsequent Registration Attempts**:
   - All other signup attempts are **blocked**
   - Users see message: "This system already has an organization. Please contact your organization owner for access."
   - Additional users must be invited by the Owner (invite feature to be implemented)

3. **Login**:
   - Owner signs in with credentials
   - System loads user profile and tenant information
   - Owner is routed to Owner Dashboard

4. **Role-Based Routing**:
   - Owner → `/dashboard` → Owner Dashboard
   - Admin → `/dashboard` → Admin Dashboard (when invite system is added)
   - Member → `/dashboard` → Member Dashboard (when invite system is added)

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Authentication Flow

1. **Register**: Users create an account with email/password
2. **Email Verification**: Supabase sends verification email (if enabled)
3. **Login**: Users sign in with verified credentials
4. **Password Reset**: Supabase sends password reset email via `resetPasswordForEmail()`
5. **Protected Routes**: Authenticated users access role-based dashboards

**Email System**: Uses Supabase's built-in email service (no custom SMTP or Edge Functions)

## Security Features

- Row Level Security (RLS) enabled on all tables
- Email verification via Supabase's built-in system (configurable)
- Password strength requirements (min 6 characters)
- Secure password reset flow using Supabase auth
- Role-based access control
- Tenant data isolation

## Customization

### Adding New Roles

1. Update the `UserRole` type in `src/types/auth.ts`
2. Update the database CHECK constraint in the SQL setup
3. Create a new dashboard component
4. Add the role to the Dashboard router in `src/pages/Dashboard.tsx`

### Styling

The project uses Tailwind CSS. Customize the theme in `tailwind.config.js`.

## Deployment

### Frontend (Vercel/Netlify)

1. Build the project: `npm run build`
2. Deploy the `dist` folder
3. Set environment variables in your hosting platform

### Database (Supabase)

Your Supabase database is already hosted and managed by Supabase.

## Support

For issues and questions:
- Check Supabase documentation: https://supabase.com/docs
- Check React Router documentation: https://reactrouter.com
- Check Tailwind CSS documentation: https://tailwindcss.com

## License

MIT
