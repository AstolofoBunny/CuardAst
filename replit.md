# Battle Arena - PvP Card Game

## Overview

Battle Arena is a browser-based PvP card game built as a full-stack web application. The game features real-time multiplayer battles, deck building mechanics, and a ranking system. Players can create and join battle rooms, build custom decks from available cards, and engage in strategic turn-based combat with other players or AI opponents.

The application combines a React frontend with an Express.js backend, using Firebase for authentication and real-time data synchronization, and PostgreSQL with Drizzle ORM for additional data persistence.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes (January 2025)

### Migration Fixes (January 5, 2025)
- **Admin Panel Fixed**: Resolved missing Label import causing admin panel to break for admin users
- **Profile Settings Enhanced**: Fixed profile picture reset issue when editing display name - form now syncs properly with user data changes
- **Battle Interface Improved**: Enhanced room creation and joining logic to properly transition to battle states with proper timing
- **Card Display Verified**: Confirmed all card statistics (attack, defense, health, critical stats, resistances) display correctly in Cards tab
- **Type Safety Enhanced**: Added profilePicture field to User interface for proper profile image handling

### Major System Updates
- **Enhanced Card System**: Implemented comprehensive card statistics including attack, defense, health, critical chance/damage, and element-based resistances
- **URL-Based Navigation**: Fixed tab persistence issues by implementing proper routing with wouter - each tab now has its own URL
- **Cards Collection Tab**: Added dedicated cards browser with detailed card information, filtering, and modal detail views
- **Battle Flow Improvements**: Fixed battle tab navigation to properly handle PvP waiting states and PvE direct battles
- **Admin Panel Enhancements**: Updated card creation system to use structured passive abilities instead of manual descriptions

### Card Statistics System
- **Battle Cards**: Health, Attack, Defense, Critical Chance/Damage, Class-based resistances (ranged/melee/magic)
- **Spell Cards**: Energy cost, spell type classification (ranged/melee/magical/other)
- **Passive Abilities**: Standardized system with selectable effects for consistent battle mechanics
- **Detailed Views**: Complete card information including hidden stats visible in Cards tab

### Navigation & UX Fixes
- **URL Persistence**: Tabs maintain state across page refreshes and browser navigation
- **Battle Tab Logic**: Proper state management for active battles vs waiting states vs empty states
- **Deck Builder**: Now shows success notifications instead of redirecting away from the tab
- **Room Creation**: Automatically navigates to appropriate battle states (waiting for PvP, direct battle for PvE)

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query for server state and React hooks for local state
- **UI Framework**: Radix UI components with shadcn/ui design system
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **Build Tool**: Vite for development and production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Database**: PostgreSQL with Drizzle ORM for schema management
- **Authentication**: Firebase Authentication (email/password and Google OAuth)
- **Real-time Data**: Firebase Firestore for game state synchronization
- **API Design**: RESTful API structure with modular route handling
- **Development**: Hot module replacement via Vite integration

### Data Storage Solutions
- **Primary Database**: PostgreSQL for user profiles and persistent data
- **Real-time Database**: Firebase Firestore for live game sessions, rooms, and battle states
- **Schema Management**: Drizzle ORM with TypeScript-first approach
- **Migrations**: Automated database migrations via Drizzle Kit

### Authentication and Authorization
- **Provider**: Firebase Authentication
- **Methods**: Email/password registration and Google OAuth sign-in
- **User Roles**: Standard users and admin privileges
- **Session Management**: Firebase handles token management and session persistence
- **Authorization**: Role-based access control for admin features

### Game Logic Architecture
- **Card System**: Two card types (Battle Units and Abilities) with class-based advantages
- **Battle Mechanics**: Turn-based combat with energy management and HP tracking
- **Deck Building**: 10-card decks with drag-and-drop interface
- **Room System**: PvP and PvE game modes with real-time synchronization
- **Ranking System**: Win/loss tracking with leaderboard functionality

## External Dependencies

### Core Framework Dependencies
- **React Ecosystem**: React 18, React DOM, React Hook Form for form management
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state synchronization
- **UI Components**: Radix UI primitives for accessible component foundation

### Firebase Services
- **Firebase Authentication**: User authentication and session management
- **Firebase Firestore**: Real-time database for game state and live data
- **Firebase SDK**: Browser-compatible ES modules loaded via CDN

### Database and ORM
- **PostgreSQL**: Primary relational database (via Neon Database serverless)
- **Drizzle ORM**: Type-safe ORM with PostgreSQL dialect
- **Connection**: @neondatabase/serverless for serverless database connections

### Development and Build Tools
- **Vite**: Development server and build tool with React plugin
- **TypeScript**: Static type checking across the entire application
- **Tailwind CSS**: Utility-first CSS framework with PostCSS integration
- **ESBuild**: Fast JavaScript bundler for server-side code compilation

### Additional Libraries
- **Form Handling**: React Hook Form with Zod schema validation
- **Date Manipulation**: date-fns for date formatting and calculations
- **Styling Utilities**: clsx and tailwind-merge for conditional styling
- **Icons**: Lucide React for consistent iconography
- **Session Storage**: connect-pg-simple for PostgreSQL session store