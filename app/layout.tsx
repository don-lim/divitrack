import './globals.css';

export const metadata = {
  title: 'Stock Dividend Tracker',
  description: 'Track dividend stocks and ETFs',
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'https://dt2.docentcorp.com'),
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-icon.png',
  },
  openGraph: {
    title: 'Stock Dividend Tracker',
    description: 'Track dividend stocks and ETFs',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Stock Dividend Tracker',
      }
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link 
          rel="stylesheet" 
          href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" 
          integrity="sha384-T3c6CoIi6uLrA9TneNEoa7RxnatzjcDSCmG1MXxSR1GAsXEV/Dwwykc2MPK8M2HN" 
          crossOrigin="anonymous"
        />
      </head>
      <body style={{ backgroundColor: '#f0f2f5' }}>
        {children}
        
        {/* Disclaimer Note */}
        <div style={{
          margin: '20px auto',
          maxWidth: '1200px',
          padding: '0 15px',
          fontSize: '12px',
          color: '#777',
          textAlign: 'center',
        }}>
          <strong>Disclaimer:</strong> Information provided is for informational purposes only. Current Dividend Yield is dynamically calculated based on our logic using the most current data. Yield rates in the Algorithmic Insight section are fetched from public data. Both may not be accurate, especially following stock price fluctuations. This information should not be used as the sole basis for investment decisions.
        </div>
        <div style={{ height: '35px' }}></div>
        
        <div style={{
          position: 'fixed',
          bottom: '10px',
          right: '10px',
          fontSize: '12px',
          color: '#666',
          zIndex: 1000,
        }}>
          <a 
            href="https://medium.com/@don-lim" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{
              color: '#666',
              textDecoration: 'underline',
              fontWeight: 'bold',
            }}
          >
            Created by Don
          </a>
        </div>
        
        <script 
          src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js" 
          integrity="sha384-C6RzsynM9kWDrMNeT87bh95OGNyZPhcTNXj1NW7RuBCsyN/o0jlpcV8Qyq46cDfL" 
          crossOrigin="anonymous"
        ></script>
      </body>
    </html>
  );
} 