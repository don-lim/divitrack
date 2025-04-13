import yahooFinance from 'yahoo-finance2';

// Ensure yahoo-finance is properly initialized for both ESM and CommonJS environments
// @ts-ignore - Handle potential differences between module systems
const yahoofin = yahooFinance;

// Suppress Yahoo Finance notices
yahoofin.suppressNotices(['yahooSurvey', 'ripHistorical']);

// Types
export interface StockData {
  symbol: string;
  dividendHistory: any[];
  yieldRate: number;
  dividendYield: number;
  payFrequency: string;
  recommendationKey: string;
  source: string;
  fetchDate: string;
  isEtf: boolean;
  totalNetAssets: any;
  opinion?: string;
  error?: boolean;
  errorMessage?: string;
  regularMarketPrice?: number;
  regularMarketChangePercent?: number;
  marketCap?: number;
  longName?: string;
  shortName?: string;
  fiftyDayAverageChangePercent?: number;
  priceHistory?: Array<{
    date: string;
    price: number;
  }>;
  // Add a property to support any additional fields from Yahoo Finance
  [key: string]: any;
}

// Add this interface for Yahoo Finance quote results
interface YahooQuoteResult {
  symbol?: string;
  shortName?: string;
  longName?: string;
  regularMarketPrice?: number;
  regularMarketChangePercent?: number;
  dividendYield?: number;
  dividendRate?: number;
  marketCap?: number;
  quoteType?: string;
  recommendationKey?: string;
  fiftyDayAverageChangePercent?: number;
  [key: string]: any;
}

// Add this interface for dividend history items
interface DividendItem {
  date: string;
  amount: number;
  yield: number;
}

// Add this interface for historical item
interface HistoricalItem {
  date: Date;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  volume?: number;
  adjClose?: number;
  dividends?: number;
  splits?: number;
  [key: string]: any;
}

// Add this interface for dividend event from Yahoo Finance
interface YahooDividendEvent {
  date: number | string;
  amount: number;
  [key: string]: any;
}

/**
 * Retrieves dividend history for a stock.
 * @param {string} symbol - Stock symbol
 * @param {Date} [from] - Start date (optional)
 * @param {Date} [to] - End date (optional)
 * @returns {Promise<Array>} - Dividend history array
 */
export async function getDividendHistory(
  symbol: string, 
  from?: Date,
  to?: Date
): Promise<DividendItem[]> {
  if (!symbol) return [];
  
  try {
    // Standardize the symbol
    const normalizedSymbol = symbol.trim().toUpperCase();
    
    // Default date range: extend to 2 years instead of 1
    const endDate = to || new Date();
    const startDate = from || new Date(new Date().setFullYear(endDate.getFullYear() - 2));
    
    try {
      // Use the chart method instead of historical (which is more reliable)
      const result = await yahoofin.chart(normalizedSymbol, {
        period1: startDate.toISOString().split('T')[0],
        period2: endDate.toISOString().split('T')[0],
        interval: '1d',
        events: 'div'
      });

      // Process and format dividend data
      const dividends: DividendItem[] = [];
      
      // Check if dividend events exist
      if (result && result.events && result.events.dividends) {
        // Convert the dividends object to an array and handle type conversion
        const rawDividendEvents = Object.values(result.events.dividends);
        const dividendEvents: YahooDividendEvent[] = rawDividendEvents.map(div => ({
          date: div.date instanceof Date ? div.date.getTime() : div.date,
          amount: div.amount
        }));
        
        // Map to the expected format
        dividendEvents.forEach(div => {
          // Convert the date properly - Yahoo might be providing a non-standard timestamp format
          let timestamp: number;
          
          if (typeof div.date === 'number') {
            timestamp = div.date < 10000000 ? div.date * 86400 : div.date;
          } else {
            timestamp = new Date(div.date).getTime() / 1000;
          }
          
          dividends.push({
            date: new Date(timestamp * 1000).toISOString().split('T')[0],
            amount: div.amount,
            yield: 0
          });
        });
        
        // Sort by date descending (newest first)
        dividends.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      }
      
      return dividends;
    } catch (error) {
      // Fallback to historical method if chart fails
      try {
        // Simplified log
        console.log(`Chart method failed for ${normalizedSymbol}, trying historical method`);
        const history = await yahoofin.historical(normalizedSymbol, {
          period1: startDate,
          period2: endDate,
          events: 'dividends',
        }) as HistoricalItem[];
        
        // Filter and extract dividend events
        const dividends = history
          .filter(item => item.dividends && item.dividends > 0)
          .map((item: HistoricalItem) => ({
            date: item.date.toISOString().split('T')[0],
            amount: item.dividends || 0,
            yield: 0
          }));
        
        // Sort by date descending (newest first)
        dividends.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        return dividends;
      } catch (histError) {
        // Simplified error message without logging the error object
        console.log(`Failed to get dividend data for ${normalizedSymbol}`);
        return [];
      }
    }
  } catch (error) {
    // Simplified error message without logging the error object
    console.log(`Error fetching dividend history for ${symbol}`);
    return [];
  }
}

