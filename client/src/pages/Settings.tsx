import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { useFirestore } from '@/hooks/useFirestore';
import { Link } from 'wouter';

export default function Settings() {
  const { user, updateUserProfile, logout } = useAuth();
  const { createCard } = useFirestore();
  const [isEditing, setIsEditing] = useState(false);
  const [profileForm, setProfileForm] = useState({
    displayName: user?.displayName || '',
    email: user?.email || ''
  });

  const [cardForm, setCardForm] = useState({
    name: '',
    type: 'battle' as 'battle' | 'ability',
    cost: 1,
    attack: 1,
    defense: 1,
    description: '',
    rarity: 'common' as 'common' | 'rare' | 'epic' | 'legendary',
    classType: 'fire' as 'fire' | 'water' | 'earth' | 'air'
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-6">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-3xl font-bold text-yellow-400 mb-4">Access Denied</h1>
          <p className="text-gray-400 mb-4">You need to be logged in to access settings</p>
          <Link href="/">
            <Button className="bg-blue-600 hover:bg-blue-700">Return to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateUserProfile(profileForm);
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  const handleCreateCard = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const cardData = {
        ...cardForm,
        imageUrl: `https://dummyimage.com/300x400/${
          cardForm.classType === 'fire' ? 'ff4444' :
          cardForm.classType === 'water' ? '4444ff' :
          cardForm.classType === 'earth' ? '44aa44' : 'ffaa44'
        }/ffffff&text=${encodeURIComponent(cardForm.name)}`,
        isBase: false,
        createdBy: user.uid
      };
      
      await createCard(cardData);
      setCardForm({
        name: '',
        type: 'battle',
        cost: 1,
        attack: 1,
        defense: 1,
        description: '',
        rarity: 'common',
        classType: 'fire'
      });
    } catch (error) {
      console.error('Error creating card:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Navigation */}
      <nav className="bg-gray-800 border-b border-blue-600 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/">
            <Button variant="ghost" className="text-yellow-400 hover:text-yellow-300">
              <i className="fas fa-arrow-left mr-2"></i>
              Back to Dashboard
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-yellow-400">
            <i className="fas fa-cog mr-2"></i>
            Settings
          </h1>
          <Button onClick={logout} variant="destructive">
            <i className="fas fa-sign-out-alt mr-2"></i>
            Logout
          </Button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto p-6 space-y-8">
        {/* Profile Settings */}
        <Card className="bg-gray-800 border-blue-600 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-yellow-400">
              <i className="fas fa-user mr-2"></i>
              Profile Settings
            </h2>
            {!isEditing && (
              <Button onClick={() => setIsEditing(true)} className="bg-blue-600 hover:bg-blue-700">
                <i className="fas fa-edit mr-2"></i>
                Edit Profile
              </Button>
            )}
          </div>

          {isEditing ? (
            <form onSubmit={handleProfileUpdate} className="space-y-4">
              <div>
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  value={profileForm.displayName}
                  onChange={(e) => setProfileForm({ ...profileForm, displayName: e.target.value })}
                  className="bg-gray-900 border-gray-600 focus:border-yellow-400"
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={profileForm.email}
                  onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                  className="bg-gray-900 border-gray-600 focus:border-yellow-400"
                  disabled
                />
                <p className="text-sm text-gray-400 mt-1">Email cannot be changed</p>
              </div>
              <div className="flex space-x-2">
                <Button type="submit" className="bg-green-600 hover:bg-green-700">
                  <i className="fas fa-save mr-2"></i>
                  Save Changes
                </Button>
                <Button 
                  type="button" 
                  onClick={() => setIsEditing(false)}
                  variant="ghost"
                >
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div>
                <Label>Display Name</Label>
                <p className="text-lg">{user.displayName}</p>
              </div>
              <div>
                <Label>Email</Label>
                <p className="text-lg">{user.email}</p>
              </div>
              <div>
                <Label>Account Type</Label>
                <p className="text-lg">
                  {user.isAdmin ? (
                    <span className="text-purple-400">
                      <i className="fas fa-crown mr-1"></i>
                      Administrator
                    </span>
                  ) : (
                    <span className="text-blue-400">
                      <i className="fas fa-user mr-1"></i>
                      Player
                    </span>
                  )}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Wins</Label>
                  <p className="text-2xl font-bold text-green-400">{user.wins}</p>
                </div>
                <div>
                  <Label>Losses</Label>
                  <p className="text-2xl font-bold text-red-400">{user.losses}</p>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Admin Panel - Card Creation */}
        {user.isAdmin && (
          <Card className="bg-gray-800 border-purple-600 p-6">
            <h2 className="text-2xl font-bold text-purple-400 mb-6">
              <i className="fas fa-magic mr-2"></i>
              Create New Card
            </h2>
            
            <form onSubmit={handleCreateCard} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="cardName">Card Name</Label>
                  <Input
                    id="cardName"
                    value={cardForm.name}
                    onChange={(e) => setCardForm({ ...cardForm, name: e.target.value })}
                    required
                    className="bg-gray-900 border-gray-600 focus:border-purple-400"
                  />
                </div>
                <div>
                  <Label htmlFor="cardType">Card Type</Label>
                  <select
                    id="cardType"
                    value={cardForm.type}
                    onChange={(e) => setCardForm({ ...cardForm, type: e.target.value as 'battle' | 'ability' })}
                    className="w-full p-2 bg-gray-900 border border-gray-600 rounded focus:border-purple-400"
                  >
                    <option value="battle">Battle Unit</option>
                    <option value="ability">Ability</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="cost">Cost</Label>
                  <Input
                    id="cost"
                    type="number"
                    min="1"
                    max="10"
                    value={cardForm.cost}
                    onChange={(e) => setCardForm({ ...cardForm, cost: parseInt(e.target.value) })}
                    className="bg-gray-900 border-gray-600 focus:border-purple-400"
                  />
                </div>
                <div>
                  <Label htmlFor="attack">Attack</Label>
                  <Input
                    id="attack"
                    type="number"
                    min="1"
                    max="20"
                    value={cardForm.attack}
                    onChange={(e) => setCardForm({ ...cardForm, attack: parseInt(e.target.value) })}
                    className="bg-gray-900 border-gray-600 focus:border-purple-400"
                  />
                </div>
                <div>
                  <Label htmlFor="defense">Defense</Label>
                  <Input
                    id="defense"
                    type="number"
                    min="1"
                    max="20"
                    value={cardForm.defense}
                    onChange={(e) => setCardForm({ ...cardForm, defense: parseInt(e.target.value) })}
                    className="bg-gray-900 border-gray-600 focus:border-purple-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="rarity">Rarity</Label>
                  <select
                    id="rarity"
                    value={cardForm.rarity}
                    onChange={(e) => setCardForm({ ...cardForm, rarity: e.target.value as any })}
                    className="w-full p-2 bg-gray-900 border border-gray-600 rounded focus:border-purple-400"
                  >
                    <option value="common">Common</option>
                    <option value="rare">Rare</option>
                    <option value="epic">Epic</option>
                    <option value="legendary">Legendary</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="classType">Class Type</Label>
                  <select
                    id="classType"
                    value={cardForm.classType}
                    onChange={(e) => setCardForm({ ...cardForm, classType: e.target.value as any })}
                    className="w-full p-2 bg-gray-900 border border-gray-600 rounded focus:border-purple-400"
                  >
                    <option value="fire">Fire</option>
                    <option value="water">Water</option>
                    <option value="earth">Earth</option>
                    <option value="air">Air</option>
                  </select>
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={cardForm.description}
                  onChange={(e) => setCardForm({ ...cardForm, description: e.target.value })}
                  rows={3}
                  className="bg-gray-900 border-gray-600 focus:border-purple-400"
                />
              </div>

              <Button type="submit" className="bg-purple-600 hover:bg-purple-700">
                <i className="fas fa-plus mr-2"></i>
                Create Card
              </Button>
            </form>
          </Card>
        )}
      </div>
    </div>
  );
}