import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';
import { useFirestore } from '@/hooks/useFirestore';
import { DeckBuilder } from '@/components/DeckBuilder';
import { BattleInterface } from '@/components/BattleInterface';
import { AdminPanel } from '@/components/AdminPanel';
import { AuthModal } from '@/components/AuthModal';
import { CardsGrid } from '@/components/CardsGrid';
import { Room } from '@/types/game';
import { Link, useLocation } from 'wouter';

interface DashboardProps {
  user: any;
  activeTab?: string;
}

export default function Dashboard({ user, activeTab: initialTab = 'ranking' }: DashboardProps) {
  const { logout } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [location, navigate] = useLocation();

  // Update active tab based on URL
  useEffect(() => {
    const path = location.split('/')[1] || 'ranking';
    setActiveTab(path);
  }, [location]);

  // Handle tab changes with navigation
  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    navigate(`/${newTab === 'ranking' ? '' : newTab}`);
  };
  const { rooms, rankings, cards, createRoom, joinRoom, markPlayerReady, createTestRooms } = useFirestore();
  const [currentBattleId, setCurrentBattleId] = useState<string | null>(null);
  const [waitingForBattle, setWaitingForBattle] = useState(false);
  const [roomForm, setRoomForm] = useState({
    name: '',
    type: 'pvp' as 'pvp' | 'pve',
    description: ''
  });

  // Display user for guests
  const displayUser = user || {
    uid: 'guest',
    email: 'guest@battlecard.local',
    displayName: 'Guest',
    isAdmin: false,
    wins: 0,
    losses: 0,
    hp: 20,
    energy: 100,
    deck: [],
    createdAt: Date.now()
  };

  const isGuest = !user;

  if (currentBattleId) {
    return (
      <BattleInterface
        battleId={currentBattleId}
        onLeaveBattle={() => setCurrentBattleId(null)}
      />
    );
  }

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !roomForm.name) return;

    const roomData: Omit<Room, 'id' | 'createdAt'> = {
      name: roomForm.name,
      type: roomForm.type,
      hostId: user.uid,
      hostName: user.displayName || 'Anonymous',
      players: [user.uid],
      maxPlayers: roomForm.type === 'pvp' ? 2 : 1,
      status: 'waiting',
      description: roomForm.description
    };

    try {
      const roomId = await createRoom(roomData);
      if (roomId) {
        setRoomForm({ name: '', type: 'pvp', description: '' });
        
        if (roomForm.type === 'pve') {
          // For PvE rooms, go directly to battle tab and start battle
          handleTabChange('battle');
          setCurrentBattleId(roomId);
        } else {
          // For PvP rooms, go to battle tab and wait for opponent
          handleTabChange('battle');
          setWaitingForBattle(true);
        }
      }
    } catch (error) {
      console.error('Error creating room:', error);
      alert('Failed to create room. Please try again.');
    }
  };

  const handleJoinRoom = async (roomId: string) => {
    if (isGuest) {
      setShowAuthModal(true);
      return;
    }
    const success = await joinRoom(roomId, user!.uid);
    if (success) {
      // Navigate to battle tab to join the battle
      handleTabChange('battle');
      setWaitingForBattle(true);
    }
  };

  const userHPPercent = (displayUser.hp / 20) * 100;
  const userEnergyPercent = (displayUser.energy / 100) * 100;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Navigation */}
      <nav className="bg-gray-800 border-b border-blue-600 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-yellow-400">
              <i className="fas fa-sword mr-2"></i>
              Battle Arena
            </h1>
          </div>
          
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <Link href="/settings">
                  <div className="flex items-center space-x-3 cursor-pointer hover:bg-gray-700 rounded-lg p-2 transition-colors">
                    <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center">
                      <i className="fas fa-user"></i>
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold">{displayUser.displayName}</span>
                      </div>
                      <div className="flex items-center space-x-4 text-xs">
                        <span className="text-yellow-400">Wins: {displayUser.wins}</span>
                        <span className="text-red-400">Losses: {displayUser.losses}</span>
                      </div>
                    </div>
                  </div>
                </Link>
                <Button
                  onClick={logout}
                  variant="destructive"
                  size="sm"
                >
                  <i className="fas fa-sign-out-alt mr-1"></i>
                  Logout
                </Button>
              </>
            ) : (
              <Button
                onClick={() => setShowAuthModal(true)}
                className="bg-green-600 hover:bg-green-700"
                size="sm"
              >
                <i className="fas fa-sign-in-alt mr-1"></i>
                Login
              </Button>
            )}
          </div>
        </div>
      </nav>

      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-gray-800 border-r border-blue-600 min-h-screen">
          <Tabs defaultValue="ranking" className="w-full" orientation="vertical" value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="flex flex-col h-auto bg-transparent p-4 space-y-2">
              <TabsTrigger
                value="ranking"
                className="w-full justify-start px-4 py-3 data-[state=active]:bg-red-600 data-[state=active]:text-white text-gray-300 hover:text-white"
              >
                <i className="fas fa-trophy mr-3"></i>
                Ranking
              </TabsTrigger>
              <TabsTrigger
                value="battle"
                className="w-full justify-start px-4 py-3 data-[state=active]:bg-red-600 data-[state=active]:text-white text-gray-300 hover:text-white"
              >
                <i className="fas fa-sword mr-3"></i>
                Battle
              </TabsTrigger>
              <TabsTrigger
                value="rooms"
                className="w-full justify-start px-4 py-3 data-[state=active]:bg-red-600 data-[state=active]:text-white text-gray-300 hover:text-white"
              >
                <i className="fas fa-users mr-3"></i>
                Battle Rooms
              </TabsTrigger>
              <TabsTrigger
                value="cards"
                className="w-full justify-start px-4 py-3 data-[state=active]:bg-red-600 data-[state=active]:text-white text-gray-300 hover:text-white"
              >
                <i className="fas fa-th-large mr-3"></i>
                Cards
              </TabsTrigger>
              <TabsTrigger
                value="deck"
                disabled={isGuest}
                className={`w-full justify-start px-4 py-3 data-[state=active]:bg-red-600 data-[state=active]:text-white text-gray-300 hover:text-white ${isGuest ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <i className="fas fa-layer-group mr-3"></i>
                My Deck {isGuest && '(Login Required)'}
              </TabsTrigger>
              <TabsTrigger
                value="create-room"
                disabled={isGuest}
                className={`w-full justify-start px-4 py-3 data-[state=active]:bg-red-600 data-[state=active]:text-white text-gray-300 hover:text-white ${isGuest ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <i className="fas fa-plus mr-3"></i>
                Create Room {isGuest && '(Login Required)'}
              </TabsTrigger>
              {user && user.isAdmin && (
                <TabsTrigger
                  value="admin"
                  className="w-full justify-start px-4 py-3 data-[state=active]:bg-purple-600 data-[state=active]:text-white text-gray-300 hover:text-white"
                >
                  <i className="fas fa-cog mr-3"></i>
                  Admin Panel
                </TabsTrigger>
              )}
            </TabsList>
          </Tabs>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 bg-gray-900">
          <div className="w-full">
            {/* Render content based on active tab */}
            {activeTab === 'battle' && (
              <div>
                <div className="p-6">
                  <div className="mb-6">
                    <h2 className="text-3xl font-bold text-yellow-400 mb-2">
                      <i className="fas fa-sword mr-2"></i>
                      Battle Arena
                    </h2>
                    <p className="text-gray-400">Engage in epic battles</p>
                  </div>

                  {currentBattleId ? (
                    <BattleInterface
                      battleId={currentBattleId}
                      onLeaveBattle={() => {
                        setCurrentBattleId(null);
                        setWaitingForBattle(false);
                        handleTabChange('ranking');
                      }}
                    />
                  ) : waitingForBattle ? (
                    <Card className="bg-gray-800 border-blue-600 p-8 text-center">
                      <div className="mb-6">
                        <div className="animate-pulse rounded-full h-20 w-20 bg-yellow-400 mx-auto mb-4 flex items-center justify-center">
                          <i className="fas fa-hourglass-half text-gray-900 text-2xl"></i>
                        </div>
                        <h3 className="text-2xl font-bold text-yellow-400 mb-2">Waiting for Opponent</h3>
                        <p className="text-gray-400">Looking for another player to join the battle...</p>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="flex justify-center space-x-4">
                          <Button
                            onClick={() => setWaitingForBattle(false)}
                            variant="outline"
                            className="border-gray-600 text-gray-300 hover:bg-gray-700"
                          >
                            <i className="fas fa-arrow-left mr-2"></i>
                            Cancel
                          </Button>
                          <Button
                            onClick={() => {
                              // Start battle function would go here
                              // For now, simulate starting battle
                              setWaitingForBattle(false);
                              setCurrentBattleId('demo-battle-' + Date.now());
                            }}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            <i className="fas fa-play mr-2"></i>
                            Start Battle
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ) : (
                    <Card className="bg-gray-800 border-blue-600 p-8 text-center">
                      <div className="mb-6">
                        <div className="w-20 h-20 bg-gray-700 rounded-full mx-auto mb-4 flex items-center justify-center">
                          <i className="fas fa-peace text-gray-500 text-3xl"></i>
                        </div>
                        <h3 className="text-xl font-bold text-gray-400 mb-2">No Active Battle</h3>
                        <p className="text-gray-500">Create or join a room to start battling!</p>
                      </div>
                      
                      <div className="flex justify-center space-x-4">
                        <Button
                          onClick={() => handleTabChange('create-room')}
                          disabled={isGuest}
                          className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600"
                        >
                          <i className="fas fa-plus mr-2"></i>
                          Create Room
                        </Button>
                        <Button
                          onClick={() => handleTabChange('rooms')}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <i className="fas fa-search mr-2"></i>
                          Find Battle
                        </Button>
                      </div>
                    </Card>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'ranking' && (
              <div>
                <div className="p-6">
                  <div className="mb-6">
                    <h2 className="text-3xl font-bold text-yellow-400 mb-2">
                      <i className="fas fa-crown mr-2"></i>
                      Leaderboard
                    </h2>
                    <p className="text-gray-400">Top warriors in the battle arena</p>
                  </div>

                  <Card className="bg-gray-800 border-blue-600 overflow-hidden">
                    <div className="bg-blue-600 px-6 py-4">
                      <div className="grid grid-cols-4 gap-4 text-sm font-semibold">
                        <span>Rank</span>
                        <span>Player</span>
                        <span>Wins</span>
                        <span>Win Rate</span>
                      </div>
                    </div>
                    
                    <div className="divide-y divide-gray-700">
                      {rankings.map((player, index) => (
                        <div key={player.uid} className="px-6 py-4 hover:bg-blue-600 hover:bg-opacity-20 transition-colors">
                          <div className="grid grid-cols-4 gap-4 items-center">
                            <div className="flex items-center space-x-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-black ${
                                index === 0 ? 'bg-yellow-400' : 
                                index === 1 ? 'bg-gray-400' : 
                                index === 2 ? 'bg-yellow-600' : 'bg-gray-600'
                              }`}>
                                {index + 1}
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                                <i className="fas fa-user text-sm"></i>
                              </div>
                              <span className="font-semibold">{player.displayName}</span>
                            </div>
                            <span className="text-green-400 font-bold">{player.wins}</span>
                            <span className="text-yellow-400">{player.winRate}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>
              </div>
            )}

            {/* Rooms Tab */}
            {activeTab === 'rooms' && (
              <div>
                <div className="p-6">
                  <div className="mb-6 flex justify-between items-center">
                    <div>
                      <h2 className="text-3xl font-bold text-yellow-400 mb-2">
                        <i className="fas fa-users mr-2"></i>
                        Battle Rooms
                      </h2>
                      <p className="text-gray-400">Join active battles or spectate ongoing matches</p>
                    </div>
                    {user && user.isAdmin && (
                      <Button
                        onClick={createTestRooms}
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        <i className="fas fa-plus mr-2"></i>
                        Create Test Rooms
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {rooms.map((room) => (
                      <Card key={room.id} className="bg-gray-800 border-blue-600 p-6 hover:border-yellow-400 transition-colors">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-xl font-bold">{room.name}</h3>
                          <div className="flex items-center space-x-2">
                            <div className={`w-3 h-3 rounded-full ${
                              room.status === 'waiting' ? 'bg-green-400 animate-pulse' :
                              room.status === 'active' ? 'bg-yellow-400' : 'bg-red-400'
                            }`}></div>
                            <span className={`text-sm capitalize ${
                              room.status === 'waiting' ? 'text-green-400' :
                              room.status === 'active' ? 'text-yellow-400' : 'text-red-400'
                            }`}>
                              {room.status}
                            </span>
                          </div>
                        </div>
                        
                        <div className="space-y-3 mb-4">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400">Room Type:</span>
                            <span className={`font-semibold uppercase ${
                              room.type === 'pvp' ? 'text-yellow-400' : 'text-purple-400'
                            }`}>
                              {room.type}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400">Players:</span>
                            <span className="text-white">{room.players.length}/{room.maxPlayers}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400">Host:</span>
                            <span className="text-white">{room.hostName}</span>
                          </div>
                          {room.description && (
                            <div className="text-sm text-gray-300 mt-2 p-2 bg-gray-900 rounded">
                              {room.description}
                            </div>
                          )}
                        </div>
                        
                        <Button
                          onClick={() => handleJoinRoom(room.id)}
                          disabled={isGuest || room.status !== 'waiting' || (user ? room.players.includes(user.uid) : false)}
                          className={`w-full font-bold py-3 transition-colors ${
                            !isGuest && room.status === 'waiting' && (!user || !room.players.includes(user.uid))
                              ? 'bg-red-600 hover:bg-red-700 text-white'
                              : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                          }`}
                        >
                          {isGuest ? (
                            <>
                              <i className="fas fa-lock mr-2"></i>
                              Login Required
                            </>
                          ) : user && room.players.includes(user.uid) ? (
                            <>
                              <i className="fas fa-check mr-2"></i>
                              Joined
                            </>
                          ) : room.status === 'waiting' ? (
                            <>
                              <i className="fas fa-sword mr-2"></i>
                              Join Battle
                            </>
                          ) : (
                            <>
                              <i className="fas fa-eye mr-2"></i>
                              Spectate
                            </>
                          )}
                        </Button>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Cards Tab */}
            {activeTab === 'cards' && (
              <CardsGrid cards={cards} />
            )}

            {/* Deck Tab */}
            {activeTab === 'deck' && (
              <div>
                {isGuest ? (
                  <div className="p-6 text-center">
                    <div className="bg-gray-800 border border-blue-600 rounded-lg p-8">
                      <i className="fas fa-lock text-4xl text-gray-400 mb-4"></i>
                      <h3 className="text-xl font-bold text-yellow-400 mb-2">Login Required</h3>
                      <p className="text-gray-400 mb-4">You need to login to build and manage your deck</p>
                      <Button
                        onClick={() => setShowAuthModal(true)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <i className="fas fa-sign-in-alt mr-2"></i>
                        Login Now
                      </Button>
                    </div>
                  </div>
                ) : (
                  <DeckBuilder />
                )}
              </div>
            )}

            {/* Create Room Tab */}
            {activeTab === 'create-room' && (
              <div>
                {isGuest ? (
                  <div className="p-6 text-center">
                    <div className="bg-gray-800 border border-blue-600 rounded-lg p-8">
                      <i className="fas fa-lock text-4xl text-gray-400 mb-4"></i>
                      <h3 className="text-xl font-bold text-yellow-400 mb-2">Login Required</h3>
                      <p className="text-gray-400 mb-4">You need to login to create battle rooms</p>
                      <Button
                        onClick={() => setShowAuthModal(true)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <i className="fas fa-sign-in-alt mr-2"></i>
                        Login Now
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="p-6">
                    <div className="mb-6">
                      <h2 className="text-3xl font-bold text-yellow-400 mb-2">
                        <i className="fas fa-plus mr-2"></i>
                        Create Battle Room
                      </h2>
                      <p className="text-gray-400">Set up a new battle arena for other warriors</p>
                    </div>

                    <Card className="max-w-2xl mx-auto bg-gray-800 border-blue-600 p-8">
                      <form onSubmit={handleCreateRoom} className="space-y-6">
                      <Input
                        placeholder="Room Name"
                        value={roomForm.name}
                        onChange={(e) => setRoomForm({ ...roomForm, name: e.target.value })}
                        required
                        className="bg-gray-900 border-gray-600 focus:border-yellow-400"
                      />

                      <div>
                        <label className="block text-sm font-semibold mb-2">Room Type</label>
                        <div className="grid grid-cols-2 gap-4">
                          <label className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${
                            roomForm.type === 'pvp' ? 'border-yellow-400' : 'border-blue-600 hover:border-yellow-400'
                          }`}>
                            <input
                              type="radio"
                              name="roomType"
                              value="pvp"
                              checked={roomForm.type === 'pvp'}
                              onChange={(e) => setRoomForm({ ...roomForm, type: e.target.value as 'pvp' | 'pve' })}
                              className="mr-3"
                            />
                            <div>
                              <div className="font-semibold text-red-400">
                                <i className="fas fa-swords mr-2"></i>
                                Player vs Player
                              </div>
                              <p className="text-sm text-gray-400 mt-1">Battle against another human player</p>
                            </div>
                          </label>
                          
                          <label className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${
                            roomForm.type === 'pve' ? 'border-yellow-400' : 'border-blue-600 hover:border-yellow-400'
                          }`}>
                            <input
                              type="radio"
                              name="roomType"
                              value="pve"
                              checked={roomForm.type === 'pve'}
                              onChange={(e) => setRoomForm({ ...roomForm, type: e.target.value as 'pvp' | 'pve' })}
                              className="mr-3"
                            />
                            <div>
                              <div className="font-semibold text-purple-400">
                                <i className="fas fa-robot mr-2"></i>
                                Player vs Environment
                              </div>
                              <p className="text-sm text-gray-400 mt-1">Battle against AI with fixed deck</p>
                            </div>
                          </label>
                        </div>
                      </div>

                      <Textarea
                        placeholder="Room Description (Optional)"
                        value={roomForm.description}
                        onChange={(e) => setRoomForm({ ...roomForm, description: e.target.value })}
                        rows={3}
                        className="bg-gray-900 border-gray-600 focus:border-yellow-400"
                      />

                      <div className="flex items-center justify-between pt-4">
                        <div className="text-sm text-gray-400">
                          <i className="fas fa-info-circle mr-1"></i>
                          Your current deck will be used for this battle
                        </div>
                        <Button
                          type="submit"
                          className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8"
                        >
                          <i className="fas fa-plus mr-2"></i>
                          Create Room
                        </Button>
                      </div>
                      </form>
                    </Card>
                  </div>
                )}
              </div>
            )}

            {/* Admin Tab */}
            {activeTab === 'admin' && user && user.isAdmin && (
              <div>
                <AdminPanel />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Auth Modal */}
      <AuthModal 
        open={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
      />
    </div>
  );
}
