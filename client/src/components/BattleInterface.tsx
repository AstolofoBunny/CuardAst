import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
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
  const { cards, updateBattle } = useFirestore();
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

  const playerData = battle?.players[user?.uid || ''];
  const opponentId = Object.keys(battle?.players || {}).find(id => id !== user?.uid);
  const opponentData = opponentId ? battle?.players[opponentId] : null;

  const playerBattleCards = cards.filter(card => 
    card.type === 'battle' && playerData?.deck.includes(card.id)
  );

  const playerAbilityCards = cards.filter(card => 
    card.type === 'ability' && playerData?.deck.includes(card.id)
  );

  const handleSelectBattleCard = (cardId: string) => {
    setSelectedBattleCard(cardId);
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
    if (!battle || !user || !selectedBattleCard) return;

    const updatedBattle = {
      ...battle,
      players: {
        ...battle.players,
        [user.uid]: {
          ...playerData!,
          selectedBattleCard,
          selectedAbilities,
          isReady: true
        }
      }
    };

    await updateBattle(battle.id, updatedBattle);
    setIsReady(true);

    // Check if both players are ready
    const allReady = Object.values(updatedBattle.players).every(p => p.isReady);
    if (allReady) {
      await resolveBattle(updatedBattle);
    }
  };

  const resolveBattle = async (currentBattle: Battle) => {
    if (!user) return;

    const playerIds = Object.keys(currentBattle.players);
    const player1Id = playerIds[0];
    const player2Id = playerIds[1];
    
    const player1 = currentBattle.players[player1Id];
    const player2 = currentBattle.players[player2Id];

    // Get battle cards
    const player1Card = cards.find(c => c.id === player1.selectedBattleCard);
    const player2Card = cards.find(c => c.id === player2.selectedBattleCard);

    if (!player1Card || !player2Card) return;

    // Calculate damage with class advantages
    let player1Damage = player1Card.damage || 0;
    let player2Damage = player2Card.damage || 0;

    // Apply class advantages (melee > mage > ranged > melee)
    if (player1Card.class === 'melee' && player2Card.class === 'mage') {
      player1Damage = Math.floor(player1Damage * 1.15);
    } else if (player1Card.class === 'mage' && player2Card.class === 'ranged') {
      player1Damage = Math.floor(player1Damage * 1.15);
    } else if (player1Card.class === 'ranged' && player2Card.class === 'melee') {
      player1Damage = Math.floor(player1Damage * 1.15);
    }

    if (player2Card.class === 'melee' && player1Card.class === 'mage') {
      player2Damage = Math.floor(player2Damage * 1.15);
    } else if (player2Card.class === 'mage' && player1Card.class === 'ranged') {
      player2Damage = Math.floor(player2Damage * 1.15);
    } else if (player2Card.class === 'ranged' && player1Card.class === 'melee') {
      player2Damage = Math.floor(player2Damage * 1.15);
    }

    // Apply critical hits (5% chance, 50% bonus damage)
    if (Math.random() < 0.05) {
      player1Damage = Math.floor(player1Damage * 1.5);
    }
    if (Math.random() < 0.05) {
      player2Damage = Math.floor(player2Damage * 1.5);
    }

    // Apply abilities
    for (const abilityId of player1.selectedAbilities) {
      const ability = cards.find(c => c.id === abilityId);
      if (ability) {
        // Apply ability effects (simplified)
        if (ability.id === 'lightning-bolt') {
          player2.hp = Math.max(0, player2.hp - 3);
        } else if (ability.id === 'healing-potion') {
          player1.hp = Math.min(20, player1.hp + 5);
        } else if (ability.id === 'critical-strike') {
          player1Damage *= 2;
        }
        // Consume energy
        player1.energy -= ability.cost || 0;
      }
    }

    for (const abilityId of player2.selectedAbilities) {
      const ability = cards.find(c => c.id === abilityId);
      if (ability) {
        // Apply ability effects (simplified)
        if (ability.id === 'lightning-bolt') {
          player1.hp = Math.max(0, player1.hp - 3);
        } else if (ability.id === 'healing-potion') {
          player2.hp = Math.min(20, player2.hp + 5);
        } else if (ability.id === 'critical-strike') {
          player2Damage *= 2;
        }
        // Consume energy
        player2.energy -= ability.cost || 0;
      }
    }

    // Determine winner of the round
    let roundWinner = '';
    if (player1Damage > player2Damage) {
      roundWinner = player1Id;
      player2.hp = Math.max(0, player2.hp - 1);
      player1.energy = Math.min(100, player1.energy + 20);
      player2.energy = Math.min(100, player2.energy + 15);
    } else if (player2Damage > player1Damage) {
      roundWinner = player2Id;
      player1.hp = Math.max(0, player1.hp - 1);
      player2.energy = Math.min(100, player2.energy + 20);
      player1.energy = Math.min(100, player1.energy + 15);
    } else {
      // Tie - both lose 1 HP
      player1.hp = Math.max(0, player1.hp - 1);
      player2.hp = Math.max(0, player2.hp - 1);
      player1.energy = Math.min(100, player1.energy + 15);
      player2.energy = Math.min(100, player2.energy + 15);
    }

    // Check for game over
    let gameWinner = '';
    if (player1.hp <= 0 && player2.hp <= 0) {
      gameWinner = 'tie';
    } else if (player1.hp <= 0) {
      gameWinner = player2Id;
    } else if (player2.hp <= 0) {
      gameWinner = player1Id;
    }

    // Update battle
    const updatedBattle = {
      ...currentBattle,
      players: {
        [player1Id]: { ...player1, selectedBattleCard: '', selectedAbilities: [], isReady: false },
        [player2Id]: { ...player2, selectedBattleCard: '', selectedAbilities: [], isReady: false }
      },
      round: currentBattle.round + 1,
      status: (gameWinner ? 'finished' : 'active') as 'active' | 'finished',
      winner: gameWinner || undefined
    };

    await updateBattle(currentBattle.id, updatedBattle);

    // Update user stats if game is finished
    if (gameWinner && gameWinner !== 'tie') {
      if (gameWinner === user.uid) {
        await updateUserStats(user.wins + 1, user.losses);
      } else {
        await updateUserStats(user.wins, user.losses + 1);
      }
    }

    // Update user HP and energy
    if (user.uid === player1Id) {
      await updateUserHP(player1.hp);
      await updateUserEnergy(player1.energy);
    } else {
      await updateUserHP(player2.hp);
      await updateUserEnergy(player2.energy);
    }

    // Reset local state
    setSelectedBattleCard('');
    setSelectedAbilities([]);
    setIsReady(false);
  };

  if (!battle || !playerData || !opponentData) {
    return (
      <div className="p-6 flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-yellow-400 mb-4"></div>
          <p className="text-lg">Loading battle...</p>
        </div>
      </div>
    );
  }

  const playerHPPercent = (playerData.hp / 20) * 100;
  const playerEnergyPercent = (playerData.energy / 100) * 100;
  const opponentHPPercent = (opponentData.hp / 20) * 100;
  const opponentEnergyPercent = (opponentData.energy / 100) * 100;

  return (
    <div className="p-6">
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-yellow-400">
            <i className="fas fa-sword mr-2"></i>
            Battle Arena
          </h2>
          <div className="flex items-center space-x-4">
            <div className="text-sm">
              <span className="text-gray-400">Round:</span>
              <span className="text-yellow-400 font-bold ml-2">{battle.round}</span>
            </div>
            <Button
              onClick={onLeaveBattle}
              variant="destructive"
              size="sm"
            >
              Leave Battle
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Player Stats */}
        <Card className="bg-gray-800 border-blue-600 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg">You</h3>
            <div className={`text-sm ${isReady ? 'text-green-400' : 'text-yellow-500'}`}>
              {isReady ? 'Ready' : 'Selecting...'}
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm">Health</span>
                <span className="text-sm">{playerData.hp}/20</span>
              </div>
              <Progress value={playerHPPercent} className="h-3 bg-gray-700" />
            </div>
            
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm">Energy</span>
                <span className="text-sm">{playerData.energy}/100</span>
              </div>
              <Progress value={playerEnergyPercent} className="h-3 bg-gray-700" />
            </div>
          </div>
        </Card>

        {/* Opponent Stats */}
        <Card className="bg-gray-800 border-blue-600 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg">{opponentData.name}</h3>
            <div className={`text-sm ${opponentData.isReady ? 'text-green-400' : 'text-yellow-500'}`}>
              {opponentData.isReady ? 'Ready' : 'Thinking...'}
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm">Health</span>
                <span className="text-sm">{opponentData.hp}/20</span>
              </div>
              <Progress value={opponentHPPercent} className="h-3 bg-gray-700" />
            </div>
            
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm">Energy</span>
                <span className="text-sm">{opponentData.energy}/100</span>
              </div>
              <Progress value={opponentEnergyPercent} className="h-3 bg-gray-700" />
            </div>
          </div>
        </Card>
      </div>

      {battle.status === 'active' && (
        <>
          {/* Battle Cards Selection */}
          <Card className="bg-gray-800 border-blue-600 p-6 mb-6">
            <h3 className="font-bold text-lg mb-4">Select Your Battle Card</h3>
            
            <div className="grid grid-cols-5 gap-4">
              {playerBattleCards.map((card) => (
                <GameCard
                  key={card.id}
                  card={card}
                  onClick={() => handleSelectBattleCard(card.id)}
                  selected={selectedBattleCard === card.id}
                  className="h-32"
                />
              ))}
            </div>
          </Card>

          {/* Ability Cards */}
          <Card className="bg-gray-800 border-blue-600 p-6 mb-6">
            <h3 className="font-bold text-lg mb-4">Ability Cards (Optional)</h3>
            
            <div className="grid grid-cols-4 gap-4">
              {playerAbilityCards.map((card) => (
                <GameCard
                  key={card.id}
                  card={card}
                  onClick={() => handleSelectAbility(card.id)}
                  selected={selectedAbilities.includes(card.id)}
                  className="h-32"
                />
              ))}
            </div>
          </Card>

          {/* Battle Actions */}
          <div className="flex items-center justify-center">
            <Button
              onClick={handleReady}
              disabled={!selectedBattleCard || isReady}
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-8 text-lg"
            >
              <i className="fas fa-check mr-2"></i>
              {isReady ? 'Waiting for opponent...' : 'Ready for Battle!'}
            </Button>
          </div>
        </>
      )}

      {battle.status === 'finished' && (
        <Card className="bg-gray-800 border-blue-600 p-6 text-center">
          <h3 className="text-2xl font-bold mb-4">
            {battle.winner === user?.uid ? (
              <span className="text-green-400">Victory!</span>
            ) : battle.winner === 'tie' ? (
              <span className="text-yellow-400">Draw!</span>
            ) : (
              <span className="text-red-400">Defeat!</span>
            )}
          </h3>
          <Button onClick={onLeaveBattle} className="bg-blue-600 hover:bg-blue-700">
            Return to Lobby
          </Button>
        </Card>
      )}
    </div>
  );
}
