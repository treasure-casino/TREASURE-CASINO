import React from 'react';
import { Link } from 'react-router-dom';
import { NotImplemented } from '../../components/common/NotImplemented';
import { HelpCircle, Users } from 'lucide-react';

export const SupportPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="pb-6 border-b border-dark-800">
        <h1 className="text-2xl font-black tracking-wide text-white font-cinzel">
          SUPPORT TICKETS DESK
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Review player support tickets, respond to inquiries, and update issue resolutions.
        </p>
      </div>

      <NotImplemented
        title="Admin Support Tickets Central Desk"
        description="A dedicated global administrator inbox API for customer support tickets is not yet implemented in the backend. However, individual player support tickets can already be inspected on a per-player basis via the User Management directory."
        pendingEndpoint="GET, PUT /api/admin/support/tickets"
        suggestedAction="To view support tickets submitted by a specific user, navigate to User Management, select a player, and check their 'Player Support Tickets' panel."
      />

      <div className="text-center">
        <Link
          to="/users"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-dark-900 hover:bg-dark-800 border border-gold/40 rounded-xl text-gold font-semibold text-xs tracking-wider transition"
        >
          <Users className="w-4 h-4" />
          <span>GO TO USER DIRECTORY TO VIEW PLAYER TICKETS</span>
        </Link>
      </div>
    </div>
  );
};

