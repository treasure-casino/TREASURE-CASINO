import React from 'react';
import { AlertTriangle, Code, ArrowRight } from 'lucide-react';

interface NotImplementedProps {
  title: string;
  description: string;
  pendingEndpoint: string;
  suggestedAction?: string;
}

export const NotImplemented: React.FC<NotImplementedProps> = ({
  title,
  description,
  pendingEndpoint,
  suggestedAction,
}) => {
  return (
    <div className="bg-dark-900 border border-amber-600/40 rounded-xl p-8 max-w-2xl mx-auto my-8 shadow-xl">
      <div className="flex items-start gap-4">
        <div className="p-3 bg-amber-950/60 border border-amber-600/50 rounded-lg text-amber-400">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-amber-950 text-amber-400 border border-amber-800 mb-2">
            FEATURE STATUS: NOT IMPLEMENTED IN BACKEND
          </div>
          <h2 className="text-xl font-bold text-white font-cinzel mb-2">{title}</h2>
          <p className="text-gray-300 text-sm leading-relaxed mb-4">{description}</p>

          <div className="bg-dark-950 border border-dark-700 rounded-lg p-3 text-xs font-mono text-gray-300 mb-4">
            <div className="text-gray-500 mb-1 flex items-center gap-1.5">
              <Code className="w-3.5 h-3.5" /> Required Backend Route:
            </div>
            <span className="text-gold">{pendingEndpoint}</span>
          </div>

          {suggestedAction && (
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <ArrowRight className="w-4 h-4 text-gold" />
              <span>{suggestedAction}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

