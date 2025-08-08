import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { GameCard } from '@/components/GameCard';
import { GameCard as GameCardType } from '@/types/game';
import { useFirestore } from '@/hooks/useFirestore';
import { useAuth } from '@/hooks/useAuth';

export function AdminPanel() {
  const { user } = useAuth();
  const { cards, createCard, updateCard, deleteCard, rankings, rooms, deleteRoom } = useFirestore();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<GameCardType | null>(null);
  const [cleanupEmail, setCleanupEmail] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    type: 'battle' as 'battle' | 'ability',
    class: 'melee' as 'melee' | 'ranged' | 'mage',
    health: 0,
    attack: 0,
    defense: 0,
    criticalChance: 0,
    criticalDamage: 50,
    rangedResistance: 10,
    meleeResistance: 10,
    magicResistance: 10,
    cost: 0,
    spellType: 'other' as 'ranged' | 'melee' | 'magical' | 'combat' | 'other',
    imageUrl: '',
    description: '',
    battleDescription: '',
    passiveAbilities: [] as string[]
  });

  if (!user?.isAdmin) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-2xl font-bold text-red-400 mb-4">Access Denied</h2>
        <p className="text-gray-400">You don't have admin privileges.</p>
      </div>
    );
  }

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'battle',
      class: 'melee',
      health: 0,
      attack: 0,
      defense: 0,
      criticalChance: 0,
      criticalDamage: 50,
      rangedResistance: 10,
      meleeResistance: 10,
      magicResistance: 10,
      cost: 0,
      spellType: 'other',
      imageUrl: '',
      description: '',
      battleDescription: '',
      passiveAbilities: []
    });
    setEditingCard(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const cardData: Omit<GameCardType, 'id'> = {
      name: formData.name,
      type: formData.type,
      imageUrl: formData.imageUrl,
      isBase: false,
      ...(formData.type === 'battle' && {
        class: formData.class,
        health: formData.health,
        attack: formData.attack,
        defense: formData.defense,
        criticalChance: formData.criticalChance,
        criticalDamage: formData.criticalDamage,
        rangedResistance: formData.rangedResistance,
        meleeResistance: formData.meleeResistance,
        magicResistance: formData.magicResistance,
        passiveAbilities: formData.passiveAbilities,
        battleDescription: formData.battleDescription
      }),
      ...(formData.type === 'ability' && {
        cost: formData.cost,
        spellType: formData.spellType,
        description: formData.description
      })
    };

    if (editingCard) {
      await updateCard(editingCard.id, cardData);
    } else {
      await createCard(cardData);
    }

    resetForm();
    setIsCreateDialogOpen(false);
  };

  const handleEdit = (card: GameCardType) => {
    setEditingCard(card);
    setFormData({
      name: card.name,
      type: card.type,
      class: card.class || 'melee',
      health: card.health || 0,
      attack: card.attack || 0,
      defense: card.defense || 0,
      criticalChance: card.criticalChance || 0,
      criticalDamage: card.criticalDamage || 50,
      rangedResistance: card.rangedResistance || 10,
      meleeResistance: card.meleeResistance || 10,
      magicResistance: card.magicResistance || 10,
      cost: card.cost || 0,
      spellType: card.spellType || 'other',
      imageUrl: card.imageUrl,
      description: card.description || '',
      battleDescription: (card as any).battleDescription || '',
      passiveAbilities: card.passiveAbilities || []
    });
    setIsCreateDialogOpen(true);
  };

  const handleDelete = async (cardId: string) => {
    if (confirm('Are you sure you want to delete this card?')) {
      await deleteCard(cardId);
    }
  };

  const handleCleanupUserBattles = async () => {
    if (!cleanupEmail.trim()) return;
    
    // Find rooms where the user is participating
    const userRooms = rooms.filter(room => 
      room.hostName.includes(cleanupEmail) || 
      // We can't easily match by email in rooms, so we'll look for these specific test emails
      (cleanupEmail === 'andrey.yakovlev.200314@gmail.com' && (room.hostName.includes('Andrey') || room.hostName.includes('andrey'))) ||
      (cleanupEmail === 'petro228man@gmail.com' && (room.hostName.includes('Petro') || room.hostName.includes('petro')))
    );
    
    for (const room of userRooms) {
      await deleteRoom(room.id);
    }
    
    setCleanupEmail('');
    alert(`Cleaned up ${userRooms.length} rooms for ${cleanupEmail}`);
  };

  const handleCleanupAllFinishedBattles = async () => {
    const finishedRooms = rooms.filter(room => room.status === 'finished');
    
    for (const room of finishedRooms) {
      await deleteRoom(room.id);
    }
    
    alert(`Cleaned up ${finishedRooms.length} finished rooms`);
  };

  const customCards = cards.filter(card => !card.isBase);
  const baseCards = cards.filter(card => card.isBase);
  const totalPlayers = rankings.length;
  const totalBattles = rankings.reduce((sum, player) => sum + player.wins + player.losses, 0);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-yellow-400 mb-2">
          <i className="fas fa-shield-alt mr-2"></i>
          Admin Panel
        </h2>
        <p className="text-gray-400">Manage cards and monitor game statistics</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Card Management */}
        <Card className="bg-gray-800 border-blue-600 p-6">
          <h3 className="text-xl font-bold mb-4">Card Management</h3>
          
          <div className="space-y-4 mb-6">
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  onClick={resetForm}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3"
                >
                  <i className="fas fa-plus mr-2"></i>
                  Add New Card
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-gray-800 border-blue-600 max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="text-yellow-400">
                    {editingCard ? 'Edit Card' : 'Create New Card'}
                  </DialogTitle>
                </DialogHeader>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      placeholder="Card Name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      className="bg-gray-900 border-gray-600"
                    />
                    
                    <Select value={formData.type} onValueChange={(value: 'battle' | 'ability') => setFormData({ ...formData, type: value })}>
                      <SelectTrigger className="bg-gray-900 border-gray-600">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="battle">Battle Unit</SelectItem>
                        <SelectItem value="ability">Ability</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Input
                    placeholder="Image URL"
                    value={formData.imageUrl}
                    onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                    required
                    className="bg-gray-900 border-gray-600"
                  />

                  {formData.type === 'battle' && (
                    <>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label className="text-gray-300 text-sm mb-1 block">Class Type</Label>
                          <Select value={formData.class} onValueChange={(value: 'melee' | 'ranged' | 'mage') => setFormData({ ...formData, class: value })}>
                            <SelectTrigger className="bg-gray-900 border-gray-600">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="melee">Melee</SelectItem>
                              <SelectItem value="ranged">Ranged</SelectItem>
                              <SelectItem value="mage">Mage</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div>
                          <Label className="text-gray-300 text-sm mb-1 block">Health Points</Label>
                          <Input
                            type="number"
                            placeholder="Health"
                            value={formData.health}
                            onChange={(e) => setFormData({ ...formData, health: parseInt(e.target.value) || 0 })}
                            className="bg-gray-900 border-gray-600"
                          />
                        </div>
                        
                        <div>
                          <Label className="text-gray-300 text-sm mb-1 block">Attack Damage</Label>
                          <Input
                            type="number"
                            placeholder="Attack"
                            value={formData.attack}
                            onChange={(e) => setFormData({ ...formData, attack: parseInt(e.target.value) || 0 })}
                            className="bg-gray-900 border-gray-600"
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label className="text-gray-300 text-sm mb-1 block">Defense Value</Label>
                          <Input
                            type="number"
                            placeholder="Defense"
                            value={formData.defense}
                            onChange={(e) => setFormData({ ...formData, defense: parseInt(e.target.value) || 0 })}
                            className="bg-gray-900 border-gray-600"
                          />
                        </div>
                        
                        <div>
                          <Label className="text-gray-300 text-sm mb-1 block">Critical Hit Chance (%)</Label>
                          <Input
                            type="number"
                            placeholder="Crit Chance %"
                            value={formData.criticalChance}
                            onChange={(e) => setFormData({ ...formData, criticalChance: parseInt(e.target.value) || 0 })}
                            className="bg-gray-900 border-gray-600"
                          />
                        </div>
                        
                        <div>
                          <Label className="text-gray-300 text-sm mb-1 block">Critical Damage (%)</Label>
                          <Input
                            type="number"
                            placeholder="Crit Damage %"
                            value={formData.criticalDamage}
                            onChange={(e) => setFormData({ ...formData, criticalDamage: parseInt(e.target.value) || 50 })}
                            className="bg-gray-900 border-gray-600"
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label className="text-gray-300 text-sm mb-1 block">Ranged Resistance (%)</Label>
                          <Input
                            type="number"
                            placeholder="Ranged Resist %"
                            value={formData.rangedResistance}
                            onChange={(e) => setFormData({ ...formData, rangedResistance: parseInt(e.target.value) || 10 })}
                            className="bg-gray-900 border-gray-600"
                          />
                        </div>
                        
                        <div>
                          <Label className="text-gray-300 text-sm mb-1 block">Melee Resistance (%)</Label>
                          <Input
                            type="number"
                            placeholder="Melee Resist %"
                            value={formData.meleeResistance}
                            onChange={(e) => setFormData({ ...formData, meleeResistance: parseInt(e.target.value) || 10 })}
                            className="bg-gray-900 border-gray-600"
                          />
                        </div>
                        
                        <div>
                          <Label className="text-gray-300 text-sm mb-1 block">Magic Resistance (%)</Label>
                          <Input
                            type="number"
                            placeholder="Magic Resist %"
                            value={formData.magicResistance}
                            onChange={(e) => setFormData({ ...formData, magicResistance: parseInt(e.target.value) || 10 })}
                            className="bg-gray-900 border-gray-600"
                          />
                        </div>
                      </div>

                      <div>
                        <Label className="text-gray-300 text-sm mb-1 block">Battle Description</Label>
                        <Textarea
                          placeholder="Card description for battle (visible in tooltips and card collection)"
                          value={formData.battleDescription}
                          onChange={(e) => setFormData({ ...formData, battleDescription: e.target.value })}
                          className="bg-gray-900 border-gray-600"
                          rows={2}
                        />
                      </div>
                    </>
                  )}

                  {formData.type === 'ability' && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-gray-300 text-sm mb-1 block">Energy Cost</Label>
                          <Input
                            type="number"
                            placeholder="Energy Cost"
                            value={formData.cost}
                            onChange={(e) => setFormData({ ...formData, cost: parseInt(e.target.value) || 0 })}
                            className="bg-gray-900 border-gray-600"
                          />
                        </div>
                        
                        <div>
                          <Label className="text-gray-300 text-sm mb-1 block">Spell Type</Label>
                          <Select value={formData.spellType} onValueChange={(value: 'ranged' | 'melee' | 'magical' | 'combat' | 'other') => setFormData({ ...formData, spellType: value })}>
                            <SelectTrigger className="bg-gray-900 border-gray-600">
                              <SelectValue placeholder="Spell Type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="combat">Combat (Magic Damage)</SelectItem>
                              <SelectItem value="ranged">Ranged</SelectItem>
                              <SelectItem value="melee">Melee</SelectItem>
                              <SelectItem value="magical">Magical</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <div>
                        <Label className="text-gray-300 text-sm mb-1 block">Ability Description</Label>
                        <Textarea
                          placeholder="Ability Description"
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          required
                          className="bg-gray-900 border-gray-600"
                        />
                      </div>
                    </>
                  )}

                  <div className="flex justify-end space-x-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setIsCreateDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {editingCard ? 'Update' : 'Create'} Card
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-3 max-h-64 overflow-y-auto">
            {customCards.map((card) => (
              <div key={card.id} className="flex items-center justify-between p-3 bg-gray-900 rounded-lg border border-gray-700">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center">
                    <i className="fas fa-magic text-sm"></i>
                  </div>
                  <div>
                    <div className="font-semibold">{card.name}</div>
                    <div className="text-sm text-gray-400 capitalize">
                      {card.type} {card.class && `- ${card.class}`}
                    </div>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button
                    onClick={() => handleEdit(card)}
                    size="sm"
                    className="bg-yellow-600 hover:bg-yellow-700 text-black"
                  >
                    Edit
                  </Button>
                  <Button
                    onClick={() => handleDelete(card.id)}
                    size="sm"
                    variant="destructive"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <h3 className="text-lg font-bold mt-6 mb-4 text-purple-400">Base Cards (Edit Only)</h3>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {baseCards.map((card) => (
              <div key={card.id} className="flex items-center justify-between p-3 bg-gray-900 rounded-lg border border-purple-600">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gray-600 rounded-lg flex items-center justify-center">
                    <i className="fas fa-star text-purple-400 text-sm"></i>
                  </div>
                  <div>
                    <div className="font-semibold">{card.name}</div>
                    <div className="text-sm text-gray-400 capitalize">
                      {card.type} {card.class && `- ${card.class}`}
                    </div>
                    <span className="text-xs text-purple-400">Base Card</span>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button
                    onClick={() => handleEdit(card)}
                    size="sm"
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    Edit
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Game Statistics */}
        <Card className="bg-gray-800 border-blue-600 p-6">
          <h3 className="text-xl font-bold mb-4">Game Statistics</h3>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-900 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-yellow-400">{totalPlayers}</div>
              <div className="text-sm text-gray-400">Total Players</div>
            </div>
            <div className="bg-gray-900 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-400">0</div>
              <div className="text-sm text-gray-400">Active Battles</div>
            </div>
            <div className="bg-gray-900 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-red-400">{totalBattles}</div>
              <div className="text-sm text-gray-400">Total Battles</div>
            </div>
            <div className="bg-gray-900 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-purple-400">{cards.length}</div>
              <div className="text-sm text-gray-400">Total Cards</div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold">Top Players</h4>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {rankings.slice(0, 5).map((player, index) => (
                <div key={player.uid} className="text-sm p-2 bg-gray-900 rounded flex justify-between">
                  <span>
                    #{index + 1} <span className="text-yellow-400 font-semibold">{player.displayName}</span>
                  </span>
                  <span className="text-green-400">{player.wins} wins</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Battle Management */}
        <Card className="bg-gray-800 border-red-600 p-6">
          <h3 className="text-xl font-bold mb-4 text-red-400">Battle Management</h3>
          
          <div className="space-y-4">
            <div>
              <Label className="text-gray-300 text-sm mb-2 block">Cleanup User Battles</Label>
              <div className="flex space-x-2">
                <Input
                  placeholder="Enter email address"
                  value={cleanupEmail}
                  onChange={(e) => setCleanupEmail(e.target.value)}
                  className="bg-gray-900 border-gray-600"
                />
                <Button
                  onClick={handleCleanupUserBattles}
                  disabled={!cleanupEmail.trim()}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Cleanup
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-1">Remove all rooms/battles for a specific user</p>
            </div>
            
            <Button
              onClick={handleCleanupAllFinishedBattles}
              className="w-full bg-orange-600 hover:bg-orange-700"
            >
              <i className="fas fa-broom mr-2"></i>
              Cleanup All Finished Battles
            </Button>
            
            <div className="bg-gray-900 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Current Rooms</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {rooms.length === 0 ? (
                  <p className="text-gray-500 text-sm">No active rooms</p>
                ) : (
                  rooms.map((room) => (
                    <div key={room.id} className="flex items-center justify-between p-2 bg-gray-800 rounded text-sm">
                      <div>
                        <span className="font-semibold">{room.name}</span>
                        <span className={`ml-2 px-2 py-1 rounded text-xs ${
                          room.status === 'active' ? 'bg-green-600' : 
                          room.status === 'finished' ? 'bg-red-600' : 'bg-yellow-600'
                        }`}>
                          {room.status}
                        </span>
                      </div>
                      <div className="text-gray-400">
                        {room.hostName} ({room.type})
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
