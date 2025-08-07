import { useState, useEffect } from 'react';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  limit,
  where,
  getDocs,
  getDoc,
  setDoc,
  QuerySnapshot,
  DocumentData,
  increment,
  arrayRemove,
  arrayUnion
} from 'firebase/firestore';
import { db, BASE_CARDS } from '@/lib/firebase';
import { GameCard, Room, Battle, RankingEntry, ChatMessage } from '@/types/game';
import { useToast } from '@/hooks/use-toast';

export function useFirestore() {
  const [cards, setCards] = useState<GameCard[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Initialize base cards if they don't exist
  useEffect(() => {
    const initializeBaseCards = async () => {
      try {
        const cardsQuery = query(collection(db, 'cards'), where('isBase', '==', true));
        const cardsSnapshot = await getDocs(cardsQuery);
        
        if (cardsSnapshot.empty) {
          // Create base cards
          for (const card of BASE_CARDS) {
            await setDoc(doc(db, 'cards', card.id), card);
          }
        }
      } catch (error) {
        console.error('Error initializing base cards:', error);
      }
    };

    initializeBaseCards();
  }, []);

  // Listen to cards collection
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'cards'),
      (snapshot: QuerySnapshot<DocumentData>) => {
        const cardsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as GameCard[];
        setCards(cardsData);
        setLoading(false);
      },
      (error: any) => {
        console.error('Error fetching cards:', error);
        toast({
          title: "Error",
          description: "Failed to load cards",
          variant: "destructive"
        });
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [toast]);

  // Listen to rooms collection
  useEffect(() => {
    const unsubscribe = onSnapshot(
      query(collection(db, 'rooms'), orderBy('createdAt', 'desc')),
      (snapshot: QuerySnapshot<DocumentData>) => {
        const roomsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Room[];
        setRooms(roomsData);
      },
      (error: any) => {
        console.error('Error fetching rooms:', error);
        toast({
          title: "Error",
          description: "Failed to load rooms",
          variant: "destructive"
        });
      }
    );

    return () => unsubscribe();
  }, [toast]);

  // Listen to rankings
  useEffect(() => {
    const unsubscribe = onSnapshot(
      query(collection(db, 'users'), orderBy('wins', 'desc'), limit(10)),
      (snapshot: QuerySnapshot<DocumentData>) => {
        const rankingsData = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            uid: doc.id,
            displayName: data.displayName,
            profilePicture: data.profilePicture,
            wins: data.wins || 0,
            losses: data.losses || 0,
            winRate: data.wins + data.losses > 0 ? Math.round((data.wins / (data.wins + data.losses)) * 100) : 0
          };
        }) as RankingEntry[];
        setRankings(rankingsData);
      },
      (error: any) => {
        console.error('Error fetching rankings:', error);
        toast({
          title: "Error",
          description: "Failed to load rankings",
          variant: "destructive"
        });
      }
    );

    return () => unsubscribe();
  }, [toast]);

  // Listen to chat messages
  useEffect(() => {
    const unsubscribe = onSnapshot(
      query(collection(db, 'chatMessages'), orderBy('timestamp', 'asc'), limit(50)),
      (snapshot: QuerySnapshot<DocumentData>) => {
        const messagesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as ChatMessage[];
        setChatMessages(messagesData);
      },
      (error: any) => {
        console.error('Error fetching chat messages:', error);
      }
    );

    return () => unsubscribe();
  }, []);

  const createRoom = async (roomData: Omit<Room, 'id' | 'createdAt'>) => {
    try {
      const roomWithTimestamp = {
        ...roomData,
        createdAt: Date.now(),
        lastActivity: Date.now(), // Track for auto-deletion
        playersReady: [] // Track which players clicked ready
      };
      
      const docRef = await addDoc(collection(db, 'rooms'), roomWithTimestamp);
      
      // For PvE rooms, immediately create a battle
      if (roomData.type === 'pve') {
        const battleData = {
          roomId: docRef.id,
          players: {
            [roomData.hostId]: {
              uid: roomData.hostId,
              displayName: roomData.hostName,
              hp: 50,
              energy: 100,
              deck: [], // Will be populated from user's actual deck
              hand: [],
              battlefield: {
                left: null,
                center: null,
                right: null
              },
              isReady: false,
              battleCardsPlayedThisRound: 0
            },
            'ai_opponent': {
              uid: 'ai_opponent',
              displayName: 'AI Opponent',
              hp: 50,
              energy: 100,
              deck: [], // AI deck will be auto-generated
              hand: [],
              battlefield: {
                left: null,
                center: null,
                right: null
              },
              isReady: true,
              battleCardsPlayedThisRound: 0
            }
          },
          currentTurn: roomData.hostId,
          phase: 'preparation',
          status: 'active',
          currentRound: 1,
          createdAt: Date.now(),
          lastActivity: Date.now()
        };
        
        const battleRef = await addDoc(collection(db, 'battles'), battleData);
        
        // Update room status to active
        await updateDoc(doc(db, 'rooms', docRef.id), {
          status: 'active',
          battleId: battleRef.id
        });
      }
      
      // Don't show toast here, let the calling component handle it to prevent navigation conflicts
      return docRef.id;
    } catch (error) {
      console.error('Error creating room:', error);
      toast({
        title: "Error",
        description: "Failed to create room",
        variant: "destructive"
      });
      return null;
    }
  };

  const joinRoom = async (roomId: string, userId: string, userName?: string) => {
    try {
      const roomRef = doc(db, 'rooms', roomId);
      const room = rooms.find(r => r.id === roomId);
      if (!room) throw new Error('Room not found');

      const updatedPlayers = [...room.players, userId];
      const updatedRoom = {
        players: updatedPlayers,
        status: updatedPlayers.length >= room.maxPlayers ? 'active' : 'waiting',
        lastActivity: Date.now(),
        playersReady: room.playersReady || [] // Preserve existing readiness
      };

      await updateDoc(roomRef, updatedRoom);
      
      // If room is now full (PvP), create a battle
      if (room.type === 'pvp' && updatedPlayers.length >= room.maxPlayers) {
        const battleData = {
          roomId: roomId,
          players: {
            [room.hostId]: {
              uid: room.hostId,
              displayName: room.hostName,
              hp: 50,
              energy: 100,
              deck: [], // Will be populated from user's actual deck
              hand: [],
              battlefield: {
                left: null,
                center: null,
                right: null
              },
              isReady: false,
              battleCardsPlayedThisRound: 0
            },
            [userId]: {
              uid: userId,
              displayName: userName || 'Player 2', // Use actual name if provided
              hp: 50,
              energy: 100,
              deck: [],
              hand: [],
              battlefield: {
                left: null,
                center: null,
                right: null
              },
              isReady: false,
              battleCardsPlayedThisRound: 0
            }
          },
          currentTurn: room.hostId,
          phase: 'preparation',
          status: 'waiting_for_ready', // Players need to click "Start Battle"
          readyCount: 0,
          currentRound: 1,
          createdAt: Date.now(),
          lastActivity: Date.now()
        };
        
        const battleRef = await addDoc(collection(db, 'battles'), battleData);
        
        // Update room with battle ID
        await updateDoc(roomRef, {
          battleId: battleRef.id
        });
      }
      
      // Don't show toast here, let the calling component handle it to prevent navigation conflicts
      return true;
    } catch (error) {
      console.error('Error joining room:', error);
      toast({
        title: "Error",
        description: "Failed to join room",
        variant: "destructive"
      });
      return false;
    }
  };

  const createCard = async (cardData: Omit<GameCard, 'id'>) => {
    try {
      await addDoc(collection(db, 'cards'), cardData);
      toast({
        title: "Success",
        description: "Card created successfully!"
      });
    } catch (error) {
      console.error('Error creating card:', error);
      toast({
        title: "Error",
        description: "Failed to create card",
        variant: "destructive"
      });
    }
  };

  const updateCard = async (cardId: string, cardData: Partial<GameCard>) => {
    try {
      const cardRef = doc(db, 'cards', cardId);
      await updateDoc(cardRef, cardData);
      toast({
        title: "Success",
        description: "Card updated successfully!"
      });
    } catch (error) {
      console.error('Error updating card:', error);
      toast({
        title: "Error",
        description: "Failed to update card",
        variant: "destructive"
      });
    }
  };

  const deleteCard = async (cardId: string) => {
    try {
      await deleteDoc(doc(db, 'cards', cardId));
      toast({
        title: "Success",
        description: "Card deleted successfully!"
      });
    } catch (error) {
      console.error('Error deleting card:', error);
      toast({
        title: "Error",
        description: "Failed to delete card",
        variant: "destructive"
      });
    }
  };

  const createBattle = async (battleData: Omit<Battle, 'id' | 'createdAt'>) => {
    try {
      const docRef = await addDoc(collection(db, 'battles'), {
        ...battleData,
        createdAt: Date.now()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating battle:', error);
      return null;
    }
  };

  const updateBattle = async (battleId: string, battleData: Partial<Battle>) => {
    try {
      const battleRef = doc(db, 'battles', battleId);
      await updateDoc(battleRef, battleData);
    } catch (error) {
      console.error('Error updating battle:', error);
    }
  };

  const markPlayerReady = async (roomId: string, battleId: string, playerId: string) => {
    try {
      const battleRef = doc(db, 'battles', battleId);
      const roomRef = doc(db, 'rooms', roomId);
      
      // Update player ready status and increment ready count
      await updateDoc(battleRef, {
        [`players.${playerId}.isReady`]: true,
        readyCount: 1 // This will be updated properly in real implementation
      });
      
      // Check if both players are ready (simplified - would need actual count check)
      // For now, assume 2 ready clicks = start battle
      const battleDoc = await getDoc(battleRef);
      if (battleDoc.exists()) {
        const battleData = battleDoc.data();
        const readyPlayers = Object.values(battleData.players).filter((p: any) => p.isReady).length;
        
        if (readyPlayers >= 2) {
          // Start the battle
          await updateDoc(battleRef, {
            status: 'active',
            phase: 'battle'
          });
          
          await updateDoc(roomRef, {
            status: 'active',
            lastActivity: Date.now()
          });
        }
      }
      
      toast({
        title: "Ready!",
        description: "Waiting for other players..."
      });
    } catch (error) {
      console.error('Error marking player ready:', error);
      toast({
        title: "Error",
        description: "Failed to mark ready",
        variant: "destructive"
      });
    }
  };

  // Auto-delete rooms after 24 hours of inactivity
  const cleanupInactiveRooms = async () => {
    try {
      const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
      const roomsQuery = query(
        collection(db, 'rooms'),
        where('lastActivity', '<', cutoff)
      );
      
      const snapshot = await getDocs(roomsQuery);
      
      for (const roomDoc of snapshot.docs) {
        const roomData = roomDoc.data();
        
        // Delete associated battle if exists
        if (roomData.battleId) {
          await deleteDoc(doc(db, 'battles', roomData.battleId));
        }
        
        // Delete the room
        await deleteDoc(roomDoc.ref);
      }
      
      if (snapshot.docs.length > 0) {
        console.log(`Cleaned up ${snapshot.docs.length} inactive rooms`);
      }
    } catch (error) {
      console.error('Error cleaning up inactive rooms:', error);
    }
  };

  const updateUserDeck = async (userId: string, deck: string[]) => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { deck });
      toast({
        title: "Success",
        description: "Deck saved successfully!"
      });
    } catch (error) {
      console.error('Error updating deck:', error);
      toast({
        title: "Error",
        description: "Failed to save deck",
        variant: "destructive"
      });
    }
  };

  const createTestRooms = async () => {
    try {
      const testRooms = [
        {
          name: 'Битва с Огненным Боем',
          type: 'pve' as const,
          hostId: 'ai-bot-fire',
          hostName: 'Огненный Бот',
          players: ['ai-bot-fire'],
          maxPlayers: 2,
          status: 'waiting' as const,
          description: 'Сразись с огненным ботом в классической битве карт'
        },
        {
          name: 'Ледяная Арена',
          type: 'pve' as const,
          hostId: 'ai-bot-ice',
          hostName: 'Ледяной Страж',
          players: ['ai-bot-ice'],
          maxPlayers: 2,
          status: 'waiting' as const,
          description: 'Проверь свои навыки против ледяного противника'
        },
        {
          name: 'Открытая PvP Битва',
          type: 'pvp' as const,
          hostId: 'test-host',
          hostName: 'Хост Тестер',
          players: ['test-host'],
          maxPlayers: 2,
          status: 'waiting' as const,
          description: 'Открытая комната для сражений с другими игроками'
        }
      ];

      for (const room of testRooms) {
        await createRoom(room);
      }
      
      toast({
        title: "Test Rooms Created",
        description: "Added rooms for testing the battle system"
      });
    } catch (error) {
      console.error('Error creating test rooms:', error);
    }
  };

  // Run cleanup on component mount
  useEffect(() => {
    cleanupInactiveRooms();
    
    // Set up interval to run cleanup every hour
    const cleanup = setInterval(cleanupInactiveRooms, 60 * 60 * 1000);
    
    return () => clearInterval(cleanup);
  }, []);

  const deleteRoom = async (roomId: string) => {
    try {
      // Find the room and delete associated battle if exists
      const room = rooms.find(r => r.id === roomId);
      if (room?.battleId) {
        await deleteDoc(doc(db, 'battles', room.battleId));
      }
      
      await deleteDoc(doc(db, 'rooms', roomId));
      toast({
        title: "Success",
        description: "Room deleted successfully!"
      });
      return true;
    } catch (error) {
      console.error('Error deleting room:', error);
      toast({
        title: "Error", 
        description: "Failed to delete room",
        variant: "destructive"
      });
      return false;
    }
  };

  // Send chat message
  const sendChatMessage = async (userId: string, displayName: string, message: string) => {
    try {
      await addDoc(collection(db, 'chatMessages'), {
        userId,
        displayName,
        message,
        timestamp: Date.now(),
        type: 'user'
      });
    } catch (error) {
      console.error('Error sending chat message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
    }
  };

  // Shuffle deck and distribute cards for battle
  const distributeCards = (deck: string[]) => {
    const shuffledDeck = [...deck].sort(() => Math.random() - 0.5);
    const hand = shuffledDeck.slice(0, 5);
    const remainingDeck = shuffledDeck.slice(5);
    return { hand, remainingDeck };
  };

  // Get user data by ID
  const getUserById = async (userId: string) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        return { uid: userId, ...userDoc.data() };
      }
      return null;
    } catch (error) {
      console.error('Error getting user by ID:', error);
      return null;
    }
  };

  // AI Bot Logic - Enhanced with proper card handling
  const makeAIMove = async (battleId: string, aiPlayerId: string, battle: Battle) => {
    try {
      const aiPlayer = battle.players[aiPlayerId];
      if (!aiPlayer || aiPlayer.uid !== 'ai_opponent') return;

      console.log('AI making move for battle:', battleId);
      
      // Wait 2-3 seconds to simulate thinking
      await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 1000));

      // Initialize AI deck if empty
      if (aiPlayer.deck.length === 0 && aiPlayer.hand.length === 0) {
        const battleCards = cards.filter(card => card.type === 'battle' && card.isBase);
        if (battleCards.length > 0) {
          // Create AI deck with random base cards
          const aiDeck = [];
          for (let i = 0; i < 10; i++) {
            const randomCard = battleCards[Math.floor(Math.random() * battleCards.length)];
            aiDeck.push(randomCard.id);
          }
          
          const { hand, remainingDeck } = distributeCards(aiDeck);
          
          const battleRef = doc(db, 'battles', battleId);
          await updateDoc(battleRef, {
            [`players.${aiPlayerId}.deck`]: remainingDeck,
            [`players.${aiPlayerId}.hand`]: hand,
            lastActivity: Date.now()
          });
          
          console.log('AI deck initialized with', aiDeck.length, 'cards');
          return; // End turn after initializing deck
        }
      }

      // AI Strategy: Place battle cards if has energy and cards in hand
      if (aiPlayer.energy >= 20 && aiPlayer.hand.length > 0) {
        // Find empty position
        const positions: ('left' | 'center' | 'right')[] = ['left', 'center', 'right'];
        const emptyPositions = positions.filter(pos => !aiPlayer.battlefield[pos]);
        
        if (emptyPositions.length > 0) {
          // Pick random card from hand
          const randomCardId = aiPlayer.hand[Math.floor(Math.random() * aiPlayer.hand.length)];
          const randomCard = cards.find(c => c.id === randomCardId);
          
          if (randomCard && randomCard.type === 'battle') {
            const randomPosition = emptyPositions[Math.floor(Math.random() * emptyPositions.length)];
            
            console.log(`AI placing ${randomCard.name} at ${randomPosition}`);
            
            // Use the same function as players to place cards
            await placeBattleCardInBattle(battleId, aiPlayerId, randomCardId, randomPosition, randomCard);
            return;
          }
        }
      }

      // If can't place cards, draw a card if possible
      if (aiPlayer.hand.length < 5 && aiPlayer.deck.length > 0 && aiPlayer.energy >= 5) {
        await drawCardInBattle(battleId, aiPlayerId, aiPlayer.deck);
        console.log('AI drew a card');
        return;
      }

      // If nothing else to do, end turn
      const playerIds = Object.keys(battle.players);
      const currentIndex = playerIds.indexOf(aiPlayerId);
      const nextIndex = (currentIndex + 1) % playerIds.length;
      const nextPlayerId = playerIds[nextIndex];
      
      console.log('AI ending turn, next player:', nextPlayerId);
      await endPlayerTurnInBattle(battleId, aiPlayerId, nextPlayerId, battle.currentRound);
      
    } catch (error) {
      console.error('Error making AI move:', error);
    }
  };

  // Check if it's AI's turn and make move
  const checkAITurn = async (battle: Battle) => {
    if (!battle || battle.status === 'finished') return;
    
    const aiPlayer = Object.values(battle.players).find(p => p.uid === 'ai_opponent');
    if (!aiPlayer) return;
    
    console.log('Checking AI turn:', {
      currentTurn: battle.currentTurn,
      phase: battle.phase,
      aiReady: aiPlayer.isReady,
      status: battle.status
    });
    
    // If it's AI turn or AI is not ready in preparation phase
    if (battle.currentTurn === 'ai_opponent' || (battle.phase === 'preparation' && !aiPlayer.isReady)) {
      console.log('AI should make a move!');
      
      // Get battle document ID from the battles collection
      const battleSnapshot = await getDocs(query(collection(db, 'battles'), where('roomId', '==', battle.roomId)));
      if (!battleSnapshot.empty) {
        const battleDoc = battleSnapshot.docs[0];
        console.log('Found battle document, calling makeAIMove...');
        await makeAIMove(battleDoc.id, 'ai_opponent', battle);
      } else {
        console.error('Battle document not found for roomId:', battle.roomId);
      }
    } else {
      console.log('Not AI turn or AI already ready');
    }
  };

  // Battle action functions for server-side battle state
  const placeBattleCardInBattle = async (battleId: string, playerId: string, cardId: string, position: 'left' | 'center' | 'right', cardData: GameCard) => {
    try {
      const battleRef = doc(db, 'battles', battleId);
      await updateDoc(battleRef, {
        [`players.${playerId}.battlefield.${position}`]: cardData,
        [`players.${playerId}.energy`]: increment(-20),
        [`players.${playerId}.battleCardsPlayedThisRound`]: increment(1),
        [`players.${playerId}.hand`]: arrayRemove(cardId),
        lastActivity: Date.now()
      });
      return true;
    } catch (error) {
      console.error('Error placing battle card:', error);
      return false;
    }
  };

  const useMagicCardInBattle = async (battleId: string, playerId: string, cardId: string, energyCost: number) => {
    try {
      const battleRef = doc(db, 'battles', battleId);
      await updateDoc(battleRef, {
        [`players.${playerId}.energy`]: increment(-energyCost),
        [`players.${playerId}.hand`]: arrayRemove(cardId),
        [`players.${playerId}.deck`]: arrayUnion(cardId),
        lastActivity: Date.now()
      });
      return true;
    } catch (error) {
      console.error('Error using magic card:', error);
      return false;
    }
  };

  const drawCardInBattle = async (battleId: string, playerId: string, deckArray: string[]) => {
    try {
      if (deckArray.length === 0) return false;
      
      const topCard = deckArray[0];
      const newDeck = deckArray.slice(1);
      
      const battleRef = doc(db, 'battles', battleId);
      await updateDoc(battleRef, {
        [`players.${playerId}.hand`]: arrayUnion(topCard),
        [`players.${playerId}.deck`]: newDeck,
        [`players.${playerId}.energy`]: increment(-5),
        lastActivity: Date.now()
      });
      return true;
    } catch (error) {
      console.error('Error drawing card:', error);
      return false;
    }
  };

  const endPlayerTurnInBattle = async (battleId: string, currentPlayerId: string, nextPlayerId: string, currentRound: number) => {
    try {
      const battleRef = doc(db, 'battles', battleId);
      const battleDoc = await getDoc(battleRef);
      
      if (!battleDoc.exists()) return false;
      
      const battleData = battleDoc.data();
      const playerIds = Object.keys(battleData.players);
      const currentIndex = playerIds.indexOf(currentPlayerId);
      const isLastPlayerInRound = currentIndex === playerIds.length - 1;
      
      if (isLastPlayerInRound) {
        // Last player of the round - advance round and replenish energy
        await updateDoc(battleRef, {
          currentTurn: playerIds[0], // Back to first player
          [`players.${currentPlayerId}.battleCardsPlayedThisRound`]: 0,
          [`players.${nextPlayerId}.battleCardsPlayedThisRound`]: 0,
          currentRound: currentRound + 1,
          // Give energy to all players when round advances
          ...playerIds.reduce((acc, playerId) => {
            acc[`players.${playerId}.energy`] = increment(15);
            return acc;
          }, {} as any),
          lastActivity: Date.now()
        });
      } else {
        // Not last player - just switch turns, no energy or round change
        await updateDoc(battleRef, {
          currentTurn: nextPlayerId,
          [`players.${currentPlayerId}.battleCardsPlayedThisRound`]: 0,
          lastActivity: Date.now()
        });
      }
      return true;
    } catch (error) {
      console.error('Error ending player turn:', error);
      return false;
    }
  };

  const attackInBattle = async (battleId: string, attackerId: string, damage: number, targetType: 'player' | 'card', targetPlayerId?: string, targetPosition?: 'left' | 'center' | 'right') => {
    try {
      const battleRef = doc(db, 'battles', battleId);
      if (targetType === 'player' && targetPlayerId) {
        await updateDoc(battleRef, {
          [`players.${targetPlayerId}.hp`]: increment(-damage),
          lastActivity: Date.now()
        });
      } else if (targetType === 'card' && targetPlayerId && targetPosition) {
        // For card damage, we need to get current card health first
        // This is simplified - in a real implementation you'd need to handle this more carefully
        await updateDoc(battleRef, {
          [`players.${targetPlayerId}.battlefield.${targetPosition}.health`]: increment(-damage),
          lastActivity: Date.now()
        });
      }
      return true;
    } catch (error) {
      console.error('Error attacking in battle:', error);
      return false;
    }
  };

  // Mark player as ready in room
  const markPlayerReadyInRoom = async (roomId: string, playerId: string) => {
    try {
      const roomRef = doc(db, 'rooms', roomId);
      const room = rooms.find(r => r.id === roomId);
      if (!room) throw new Error('Room not found');
      
      const currentReady = room.playersReady || [];
      const isAlreadyReady = currentReady.includes(playerId);
      
      if (isAlreadyReady) {
        return; // Player already ready
      }
      
      const updatedReady = [...currentReady, playerId];
      
      await updateDoc(roomRef, {
        playersReady: updatedReady,
        lastActivity: Date.now()
      });
      
      // Check if all players are ready and start battle
      if (updatedReady.length >= room.players.length && room.players.length >= room.maxPlayers) {
        if (room.type === 'pvp') {
          // For PvP, create or update battle to active
          if (room.battleId) {
            const battleRef = doc(db, 'battles', room.battleId);
            await updateDoc(battleRef, {
              status: 'active',
              phase: 'battle'
            });
          }
          
          await updateDoc(roomRef, {
            status: 'active'
          });
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error marking player ready in room:', error);
      toast({
        title: "Error",
        description: "Failed to mark ready",
        variant: "destructive"
      });
      return false;
    }
  };

  return {
    cards,
    rooms,
    rankings,
    chatMessages,
    loading,
    createRoom,
    joinRoom,
    deleteRoom,
    markPlayerReady,
    createCard,
    updateCard,
    deleteCard,
    createBattle,
    updateBattle,
    updateUserDeck,
    createTestRooms,
    sendChatMessage,
    distributeCards,
    getUserById,
    markPlayerReadyInRoom,
    placeBattleCardInBattle,
    useMagicCardInBattle,
    drawCardInBattle,
    endPlayerTurnInBattle,
    attackInBattle,
    checkAITurn
  };
}