/**
 * Calculates the dividend payment frequency based on history.
 * @param {Array} dividendHistory - Array of dividend payments
 * @returns {string} - Payment frequency (Monthly, Quarterly, etc.)
 */
export function calculatePayFrequency(dividendHistory: any[]): string {
  // Handle empty or undefined dividend history
  if (!dividendHistory || dividendHistory.length === 0) return 'No Records';
  
  // If there's only 1 dividend record, assume it's annual
  if (dividendHistory.length === 1) return 'Annual';
  
  // Sort by date (newest first)
  const sortedDividends = [...dividendHistory].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  
  // Calculate intervals between payments in days
  const intervals: number[] = [];
  for (let i = 1; i < sortedDividends.length; i++) {
    const currentDate = new Date(sortedDividends[i-1].date);
    const prevDate = new Date(sortedDividends[i].date);
    const daysDiff = Math.round((currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
    intervals.push(daysDiff);
  }
  
  // Calculate average interval
  const avgInterval = intervals.reduce((sum, days) => sum + days, 0) / intervals.length;
  
  // Check if payment months suggest quarterly pattern
  // This handles cases like ENB with May, Aug, Nov payments (missing Feb)
  if (sortedDividends.length >= 3) {
    const months = new Set();
    sortedDividends.forEach(div => {
      const month = new Date(div.date).getMonth();
      months.add(month);
    });
    
    // If we have payments in 3-4 distinct months and avg interval is roughly in quarterly range
    if ((months.size === 3 || months.size === 4) && avgInterval >= 70 && avgInterval <= 120) {
      return 'Quarterly';
    }
  }
  
  // Existing interval-based logic
  if (avgInterval <= 35) return 'Monthly';
  if (avgInterval <= 70) return 'Bi-Monthly';
  if (avgInterval <= 100) return 'Quarterly';
  if (avgInterval <= 190) return 'Semi-Annual';
  if (avgInterval <= 370) return 'Annual';
  
  return 'Irregular';
}

/**
 * Calculate dividend yield based on dividend history and market price.
 * @param {Array} dividendHistory - Array of dividend payments
 * @param {number} regularMarketPrice - Current stock price
 * @returns {number} - Calculated yield percentage
 */
function calculateDividendYield(dividendHistory: DividendItem[], regularMarketPrice?: number): number {
  if (!dividendHistory || dividendHistory.length === 0 || !regularMarketPrice) {
    return 0;
  }
  
  // Sort by date (newest first)
  const sortedDividends = [...dividendHistory].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  
  // Filter to only include dividends from the past 365 days
  const oneYearAgo = Date.now() - (365 * 24 * 60 * 60 * 1000);
  const lastYearDividends = sortedDividends.filter(div => 
    new Date(div.date).getTime() >= oneYearAgo
  );
  
  // Get payment frequency
  const payFrequency = calculatePayFrequency(dividendHistory);
  
  let annualDividend = 0;
  
  if (payFrequency === 'Annual') {
    // For annual payers, just use the most recent dividend
    annualDividend = sortedDividends[0].amount;
  } else if (payFrequency === 'Monthly') {
    // For monthly payers, expect 12 payments per year
    const expectedPayments = 12;
    const avgMonthly = lastYearDividends.reduce((sum, div) => sum + div.amount, 0) / 
                      Math.max(1, lastYearDividends.length);
    
    // If we have a full year of data, use the sum directly
    if (lastYearDividends.length >= expectedPayments) {
      annualDividend = lastYearDividends.slice(0, expectedPayments).reduce((sum, div) => sum + div.amount, 0);
    } else {
      // Otherwise, use actual payments + estimated missing payments
      const existingPayouts = lastYearDividends.reduce((sum, div) => sum + div.amount, 0);
      const missingPayouts = avgMonthly * (expectedPayments - lastYearDividends.length);
      annualDividend = existingPayouts + missingPayouts;
    }
  } else if (payFrequency === 'Quarterly') {
    // For quarterly payers, expect 4 payments per year
    const expectedPayments = 4;
    const avgQuarterly = lastYearDividends.reduce((sum, div) => sum + div.amount, 0) / 
                       Math.max(1, lastYearDividends.length);
    
    // If we have a full year of data, use the sum directly
    if (lastYearDividends.length >= expectedPayments) {
      annualDividend = lastYearDividends.slice(0, expectedPayments).reduce((sum, div) => sum + div.amount, 0);
    } else {
      // Otherwise, use actual payments + estimated missing payments
      const existingPayouts = lastYearDividends.reduce((sum, div) => sum + div.amount, 0);
      const missingPayouts = avgQuarterly * (expectedPayments - lastYearDividends.length);
      annualDividend = existingPayouts + missingPayouts;
    }
  } else if (payFrequency === 'Bi-Monthly') {
    // For bi-monthly payers, expect 6 payments per year
    const expectedPayments = 6;
    const avgBiMonthly = lastYearDividends.reduce((sum, div) => sum + div.amount, 0) / 
                       Math.max(1, lastYearDividends.length);
    
    if (lastYearDividends.length >= expectedPayments) {
      annualDividend = lastYearDividends.slice(0, expectedPayments).reduce((sum, div) => sum + div.amount, 0);
    } else {
      const existingPayouts = lastYearDividends.reduce((sum, div) => sum + div.amount, 0);
      const missingPayouts = avgBiMonthly * (expectedPayments - lastYearDividends.length);
      annualDividend = existingPayouts + missingPayouts;
    }
  } else if (payFrequency === 'Semi-Annual') {
    // For semi-annual payers, expect 2 payments per year
    const expectedPayments = 2;
    const avgSemiAnnual = lastYearDividends.reduce((sum, div) => sum + div.amount, 0) / 
                        Math.max(1, lastYearDividends.length);
    
    if (lastYearDividends.length >= expectedPayments) {
      annualDividend = lastYearDividends.slice(0, expectedPayments).reduce((sum, div) => sum + div.amount, 0);
    } else {
      const existingPayouts = lastYearDividends.reduce((sum, div) => sum + div.amount, 0);
      const missingPayouts = avgSemiAnnual * (expectedPayments - lastYearDividends.length);
      annualDividend = existingPayouts + missingPayouts;
    }
  } else {
    // Unknown frequency - only sum up dividends from the past year
    annualDividend = lastYearDividends.reduce((sum, div) => sum + div.amount, 0);
  }
  
  // Calculate yield as annual dividend divided by current price, expressed as percentage
  return (annualDividend / regularMarketPrice) * 100;
}

/**
 * Generates an algorithmic insight about a stock based on its data.
 * @param {Object} stockData - Stock data object
 * @returns {string} - Algorithmic insight text
 */
export function generateAlgorithmicInsight(stockData: any): string {
  if (!stockData) return 'Insufficient data for analysis';
  
  const opinions = [];
  
  // Add yield commentary if available
  if (stockData.yieldRate !== undefined) {
    const yieldValue = stockData.yieldRate;
    
    if (yieldValue > 8) {
      opinions.push(`High yield of ${yieldValue.toFixed(2)}% may indicate elevated risk or potential dividend cut.`);
    } else if (yieldValue > 5) {
      opinions.push(`Above-average yield of ${yieldValue.toFixed(2)}% offers attractive income potential.`);
    } else if (yieldValue > 3) {
      opinions.push(`Moderate yield of ${yieldValue.toFixed(2)}% provides reasonable income.`);
    } else if (yieldValue > 0) {
      opinions.push(`Low yield of ${yieldValue.toFixed(2)}% suggests focus on growth rather than income.`);
    } else {
      opinions.push('This security currently pays no dividend.');
    }
  }
  
  // Add price momentum commentary if available
  if (stockData.fiftyDayAverageChangePercent) {
    const changePercent = stockData.fiftyDayAverageChangePercent * 100;
    const absChange = Math.abs(changePercent).toFixed(2);

    if (changePercent > 8) {
      opinions.push(`Good positive momentum with ${absChange}% gain compared to 50-day average.`);
    } else if (changePercent > 2) {
      opinions.push(`Slight positive momentum with ${absChange}% gain compared to 50-day average.`);
    } else if (changePercent < -8) {
      opinions.push(`Strong negative momentum with ${absChange}% loss compared to 50-day average.`);
    } else if (changePercent < -5) {
      opinions.push(`Concerning negative momentum with ${absChange}% loss compared to 50-day average.`);
    } else if (changePercent < -2) {
      opinions.push(`Slight negative momentum with ${absChange}% loss compared to 50-day average.`);
    }
  }
  
  // Market Cap/Net Assets Analysis
  if (stockData.marketCap) {
    const marketCap = stockData.marketCap;
    
    if (marketCap > 200_000_000_000) {
      opinions.push('This is a mega-cap stock with significant market presence.');
    } else if (marketCap > 10_000_000_000) {
      opinions.push('This is a large-cap stock with established market position.');
    } else if (marketCap > 2_000_000_000) {
      opinions.push('This is a mid-cap stock with growth potential.');
    } else if (marketCap > 300_000_000) {
      opinions.push('This is a small-cap stock that may offer growth opportunities but with higher volatility.');
    } else {
      opinions.push('This is a micro-cap stock with higher risk and potentially higher reward.');
    }
  } else if (stockData.totalNetAssets) {
    // ETF-specific analysis
    const netAssets = stockData.totalNetAssets;
    
    if (netAssets > 10_000_000_000) {
      opinions.push('This is a large ETF with substantial assets under management.');
    } else if (netAssets > 1_000_000_000) {
      opinions.push('This is a mid-size ETF with reasonable liquidity.');
    } else if (netAssets > 100_000_000) {
      opinions.push('This is a smaller ETF that may have less liquidity.');
    } else {
      opinions.push('This is a very small ETF which may have liquidity concerns.');
    }
  }
  
  // Add recommendation counts if available
  if (stockData.recommendationKey && stockData.recommendationKey !== 'Unknown' && 
      stockData.recommendationKey !== 'No recommendations available') {
    opinions.push(stockData.recommendationKey);
  }
  
  return opinions.join(' ');
}

/**
 * Retrieves stock quote and related information.
 * @param {string} symbol - Stock symbol
 * @returns {Promise<StockData|null>} - Stock data or null if not found
 */
export async function getStockQuote(symbol: string): Promise<StockData | null> {
  if (!symbol || typeof symbol !== 'string') {
    console.log('Invalid symbol provided to getStockQuote');
    return null;
  }
  
  try {
    // Standardize the symbol
    const normalizedSymbol = symbol.trim().toUpperCase();
    
    // Perform a fresh fetch from Yahoo Finance API
    const fetchStart = Date.now();
    
    try {
      // Get quote data and quoteSummary in parallel to reduce total time
      const [quote, quoteSummary] = await Promise.all([
        yahoofin.quote(normalizedSymbol) as Promise<YahooQuoteResult>,
        yahoofin.quoteSummary(normalizedSymbol, { 
          modules: ['recommendationTrend', 'summaryDetail', 'defaultKeyStatistics'] 
        }).catch(() => null)
      ]);
      
      // Get historical price data with a smaller range (2 weeks instead of a month)
      // and process dividend history in parallel
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 14); // Use 2 weeks instead of a month
      
      const [priceHistoryResult, dividendHistory] = await Promise.all([
        yahoofin.historical(normalizedSymbol, {
          period1: startDate,
          period2: endDate,
          interval: '1d'
        }),
        getDividendHistory(normalizedSymbol)
      ]);
      
      // Format price history data
      const priceHistory = priceHistoryResult.map(item => ({
        date: item.date.toISOString().split('T')[0],
        price: item.close
      }));
      
      // Determine if it's an ETF
      let isEtf = quote.quoteType === 'ETF';
      
      // Some ETFs are categorized as EQUITY but have "ETF" in their name
      if (!isEtf && (quote.shortName?.includes('ETF') || 
                     quote.shortName?.includes('Fund') || 
                     quote.longName?.includes('ETF') || 
                     quote.longName?.includes('Fund'))) {
        isEtf = true;
      }
      
      // Get net assets for ETFs asynchronously but don't wait for it
      let totalNetAssets = null;
      let netAssetsPromise = null;
      
      if (isEtf) {
        // Try to get net assets from quoteSummary first
        if (quoteSummary?.defaultKeyStatistics?.totalAssets) {
          totalNetAssets = quoteSummary.defaultKeyStatistics.totalAssets;
        } else {
          // Only fall back to scraping if not available from API
          netAssetsPromise = scrapeETFNetAssets(normalizedSymbol)
            .catch(() => null);
        }
      }
      
      // Calculate monthly change (as a percentage)
      let monthChange = 0;
      if (priceHistory.length >= 2) {
        const oldestPrice = priceHistory[0].price;
        const latestPrice = priceHistory[priceHistory.length - 1].price;
        monthChange = ((latestPrice - oldestPrice) / oldestPrice) * 100;
      }
      
      // Get recommendation key and yield rate from quoteSummary
      let recommendationKey = 'Unknown';
      let yieldRate = 0;
      
      if (quoteSummary) {
        // Extract recommendation trend data
        const trend = quoteSummary.recommendationTrend?.trend?.[0];
        if (trend) {
          recommendationKey = `Strong Buy: ${trend.strongBuy}, Buy: ${trend.buy}, Hold: ${trend.hold}, Sell: ${trend.sell}, Strong Sell: ${trend.strongSell}`;
        }
        
        // Get the yield rate from the API
        if (quoteSummary.summaryDetail?.dividendYield) {
          yieldRate = quoteSummary.summaryDetail.dividendYield * 100;
        }
      }
      
      // Calculate dividend yield percentage
      const dividendYield = calculateDividendYield(dividendHistory, quote.regularMarketPrice);
      
      // If yieldRate from Yahoo is 0 but our calculation is not, use our calculation
      if (yieldRate === 0 && dividendYield > 0) {
        yieldRate = dividendYield;
      }
      
      // Payment frequency
      const payFrequency = calculatePayFrequency(dividendHistory || []);
      
      // If we started a netAssets scrape, try to get the result now
      if (netAssetsPromise) {
        totalNetAssets = await netAssetsPromise;
      }
      
      const fetchEnd = Date.now();
      console.log(`Fetched data for ${normalizedSymbol} in ${fetchEnd - fetchStart}ms`);
      
      // Compile the data object
      const stockData: StockData = {
        symbol: normalizedSymbol,
        name: cleanStockName(quote.shortName || quote.longName || normalizedSymbol),
        longName: quote.longName ? cleanStockName(quote.longName) : undefined,
        regularMarketPrice: quote.regularMarketPrice || 0,
        dayChange: quote.regularMarketChangePercent,
        dividendHistory: dividendHistory || [],
        yieldRate: yieldRate,
        dividendYield: dividendYield,
        marketCap: quote.marketCap,
        monthChange: monthChange,
        fiftyDayAverageChangePercent: quote.fiftyDayAverageChangePercent,
        payFrequency: payFrequency,
        recommendationKey: recommendationKey,
        isEtf: isEtf,
        totalNetAssets: totalNetAssets,
        source: 'yahoo',
        fetchDate: new Date().toISOString(),
        priceHistory: priceHistory
      };
      
      // Generate algorithmic insight
      stockData.opinion = generateAlgorithmicInsight(stockData);
      
      return stockData;
    } catch (error: any) {
      // Simplified error logging without full stack trace
      console.log(`Error fetching data for ${normalizedSymbol}: ${error.message || 'Unknown error'}`);
      
      // Create an error response object that follows the StockData interface
      const errorData: StockData = {
        symbol: normalizedSymbol,
        name: normalizedSymbol,
        error: true,
        errorMessage: error.message || 'Failed to fetch stock data',
        dividendHistory: [],
        yieldRate: 0,
        dividendYield: 0,
        payFrequency: 'Unknown',
        recommendationKey: 'Unknown',
        isEtf: false,
        totalNetAssets: null,
        source: 'error',
        fetchDate: new Date().toISOString()
      };
      
      return errorData;
    }
  } catch (error) {
    // Simplified error logging
    console.log(`Unexpected error in getStockQuote for ${symbol}`);
    return null;
  }
}

/**
 * Retrieves ETF net assets information by scraping it from Yahoo Finance.
 * @param {string} symbol - ETF symbol
 * @returns {Promise<number|null>} - Net assets value in dollars or null if not found
 */
export async function scrapeETFNetAssets(symbol: string): Promise<number | null> {
  if (!symbol) return null;
  
  try {
    // First try the main quote page
    const response = await fetch(`https://finance.yahoo.com/quote/${symbol}`, {
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml',
        'Accept-Language': 'en-US,en;q=0.9',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate'
      }
    });
    
    if (response.ok) {
      const html = await response.text();
      let netAssets = extractNetAssetsFromHtml(html);
      
      if (netAssets !== null) {
        console.log(`Found net assets for ${symbol} from quote page: ${netAssets}`);
        return netAssets;
      }
      
      // Try multiple Yahoo Finance tabs sequentially
      const tabs = ['profile', 'holdings', 'performance', 'risk'];
      
      for (const tab of tabs) {
        try {
          const tabResponse = await fetch(`https://finance.yahoo.com/quote/${symbol}/${tab}`, {
            headers: {
              'Accept': 'text/html,application/xhtml+xml,application/xml',
              'Accept-Language': 'en-US,en;q=0.9',
              'Sec-Fetch-Dest': 'document',
              'Sec-Fetch-Mode': 'navigate'
            }
          });
          
          if (tabResponse.ok) {
            const tabHtml = await tabResponse.text();
            netAssets = extractNetAssetsFromHtml(tabHtml);
            
            if (netAssets !== null) {
              console.log(`Found net assets for ${symbol} from ${tab} page: ${netAssets}`);
              return netAssets;
            }
          }
        } catch (tabError) {
          console.log(`Error fetching ${tab} page for ${symbol}`);
        }
      }
      
      // Try API approach if scraping fails
      try {
        const fundProfile = await yahoofin.quoteSummary(symbol, { modules: ['fundProfile'] });
        
        if (fundProfile?.fundProfile?.feesExpensesInvestment?.totalNetAssets) {
          const apiNetAssets = fundProfile.fundProfile.feesExpensesInvestment.totalNetAssets * 1000000; // Convert to same scale
          console.log(`Found net assets for ${symbol} from API: ${apiNetAssets}`);
          return apiNetAssets;
        }
      } catch (apiError) {
        console.log(`API approach failed for ${symbol}`);
      }
    }
    
    console.log(`Could not find net assets for ${symbol} in Yahoo Finance`);
    return null;
  } catch (error) {
    // Simplified error message
    console.log(`Error scraping ETF assets for ${symbol}`);
    return null;
  }
}

