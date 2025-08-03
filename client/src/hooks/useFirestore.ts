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
  setDoc,
  QuerySnapshot,
  DocumentData
} from 'firebase/firestore';
import { db, BASE_CARDS } from '@/lib/firebase';
import { GameCard, Room, Battle, RankingEntry } from '@/types/game';
import { useToast } from '@/hooks/use-toast';

export function useFirestore() {
  const [cards, setCards] = useState<GameCard[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
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
            wins: data.wins,
            losses: data.losses,
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

  const createRoom = async (roomData: Omit<Room, 'id' | 'createdAt'>) => {
    try {
      const docRef = await addDoc(collection(db, 'rooms'), {
        ...roomData,
        createdAt: Date.now()
      });
      toast({
        title: "Success",
        description: "Room created successfully!"
      });
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
      await updateDoc(roomRef, { 
        players: updatedPlayers,
        status: updatedPlayers.length >= room.maxPlayers ? 'active' : 'waiting'
      });
      
      toast({
        title: "Success",
        description: "Joined room successfully!"
      });
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

  return {
    cards,
    rooms,
    rankings,
    loading,
    createRoom,
    joinRoom,
    createCard,
    updateCard,
    deleteCard,
    createBattle,
    updateBattle,
    updateUserDeck,
    createTestRooms
  };
}
