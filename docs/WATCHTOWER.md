# Watchtower Setup

Watchtower is a container that monitors running Docker containers and automatically updates them when new images are available.

## Overview

This setup enables automatic deployment updates for the EVE Log Parser when new container images are pushed to GitHub Container Registry (ghcr.io).

## Prerequisites

- Docker and Docker Compose installed
- Access to pull from ghcr.io
- The EVE Log Parser container running

## Quick Start

1. Run the EVE Log Parser with Watchtower:

```bash
docker run -d \
  --name eve-log-parser \
  -p 3000:3000 \
  --label=com.centurylinklabs.watchtower.enable=true \
  ghcr.io/chr1syy/eve-log-parser:latest

docker run -d \
  --name watchtower \
  --volume /var/run/docker.sock:/var/run/docker.sock \
  containrrr/watchtower \
  --interval 30 \
  --label-enable \
  eve-log-parser
```

## Detailed Configuration

### Watchtower Options

- `--interval 30`: Check for updates every 30 seconds (adjust for production)
- `--label-enable`: Only monitor containers with the watchtower enable label
- `--cleanup`: Remove old images after updating
- `--debug`: Enable debug logging

### Production Setup with Docker Compose

Create a `docker-compose.prod.yml`:

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

  watchtower:
    image: containrrr/watchtower
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    command: --interval 300 --label-enable --cleanup
    restart: unless-stopped
```

Run with:

```bash
docker-compose -f docker-compose.prod.yml up -d
```

## Monitoring

### Check Watchtower Logs

```bash
docker logs watchtower
```

### Manual Update Check

```bash
docker exec watchtower /watchtower --run-once
```

## Security Considerations

- Watchtower needs access to the Docker socket (`/var/run/docker.sock`)
- In production, consider running Watchtower on a separate host or with restricted permissions
- Monitor for unexpected container restarts

## Troubleshooting

### Container Not Updating

1. Check that the container has the correct label: `com.centurylinklabs.watchtower.enable=true`
2. Verify Watchtower can access the registry
3. Check Watchtower logs for errors

### Permission Issues

If you see permission errors with the Docker socket, ensure proper user permissions or run with `sudo`.

## Integration with CI/CD

When GitHub Actions pushes a new image to ghcr.io, Watchtower will automatically detect and update the running container within the configured interval.
