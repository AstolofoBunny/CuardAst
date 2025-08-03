export interface GameCard {
  id: string;
  name: string;
  type: 'battle' | 'ability';
  imageUrl: string;
  isBase?: boolean;
  
  // Battle Unit properties
  class?: 'melee' | 'ranged' | 'mage';
  health?: number;
  damage?: number;
  passiveSkill?: string;
  
  // Ability properties
  cost?: number;
  description?: string;
}

export interface User {
  uid: string;
  email: string;
  displayName: string;
  isAdmin: boolean;
  wins: number;
  losses: number;
  hp: number;
  energy: number;
  deck: string[];
  createdAt: number;
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
  createdAt: number;
}

export interface Battle {
  id: string;
  roomId: string;
  players: {
    [playerId: string]: {
      name: string;
      hp: number;
      energy: number;
      selectedBattleCard?: string;
      selectedAbilities: string[];
      isReady: boolean;
      deck: string[];
    };
  };
  round: number;
  currentTurn?: string;
  status: 'active' | 'finished';
  winner?: string;
  createdAt: number;
  history: BattleAction[];
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
  wins: number;
  losses: number;
  winRate: number;
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
