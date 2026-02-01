# Banha - Project Notes

## Production Deployment

### Server
- **Host**: `your-server.local`
- **Port**: `3030`
- **URL**: `http://your-server.local:3030`
- **Docker context**: `your-context`

### Deploy Commands

```bash
# Build and deploy to production (with latest base image)
docker compose -f docker-compose.prod.yml build --no-cache --pull
docker compose -f docker-compose.prod.yml up -d

# Check status
docker compose -f docker-compose.prod.yml ps

# View logs
docker compose -f docker-compose.prod.yml logs -f

# Restart container
docker compose -f docker-compose.prod.yml restart

# Stop container
docker compose -f docker-compose.prod.yml down
```

### Keeping Up-to-Date

**Always use the latest stable versions.** On every deployment:

1. **Docker base image**: The `--pull` flag ensures the latest `node:20-alpine` is used
2. **Alpine packages**: Rebuilt fresh with `--no-cache`, getting latest security patches
3. **npm dependencies**: Run `npm update` periodically to get latest compatible versions

```bash
# Update npm dependencies to latest compatible versions
npm update

# Check for outdated packages
npm outdated

# Update package-lock.json after updates
npm install
```

The Dockerfile uses `node:20-alpine` (latest Node 20 LTS + latest Alpine). This ensures:
- Latest security patches for Alpine Linux
- Latest Node.js 20.x patch releases
- Fresh builds of native modules (better-sqlite3)

### Docker Context

The project uses Docker context which connects via SSH to your server.

```bash
# List contexts
docker context ls

# Switch context
docker context use your-context

# Switch back to local
docker context use desktop-linux
```

### Data Persistence

Production data is stored on the server at configured volume paths:
- SQLite database
- Claude credentials

## Development

```bash
# Run locally
npm run dev

# Build
npm run build

# Lint
npm run lint
```

## Tech Stack
- Next.js 16 + React 19
- Drizzle ORM + SQLite
- TypeScript strict mode
- Tailwind CSS 4
- PWA support
