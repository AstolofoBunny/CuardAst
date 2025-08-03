import { GameCard as GameCardType } from '@/types/game';
import { Card } from '@/components/ui/card';

interface GameCardProps {
  card: GameCardType;
  onClick?: () => void;
  selected?: boolean;
  className?: string;
}

export function GameCard({ card, onClick, selected, className = '' }: GameCardProps) {
  const getCardBorderColor = () => {
    if (selected) {
      return card.type === 'battle' ? 'border-yellow-400' : 'border-purple-400';
    }
    
    if (card.type === 'battle') {
      switch (card.class) {
        case 'melee': return 'border-red-500';
        case 'ranged': return 'border-green-500';
        case 'mage': return 'border-purple-500';
        default: return 'border-gray-500';
      }
    }
    return 'border-yellow-600';
  };

  const getClassColor = () => {
    switch (card.class) {
      case 'melee': return 'text-red-400';
      case 'ranged': return 'text-green-400';
      case 'mage': return 'text-purple-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <Card 
      className={`game-card cursor-pointer border-2 ${getCardBorderColor()} bg-gradient-to-b from-gray-800 to-gray-900 p-3 ${className}`}
      onClick={onClick}
    >
      <div className="text-center mb-2">
        <img 
          src={card.imageUrl} 
          alt={card.name}
          className="w-full h-20 object-cover rounded-lg mb-2"
          onError={(e) => {
            (e.target as HTMLImageElement).src = `https://via.placeholder.com/200x140/374151/f3f4f6?text=${encodeURIComponent(card.name)}`;
          }}
        />
        <h4 className="font-bold text-sm text-yellow-400">{card.name}</h4>
        <p className="text-xs text-gray-400 capitalize">{card.type} {card.class && `Unit`}</p>
      </div>
      
      <div className="space-y-1 text-xs">
        {card.type === 'battle' && (
          <>
            <div className="flex justify-between">
              <span className="text-red-400">❤️ HP:</span>
              <span className="text-white font-bold">{card.health}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-yellow-400">⚔️ DMG:</span>
              <span className="text-white font-bold">{card.damage}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-blue-400">Class:</span>
              <span className={`font-bold capitalize ${getClassColor()}`}>{card.class}</span>
            </div>
            {card.passiveSkill && (
              <div className="text-xs text-gray-300 mt-2 p-1 bg-gray-800 rounded">
                {card.passiveSkill}
              </div>
            )}
          </>
        )}
        
        {card.type === 'ability' && (
          <>
            <div className="flex justify-between">
              <span className="text-blue-400">⚡ Cost:</span>
              <span className="text-white font-bold">{card.cost}</span>
            </div>
            <div className="text-xs text-gray-300 text-center mt-2 p-1 bg-gray-800 rounded">
              {card.description}
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
