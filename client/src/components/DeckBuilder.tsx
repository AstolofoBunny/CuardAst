import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GameCard } from '@/components/GameCard';
import { GameCard as GameCardType } from '@/types/game';
import { useAuth } from '@/hooks/useAuth';
import { useFirestore } from '@/hooks/useFirestore';
import { useToast } from '@/hooks/use-toast';

export function DeckBuilder() {
  const { user } = useAuth();
  const { cards, updateUserDeck, updateUserSpellDeck } = useFirestore();
  const { toast } = useToast();
  const [battleDeck, setBattleDeck] = useState<GameCardType[]>([]);
  const [spellDeck, setSpellDeck] = useState<GameCardType[]>([]);
  const [isSavingBattle, setIsSavingBattle] = useState(false);
  const [isSavingSpell, setIsSavingSpell] = useState(false);

  // Load user's decks on component mount
  useEffect(() => {
    if (user && cards.length > 0) {
      // Load battle deck
      if (user.deck) {
        const battleCards = user.deck.map(cardId => cards.find(c => c.id === cardId)).filter(Boolean) as GameCardType[];
        setBattleDeck(battleCards);
      }
      
      // Load spell deck
      if (user.spellDeck) {
        const spellCards = user.spellDeck.map(cardId => cards.find(c => c.id === cardId)).filter(Boolean) as GameCardType[];
        setSpellDeck(spellCards);
      }
    }
  }, [user, cards]);

  // Filter cards by type
  const battleCards = cards.filter(card => card.type === 'battle');
  const spellCards = cards.filter(card => card.type === 'ability');

  // Available cards (not already in deck)
  const availableBattleCards = battleCards.filter(card => 
    !battleDeck.some(deckCard => deckCard.id === card.id)
  );

  const availableSpellCards = spellCards.filter(card => 
    !spellDeck.some(deckCard => deckCard.id === card.id)
  );

  // Battle deck functions
  const addToBattleDeck = (card: GameCardType) => {
    if (battleDeck.length >= 10) return;
    setBattleDeck([...battleDeck, card]);
  };

  const removeFromBattleDeck = (cardId: string) => {
    setBattleDeck(battleDeck.filter(card => card.id !== cardId));
  };

  const saveBattleDeck = async () => {
    if (!user || battleDeck.length !== 10) return;
    
    setIsSavingBattle(true);
    try {
      const deckIds = battleDeck.map(card => card.id);
      await updateUserDeck(user.uid, deckIds);
    } finally {
      setIsSavingBattle(false);
    }
  };

  // Spell deck functions
  const addToSpellDeck = (card: GameCardType) => {
    if (spellDeck.length >= 3) return;
    setSpellDeck([...spellDeck, card]);
  };

  const removeFromSpellDeck = (cardId: string) => {
    setSpellDeck(spellDeck.filter(card => card.id !== cardId));
  };

  const saveSpellDeck = async () => {
    if (!user || spellDeck.length !== 3) return;
    
    setIsSavingSpell(true);
    try {
      const deckIds = spellDeck.map(card => card.id);
      await updateUserSpellDeck(user.uid, deckIds);
    } finally {
      setIsSavingSpell(false);
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="battle" className="w-full">
        <TabsList className="grid grid-cols-2 w-fit bg-gray-700">
          <TabsTrigger value="battle" className="data-[state=active]:bg-red-600">
            <i className="fas fa-sword mr-2"></i>
            Battle Deck (10)
          </TabsTrigger>
          <TabsTrigger value="spell" className="data-[state=active]:bg-purple-600">
            <i className="fas fa-magic mr-2"></i>
            Spell Deck (3)
          </TabsTrigger>
        </TabsList>

        {/* Battle Deck Tab */}
        <TabsContent value="battle" className="space-y-6">
          <div className="grid grid-cols-1 2xl:grid-cols-2 gap-8">
            {/* Current Battle Deck */}
            <Card className="bg-gray-800 border-red-600 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-red-400">
                  <i className="fas fa-sword mr-2"></i>
                  Battle Deck
                </h3>
                <div className="text-lg">
                  <span className="text-yellow-400 font-bold">{battleDeck.length}</span>
                  <span className="text-gray-400">/10 cards</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-2 2xl:grid-cols-3 gap-3 min-h-[500px] border-2 border-dashed border-red-600 rounded-lg p-4">
                {battleDeck.map((card) => (
                  <GameCard
                    key={card.id}
                    card={card}
                    onClick={() => removeFromBattleDeck(card.id)}
                    className="hover:border-red-500 cursor-pointer transform hover:scale-105 transition-all"
                  />
                ))}
                
                {/* Empty slots */}
                {Array.from({ length: 10 - battleDeck.length }).map((_, index) => (
                  <div 
                    key={`empty-battle-${index}`}
                    className="border-2 border-dashed border-gray-600 rounded-lg p-3 flex items-center justify-center text-gray-500 min-h-[140px]"
                  >
                    <i className="fas fa-plus text-3xl"></i>
                  </div>
                ))}
              </div>
              
              <Button
                onClick={saveBattleDeck}
                disabled={battleDeck.length !== 10 || isSavingBattle}
                className="w-full mt-6 bg-green-600 hover:bg-green-700 text-white font-bold py-4 text-lg disabled:bg-gray-600"
              >
                <i className={`${isSavingBattle ? 'fas fa-spinner fa-spin' : 'fas fa-save'} mr-2`}></i>
                {isSavingBattle ? 'Saving Battle Deck...' : 'Save Battle Deck'}
              </Button>
            </Card>

            {/* Available Battle Cards */}
            <Card className="bg-gray-800 border-blue-600 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-blue-400">
                  <i className="fas fa-th-large mr-2"></i>
                  Available Battle Cards
                </h3>
                <div className="text-sm text-gray-400">
                  Click to add to deck
                </div>
              </div>
              
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-2 2xl:grid-cols-3 gap-3 max-h-[500px] overflow-y-auto">
                {availableBattleCards.map((card) => (
                  <GameCard
                    key={card.id}
                    card={card}
                    onClick={() => addToBattleDeck(card)}
                    className="hover:border-yellow-400 cursor-pointer transform hover:scale-105 transition-all"
                    disabled={battleDeck.length >= 10}
                  />
                ))}
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* Spell Deck Tab */}
        <TabsContent value="spell" className="space-y-6">
          <div className="grid grid-cols-1 2xl:grid-cols-2 gap-8">
            {/* Current Spell Deck */}
            <Card className="bg-gray-800 border-purple-600 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-purple-400">
                  <i className="fas fa-magic mr-2"></i>
                  Spell Deck
                </h3>
                <div className="text-lg">
                  <span className="text-yellow-400 font-bold">{spellDeck.length}</span>
                  <span className="text-gray-400">/3 spells</span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-4 min-h-[500px] border-2 border-dashed border-purple-600 rounded-lg p-4">
                {spellDeck.map((card) => (
                  <GameCard
                    key={card.id}
                    card={card}
                    onClick={() => removeFromSpellDeck(card.id)}
                    className="hover:border-red-500 cursor-pointer transform hover:scale-105 transition-all"
                  />
                ))}
                
                {/* Empty spell slots */}
                {Array.from({ length: 3 - spellDeck.length }).map((_, index) => (
                  <div 
                    key={`empty-spell-${index}`}
                    className="border-2 border-dashed border-gray-600 rounded-lg p-6 flex items-center justify-center text-gray-500 min-h-[140px]"
                  >
                    <div className="text-center">
                      <i className="fas fa-plus text-3xl mb-2"></i>
                      <p className="text-sm">Add Spell</p>
                    </div>
                  </div>
                ))}
              </div>
              
              <Button
                onClick={saveSpellDeck}
                disabled={spellDeck.length !== 3 || isSavingSpell}
                className="w-full mt-6 bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 text-lg disabled:bg-gray-600"
              >
                <i className={`${isSavingSpell ? 'fas fa-spinner fa-spin' : 'fas fa-save'} mr-2`}></i>
                {isSavingSpell ? 'Saving Spell Deck...' : 'Save Spell Deck'}
              </Button>
            </Card>

            {/* Available Spell Cards */}
            <Card className="bg-gray-800 border-blue-600 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-blue-400">
                  <i className="fas fa-scroll mr-2"></i>
                  Available Spells
                </h3>
                <div className="text-sm text-gray-400">
                  Click to add to spell deck
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-4 max-h-[500px] overflow-y-auto">
                {availableSpellCards.map((card) => (
                  <GameCard
                    key={card.id}
                    card={card}
                    onClick={() => addToSpellDeck(card)}
                    className="hover:border-yellow-400 cursor-pointer transform hover:scale-105 transition-all"
                    disabled={spellDeck.length >= 3}
                  />
                ))}
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}