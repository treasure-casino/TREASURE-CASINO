import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AdminLayout } from './components/layout/AdminLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { UsersPage } from './pages/users/UsersPage';
import { UserDetailPage } from './pages/users/UserDetailPage';
import { FinanceDepositsPage } from './pages/finance/FinanceDepositsPage';
import { FinanceWithdrawalsPage } from './pages/finance/FinanceWithdrawalsPage';
import { GamesPage } from './pages/games/GamesPage';
import { AuditLogsPage } from './pages/system/AuditLogsPage';
import { SettingsPage } from './pages/system/SettingsPage';
import { PromotionsPage } from './pages/promotions/PromotionsPage';
import { SupportPage } from './pages/support/SupportPage';
import { GameLobbyPage } from './pages/lobby/GameLobbyPage';
import { GameArenaPage } from './pages/lobby/GameArenaPage';
import { VortexAdminPage } from './pages/games/VortexAdminPage';
import { VortexPage } from './pages/games/VortexPage';
import { SpiralAdminPage } from './pages/games/SpiralAdminPage';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Player Game Lobby & Arena Routes */}
          <Route path="/lobby" element={<GameLobbyPage />} />
          <Route path="/lobby/arena/:id" element={<GameArenaPage />} />
          <Route path="/play/:id" element={<GameArenaPage />} />
          <Route path="/game/:id" element={<GameArenaPage />} />
          <Route path="/play" element={<Navigate to="/lobby" replace />} />
          <Route path="/game" element={<Navigate to="/lobby" replace />} />

          {/* Public Admin Login Route */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected Admin Routes */}
          <Route path="/" element={<AdminLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="users/:id" element={<UserDetailPage />} />
            <Route path="finance/deposits" element={<FinanceDepositsPage />} />
            <Route path="finance/withdrawals" element={<FinanceWithdrawalsPage />} />
            <Route path="games" element={<GamesPage />} />
            <Route path="games/vortex" element={<VortexAdminPage />} />
            <Route path="games/vortex/play" element={<VortexPage />} />
            <Route path="games/spiral" element={<SpiralAdminPage />} />
            <Route path="promotions" element={<PromotionsPage />} />
            <Route path="support" element={<SupportPage />} />
            <Route path="audit-logs" element={<AuditLogsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;

