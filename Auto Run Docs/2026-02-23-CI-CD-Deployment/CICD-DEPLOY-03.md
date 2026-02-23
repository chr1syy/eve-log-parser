# CI/CD Pipeline & Automated Deployment - Phase 3: Docker Configuration

**Issue:** CI/CD Pipeline & Automated Deployment with Docker & Watchtower (#17)
**Scope:** Create Dockerfile, .dockerignore, and docker-compose.yml

## Agentic-Executable Tasks Only

- [x] Create `Dockerfile` in project root with multi-stage build: build stage using `node:20-alpine` with `npm ci --only=production`, `npm run build`, accepting `VERSION` build ARG; runtime stage copying build artifacts, exposing port 3000, setting `NODE_ENV=production`, adding health check to `/api/version`, and running `npm start`

- [x] Create `.dockerignore` file excluding: node_modules, npm-debug.log, .git, .gitignore, .next, .env*, .DS_Store, *.md, dist, .turbo, .vercel, coverage, .nyc_output

- [x] Create `docker-compose.yml` with app service building from current directory, build args `VERSION=0.1.0`, environment variables `NODE_ENV=production` and `VERSION`, port mapping `3000:3000`, health check, and restart policy `unless-stopped`

- [ ] Build Docker image with `docker build -t eve-log-parser:test .` and verify successful build with no errors

- [ ] Build Docker image with version tag `docker build -t eve-log-parser:v0.1.0 --build-arg VERSION=0.1.0 .` and verify successful build

- [ ] Run `docker-compose up --build` to verify container starts without errors

- [ ] Run `docker-compose down` to clean up
