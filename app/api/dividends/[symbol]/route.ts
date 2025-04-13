import { NextRequest, NextResponse } from 'next/server';
import { getDividendHistory } from '@/services/data-service';

interface RouteParams {
  params: {
    symbol: string;
  };
}

// GET handler for /api/dividends/[symbol]
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { symbol } = params;
    
    // Get the search params from the request URL
    const searchParams = request.nextUrl.searchParams;
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    if (!symbol) {
      return NextResponse.json(
        { error: 'Stock symbol parameter is required.' }, 
        { status: 400 }
      );
    }

    const upperSymbol = symbol.toUpperCase();
    
    // Basic validation for date strings if provided
    const startDate = from && !isNaN(Date.parse(from)) ? new Date(from) : undefined;
    const endDate = to && !isNaN(Date.parse(to)) ? new Date(to) : undefined;

    const dividendData = await getDividendHistory(upperSymbol, startDate, endDate);

    if (dividendData !== null) { // Check for null (error) vs empty array (no dividends)
      return NextResponse.json(dividendData);
    } else {
      // getDividendHistory returns null if an error occurred during fetch
      return NextResponse.json(
        { error: `Failed to fetch dividend history for symbol: ${upperSymbol}` }, 
        { status: 500 }
      );
    }
  } catch (error) {
    console.error(`API /dividends/:symbol error for ${params.symbol}:`, error);
    return NextResponse.json(
      { error: 'Internal server error while fetching dividend data' }, 
      { status: 500 }
    );
  }
} 