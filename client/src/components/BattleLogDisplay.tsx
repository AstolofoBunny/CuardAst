import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { BattleLog } from '@/types/game';
import { Sword, Zap, Heart, Shield, AlertTriangle } from 'lucide-react';

interface BattleLogDisplayProps {
  logs: BattleLog[];
  collapsed?: boolean;
}

export function BattleLogDisplay({ logs, collapsed = false }: BattleLogDisplayProps) {
  const getActionIcon = (action: BattleLog['action']) => {
    switch (action) {
      case 'attack':
        return <Sword className="w-3 h-3 text-red-400" />;
      case 'cast_spell':
        return <Zap className="w-3 h-3 text-blue-400" />;
      case 'damage_dealt':
        return <Heart className="w-3 h-3 text-orange-400" />;
      case 'place_card':
        return <Shield className="w-3 h-3 text-green-400" />;
      case 'card_destroyed':
        return <AlertTriangle className="w-3 h-3 text-yellow-400" />;
      default:
        return <div className="w-3 h-3 rounded-full bg-gray-400" />;
    }
  };

  const getActionColor = (action: BattleLog['action']) => {
    switch (action) {
      case 'attack':
        return 'bg-red-500/10 border-red-500/20';
      case 'cast_spell':
        return 'bg-blue-500/10 border-blue-500/20';
      case 'damage_dealt':
        return 'bg-orange-500/10 border-orange-500/20';
      case 'place_card':
        return 'bg-green-500/10 border-green-500/20';
      case 'card_destroyed':
        return 'bg-yellow-500/10 border-yellow-500/20';
      default:
        return 'bg-gray-500/10 border-gray-500/20';
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  if (collapsed) {
    return (
      <Card className="bg-gray-800 border-gray-600 p-2">
        <div className="text-center text-gray-400 text-sm">
          Battle Log ({logs.length} events)
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-800 border-gray-600">
      <div className="p-3 border-b border-gray-600">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-white">Battle Log</h3>
          <Badge variant="outline" className="text-xs">
            {logs.length} events
          </Badge>
        </div>
      </div>
      
      <ScrollArea className="h-80">
        <div className="p-3 space-y-2">
          {logs.length === 0 ? (
            <div className="text-center text-gray-500 text-sm py-8">
              No battle events yet
            </div>
          ) : (
            logs.map((log, index) => (
              <div 
                key={log.id || index}
                className={`p-3 rounded-lg border transition-all duration-200 ${getActionColor(log.action)}`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {getActionIcon(log.action)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white font-medium mb-1">
                      {log.description}
                    </div>
                    
                    {log.details.damage && (
                      <div className="text-xs text-orange-300">
                        Damage: {log.details.damage}
                        {log.details.isCritical && (
                          <span className="ml-1 text-yellow-400 font-bold">CRITICAL!</span>
                        )}
                      </div>
                    )}
                    
                    {log.details.energyCost && (
                      <div className="text-xs text-blue-300">
                        Energy Cost: {log.details.energyCost}
                      </div>
                    )}
                    
                    <div className="text-xs text-gray-400 mt-1">
                      {formatTime(log.timestamp)}
                    </div>
                  </div>
                  
                  <Badge 
                    variant="outline" 
                    className="text-xs capitalize"
                  >
                    {log.action.replace('_', ' ')}
                  </Badge>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </Card>
  );
}