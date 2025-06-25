#!/bin/bash

echo "Preparing project for Vercel deployment..."

# Create a temporary directory for the client files
mkdir -p temp-client

# Copy client files to temp directory
cp -r client/* temp-client/

# Copy API files to temp directory
cp -r api temp-client/

# Copy vercel.json to temp directory
cp vercel.json temp-client/

# Copy .vercelignore to temp directory
cp .vercelignore temp-client/

# Create a new package.json in temp directory that combines both
cat > temp-client/package.json << 'EOF'
{
  "name": "web-scraping-app",
  "version": "1.0.0",
  "description": "Web scraping application with React frontend and Node.js backend",
  "private": true,
  "homepage": ".",
  "dependencies": {
    "@testing-library/jest-dom": "^5.17.0",
    "@testing-library/react": "^13.4.0",
    "@testing-library/user-event": "^14.5.2",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-scripts": "5.0.1",
    "axios": "^1.6.2",
    "react-router-dom": "^6.20.1",
    "lucide-react": "^0.294.0",
    "tailwindcss": "^3.3.6",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.32",
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "@supabase/supabase-js": "^2.38.4",
    "uuid": "^9.0.1",
    "puppeteer": "^21.5.2"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject"
  },
  "eslintConfig": {
    "extends": [
      "react-app",
      "react-app/jest"
    ]
  },
  "browserslist": {
    "production": [
      ">0.2%",
      "not dead",
      "not op_mini all"
    ],
    "development": [
      "last 1 chrome version",
      "last 1 firefox version",
      "last 1 safari version"
    ]
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
EOF

echo "Project prepared for Vercel deployment!"
echo "Files are ready in temp-client/ directory"
echo "You can now deploy the temp-client/ directory to Vercel" 