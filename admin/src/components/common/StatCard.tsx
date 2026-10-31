import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  variant?: 'gold' | 'emerald' | 'amber' | 'default';
  isSimulated?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'default',
  isSimulated = false,
}) => {
  let iconBg = 'bg-dark-800 text-gray-400 border-dark-700';
  let borderGlow = 'border-dark-700 hover:border-dark-600';

  if (variant === 'gold') {
    iconBg = 'bg-amber-950/40 text-gold border-gold/30';
    borderGlow = 'border-gold/30 hover:border-gold/60 hover:shadow-lg hover:shadow-gold/5';
  } else if (variant === 'emerald') {
    iconBg = 'bg-emerald-950/40 text-emerald-400 border-emerald-800/40';
    borderGlow = 'border-emerald-800/30 hover:border-emerald-600/50';
  } else if (variant === 'amber') {
    iconBg = 'bg-amber-950/40 text-amber-400 border-amber-800/40';
    borderGlow = 'border-amber-800/30 hover:border-amber-600/50';
  }

  return (
    <div
      className={`relative bg-dark-900/90 backdrop-blur border rounded-xl p-5 transition-all duration-200 ${borderGlow}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold tracking-wider uppercase text-gray-400">
              {title}
            </span>
            {isSimulated && (
              <span className="text-[10px] bg-dark-800 text-amber-400/90 px-1.5 py-0.5 rounded border border-amber-800/40">
                SIMULATED
              </span>
            )}
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-white font-cinzel">
            {value}
          </div>
          {subtitle && <p className="mt-1 text-xs text-gray-400">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-lg border ${iconBg}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
};

