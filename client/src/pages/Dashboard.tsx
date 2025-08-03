import { useState } from 'react';
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
import { Room } from '@/types/game';

interface DashboardProps {
  guestMode?: boolean;
}

export default function Dashboard({ guestMode = false }: DashboardProps) {
  const { user, logout } = useAuth();
  const { rooms, rankings, createRoom, joinRoom, createTestRooms } = useFirestore();
  const [currentBattleId, setCurrentBattleId] = useState<string | null>(null);
  const [roomForm, setRoomForm] = useState({
    name: '',
    type: 'pvp' as 'pvp' | 'pve',
    description: ''
  });

  // Guest mode mock user for display purposes only
  const displayUser = user || {
    uid: 'guest',
    email: 'guest@battlecard.local',
    displayName: 'Guest User',
    isAdmin: false,
    wins: 0,
    losses: 0,
    hp: 20,
    energy: 100,
    deck: [],
    createdAt: Date.now()
  };

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

    const roomId = await createRoom(roomData);
    if (roomId) {
      setRoomForm({ name: '', type: 'pvp', description: '' });
      // Auto-join the created room if it's PvE
      if (roomForm.type === 'pve') {
        // TODO: Start PvE battle
      }
    }
  };

  const handleJoinRoom = async (roomId: string) => {
    if (guestMode) {
      alert('Please login to join rooms');
      return;
    }
    const success = await joinRoom(roomId, user!.uid);
    if (success) {
      // TODO: Create battle and navigate to battle interface
      // setCurrentBattleId(battleId);
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
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center">
                <i className="fas fa-user"></i>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center space-x-2">
                  <span className="font-semibold">{displayUser.displayName}</span>
                  {guestMode && (
                    <span className="text-orange-400 text-xs">(Guest)</span>
                  )}
                </div>
                <div className="flex items-center space-x-4 text-xs">
                  <span className="text-yellow-400">Побед: {displayUser.wins}</span>
                  <span className="text-red-400">Поражений: {displayUser.losses}</span>
                  {!guestMode && (
                    <>
                      <span className="text-green-400">HP: {displayUser.hp}/20</span>
                      <span className="text-blue-400">Энергия: {displayUser.energy}/100</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            {guestMode ? (
              <Button
                onClick={() => window.location.reload()}
                className="bg-green-600 hover:bg-green-700"
                size="sm"
              >
                <i className="fas fa-sign-in-alt mr-1"></i>
                Login
              </Button>
            ) : (
              <Button
                onClick={logout}
                variant="destructive"
                size="sm"
              >
                <i className="fas fa-sign-out-alt mr-1"></i>
                Logout
              </Button>
            )}
          </div>
        </div>
      </nav>

      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-gray-800 border-r border-blue-600 min-h-screen">
          <Tabs defaultValue="ranking" className="w-full" orientation="vertical">
            <TabsList className="flex flex-col h-auto bg-transparent p-4 space-y-2">
              <TabsTrigger
                value="ranking"
                className="w-full justify-start px-4 py-3 data-[state=active]:bg-red-600 data-[state=active]:text-white text-gray-300 hover:text-white"
              >
                <i className="fas fa-trophy mr-3"></i>
                Ranking
              </TabsTrigger>
              <TabsTrigger
                value="rooms"
                className="w-full justify-start px-4 py-3 data-[state=active]:bg-red-600 data-[state=active]:text-white text-gray-300 hover:text-white"
              >
                <i className="fas fa-users mr-3"></i>
                Battle Rooms
              </TabsTrigger>
              <TabsTrigger
                value="deck"
                disabled={guestMode}
                className={`w-full justify-start px-4 py-3 data-[state=active]:bg-red-600 data-[state=active]:text-white text-gray-300 hover:text-white ${guestMode ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <i className="fas fa-layer-group mr-3"></i>
                My Deck {guestMode && '(Login Required)'}
              </TabsTrigger>
              <TabsTrigger
                value="create-room"
                disabled={guestMode}
                className={`w-full justify-start px-4 py-3 data-[state=active]:bg-red-600 data-[state=active]:text-white text-gray-300 hover:text-white ${guestMode ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <i className="fas fa-plus mr-3"></i>
                Create Room {guestMode && '(Login Required)'}
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

            {/* Tab Content */}
            <div className="flex-1">
              {/* Ranking Tab */}
              <TabsContent value="ranking">
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
              </TabsContent>

              {/* Rooms Tab */}
              <TabsContent value="rooms">
                <div className="p-6">
                  <div className="mb-6 flex justify-between items-center">
                    <div>
                      <h2 className="text-3xl font-bold text-yellow-400 mb-2">
                        <i className="fas fa-users mr-2"></i>
                        Боевые Комнаты
                      </h2>
                      <p className="text-gray-400">Присоединяйся к активным битвам или наблюдай за матчами</p>
                    </div>
                    {user && user.isAdmin && (
                      <Button
                        onClick={createTestRooms}
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        <i className="fas fa-plus mr-2"></i>
                        Создать Тестовые Комнаты
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
                          disabled={guestMode || room.status !== 'waiting' || (user ? room.players.includes(user.uid) : false)}
                          className={`w-full font-bold py-3 transition-colors ${
                            !guestMode && room.status === 'waiting' && (!user || !room.players.includes(user.uid))
                              ? 'bg-red-600 hover:bg-red-700 text-white'
                              : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                          }`}
                        >
                          {guestMode ? (
                            <>
                              <i className="fas fa-lock mr-2"></i>
                              Нужна Авторизация
                            </>
                          ) : user && room.players.includes(user.uid) ? (
                            <>
                              <i className="fas fa-check mr-2"></i>
                              Присоединился
                            </>
                          ) : room.status === 'waiting' ? (
                            <>
                              <i className="fas fa-sword mr-2"></i>
                              Войти в Сражение
                            </>
                          ) : (
                            <>
                              <i className="fas fa-eye mr-2"></i>
                              Наблюдать
                            </>
                          )}
                        </Button>
                      </Card>
                    ))}
                  </div>
                </div>
              </TabsContent>

              {/* Deck Tab */}
              <TabsContent value="deck">
                {guestMode ? (
                  <div className="p-6 text-center">
                    <div className="bg-gray-800 border border-blue-600 rounded-lg p-8">
                      <i className="fas fa-lock text-4xl text-gray-400 mb-4"></i>
                      <h3 className="text-xl font-bold text-yellow-400 mb-2">Login Required</h3>
                      <p className="text-gray-400 mb-4">You need to login to build and manage your deck</p>
                      <Button
                        onClick={() => window.location.reload()}
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
              </TabsContent>

              {/* Create Room Tab */}
              <TabsContent value="create-room">
                {guestMode ? (
                  <div className="p-6 text-center">
                    <div className="bg-gray-800 border border-blue-600 rounded-lg p-8">
                      <i className="fas fa-lock text-4xl text-gray-400 mb-4"></i>
                      <h3 className="text-xl font-bold text-yellow-400 mb-2">Login Required</h3>
                      <p className="text-gray-400 mb-4">You need to login to create battle rooms</p>
                      <Button
                        onClick={() => window.location.reload()}
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
                        Создать Боевую Комнату
                      </h2>
                      <p className="text-gray-400">Настрой новую арену для битвы с другими воинами</p>
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
              </TabsContent>

              {/* Admin Tab */}
              {user && user.isAdmin && (
                <TabsContent value="admin">
                  <AdminPanel />
                </TabsContent>
              )}
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
