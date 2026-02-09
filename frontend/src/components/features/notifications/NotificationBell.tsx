'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { useNotifications } from '../../../hooks/useNotifications';
import { NotificationDropdown } from './NotificationDropdown';
import { Button } from '../../ui/Button';
import { useNavigation } from '../../../hooks/useNavigation';

export const NotificationBell: React.FC = () => {
  const { unreadCount } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { navigateWithAuth } = useNavigation();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleClick = () => {
    if (window.innerWidth < 768) {
      navigateWithAuth('/notifications');
    } else {
      setIsOpen(!isOpen);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <Button 
        variant="ghost" 
        size="icon" 
        className={`relative ${isOpen ? 'bg-gray-100 dark:bg-neutral-800 text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300'}`}
        onClick={handleClick}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-neutral-900 animate-pulse" />
        )}
      </Button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 z-50 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
          <NotificationDropdown onClose={() => setIsOpen(false)} />
        </div>
      )}
    </div>
  );
};
