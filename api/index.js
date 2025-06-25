// This file serves as the entry point for Vercel serverless functions
const app = require('../server/index.js');

// Export the Express app for Vercel
module.exports = app; 