# Web Scraping Application

A modern web application for scraping product information from multiple sources, built with React, Node.js, and Supabase.

## Features

- 🕷️ **Multi-source scraping**: Support for different websites with modular scraper architecture
- 📊 **Product monitoring**: Track product names, prices, and scraping history
- 🎯 **Source management**: Add, edit, and delete scraping sources
- ⚡ **Real-time execution**: Execute scraping jobs with a single click
- 💾 **Database storage**: All data stored in Supabase PostgreSQL database
- 🎨 **Modern UI**: Beautiful, responsive interface built with React and Tailwind CSS

## Supported Sources

- **Sporting.com.ar**: Argentine sports retailer
- *More sources can be easily added by creating new scraper modules*

## Tech Stack

### Frontend
- React 18
- Tailwind CSS
- Lucide React (Icons)
- Axios (HTTP client)

### Backend
- Node.js
- Express.js
- Puppeteer (Web scraping)
- Cheerio (HTML parsing)

### Database
- Supabase (PostgreSQL)
- Row Level Security (RLS)

## Prerequisites

- Node.js 16+ 
- npm or yarn
- Supabase account
- Chrome/Chromium (for Puppeteer)

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
git clone <repository-url>
cd scrapping
npm run install-all
```

### 2. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to your project's SQL Editor
3. Run the SQL commands from `supabase-setup.sql`
4. Go to Settings > API to get your project URL and anon key

### 3. Configure Environment Variables

Create a `.env` file in the `server` directory:

```bash
cd server
cp env.example .env
```

Edit the `.env` file with your Supabase credentials:

```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
PORT=5000
```

### 4. Start the Application

```bash
# Start both frontend and backend
npm run dev

# Or start them separately
npm run server  # Backend on port 5000
npm run client  # Frontend on port 3000
```

The application will be available at `http://localhost:3000`

## Usage

### Adding Sources

1. Click "Add Source" in the Sources section
2. Fill in the source details:
   - **Source Name**: A descriptive name for the product
   - **Product URL**: The full URL of the product page
   - **Source Type**: Select the appropriate scraper (currently "Sporting.com.ar")
3. Click "Add Source"

### Executing Scraping

1. Add at least one source
2. Click the "Execute Scraping" button in the header
3. The application will scrape all sources and update the database
4. Results will appear in the Products table

### Viewing Results

The Products table shows:
- Product name
- Price (formatted as Argentine Peso)
- Source name
- Last scraped date/time
- Link to view the original product page

## Adding New Scrapers

To add support for a new website:

1. Create a new scraper file in `server/scrapers/` (e.g., `amazon.js`)
2. Implement the scraper class with a `scrape(url)` method
3. Add the new scraper type to the server's execution logic
4. Update the frontend source type dropdown

Example scraper structure:

```javascript
const puppeteer = require('puppeteer');

class AmazonScraper {
  async scrape(url) {
    // Implementation here
    return {
      name: 'Product Name',
      price: '100.00',
      url: url
    };
  }
}

module.exports = new AmazonScraper();
```

## Database Schema

### Sources Table
- `id`: UUID primary key
- `name`: Source name
- `url`: Product URL
- `type`: Scraper type
- `created_at`: Creation timestamp
- `updated_at`: Last update timestamp

### Products Table
- `id`: UUID primary key
- `name`: Product name
- `price`: Product price
- `source_url`: Original product URL
- `source_name`: Source name
- `scraped_at`: Last scraping timestamp
- `created_at`: Creation timestamp
- `updated_at`: Last update timestamp

## Troubleshooting

### Common Issues

1. **Puppeteer fails to launch**: Make sure Chrome/Chromium is installed
2. **Scraping fails**: Check if the website structure has changed
3. **Database connection errors**: Verify your Supabase credentials
4. **CORS errors**: Ensure the backend is running on the correct port

### Debug Mode

To run Puppeteer in non-headless mode for debugging:

```javascript
// In server/scrapers/sporting.js
browser = await puppeteer.launch({
  headless: false, // Change to false
  // ... other options
});
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions, please create an issue in the repository. 