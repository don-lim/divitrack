'use client';

import { useEffect, useRef, useState } from 'react';
import { Chart, registerables } from 'chart.js';
import { StockData } from '@/services/data-service';

// Register Chart.js components
Chart.register(...registerables);

// CSS-in-JS styles for animations and other styling
const fadeInAnimation = {
  from: {
    opacity: 0,
    backgroundColor: 'rgba(13, 110, 253, 0.1)'
  },
  to: {
    opacity: 1,
    backgroundColor: 'transparent'
  }
};

const animatedRowStyle = {
  animation: 'fadeIn 0.5s ease-in-out forwards',
  opacity: 0
};

const highYieldStyle = {
  fontWeight: 'bold'
};

// Sticky symbol style with pulsing opacity animation and floating behavior
const stickyStickerStyle = {
  display: 'none', // Hidden by default
  position: 'absolute' as const, 
  top: '2px',
  left: '2px',
  backgroundColor: 'transparent',
  padding: '2px 6px',
  borderRadius: '3px',
  fontSize: '0.8rem',
  fontWeight: 'bold',
  zIndex: 10,
  color: '#666', // Gray text
  width: 'fit-content',
  animation: 'pulse 2.5s infinite ease-in-out'
};

// Add a global style for the animation and print styles
if (typeof document !== 'undefined') {
  // Create the main style element
  const styleElement = document.createElement('style');
  styleElement.textContent = `
    @keyframes fadeIn {
      from {
        opacity: 0;
        background-color: rgba(13, 110, 253, 0.1);
      }
      to {
        opacity: 1;
        background-color: transparent;
      }
    }
    
    @keyframes pulse {
      0% { opacity: 0.6; }
      50% { opacity: 1; }
      100% { opacity: 0.6; }
    }
    
    @media print {
      .no-print, .sticky-symbol {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        position: absolute !important;
        width: 0 !important;
        height: 0 !important;
        overflow: hidden !important;
        z-index: -9999 !important;
        pointer-events: none !important;
      }
    }
    
    /* Show sticky symbol on horizontal scroll on small screens */
    @media (max-width: 992px) {
      .table-responsive {
        position: relative;
      }
      
      /* Show the sticky symbol when scrolled horizontally */
      .table-responsive.is-scrolled-x .sticky-symbol {
        display: block !important;
      }
    }
  `;
  document.head.appendChild(styleElement);
  
  // Create a print-specific style with !important rules
  const printStyle = document.createElement('style');
  printStyle.media = 'print';
  printStyle.textContent = `
    /* Extra-strength print hiding for sticky symbols */
    .sticky-symbol {
      display: none !important;
      visibility: hidden !important;
      opacity: 0 !important;
      position: absolute !important;
      width: 0 !important;
      height: 0 !important;
      overflow: hidden !important;
      z-index: -9999 !important;
      pointer-events: none !important;
      clip: rect(0, 0, 0, 0) !important;
      margin: -1px !important;
      padding: 0 !important;
      border: 0 !important;
    }
  `;
  document.head.appendChild(printStyle);
  
  // Add scroll detection for mobile
  if (typeof document !== 'undefined' && typeof window !== 'undefined') {
    setTimeout(() => {
      const tableContainer = document.querySelector('.table-responsive');
      if (tableContainer) {
        tableContainer.addEventListener('scroll', () => {
          // Adjust threshold based on first column width
          const threshold = 100; 
          if (tableContainer.scrollLeft > threshold) {
            tableContainer.classList.add('is-scrolled-x');
          } else {
            tableContainer.classList.remove('is-scrolled-x');
          }
        });
      }
    }, 1000); // Wait for DOM to be ready
  }
}

interface StockTableProps {
  stocks: StockData[];
  isLoading: boolean;
  showLoadingSpinner: boolean;  // For initial loading state
  onDelete: (symbol: string) => void;
  onSort: (field: string) => void;
  resetAnimations?: boolean;  // New prop to trigger animations on data refresh
  currentSortField?: string;  // Changed from keyof StockData to string
  currentSortDirection?: 'asc' | 'desc';  // Current sort direction from parent
}

