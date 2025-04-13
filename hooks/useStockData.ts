import { StockData } from '@/services/data-service';
import { CONFIG } from '@/lib/config';
import { useState, useEffect, useRef, useCallback } from 'react';

// Hook for managing multiple stocks with optimized fetching
export function useMultipleStocks(initialSymbols: string[] = CONFIG.stockSymbols) {
  // Use a ref for the stock data cache to persist between renders
  const stocksCache = useRef<Record<string, StockData>>({});
  
  // Get initial symbols from localStorage or use provided initialSymbols
  const getInitialSymbols = () => {
    if (typeof window !== 'undefined') {
      const savedSymbols = localStorage.getItem('stockSymbols');
      if (savedSymbols) {
        try {
          return JSON.parse(savedSymbols);
        } catch (e) {
          console.error('Failed to parse saved stock symbols:', e);
        }
      }
    }
    return initialSymbols;
  };
  
  // Keep local state of active symbols
  const [activeSymbols, setActiveSymbols] = useState(getInitialSymbols);
  
  // Save to localStorage whenever activeSymbols changes
  useEffect(() => {
    if (typeof window !== 'undefined' && activeSymbols) {
      localStorage.setItem('stockSymbols', JSON.stringify(activeSymbols));
    }
  }, [activeSymbols]);
  
  // State to track loaded stock data - important for re-renders
  const [stocksData, setStocksData] = useState<StockData[]>([]);
  
  // Progress tracking for batch operations only
  const [progress, setProgress] = useState({
    current: 0,
    total: 0,
    status: 'complete' as 'starting' | 'fetching' | 'error' | 'complete',
    currentSymbol: undefined as string | undefined
  });
  
  // For loading state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  // Track if this is the first load
  const isFirstLoad = useRef(true);
  
  // Keep track of previous stocks data for comparison
  const prevStocksDataRef = useRef<string>('');
  
  // Update stocksData whenever activeSymbols or cache changes
  useEffect(() => {
    // After a reset, the cache might be empty, and we should just set stocksData to empty
    if (Object.keys(stocksCache.current).length === 0) {
      setStocksData([]);
      return;
    }
    
    const currentStocks = Object.values(stocksCache.current)
      .filter(stock => stock && activeSymbols.includes(stock.symbol));
    
    const currentStocksJSON = JSON.stringify(currentStocks);
    
    // Only update state if there's an actual change to avoid render loops
    if (currentStocksJSON !== prevStocksDataRef.current) {
      prevStocksDataRef.current = currentStocksJSON;
      setStocksData(currentStocks);
    }
  }, [activeSymbols, Object.keys(stocksCache.current).length]);
  
  // Memoized function to fetch a single stock
  const fetchSingleStock = useCallback(async (symbol: string): Promise<StockData | null> => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/stocks/${symbol}`);
      if (!response.ok) throw new Error(`Failed to fetch ${symbol}`);
      
      const data = await response.json();
      
      // Update the cache
      stocksCache.current[symbol] = data;
      
      // Trigger stocksData update by updating the state directly
      setStocksData(current => {
        const existing = current.findIndex(s => s.symbol === symbol);
        if (existing >= 0) {
          const updated = [...current];
          updated[existing] = data;
          return updated;
        } else {
          return [...current, data];
        }
      });
      
      setIsLoading(false);
      return data;
    } catch (err) {
      console.error(`Error fetching ${symbol}:`, err);
      setError(err instanceof Error ? err : new Error(String(err)));
      setIsLoading(false);
      
      // Create an error object that matches StockData structure
      const errorData: StockData = {
        symbol: symbol,
        error: true,
        errorMessage: err instanceof Error ? err.message : String(err),
        dividendHistory: [],
        yieldRate: 0,
        dividendYield: 0,
        payFrequency: '',
        recommendationKey: '',
        source: '',
        fetchDate: new Date().toISOString(),
        isEtf: false,
        totalNetAssets: null
      };
      
      return errorData;
    }
  }, []);
  
  // Function to reset to a specific list of symbols
  const resetToSymbols = useCallback(async (symbols: string[]) => {
    try {
      // Normalize symbols
      const normalizedSymbols = symbols
        .map(s => s.trim().toUpperCase())
        .filter(s => s.length > 0);
      
      setIsLoading(true);
      setError(null);
      
      // Initialize progress for reset operation
      setProgress({
        current: 0,
        total: normalizedSymbols.length,
        status: 'fetching',
        currentSymbol: 'Resetting symbols...'
      });
      
      // Clear all data and cache first
      stocksCache.current = {};
      setStocksData([]);
      
      // Set the normalized symbols
      setActiveSymbols(normalizedSymbols);
      
      // Clear localStorage if resetting to default symbols
      if (JSON.stringify(normalizedSymbols.sort()) === JSON.stringify([...CONFIG.stockSymbols].sort())) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('stockSymbols');
        }
      }
      
      // Wait a moment for state updates to complete
      await new Promise(r => setTimeout(r, 100));
      
      // Now fetch the data for all symbols
      await fetchAllStocks(normalizedSymbols);
      
      return {
        success: true,
        symbols: normalizedSymbols
      };
    } catch (err: any) {
      setError(new Error(`Failed to reset symbols: ${err.message}`));
      setProgress(prev => ({
        ...prev,
        status: 'error',
        currentSymbol: `Error: ${err.message}`
      }));
      return {
        success: false,
        error: err.message
      };
    }
  }, []);
  
  // Function to fetch all stocks in bulk (used for initial load and refresh all)
  const fetchAllStocks = useCallback(async (symbolsToFetch?: string[]) => {
    try {
      const symbols = symbolsToFetch || [...activeSymbols];
      
      if (symbols.length === 0) {
        return { success: true, message: 'No symbols to fetch' };
      }
      
      setIsLoading(true);
      setError(null);
      
      // Initialize progress for fetch operation if not already set
      setProgress(prev => {
        if (prev.status !== 'fetching') {
          return {
            current: 0,
            total: symbols.length,
            status: 'fetching',
            currentSymbol: 'Starting data fetch...'
          };
        }
        return prev;
      });
      
      // Only clear existing stock data if we're not in the middle of a reset
      if (!symbolsToFetch) {
        setStocksData([]);
      }
      
      let completedCount = 0;
      const newStockData: StockData[] = [];
      
      // Process symbols sequentially to better track progress
      for (let i = 0; i < symbols.length; i++) {
        const symbol = symbols[i];
        
        try {
          // Update progress before fetching
          setProgress(prev => ({
            ...prev,
            current: i,
            currentSymbol: `Loading ${symbol}`
          }));
          
          const response = await fetch(`/api/stocks/${symbol}`);
          
          if (!response.ok) {
            throw new Error(`API error: ${response.statusText}`);
          }
          
          const data = await response.json();
          
          // Only process if symbol is still in the current list
          if (symbols.includes(data.symbol)) {
            // Update the cache
            stocksCache.current[data.symbol] = data;
            newStockData.push(data);
            
            // Incrementally update the displayed data
            setStocksData(current => {
              const existing = current.findIndex(s => s.symbol === data.symbol);
              if (existing >= 0) {
                const updated = [...current];
                updated[existing] = data;
                return updated;
              } else {
                return [...current, data];
              }
            });
            
            // Update progress
            completedCount++;
            setProgress(prev => ({
              ...prev,
              current: completedCount,
              currentSymbol: `Loaded ${data.symbol}`
            }));
          }
        } catch (error: any) {
          console.error(`Error fetching ${symbol}:`, error);
          completedCount++;
          setProgress(prev => ({
            ...prev,
            current: completedCount,
            currentSymbol: `Error loading ${symbol}`
          }));
        }
      }
      
      // If no data was loaded, set the error
      if (newStockData.length === 0 && symbols.length > 0) {
        setError(new Error(`Failed to fetch any stock data. Please check your network connection.`));
        setProgress(prev => ({
          ...prev,
          status: 'error',
          currentSymbol: 'Failed to load any data'
        }));
        return {
          success: false,
          failedSymbols: symbols
        };
      }
      
      // If some symbols failed, set a warning
      if (newStockData.length < symbols.length) {
        const failedCount = symbols.length - newStockData.length;
        setError(new Error(`Failed to fetch ${failedCount} out of ${symbols.length} stocks`));
      } else {
        setError(null);
      }
      
      return {
        success: newStockData.length === symbols.length,
        failedSymbols: symbols.filter(s => !newStockData.some(d => d.symbol === s))
      };
    } catch (err: any) {
      setError(new Error(`Failed to fetch stocks: ${err.message}`));
      setProgress(prev => ({
        ...prev,
        status: 'error',
        currentSymbol: `Error: ${err.message}`
      }));
      return {
        success: false,
        error: err.message
      };
    } finally {
      setIsLoading(false);
      setProgress(prev => ({
        ...prev,
        status: 'complete',
        currentSymbol: 'Completed'
      }));
    }
  }, [activeSymbols]);
  
  // Function to add a stock
  const addStock = useCallback(async (symbol: string): Promise<StockData | null> => {
    if (!symbol) return null;
    
    const normalizedSymbol = symbol.toUpperCase();
    
    // Check if already in list - return early with existing data
    if (activeSymbols.includes(normalizedSymbol)) {
      return stocksCache.current[normalizedSymbol] || null;
    }
    
    // Fetch the stock data
    const stockData = await fetchSingleStock(normalizedSymbol);
    
    // Only update the active symbols if fetch was successful and there's no error
    if (stockData && !stockData.error) {
      setActiveSymbols((prev: string[]) => [...prev, normalizedSymbol]);
    } else {
      // If there was an error, remove it from the cache to prevent bad data
      if (stocksCache.current[normalizedSymbol]) {
        const newCache = { ...stocksCache.current };
        delete newCache[normalizedSymbol];
        stocksCache.current = newCache;
      }
    }
    
    return stockData;
  }, [activeSymbols, fetchSingleStock]);
  
  // Function to remove a stock
  const removeStock = useCallback((symbol: string) => {
    // Update active symbols
    setActiveSymbols((prev: string[]) => {
      const newList = prev.filter((s: string) => s !== symbol);
      return newList;
    });
    
    // Remove from cache as well
    if (stocksCache.current[symbol]) {
      const newCache = { ...stocksCache.current };
      delete newCache[symbol];
      stocksCache.current = newCache;
      
      // Update stocksData by removing the symbol
      setStocksData(current => current.filter(stock => stock.symbol !== symbol));
    }
  }, []);
  
  return {
    // Data and state
    stocks: stocksData,
    isLoading,
    error,
    progress,
    // Actions
    addStock,
    removeStock,
    refreshAll: fetchAllStocks,
    refreshStock: fetchSingleStock,
    resetToSymbols,
    // For direct manipulation when needed
    setActiveSymbols
  };
} 