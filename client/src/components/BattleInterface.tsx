import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GameCard } from '@/components/GameCard';
import { Battle, GameCard as GameCardType } from '@/types/game';
import { useAuth } from '@/hooks/useAuth';
import { useFirestore } from '@/hooks/useFirestore';
import { doc, onSnapshot, DocumentData, DocumentSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface BattleInterfaceProps {
  battleId: string;
  onLeaveBattle: () => void;
}

export function BattleInterface({ battleId, onLeaveBattle }: BattleInterfaceProps) {
  const { user, updateUserHP, updateUserEnergy, updateUserStats } = useAuth();
  const { cards, updateBattle, markPlayerReady } = useFirestore();
  const [battle, setBattle] = useState<Battle | null>(null);
  const [selectedBattleCard, setSelectedBattleCard] = useState<string>('');
  const [selectedAbilities, setSelectedAbilities] = useState<string[]>([]);
  const [isReady, setIsReady] = useState(false);

  // Listen to battle updates
  useEffect(() => {
    if (!battleId) return;

    const unsubscribe = onSnapshot(
      doc(db, 'battles', battleId),
      (doc: DocumentSnapshot<DocumentData>) => {
        if (doc.exists()) {
          setBattle(doc.data() as Battle);
        }
      }
    );

    return () => unsubscribe();
  }, [battleId]);

  if (!battle || !user) {
    return (
      <div className="p-6 flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-yellow-400 mb-4"></div>
          <p className="text-lg">Loading battle...</p>
        </div>
      </div>
    );
  }

  const playerData = battle.players[user.uid];
  const opponentId = Object.keys(battle.players).find(id => id !== user.uid);
  const opponentData = opponentId ? battle.players[opponentId] : null;

  if (!playerData) {
    return (
      <div className="p-6 text-center">
        <p className="text-lg">Joining battle...</p>
        <Button onClick={onLeaveBattle} className="mt-4">Return to Dashboard</Button>
      </div>
    );
  }

  if (!opponentData && battle.phase === 'preparation') {
    return (
      <Card className="bg-gray-800 border-blue-600 p-8 text-center">
        <div className="mb-6">
          <div className="animate-pulse rounded-full h-20 w-20 bg-yellow-400 mx-auto mb-4 flex items-center justify-center">
            <i className="fas fa-hourglass-half text-gray-900 text-2xl"></i>
          </div>
          <h3 className="text-2xl font-bold text-yellow-400 mb-2">Waiting for Opponent</h3>
          <p className="text-gray-400">Looking for another player to join the battle...</p>
        </div>
        
        <div className="space-y-4">
          <div className="flex justify-center space-x-4">
            <Button
              onClick={onLeaveBattle}
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              <i className="fas fa-arrow-left mr-2"></i>
              Leave Battle
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  const playerBattleCards = cards.filter(card => 
    card.type === 'battle' && playerData.deck.includes(card.id)
  );

  const playerAbilityCards = cards.filter(card => 
    card.type === 'ability' && playerData.deck.includes(card.id)
  );

  const handleSelectBattleCard = (cardId: string) => {
    setSelectedBattleCard(cardId);
  };

  const handleMarkReady = async () => {
    if (!user || !battle) return;
    await markPlayerReady(battleId, battleId, user.uid);
    setIsReady(true);
  };

  const handleSelectAbility = (cardId: string) => {
    const card = cards.find(c => c.id === cardId);
    if (!card || !playerData) return;

    // Check if player has enough energy
    if (playerData.energy < (card.cost || 0)) return;

    if (selectedAbilities.includes(cardId)) {
      setSelectedAbilities(selectedAbilities.filter(id => id !== cardId));
    } else {
      setSelectedAbilities([...selectedAbilities, cardId]);
    }
  };

  const handleReady = async () => {
    if (!battle || !user || !selectedBattleCard || !battleId) return;

    const updatedBattle = {
      ...battle,
      players: {
        ...battle.players,
        [user.uid]: {
          ...playerData,
          selectedBattleCard,
          selectedAbilities: selectedAbilities || [],
          isReady: true
        }
      }
    };

    await updateBattle(battleId, updatedBattle);
    setIsReady(true);
  };

  const playerHPPercent = (playerData.hp / 20) * 100;
  const playerEnergyPercent = (playerData.energy / 100) * 100;
  const opponentHPPercent = opponentData ? (opponentData.hp / 20) * 100 : 0;
  const opponentEnergyPercent = opponentData ? (opponentData.energy / 100) * 100 : 0;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-7xl mx-auto">
        {/* Battle Header with Player vs Opponent */}
        <div className="bg-gray-800 border border-red-600 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-red-400">
              <i className="fas fa-swords mr-2"></i>
              Battle Arena - {battle.phase}
            </h1>
            <Button 
              onClick={onLeaveBattle}
              variant="destructive"
              size="sm"
            >
              <i className="fas fa-door-open mr-1"></i>
              Leave Battle
            </Button>
          </div>

          {/* Player vs Opponent Layout */}
          <div className="flex items-center justify-between">
            {/* Player (Left Side) */}
            <div className="flex items-center space-x-6">
              <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center border-4 border-blue-400">
                <i className="fas fa-user text-3xl"></i>
              </div>
              <div>
                <h3 className="text-xl font-bold text-blue-400">{user.displayName}</h3>
                <div className={`text-sm mb-3 ${isReady ? 'text-green-400' : 'text-yellow-400'}`}>
                  {isReady ? '✓ Ready' : 'Selecting cards...'}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center space-x-3">
                    <i className="fas fa-heart text-red-400"></i>
                    <div className="w-32 bg-gray-700 rounded-full h-4">
                      <div 
                        className="bg-red-500 h-4 rounded-full transition-all duration-500"
                        style={{ width: `${playerHPPercent}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-bold min-w-12">{playerData.hp}/20</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <i className="fas fa-bolt text-yellow-400"></i>
                    <div className="w-32 bg-gray-700 rounded-full h-4">
                      <div 
                        className="bg-yellow-500 h-4 rounded-full transition-all duration-500"
                        style={{ width: `${playerEnergyPercent}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-bold min-w-16">{playerData.energy}/100</span>
                  </div>
                </div>
              </div>
            </div>

            {/* VS in center */}
            <div className="text-4xl font-bold text-red-400 animate-pulse">
              VS
            </div>

            {/* Opponent (Right Side) */}
            <div className="flex items-center space-x-6">
              <div className="text-right">
                <h3 className="text-xl font-bold text-red-400">{opponentData?.displayName || 'Opponent'}</h3>
                <div className={`text-sm mb-3 ${opponentData?.isReady ? 'text-green-400' : 'text-yellow-400'}`}>
                  {opponentData?.isReady ? '✓ Ready' : 'Selecting cards...'}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-bold min-w-12">{opponentData?.hp || 0}/20</span>
                    <div className="w-32 bg-gray-700 rounded-full h-4">
                      <div 
                        className="bg-red-500 h-4 rounded-full transition-all duration-500"
                        style={{ width: `${opponentHPPercent}%` }}
                      ></div>
                    </div>
                    <i className="fas fa-heart text-red-400"></i>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-bold min-w-16">{opponentData?.energy || 0}/100</span>
                    <div className="w-32 bg-gray-700 rounded-full h-4">
                      <div 
                        className="bg-yellow-500 h-4 rounded-full transition-all duration-500"
                        style={{ width: `${opponentEnergyPercent}%` }}
                      ></div>
                    </div>
                    <i className="fas fa-bolt text-yellow-400"></i>
                  </div>
                </div>
              </div>
              <div className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center border-4 border-red-400">
                <i className="fas fa-user text-3xl"></i>
              </div>
            </div>
          </div>
        </div>

        {/* Battle Status */}
        {battle.status === 'finished' && (
          <div className="bg-yellow-600 text-black p-4 rounded-lg mb-6 text-center">
            <h3 className="text-xl font-bold">
              {battle.winner === user.uid ? '🎉 Victory!' : 
               battle.winner === 'tie' ? '🤝 Draw!' : '😔 Defeat!'}
            </h3>
          </div>
        )}

        {/* Card Selection Area */}
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-bold text-yellow-400 mb-4">
              <i className="fas fa-layer-group mr-2"></i>
              Select Battle Card
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {playerBattleCards.map((card) => (
                <GameCard
                  key={card.id}
                  card={card}
                  onClick={() => handleSelectBattleCard(card.id)}
                  selected={selectedBattleCard === card.id}
                />
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-bold text-yellow-400 mb-4">
              <i className="fas fa-magic mr-2"></i>
              Select Abilities
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {playerAbilityCards.map((card) => (
                <GameCard
                  key={card.id}
                  card={card}
                  onClick={() => handleSelectAbility(card.id)}
                  selected={selectedAbilities.includes(card.id)}
                  disabled={playerData.energy < (card.cost || 0)}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-center">
            <Button
              onClick={handleReady}
              disabled={!selectedBattleCard || isReady || battle.status === 'finished'}
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8"
            >
              {isReady ? 'Waiting for opponent...' : 'Ready for Battle!'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}