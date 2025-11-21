# Retro Board

A collaborative retro board application for team retrospectives, built with React, TypeScript, and InsForge.

## Features

- **Three Categories**: 
  - What Went Well
  - What Didn't Go Well
  - What Can Be Improved

- **Upvoting**: Participants can upvote items, with voter names displayed
- **Comments**: Optional comments on each retro item
- **Authentication**: Sign in with email/password or OAuth (Google, GitHub)
- **Real-time Updates**: See items, votes, and comments from all participants

## Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Variables**
   The `.env` file is already configured with your InsForge backend URL and anonymous key.

3. **Start Development Server**
   ```bash
   npm run dev
   ```

4. **Build for Production**
   ```bash
   npm run build
   ```

## Usage

1. Sign in using the Sign In button in the header
2. Add items to any of the three categories
3. Upvote items you agree with (click the upvote button to toggle)
4. Add comments to provide additional context or discussion
5. View voter names by hovering over or looking at the upvote count

## Database Schema

The application uses three main tables:
- `retro_items`: Stores retro items with category and content
- `votes`: Tracks upvotes with user associations
- `comments`: Stores comments on retro items

All tables have Row Level Security (RLS) enabled for proper access control.

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS 3.4
- **Backend**: InsForge (PostgreSQL + PostgREST)
- **Authentication**: InsForge Auth (Email/Password + OAuth)
