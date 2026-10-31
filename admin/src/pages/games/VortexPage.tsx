import React from 'react';
import { TreasureVortex3D } from '../../components/games/vortex/TreasureVortex3D';

export const VortexPage: React.FC = () => {
  return (
    <div className="w-full h-[calc(100vh-64px)] min-h-[600px] flex flex-col bg-dark-950 overflow-hidden">
      <TreasureVortex3D />
    </div>
  );
};

export default VortexPage;

