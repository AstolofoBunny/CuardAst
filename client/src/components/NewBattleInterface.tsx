import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { GameCard } from '@/components/GameCard';
import { SpellDeckDisplay } from '@/components/SpellDeckDisplay';
import { BattleLogDisplay } from '@/components/BattleLogDisplay';
import { Battle, GameCard as GameCardType } from '@/types/game';
import { useAuth } from '@/hooks/useAuth';
import { useFirestore } from '@/hooks/useFirestore';
import { useBattleSystem } from '@/hooks/useBattleSystem';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Heart, Zap, Crown, Shield, Sword, LogOut, RotateCcw } from 'lucide-react';

interface BattleInterfaceProps {
  roomId: string;
  onLeaveBattle: () => void;
}

export function NewBattleInterface({ roomId, onLeaveBattle }: BattleInterfaceProps) {
  const { user, updateUserStats } = useAuth();
  const { cards } = useFirestore();
  const { 
    battle, 
    battleLogs, 
    spellDecks, 
    loading,
    initializeSpellDecks,
    performAttack,
    castSpell,
    updateBattleState,
    logBattleAction
  } = useBattleSystem(roomId);
  const { toast } = useToast();
  
  const [selectedBattleCard, setSelectedBattleCard] = useState<string>('');
  const [selectedTarget, setSelectedTarget] = useState<string>('');
  const [showBattleLog, setShowBattleLog] = useState(false);

  // Initialize spell decks when battle starts
  useEffect(() => {
    if (battle && battle.status === 'active' && Object.keys(spellDecks).length === 0) {
      initializeSpellDecks(battle.players);
    }
  }, [battle, spellDecks, initializeSpellDecks]);

  // Handle battle end conditions
  useEffect(() => {
    if (!battle || !user) return;

    const players = Object.values(battle.players);
    const defeatedPlayers = players.filter(p => p.hp <= 0);
    
    if (defeatedPlayers.length > 0 && battle.status === 'active') {
      const winner = players.find(p => p.hp > 0)?.uid || 'tie';
      
      setTimeout(async () => {
        await updateBattleState({
          status: 'finished',
          phase: 'finished',
          winner
        });
        
        if (updateUserStats) {
          if (winner === user.uid) {
            updateUserStats(user.wins + 1, user.losses);
            toast({ title: "Victory!", description: "You won the battle!" });
          } else if (winner !== 'tie') {
            updateUserStats(user.wins, user.losses + 1);
            toast({ title: "Defeat", description: "You lost the battle.", variant: "destructive" });
          }
        }
      }, 1000);
    }
  }, [battle, user, updateBattleState, updateUserStats, toast]);

  // Get player and opponent data
  const gameData = useMemo(() => {
    if (!battle || !user || !battle.players[user.uid]) {
      return {
        playerData: null,
        opponentData: null,
        opponentId: null,
        playerHand: [],
        isPlayerTurn: false
      };
    }

    const playerData = battle.players[user.uid];
    const opponentId = Object.keys(battle.players).find(id => id !== user.uid);
    const opponentData = opponentId ? battle.players[opponentId] : null;
    const playerHand = playerData.hand || [];
    const isPlayerTurn = battle.currentTurn === user.uid;

    return {
      playerData,
      opponentData,
      opponentId,
      playerHand,
      isPlayerTurn
    };
  }, [battle, user]);

  // Filter cards for display
  const displayCards = useMemo(() => {
    const battleCards = cards.filter(card => card.type === 'battle');
    const abilityCards = cards.filter(card => card.type === 'ability');
    
    const playerBattleCards = battleCards.filter(card => 
      gameData.playerHand.includes(card.id)
    ).slice(0, 5);
    
    return {
      playerBattleCards,
      battleCards,
      abilityCards
    };
  }, [cards, gameData.playerHand]);

  // Handle spell casting
  const handleCastSpell = useCallback(async (spellId: string) => {
    if (!user || !gameData.isPlayerTurn) return;

    try {
      await castSpell(user.uid, spellId, gameData.opponentId || undefined);
      toast({
        title: "Spell Cast",
        description: `Successfully cast ${spellId}`,
      });
    } catch (error) {
      console.error('Spell cast failed:', error);
    }
  }, [user, gameData.isPlayerTurn, gameData.opponentId, castSpell, toast]);

  // Handle attack
  const handleAttack = useCallback(async (attackerCardId: string, targetPosition: string) => {
    if (!user || !gameData.isPlayerTurn || !gameData.opponentId) return;

    try {
      await performAttack(user.uid, attackerCardId, targetPosition, gameData.opponentId);
      setSelectedBattleCard('');
      setSelectedTarget('');
      toast({
        title: "Attack Launched",
        description: "Attack in progress...",
      });
    } catch (error) {
      console.error('Attack failed:', error);
      toast({
        title: "Attack Failed",
        description: "Unable to perform attack",
        variant: "destructive"
      });
    }
  }, [user, gameData.isPlayerTurn, gameData.opponentId, performAttack, toast]);

  // Handle card placement
  const handlePlaceCard = useCallback(async (cardId: string, position: 'left' | 'center' | 'right') => {
    if (!battle || !user || !gameData.isPlayerTurn) return;

    const updatedPlayers = {
      ...battle.players,
      [user.uid]: {
        ...battle.players[user.uid],
        battlefield: {
          ...battle.players[user.uid].battlefield,
          [position]: cardId
        },
        hand: battle.players[user.uid].hand.filter(id => id !== cardId),
        battleCardsPlayedThisRound: (battle.players[user.uid].battleCardsPlayedThisRound || 0) + 1
      }
    };

    try {
      await updateBattleState({
        players: updatedPlayers
      });

      await logBattleAction(
        user.uid,
        'place_card',
        { cardUsed: cardId, position },
        `${gameData.playerData?.displayName} placed ${cardId} in ${position} position`
      );

      setSelectedBattleCard('');
      toast({
        title: "Card Placed",
        description: `Placed card in ${position} position`,
      });
    } catch (error) {
      console.error('Card placement failed:', error);
    }
  }, [battle, user, gameData.isPlayerTurn, gameData.playerData, updateBattleState, logBattleAction, toast]);

  // Handle end turn
  const handleEndTurn = useCallback(async () => {
    if (!battle || !user || !gameData.opponentId) return;

    const nextTurn = gameData.opponentId;
    const newRound = battle.currentRound + (battle.currentTurn === gameData.opponentId ? 1 : 0);

    try {
      await updateBattleState({
        currentTurn: nextTurn,
        currentRound: newRound,
        players: {
          ...battle.players,
          [user.uid]: {
            ...battle.players[user.uid],
            battlefieldAttacks: { left: false, center: false, right: false },
            battleCardsPlayedThisRound: 0
          }
        }
      });

      await logBattleAction(
        user.uid,
        'turn_end',
        { newRound, nextPlayer: nextTurn },
        `${gameData.playerData?.displayName} ended their turn`
      );
    } catch (error) {
      console.error('End turn failed:', error);
    }
  }, [battle, user, gameData.opponentId, gameData.playerData, updateBattleState, logBattleAction]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-yellow-400 mb-4"></div>
          <p className="text-white text-lg">Loading battle...</p>
        </div>
      </div>
    );
  }

  if (!battle || !gameData.playerData) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Card className="p-8 bg-gray-800 border-gray-600">
          <div className="text-center text-white">
            <h2 className="text-2xl font-bold mb-4">Battle Not Found</h2>
            <p className="text-gray-400 mb-6">Unable to load battle data</p>
            <Button onClick={onLeaveBattle} variant="outline">
              <LogOut className="w-4 h-4 mr-2" />
              Return to Lobby
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-4">
                <h1 className="text-3xl font-bold text-white">Battle Arena</h1>
                <Badge variant="outline" className="text-lg px-3 py-1">
                  Round {battle.currentRound}
                </Badge>
                {battle.phase === 'damage' && (
                  <Badge variant="destructive" className="animate-pulse">
                    Damage Phase
                  </Badge>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowBattleLog(!showBattleLog)}
                >
                  {showBattleLog ? 'Hide' : 'Show'} Battle Log
                </Button>
                <Button onClick={onLeaveBattle} variant="destructive" size="sm">
                  <LogOut className="w-4 h-4 mr-2" />
                  Leave Battle
                </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Opponent Area */}
            <div className="lg:col-span-3">
              <Card className="bg-gray-800 border-gray-600 p-4 mb-4">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-lg">
                        {gameData.opponentData?.displayName?.[0] || 'O'}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-white font-medium">
                        {gameData.opponentData?.displayName || 'Opponent'}
                      </h3>
                      <div className="flex items-center gap-4 mt-1">
                        <div className="flex items-center gap-1">
                          <Heart className="w-4 h-4 text-red-400" />
                          <span className="text-red-400 font-medium">
                            {gameData.opponentData?.hp || 0}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Zap className="w-4 h-4 text-blue-400" />
                          <span className="text-blue-400 font-medium">
                            {gameData.opponentData?.energy || 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  {battle.currentTurn === gameData.opponentId && (
                    <Badge variant="destructive">
                      <Crown className="w-3 h-3 mr-1" />
                      Opponent's Turn
                    </Badge>
                  )}
                </div>

                {/* Opponent Battlefield */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                  {['left', 'center', 'right'].map((position) => {
                    const cardId = gameData.opponentData?.battlefield[position as keyof typeof gameData.opponentData.battlefield];
                    const card = cardId ? displayCards.battleCards.find(c => c.id === cardId) : null;
                    
                    return (
                      <div 
                        key={position}
                        className={`h-40 border-2 border-dashed border-gray-600 rounded-lg flex items-center justify-center bg-gray-700/50 ${
                          selectedBattleCard && !card ? 'border-red-400 cursor-pointer' : ''
                        }`}
                        onClick={() => {
                          if (selectedBattleCard && !card && gameData.isPlayerTurn) {
                            handleAttack(selectedBattleCard, position);
                          }
                        }}
                      >
                        {card ? (
                          <GameCard card={card} size="small" />
                        ) : (
                          <div className="text-gray-500 text-center">
                            <Shield className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">Empty</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Opponent Spell Deck */}
                {gameData.opponentId && spellDecks[gameData.opponentId] && (
                  <SpellDeckDisplay
                    spellDeck={spellDecks[gameData.opponentId]}
                    cards={displayCards.abilityCards}
                    onCastSpell={() => {}} // Opponent can't cast spells through this interface
                    isPlayerTurn={false}
                    playerName={gameData.opponentData?.displayName || 'Opponent'}
                    isOpponent={true}
                  />
                )}
              </Card>

              {/* Player Area */}
              <Card className="bg-gray-800 border-gray-600 p-4">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-lg">
                        {gameData.playerData.displayName?.[0] || 'P'}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-white font-medium">
                        {gameData.playerData.displayName || 'You'}
                      </h3>
                      <div className="flex items-center gap-4 mt-1">
                        <div className="flex items-center gap-1">
                          <Heart className="w-4 h-4 text-red-400" />
                          <span className="text-red-400 font-medium">
                            {gameData.playerData.hp}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Zap className="w-4 h-4 text-blue-400" />
                          <span className="text-blue-400 font-medium">
                            {gameData.playerData.energy}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {gameData.isPlayerTurn && (
                      <Badge variant="default">
                        <Crown className="w-3 h-3 mr-1" />
                        Your Turn
                      </Badge>
                    )}
                    {gameData.isPlayerTurn && (
                      <Button onClick={handleEndTurn} size="sm">
                        End Turn
                      </Button>
                    )}
                  </div>
                </div>

                {/* Player Battlefield */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                  {['left', 'center', 'right'].map((position) => {
                    const cardId = gameData.playerData?.battlefield[position as keyof typeof gameData.playerData.battlefield];
                    const card = cardId ? displayCards.battleCards.find(c => c.id === cardId) : null;
                    
                    return (
                      <div 
                        key={position}
                        className={`h-40 border-2 border-dashed border-gray-600 rounded-lg flex items-center justify-center bg-gray-700/50 ${
                          selectedBattleCard && !card ? 'border-green-400 cursor-pointer' : ''
                        } ${
                          card && selectedTarget === position ? 'border-yellow-400' : ''
                        }`}
                        onClick={() => {
                          if (selectedBattleCard && !card && gameData.isPlayerTurn) {
                            handlePlaceCard(selectedBattleCard, position as 'left' | 'center' | 'right');
                          } else if (card && gameData.isPlayerTurn) {
                            setSelectedBattleCard(card.id);
                          }
                        }}
                      >
                        {card ? (
                          <div className="relative">
                            <GameCard 
                              card={card} 
                              size="small"
                              isSelected={selectedBattleCard === card.id}
                            />
                            {selectedBattleCard === card.id && (
                              <div className="absolute inset-0 border-2 border-yellow-400 rounded-lg pointer-events-none" />
                            )}
                          </div>
                        ) : (
                          <div className="text-gray-500 text-center">
                            <Shield className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">Empty</p>
                            {selectedBattleCard && (
                              <p className="text-xs text-green-400 mt-1">Click to place</p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Player Hand */}
                <div className="mb-4">
                  <h4 className="text-white font-medium mb-2">Your Hand (Battle Cards)</h4>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {displayCards.playerBattleCards.map((card) => (
                      <div
                        key={card.id}
                        className={`flex-shrink-0 cursor-pointer transition-transform hover:scale-105 ${
                          selectedBattleCard === card.id ? 'transform scale-105' : ''
                        }`}
                        onClick={() => setSelectedBattleCard(card.id)}
                      >
                        <GameCard
                          card={card}
                          size="small"
                          isSelected={selectedBattleCard === card.id}
                        />
                      </div>
                    ))}
                    {displayCards.playerBattleCards.length === 0 && (
                      <div className="text-gray-500 text-center py-8 w-full">
                        No battle cards in hand
                      </div>
                    )}
                  </div>
                </div>

                {/* Player Spell Deck */}
                {user && spellDecks[user.uid] && (
                  <SpellDeckDisplay
                    spellDeck={spellDecks[user.uid]}
                    cards={displayCards.abilityCards}
                    onCastSpell={handleCastSpell}
                    isPlayerTurn={gameData.isPlayerTurn}
                    playerName="Your"
                  />
                )}
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              {/* Battle Log */}
              <BattleLogDisplay 
                logs={battleLogs} 
                collapsed={!showBattleLog}
              />

              {/* Battle Status */}
              <Card className="bg-gray-800 border-gray-600 p-4">
                <h3 className="text-white font-medium mb-3">Battle Status</h3>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm text-gray-400 mb-1">
                      <span>Phase</span>
                      <span className="capitalize">{battle.phase}</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm text-gray-400 mb-1">
                      <span>Status</span>
                      <span className="capitalize">{battle.status}</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm text-gray-400 mb-1">
                      <span>Actions</span>
                      <span>{battleLogs.length}</span>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}