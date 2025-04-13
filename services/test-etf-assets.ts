import { scrapeETFNetAssets } from './data-service';

async function testETFNetAssets() {
  // Test a range of symbols including those that failed before
  const symbols = ['BGT', 'DIV', 'PAXS', 'PIN', 'AIPI', 'BMAX', 'JEPQ', 'SDIV', 'CONY', 'MSTY'];
  
  console.log('Testing ETF net assets scraping with improved regex patterns...\n');
  
  for (const symbol of symbols) {
    try {
      console.log(`Testing ${symbol}...`);
      let netAssets = await scrapeETFNetAssets(symbol);
      
      if (netAssets) {
        console.log(`SUCCESS: Found net assets for ${symbol}: ${netAssets.toLocaleString()}`);
      } else {
        console.log(`FAILED: Could not find net assets for ${symbol}`);
      }
      console.log('------------------------');
    } catch (error) {
      console.error(`ERROR for ${symbol}:`, error instanceof Error ? error.message : String(error));
      console.log('------------------------');
    }
  }
}

// Run the test
testETFNetAssets().catch(console.error); 