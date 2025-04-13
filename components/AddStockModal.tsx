'use client';

import { useState, useEffect, useRef } from 'react';

interface AddStockModalProps {
  onClose: () => void;
  onAdd: (symbol: string) => void;
  isFetching?: boolean;
}

// Popular stock suggestions
const POPULAR_STOCKS = [
  { symbol: 'AAPL', name: 'Apple Inc.' },
  { symbol: 'MSFT', name: 'Microsoft Corporation' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.' },
  { symbol: 'META', name: 'Meta Platforms Inc.' },
  { symbol: 'TSLA', name: 'Tesla Inc.' },
  { symbol: 'NVDA', name: 'NVIDIA Corporation' },
  { symbol: 'JPM', name: 'JPMorgan Chase & Co.' },
  { symbol: 'JNJ', name: 'Johnson & Johnson' },
  { symbol: 'V', name: 'Visa Inc.' },
  { symbol: 'PG', name: 'Procter & Gamble Co.' },
  { symbol: 'KO', name: 'Coca-Cola Co.' },
  { symbol: 'DIS', name: 'Walt Disney Co.' },
  { symbol: 'VZ', name: 'Verizon Communications Inc.' },
  { symbol: 'MO', name: 'Altria Group Inc.' },
];

export default function AddStockModal({ onClose, onAdd, isFetching = false }: AddStockModalProps) {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<Array<{ symbol: string; name: string }>>([]);
  const [addedSymbols, setAddedSymbols] = useState<string[]>([]);
  const [pendingSymbol, setPendingSymbol] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  
  // Focus input when component mounts
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);
  
  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase();
    setInputValue(value);
    
    if (value.length > 0) {
      const filtered = POPULAR_STOCKS.filter(
        stock => stock.symbol.includes(value) || stock.name.toUpperCase().includes(value)
      );
      setSuggestions(filtered);
    } else {
      setSuggestions([]);
    }
  };
  
  // Handle suggestion click
  const handleSuggestionClick = (symbol: string) => {
    setInputValue(symbol);
    setSuggestions([]);
  };
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedValue = inputValue.trim();
    if (trimmedValue) {
      // Store the symbol we're trying to add
      setPendingSymbol(trimmedValue);
      
      // Call the parent component's add function
      onAdd(trimmedValue);
      
      // Clear input and suggestions
      setInputValue('');
      setSuggestions([]);
      
      // Re-focus the input for the next entry
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };
  
  // Track when fetching completes to update our added symbols list
  useEffect(() => {
    // When isFetching transitions from true to false and we have a pending symbol
    if (!isFetching && pendingSymbol) {
      // Check if there's an error message visible in the app
      const errorElement = document.querySelector('.alert.alert-danger');
      const infoElement = document.querySelector('.alert.alert-info');
      const isAlreadyInList = infoElement && infoElement.textContent?.includes('already in your list');
      
      if (!errorElement && !isAlreadyInList) {
        // Only add to our list if the symbol was successfully added
        // and not already in the list
        if (!addedSymbols.includes(pendingSymbol)) {
          setAddedSymbols(prev => [...prev, pendingSymbol]);
        }
      }
      
      // Clear the pending symbol
      setPendingSymbol(null);
    }
  }, [isFetching, pendingSymbol, addedSymbols]);
  
  // Close on escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
         style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', 
                 display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1050 }}>
      <div className="bg-white rounded-lg shadow-lg w-full mx-4" ref={modalRef}
           style={{ background: 'white', borderRadius: '0.5rem', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', 
                   maxWidth: '450px', width: '100%', maxHeight: '90vh', 
                   margin: '0 auto', fontFamily: 'Poppins, sans-serif' }}>
        
        {/* Header */}
        <div className="border-b flex justify-between items-center"
             style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #ecf0f1', 
                     display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                     background: '#34495e', color: 'white', borderRadius: '0.5rem 0.5rem 0 0' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 500, color: 'white', margin: 0 }}>Add Stocks</h3>
          <button onClick={onClose}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', 
                          fontSize: '1.25rem', color: 'white', padding: '0 0.25rem', lineHeight: 1 }}>
            ×
          </button>
        </div>
        
        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ padding: '0.75rem 1rem', flex: '1 1 auto', overflowY: 'auto' }}>
            <label htmlFor="stock-symbol"
                   style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: '#2c3e50', fontSize: '0.9rem' }}>
              Stock Symbol
            </label>
            
            <div style={{ position: 'relative' }}>
              <input
                id="stock-symbol"
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                placeholder="Enter symbol (e.g., AAPL, MSFT)"
                style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1px solid #d1d5db', 
                         borderRadius: '0.375rem', outline: 'none', color: '#2c3e50', fontSize: '0.9rem' }}
                required
              />
              
              {/* Suggestions dropdown */}
              {suggestions.length > 0 && (
                <div style={{ position: 'absolute', left: 0, right: 0, marginTop: '0.25rem',
                             background: 'white', border: '1px solid #ecf0f1', borderRadius: '0.375rem',
                             boxShadow: '0 4px 6px rgba(0,0,0,0.1)', zIndex: 10, 
                             maxHeight: '10rem', overflowY: 'auto' }}>
                  {suggestions.map(stock => (
                    <div
                      key={stock.symbol}
                      style={{ padding: '0.5rem 0.75rem', cursor: 'pointer', borderBottom: '1px solid #ecf0f1' }}
                      onClick={() => handleSuggestionClick(stock.symbol)}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, color: '#2c3e50', fontSize: '0.9rem' }}>{stock.symbol}</span>
                        <span style={{ color: '#7f8c8d', fontSize: '0.8rem', marginLeft: '0.5rem', textAlign: 'right' }}>
                          {stock.name}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {addedSymbols.length > 0 && (
              <div style={{ marginTop: '0.75rem' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 500, color: '#2c3e50', marginBottom: '0.4rem' }}>
                  Successfully added in this session ({addedSymbols.length}):
                </div>
                <div style={{ 
                  display: 'flex', 
                  flexWrap: 'wrap', 
                  gap: '0.3rem',
                  maxHeight: '3.5rem',
                  overflowY: 'auto',
                  padding: '0.3rem',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.25rem',
                  backgroundColor: '#f9fafb'
                }}>
                  {addedSymbols.map(symbol => (
                    <span key={symbol} style={{
                      padding: '0.2rem 0.4rem',
                      backgroundColor: '#e5e7eb',
                      borderRadius: '0.2rem',
                      fontSize: '0.8rem',
                      fontWeight: 500,
                      color: '#374151'
                    }}>
                      {symbol}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            <p style={{ fontSize: '0.8rem', color: '#7f8c8d', marginTop: '0.75rem' }}>
              Enter stock symbols one at a time. These stocks will stay in your list until you delete them or reset. Press Done when you are finished adding stocks.
            </p>
          </div>
          
          {/* Footer */}
          <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid #ecf0f1', 
                       display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: '0.4rem 0.75rem', border: '1px solid #d1d5db', 
                      borderRadius: '0.25rem', background: 'white', color: '#2c3e50',
                      cursor: 'pointer', fontWeight: 500, fontSize: '0.8rem' }}
              disabled={isFetching}
            >
              Done
            </button>
            <button
              type="submit"
              style={{ padding: '0.4rem 0.75rem', background: '#0d6efd', color: 'white',
                      borderRadius: '0.25rem', border: 'none', cursor: 'pointer',
                      fontWeight: 500, fontSize: '0.8rem' }}
              disabled={isFetching || !inputValue.trim()}
            >
              {isFetching ? 'Adding...' : 'Add Stock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 