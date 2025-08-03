import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GameCard } from '@/components/GameCard';
import { GameCard as GameCardType } from '@/types/game';
import { useAuth } from '@/hooks/useAuth';
import { useFirestore } from '@/hooks/useFirestore';

export function DeckBuilder() {
  const { user } = useAuth();
  const { cards, updateUserDeck } = useFirestore();
  const [currentDeck, setCurrentDeck] = useState<GameCardType[]>([]);
  const [filter, setFilter] = useState<'all' | 'battle' | 'ability'>('all');

  // Load user's deck on component mount
  useEffect(() => {
    if (user && user.deck && cards.length > 0) {
      const deckCards = user.deck.map(cardId => cards.find(c => c.id === cardId)).filter(Boolean) as GameCardType[];
      setCurrentDeck(deckCards);
    }
  }, [user, cards]);

  const filteredCards = cards.filter(card => {
    if (filter === 'all') return true;
    return card.type === filter;
  });

  const availableCards = filteredCards.filter(card => 
    !currentDeck.some(deckCard => deckCard.id === card.id)
  );

  const addToDeck = (card: GameCardType) => {
    if (currentDeck.length >= 10) return;
    setCurrentDeck([...currentDeck, card]);
  };

  const removeFromDeck = (cardId: string) => {
    setCurrentDeck(currentDeck.filter(card => card.id !== cardId));
  };

  const saveDeck = async () => {
    if (!user || currentDeck.length !== 10) return;
    
    const deckIds = currentDeck.map(card => card.id);
    await updateUserDeck(user.uid, deckIds);
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-yellow-400 mb-2">
          <i className="fas fa-layer-group mr-2"></i>
          Deck Builder
        </h2>
        <p className="text-gray-400">Build your ultimate battle deck (10 cards required)</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Current Deck */}
        <Card className="bg-gray-800 border-blue-600 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold">Current Deck</h3>
            <div className="text-sm">
              <span className="text-yellow-400 font-bold">{currentDeck.length}</span>
              <span className="text-gray-400">/10 cards</span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 min-h-96 border-2 border-dashed border-blue-600 rounded-lg p-4">
            {currentDeck.map((card) => (
              <GameCard
                key={card.id}
                card={card}
                onClick={() => removeFromDeck(card.id)}
                className="hover:border-red-500"
              />
            ))}
            
            {/* Empty slots */}
            {Array.from({ length: 10 - currentDeck.length }).map((_, index) => (
              <div 
                key={`empty-${index}`}
                className="border-2 border-dashed border-gray-600 rounded-lg p-3 flex items-center justify-center text-gray-500"
              >
                <i className="fas fa-plus text-2xl"></i>
              </div>
            ))}
          </div>
          
          <Button
            onClick={saveDeck}
            disabled={currentDeck.length !== 10}
            className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white font-bold py-3"
          >
            <i className="fas fa-save mr-2"></i>
            Save Deck
          </Button>
        </Card>

        {/* Available Cards */}
        <Card className="bg-gray-800 border-blue-600 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold">Available Cards</h3>
            <div className="flex space-x-2">
              <Button
                variant={filter === 'all' ? 'default' : 'secondary'}
                size="sm"
                onClick={() => setFilter('all')}
                className={filter === 'all' ? 'bg-red-600' : 'bg-gray-600'}
              >
                All
              </Button>
              <Button
                variant={filter === 'battle' ? 'default' : 'secondary'}
                size="sm"
                onClick={() => setFilter('battle')}
                className={filter === 'battle' ? 'bg-red-600' : 'bg-gray-600'}
              >
                Battle
              </Button>
              <Button
                variant={filter === 'ability' ? 'default' : 'secondary'}
                size="sm"
                onClick={() => setFilter('ability')}
                className={filter === 'ability' ? 'bg-red-600' : 'bg-gray-600'}
              >
                Ability
              </Button>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 max-h-96 overflow-y-auto">
            {availableCards.map((card) => (
              <GameCard
                key={card.id}
                card={card}
                onClick={() => addToDeck(card)}
                className="hover:border-yellow-400"
              />
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