export default function StockTable({ 
  stocks, 
  isLoading, 
  showLoadingSpinner, 
  onDelete, 
  onSort,
  resetAnimations = false,  // Default to false
  currentSortField,
  currentSortDirection
}: StockTableProps) {
  const chartRefs = useRef<Record<string, Chart | null>>({});
  
  // Initialize from props or use defaults
  const [sortField, setSortField] = useState<string>(
    currentSortField || 'dividendYield'
  );
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(
    currentSortDirection || 'desc'
  );
  
  // Update local state when props change
  useEffect(() => {
    if (currentSortField) {
      setSortField(currentSortField);
    }
    if (currentSortDirection) {
      setSortDirection(currentSortDirection);
    }
  }, [currentSortField, currentSortDirection]);

  const [animatedSymbols, setAnimatedSymbols] = useState<Set<string>>(new Set());

  // Reset animations when resetAnimations prop changes
  useEffect(() => {
    if (resetAnimations) {
      setAnimatedSymbols(new Set());
    }
  }, [resetAnimations]);
  
  // Reset animations when stocks array changes dramatically
  useEffect(() => {
    // Reset animations if stocks array is empty or completely different
    if (stocks.length === 0) {
      setAnimatedSymbols(new Set());
    }
  }, [stocks.length]);

  // Function to check if a stock should be animated (it's newly added)
  const shouldAnimate = (symbol: string) => {
    // Only animate brand new symbols
    if (animatedSymbols.has(symbol)) {
      return false;
    }
    
    // Mark as animated
    setAnimatedSymbols(prev => {
      const updated = new Set(prev);
      updated.add(symbol);
      return updated;
    });
    
    return true;
  };

  // Function to format currency
  const formatCurrency = (value: number | undefined): string => {
    if (value === undefined) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  // Function to format large numbers (like market cap)
  const formatLargeNumber = (value: number | undefined): string => {
    if (value === undefined) return 'N/A';
    
    if (value >= 1_000_000_000_000) {
      return `$${(value / 1_000_000_000_000).toFixed(2)}T`;
    } else if (value >= 1_000_000_000) {
      return `$${(value / 1_000_000_000).toFixed(2)}B`;
    } else if (value >= 1_000_000) {
      return `$${(value / 1_000_000).toFixed(2)}M`;
    } else if (value >= 1_000) {
      return `$${(value / 1_000).toFixed(2)}K`;
    } else {
      return formatCurrency(value);
    }
  };

  // Function to format percentage
  const formatPercentage = (value: number | undefined): string => {
    if (value === undefined) return 'N/A';
    return `${value.toFixed(2)}%`;
  };

  // Handle sorting
  const handleSort = (field: string) => {
    const newDirection = field === sortField ? (sortDirection === 'desc' ? 'asc' : 'desc') : 'desc';
    setSortField(field);
    setSortDirection(newDirection);
    onSort(field);
  };

  // Function to get sort arrow
  const getSortArrow = (field: string) => {
    if (field !== sortField) return '↕';
    return sortDirection === 'desc' ? '↓' : '↑';
  };

  // Function to create dividend chart
  const createDividendChart = (symbol: string, dividendHistory?: Array<{ date: string; amount: number }>) => {
    if (!dividendHistory || dividendHistory.length === 0) return;
    
    const canvas = document.getElementById(`${symbol}-chart`) as HTMLCanvasElement;
    if (!canvas) return;

    // Cleanup existing chart if it exists
    if (chartRefs.current[symbol]) {
      chartRefs.current[symbol]?.destroy();
    }

    // Sort by date (oldest first for chart)
    const sortedDividends = [...dividendHistory].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    // Use at most the last 8 dividends to keep the chart readable
    const limitedDividends = sortedDividends.slice(-8);

    const labels = limitedDividends.map(div => {
      const date = new Date(div.date);
      return date.toLocaleDateString();
    });

    const data = limitedDividends.map(div => div.amount);

    const chartConfig = {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Dividend Amount',
          data: data,
          fill: false,
          borderColor: '#0d6efd',
          tension: 0.1,
          pointRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: function(context: any) {
                return `$${context.raw.toFixed(4)}`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: false,
            ticks: {
              callback: function(value: any) {
                return '$' + value;
              },
              font: {
                size: 10
              }
            }
          },
          x: {
            ticks: {
              font: {
                size: 9
              }
            }
          }
        }
      }
    };

    // Create new chart
    chartRefs.current[symbol] = new Chart(canvas, chartConfig as any);
  };

  // Function to create month change chart
  const createMonthChangeChart = (symbol: string, monthChange: number) => {
    const canvas = document.getElementById(`${symbol}-month-chart`) as HTMLCanvasElement;
    if (!canvas) return;

    // Cleanup existing chart if it exists
    if (chartRefs.current[`${symbol}-month`]) {
      chartRefs.current[`${symbol}-month`]?.destroy();
    }

    // Get the current stock data
    const stockData = stocks.find(s => s.symbol === symbol);
    if (!stockData || !stockData.priceHistory) return;

    // Sort price history by date and get last 30 days
    const sortedPrices = [...stockData.priceHistory]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-30);

    const dates = sortedPrices.map(p => new Date(p.date));
    const prices = sortedPrices.map(p => p.price);

    const positiveColor = '#4caf50';
    const negativeColor = '#f44336';
    const chartColor = monthChange >= 0 ? positiveColor : negativeColor;

    const chartConfig = {
      type: 'line',
      data: {
        labels: dates,
        datasets: [{
          label: '1-Month Trend',
          data: prices,
          fill: true,
          borderColor: chartColor,
          backgroundColor: monthChange >= 0 ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)',
          tension: 0.4,
          pointRadius: 0,
          borderWidth: 2,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            enabled: true,
            titleFont: {
              size: 10
            },
            bodyFont: {
              size: 10
            },
            callbacks: {
              title: function(context: any) {
                const date = new Date(context[0].label);
                return date.toLocaleDateString();
              },
              label: function(context: any) {
                return `$${context.raw.toFixed(2)}`;
              }
            }
          }
        },
        scales: {
          x: {
            display: false,
            grid: {
              display: false
            }
          },
          y: {
            display: false,
            grid: {
              display: false
            }
          }
        },
        elements: {
          line: {
            tension: 0.4
          }
        }
      }
    };

    // Create new chart
    chartRefs.current[`${symbol}-month`] = new Chart(canvas, chartConfig as any);
  };

  // Create/update charts when stocks data changes
  useEffect(() => {
    if (!stocks.length) return;

    const timer = setTimeout(() => {
      stocks.forEach(stock => {
        if (stock.dividendHistory && stock.dividendHistory.length > 0) {
          createDividendChart(stock.symbol, stock.dividendHistory);
        }
        createMonthChangeChart(stock.symbol, stock.monthChange);
      });
    }, 100);

    return () => {
      clearTimeout(timer);
      Object.keys(chartRefs.current).forEach(key => {
        if (chartRefs.current[key]) {
          chartRefs.current[key]?.destroy();
          chartRefs.current[key] = null;
        }
      });
    };
  }, [stocks]);

  // Ensure sorting is applied consistently on mount and when stocks data changes
  useEffect(() => {
    if (stocks.length > 0 && sortField) {
      // This effect won't sort the data (that's handled in the parent)
      // but it ensures the sort indicators reflect the current state
    }
  }, [stocks, sortField]);

  if (showLoadingSpinner) {
    return (
      <div className="d-flex justify-content-center align-items-center p-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (stocks.length === 0) {
    return (
      <div className="alert alert-info text-center">
        No stock data available. Click "Fetch Data" to load stock information.
      </div>
    );
  }

  return (
    <div className="table-responsive">
      <table className="table table-striped table-bordered w-100" id="stock-table">
        <thead>
          <tr>
            <th style={{ minWidth: '120px' }}>Symbol</th>
            <th>Current Price (1-Day Change)</th>
            <th onClick={() => handleSort('monthChange')}>
              1-Month Change in Price
              <span className="sort-arrow" aria-label="Sort by month change">
                {getSortArrow('monthChange')}
              </span>
            </th>
            <th onClick={() => handleSort('dividendYield')}>
              Current Dividend Yield (%)
              <span className="sort-arrow" aria-label="Sort by dividend yield">
                {getSortArrow('dividendYield')}
              </span>
            </th>
            <th onClick={() => handleSort('marketCap')}>
              Market Cap/Net Assets ($)
              <span className="sort-arrow" aria-label="Sort by market cap">
                {getSortArrow('marketCap')}
              </span>
            </th>
            <th>Pay Frequency</th>
            <th>Dividend History</th>
            <th style={{ minWidth: '200px' }}>Algorithmic Insight</th>
            <th className="no-print">Resources</th>
            <th className="no-print">Actions</th>
          </tr>
        </thead>
        <tbody>
          {stocks.map((stock, index) => (
            <tr 
              key={stock.symbol} 
              style={shouldAnimate(stock.symbol) ? animatedRowStyle : {}}
            >
              {stock.error ? (
                <td colSpan={10} className="text-danger">
                  Error loading {stock.symbol}: {stock.errorMessage}
                </td>
              ) : (
                <>
                  <td>
                    <span className="stock-symbol" style={{ 
                      fontWeight: 'bold', 
                      display: 'block',
                      fontSize: '1rem'
                    }}>{stock.symbol}</span>
                    <span className="stock-name" style={{ 
                      display: 'block', 
                      maxWidth: '220px', 
                      overflowWrap: 'break-word',
                      whiteSpace: 'normal',
                      wordBreak: 'break-word',
                      fontSize: '0.85rem',
                      color: '#333',
                      marginTop: '4px',
                      lineHeight: '1.2'
                    }}>
                      {stock.longName || stock.name}
                    </span>
                    {stock.isEtf && (
                      <span style={{
                        fontSize: '0.8rem',
                        fontStyle: 'italic',
                        color: '#0d6efd',
                        marginTop: '4px',
                        display: 'block'
                      }}>
                        ETF
                      </span>
                    )}
                  </td>
                  <td>
                    <div className="d-flex flex-column">
                      <div style={{ fontWeight: 'bold' }}>
                        {formatCurrency(stock.regularMarketPrice)}
                      </div>
                      {stock.dayChange !== undefined && (
                        <div className="small" style={{ 
                          color: stock.dayChange >= 0 ? '#4caf50' : '#f44336',
                          fontSize: '0.8rem'
                        }}>
                          {formatPercentage(stock.dayChange)}
                        </div>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="d-flex flex-column align-items-center">
                      <div>{formatPercentage(stock.monthChange)}</div>
                      <div className="month-chart-container mt-1" style={{ width: '100px', height: '55px' }}>
                        <canvas id={`${stock.symbol}-month-chart`}></canvas>
                      </div>
                    </div>
                  </td>
                  <td style={stock.dividendYield > 5 ? highYieldStyle : {}}>
                    {formatPercentage(stock.dividendYield)}
                  </td>
                  <td>
                    {formatLargeNumber(stock.marketCap || stock.totalNetAssets)}
                  </td>
                  <td className="text-center">{stock.payFrequency || 'N/A'}</td>
                  <td style={{ position: 'relative' }}>
                    {stock.dividendHistory && stock.dividendHistory.length > 0 ? (
                      <>
                        <div className="sticky-symbol no-print" style={stickyStickerStyle} title={`${stock.symbol} - ${stock.longName || stock.name}`}>
                          {stock.symbol}
                        </div>
                        <div className="small fw-medium mb-1" style={{ fontSize: '0.7rem' }}>
                          Recent: {formatCurrency(stock.dividendHistory[0]?.amount)}
                          {stock.dividendHistory.length > 1 && ` on ${new Date(stock.dividendHistory[0]?.date).toLocaleDateString()}`}
                        </div>
                        <div className="dividend-chart-container" style={{ height: '70px' }}>
                          <canvas id={`${stock.symbol}-chart`}></canvas>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="sticky-symbol no-print" style={stickyStickerStyle} title={`${stock.symbol} - ${stock.longName || stock.name}`}>
                          {stock.symbol}
                        </div>
                        <span className="text-muted">No dividend data</span>
                      </>
                    )}
                  </td>
                  <td className="small">
                    {stock.opinion || 'No analysis available'}
                  </td>
                  <td className="no-print">
                    <div className="resource-links">
                      <a
                        href={`https://finance.yahoo.com/quote/${stock.symbol}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="resource-link"
                        style={{ fontSize: '0.7rem' }}
                      >
                        Yahoo Finance
                      </a>
                      <a
                        href={stock.isEtf ? 
                          `https://stockanalysis.com/etf/${stock.symbol.toLowerCase()}/` : 
                          `https://stockanalysis.com/stocks/${stock.symbol.toLowerCase()}/`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="resource-link"
                        style={{ fontSize: '0.7rem' }}
                      >
                        StockAnalysis
                      </a>
                      <a
                        href={`https://www.marketbeat.com/stocks/NYSE/${stock.symbol}/dividend/`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="resource-link"
                        style={{ fontSize: '0.7rem' }}
                      >
                        MarketBeat
                      </a>
                    </div>
                  </td>
                  <td className="no-print" style={{ position: 'relative' }}>
                    <div className="sticky-symbol no-print" style={{
                      ...stickyStickerStyle, 
                      top: '2px', 
                      right: '2px', 
                      left: 'auto'
                    }} title={`${stock.symbol} - ${stock.longName || stock.name}`}>
                      {stock.symbol}
                    </div>
                    <button
                      className="btn btn-sm btn-danger delete-stock"
                      onClick={() => onDelete(stock.symbol)}
                      disabled={isLoading}
                    >
                      Delete
                    </button>
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 