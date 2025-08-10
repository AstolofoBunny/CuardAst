import { GameCard } from '@/components/GameCard';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SpellDeck, GameCard as GameCardType } from '@/types/game';
import { Zap, Clock } from 'lucide-react';

interface SpellDeckDisplayProps {
  spellDeck: SpellDeck;
  cards: GameCardType[];
  onCastSpell: (spellId: string) => void;
  isPlayerTurn: boolean;
  playerName: string;
  isOpponent?: boolean;
}

export function SpellDeckDisplay({ 
  spellDeck, 
  cards, 
  onCastSpell, 
  isPlayerTurn, 
  playerName,
  isOpponent = false 
}: SpellDeckDisplayProps) {
  const spellCards = cards.filter(card => 
    spellDeck.cards.includes(card.id) && card.type === 'ability'
  );

  return (
    <div className={`space-y-2 ${isOpponent ? 'opacity-75' : ''}`}>
      <div className="flex items-center gap-2">
        <Zap className="w-4 h-4 text-blue-400" />
        <span className="text-sm font-medium text-white">
          {isOpponent ? `${playerName}'s Spells` : 'Your Spells'}
        </span>
        <Badge variant="outline" className="text-xs">
          {spellCards.length}/3
        </Badge>
      </div>
      
      <div className="grid grid-cols-1 gap-2">
        {spellCards.map((card) => {
          const cooldown = spellDeck.spellCooldowns[card.id] || 0;
          const isOnCooldown = cooldown > 0;
          const canCast = !isOpponent && isPlayerTurn && !isOnCooldown;

          return (
            <Card 
              key={card.id} 
              className={`p-3 bg-gray-800 border-gray-600 transition-all duration-200 ${
                canCast ? 'hover:border-blue-400 cursor-pointer' : ''
              } ${isOnCooldown ? 'opacity-50' : ''}`}
              onClick={() => canCast && onCastSpell(card.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="font-medium text-white text-sm">{card.name}</div>
                  <div className="text-xs text-gray-400 mt-1">{card.description}</div>
                  {card.cost && (
                    <div className="text-xs text-blue-400 mt-1">
                      Energy: {card.cost}
                    </div>
                  )}
                </div>
                
                <div className="flex flex-col items-end gap-1">
                  {isOnCooldown && (
                    <div className="flex items-center gap-1 text-xs text-orange-400">
                      <Clock className="w-3 h-3" />
                      {cooldown}
                    </div>
                  )}
                  
                  {canCast && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="text-xs h-6 px-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        onCastSpell(card.id);
                      }}
                    >
                      Cast
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
        
        {spellCards.length === 0 && (
          <div className="text-center text-gray-500 text-sm py-4">
            No spells available
          </div>
        )}
      </div>
    </div>
  );
}