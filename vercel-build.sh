#!/bin/bash

# Install client dependencies and build
echo "Installing client dependencies..."
cd client
npm install

echo "Building client..."
npm run build

echo "Build completed successfully!" 