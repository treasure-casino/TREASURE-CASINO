import React from 'react';
import { TreasureVortex3D } from '../../components/games/vortex/TreasureVortex3D';

export const VortexPage: React.FC = () => {
  return (
    <div className="w-full h-full min-h-0 flex-1 flex flex-col bg-dark-950 overflow-hidden">
      <TreasureVortex3D />
    </div>
  );
};

export default VortexPage;

