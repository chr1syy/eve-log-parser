# EVE Log Parser

A modern web application for parsing and analyzing EVE Online combat logs, built with Next.js, React, and TypeScript.

## Features

- **Log Upload & Parsing**: Drag-and-drop interface for EVE combat log files
- **Real-time Analysis**: Instant damage, DPS, and engagement metrics
- **Interactive Charts**: Visual representations of combat data using Recharts
- **Version Tracking**: Built-in changelog and version information
- **Responsive Design**: Works on desktop and mobile devices
- **Docker Ready**: Containerized deployment with automated updates

## Quick Start

### Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### Production Deployment

```bash
# Using Docker Compose
docker-compose up -d

# With auto-updates (production)
docker-compose -f docker-compose.prod.yml up -d
```

## API Endpoints

- `GET /api/version` - Application version and build info
- `GET /api/changelog` - Commit history and changes

## Project Structure

```
├── src/
│   ├── app/                 # Next.js app router pages
│   ├── components/          # React components
│   ├── contexts/            # React contexts
│   ├── lib/                 # Utility functions
│   └── __tests__/           # Test files
├── public/                  # Static assets
├── docs/                    # Documentation
├── scripts/                 # Build scripts
└── docker-compose.yml       # Docker configuration
```

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run test` - Run unit tests
- `npm run test:integration` - Run integration tests
- `npm run generate-changelog` - Generate changelog from Git history

### Testing

```bash
# Run all tests
npm test

# Run integration tests
npm run test:integration

# Run with coverage
npm test -- --coverage
```

## Deployment

### Docker

The application is fully containerized and can be deployed using Docker:

```bash
# Build locally
docker build -t eve-log-parser .

# Run
docker run -p 3000:3000 eve-log-parser
```

### Production with Auto-Updates

For production deployments with automatic updates:

1. See [Deployment Guide](docs/DEPLOYMENT.md)
2. See [Watchtower Setup](docs/WATCHTOWER.md)

### CI/CD

GitHub Actions automatically:

- Tests and builds on pushes
- Creates releases on version tags
- Pushes Docker images to GitHub Container Registry
- Triggers automated updates via Watchtower

## Configuration

### Environment Variables

- `NODE_ENV` - Environment (development/production)
- `PORT` - Server port (default: 3000)

### Docker Build Args

- `VERSION` - Application version tag

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Changelog

View the [changelog](changelog) page for recent updates and changes.

## License

This project is private and proprietary.

## Technologies

- **Framework**: Next.js 16
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Testing**: Vitest + Testing Library
- **Deployment**: Docker + GitHub Actions
