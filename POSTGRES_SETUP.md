# PostgreSQL Setup Instructions

This document provides step-by-step instructions for setting up PostgreSQL for this project.

## Prerequisites

1. Install PostgreSQL:
   - **Mac**: `brew install postgresql` or use PostgreSQL.app
   - **Windows**: Download installer from the official PostgreSQL website
   - **Linux**: Use your distribution's package manager, e.g., `sudo apt install postgresql postgresql-contrib`

## Setup Instructions

1. **Start PostgreSQL**:

   - **Mac**: `brew services start postgresql` or start PostgreSQL.app
   - **Windows**: PostgreSQL service should be running after installation
   - **Linux**: `sudo systemctl start postgresql`

2. **Create Database**:

   ```bash
   # Login to PostgreSQL
   psql -U postgres

   # Inside PostgreSQL prompt create the database
   CREATE DATABASE my_chatbot_db;

   # Exit
   \q
   ```

3. **Update Environment Variables**:
   Make sure your `.env.local` file has the correct PostgreSQL connection URL:

   ```
   DATABASE_URL="postgresql://postgres:19971030@localhost:5432/my_chatbot_db?schema=public"
   ```

   Note: Update the username and password to match your PostgreSQL setup. The default is often:

   - Username: postgres
   - Password: postgres

4. **Run Prisma Migration**:

   ```bash
   npx prisma migrate dev --name init
   ```

5. **Generate Prisma Client**:
   ```bash
   npx prisma generate
   ```

## Verifying Setup

1. Start your application:

   ```bash
   npm run dev
   ```

2. Try to register a new user to verify that the database connection is working properly.

3. You can view your database using Prisma Studio:
   ```bash
   npx prisma studio
   ```

## Troubleshooting

- **Connection Issues**: Make sure PostgreSQL service is running.
- **Authentication Issues**: Update the DATABASE_URL with correct credentials.
- **Database Exists Error**: If the database already exists, you can remove it with `DROP DATABASE my_chatbot_db;` and create it again.
