import { Alert } from './ui/alert';
import { Button } from './ui/Button';
import { AlertCircle } from 'lucide-react';
import { useLocation } from 'wouter';

interface FinishSetupBannerProps {
  message: string;
  actionLabel?: string;
  actionPath?: string;
}

export function FinishSetupBanner({ 
  message, 
  actionLabel = 'Complete Setup', 
  actionPath = '/onboarding' 
}: FinishSetupBannerProps) {
  const [, setLocation] = useLocation();

  return (
    <Alert 
      className="bg-orange-500/10 border-orange-500/20 mb-6"
      data-testid="banner-finish-setup"
    >
      <AlertCircle className="h-4 w-4 text-orange-500" />
      <div className="flex-1 flex items-center justify-between">
        <p className="text-sm text-orange-500 font-medium" data-testid="text-setup-message">
          {message}
        </p>
        <Button
          size="sm"
          onClick={() => setLocation(actionPath)}
          className="bg-orange-600 hover:bg-orange-700 text-white"
          data-testid="button-finish-setup"
        >
          {actionLabel}
        </Button>
      </div>
    </Alert>
  );
}
