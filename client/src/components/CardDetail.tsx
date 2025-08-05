import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { GameCard, PASSIVE_ABILITIES } from '@/types/game';

interface CardDetailProps {
  card: GameCard;
  onClose: () => void;
}

export function CardDetail({ card, onClose }: CardDetailProps) {
  const getPassiveAbilities = () => {
    if (!card.passiveAbilities) return [];
    return card.passiveAbilities.map(id => 
      PASSIVE_ABILITIES.find(ability => ability.id === id)
    ).filter(Boolean);
  };

  const getClassColor = (cardClass?: string) => {
    switch (cardClass) {
      case 'melee': return 'bg-red-600';
      case 'ranged': return 'bg-green-600';
      case 'mage': return 'bg-blue-600';
      default: return 'bg-gray-600';
    }
  };

  const getTypeColor = (cardType: string) => {
    switch (cardType) {
      case 'battle': return 'bg-yellow-600';
      case 'ability': return 'bg-purple-600';
      default: return 'bg-gray-600';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="bg-gray-800 border-blue-600 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-3xl font-bold text-yellow-400">{card.name}</h2>
              <div className="flex gap-2 mt-2">
                <Badge className={`${getTypeColor(card.type)} text-white`}>
                  {card.type.charAt(0).toUpperCase() + card.type.slice(1)}
                </Badge>
                {card.class && (
                  <Badge className={`${getClassColor(card.class)} text-white`}>
                    {card.class.charAt(0).toUpperCase() + card.class.slice(1)}
                  </Badge>
                )}
                {card.spellType && (
                  <Badge className="bg-indigo-600 text-white">
                    {card.spellType.charAt(0).toUpperCase() + card.spellType.slice(1)} Spell
                  </Badge>
                )}
              </div>
            </div>
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-white"
            >
              <i className="fas fa-times text-xl"></i>
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Card Image */}
            <div className="space-y-4">
              <div className="aspect-[3/4] rounded-lg overflow-hidden border-2 border-blue-600">
                <img
                  src={card.imageUrl}
                  alt={card.name}
                  className="w-full h-full object-cover"
                />
              </div>
              {card.description && (
                <div className="bg-gray-900 border border-gray-600 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-yellow-400 mb-2">Description</h4>
                  <p className="text-gray-300">{card.description}</p>
                </div>
              )}
            </div>

            {/* Card Stats */}
            <div className="space-y-6">
              {card.type === 'battle' && (
                <>
                  {/* Basic Stats */}
                  <div className="bg-gray-900 border border-gray-600 rounded-lg p-4">
                    <h4 className="text-lg font-semibold text-yellow-400 mb-3">Combat Stats</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-300">Health</span>
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-gray-700 rounded-full h-2">
                            <div 
                              className="bg-green-500 h-2 rounded-full" 
                              style={{ width: `${Math.min((card.health || 0) / 10 * 100, 100)}%` }}
                            ></div>
                          </div>
                          <span className="text-green-400 font-bold w-8">{card.health || 0}</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-300">Attack</span>
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-gray-700 rounded-full h-2">
                            <div 
                              className="bg-red-500 h-2 rounded-full" 
                              style={{ width: `${Math.min((card.attack || 0) / 10 * 100, 100)}%` }}
                            ></div>
                          </div>
                          <span className="text-red-400 font-bold w-8">{card.attack || 0}</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-300">Defense</span>
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-gray-700 rounded-full h-2">
                            <div 
                              className="bg-blue-500 h-2 rounded-full" 
                              style={{ width: `${Math.min((card.defense || 0) / 5 * 100, 100)}%` }}
                            ></div>
                          </div>
                          <span className="text-blue-400 font-bold w-8">{card.defense || 0}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Hidden Stats */}
                  <div className="bg-gray-900 border border-gray-600 rounded-lg p-4">
                    <h4 className="text-lg font-semibold text-yellow-400 mb-3">Hidden Stats</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-300">Critical Chance</span>
                        <span className="text-yellow-400">{card.criticalChance || 0}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Critical Damage</span>
                        <span className="text-yellow-400">{card.criticalDamage || 50}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Resistances */}
                  <div className="bg-gray-900 border border-gray-600 rounded-lg p-4">
                    <h4 className="text-lg font-semibold text-yellow-400 mb-3">Resistances</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-300">vs Ranged</span>
                        <span className="text-green-400">{card.rangedResistance || 0}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">vs Melee</span>
                        <span className="text-red-400">{card.meleeResistance || 0}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">vs Magic</span>
                        <span className="text-blue-400">{card.magicResistance || 0}%</span>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {card.type === 'ability' && (
                <div className="bg-gray-900 border border-gray-600 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-yellow-400 mb-3">Spell Info</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-300">Energy Cost</span>
                      <span className="text-purple-400">{card.cost || 0}</span>
                    </div>
                    {card.spellType && (
                      <div className="flex justify-between">
                        <span className="text-gray-300">Spell Type</span>
                        <span className="text-indigo-400 capitalize">{card.spellType}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Passive Abilities */}
              {getPassiveAbilities().length > 0 && (
                <div className="bg-gray-900 border border-gray-600 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-yellow-400 mb-3">Passive Abilities</h4>
                  <div className="space-y-3">
                    {getPassiveAbilities().map((ability) => (
                      <div key={ability!.id} className="border border-gray-700 rounded p-3">
                        <div className="font-semibold text-green-400">{ability!.name}</div>
                        <div className="text-sm text-gray-300 mt-1">{ability!.description}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}