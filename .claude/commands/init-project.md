# Initialize Project

Run the following commands to set up and start the project locally.

## Steps

### 1. Create Environment File
```bash
cp .env.example .env
```
Creates your local environment configuration from the example template.

### 2. Install Dependencies

**If using Node.js/Bun:**
```bash
npm install
# or
bun install
```

**If using Python:**
```bash
uv sync
```

### 3. Start Database (if applicable)
```bash
docker-compose up -d db
```

### 4. Run Database Migrations (if applicable)

Check the project for migration tools (Drizzle, Prisma, Alembic, etc.) and run the appropriate command.

### 5. Start Development Server

Check `package.json` scripts or the README for the correct dev command:
```bash
npm run dev
# or
bun dev
# or
uv run uvicorn app.main:app --reload
```

### 6. Validate Setup

Open the app in your browser and verify it loads correctly. Check any health endpoints if available.

## Cleanup

To stop services:
```bash
# Stop dev server: Ctrl+C
# Stop database: docker-compose down (if applicable)
```
