import { NextRequest, NextResponse } from 'next/server';
import { getStockQuote, StockData } from '@/services/data-service';
import { CONFIG } from '@/lib/config';

// GET handler for /api/stocks
export async function GET(request: NextRequest) {
  // Get the search params from the request URL
  const searchParams = request.nextUrl.searchParams;
  const symbolsQuery = searchParams.get('symbols');

  // If no symbols provided, return an error
  if (!symbolsQuery) {
    return NextResponse.json(
      { error: 'Missing required query parameter: symbols (comma-separated list)' }, 
      { status: 400 }
    );
  }

  // Parse and clean the symbols
  const symbols = symbolsQuery.split(',').map(s => s.trim().toUpperCase()).filter(s => s);

  if (symbols.length === 0) {
    return NextResponse.json(
      { error: 'No valid symbols provided in the query parameter.' }, 
      { status: 400 }
    );
  }

  // Create a response with appropriate headers for chunked transfer
  const response = new Response(
    new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        
        try {
          const successfulData: StockData[] = [];
          const failedSymbols: string[] = [];
          
          // Send initial response with a larger chunk size
          controller.enqueue(
            encoder.encode(
              JSON.stringify({
                type: 'init',
                total: symbols.length
              }) + '\n'.repeat(1024) // Add padding to force flush
            )
          );
          
          // Process each symbol individually
          for (let i = 0; i < symbols.length; i++) {
            const symbol = symbols[i];
            try {
              const result = await getStockQuote(symbol);
              
              if (result) {
                successfulData.push(result);
                
                // Send progress update with padding
                controller.enqueue(
                  encoder.encode(
                    JSON.stringify({
                      type: 'data',
                      current: i + 1,
                      total: symbols.length,
                      symbol: symbol,
                      data: result
                    }) + '\n'.repeat(1024) // Add padding to force flush
                  )
                );
              } else {
                failedSymbols.push(symbol);
                
                controller.enqueue(
                  encoder.encode(
                    JSON.stringify({
                      type: 'error',
                      current: i + 1,
                      total: symbols.length,
                      symbol: symbol,
                      error: `Failed to fetch data for ${symbol}`
                    }) + '\n'.repeat(1024)
                  )
                );
              }
            } catch (error) {
              failedSymbols.push(symbol);
              
              controller.enqueue(
                encoder.encode(
                  JSON.stringify({
                    type: 'error',
                    current: i + 1,
                    total: symbols.length,
                    symbol: symbol,
                    error: `Error processing ${symbol}`
                  }) + '\n'.repeat(1024)
                )
              );
            }
            
            // Add a small delay to help with buffering
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          
          // Send completion message
          controller.enqueue(
            encoder.encode(
              JSON.stringify({
                type: 'complete',
                total: symbols.length,
                successful: successfulData.length,
                failed: failedSymbols.length,
                failedSymbols: failedSymbols
              }) + '\n'
            )
          );
        } catch (error) {
          // Handle any unexpected errors
          controller.enqueue(
            encoder.encode(
              JSON.stringify({
                type: 'error',
                error: 'Internal server error while fetching stock data'
              }) + '\n'
            )
          );
        } finally {
          controller.close();
        }
      }
    }),
    {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // Disable Nginx buffering
        'Transfer-Encoding': 'chunked'
      }
    }
  );

  return response;
} 