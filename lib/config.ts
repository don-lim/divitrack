// Configuration for Stock Yield Tracker

export const CONFIG = {
    // Default stock symbols to track
    stockSymbols: [
        'PIN',   
        'AIPI',  
        'BMAX',  
        'JEPQ',  
        'ENB',   
        'IIPR', 
        'NLY', 
        'WES',   
        'VZ',    
        'ARCC',  
        'ED',    
        'MO',    
        'EPD',   
        'SDIV',  
        'DIV',   
        'MPLX',  
        'KMI',   
        'CONY',  
        'MSTY',  
        'BGT'    
    ],
    
    // API endpoints
    api: {
        stocks: '/api/stocks',
        dividends: '/api/dividends',
        health: '/api/health'
    },
    
    // Misc settings
    refreshInterval: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
    
    // Display options
    showExtraColumns: true,
    defaultSortField: 'dividendYield' as const,
    defaultSortDirection: 'desc' as 'asc' | 'desc'
};

export default CONFIG; 