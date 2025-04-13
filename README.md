# DiviTrack - Stock Dividend Tracking App (Next.js Version)

DiviTrack is a web application for tracking and analyzing dividend-paying stocks. It fetches real-time data from Yahoo Finance and provides insights into yield rates, dividend history, and algorithmic insights about dividend stocks.

## Features

- Track multiple stock symbols in a single dashboard
- View key metrics including current prices, dividend yields, and market caps
- Analyze dividend payment history and frequency with visual charts
- Get purely algorithmic insights on each stock
- Sort stocks by various metrics including dividend yield
- Automatic caching system for improved performance (dropped)
- Modern Next.js architecture with improved security

## Installation

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Setup

1. Clone the repository:
   ```
   git clone https://github.com/don-lim/divitrack.git
   cd divitrack
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the development server:
   ```
   npm run dev
   ```

4. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

## Usage

### Adding Stocks

1. Click the "Add Stock" button
2. Enter a valid stock symbol (e.g., AAPL, MSFT)
3. Click "Add Stock" on the pop-up to fetch and display the stock data

### Updating Data

- Click "Fetch New Data" to refresh all stock information with the latest data from Yahoo Finance
- To restore the original items, click "Reset".

### Customizing Your List

- Click the "Delete" button next to any stock to remove it from your watchlist
- Sort stocks by clicking on column headers

## Project Structure

```
divitrack/
├── public/             # Static assets
├── app/                # Next.js App Router components
│   └── api/            # APIs
│       ├── dividends/  # API for dividends
│       ├── health/     # API for server health
│       └── stock/      # API for stock
├── components/         # React components
├── lib/                # Utility libraries
├── services/           # Backend services
├── hooks/              # Update and manage the content
├── package.json        # Project dependencies
└── README.md           # Project documentation
```

## Deployment to cPanel

This application can be deployed to cPanel shared hosting environments.

## Technologies Used

- **Frontend**: React, Next.js, Chart.js, Bootstrap
- **Backend**: Next.js API Routes
- **Data Source**: Yahoo Finance API
- **Storage**: File-based caching

## License

For personal use only. Contact for commercial use. Feel free to fork and send a pull request.