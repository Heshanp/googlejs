import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../ui/Button';
import { useNavigation } from '../../hooks/useNavigation';
import { cn } from '../../lib/utils';

interface BackButtonProps {
  fallback?: string;
  label?: string;
  className?: string;
  showLabel?: boolean;
}

export const BackButton: React.FC<BackButtonProps> = ({ 
  fallback, 
  label, 
  className,
  showLabel = false 
}) => {
  const { goBack } = useNavigation();

  return (
    <Button 
      variant="ghost" 
      size="icon" 
      onClick={() => goBack(fallback)}
      className={cn("rounded-full -ml-2", className)}
      aria-label="Go back"
    >
      <ArrowLeft className="w-5 h-5" />
      {showLabel && label && <span className="ml-2 text-sm font-medium">{label}</span>}
    </Button>
  );
};