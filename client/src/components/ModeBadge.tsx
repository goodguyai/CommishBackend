import { Badge } from './ui/Badge';
import { Zap, Trophy } from 'lucide-react';

interface ModeBadgeProps {
  mode: 'demo' | 'beta';
}

export function ModeBadge({ mode }: ModeBadgeProps) {
  if (mode === 'demo') {
    return (
      <Badge 
        className="bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 gap-1"
        data-testid="badge-demo"
      >
        <Zap className="w-3 h-3" />
        DEMO
      </Badge>
    );
  }

  return (
    <Badge 
      className="bg-green-500/10 text-green-500 border border-green-500/20 gap-1"
      data-testid="badge-beta"
    >
      <Trophy className="w-3 h-3" />
      BETA
    </Badge>
  );
}
