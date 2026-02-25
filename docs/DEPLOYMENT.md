# Deployment Guide

This guide covers deploying the EVE Log Parser application using Docker and automated updates with Watchtower.

## Prerequisites

- Docker and Docker Compose installed
- GitHub account with access to the repository
- Server or hosting environment with Docker support

## Quick Deployment

### Option 1: Manual Docker Run

```bash
# Pull and run the latest image
docker run -d \
  --name eve-log-parser \
  -p 3000:3000 \
  ghcr.io/chr1syy/eve-log-parser:latest
```

### Option 2: Docker Compose (Recommended)

Create `docker-compose.yml`:

```yaml
version: "3.8"

services:
  app:
    image: ghcr.io/chr1syy/eve-log-parser:latest
    ports:
      - "3000:3000"
    restart: unless-stopped
    environment:
      - NODE_ENV=production
```

Run:

```bash
docker-compose up -d
```

## Production Deployment with Auto-Updates

For production deployments with automatic updates, use Watchtower:

### Step 1: Create Production Compose File

Create `docker-compose.prod.yml`:

```yaml
version: "3.8"

services:
  app:
    image: ghcr.io/chr1syy/eve-log-parser:latest
    ports:
      - "3000:3000"
    labels:
      - "com.centurylinklabs.watchtower.enable=true"
    restart: unless-stopped
    environment:
      - NODE_ENV=production

  watchtower:
    image: containrrr/watchtower
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    command: --interval 300 --label-enable --cleanup
    restart: unless-stopped
```

### Step 2: Deploy

```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Step 3: Verify

```bash
# Check running containers
docker ps

# Check app is accessible
curl http://localhost:3000

# Check version endpoint
curl http://localhost:3000/api/version
```

## Environment Variables

The application supports the following environment variables:

- `NODE_ENV`: Set to `production` for production builds
- `PORT`: Override default port (3000)

## Health Checks

The container includes a health check that monitors the `/api/version` endpoint.

Check container health:

```bash
docker ps
# Look for "healthy" status
```

## Scaling

For high-traffic deployments, consider:

1. **Load Balancer**: Place nginx or traefik in front
2. **Multiple Instances**: Scale with `docker-compose up -d --scale app=3`
3. **Database**: If adding persistence, use external database

## Backup and Recovery

### Container Logs

```bash
docker logs eve-log-parser
```

### Data Persistence

Currently, the app is stateless. If you add features requiring data persistence:

```yaml
services:
  app:
    volumes:
      - ./data:/app/data
```

## Updating Manually

If not using Watchtower:

```bash
# Pull latest image
docker pull ghcr.io/chr1syy/eve-log-parser:latest

# Stop and remove old container
docker stop eve-log-parser
docker rm eve-log-parser

# Start new container
docker run -d --name eve-log-parser -p 3000:3000 ghcr.io/chr1syy/eve-log-parser:latest
```

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker logs eve-log-parser

# Check port conflicts
netstat -tulpn | grep :3000
```

### Image Pull Issues

```bash
# Login to GitHub Container Registry
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin

# Pull manually
docker pull ghcr.io/chr1syy/eve-log-parser:latest
```

### Performance Issues

- Ensure adequate CPU/memory allocation
- Check network connectivity to ghcr.io
- Monitor with `docker stats`

## Security Best Practices

1. **Run as non-root**: The container runs as node user by default
2. **Network isolation**: Use Docker networks for multi-container setups
3. **Secrets management**: Use Docker secrets for sensitive data
4. **Regular updates**: Keep base images updated
5. **Firewall**: Restrict access to necessary ports only

## CI/CD Integration

The application includes GitHub Actions workflows that:

- Build and test on pushes
- Create releases on tags
- Push images to ghcr.io
- Trigger Watchtower updates automatically

See `.github/workflows/release.yml` for details.
