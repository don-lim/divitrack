'use client';

import React from 'react';

interface ProgressBarProps {
  current: number;
  total: number;
  status: 'starting' | 'fetching' | 'error' | 'complete';
  currentSymbol?: string;
}

export default function ProgressBar({
  current,
  total,
  status,
  currentSymbol
}: ProgressBarProps) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
  
  // Determine the color of the progress bar based on the status
  let progressColor = 'bg-primary';
  if (status === 'error') {
    progressColor = 'bg-danger';
  } else if (status === 'complete') {
    progressColor = 'bg-success';
  }

  // Only skip rendering if status is complete and no current operation
  if (status === 'complete' && current === 0 && total === 0) {
    return null;
  }

  return (
    <div className="mt-3 mb-4">
      <div className="d-flex flex-wrap justify-content-between mb-1">
        <div className="mb-1 mb-sm-0">
          <strong>Progress:</strong> {current} of {total} stocks 
          {currentSymbol && (
            <span className="d-inline-block text-truncate" style={{ maxWidth: '180px', verticalAlign: 'bottom' }}>
              ({currentSymbol})
            </span>
          )}
        </div>
        <div>{percentage}%</div>
      </div>
      <div className="progress" style={{ height: '20px' }}>
        <div
          className={`progress-bar ${progressColor}`}
          role="progressbar"
          style={{ width: `${percentage}%` }}
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
        ></div>
      </div>
      {status === 'error' && (
        <div className="mt-2 text-danger">
          <small>Error fetching data. Some stocks may not be available.</small>
        </div>
      )}
    </div>
  );
} 