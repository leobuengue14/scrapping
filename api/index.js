// This file serves as the entry point for Vercel serverless functions
const path = require('path');

// Add the server directory to the module path
const serverPath = path.join(__dirname, '..', 'server');
require('module').globalPaths.push(serverPath);

// Import the Express app from the server
const app = require('../server/index.js');

// Export the Express app for Vercel
module.exports = app; 