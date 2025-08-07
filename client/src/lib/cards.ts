import { GameCard } from '@/types/game';

// Кэш для карт
let cardsCache: GameCard[] | null = null;

// Загрузить карты из локального файла один раз
export async function loadCards(): Promise<GameCard[]> {
  if (cardsCache) {
    return cardsCache;
  }

  try {
    const response = await fetch('/cards.json');
    if (!response.ok) {
      throw new Error('Failed to load cards');
    }
    
    cardsCache = await response.json();
    console.log('Loaded cards from local file:', cardsCache?.length);
    return cardsCache || [];
  } catch (error) {
    console.error('Error loading cards:', error);
    return [];
  }
}

// Получить карту по ID
export function getCardById(cardId: string): GameCard | null {
  if (!cardsCache) {
    console.warn('Cards not loaded yet. Call loadCards() first.');
    return null;
  }
  
  return cardsCache.find(card => card.id === cardId) || null;
}

// Получить несколько карт по массиву ID
export function getCardsByIds(cardIds: string[]): GameCard[] {
  if (!cardsCache) {
    console.warn('Cards not loaded yet. Call loadCards() first.');
    return [];
  }
  
  return cardIds.map(id => getCardById(id)).filter(Boolean) as GameCard[];
}

// Получить все карты (из кэша)
export function getAllCards(): GameCard[] {
  return cardsCache || [];
}

// Проверить загружены ли карты
export function areCardsLoaded(): boolean {
  return cardsCache !== null;
}