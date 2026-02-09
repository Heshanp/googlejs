'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '../../ui/Modal';
import { Button } from '../../ui/Button';
import { LogIn } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { useNavigation } from '../../../hooks/useNavigation';

export const SessionExpiredModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { navigate } = useNavigation();
  const { logout } = useAuth();

  useEffect(() => {
    const handleSessionExpired = () => setIsOpen(true);
    window.addEventListener('session-expired', handleSessionExpired);
    return () => window.removeEventListener('session-expired', handleSessionExpired);
  }, []);

  const handleLogin = () => {
    logout('/login'); // Redirect to login
    setIsOpen(false);
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={() => {}} 
      title="Session Expired" 
      size="sm"
      closeOnOverlayClick={false}
    >
      <div className="text-center py-4">
        <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <LogIn className="w-8 h-8 text-yellow-600 dark:text-yellow-500" />
        </div>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          Your session has expired for security reasons. Please log in again to continue where you left off.
        </p>
        <Button onClick={handleLogin} fullWidth>
          Log In Again
        </Button>
      </div>
    </Modal>
  );
};