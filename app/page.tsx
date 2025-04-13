'use client';

import { useState, useEffect } from 'react';
import { CONFIG } from '../lib/config';
import StockTable from '../components/StockTable';
import AddStockModal from '../components/AddStockModal';
import ProgressBar from '../components/ProgressBar';
import { useMultipleStocks } from '@/hooks/useStockData';
import { StockData } from '@/services/data-service';

interface FetchProgress {
  current: number;
  total: number;
  status: 'starting' | 'fetching' | 'error' | 'complete';
  symbol?: string;
  error?: string;
  errors?: Array<{ symbol: string; error: string }>;
}

export default function HomePage() {
  // We no longer need to track activeSymbols separately, it's managed inside the hook 
  const { 
    stocks, 
    isLoading, 
    error, 
    progress, 
    addStock, 
    removeStock, 
    refreshAll,
    resetToSymbols
  } = useMultipleStocks(CONFIG.stockSymbols);

  // Track displayed stocks separately from what's being fetched
  const [displayedStocks, setDisplayedStocks] = useState<StockData[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [systemMessage, setSystemMessage] = useState<{
    type: 'info' | 'success' | 'warning' | 'danger';
    message: string;
  } | null>(null);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [sortField, setSortField] = useState<keyof StockData>(() => {
    if (typeof window !== 'undefined') {
      const savedSortField = localStorage.getItem('sortField');
      return savedSortField ? (savedSortField as keyof StockData) : CONFIG.defaultSortField;
    }
    return CONFIG.defaultSortField;
  });
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(() => {
    if (typeof window !== 'undefined') {
      const savedSortDirection = localStorage.getItem('sortDirection');
      return (savedSortDirection as 'asc' | 'desc') || CONFIG.defaultSortDirection;
    }
    return CONFIG.defaultSortDirection;
  });
  const [resetAnimations, setResetAnimations] = useState<boolean>(false);
  const [isAddingStock, setIsAddingStock] = useState<boolean>(false);

  // Initialize lastUpdated after mount to avoid hydration mismatch
  useEffect(() => {
    setLastUpdated(new Date().toUTCString());
  }, []);

  // Automatically fetch data on page load
  useEffect(() => {
    // Fetch all stock data when the component mounts
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update displayed stocks when the source stocks change
  useEffect(() => {
    if (stocks && Array.isArray(stocks)) {
      if (stocks.length > 0) {
        // Deep clone to avoid reference issues
        const stocksCopy = JSON.parse(JSON.stringify(stocks));
        
        // Filter out any stocks with errors
        const validStocks = stocksCopy.filter((stock: StockData) => !stock.error);
        
        // Sort the stocks according to current settings
        const sortedStocks = sortStockData(validStocks, sortField, sortDirection);
        
        // Update displayedStocks with the sorted data
        setDisplayedStocks(sortedStocks);
      } else {
        // Clear displayed stocks if source stocks are empty
        setDisplayedStocks([]);
      }
      
      // Always update the timestamp when the stocks array changes
      setLastUpdated(new Date().toUTCString());
    }
  }, [stocks, sortField, sortDirection]);

  // Add an effect to auto-clear system messages after a short delay
  useEffect(() => {
    if (systemMessage) {
      // Set different timeouts based on message type
      const timeout = systemMessage.type === 'danger' || systemMessage.type === 'warning' 
        ? 5000   // 5 seconds for errors and warnings
        : 2500;  // 2.5 seconds for success and info messages
      
      const timer = setTimeout(() => {
        setSystemMessage(null);
      }, timeout);
      
      return () => clearTimeout(timer);
    }
  }, [systemMessage]);

  // Add an effect to save sort preferences to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sortField', sortField as string);
      localStorage.setItem('sortDirection', sortDirection);
    }
  }, [sortField, sortDirection]);

  // Function to sort stock data
  const sortStockData = (data: StockData[], field: keyof StockData, direction: 'asc' | 'desc') => {
    // Don't sort if no data
    if (!data || data.length === 0) {
      return [];
    }
    
    // Make a defensive copy
    const dataCopy = [...data];
    
    // Sort the copy
    dataCopy.sort((a, b) => {
      // Special handling for market cap which can be in marketCap or totalNetAssets field
      if (field === 'marketCap') {
        const aValue = a?.marketCap !== undefined ? a.marketCap : (a?.totalNetAssets !== undefined ? a.totalNetAssets : -Infinity);
        const bValue = b?.marketCap !== undefined ? b.marketCap : (b?.totalNetAssets !== undefined ? b.totalNetAssets : -Infinity);
        
        // If both values are undefined, sort by symbol
        if (aValue === -Infinity && bValue === -Infinity) {
          return a.symbol.localeCompare(b.symbol);
        }
        
        // Handle sorting direction
        if (direction === 'asc') {
          return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
        } else {
          return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
        }
      } else {
        // Handle other fields normally
        const aValue = a && a[field] !== undefined ? a[field] : -Infinity;
        const bValue = b && b[field] !== undefined ? b[field] : -Infinity;
        
        // If both values are undefined, sort by symbol
        if (aValue === -Infinity && bValue === -Infinity) {
          return a.symbol.localeCompare(b.symbol);
        }
        
        // Handle sorting direction
        if (direction === 'asc') {
          return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
        } else {
          return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
        }
      }
    });
    
    return dataCopy;
  };

  // Function to add a new stock
  const handleAddStock = async (symbol: string) => {
    if (!symbol) return;
    
    try {
      // Get the symbol in uppercase
      const upperSymbol = symbol.toUpperCase();
      
      // First check if the stock is already in the displayed list
      if (displayedStocks.some(stock => stock.symbol === upperSymbol)) {
        setSystemMessage({
          type: 'info',
          message: `${upperSymbol} is already in your list`
        });
        // Don't close the modal
        return;
      }
      
      // Update the UI to show we're working on fetching the data
      setSystemMessage({
        type: 'info',
        message: `Fetching data for ${upperSymbol}...`
      });
      
      // Don't close the modal
      // setShowAddModal(false);
      
      // Set flag to indicate we're adding a single stock
      setIsAddingStock(true);
      
      // Fetch the stock data to verify it exists
      const stockData = await addStock(upperSymbol);
      
      // Reset the flag after completion
      setIsAddingStock(false);
      
      // Check if the stock was found and has valid data
      if (!stockData || stockData.error) {
        // If stock not found or has error, don't add it to the active list
        throw new Error(stockData?.errorMessage || `Symbol doesn't exist or has been delisted`);
      }
      
      setSystemMessage({
        type: 'success',
        message: `Added ${upperSymbol} successfully and sorted according to the current sorting order!`
      });
    } catch (error: any) {
      // Make sure flag is reset even on error
      setIsAddingStock(false);
      
      setSystemMessage({
        type: 'danger',
        message: error.message || `Symbol doesn't exist or has been delisted`
      });
    }
  };

  // Function to delete a stock
  const handleDeleteStock = (symbol: string) => {
    if (window.confirm(`Are you sure you want to remove ${symbol} from your list?`)) {
      // Remove the stock using our hook method
      removeStock(symbol);
      
      setSystemMessage({
        type: 'info',
        message: `Removed ${symbol} from your list`
      });
    }
  };

  // Function to handle sorting
  const handleSort = (field: keyof StockData) => {
    // Toggle direction if same field, otherwise default to descending
    const newDirection = field === sortField 
      ? (sortDirection === 'desc' ? 'asc' : 'desc') 
      : 'desc';
    
    // Update sort parameters - this will trigger the useEffect that sorts the stocks
    setSortField(field);
    setSortDirection(newDirection);
  };

  // Function to handle printing
  const handlePrint = () => {
    window.print();
  };

  // Function to reset to original stocks
  const handleReset = async () => {
    if (window.confirm('Are you sure you want to reset to the original stock list?')) {
      try {
        setSystemMessage({
          type: 'info',
          message: 'Resetting to original stock list...'
        });
        
        // First, clear displayed stocks to avoid showing stale data
        setDisplayedStocks([]);
        
        // Reset sort preferences to defaults
        setSortField(CONFIG.defaultSortField);
        setSortDirection(CONFIG.defaultSortDirection);
        
        // Clear sort preferences from localStorage
        if (typeof window !== 'undefined') {
          localStorage.removeItem('sortField');
          localStorage.removeItem('sortDirection');
        }
        
        // Reset to original config symbols - this already fetches the data internally
        await resetToSymbols(CONFIG.stockSymbols);
        
        // Update last updated timestamp
        setLastUpdated(new Date().toUTCString());
        
        setSystemMessage({
          type: 'success',
          message: 'Successfully reset to original stock list'
        });
      } catch (error) {
        setSystemMessage({
          type: 'danger',
          message: 'Failed to reset stock list'
        });
      }
    }
  };

  // Handle "Fetch Data" button click
  const handleFetchData = async () => {
    setSystemMessage({
      type: 'info',
      message: 'Fetching latest stock data...'
    });
    
    try {
      // Just refresh all stocks
      await refreshAll();
      
      setSystemMessage({
        type: 'success',
        message: 'Data updated successfully!'
      });
    } catch (error) {
      setSystemMessage({
        type: 'danger',
        message: 'Failed to fetch stock data'
      });
    }
  };

  return (
    <div className="container my-4">
      <div className="text-center mb-4">
        <h1 className="mb-0" style={{ color: '#2C3E50' }}>Stock Dividend Tracker</h1>
        {lastUpdated && (
          <small className="text-muted d-block mt-1">Last updated: {lastUpdated}</small>
        )}
      </div>
      
      <div className="mb-3 d-flex justify-content-between align-items-center flex-wrap">
        <div className="d-flex flex-wrap mb-2 mb-md-0">
          <button 
            className="btn btn-success me-2 mb-2" 
            onClick={handleFetchData}
            disabled={isLoading}
          >
            {isLoading ? 'Fetching...' : 'Fetch New Data'} 
          </button>
          <button 
            className="btn btn-secondary me-2 mb-2" 
            onClick={handlePrint}
          >
            Print
          </button>
          <button 
            className="btn btn-secondary me-2 mb-2" 
            onClick={handleReset}
            disabled={isLoading}
          >
            Reset
          </button>
          <button 
            className="btn btn-secondary me-2 mb-2" 
            onClick={() => setShowAddModal(true)}
            disabled={isLoading}
          >
            Add Stock
          </button>
        </div>
        <div className="mx-1">
          {displayedStocks.length > 0 && (
            <small><strong>{displayedStocks.length}</strong> stocks loaded</small>
          )}
        </div>
      </div>
      
      {(isLoading || progress.status !== 'complete') && !isAddingStock && (
        <ProgressBar 
          current={progress.current}
          total={progress.total}
          status={progress.status}
          currentSymbol={progress.currentSymbol}
        />
      )}
      
      <StockTable 
        stocks={displayedStocks} 
        isLoading={isLoading}
        showLoadingSpinner={isLoading && displayedStocks.length === 0}
        onDelete={handleDeleteStock}
        onSort={handleSort}
        resetAnimations={resetAnimations}
        currentSortField={sortField as string}
        currentSortDirection={sortDirection}
      />
      
      {showAddModal && (
        <AddStockModal 
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddStock}
          isFetching={isLoading}
        />
      )}
      
      {systemMessage && (
        <div 
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 1050,
            maxWidth: '80%',
            width: 'auto'
          }} 
          className={`alert alert-${systemMessage.type} fade show`} 
          role="alert"
        >
          {systemMessage.message}
        </div>
      )}
    </div>
  );
} 