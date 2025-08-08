import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GameCard } from '@/components/GameCard';
import { Battle, GameCard as GameCardType } from '@/types/game';
import { useAuth } from '@/hooks/useAuth';
import { useFirestore } from '@/hooks/useFirestore';
import { useToast } from '@/hooks/use-toast';
import { doc, onSnapshot, DocumentData, DocumentSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface BattleInterfaceProps {
  battleId: string;
  onLeaveBattle: () => void;
}

export function BattleInterface({ battleId, onLeaveBattle }: BattleInterfaceProps) {
  const { user, updateUserHP, updateUserEnergy, updateUserStats } = useAuth();
  const { cards, updateBattle, markPlayerReady, checkAITurn } = useFirestore();
  const { toast } = useToast();
  const [battle, setBattle] = useState<Battle | null>(null);
  const [selectedBattleCard, setSelectedBattleCard] = useState<string>('');
  const [selectedAttackCard, setSelectedAttackCard] = useState<string>('');
  const [selectedTarget, setSelectedTarget] = useState<string>('');
  const [pendingActions, setPendingActions] = useState<any[]>([]);
  const [currentTurn, setCurrentTurn] = useState(1);

  // Optimized battle listener - reduced Firebase reads
  useEffect(() => {
    if (!battleId) return;

    const unsubscribe = onSnapshot(
      doc(db, 'battles', battleId),
      (doc: DocumentSnapshot<DocumentData>) => {
        if (doc.exists()) {
          const battleData = doc.data() as Battle;
          setBattle(prevBattle => {
            // Only update if data actually changed - reduces unnecessary re-renders
            if (!prevBattle || JSON.stringify(prevBattle) !== JSON.stringify(battleData)) {
              setCurrentTurn(battleData.currentRound || 1);
              return battleData;
            }
            return prevBattle;
          });
          
          // Check if battle is finished
          if (battleData.status !== 'finished') {
            const players = Object.values(battleData.players);
            const defeatedPlayers = players.filter(p => p.hp <= 0);
            
            if (defeatedPlayers.length > 0) {
              // End the battle
              const winner = players.find(p => p.hp > 0)?.uid || 'tie';
              const finishedBattle = {
                ...battleData,
                status: 'finished' as const,
                phase: 'finished' as const,
                winner
              };
              
              updateBattle(battleId, finishedBattle);
              
              // Update user stats if this player won/lost
              if (user && winner !== 'tie' && updateUserStats) {
                if (winner === user.uid) {
                  updateUserStats(user.wins + 1, user.losses);
                  toast({ title: "Victory!", description: "You won the battle!" });
                } else {
                  updateUserStats(user.wins, user.losses + 1);
                  toast({ title: "Defeat", description: "You lost the battle.", variant: "destructive" });
                }
              }
              
              return;
            }
          }
          
          // Check if AI needs to make a move
          if (battleData && checkAITurn) {
            checkAITurn(battleData);
          }
        }
      },
      (error) => {
        console.error('Battle subscription error:', error);
        toast({
          title: "Connection Error",
          description: "Lost connection to battle. Reconnecting...",
          variant: "destructive"
        });
      }
    );

    return () => unsubscribe();
  }, [battleId, checkAITurn, updateBattle, user, updateUserStats, toast]);

  // Memoized card collections to optimize rendering
  const cardCollections = useMemo(() => {
    if (!battle || !user || !battle.players[user.uid]) {
      return { playerBattleCards: [], playerAbilityCards: [], playerSpellCards: [], opponentSpellCards: [], allBattleCards: [], allAbilityCards: [] };
    }

    const playerData = battle.players[user.uid];
    const playerHand = playerData.hand || [];
    const playerSpellDeck = playerData.spellDeck || [];
    
    const opponentId = Object.keys(battle.players).find(id => id !== user.uid);
    const opponentData = opponentId ? battle.players[opponentId] : null;
    const opponentSpellDeck = opponentData?.spellDeck || [];
    
    const allBattleCards = cards.filter(card => card.type === 'battle');
    const allAbilityCards = cards.filter(card => card.type === 'ability');
    const playerBattleCards = allBattleCards.filter(card => playerHand.includes(card.id)).slice(0, 5);
    const playerAbilityCards = allAbilityCards.filter(card => playerHand.includes(card.id)).slice(0, 5);
    const playerSpellCards = allAbilityCards.filter(card => playerSpellDeck.includes(card.id));
    const opponentSpellCards = allAbilityCards.filter(card => opponentSpellDeck.includes(card.id));

    return { playerBattleCards, playerAbilityCards, playerSpellCards, opponentSpellCards, allBattleCards, allAbilityCards };
  }, [battle, user, cards]);

  // Action handlers with optimized Firebase updates
  const handleAttack = useCallback(async (attackerCardId: string, targetPosition: string) => {
    if (!battle || !user || !updateBattle) return;
    
    console.log('Attack initiated:', { attackerCardId, targetPosition, currentTurn: battle.currentTurn, userId: user.uid });

    const playerData = battle.players[user.uid];
    const opponentId = Object.keys(battle.players).find(id => id !== user.uid);
    
    if (!playerData || !opponentId || !battle.players[opponentId]) {
      console.log('Invalid player or opponent data');
      return;
    }

    const attackerCard = cards.find(c => c.id === attackerCardId);
    const targetCardId = battle.players[opponentId].battlefield[targetPosition as 'left' | 'center' | 'right'];
    const targetCard = targetCardId ? cards.find(c => c.id === targetCardId) : null;

    if (!attackerCard) {
      console.log('Attacker card not found');
      return;
    }

    console.log('Attack details:', { attackerCard: attackerCard.name, targetCard: targetCard?.name });

    try {
      let damage = attackerCard.attack || 0;
      let updatedBattle = JSON.parse(JSON.stringify(battle)); // Deep copy

      if (targetCard && targetCardId) {
        // Calculate damage with resistances and critical hits
        const isCritical = Math.random() * 100 < (attackerCard.criticalChance || 0);
        if (isCritical) {
          damage = Math.round(damage * ((attackerCard.criticalDamage || 150) / 100));
        }

        // Apply class-based resistances
        const resistance = attackerCard.class === 'ranged' ? (targetCard.rangedResistance || 0) :
                          attackerCard.class === 'melee' ? (targetCard.meleeResistance || 0) :
                          (targetCard.magicResistance || 0);
        
        damage = Math.max(0, damage - Math.round(damage * resistance / 100));
        damage = Math.max(0, damage - (targetCard.defense || 0));

        // Initialize or update card health tracking
        if (!updatedBattle.cardHealths) {
          updatedBattle.cardHealths = {};
        }
        
        const currentHealth = updatedBattle.cardHealths[targetCardId] !== undefined ? 
          updatedBattle.cardHealths[targetCardId] : targetCard.health || 0;
        const newHealth = Math.max(0, currentHealth - damage);
        
        updatedBattle.cardHealths[targetCardId] = newHealth;

        console.log('Damage calculation:', { damage, currentHealth, newHealth });

        // Remove destroyed card if health <= 0
        if (newHealth <= 0) {
          updatedBattle.players[opponentId].battlefield[targetPosition as 'left' | 'center' | 'right'] = null;
          delete updatedBattle.cardHealths[targetCardId];
          console.log('Card destroyed:', targetCard.name);
        }

        toast({
          title: isCritical ? "Critical Hit!" : "Attack Successful",
          description: `${attackerCard.name} dealt ${damage} damage to ${targetCard.name}${newHealth <= 0 ? ' (Destroyed!)' : ` (${newHealth}/${targetCard.health} HP)`}`,
          variant: "default"
        });
      } else {
        // Direct attack to player
        updatedBattle.players[opponentId].hp = Math.max(0, battle.players[opponentId].hp - damage);
        
        console.log('Direct attack:', { damage, newHP: updatedBattle.players[opponentId].hp });
        
        toast({
          title: "Direct Attack!",
          description: `${attackerCard.name} dealt ${damage} damage to opponent`,
        });
      }

      // Mark attacker as used
      const playerData = battle.players[user.uid];
      const attackerPosition = playerData.battlefield.left === attackerCardId ? 'left' :
                               playerData.battlefield.center === attackerCardId ? 'center' : 'right';
      if (!updatedBattle.players[user.uid].battlefieldAttacks) {
        updatedBattle.players[user.uid].battlefieldAttacks = { left: false, center: false, right: false };
      }
      updatedBattle.players[user.uid].battlefieldAttacks[attackerPosition] = true;

      console.log('Updating battle state...');
      await updateBattle(battleId, updatedBattle);
      
      setSelectedAttackCard('');
      setSelectedTarget('');
      
      console.log('Attack completed successfully');
    } catch (error) {
      console.error('Error during attack:', error);
      toast({
        title: "Attack Failed",
        description: "Something went wrong during the attack",
        variant: "destructive"
      });
    }
  }, [battle, user, cards, updateBattle, battleId, toast]);

  const getCardPosition = useCallback((cardId: string): 'left' | 'center' | 'right' => {
    if (!battle || !user) return 'left';
    const playerData = battle.players[user.uid];
    if (playerData.battlefield.left === cardId) return 'left';
    if (playerData.battlefield.center === cardId) return 'center';
    if (playerData.battlefield.right === cardId) return 'right';
    return 'left';
  }, [battle, user]);

  const handleSelectBattleCard = useCallback((cardId: string) => {
    setSelectedBattleCard(cardId);
    setSelectedAttackCard('');
  }, []);

  const handleSelectAttackCard = useCallback((cardId: string) => {
    if (selectedAttackCard === cardId) {
      setSelectedAttackCard('');
      setSelectedTarget('');
    } else {
      setSelectedAttackCard(cardId);
      setSelectedTarget('');
    }
  }, [selectedAttackCard]);

  const handleUseAbility = useCallback(async (cardId: string) => {
    if (!battle || !user || !updateBattle) return;

    const abilityCard = cards.find(c => c.id === cardId);
    const playerData = battle.players[user.uid];
    
    if (!abilityCard || !playerData) return;
    
    const cost = abilityCard.cost || 0;
    if (playerData.energy < cost) {
      toast({
        title: "Not Enough Energy",
        description: `Need ${cost} energy to use ${abilityCard.name}`,
        variant: "destructive"
      });
      return;
    }

    // Update battle state with ability use
    const updatedBattle = {
      ...battle,
      players: {
        ...battle.players,
        [user.uid]: {
          ...playerData,
          energy: playerData.energy - cost,
          hand: playerData.hand.filter(id => id !== cardId) // Remove used ability from hand
        }
      },
      lastActivity: Date.now()
    };

    await updateBattle(battleId, updatedBattle);
    
    toast({
      title: "Ability Used",
      description: `${abilityCard.name} activated!`,
    });
  }, [battle, user, cards, updateBattle, battleId, toast]);

  const handleUseSpell = useCallback(async (cardId: string) => {
    if (!battle || !user || !updateBattle) return;

    const spellCard = cards.find(c => c.id === cardId);
    const playerData = battle.players[user.uid];
    
    if (!spellCard || !playerData) return;
    
    const cost = spellCard.cost || 0;
    if (playerData.energy < cost) {
      toast({
        title: "Not Enough Energy",
        description: `Need ${cost} energy to use ${spellCard.name}`,
        variant: "destructive"
      });
      return;
    }

    // Check cooldown
    const cooldowns = playerData.spellCooldowns || {};
    if (cooldowns[cardId] && cooldowns[cardId] > 0) {
      toast({
        title: "Spell on Cooldown",
        description: `${spellCard.name} will be ready in ${cooldowns[cardId]} rounds`,
        variant: "destructive"
      });
      return;
    }

    // Update battle state with spell use and cooldown
    const updatedBattle = {
      ...battle,
      players: {
        ...battle.players,
        [user.uid]: {
          ...playerData,
          energy: playerData.energy - cost,
          spellCooldowns: {
            ...cooldowns,
            [cardId]: 3 // 3 round cooldown for spells
          }
        }
      },
      lastActivity: Date.now()
    };

    await updateBattle(battleId, updatedBattle);
    
    toast({
      title: "Spell Cast!",
      description: `${spellCard.name} activated!`,
    });
  }, [battle, user, cards, updateBattle, battleId, toast]);

  const handlePlaceCard = useCallback(async (position: 'left' | 'center' | 'right') => {
    if (!selectedBattleCard || !user || !battle) return;
    
    const card = cards.find(c => c.id === selectedBattleCard);
    const playerData = battle.players[user.uid];
    
    if (!card || !playerData) return;
    
    // Check if position is already occupied
    if (playerData.battlefield[position]) {
      toast({
        title: "Position Occupied",
        description: "This position already has a card!",
        variant: "destructive"
      });
      return;
    }
    
    // Check if player has enough energy
    if (playerData.energy < 20) {
      toast({
        title: "Not Enough Energy",
        description: "You need 20 energy to place a battle card!",
        variant: "destructive"
      });
      return;
    }
    
    // Add to pending actions instead of immediate update
    const newAction = {
      type: 'place_card',
      cardId: selectedBattleCard,
      position,
      timestamp: Date.now()
    };
    
    setPendingActions(prev => [...prev, newAction]);
    setSelectedBattleCard('');
    
    toast({
      title: "Card Placed",
      description: "Click 'End Turn' to confirm your moves.",
      variant: "default"
    });
  }, [selectedBattleCard, user, battle, cards, toast]);

  // Apply all pending actions and end turn
  const handleEndTurn = useCallback(async () => {
    if (!battle || !user || !battleId || pendingActions.length === 0) return;

    const playerData = battle.players[user.uid];
    let updatedPlayerData = { ...playerData };
    
    // Process all pending actions
    for (const action of pendingActions) {
      if (action.type === 'place_card') {
        updatedPlayerData = {
          ...updatedPlayerData,
          battlefield: {
            ...updatedPlayerData.battlefield,
            [action.position]: action.cardId // Store card ID, not object
          },
          energy: updatedPlayerData.energy - 20,
          hand: updatedPlayerData.hand.filter(cardId => cardId !== action.cardId)
        };
      }
    }
    
    const updatedBattle = {
      ...battle,
      players: {
        ...battle.players,
        [user.uid]: updatedPlayerData
      },
      lastActivity: Date.now()
    };

    await updateBattle(battleId, updatedBattle);
    setPendingActions([]);
    
    toast({
      title: "Turn Completed",
      description: "Your moves have been applied! Opponent's turn now.",
    });
  }, [battle, user, battleId, pendingActions, updateBattle, toast]);

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

  const playerHPPercent = (playerData.hp / 50) * 100;
  const playerEnergyPercent = (playerData.energy / 100) * 100;
  const opponentHPPercent = opponentData ? (opponentData.hp / 50) * 100 : 0;
  const opponentEnergyPercent = opponentData ? (opponentData.energy / 100) * 100 : 0;

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gray-900 text-white flex">
        {/* Main Battle Area */}
        <div className="flex-1 p-4">
          <div className="max-w-6xl mx-auto">
            {/* Battle Header */}
            <div className="bg-gray-800 border border-red-600 rounded-lg p-6 mb-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-red-400">
                    <i className="fas fa-swords mr-2"></i>
                    Battle Arena - Round {currentTurn}
                  </h1>
                  <div className={`text-sm mt-1 ${battle.currentTurn === user.uid ? 'text-green-400' : 'text-orange-400'}`}>
                    {battle.currentTurn === user.uid ? '🟢 Your Turn - You can attack!' : `🟡 ${opponentData?.displayName || 'Opponent'}'s Turn - Please wait`}
                  </div>
                </div>
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
                  <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center border-4 border-blue-400 overflow-hidden">
                    {user.profilePicture ? (
                      <img 
                        src={user.profilePicture} 
                        alt={user.displayName}
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : (
                      <i className="fas fa-user text-3xl"></i>
                    )}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-blue-400">{user.displayName}</h3>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-3">
                        <i className="fas fa-heart text-red-400"></i>
                        <div className="w-32 bg-gray-700 rounded-full h-4">
                          <div 
                            className="bg-red-500 h-4 rounded-full transition-all duration-500"
                            style={{ width: `${playerHPPercent}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-bold min-w-12">{playerData.hp}/50</span>
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
                    <h3 className="text-xl font-bold text-red-400">
                      {opponentData?.displayName || 'Opponent'}
                      {opponentData?.uid === 'ai_opponent' && (
                        <span className="ml-2 px-2 py-1 bg-purple-600 text-purple-100 text-xs rounded-full">AI</span>
                      )}
                    </h3>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-3">
                        <span className="text-sm font-bold min-w-12">{opponentData?.hp || 0}/50</span>
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
                  <div className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center border-4 border-red-400 overflow-hidden">
                    {opponentData?.uid === 'ai_opponent' ? (
                      <i className="fas fa-robot text-3xl text-purple-300"></i>
                    ) : (opponentData && (opponentData as any)?.profilePicture) ? (
                      <img 
                        src={(opponentData as any).profilePicture} 
                        alt={opponentData.displayName}
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : (
                      <i className="fas fa-user text-3xl"></i>
                    )}
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



            {/* Battlefield Display with Attack System */}
            <div className="bg-gray-800 border border-purple-600 rounded-lg p-6 mb-6">
              <h2 className="text-xl font-bold text-purple-400 mb-4 text-center">
                <i className="fas fa-chess-board mr-2"></i>
                Battle Field {selectedAttackCard && '- Select Target'}
              </h2>
              
              {/* Opponent's Battlefield */}
              <div className="mb-6">
                <h3 className="text-sm font-bold text-red-400 mb-2">
                  {opponentData?.displayName || 'Opponent'}'s Cards
                  {opponentData?.uid === 'ai_opponent' && (
                    <span className="ml-2 px-1 py-0.5 bg-purple-600 text-purple-100 text-xs rounded">AI</span>
                  )}
                </h3>
                <div className="flex justify-center space-x-4">
                  {['left', 'center', 'right'].map((position) => {
                    const cardId = opponentData?.battlefield?.[position as 'left' | 'center' | 'right'];
                    const card = cardId ? cards.find(c => c.id === cardId) : null;
                    const isTargetable = selectedAttackCard && battle.currentTurn === user.uid;
                    
                    return (
                      <Tooltip key={position}>
                        <TooltipTrigger asChild>
                          <div 
                            className={`w-24 h-32 border-2 rounded-lg bg-gray-700 flex items-center justify-center cursor-pointer transition-all duration-200 ${
                              isTargetable ? 'border-orange-500 hover:border-orange-300 hover:bg-orange-900' : 
                              card ? 'border-red-500' : 'border-gray-500'
                            }`}
                            onClick={() => {
                              if (selectedAttackCard && isTargetable) {
                                handleAttack(selectedAttackCard, position);
                              }
                            }}
                          >
                            {card ? (
                              <div className="text-center p-1">
                                <div className="text-xs font-bold text-red-300 truncate">{card.name}</div>
                                <div className="text-xs text-gray-300 mt-1">
                                  <div>⚔️{card.attack}</div>
                                  <div>🛡️{card.defense}</div>
                                  <div>❤️{cardId && battle.cardHealths && cardId in battle.cardHealths ? battle.cardHealths[cardId] : card.health}/{card.health}</div>
                                </div>
                              </div>
                            ) : isTargetable ? (
                              <div className="text-center">
                                <span className="text-orange-400 text-xs">Direct Attack</span>
                              </div>
                            ) : (
                              <span className="text-gray-500 text-xs">{position}</span>
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          {card ? (
                            <div className="p-2">
                              <p className="font-bold">{card.name}</p>
                              <p className="text-sm">{(card as any).battleDescription || card.description || 'No description available'}</p>
                              <div className="text-xs mt-2">
                                <div>Attack: {card.attack}</div>
                                <div>Defense: {card.defense}</div>
                                <div>Health: {cardId && battle.cardHealths && cardId in battle.cardHealths ? battle.cardHealths[cardId] : card.health}/{card.health}</div>
                              </div>
                            </div>
                          ) : isTargetable ? (
                            <p>Click to attack opponent directly</p>
                          ) : (
                            <p>Empty position</p>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              </div>
              
              {/* VS Divider */}
              <div className="text-center text-2xl font-bold text-yellow-400 mb-6">
                ⚔️ VS ⚔️
              </div>
              
              {/* Player's Battlefield */}
              <div>
                <h3 className="text-sm font-bold text-blue-400 mb-2">Your Cards</h3>
                <div className="flex justify-center space-x-4">
                  {['left', 'center', 'right'].map((position) => {
                    const cardId = playerData.battlefield[position as 'left' | 'center' | 'right'];
                    const card = cardId ? cards.find(c => c.id === cardId) : null;
                    const hasPendingAction = pendingActions.some(a => a.position === position && a.type === 'place_card');
                    const canAttack = card && battle.currentTurn === user.uid && !playerData.battlefieldAttacks?.[position as 'left' | 'center' | 'right'];
                    const isSelectedForAttack = selectedAttackCard === cardId;
                    
                    return (
                      <Tooltip key={position}>
                        <TooltipTrigger asChild>
                          <div 
                            className={`w-24 h-32 border-2 rounded-lg bg-gray-700 flex items-center justify-center cursor-pointer transition-all duration-200 ${
                              isSelectedForAttack ? 'border-orange-400 bg-orange-900' :
                              hasPendingAction ? 'border-green-400 bg-green-900' :
                              canAttack ? 'border-yellow-400 hover:border-yellow-300 hover:bg-yellow-900' :
                              card ? 'border-blue-500' : 'border-gray-500 hover:border-blue-400'
                            }`}
                            onClick={() => {
                              if (!card && selectedBattleCard && !hasPendingAction) {
                                handlePlaceCard(position as 'left' | 'center' | 'right');
                              } else if (canAttack && cardId) {
                                handleSelectAttackCard(cardId);
                              }
                            }}
                          >
                            {card ? (
                              <div className="text-center p-1">
                                <div className="text-xs font-bold text-blue-300 truncate">{card.name}</div>
                                <div className="text-xs text-gray-300 mt-1">
                                  <div>⚔️{card.attack}</div>
                                  <div>🛡️{card.defense}</div>
                                  <div>❤️{cardId && battle.cardHealths && cardId in battle.cardHealths ? battle.cardHealths[cardId] : card.health}/{card.health}</div>
                                </div>
                                {canAttack && (
                                  <div className="text-xs text-orange-400 mt-1">Can Attack!</div>
                                )}
                              </div>
                            ) : hasPendingAction ? (
                              <div className="text-center">
                                <div className="text-xs text-green-400">Pending...</div>
                              </div>
                            ) : (
                              <div className="text-center">
                                <span className="text-gray-500 text-xs">{position}</span>
                                {selectedBattleCard && (
                                  <div className="text-xs text-yellow-400 mt-1">Click to place</div>
                                )}
                              </div>
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          {card ? (
                            <div className="p-2">
                              <p className="font-bold">{card.name}</p>
                              <p className="text-sm">{(card as any).battleDescription || card.description || 'No description available'}</p>
                              <div className="text-xs mt-2">
                                <div>Attack: {card.attack}</div>
                                <div>Defense: {card.defense}</div>
                                <div>Health: {cardId && battle.cardHealths && cardId in battle.cardHealths ? battle.cardHealths[cardId] : card.health}/{card.health}</div>
                                {canAttack && <div className="text-orange-400">Ready to attack!</div>}
                              </div>
                            </div>
                          ) : selectedBattleCard ? (
                            <p>Click to place {cards.find(c => c.id === selectedBattleCard)?.name}</p>
                          ) : (
                            <p>Empty position</p>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Card Selection Area with Spell Deck */}
            <div className="space-y-6">
              {/* Player Status & Spell Deck */}
              <div className="flex items-center justify-between bg-gray-800 border border-blue-600 rounded-lg p-4">
                {/* Player Avatar & Stats */}
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center border-4 border-blue-400 overflow-hidden">
                    {user.profilePicture ? (
                      <img 
                        src={user.profilePicture} 
                        alt={user.displayName}
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : (
                      <i className="fas fa-user text-2xl"></i>
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-blue-400">{user.displayName}</h3>
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <i className="fas fa-heart text-red-400"></i>
                        <div className="w-24 bg-gray-700 rounded-full h-3">
                          <div 
                            className="bg-red-500 h-3 rounded-full transition-all duration-500"
                            style={{ width: `${(playerData.hp / 50) * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-bold">{playerData.hp}/50</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <i className="fas fa-bolt text-yellow-400"></i>
                        <div className="w-24 bg-gray-700 rounded-full h-3">
                          <div 
                            className="bg-yellow-500 h-3 rounded-full transition-all duration-500"
                            style={{ width: `${(playerData.energy / 100) * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-bold">{playerData.energy}/100</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Spell Deck - Right of avatar */}
                <div>
                  <h4 className="text-sm font-bold text-purple-400 mb-2 text-center">
                    <i className="fas fa-magic mr-1"></i>
                    Spell Deck (3)
                  </h4>
                  <div className="flex space-x-2">
                    {Array.from({ length: 3 }).map((_, index) => {
                      const spellCard = cardCollections.playerSpellCards[index];
                      const cooldowns = playerData.spellCooldowns || {};
                      const cooldown = spellCard ? cooldowns[spellCard.id] || 0 : 0;
                      const canUse = spellCard && playerData.energy >= (spellCard.cost || 0) && cooldown <= 0;
                      
                      console.log('Spell deck slot', index, ':', spellCard ? spellCard.name : 'Empty', 'from deck:', playerData.spellDeck);
                      
                      return (
                        <Tooltip key={index}>
                          <TooltipTrigger asChild>
                            <div 
                              className={`w-14 h-18 border-2 rounded-lg flex items-center justify-center cursor-pointer transition-all duration-200 ${
                                canUse ? 'border-purple-500 hover:border-purple-300 hover:bg-purple-900 bg-gray-700' :
                                spellCard ? 'border-gray-600 bg-gray-700 opacity-50' : 'border-purple-500 bg-gray-700'
                              }`}
                              onClick={() => {
                                if (canUse && spellCard) {
                                  handleUseSpell(spellCard.id);
                                }
                              }}
                            >
                              {spellCard ? (
                                <div className="text-center p-1">
                                  <div className="text-xs font-bold text-purple-300 truncate">{spellCard.name.substring(0, 5)}</div>
                                  <div className="text-xs text-yellow-400">⚡{spellCard.cost}</div>
                                  {cooldown > 0 && (
                                    <div className="text-xs text-red-400">{cooldown}⌛</div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-gray-500 text-xs">—</span>
                              )}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            {spellCard ? (
                              <div className="p-2">
                                <p className="font-bold">{spellCard.name}</p>
                                <p className="text-sm">{spellCard.description}</p>
                                <div className="text-xs mt-2">
                                  <div>Energy Cost: {spellCard.cost || 0}</div>
                                  <div>Type: {spellCard.spellType}</div>
                                  {cooldown > 0 && <div className="text-red-400">Cooldown: {cooldown} rounds</div>}
                                </div>
                              </div>
                            ) : (
                              <p>Empty spell slot</p>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold text-yellow-400 mb-4">
                  <i className="fas fa-layer-group mr-2"></i>
                  Your Hand (Max 5 Cards) {selectedBattleCard && '(Click on battlefield position to place)'}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {cardCollections.playerBattleCards.map((card) => (
                    <GameCard
                      key={card.id}
                      card={card}
                      onClick={() => handleSelectBattleCard(card.id)}
                      selected={selectedBattleCard === card.id}
                    />
                  ))}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex justify-center space-x-4">
                {pendingActions.length > 0 && (
                  <Button
                    onClick={handleEndTurn}
                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8"
                  >
                    End Turn ({pendingActions.length} actions)
                  </Button>
                )}
                
                {selectedAttackCard && (
                  <Button
                    onClick={() => {
                      setSelectedAttackCard('');
                      setSelectedTarget('');
                    }}
                    variant="outline"
                    className="border-orange-600 text-orange-400 hover:bg-orange-900"
                  >
                    Cancel Attack
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar - Ability Cards */}
        <div className="w-80 bg-gray-800 border-l border-gray-700 p-4">
          <h3 className="text-lg font-bold text-purple-400 mb-4">
            <i className="fas fa-magic mr-2"></i>
            Ability Cards
          </h3>
          <div className="space-y-3">
            {cardCollections.playerAbilityCards.map((card) => (
              <Tooltip key={card.id}>
                <TooltipTrigger asChild>
                  <div 
                    className={`p-3 border rounded-lg cursor-pointer transition-all duration-200 ${
                      playerData.energy >= (card.cost || 0) 
                        ? 'border-purple-500 hover:border-purple-300 hover:bg-purple-900 bg-gray-900' 
                        : 'border-gray-600 bg-gray-700 opacity-50'
                    }`}
                    onClick={() => {
                      if (playerData.energy >= (card.cost || 0)) {
                        handleUseAbility(card.id);
                      }
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-bold text-purple-300 text-sm">{card.name}</h4>
                      <span className="text-xs bg-purple-600 text-white px-2 py-1 rounded">
                        {card.cost || 0} ⚡
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 line-clamp-2">
                      {card.description || 'No description available'}
                    </p>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="p-2">
                    <p className="font-bold">{card.name}</p>
                    <p className="text-sm">{card.description || 'No description available'}</p>
                    <div className="text-xs mt-2">
                      <div>Energy Cost: {card.cost || 0}</div>
                      <div>Type: {card.spellType}</div>
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}