import { NextRequest, NextResponse } from 'next/server';
import { getStockQuote } from '@/services/data-service';

interface RouteParams {
  params: {
    symbol: string;
  };
}

// GET handler for /api/stocks/[symbol]
export async function GET(
  request: NextRequest,
  { params }: { params: { symbol: string } }
) {
  // Get the symbol from the URL params
  const { symbol } = params;
  
  if (!symbol) {
    return NextResponse.json(
      { error: 'Missing required parameter: symbol' }, 
      { status: 400 }
    );
  }

  try {
    // Fetch data for the requested symbol
    const stockData = await getStockQuote(symbol);
    
    // Handle case when no data is returned or there's an error
    if (!stockData) {
      return NextResponse.json(
        { error: `No data found for symbol: ${symbol}` },
        { status: 404 }
      );
    }

    // Check if there was an error in the stock data
    if (stockData.error || !stockData.regularMarketPrice) {
      return NextResponse.json(
        { 
          ...stockData,
          error: true,
          errorMessage: stockData.errorMessage || `No valid market data found for symbol: ${symbol}`
        },
        { status: 200 } // Return 200 but with error flag for client handling
      );
    }
    
    // Return successful data
    return NextResponse.json(stockData);
  } catch (error: any) {
    // Simplified error handling without logging the full error
    return NextResponse.json(
      { error: `Failed to fetch data for ${symbol}` }, 
      { status: 500 }
    );
  }
} 