import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  where,
  serverTimestamp,
  Timestamp,
  DocumentData,
  DocumentSnapshot,
  QuerySnapshot
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Battle, BattleLog, SpellDeck } from '@/types/game';
import { useToast } from '@/hooks/use-toast';

export function useBattleSystem(roomId: string) {
  const [battle, setBattle] = useState<Battle | null>(null);
  const [battleLogs, setBattleLogs] = useState<BattleLog[]>([]);
  const [spellDecks, setSpellDecks] = useState<{ [playerId: string]: SpellDeck }>({});
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Listen to battle room document
  useEffect(() => {
    if (!roomId) return;

    const unsubscribe = onSnapshot(
      doc(db, 'rooms', roomId),
      (doc: DocumentSnapshot<DocumentData>) => {
        if (doc.exists()) {
          const battleData = doc.data() as Battle;
          setBattle(battleData);
          setLoading(false);
        }
      },
      (error) => {
        console.error('Battle subscription error:', error);
        toast({
          title: "Connection Error",
          description: "Lost connection to battle. Reconnecting...",
          variant: "destructive"
        });
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [roomId, toast]);

  // Listen to battle logs subcollection
  useEffect(() => {
    if (!roomId) return;

    const unsubscribe = onSnapshot(
      query(
        collection(db, 'rooms', roomId, 'logs'),
        orderBy('timestamp', 'asc')
      ),
      (snapshot: QuerySnapshot<DocumentData>) => {
        const logsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toMillis ? doc.data().timestamp.toMillis() : doc.data().timestamp
        })) as BattleLog[];
        setBattleLogs(logsData);
      },
      (error) => {
        console.error('Battle logs subscription error:', error);
      }
    );

    return () => unsubscribe();
  }, [roomId]);

  // Listen to spell decks subcollection
  useEffect(() => {
    if (!roomId) return;

    const unsubscribe = onSnapshot(
      collection(db, 'rooms', roomId, 'decks'),
      (snapshot: QuerySnapshot<DocumentData>) => {
        const decksData: { [playerId: string]: SpellDeck } = {};
        snapshot.docs.forEach(doc => {
          const deckData = { id: doc.id, ...doc.data() } as SpellDeck;
          decksData[deckData.playerId] = deckData;
        });
        setSpellDecks(decksData);
      },
      (error) => {
        console.error('Spell decks subscription error:', error);
      }
    );

    return () => unsubscribe();
  }, [roomId]);

  // Initialize spell decks for players when battle starts
  const initializeSpellDecks = useCallback(async (players: { [key: string]: any }) => {
    if (!roomId) return;

    for (const playerId of Object.keys(players)) {
      const playerData = players[playerId];
      const spellDeckData: Omit<SpellDeck, 'id'> = {
        battleId: roomId,
        playerId: playerId,
        cards: playerData.spellDeck || [],
        spellCooldowns: {}
      };

      try {
        await addDoc(collection(db, 'rooms', roomId, 'decks'), spellDeckData);
      } catch (error) {
        console.error('Error initializing spell deck for player:', playerId, error);
      }
    }
  }, [roomId]);

  // Log battle action
  const logBattleAction = useCallback(async (
    playerId: string,
    action: BattleLog['action'],
    details: BattleLog['details'],
    description: string
  ) => {
    if (!roomId) return;

    const logEntry: Omit<BattleLog, 'id'> = {
      battleId: roomId,
      timestamp: Date.now(),
      playerId,
      action,
      details,
      description
    };

    try {
      await addDoc(collection(db, 'rooms', roomId, 'logs'), {
        ...logEntry,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error('Error logging battle action:', error);
    }
  }, [roomId]);

  // Update battle state
  const updateBattleState = useCallback(async (updates: Partial<Battle>) => {
    if (!roomId) return;

    try {
      await updateDoc(doc(db, 'rooms', roomId), {
        ...updates,
        lastActivity: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating battle state:', error);
      throw error;
    }
  }, [roomId]);

  // Deal damage with proper logging
  const dealDamage = useCallback(async (
    attackerId: string,
    targetId: string,
    damage: number,
    isCritical: boolean = false,
    cardUsed?: string,
    cardDestroyed: boolean = false
  ) => {
    if (!battle || !roomId) return;

    // Update player HP
    const currentHp = battle.players[targetId]?.hp || 0;
    const newHp = Math.max(0, currentHp - damage);
    
    const updates: Partial<Battle> = {
      players: {
        ...battle.players,
        [targetId]: {
          ...battle.players[targetId],
          hp: newHp
        }
      },
      phase: 'damage' as const
    };

    // Log the damage event
    await logBattleAction(
      attackerId,
      'damage_dealt',
      {
        target: targetId,
        damage,
        isCritical,
        cardUsed,
        cardDestroyed,
        newHp
      },
      `${battle.players[attackerId]?.displayName} deals ${damage}${isCritical ? ' CRITICAL' : ''} damage to ${battle.players[targetId]?.displayName}${cardUsed ? ` using ${cardUsed}` : ''}${cardDestroyed ? ' (card destroyed)' : ''}`
    );

    // Update battle state
    await updateBattleState(updates);

    // Check for battle end
    if (newHp <= 0) {
      const winner = Object.keys(battle.players).find(id => id !== targetId);
      setTimeout(async () => {
        await updateBattleState({
          status: 'finished',
          phase: 'finished',
          winner
        });
      }, 1500); // Small delay to show damage phase
    } else {
      // Return to battle phase after damage display
      setTimeout(async () => {
        await updateBattleState({ phase: 'battle' });
      }, 2000);
    }
  }, [battle, roomId, logBattleAction, updateBattleState]);

  // Attack function with damage calculation and logging
  const performAttack = useCallback(async (
    attackerId: string,
    attackerCardId: string,
    targetPosition: string,
    targetPlayerId?: string
  ) => {
    if (!battle || !roomId) return;

    // Simple damage calculation for client-side battle system
    
    const isDirectAttack = targetPosition === 'player';
    const targetCardId = isDirectAttack ? undefined : battle.players[targetPlayerId || '']?.battlefield[targetPosition as keyof typeof battle.players[string]['battlefield']];

    // Calculate damage using simple client-side logic
    const attackerCard = Object.values(battle.players).find(p => 
      Object.values(p.battlefield || {}).some(card => card?.id === attackerCardId)
    );
    
    if (!attackerCard) {
      toast({
        title: "Attack Failed",
        description: "Attacker card not found",
        variant: "destructive"
      });
      return;
    }
    
    const baseDamage = 10; // Default damage for simplified calculation
    const result = {
      damageDealt: baseDamage,
      isCritical: false,
      cardDestroyed: false,
      attackResult: `Attack dealt ${baseDamage} damage`
    };

    // Log the attack attempt
    await logBattleAction(
      attackerId,
      'attack',
      {
        cardUsed: attackerCardId,
        target: isDirectAttack ? 'player' : targetPosition,
        damage: result.damageDealt,
        isCritical: result.isCritical,
        cardDestroyed: result.cardDestroyed
      },
      result.attackResult || `Attack with ${attackerCardId}`
    );

    // Deal damage
    if (result.damageDealt && result.damageDealt > 0) {
      const targetId = isDirectAttack ? (targetPlayerId || Object.keys(battle.players).find(id => id !== attackerId) || '') : targetPlayerId || '';
      await dealDamage(
        attackerId,
        targetId,
        result.damageDealt,
        result.isCritical || false,
        attackerCardId,
        result.cardDestroyed || false
      );
    }
  }, [battle, roomId, logBattleAction, dealDamage, toast]);

  // Cast spell function
  const castSpell = useCallback(async (
    playerId: string,
    spellCardId: string,
    targetId?: string
  ) => {
    if (!battle || !roomId) return;

    const playerSpellDeck = spellDecks[playerId];
    if (!playerSpellDeck || !playerSpellDeck.cards.includes(spellCardId)) {
      toast({
        title: "Spell Error",
        description: "Spell not available in your deck",
        variant: "destructive"
      });
      return;
    }

    // Check cooldown
    const cooldown = playerSpellDeck.spellCooldowns[spellCardId] || 0;
    if (cooldown > 0) {
      toast({
        title: "Spell on Cooldown",
        description: `Spell will be available in ${cooldown} rounds`,
        variant: "destructive"
      });
      return;
    }

    // Log spell cast
    await logBattleAction(
      playerId,
      'cast_spell',
      {
        cardUsed: spellCardId,
        target: targetId,
        energyCost: 0 // TODO: Get from card data
      },
      `${battle.players[playerId]?.displayName} casts ${spellCardId}${targetId ? ` on ${battle.players[targetId]?.displayName}` : ''}`
    );

    // Update spell cooldown
    try {
      await updateDoc(doc(db, 'rooms', roomId, 'decks', playerSpellDeck.id!), {
        [`spellCooldowns.${spellCardId}`]: 3 // TODO: Get cooldown from card data
      });
    } catch (error) {
      console.error('Error updating spell cooldown:', error);
    }
  }, [battle, roomId, spellDecks, logBattleAction, toast]);

  return {
    battle,
    battleLogs,
    spellDecks,
    loading,
    initializeSpellDecks,
    logBattleAction,
    updateBattleState,
    dealDamage,
    performAttack,
    castSpell
  };
}