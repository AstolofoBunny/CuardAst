export interface GameCard {
  id: string;
  name: string;
  type: 'battle' | 'ability';
  imageUrl: string;
  isBase?: boolean;
  
  // Battle Unit properties
  class?: 'melee' | 'ranged' | 'mage';
  health?: number;
  attack?: number; // Renamed from damage for clarity
  defense?: number;
  
  // Hidden stats for battle cards
  criticalChance?: number; // Percentage chance for critical hit
  criticalDamage?: number; // Percentage bonus damage on crit (default 50%)
  rangedResistance?: number; // Resistance to ranged attacks
  meleeResistance?: number; // Resistance to melee attacks
  magicResistance?: number; // Resistance to magic attacks
  
  // Passive abilities
  passiveAbilities?: string[]; // Array of passive ability IDs
  passiveSkill?: string; // Legacy field for backward compatibility
  
  // Ability properties
  cost?: number; // Energy cost for spells
  spellType?: 'ranged' | 'melee' | 'magical' | 'combat' | 'other'; // For damage spells
  description?: string;
  battleDescription?: string; // Battle-specific description with tooltips
}

export interface PassiveAbility {
  id: string;
  name: string;
  description: string;
  effect: string; // JSON string describing the effect
}

export const PASSIVE_ABILITIES: PassiveAbility[] = [
  {
    id: 'burning_blade',
    name: 'Burning Blade',
    description: '10% chance to deal +1 damage',
    effect: '{"type": "damage_bonus", "chance": 10, "bonus": 1}'
  },
  {
    id: 'wind_shot',
    name: 'Wind Shot',
    description: '+15% critical chance',
    effect: '{"type": "crit_chance", "bonus": 15}'
  },
  {
    id: 'frost_armor',
    name: 'Frost Armor',
    description: 'Reduce incoming damage by 1',
    effect: '{"type": "damage_reduction", "amount": 1}'
  },
  {
    id: 'stealth_strike',
    name: 'Stealth Strike',
    description: '+25% critical damage',
    effect: '{"type": "crit_damage", "bonus": 25}'
  },
  {
    id: 'crystal_shield',
    name: 'Crystal Shield',
    description: '+2 health regeneration per turn',
    effect: '{"type": "health_regen", "amount": 2}'
  },
  {
    id: 'berserker_rage',
    name: 'Berserker Rage',
    description: '+1 attack for each missing health point',
    effect: '{"type": "attack_per_missing_hp", "multiplier": 1}'
  },
  {
    id: 'magical_ward',
    name: 'Magical Ward',
    description: '+10% magic resistance',
    effect: '{"type": "magic_resistance", "bonus": 10}'
  },
  {
    id: 'armor_piercing',
    name: 'Armor Piercing',
    description: 'Ignore 50% of enemy defense',
    effect: '{"type": "defense_ignore", "percentage": 50}'
  }
];

export interface User {
  uid: string;
  email: string;
  displayName: string;
  isAdmin: boolean;
  wins: number;
  losses: number;
  hp: number;
  energy: number;
  deck: string[]; // Battle cards deck (10 cards)
  spellDeck: string[]; // Spell cards deck (3 cards)
  createdAt: number;
  profilePicture?: string;
}

export interface Room {
  id: string;
  name: string;
  type: 'pvp' | 'pve';
  hostId: string;
  hostName: string;
  players: string[];
  maxPlayers: number;
  status: 'waiting' | 'active' | 'finished';
  description?: string;
  battleId?: string;
  createdAt: number;
  playersReady?: string[]; // Track which players clicked ready
}

export interface Battle {
  id?: string;
  roomId: string;
  players: {
    [playerId: string]: {
      uid: string;
      displayName: string;
      hp: number;
      energy: number;
      deck: string[];
      hand: string[];
      spellDeck: string[]; // Available spell cards
      spellCooldowns: { [spellId: string]: number }; // Cooldown rounds remaining
      battlefield: {
        left: string | null; // Card ID
        center: string | null; // Card ID  
        right: string | null; // Card ID
      };
      battlefieldAttacks: {
        left: boolean;
        center: boolean;
        right: boolean;
      };
      selectedBattleCard?: string;
      selectedAbilities?: string[];
      isReady: boolean;
      battleCardsPlayedThisRound: number;
    };
  };
  currentTurn: string;
  phase: 'preparation' | 'battle' | 'finished';
  status: 'active' | 'waiting_for_ready' | 'finished';
  readyCount?: number;
  winner?: string;
  createdAt: number;
  currentRound: number;
  history?: BattleAction[];
  lastActivity: number;
  cardHealths?: { [cardId: string]: number }; // Track individual card health during battle
}

export interface BattleAction {
  round: number;
  playerId: string;
  action: 'battle-card' | 'ability' | 'ready';
  cardId?: string;
  damage?: number;
  timestamp: number;
}

export interface RankingEntry {
  uid: string;
  displayName: string;
  profilePicture?: string;
  wins: number;
  losses: number;
  winRate: number;
}

export interface ChatMessage {
  id: string;
  userId: string;
  displayName: string;
  message: string;
  timestamp: number;
  type: 'user' | 'system';
}

export interface PlayerState {
  uid: string;
  displayName: string;
  hp: number;
  energy: number;
  deck: string[];
  hand: string[];
  battlefield: string[]; // Array of card IDs
  isReady: boolean;
}

export interface BattleField {
  left: GameCard | null;
  center: GameCard | null;
  right: GameCard | null;
}

export type GamePhase = 'auth' | 'dashboard' | 'battle';

export interface GameState {
  user: User | null;
  currentRoom: Room | null;
  currentBattle: Battle | null;
  phase: GamePhase;
  allCards: GameCard[];
  rankings: RankingEntry[];
  rooms: Room[];
}
