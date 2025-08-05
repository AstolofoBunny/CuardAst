import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { GameCard } from '@/types/game';
import { CardDetail } from './CardDetail';

interface CardsGridProps {
  cards: GameCard[];
}

export function CardsGrid({ cards }: CardsGridProps) {
  const [selectedCard, setSelectedCard] = useState<GameCard | null>(null);
  const [filter, setFilter] = useState<'all' | 'battle' | 'ability'>('all');
  const [classFilter, setClassFilter] = useState<'all' | 'melee' | 'ranged' | 'mage'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCards = cards.filter(card => {
    if (filter !== 'all' && card.type !== filter) return false;
    if (classFilter !== 'all' && card.class !== classFilter) return false;
    if (searchTerm && !card.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const getClassColor = (cardClass?: string) => {
    switch (cardClass) {
      case 'melee': return 'border-red-500';
      case 'ranged': return 'border-green-500';
      case 'mage': return 'border-blue-500';
      default: return 'border-gray-500';
    }
  };

  const getTypeIcon = (cardType: string) => {
    switch (cardType) {
      case 'battle': return 'fas fa-sword';
      case 'ability': return 'fas fa-magic';
      default: return 'fas fa-question';
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-yellow-400 mb-2">
          <i className="fas fa-cards-blank mr-2"></i>
          Card Collection
        </h2>
        <p className="text-gray-400">Browse all available cards with detailed statistics</p>
      </div>

      {/* Filters */}
      <div className="mb-6 space-y-4">
        <Input
          placeholder="Search cards..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md bg-gray-800 border-gray-600 text-white"
        />
        
        <div className="flex gap-4 flex-wrap">
          <div className="flex gap-2">
            <Button
              variant={filter === 'all' ? 'default' : 'secondary'}
              size="sm"
              onClick={() => setFilter('all')}
              className={filter === 'all' ? 'bg-red-600' : 'bg-gray-600'}
            >
              All Types
            </Button>
            <Button
              variant={filter === 'battle' ? 'default' : 'secondary'}
              size="sm"
              onClick={() => setFilter('battle')}
              className={filter === 'battle' ? 'bg-red-600' : 'bg-gray-600'}
            >
              <i className="fas fa-sword mr-1"></i>
              Battle
            </Button>
            <Button
              variant={filter === 'ability' ? 'default' : 'secondary'}
              size="sm"
              onClick={() => setFilter('ability')}
              className={filter === 'ability' ? 'bg-red-600' : 'bg-gray-600'}
            >
              <i className="fas fa-magic mr-1"></i>
              Ability
            </Button>
          </div>

          <div className="flex gap-2">
            <Button
              variant={classFilter === 'all' ? 'default' : 'secondary'}
              size="sm"
              onClick={() => setClassFilter('all')}
              className={classFilter === 'all' ? 'bg-blue-600' : 'bg-gray-600'}
            >
              All Classes
            </Button>
            <Button
              variant={classFilter === 'melee' ? 'default' : 'secondary'}
              size="sm"
              onClick={() => setClassFilter('melee')}
              className={classFilter === 'melee' ? 'bg-blue-600' : 'bg-gray-600'}
            >
              <i className="fas fa-fist-raised mr-1"></i>
              Melee
            </Button>
            <Button
              variant={classFilter === 'ranged' ? 'default' : 'secondary'}
              size="sm"
              onClick={() => setClassFilter('ranged')}
              className={classFilter === 'ranged' ? 'bg-blue-600' : 'bg-gray-600'}
            >
              <i className="fas fa-bow-arrow mr-1"></i>
              Ranged
            </Button>
            <Button
              variant={classFilter === 'mage' ? 'default' : 'secondary'}
              size="sm"
              onClick={() => setClassFilter('mage')}
              className={classFilter === 'mage' ? 'bg-blue-600' : 'bg-gray-600'}
            >
              <i className="fas fa-hat-wizard mr-1"></i>
              Mage
            </Button>
          </div>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {filteredCards.map((card) => (
          <Card
            key={card.id}
            className={`bg-gray-800 border-2 ${getClassColor(card.class)} p-4 hover:scale-105 transition-transform cursor-pointer hover:border-yellow-400`}
            onClick={() => setSelectedCard(card)}
          >
            <div className="aspect-[3/4] rounded-lg overflow-hidden mb-3">
              <img
                src={card.imageUrl}
                alt={card.name}
                className="w-full h-full object-cover"
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-white truncate">{card.name}</h3>
                <i className={`${getTypeIcon(card.type)} text-yellow-400 text-xs`}></i>
              </div>
              
              {card.type === 'battle' && (
                <div className="flex justify-between text-xs">
                  <span className="text-green-400">
                    <i className="fas fa-heart mr-1"></i>
                    {card.health}
                  </span>
                  <span className="text-red-400">
                    <i className="fas fa-sword mr-1"></i>
                    {card.attack}
                  </span>
                  <span className="text-blue-400">
                    <i className="fas fa-shield mr-1"></i>
                    {card.defense}
                  </span>
                </div>
              )}
              
              {card.type === 'ability' && (
                <div className="text-xs text-purple-400">
                  <i className="fas fa-bolt mr-1"></i>
                  {card.cost} Energy
                </div>
              )}
              
              {card.class && (
                <Badge 
                  className={`text-xs ${
                    card.class === 'melee' ? 'bg-red-600' :
                    card.class === 'ranged' ? 'bg-green-600' :
                    'bg-blue-600'
                  } text-white`}
                >
                  {card.class.charAt(0).toUpperCase() + card.class.slice(1)}
                </Badge>
              )}
            </div>
          </Card>
        ))}
      </div>

      {filteredCards.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-700 rounded-full mx-auto mb-4 flex items-center justify-center">
            <i className="fas fa-search text-gray-500 text-2xl"></i>
          </div>
          <h3 className="text-xl font-bold text-gray-400 mb-2">No Cards Found</h3>
          <p className="text-gray-500">Try adjusting your filters or search term</p>
        </div>
      )}

      {/* Card Detail Modal */}
      {selectedCard && (
        <CardDetail
          card={selectedCard}
          onClose={() => setSelectedCard(null)}
        />
      )}
    </div>
  );
}