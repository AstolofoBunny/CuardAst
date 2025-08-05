import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { Link } from 'wouter';

export default function Settings() {
  const { user, updateUserProfile, logout } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [profileForm, setProfileForm] = useState({
    displayName: user?.displayName || '',
    email: user?.email || '',
    profilePicture: user?.profilePicture || ''
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // In a real app, you'd upload to a storage service
      // For now, we'll use a placeholder URL
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setProfileForm({
            ...profileForm,
            profilePicture: event.target.result as string
          });
        }
      };
      reader.readAsDataURL(file);
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
                <Label htmlFor="profilePicture">Profile Picture</Label>
                <div className="flex items-center space-x-4">
                  <div className="w-20 h-20 bg-purple-600 rounded-full flex items-center justify-center overflow-hidden">
                    {profileForm.profilePicture ? (
                      <img src={profileForm.profilePicture} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <i className="fas fa-user text-white text-xl"></i>
                    )}
                  </div>
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="profilePictureInput"
                    />
                    <Button
                      type="button"
                      onClick={() => document.getElementById('profilePictureInput')?.click()}
                      variant="outline"
                      className="border-gray-600"
                    >
                      <i className="fas fa-camera mr-2"></i>
                      Choose Image
                    </Button>
                  </div>
                </div>
              </div>

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

              <div className="flex space-x-4">
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
              <div className="flex items-center space-x-4 mb-6">
                <div className="w-20 h-20 bg-purple-600 rounded-full flex items-center justify-center overflow-hidden">
                  {user.profilePicture ? (
                    <img src={user.profilePicture} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <i className="fas fa-user text-white text-xl"></i>
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-bold">{user.displayName}</h3>
                  <p className="text-gray-400">{user.email}</p>
                </div>
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
            </div>
          )}
        </Card>

        {/* Game Statistics */}
        <Card className="bg-gray-800 border-blue-600 p-6">
          <h2 className="text-2xl font-bold text-yellow-400 mb-6">
            <i className="fas fa-chart-bar mr-2"></i>
            Game Statistics
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-900 p-4 rounded-lg text-center">
              <div className="text-3xl font-bold text-green-400">{user.wins}</div>
              <div className="text-sm text-gray-400">Total Wins</div>
            </div>
            <div className="bg-gray-900 p-4 rounded-lg text-center">
              <div className="text-3xl font-bold text-red-400">{user.losses}</div>
              <div className="text-sm text-gray-400">Total Losses</div>
            </div>
            <div className="bg-gray-900 p-4 rounded-lg text-center">
              <div className="text-3xl font-bold text-yellow-400">
                {user.wins + user.losses > 0 ? Math.round((user.wins / (user.wins + user.losses)) * 100) : 0}%
              </div>
              <div className="text-sm text-gray-400">Win Rate</div>
            </div>
            <div className="bg-gray-900 p-4 rounded-lg text-center">
              <div className="text-3xl font-bold text-purple-400">{user.deck?.length || 0}</div>
              <div className="text-sm text-gray-400">Cards in Deck</div>
            </div>
          </div>
        </Card>

        {/* Account Actions */}
        <Card className="bg-gray-800 border-red-600 p-6">
          <h2 className="text-2xl font-bold text-red-400 mb-6">
            <i className="fas fa-exclamation-triangle mr-2"></i>
            Account Actions
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-900 rounded border border-red-600">
              <div>
                <h3 className="font-bold text-red-400">Reset Game Progress</h3>
                <p className="text-gray-400 text-sm">This will reset your wins, losses, and deck to default values</p>
              </div>
              <Button variant="destructive" size="sm">
                <i className="fas fa-refresh mr-2"></i>
                Reset
              </Button>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-gray-900 rounded border border-red-600">
              <div>
                <h3 className="font-bold text-red-400">Delete Account</h3>
                <p className="text-gray-400 text-sm">Permanently delete your account and all associated data</p>
              </div>
              <Button variant="destructive" size="sm">
                <i className="fas fa-trash mr-2"></i>
                Delete
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}