/**
 * Helper function to extract net assets from HTML content
 * @param {string} html - HTML content from Yahoo Finance
 * @returns {number|null} - Extracted net assets value or null if not found
 */
function extractNetAssetsFromHtml(html: string): number | null {
  if (!html) return null;
  
  // Try multiple regex patterns to catch different format variations
  const patterns = [
    /Net Assets\s*<\/span>.*?>([\d,.]+[BMK]?)</i,
    /Total Net Assets.*?>([\d,.]+[BMK]?)</i,
    /Fund Total Assets.*?>([\d,.]+[BMK]?)</i,
    /AUM.*?>([\d,.]+[BMK]?)</i,
    /Assets Under Management.*?>([\d,.]+[BMK]?)</i,
    /Total Assets.*?>([\d,.]+[BMK]?)</i,
    /Fund AUM.*?>([\d,.]+[BMK]?)</i,
    /ETF Assets.*?>([\d,.]+[BMK]?)</i,
    /Fund Size.*?>([\d,.]+[BMK]?)</i,
    /Asset Value.*?>([\d,.]+[BMK]?)</i,
    /Net Asset Value.*?>([\d,.]+[BMK]?)</i
  ];
  
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      let value = match[1].replace(/,/g, '');
      let multiplier = 1;
      
      // Handle suffixes
      if (value.endsWith('B')) {
        value = value.replace('B', '');
        multiplier = 1_000_000_000;
      } else if (value.endsWith('M')) {
        value = value.replace('M', '');
        multiplier = 1_000_000;
      } else if (value.endsWith('K')) {
        value = value.replace('K', '');
        multiplier = 1_000;
      } else if (value.endsWith('T')) {
        value = value.replace('T', '');
        multiplier = 1_000_000_000_000;
      }
      
      const numericValue = parseFloat(value) * multiplier;
      if (!isNaN(numericValue) && numericValue > 0) {
        return numericValue;
      }
    }
  }
  
  return null;
}

/**
 * Helper function to clean stock names by removing ETF, Fund and Trust suffixes
 * @param {string} name - Original stock name
 * @returns {string} - Cleaned stock name
 */
function cleanStockName(name: string): string {
  if (!name) return '';
  
  // Remove ETF, Fund, Trust suffixes
  return name
    .replace(/\sETF$/i, '')
    .replace(/\sFund$/i, '')
    .replace(/\sTrust$/i, '')
    .trim();
} 