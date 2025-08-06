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
  DocumentData
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
        lastActivity: Date.now() // Track for auto-deletion
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
              hp: 20,
              energy: 100,
              deck: [], // Will be populated from user's actual deck
              hand: [],
              battlefield: [],
              isReady: false
            },
            'ai_opponent': {
              uid: 'ai_opponent',
              displayName: 'AI Opponent',
              hp: 20,
              energy: 100,
              deck: [], // AI deck will be auto-generated
              hand: [],
              battlefield: [],
              isReady: true
            }
          },
          currentTurn: roomData.hostId,
          phase: 'preparation',
          status: 'active',
          createdAt: Date.now()
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

  const joinRoom = async (roomId: string, userId: string) => {
    try {
      const roomRef = doc(db, 'rooms', roomId);
      const room = rooms.find(r => r.id === roomId);
      if (!room) throw new Error('Room not found');

      const updatedPlayers = [...room.players, userId];
      const updatedRoom = {
        players: updatedPlayers,
        status: updatedPlayers.length >= room.maxPlayers ? 'active' : 'waiting',
        lastActivity: Date.now()
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
              hp: 20,
              energy: 100,
              deck: [], // Will be populated from user's actual deck
              hand: [],
              battlefield: [],
              isReady: false
            },
            [userId]: {
              uid: userId,
              displayName: 'Player 2', // Will be updated with actual name
              hp: 20,
              energy: 100,
              deck: [],
              hand: [],
              battlefield: [],
              isReady: false
            }
          },
          currentTurn: room.hostId,
          phase: 'preparation',
          status: 'waiting_for_ready', // Players need to click "Start Battle"
          readyCount: 0,
          createdAt: Date.now()
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
    distributeCards
  };
}
