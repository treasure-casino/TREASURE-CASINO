import React from 'react';
import { NotImplemented } from '../../components/common/NotImplemented';
import { Gift } from 'lucide-react';

export const PromotionsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="pb-6 border-b border-dark-800">
        <h1 className="text-2xl font-black tracking-wide text-white font-cinzel">
          PROMOTIONS & REWARDS MANAGEMENT
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Configure player promotions, VIP tier thresholds, and bonus codes.
        </p>
      </div>

      <NotImplemented
        title="Admin Promotions & Rewards Control"
        description="The administrator CRUD management API for configuring promotional banners, coupon codes, and dynamic VIP level benefits is not yet implemented on the backend. In compliance with strict engineering guidelines, no mock data or fake actions are rendered."
        pendingEndpoint="GET, POST, PUT /api/admin/promotions (or /api/admin/rewards)"
        suggestedAction="To configure initial rewards or coupons, use the seeded database records in MySQL (table: rewards) or review player claims via user history."
      />
    </div>
  );
};

