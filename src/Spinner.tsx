import * as React from 'react';

export interface SpinnerProps {
}

export function Spinner (props: SpinnerProps) {
    return (
      <div className="spinner-container">
        <div className="spinner"/>
      </div>
    );
}
