import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';
import { useFirestore } from '@/hooks/useFirestore';
import { DeckBuilder } from '@/components/DeckBuilder';
// import { BattleInterface } from '@/components/BattleInterface'; // Removed old battle system
import { AdminPanel } from '@/components/AdminPanel';
import { AuthModal } from '@/components/AuthModal';
import { CardsGrid } from '@/components/CardsGrid';
import { Room, GameCard } from '@/types/game';
import { Link, useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface DashboardProps {
  user: any;
  activeTab?: string;
  battleSubTab?: string;
}

export default function Dashboard({ user, activeTab: initialTab = 'ranking', battleSubTab: initialBattleSubTab }: DashboardProps) {
  const { logout } = useAuth();
  const { toast } = useToast();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [battleSubTab, setBattleSubTab] = useState(initialBattleSubTab || 'waiting-room');
  const [location, navigate] = useLocation();
  const { rooms, rankings, cards, chatMessages, createRoom, joinRoom, deleteRoom, markPlayerReady, createTestRooms, sendChatMessage, distributeCards, getUserById, markPlayerReadyInRoom, placeBattleCardInBattle, useMagicCardInBattle, drawCardInBattle, endPlayerTurnInBattle, attackInBattle } = useFirestore();
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [chatCollapsed, setChatCollapsed] = useState(true);
  const [chatMessage, setChatMessage] = useState('');
  const [playerHand, setPlayerHand] = useState<string[]>([]);
  const [playerDeck, setPlayerDeck] = useState<string[]>([]);
  const [playerHP, setPlayerHP] = useState(50);
  const [playerEnergy, setPlayerEnergy] = useState(100);
  const [enemyHP, setEnemyHP] = useState(50);
  const [enemyEnergy, setEnemyEnergy] = useState(100);
  const [battlefield, setBattlefield] = useState<{left: GameCard | null, center: GameCard | null, right: GameCard | null}>({
    left: null,
    center: null,
    right: null
  });
  const [enemyBattlefield, setEnemyBattlefield] = useState<{left: GameCard | null, center: GameCard | null, right: GameCard | null}>({
    left: null,
    center: null,
    right: null
  });
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [showPlacementButtons, setShowPlacementButtons] = useState(false);
  const [currentRound, setCurrentRound] = useState(1);
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [battleCardsPlayedThisRound, setBattleCardsPlayedThisRound] = useState(0);
  const [enemyHand, setEnemyHand] = useState<string[]>([]);
  const [enemyDeck, setEnemyDeck] = useState<string[]>([]);
  const [selectedAttacker, setSelectedAttacker] = useState<'left' | 'center' | 'right' | null>(null);
  const [showAttackTargets, setShowAttackTargets] = useState(false);
  const [isPvE, setIsPvE] = useState(false);
  const [playerUsers, setPlayerUsers] = useState<{[key: string]: any}>({});
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [currentBattle, setCurrentBattle] = useState<any>(null);
  const [battleLoading, setBattleLoading] = useState(false);

  // Room form state
  const [roomForm, setRoomForm] = useState({
    name: '',
    type: 'pvp' as 'pvp' | 'pve',
    description: ''
  });

  const displayUser = user || {
    displayName: 'Guest',
    email: 'guest@example.com',
    uid: 'guest',
    isAdmin: false,
    wins: 0,
    losses: 0,
    hp: 20,
    energy: 100,
    deck: [],
    createdAt: Date.now()
  };

  const isGuest = !user;

  // Get current room data if user is in a room
  const currentRoom = currentRoomId ? rooms.find(r => r.id === currentRoomId) : null;
  
  // Check if user already has a room (as host or player)
  const userExistingRoom = user ? rooms.find(r => 
    r.hostId === user.uid || r.players.includes(user.uid)
  ) : null;

  // Update active tab based on URL
  useEffect(() => {
    const pathParts = location.split('/').filter(part => part);
    const mainTab = pathParts[0] || 'ranking';
    setActiveTab(mainTab);
    
    // Handle battle sub-tabs
    if (mainTab === 'battle' && pathParts[1]) {
      setBattleSubTab(pathParts[1]);
    }
  }, [location]);

  // Auto-sync existing room with battle tab
  useEffect(() => {
    if (userExistingRoom && !currentRoomId) {
      setCurrentRoomId(userExistingRoom.id);
      
      // Initialize hand and deck for fight when room is set
      if (user && user.deck && user.deck.length >= 10) {
        const { hand, remainingDeck } = distributeCards(user.deck);
        setPlayerHand(hand);
        setPlayerDeck(remainingDeck);
      }
    }
  }, [userExistingRoom, currentRoomId, user, distributeCards]);

  // Fetch player user data when room changes
  useEffect(() => {
    const fetchPlayerUsers = async () => {
      if (!currentRoom || !currentRoom.players) return;
      
      const usersData: {[key: string]: any} = {};
      for (const playerId of currentRoom.players) {
        if (playerId !== user?.uid) { // Don't fetch current user data
          const userData = await getUserById(playerId);
          if (userData) {
            usersData[playerId] = userData;
          }
        }
      }
      setPlayerUsers(usersData);
    };
    
    fetchPlayerUsers();
  }, [currentRoom, user, getUserById]);

  // Check if current player is ready
  useEffect(() => {
    if (currentRoom && user) {
      const ready = currentRoom.playersReady?.includes(user.uid) || false;
      setIsPlayerReady(ready);
    }
  }, [currentRoom, user]);

  // Handle player ready click
  const handlePlayerReady = async () => {
    if (!currentRoom || !user || isPlayerReady) return;
    
    const success = await markPlayerReadyInRoom(currentRoom.id, user.uid);
    if (success) {
      setIsPlayerReady(true);
    }
  };

  // Listen to battle changes for real-time synchronization
  useEffect(() => {
    if (!currentRoom?.battleId) {
      setCurrentBattle(null);
      return;
    }

    setBattleLoading(true);
    const unsubscribe = onSnapshot(
      doc(db, 'battles', currentRoom.battleId),
      (battleDoc) => {
        if (battleDoc.exists()) {
          const battleData = { id: battleDoc.id, ...battleDoc.data() } as any;
          setCurrentBattle(battleData);
          
          // Initialize player deck and hand if empty and user has a deck
          const playerData = battleData.players?.[user?.uid];
          if (user && playerData && playerData.deck?.length === 0 && user.deck && user.deck.length >= 10) {
            const { hand, remainingDeck } = distributeCards(user.deck);
            const battleRef = doc(db, 'battles', currentRoom.battleId);
            updateDoc(battleRef, {
              [`players.${user.uid}.deck`]: remainingDeck,
              [`players.${user.uid}.hand`]: hand
            });
          }
        }
        setBattleLoading(false);
      },
      (error) => {
        console.error('Error listening to battle:', error);
        setBattleLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentRoom?.battleId, user, distributeCards]);

  // Auto-navigate to fight when all players ready (will be defined after handleBattleSubTabChange)

  // Handle chat message send
  const handleSendMessage = async () => {
    if (!chatMessage.trim() || isGuest || !user) return;
    
    await sendChatMessage(user.uid, user.displayName || 'Anonymous', chatMessage.trim());
    setChatMessage('');
  };

  // Handle card click - now uses server-side battle
  const handleCardClick = (cardId: string) => {
    if (!currentBattle || !user || !currentRoom?.battleId) return;
    
    const card = cards.find(c => c.id === cardId);
    if (!card) return;

    const playerData = currentBattle.players[user.uid];
    if (!playerData) return;

    if (card.type === 'battle') {
      setSelectedCard(cardId);
      setShowPlacementButtons(true);
    } else if (card.type === 'ability' && playerData.energy >= (card.cost || 0)) {
      // Magic card confirmation
      if (window.confirm(`Use ${card.name} for ${card.cost || 0} energy?\n${card.description}`)) {
        useMagicCardInBattle(currentRoom.battleId, user.uid, cardId, card.cost || 0);
      }
    }
  };

  // Use magic card - now handled by server-side function in handleCardClick

  // Draw card from deck - now uses server-side battle
  const drawCardFromDeck = async () => {
    if (!currentBattle || !user || !currentRoom?.battleId) return;
    
    const playerData = currentBattle.players[user.uid];
    if (!playerData) return;
    
    if (currentBattle.currentTurn !== user.uid) return;
    if (playerData.hand.length >= 5) {
      console.log('Hand is full, cannot draw more cards');
      return;
    }
    if (playerData.deck.length === 0) {
      console.log('Deck is empty, cannot draw cards');
      return;
    }
    if (playerData.energy < 5) {
      console.log('Not enough energy to draw card');
      return;
    }

    await drawCardInBattle(currentRoom.battleId, user.uid, playerData.deck);
    console.log('Card drawn from deck! Energy cost: 5');
  };

  // Handle card attack on battlefield
  const handleAttackClick = (position: 'left' | 'center' | 'right') => {
    if (!isPlayerTurn || currentRound < 2) return; // Can't attack in round 1
    
    const attackerCard = battlefield[position];
    if (!attackerCard) return;
    
    setSelectedAttacker(position);
    setShowAttackTargets(true);
  };

  // Execute attack on target
  const executeAttack = (target: 'enemy' | 'left' | 'center' | 'right') => {
    if (!selectedAttacker) return;
    
    const attackerCard = battlefield[selectedAttacker];
    if (!attackerCard) return;

    if (target === 'enemy') {
      // Attack enemy player directly
      const damage = attackerCard.attack || 0;
      setEnemyHP(prev => Math.max(0, prev - damage));
      console.log(`${attackerCard.name} attacked enemy for ${damage} damage`);
    } else {
      // Attack enemy card
      const targetCard = enemyBattlefield[target];
      if (!targetCard) return;

      // Calculate damage with formula
      let baseDamage = attackerCard.attack || 0;
      
      // Check for critical hit
      const critChance = attackerCard.criticalChance || 0;
      const isCrit = Math.random() * 100 < critChance;
      if (isCrit) {
        const critMultiplier = 1 + (attackerCard.criticalDamage || 0) / 100;
        baseDamage = Math.floor(baseDamage * critMultiplier);
        console.log('Critical hit!');
      }

      // Apply defense and resistances
      const defense = targetCard.defense || 0;
      let finalDamage = baseDamage - defense;

      // Apply class-based resistance
      const attackerClass = attackerCard.spellType || 'melee'; // Default to melee if no spell type
      if (attackerClass === 'ranged' && targetCard.rangedResistance) {
        finalDamage = finalDamage * (1 - targetCard.rangedResistance / 100);
      } else if (attackerClass === 'melee' && targetCard.meleeResistance) {
        finalDamage = finalDamage * (1 - targetCard.meleeResistance / 100);
      } else if (attackerClass === 'magical' && targetCard.magicResistance) {
        finalDamage = finalDamage * (1 - targetCard.magicResistance / 100);
      }

      finalDamage = Math.max(1, Math.floor(finalDamage)); // Minimum 1 damage

      // Apply damage to target card
      const newHealth = Math.max(0, (targetCard.health || 1) - finalDamage);
      
      if (newHealth <= 0) {
        // Card destroyed
        setEnemyBattlefield(prev => ({ ...prev, [target]: null }));
        console.log(`${targetCard.name} destroyed!`);
      } else {
        // Update card health
        setEnemyBattlefield(prev => ({
          ...prev,
          [target]: { ...targetCard, health: newHealth }
        }));
        console.log(`${targetCard.name} took ${finalDamage} damage, health: ${newHealth}`);
      }
    }

    setSelectedAttacker(null);
    setShowAttackTargets(false);
  };

  // Place battle card on field - now uses server-side battle
  const placeBattleCard = async (position: 'left' | 'center' | 'right') => {
    if (!selectedCard || !currentBattle || !user || !currentRoom?.battleId) return;
    
    const card = cards.find(c => c.id === selectedCard);
    if (!card || card.type !== 'battle') return;

    const playerData = currentBattle.players[user.uid];
    if (!playerData) return;

    // Check if player can afford the energy cost (20 for battle cards)
    const energyCost = 20;
    if (playerData.energy < energyCost) {
      console.log('Not enough energy to place card');
      return;
    }

    // Check if player can place battle cards this round (max 1 per round)
    if (playerData.battleCardsPlayedThisRound >= 1) {
      console.log('Cannot place more battle cards this round');
      return;
    }

    // Check if position is empty
    if (playerData.battlefield[position]) {
      console.log('Position already occupied');
      return;
    }

    console.log('Placing card:', card.name, 'at position:', position);

    // Create card data for battlefield
    const cardData = {
      ...card,
      id: card.id,
      name: card.name,
      attack: card.attack || 0,
      defense: card.defense || 0, 
      health: card.health || 1,
      imageUrl: card.imageUrl || ''
    };

    const success = await placeBattleCardInBattle(currentRoom.battleId, user.uid, selectedCard, position, cardData);
    if (success) {
      setSelectedCard(null);
      setShowPlacementButtons(false);
      console.log(`Card ${card.name} placed successfully on ${position} field.`);
    }
  };

  // Initialize bot deck with random cards
  const initializeBotDeck = () => {
    if (cards.length === 0) return;
    
    // Get 10 random cards for bot
    const shuffledCards = [...cards].sort(() => Math.random() - 0.5);
    const botDeckCards = shuffledCards.slice(0, 10).map(card => card.id);
    
    // Give bot initial hand of 5 cards
    const { hand, remainingDeck } = distributeCards(botDeckCards);
    setEnemyHand(hand);
    setEnemyDeck(remainingDeck);
    
    console.log('Bot deck initialized with', botDeckCards.length, 'cards');
  };

  // Bot AI turn logic
  const executeBotTurn = () => {
    console.log('Bot turn started');
    
    // Bot decision making (simplified)
    setTimeout(() => {
      // 1. Bot might draw a card if hand not full and has energy
      if (enemyHand.length < 5 && enemyDeck.length > 0 && enemyEnergy >= 5) {
        const topCard = enemyDeck[0];
        setEnemyHand(prev => [...prev, topCard]);
        setEnemyDeck(prev => prev.slice(1));
        setEnemyEnergy(prev => Math.max(0, prev - 5));
        console.log('Bot drew a card');
      }
      
      // 2. Bot might place a battle card if has energy and empty slot
      const emptySlots = ['left', 'center', 'right'].filter(pos => !enemyBattlefield[pos as keyof typeof enemyBattlefield]);
      if (emptySlots.length > 0 && enemyHand.length > 0 && enemyEnergy >= 20) {
        const randomCard = enemyHand[Math.floor(Math.random() * enemyHand.length)];
        const card = cards.find(c => c.id === randomCard);
        if (card && card.type === 'battle') {
          const randomSlot = emptySlots[Math.floor(Math.random() * emptySlots.length)] as 'left' | 'center' | 'right';
          setEnemyBattlefield(prev => ({
            ...prev,
            [randomSlot]: card
          }));
          setEnemyHand(prev => prev.filter(id => id !== randomCard));
          setEnemyEnergy(prev => Math.max(0, prev - 20));
          console.log(`Bot placed ${card.name} on ${randomSlot}`);
        }
      }
      
      // End bot turn after 3 seconds
      setTimeout(() => {
        setPlayerEnergy(prev => Math.min(100, prev + 15));
        setEnemyEnergy(prev => Math.min(100, prev + 15));
        setBattleCardsPlayedThisRound(0);
        setCurrentRound(prev => prev + 1);
        setIsPlayerTurn(true);
        console.log(`Round ${currentRound + 1} started`);
      }, 1000);
    }, 2000);
  };

  // End player turn function - now uses server-side battle
  const endPlayerTurn = async () => {
    if (!currentBattle || !user || !currentRoom?.battleId) return;
    
    const playerData = currentBattle.players[user.uid];
    if (!playerData || currentBattle.currentTurn !== user.uid) return;
    
    // Find next player
    const playerIds = Object.keys(currentBattle.players);
    const currentIndex = playerIds.indexOf(user.uid);
    const nextIndex = (currentIndex + 1) % playerIds.length;
    const nextPlayerId = playerIds[nextIndex];
    
    console.log('Player turn ended');
    
    await endPlayerTurnInBattle(currentRoom.battleId, user.uid, nextPlayerId, currentBattle.currentRound);
    
    // For PvE, handle bot turn after a delay
    if (isPvE && nextPlayerId === 'ai_opponent') {
      setTimeout(() => {
        executeBotTurn();
      }, 2000);
    }
  };

  // Handle tab changes with navigation
  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    if (newTab === 'battle') {
      navigate(`/battle/${battleSubTab}`);
    } else {
      navigate(`/${newTab === 'ranking' ? '' : newTab}`);
    }
  };

  // Handle battle sub-tab changes
  const handleBattleSubTabChange = (newSubTab: string) => {
    setBattleSubTab(newSubTab);
    navigate(`/battle/${newSubTab}`);
  };

  // Auto-navigate to fight when all players ready
  useEffect(() => {
    if (currentRoom && currentRoom.playersReady && currentRoom.players) {
      const readyCount = currentRoom.playersReady.length;
      const totalPlayers = currentRoom.players.length;
      
      if (readyCount >= totalPlayers && totalPlayers >= currentRoom.maxPlayers && battleSubTab === 'waiting-room') {
        // All players ready - navigate to fight
        setTimeout(() => {
          handleBattleSubTabChange('fight');
        }, 1500); // Small delay to show the 2/2 state
      }
    }
  }, [currentRoom, battleSubTab]);

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !roomForm.name) return;
    
    // Check if user already has a room
    if (userExistingRoom) {
      alert('You already have a room. Leave your current room before creating a new one.');
      return;
    }

    const roomData: Omit<Room, 'id' | 'createdAt'> = {
      name: roomForm.name,
      type: roomForm.type,
      hostId: user.uid,
      hostName: user.displayName || 'Anonymous',
      players: [user.uid],
      maxPlayers: roomForm.type === 'pvp' ? 2 : 1,
      status: 'waiting',
      description: roomForm.description
    };

    try {
      const roomId = await createRoom(roomData);
      if (roomId) {
        setRoomForm({ name: '', type: 'pvp', description: '' });
        setCurrentRoomId(roomId);
        
        // Navigate to battle tab without toast to prevent refresh
        handleTabChange('battle');
        
        // Then set the appropriate sub-tab
        if (roomForm.type === 'pve') {
          // For PvE rooms, go directly to fight sub-tab
          setBattleSubTab('fight');
          navigate('/battle/fight'); // Ensure URL is updated
          setIsPvE(true); // Set PvE mode
        } else {
          // For PvP rooms, go to waiting room sub-tab to wait for opponent
          setBattleSubTab('waiting-room');
          navigate('/battle/waiting-room');
          setIsPvE(false);
        }
      }
    } catch (error) {
      console.error('Error creating room:', error);
      toast({
        title: "Failed to Create Room",
        description: "Please try again.",
        duration: 3000
      });
    }
  };

  const handleJoinRoom = async (roomId: string) => {
    if (isGuest) {
      setShowAuthModal(true);
      return;
    }
    
    // Check if user already has a room
    if (userExistingRoom) {
      alert('You already have a room. Leave your current room before joining a new one.');
      return;
    }
    const success = await joinRoom(roomId, user!.uid, user!.displayName);
    if (success) {
      setCurrentRoomId(roomId);
      const room = rooms.find(r => r.id === roomId);
      
      // Navigate to battle tab without toast to prevent refresh
      handleTabChange('battle');
      
      // Then set the appropriate sub-tab  
      if (room?.type === 'pve') {
        // For PvE rooms, go directly to fight sub-tab
        setBattleSubTab('fight');
        navigate('/battle/fight'); // Ensure URL is updated
        setIsPvE(true); // Set PvE mode
      } else {
        // For PvP rooms, go to waiting room sub-tab
        setBattleSubTab('waiting-room');
        navigate('/battle/waiting-room');
        setIsPvE(false);
      }
    }
  };

  const userHPPercent = (displayUser.hp / 20) * 100;
  const userEnergyPercent = (displayUser.energy / 100) * 100;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Navigation */}
      <nav className="bg-gray-800 border-b border-blue-600 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-yellow-400">
              <i className="fas fa-sword mr-2"></i>
              Battle Arena
            </h1>
          </div>
          
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <Link href="/settings">
                  <div className="flex items-center space-x-3 cursor-pointer hover:bg-gray-700 rounded-lg p-2 transition-colors">
                    <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center">
                      <i className="fas fa-user"></i>
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold">{displayUser.displayName}</span>
                      </div>
                      <div className="flex items-center space-x-4 text-xs">
                        <span className="text-yellow-400">Wins: {displayUser.wins}</span>
                        <span className="text-red-400">Losses: {displayUser.losses}</span>
                      </div>
                    </div>
                  </div>
                </Link>
                <Button
                  onClick={logout}
                  variant="destructive"
                  size="sm"
                >
                  <i className="fas fa-sign-out-alt mr-1"></i>
                  Logout
                </Button>
              </>
            ) : (
              <Button
                onClick={() => setShowAuthModal(true)}
                className="bg-green-600 hover:bg-green-700"
                size="sm"
              >
                <i className="fas fa-sign-in-alt mr-1"></i>
                Login
              </Button>
            )}
          </div>
        </div>
      </nav>

      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-gray-800 border-r border-blue-600 min-h-screen">
          <Tabs defaultValue="ranking" className="w-full" orientation="vertical" value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="flex flex-col h-auto bg-transparent p-4 space-y-2">
              <TabsTrigger
                value="ranking"
                className="w-full justify-start px-4 py-3 data-[state=active]:bg-red-600 data-[state=active]:text-white text-gray-300 hover:text-white"
              >
                <i className="fas fa-trophy mr-3"></i>
                Ranking
              </TabsTrigger>
              <TabsTrigger
                value="battle"
                className="w-full justify-start px-4 py-3 data-[state=active]:bg-red-600 data-[state=active]:text-white text-gray-300 hover:text-white"
              >
                <i className="fas fa-sword mr-3"></i>
                Battle
              </TabsTrigger>
              <TabsTrigger
                value="rooms"
                className="w-full justify-start px-4 py-3 data-[state=active]:bg-red-600 data-[state=active]:text-white text-gray-300 hover:text-white"
              >
                <i className="fas fa-search mr-3"></i>
                Find Room
              </TabsTrigger>
              <TabsTrigger
                value="cards"
                className="w-full justify-start px-4 py-3 data-[state=active]:bg-red-600 data-[state=active]:text-white text-gray-300 hover:text-white"
              >
                <i className="fas fa-th-large mr-3"></i>
                Cards
              </TabsTrigger>
              <TabsTrigger
                value="deck"
                disabled={isGuest}
                className={`w-full justify-start px-4 py-3 data-[state=active]:bg-red-600 data-[state=active]:text-white text-gray-300 hover:text-white ${isGuest ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <i className="fas fa-layer-group mr-3"></i>
                My Deck {isGuest && '(Login Required)'}
              </TabsTrigger>

              <TabsTrigger
                value="create-room"
                disabled={isGuest}
                className={`w-full justify-start px-4 py-3 data-[state=active]:bg-red-600 data-[state=active]:text-white text-gray-300 hover:text-white ${isGuest ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <i className="fas fa-plus mr-3"></i>
                Create Room {isGuest && '(Login Required)'}
              </TabsTrigger>
              {user && user.isAdmin && (
                <TabsTrigger
                  value="admin"
                  className="w-full justify-start px-4 py-3 data-[state=active]:bg-purple-600 data-[state=active]:text-white text-gray-300 hover:text-white"
                >
                  <i className="fas fa-cog mr-3"></i>
                  Admin Panel
                </TabsTrigger>
              )}
            </TabsList>
          </Tabs>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 bg-gray-900 flex">
          {/* Content */}
          <div className={`transition-all duration-300 ${chatCollapsed ? 'flex-1' : 'flex-1 mr-80'}`}>
            <div className="w-full">
            {/* Render content based on active tab */}
            {activeTab === 'battle' && (
              <div>
                <div className="p-6">
                  <div className="mb-6">
                    <h2 className="text-3xl font-bold text-yellow-400 mb-2">
                      <i className="fas fa-sword mr-2"></i>
                      Battle Arena
                    </h2>
                    <p className="text-gray-400">Battle management and combat</p>
                  </div>

                  {/* Battle Sub-tabs */}
                  <div className="mb-6">
                    <Tabs value={battleSubTab} onValueChange={handleBattleSubTabChange} className="w-full">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="waiting-room" className="data-[state=active]:bg-orange-600">
                          <i className="fas fa-hourglass-half mr-2"></i>
                          Waiting Room
                        </TabsTrigger>
                        <TabsTrigger value="fight" className="data-[state=active]:bg-red-600">
                          <i className="fas fa-fist-raised mr-2"></i>
                          Fight
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="waiting-room" className="mt-6">
                        {/* Waiting Room Content */}
                        <Card className="bg-gray-800 border-orange-600 p-8">
                          {currentRoom ? (
                            <div className="text-center mb-8">
                              <h3 className="text-2xl font-bold text-orange-400 mb-4">
                                Room: {currentRoom.name}
                              </h3>
                              <p className="text-gray-400 mb-6">
                                {currentRoom.description || 'Waiting for battle to begin'}
                              </p>
                              
                              <div className="grid grid-cols-2 gap-6 max-w-md mx-auto">
                                {/* Host Player (always on left) */}
                                <div className="bg-gray-700 rounded-lg p-4">
                                  <div className="w-16 h-16 bg-blue-600 rounded-full mx-auto mb-3 flex items-center justify-center">
                                    <i className="fas fa-crown text-yellow-400 text-xl"></i>
                                  </div>
                                  <h4 className="font-bold text-blue-400">
                                    {currentRoom.hostName}
                                  </h4>
                                  <p className="text-sm text-gray-400">Host</p>
                                </div>

                                {/* Second Player or Waiting */}
                                <div className="bg-gray-700 rounded-lg p-4">
                                  {currentRoom.players && currentRoom.players.length > 1 ? (
                                    <>
                                      <div className="w-16 h-16 bg-red-600 rounded-full mx-auto mb-3 flex items-center justify-center">
                                        <i className="fas fa-user text-white text-xl"></i>
                                      </div>
                                      <h4 className="font-bold text-red-400">
                                        {/* Show the actual player name */}
                                        {user && currentRoom.hostId === user.uid 
                                          ? (() => {
                                              const otherPlayerId = currentRoom.players.find(id => id !== user.uid);
                                              return otherPlayerId && playerUsers[otherPlayerId] 
                                                ? playerUsers[otherPlayerId].displayName 
                                                : 'Player 2';
                                            })()
                                          : user?.displayName || 'You'}
                                      </h4>
                                      <p className="text-sm text-gray-400">Player</p>
                                    </>
                                  ) : (
                                    <>
                                      <div className="w-16 h-16 bg-gray-600 rounded-full mx-auto mb-3 flex items-center justify-center animate-pulse">
                                        <i className="fas fa-hourglass-half text-gray-400 text-xl"></i>
                                      </div>
                                      <h4 className="font-bold text-gray-400">Waiting...</h4>
                                      <p className="text-sm text-gray-500">For opponent</p>
                                    </>
                                  )}
                                </div>
                              </div>

                              <div className="mt-8">
                                {currentRoom.players && currentRoom.players.length > 1 ? (
                                  <div className="space-y-4">
                                    {/* Readiness Counter */}
                                    <div className="text-center">
                                      <div className="text-2xl font-bold text-orange-400 mb-2">
                                        Players Ready: {(currentRoom.playersReady?.length || 0)}/{currentRoom.players.length}
                                      </div>
                                      
                                      {/* Individual Ready Status */}
                                      <div className="flex justify-center space-x-4 mb-4">
                                        {currentRoom.players.map((playerId, index) => {
                                          const isReady = currentRoom.playersReady?.includes(playerId) || false;
                                          const playerData = playerId === user?.uid ? user : playerUsers[playerId];
                                          const playerName = playerData?.displayName || (playerId === currentRoom.hostId ? 'Host' : `Player ${index + 1}`);
                                          
                                          return (
                                            <div key={playerId} className={`px-3 py-2 rounded-lg border-2 ${isReady ? 'bg-green-600 border-green-400 text-white' : 'bg-gray-600 border-gray-400 text-gray-300'}`}>
                                              <div className="text-sm font-bold">
                                                {isReady ? '✓' : '○'} {playerName}
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                    
                                    {/* Ready Button or Start Battle */}
                                    {(currentRoom.playersReady?.length || 0) >= currentRoom.players.length ? (
                                      <div className="text-center">
                                        <div className="text-green-400 font-bold mb-2">
                                          <i className="fas fa-check-circle mr-2"></i>
                                          All players ready! Starting battle...
                                        </div>
                                      </div>
                                    ) : (
                                      <Button
                                        onClick={handlePlayerReady}
                                        disabled={isPlayerReady}
                                        size="lg" 
                                        className={`text-xl px-8 py-3 ${
                                          isPlayerReady 
                                            ? 'bg-green-600 hover:bg-green-600 cursor-default' 
                                            : 'bg-orange-600 hover:bg-orange-700'
                                        }`}
                                      >
                                        {isPlayerReady ? (
                                          <>
                                            <i className="fas fa-check mr-2"></i>
                                            READY - Waiting for others...
                                          </>
                                        ) : (
                                          <>
                                            <i className="fas fa-hand-paper mr-2"></i>
                                            READY UP!
                                          </>
                                        )}
                                      </Button>
                                    )}
                                  </div>
                                ) : (
                                  <div className="text-gray-400">
                                    <i className="fas fa-clock mr-2"></i>
                                    Waiting for another player to join...
                                  </div>
                                )}
                              </div>

                              <div className="mt-6">
                                <Button
                                  onClick={() => {
                                    setCurrentRoomId(null);
                                    handleTabChange('ranking');
                                  }}
                                  variant="outline"
                                  className="border-gray-600 text-gray-300 hover:bg-gray-700"
                                >
                                  <i className="fas fa-arrow-left mr-2"></i>
                                  Leave Room
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="text-center">
                              <div className="w-20 h-20 bg-gray-700 rounded-full mx-auto mb-4 flex items-center justify-center">
                                <i className="fas fa-door-open text-gray-400 text-3xl"></i>
                              </div>
                              <h3 className="text-xl font-bold text-gray-400 mb-2">No Active Room</h3>
                              <p className="text-gray-500 mb-6">Create or join a room to start waiting for battle</p>
                              
                              <div className="flex justify-center space-x-4">
                                <Button
                                  onClick={() => handleTabChange('rooms')}
                                  className="bg-blue-600 hover:bg-blue-700 px-6 py-3"
                                >
                                  <i className="fas fa-search mr-2"></i>
                                  Find Room
                                </Button>
                                <Button
                                  onClick={() => handleTabChange('create-room')}
                                  disabled={isGuest}
                                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 px-6 py-3"
                                >
                                  <i className="fas fa-plus mr-2"></i>
                                  Create Room
                                </Button>
                              </div>
                            </div>
                          )}
                        </Card>
                      </TabsContent>

                      <TabsContent value="fight" className="mt-6">
                        {/* Fight Content */}
                        <Card className="bg-gray-800 border-red-600 p-8">
                          {currentRoom ? (
                            <div className="text-center mb-8">
                              <h3 className="text-2xl font-bold text-red-400 mb-4">
                                Fighting in: {currentRoom.name}
                              </h3>
                              
                              <div className="w-full h-96 bg-gradient-to-b from-red-900 to-gray-900 rounded-lg mb-6 flex items-center justify-center border-2 border-red-400">
                                <div className="text-4xl font-bold text-red-400">FIGHT ARENA - ACTIVE BATTLE</div>
                              </div>

                              {/* Opponent Cards (Top) */}
                              <div className="mb-6">
                                <h3 className="text-lg font-bold text-red-400 mb-3">Opponent Hand</h3>
                                <div className="flex space-x-2 justify-center">
                                  {[1, 2, 3, 4, 5].map((card) => (
                                    <div key={card} className="w-16 h-24 bg-red-600 rounded border-2 border-red-400 flex items-center justify-center">
                                      <span className="text-xs font-bold">?</span>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Battlefield with Avatars and Health */}
                              <div className="bg-gradient-to-r from-yellow-900 to-orange-900 rounded-lg p-6 mb-6 border-2 border-yellow-600">
                                
                                {/* Enemy Avatar and Health */}
                                <div className="flex flex-col items-center space-y-3 mb-6">
                                  <div className="flex items-center space-x-4">
                                    <div 
                                      className={`w-16 h-16 bg-red-600 rounded-full border-2 border-red-400 flex items-center justify-center cursor-pointer transition-all ${
                                        showAttackTargets ? 'animate-pulse border-yellow-400' : ''
                                      }`}
                                      onClick={() => showAttackTargets ? executeAttack('enemy') : undefined}
                                    >
                                      <span className="text-sm font-bold text-white">
                                        {isPvE ? 'AI' : (() => {
                                          const otherPlayerId = currentRoom?.players.find(id => id !== user?.uid);
                                          return otherPlayerId && playerUsers[otherPlayerId] 
                                            ? playerUsers[otherPlayerId].displayName.charAt(0) 
                                            : '?';
                                        })()}
                                      </span>
                                    </div>
                                    <div className="flex flex-col space-y-1">
                                      <div className="text-xs text-red-400 font-bold">
                                        {isPvE ? 'AI' : (() => {
                                          const otherPlayerId = currentRoom?.players.find(id => id !== user?.uid);
                                          return otherPlayerId && playerUsers[otherPlayerId] 
                                            ? playerUsers[otherPlayerId].displayName 
                                            : 'Opponent';
                                        })()} HP: {currentBattle ? (() => {
                                          const otherPlayerId = Object.keys(currentBattle.players).find(id => id !== user?.uid);
                                          return otherPlayerId ? currentBattle.players[otherPlayerId].hp : 50;
                                        })() : 50}/50
                                      </div>
                                      <div className="w-32 h-3 bg-gray-700 rounded-full overflow-hidden">
                                        <div className="h-full bg-red-500 rounded-full transition-all duration-300" style={{ 
                                          width: `${currentBattle ? (() => {
                                            const otherPlayerId = Object.keys(currentBattle.players).find(id => id !== user?.uid);
                                            return otherPlayerId ? (currentBattle.players[otherPlayerId].hp / 50) * 100 : 100;
                                          })() : 100}%` 
                                        }}></div>
                                      </div>
                                      <div className="text-xs text-blue-400">Energy: {currentBattle ? (() => {
                                        const otherPlayerId = Object.keys(currentBattle.players).find(id => id !== user?.uid);
                                        return otherPlayerId ? currentBattle.players[otherPlayerId].energy : 100;
                                      })() : 100}/100</div>
                                      <div className="w-32 h-3 bg-gray-700 rounded-full overflow-hidden">
                                        <div className="h-full bg-blue-500 rounded-full transition-all duration-300" style={{ 
                                          width: `${currentBattle ? (() => {
                                            const otherPlayerId = Object.keys(currentBattle.players).find(id => id !== user?.uid);
                                            return otherPlayerId ? (currentBattle.players[otherPlayerId].energy / 100) * 100 : 100;
                                          })() : 100}%` 
                                        }}></div>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Enemy Field */}
                                <div className="flex space-x-4 justify-center mb-6">
                                  {(['left', 'center', 'right'] as const).map((position) => {
                                    const enemyCard = enemyBattlefield[position];
                                    return (
                                      <div 
                                        key={position} 
                                        className={`w-24 h-32 rounded border-2 flex items-center justify-center relative overflow-hidden ${
                                          showAttackTargets && selectedAttacker && enemyCard
                                            ? 'bg-red-500 border-yellow-400 cursor-pointer animate-pulse'
                                            : 'bg-red-600 border-red-400'
                                        }`}
                                        onClick={() => showAttackTargets && enemyCard ? executeAttack(position) : undefined}
                                      >
                                        {enemyCard ? (
                                          <div className="w-full h-full relative">
                                            {enemyCard.imageUrl ? (
                                              <img 
                                                src={enemyCard.imageUrl} 
                                                alt={enemyCard.name}
                                                className="w-full h-full object-cover rounded"
                                              />
                                            ) : (
                                              <div className="w-full h-full bg-red-700 flex items-center justify-center">
                                                <div className="text-center p-1">
                                                  <div className="text-xs font-bold text-white mb-1">{enemyCard.name}</div>
                                                  <div className="text-xs text-red-200">⚔{enemyCard.attack || 0}</div>
                                                  <div className="text-xs text-red-200">🛡{enemyCard.defense || 0}</div>
                                                  <div className="text-xs text-red-200">❤{enemyCard.health || 1}</div>
                                                </div>
                                              </div>
                                            )}
                                            {/* Stats overlay */}
                                            <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 text-white text-xs p-1">
                                              <div className="flex justify-between">
                                                <span>⚔{enemyCard.attack || 0}</span>
                                                <span>🛡{enemyCard.defense || 0}</span>
                                                <span>❤{enemyCard.health || 1}</span>
                                              </div>
                                            </div>
                                          </div>
                                        ) : (
                                          <span className="text-xs text-red-300">Empty</span>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>

                                <div className="text-center py-4 relative">
                                  <div className="text-xl font-bold text-yellow-400 mb-1">⚔ BATTLE ARENA ⚔</div>
                                  <div className="text-sm text-yellow-300">{isPlayerTurn ? 'Your Turn' : 'Enemy Turn'} - {isPlayerTurn ? 'Place cards or cast spells' : 'Wait for enemy'}</div>
                                  
                                  {/* Round indicator on battlefield */}
                                  <div className="absolute left-4 top-4 bg-orange-600 bg-opacity-80 border border-orange-400 rounded px-3 py-1">
                                    <div className="text-sm font-bold text-white">Round {currentRound}</div>
                                    <div className="text-xs text-orange-200">Battle Cards: {battleCardsPlayedThisRound}/1</div>
                                  </div>
                                </div>

                                {/* Player Field */}
                                <div className="flex space-x-4 justify-center mb-6">
                                  {(['left', 'center', 'right'] as const).map((position) => {
                                    const placedCard = currentBattle && user ? currentBattle.players[user.uid]?.battlefield?.[position] : null;
                                    return (
                                      <div 
                                        key={position} 
                                        className={`w-24 h-32 rounded border-2 flex items-center justify-center relative overflow-hidden cursor-pointer transition-all ${
                                          placedCard 
                                            ? (currentRound >= 2 && isPlayerTurn) 
                                              ? 'bg-blue-600 border-blue-400 hover:border-yellow-400 hover:bg-blue-500' 
                                              : 'bg-blue-600 border-blue-400'
                                            : 'bg-blue-600 border-blue-400'
                                        }`}
                                        onClick={() => placedCard && currentRound >= 2 ? handleAttackClick(position) : undefined}
                                      >
                                        {placedCard ? (
                                          <div className="w-full h-full relative">
                                            {placedCard.imageUrl ? (
                                              <img 
                                                src={placedCard.imageUrl} 
                                                alt={placedCard.name}
                                                className="w-full h-full object-cover rounded"
                                                onError={(e) => console.log('Image load error:', e)}
                                              />
                                            ) : (
                                              <div className="w-full h-full bg-blue-700 flex items-center justify-center">
                                                <div className="text-center p-1">
                                                  <div className="text-xs font-bold text-white mb-1">{placedCard.name}</div>
                                                  <div className="text-xs text-blue-200">⚔{placedCard.attack || 0}</div>
                                                  <div className="text-xs text-blue-200">🛡{placedCard.defense || 0}</div>
                                                  <div className="text-xs text-blue-200">❤{placedCard.health || 1}</div>
                                                </div>
                                              </div>
                                            )}
                                            {/* Stats overlay */}
                                            <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 text-white text-xs p-1">
                                              <div className="flex justify-between">
                                                <span>⚔{placedCard.attack || 0}</span>
                                                <span>🛡{placedCard.defense || 0}</span>
                                                <span>❤{placedCard.health || 1}</span>
                                              </div>
                                            </div>
                                            
                                            {/* Attack indicator */}
                                            {currentRound >= 2 && isPlayerTurn && (
                                              <div className="absolute top-1 right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                                            )}
                                          </div>
                                        ) : (
                                          <span className="text-xs text-blue-300">Empty</span>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>

                                {/* Player Avatar and Health */}
                                <div className="flex flex-col items-center space-y-3">
                                  <div className="flex items-center space-x-4">
                                    <div className="w-16 h-16 bg-blue-600 rounded-full border-2 border-blue-400 flex items-center justify-center">
                                      <span className="text-sm font-bold text-white">{user?.displayName?.charAt(0) || 'P'}</span>
                                    </div>
                                    <div className="flex flex-col space-y-1">
                                      <div className="text-xs text-blue-400 font-bold">Your HP: {currentBattle && user ? currentBattle.players[user.uid]?.hp || 50 : 50}/50</div>
                                      <div className="w-32 h-3 bg-gray-700 rounded-full overflow-hidden">
                                        <div className="h-full bg-blue-500 rounded-full transition-all duration-300" style={{ width: `${((currentBattle && user ? currentBattle.players[user.uid]?.hp || 50 : 50) / 50) * 100}%` }}></div>
                                      </div>
                                      <div className="text-xs text-green-400">Energy: {currentBattle && user ? currentBattle.players[user.uid]?.energy || 100 : 100}/100</div>
                                      <div className="w-32 h-3 bg-gray-700 rounded-full overflow-hidden">
                                        <div className="h-full bg-green-500 rounded-full transition-all duration-300" style={{ width: `${((currentBattle && user ? currentBattle.players[user.uid]?.energy || 100 : 100) / 100) * 100}%` }}></div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Deck and Hand Section */}
                              <div className="mb-6">
                                <div className="flex items-end justify-center space-x-8">
                                  {/* Deck Stack (Left side) */}
                                  <div className="flex flex-col items-center">
                                    <h3 className="text-sm font-bold text-blue-400 mb-2">Deck ({playerDeck.length})</h3>
                                    <div className="relative">
                                      {playerDeck.length > 0 ? (
                                        <div 
                                          className="relative cursor-pointer group"
                                          onClick={drawCardFromDeck}
                                        >
                                          {/* Stack effect - multiple cards */}
                                          <div className="absolute w-20 h-28 bg-gray-700 rounded border-2 border-gray-600 transform translate-x-1 translate-y-1"></div>
                                          <div className="absolute w-20 h-28 bg-gray-600 rounded border-2 border-gray-500 transform translate-x-0.5 translate-y-0.5"></div>
                                          <div className={`w-20 h-28 rounded border-2 flex items-center justify-center relative z-10 transition-all ${
                                            playerHand.length >= 5 || playerEnergy < 5 || !isPlayerTurn
                                              ? 'bg-gray-800 border-gray-600 cursor-not-allowed' 
                                              : 'bg-blue-800 border-blue-600 hover:bg-blue-700 group-hover:transform group-hover:-translate-y-1'
                                          }`}>
                                            <div className="text-center">
                                              <div className="text-xs text-blue-200 font-bold">DECK</div>
                                              <div className="text-xs text-blue-300">{playerDeck.length}</div>
                                              {playerHand.length < 5 && playerEnergy >= 5 && isPlayerTurn && (
                                                <div className="text-xs text-yellow-300 mt-1">5 Energy</div>
                                              )}
                                            </div>
                                          </div>
                                          
                                          {/* Draw tooltip */}
                                          {playerDeck.length > 0 && (
                                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-20 bg-gray-800 border border-blue-400 rounded p-2 text-xs whitespace-nowrap">
                                              <div className="text-center">
                                                {playerHand.length >= 5 ? (
                                                  <div className="text-red-400">Hand Full (5/5)</div>
                                                ) : playerEnergy < 5 ? (
                                                  <div className="text-red-400">Need 5 Energy</div>
                                                ) : !isPlayerTurn ? (
                                                  <div className="text-gray-400">Not Your Turn</div>
                                                ) : (
                                                  <div className="text-green-400">Draw Card (5 Energy)</div>
                                                )}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      ) : (
                                        <div className="w-20 h-28 bg-gray-600 rounded border-2 border-gray-500 flex items-center justify-center">
                                          <span className="text-xs text-gray-400">Empty</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Hand Cards (Right side) */}
                                  <div className="flex flex-col items-center">
                                    <h3 className="text-sm font-bold text-blue-400 mb-2">Your Hand</h3>
                                    <div className="flex space-x-2">
                                      {(currentBattle && user ? currentBattle.players[user.uid]?.hand?.length > 0 : false) ? (
                                        (currentBattle && user ? currentBattle.players[user.uid]?.hand || [] : []).map((cardId: string, index: number) => {
                                          const card = cards.find(c => c.id === cardId);
                                          const isSelected = selectedCard === cardId;
                                          return (
                                            <div 
                                              key={cardId || index} 
                                              className={`w-24 h-32 rounded border-2 flex flex-col items-center justify-center cursor-pointer relative group transition-all ${
                                                isSelected ? 'border-yellow-400 bg-yellow-600 transform -translate-y-2' : 
                                                card?.imageUrl ? 'border-blue-400 bg-blue-600 hover:bg-blue-500' : 'border-gray-400 bg-gray-600 hover:bg-gray-500'
                                              }`}
                                              onClick={() => isPlayerTurn ? handleCardClick(cardId) : undefined}
                                            >
                                              {card?.imageUrl ? (
                                                <img 
                                                  src={card.imageUrl} 
                                                  alt={card.name}
                                                  className="w-full h-full object-cover rounded"
                                                />
                                              ) : (
                                                <div className="text-center p-1">
                                                  <div className="text-xs font-bold text-white mb-1">{card?.name || `Card ${index + 1}`}</div>
                                                  <div className="text-xs text-blue-200">{card?.type}</div>
                                                </div>
                                              )}
                                              
                                              {/* Card tooltip - Show ALL characteristics */}
                                              {card && (
                                                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-20 bg-gray-800 border border-blue-400 rounded p-3 text-xs min-w-48">
                                                  <div className="font-bold text-yellow-400 mb-2">{card.name}</div>
                                                  <div className="space-y-1">
                                                    <div>Type: <span className="text-blue-300">{card.type}</span></div>
                                                    {card.attack !== undefined && <div>Attack: <span className="text-red-400">{card.attack}</span></div>}
                                                    {card.defense !== undefined && <div>Defense: <span className="text-green-400">{card.defense}</span></div>}
                                                    {card.health !== undefined && <div>Health: <span className="text-pink-400">{card.health}</span></div>}
                                                    {card.cost !== undefined && <div>Energy Cost: <span className="text-yellow-300">{card.cost}</span></div>}
                                                    {card.criticalChance !== undefined && <div>Crit Chance: <span className="text-orange-400">{card.criticalChance}%</span></div>}
                                                    {card.criticalDamage !== undefined && <div>Crit Damage: <span className="text-orange-400">{card.criticalDamage}%</span></div>}
                                                    {card.rangedResistance !== undefined && <div>Ranged Resist: <span className="text-purple-400">{card.rangedResistance}%</span></div>}
                                                    {card.meleeResistance !== undefined && <div>Melee Resist: <span className="text-purple-400">{card.meleeResistance}%</span></div>}
                                                    {card.magicResistance !== undefined && <div>Magic Resist: <span className="text-purple-400">{card.magicResistance}%</span></div>}
                                                    {card.spellType && <div>Spell Type: <span className="text-cyan-400">{card.spellType}</span></div>}
                                                    {card.passiveAbilities && card.passiveAbilities.length > 0 && (
                                                      <div>Passive: <span className="text-lime-400">{card.passiveAbilities.join(', ')}</span></div>
                                                    )}
                                                  </div>
                                                  {card.description && <div className="mt-2 text-gray-300 italic border-t border-gray-600 pt-2">{card.description}</div>}
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })
                                      ) : (
                                        [1, 2, 3, 4, 5].map((placeholder) => (
                                          <div key={placeholder} className="w-24 h-32 bg-gray-600 rounded border-2 border-gray-500 flex items-center justify-center">
                                            <span className="text-xs text-gray-400">No Deck</span>
                                          </div>
                                        ))
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Placement buttons for battle cards */}
                                {showPlacementButtons && (
                                  <div className="mt-4 flex justify-center space-x-4">
                                    <Button 
                                      onClick={() => placeBattleCard('left')} 
                                      disabled={!!(currentBattle && user ? currentBattle.players[user.uid]?.battlefield?.left : null) || 
                                        (currentBattle && user ? (currentBattle.players[user.uid]?.energy || 0) < 20 : true) || 
                                        (currentBattle && user ? (currentBattle.players[user.uid]?.battleCardsPlayedThisRound || 0) >= 1 : true) || 
                                        (currentBattle && user ? currentBattle.currentTurn !== user.uid : true)}
                                      className={`${!!(currentBattle && user ? currentBattle.players[user.uid]?.battlefield?.left : null) ? 'bg-gray-500' : 'bg-green-600 hover:bg-green-700'} disabled:bg-gray-500`}
                                    >
                                      Left Field (20 Energy)
                                    </Button>
                                    <Button 
                                      onClick={() => placeBattleCard('center')} 
                                      disabled={!!(currentBattle && user ? currentBattle.players[user.uid]?.battlefield?.center : null) || 
                                        (currentBattle && user ? (currentBattle.players[user.uid]?.energy || 0) < 20 : true) || 
                                        (currentBattle && user ? (currentBattle.players[user.uid]?.battleCardsPlayedThisRound || 0) >= 1 : true) || 
                                        (currentBattle && user ? currentBattle.currentTurn !== user.uid : true)}
                                      className={`${!!(currentBattle && user ? currentBattle.players[user.uid]?.battlefield?.center : null) ? 'bg-gray-500' : 'bg-green-600 hover:bg-green-700'} disabled:bg-gray-500`}
                                    >
                                      Center Field (20 Energy)
                                    </Button>
                                    <Button 
                                      onClick={() => placeBattleCard('right')} 
                                      disabled={!!(currentBattle && user ? currentBattle.players[user.uid]?.battlefield?.right : null) || 
                                        (currentBattle && user ? (currentBattle.players[user.uid]?.energy || 0) < 20 : true) || 
                                        (currentBattle && user ? (currentBattle.players[user.uid]?.battleCardsPlayedThisRound || 0) >= 1 : true) || 
                                        (currentBattle && user ? currentBattle.currentTurn !== user.uid : true)}
                                      className={`${!!(currentBattle && user ? currentBattle.players[user.uid]?.battlefield?.right : null) ? 'bg-gray-500' : 'bg-green-600 hover:bg-green-700'} disabled:bg-gray-500`}
                                    >
                                      Right Field (20 Energy)
                                    </Button>
                                    <Button 
                                      onClick={() => { setSelectedCard(null); setShowPlacementButtons(false); }} 
                                      variant="outline"
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                )}

                                {/* Attack targeting overlay */}
                                {showAttackTargets && selectedAttacker && (
                                  <div className="mt-4 text-center">
                                    <div className="mb-4 p-3 bg-yellow-600 bg-opacity-50 border border-yellow-400 rounded">
                                      <div className="text-yellow-200 font-bold">Select Attack Target</div>
                                      <div className="text-sm text-yellow-300">
                                        {(currentBattle && user && selectedAttacker ? currentBattle.players[user.uid]?.battlefield?.[selectedAttacker]?.name : '')} is ready to attack!
                                      </div>
                                    </div>
                                    <Button 
                                      onClick={() => { setSelectedAttacker(null); setShowAttackTargets(false); }} 
                                      variant="outline"
                                      className="border-gray-600"
                                    >
                                      Cancel Attack
                                    </Button>
                                  </div>
                                )}
                              </div>

                              {/* Battle Controls */}
                              <div className="flex justify-center mt-6 space-x-4">
                                <Button 
                                  onClick={endPlayerTurn}
                                  disabled={!(currentBattle && user ? currentBattle.currentTurn === user.uid : false)}
                                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-500 px-6"
                                >
                                  <i className="fas fa-play mr-2"></i>
                                  end the move
                                </Button>
                                <Button variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-700 px-6">
                                  <i className="fas fa-shield mr-2"></i>
                                  Defend
                                </Button>
                                <Button
                                  onClick={() => {
                                    setCurrentRoomId(null);
                                    // Reset battle state
                                    setCurrentRound(1);
                                    setIsPlayerTurn(true);
                                    setBattleCardsPlayedThisRound(0);
                                    setPlayerEnergy(100);
                                    setPlayerHP(50);
                                    setBattlefield({ left: null, center: null, right: null });
                                    setEnemyBattlefield({ left: null, center: null, right: null });
                                    handleTabChange('ranking');
                                  }}
                                  variant="destructive"
                                  className="px-6"
                                >
                                  <i className="fas fa-flag mr-2"></i>
                                  Surrender
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="text-center">
                              <div className="w-20 h-20 bg-gray-700 rounded-full mx-auto mb-4 flex items-center justify-center">
                                <i className="fas fa-swords text-gray-400 text-3xl"></i>
                              </div>
                              <h3 className="text-xl font-bold text-gray-400 mb-2">No Active Battle</h3>
                              <p className="text-gray-500 mb-6">Join a room and start a battle first</p>
                              
                              <Button
                                onClick={() => handleBattleSubTabChange('waiting-room')}
                                className="bg-orange-600 hover:bg-orange-700 px-6 py-3"
                              >
                                <i className="fas fa-hourglass-half mr-2"></i>
                                Go to Waiting Room
                              </Button>
                            </div>
                          )}
                        </Card>
                      </TabsContent>
                    </Tabs>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'battle-old-removed' && !currentRoom && (
              <div>
                <div className="p-6">
                  <div className="mb-6">
                    <h2 className="text-3xl font-bold text-yellow-400 mb-2">
                      <i className="fas fa-sword mr-2"></i>
                      Battle Arena
                    </h2>
                    <p className="text-gray-400">Choose your action to start battling</p>
                  </div>

                  <Card className="bg-gray-800 border-blue-600 p-8 text-center">
                    <div className="mb-6">
                      <div className="w-20 h-20 bg-gray-700 rounded-full mx-auto mb-4 flex items-center justify-center">
                        <i className="fas fa-swords text-yellow-400 text-3xl"></i>
                      </div>
                      <h3 className="text-xl font-bold text-gray-400 mb-2">Ready for Action</h3>
                      <p className="text-gray-500">Choose how you want to battle!</p>
                    </div>
                    
                    <div className="flex justify-center space-x-4">
                      <Button
                        onClick={() => handleTabChange('rooms')}
                        className="bg-blue-600 hover:bg-blue-700 px-6 py-3"
                      >
                        <i className="fas fa-search mr-2"></i>
                        Find Room
                      </Button>
                      <Button
                        onClick={() => handleTabChange('create-room')}
                        disabled={isGuest}
                        className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 px-6 py-3"
                      >
                        <i className="fas fa-plus mr-2"></i>
                        Create Room
                      </Button>
                      <Button
                        onClick={() => handleBattleSubTabChange('waiting-room')}
                        className="bg-yellow-600 hover:bg-yellow-700 px-6 py-3"
                      >
                        <i className="fas fa-hourglass-half mr-2"></i>
                        Waiting Room
                      </Button>
                    </div>
                  </Card>
                </div>
              </div>
            )}





            {activeTab === 'ranking' && (
              <div>
                <div className="p-6">
                  <div className="mb-6">
                    <h2 className="text-3xl font-bold text-yellow-400 mb-2">
                      <i className="fas fa-crown mr-2"></i>
                      Leaderboard
                    </h2>
                    <p className="text-gray-400">Top warriors in the battle arena</p>
                  </div>

                  <Card className="bg-gray-800 border-blue-600 overflow-hidden">
                    <div className="bg-blue-600 px-6 py-4">
                      <div className="grid grid-cols-4 gap-4 text-sm font-semibold">
                        <span>Rank</span>
                        <span>Player</span>
                        <span>Wins</span>
                        <span>Win Rate</span>
                      </div>
                    </div>
                    
                    <div className="divide-y divide-gray-700">
                      {rankings.map((player, index) => (
                        <div key={player.uid} className="px-6 py-4 hover:bg-blue-600 hover:bg-opacity-20 transition-colors">
                          <div className="grid grid-cols-4 gap-4 items-center">
                            <div className="flex items-center space-x-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-black ${
                                index === 0 ? 'bg-yellow-400' : 
                                index === 1 ? 'bg-gray-400' : 
                                index === 2 ? 'bg-yellow-600' : 'bg-gray-600'
                              }`}>
                                {index + 1}
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center overflow-hidden">
                                {player.profilePicture ? (
                                  <img 
                                    src={player.profilePicture} 
                                    alt={player.displayName} 
                                    className="w-full h-full object-cover" 
                                  />
                                ) : (
                                  <i className="fas fa-user text-sm"></i>
                                )}
                              </div>
                              <span className="font-semibold">{player.displayName}</span>
                            </div>
                            <span className="text-green-400 font-bold">{player.wins}</span>
                            <span className="text-yellow-400">{player.winRate}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>
              </div>
            )}

            {/* Rooms Tab */}
            {activeTab === 'rooms' && (
              <div>
                <div className="p-6">
                  {userExistingRoom && (
                    <Card className="bg-yellow-900 border-yellow-600 p-4 mb-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-bold text-yellow-400">You're already in: {userExistingRoom.name}</h4>
                          <p className="text-sm text-yellow-200">
                            {userExistingRoom.type === 'pvp' ? 'Player vs Player' : 'Player vs Environment'} • 
                            {userExistingRoom.players.length}/{userExistingRoom.maxPlayers} players
                          </p>
                        </div>
                        <Button
                          onClick={() => {
                            handleTabChange('battle');
                            setBattleSubTab(userExistingRoom.type === 'pve' ? 'fight' : 'waiting-room');
                          }}
                          className="bg-yellow-600 hover:bg-yellow-700"
                        >
                          <i className="fas fa-arrow-right mr-2"></i>
                          Go to Battle
                        </Button>
                      </div>
                    </Card>
                  )}
                  
                  <div className="mb-6 flex justify-between items-center">
                    <div>
                      <h2 className="text-3xl font-bold text-yellow-400 mb-2">
                        <i className="fas fa-users mr-2"></i>
                        Battle Rooms
                      </h2>
                      <p className="text-gray-400">
                        {userExistingRoom 
                          ? 'You can only be in one room at a time. Leave your current room to join another.'
                          : 'Join active battles or spectate ongoing matches'}
                      </p>
                    </div>
                    {user && user.isAdmin && (
                      <Button
                        onClick={createTestRooms}
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        <i className="fas fa-plus mr-2"></i>
                        Create Test Rooms
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {rooms.map((room) => (
                      <Card key={room.id} className="bg-gray-800 border-blue-600 p-6 hover:border-yellow-400 transition-colors">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-xl font-bold">{room.name}</h3>
                          <div className="flex items-center space-x-2">
                            <div className={`w-3 h-3 rounded-full ${
                              room.status === 'waiting' ? 'bg-green-400 animate-pulse' :
                              room.status === 'active' ? 'bg-yellow-400' : 'bg-red-400'
                            }`}></div>
                            <span className={`text-sm capitalize ${
                              room.status === 'waiting' ? 'text-green-400' :
                              room.status === 'active' ? 'text-yellow-400' : 'text-red-400'
                            }`}>
                              {room.status}
                            </span>
                          </div>
                        </div>
                        
                        <div className="space-y-3 mb-4">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400">Room Type:</span>
                            <span className={`font-semibold uppercase ${
                              room.type === 'pvp' ? 'text-yellow-400' : 'text-purple-400'
                            }`}>
                              {room.type}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400">Players:</span>
                            <span className="text-white">{room.players.length}/{room.maxPlayers}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400">Host:</span>
                            <span className="text-white">{room.hostName}</span>
                          </div>
                          {room.description && (
                            <div className="text-sm text-gray-300 mt-2 p-2 bg-gray-900 rounded">
                              {room.description}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleJoinRoom(room.id)}
                            disabled={isGuest || room.status !== 'waiting' || (user ? room.players.includes(user.uid) : false) || (!!userExistingRoom && userExistingRoom.id !== room.id)}
                            className={`flex-1 font-bold py-3 transition-colors ${
                              !isGuest && room.status === 'waiting' && (!user || !room.players.includes(user.uid)) && (!userExistingRoom || userExistingRoom.id === room.id)
                                ? 'bg-red-600 hover:bg-red-700 text-white'
                                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                            }`}
                          >
                            {isGuest ? (
                              <>
                                <i className="fas fa-lock mr-2"></i>
                                Login Required
                              </>
                            ) : userExistingRoom && userExistingRoom.id !== room.id ? (
                              <>
                                <i className="fas fa-ban mr-2"></i>
                                In Another Room
                              </>
                            ) : user && room.players.includes(user.uid) ? (
                              <>
                                <i className="fas fa-check mr-2"></i>
                                Joined
                              </>
                            ) : room.status === 'waiting' ? (
                              <>
                                <i className="fas fa-sword mr-2"></i>
                                Join Battle
                              </>
                            ) : (
                              <>
                                <i className="fas fa-eye mr-2"></i>
                                Spectate
                              </>
                            )}
                          </Button>
                          
                          {/* Delete button for room hosts or admins */}
                          {user && (user.uid === room.hostId || user.isAdmin) && (
                            <Button
                              onClick={async () => {
                                if (confirm(`Delete room "${room.name}"?`)) {
                                  await deleteRoom(room.id);
                                }
                              }}
                              variant="outline"
                              size="sm"
                              className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white px-3"
                            >
                              <i className="fas fa-times"></i>
                            </Button>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Cards Tab */}
            {activeTab === 'cards' && (
              <CardsGrid cards={cards} />
            )}

            {/* Deck Tab */}
            {activeTab === 'deck' && (
              <div>
                {isGuest ? (
                  <div className="p-6 text-center">
                    <div className="bg-gray-800 border border-blue-600 rounded-lg p-8">
                      <i className="fas fa-lock text-4xl text-gray-400 mb-4"></i>
                      <h3 className="text-xl font-bold text-yellow-400 mb-2">Login Required</h3>
                      <p className="text-gray-400 mb-4">You need to login to build and manage your deck</p>
                      <Button
                        onClick={() => setShowAuthModal(true)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <i className="fas fa-sign-in-alt mr-2"></i>
                        Login Now
                      </Button>
                    </div>
                  </div>
                ) : (
                  <DeckBuilder />
                )}
              </div>
            )}

            {/* Create Room Tab */}
            {activeTab === 'create-room' && (
              <div>
                {isGuest ? (
                  <div className="p-6 text-center">
                    <div className="bg-gray-800 border border-blue-600 rounded-lg p-8">
                      <i className="fas fa-lock text-4xl text-gray-400 mb-4"></i>
                      <h3 className="text-xl font-bold text-yellow-400 mb-2">Login Required</h3>
                      <p className="text-gray-400 mb-4">You need to login to create battle rooms</p>
                      <Button
                        onClick={() => setShowAuthModal(true)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <i className="fas fa-sign-in-alt mr-2"></i>
                        Login Now
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="p-6">
                    <div className="mb-6">
                      <h2 className="text-3xl font-bold text-yellow-400 mb-2">
                        <i className="fas fa-plus mr-2"></i>
                        Create Battle Room
                      </h2>
                      <p className="text-gray-400">
                        {userExistingRoom 
                          ? `You're currently in "${userExistingRoom.name}". Leave that room to create a new one.`
                          : 'Set up a new battle arena for other warriors'}
                      </p>
                    </div>

                    {userExistingRoom && (
                      <Card className="max-w-2xl mx-auto bg-yellow-900 border-yellow-600 p-4 mb-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-bold text-yellow-400">Active Room: {userExistingRoom.name}</h4>
                            <p className="text-sm text-yellow-200">
                              {userExistingRoom.type === 'pvp' ? 'Player vs Player' : 'Player vs Environment'} • 
                              {userExistingRoom.players.length}/{userExistingRoom.maxPlayers} players
                            </p>
                          </div>
                          <Button
                            onClick={() => {
                              handleTabChange('battle');
                              setBattleSubTab(userExistingRoom.type === 'pve' ? 'fight' : 'waiting-room');
                            }}
                            className="bg-yellow-600 hover:bg-yellow-700"
                          >
                            <i className="fas fa-arrow-right mr-2"></i>
                            Go to Room
                          </Button>
                        </div>
                      </Card>
                    )}

                    <Card className="max-w-2xl mx-auto bg-gray-800 border-blue-600 p-8">
                      <form onSubmit={handleCreateRoom} className="space-y-6">
                      <Input
                        placeholder="Room Name"
                        value={roomForm.name}
                        onChange={(e) => setRoomForm({ ...roomForm, name: e.target.value })}
                        required
                        className="bg-gray-900 border-gray-600 focus:border-yellow-400"
                      />

                      <div>
                        <label className="block text-sm font-semibold mb-2">Room Type</label>
                        <div className="grid grid-cols-2 gap-4">
                          <label className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${
                            roomForm.type === 'pvp' ? 'border-yellow-400' : 'border-blue-600 hover:border-yellow-400'
                          }`}>
                            <input
                              type="radio"
                              name="roomType"
                              value="pvp"
                              checked={roomForm.type === 'pvp'}
                              onChange={(e) => setRoomForm({ ...roomForm, type: e.target.value as 'pvp' | 'pve' })}
                              className="mr-3"
                            />
                            <div>
                              <div className="font-semibold text-red-400">
                                <i className="fas fa-swords mr-2"></i>
                                Player vs Player
                              </div>
                              <p className="text-sm text-gray-400 mt-1">Battle against another human player</p>
                            </div>
                          </label>
                          
                          <label className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${
                            roomForm.type === 'pve' ? 'border-yellow-400' : 'border-blue-600 hover:border-yellow-400'
                          }`}>
                            <input
                              type="radio"
                              name="roomType"
                              value="pve"
                              checked={roomForm.type === 'pve'}
                              onChange={(e) => setRoomForm({ ...roomForm, type: e.target.value as 'pvp' | 'pve' })}
                              className="mr-3"
                            />
                            <div>
                              <div className="font-semibold text-purple-400">
                                <i className="fas fa-robot mr-2"></i>
                                Player vs Environment
                              </div>
                              <p className="text-sm text-gray-400 mt-1">Battle against AI with fixed deck</p>
                            </div>
                          </label>
                        </div>
                      </div>

                      <Textarea
                        placeholder="Room Description (Optional)"
                        value={roomForm.description}
                        onChange={(e) => setRoomForm({ ...roomForm, description: e.target.value })}
                        rows={3}
                        className="bg-gray-900 border-gray-600 focus:border-yellow-400"
                      />

                      <div className="flex items-center justify-between pt-4">
                        <div className="text-sm text-gray-400">
                          <i className="fas fa-info-circle mr-1"></i>
                          {userExistingRoom 
                            ? `You're already in "${userExistingRoom.name}"` 
                            : 'Your current deck will be used for this battle'}
                        </div>
                        <Button
                          type="submit"
                          disabled={!!userExistingRoom}
                          className={`${
                            userExistingRoom 
                              ? 'bg-gray-600 cursor-not-allowed' 
                              : 'bg-red-600 hover:bg-red-700'
                          } text-white font-bold py-3 px-8`}
                        >
                          <i className="fas fa-plus mr-2"></i>
                          {userExistingRoom ? 'Already in Room' : 'Create Room'}
                        </Button>
                      </div>
                      </form>
                    </Card>
                  </div>
                )}
              </div>
            )}

            {/* Admin Tab */}
            {activeTab === 'admin' && user && user.isAdmin && (
              <div>
                <AdminPanel />
              </div>
            )}
            </div>
          </div>
          
          {/* Chat Panel - Small Separate Window */}
          <div className={`fixed bottom-4 right-4 bg-gray-800 border border-blue-600 rounded-lg shadow-lg transition-all duration-300 z-40 ${
            chatCollapsed ? 'w-12 h-12' : 'w-80 h-96'
          }`}>
            {/* Chat Header */}
            <div className="bg-blue-900 text-white p-2 flex items-center justify-between rounded-t-lg">
              {!chatCollapsed && (
                <h4 className="font-bold text-xs">
                  <i className="fas fa-comments mr-1"></i>
                  Chat
                </h4>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setChatCollapsed(!chatCollapsed)}
                className={`p-1 text-white hover:bg-blue-800 ${chatCollapsed ? 'w-full h-full rounded-lg' : 'h-5 w-5'}`}
              >
                <i className={`fas ${chatCollapsed ? 'fa-comments' : 'fa-minus'} text-xs`}></i>
              </Button>
            </div>
            
            {/* Chat Messages */}
            {!chatCollapsed && (
              <div className="flex-1 overflow-y-auto p-2 bg-gray-900 text-xs" style={{ height: '280px' }}>
                {chatMessages.map((msg) => (
                  <div key={msg.id} className="text-gray-400 mb-1">
                    <span className={msg.type === 'system' ? 'text-blue-400' : 'text-green-400'}>
                      [{msg.displayName}]
                    </span> {msg.message}
                  </div>
                ))}
              </div>
            )}
            
            {/* Chat Input */}
            {!chatCollapsed && (
              <div className="p-2 bg-gray-800 rounded-b-lg">
                <div className="flex space-x-1">
                  <Input
                    placeholder={isGuest ? "Login to chat" : "Type message..."}
                    disabled={isGuest}
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    className="flex-1 h-6 text-xs bg-gray-700 border-gray-600 text-white"
                  />
                  <Button
                    size="sm"
                    disabled={isGuest || !chatMessage.trim()}
                    onClick={handleSendMessage}
                    className="h-6 px-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600"
                  >
                    <i className="fas fa-paper-plane text-xs"></i>
                  </Button>
                </div>
              </div>
            )}
          </div>
          

        </div>
      </div>

      {/* Auth Modal */}
      <AuthModal 
        open={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
      />
    </div>
  );
}
