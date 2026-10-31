import React from 'react';

interface BadgeProps {
  status: string;
}

export const Badge: React.FC<BadgeProps> = ({ status }) => {
  let colorStyles = 'bg-gray-800 text-gray-300 border-gray-700';

  switch (status.toUpperCase()) {
    case 'ACTIVE':
    case 'COMPLETED':
    case 'APPROVED':
      colorStyles = 'bg-emerald-950/80 text-emerald-400 border-emerald-800/60';
      break;
    case 'PENDING':
    case 'PROCESSING':
    case 'PENDING_VERIFICATION':
      colorStyles = 'bg-amber-950/80 text-amber-400 border-amber-800/60';
      break;
    case 'REJECTED':
    case 'FAILED':
    case 'SUSPENDED':
    case 'BANNED':
      colorStyles = 'bg-rose-950/80 text-rose-400 border-rose-800/60';
      break;
    case 'SLOTS':
    case 'CARD':
    case 'ARCADE':
      colorStyles = 'bg-purple-950/80 text-purple-300 border-purple-800/60';
      break;
    case 'SUPERADMIN':
      colorStyles = 'bg-yellow-950/80 text-gold border-gold/50 font-bold';
      break;
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colorStyles}`}
    >
      {status}
    </span>
  );
};

