import React from "react";

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  fullscreen?: boolean;
}

export default function LoadingSpinner({ 
  size = 'md', 
  text,
  fullscreen = false 
}: LoadingSpinnerProps) {
  const Spinner = () => (
    <div className={`spinner-v2 spinner-${size}`}></div>
  );

  if (fullscreen) {
    return (
      <div className="loading-fullscreen">
        <Spinner />
        {text && <p className="loading-text">{text}</p>}
      </div>
    );
  }

 return (
    <div className="loading-inline">
      <Spinner />
      {text && <span className="loading-text">{text}</span>}
    </div>
  );
}
