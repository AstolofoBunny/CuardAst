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
// import { BattleInterface } from '@/components/BattleInterface'; // Removed old battle system
import { AdminPanel } from '@/components/AdminPanel';
import { AuthModal } from '@/components/AuthModal';
import { CardsGrid } from '@/components/CardsGrid';
import { Room } from '@/types/game';
import { Link, useLocation } from 'wouter';

interface DashboardProps {
  user: any;
  activeTab?: string;
  battleSubTab?: string;
}

export default function Dashboard({ user, activeTab: initialTab = 'ranking', battleSubTab: initialBattleSubTab }: DashboardProps) {
  const { logout } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [battleSubTab, setBattleSubTab] = useState(initialBattleSubTab || 'waiting-room');
  const [location, navigate] = useLocation();

  // Update active tab based on URL
  useEffect(() => {
    const pathParts = location.split('/').filter(part => part);
    const mainTab = pathParts[0] || 'ranking';
    setActiveTab(mainTab);
    
    // Handle battle sub-tabs
    if (mainTab === 'battle' && pathParts[1]) {
      setBattleSubTab(pathParts[1]);
    }
  }, [location]);

  // Handle chat message send
  const handleSendMessage = () => {
    if (!chatMessage.trim() || isGuest) return;
    
    const newMessage = {
      id: Date.now(),
      user: displayUser.displayName || 'Anonymous',
      message: chatMessage.trim(),
      type: 'user' as const
    };
    
    setChatMessages(prev => [...prev, newMessage]);
    setChatMessage('');
  };

  // Handle tab changes with navigation
  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    if (newTab === 'battle') {
      navigate(`/battle/${battleSubTab}`);
    } else {
      navigate(`/${newTab === 'ranking' ? '' : newTab}`);
    }
  };

  // Handle battle sub-tab changes
  const handleBattleSubTabChange = (newSubTab: string) => {
    setBattleSubTab(newSubTab);
    navigate(`/battle/${newSubTab}`);
  };
  const { rooms, rankings, cards, createRoom, joinRoom, deleteRoom, markPlayerReady, createTestRooms } = useFirestore();
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [chatCollapsed, setChatCollapsed] = useState(true);
  const [chatMessage, setChatMessage] = useState('');
  const [chatMessages, setChatMessages] = useState([
    { id: 1, user: 'System', message: 'Welcome to Battle Arena!', type: 'system' },
    { id: 2, user: 'Player123', message: 'Looking for opponents!', type: 'user' },
    { id: 3, user: 'Warrior99', message: 'Anyone want to battle?', type: 'user' }
  ]);
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

  // Get current room data if user is in a room
  const currentRoom = currentRoomId ? rooms.find(r => r.id === currentRoomId) : null;

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
        setCurrentRoomId(roomId);
        
        if (roomForm.type === 'pve') {
          // For PvE rooms, go directly to fight sub-tab
          handleBattleSubTabChange('fight');
        } else {
          // For PvP rooms, go to waiting room sub-tab to wait for opponent
          handleBattleSubTabChange('waiting-room');
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
      setCurrentRoomId(roomId);
      const room = rooms.find(r => r.id === roomId);
      if (room?.type === 'pve') {
        // For PvE rooms, go directly to fight sub-tab
        handleBattleSubTabChange('fight');
      } else {
        // For PvP rooms, go to waiting room sub-tab
        handleBattleSubTabChange('waiting-room');
      }
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
                <i className="fas fa-search mr-3"></i>
                Find Room
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
        <div className="flex-1 bg-gray-900 flex">
          {/* Content */}
          <div className={`transition-all duration-300 ${chatCollapsed ? 'flex-1' : 'flex-1 mr-80'}`}>
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
                    <p className="text-gray-400">Battle management and combat</p>
                  </div>

                  {/* Battle Sub-tabs */}
                  <div className="mb-6">
                    <Tabs value={battleSubTab} onValueChange={handleBattleSubTabChange} className="w-full">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="waiting-room" className="data-[state=active]:bg-orange-600">
                          <i className="fas fa-hourglass-half mr-2"></i>
                          Waiting Room
                        </TabsTrigger>
                        <TabsTrigger value="fight" className="data-[state=active]:bg-red-600">
                          <i className="fas fa-fist-raised mr-2"></i>
                          Fight
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="waiting-room" className="mt-6">
                        {/* Waiting Room Content */}
                        <Card className="bg-gray-800 border-orange-600 p-8">
                          {currentRoom ? (
                            <div className="text-center mb-8">
                              <h3 className="text-2xl font-bold text-orange-400 mb-4">
                                Room: {currentRoom.name}
                              </h3>
                              <p className="text-gray-400 mb-6">
                                {currentRoom.description || 'Waiting for battle to begin'}
                              </p>
                              
                              <div className="grid grid-cols-2 gap-6 max-w-md mx-auto">
                                {/* Host Player (always on left) */}
                                <div className="bg-gray-700 rounded-lg p-4">
                                  <div className="w-16 h-16 bg-blue-600 rounded-full mx-auto mb-3 flex items-center justify-center">
                                    <i className="fas fa-crown text-yellow-400 text-xl"></i>
                                  </div>
                                  <h4 className="font-bold text-blue-400">
                                    {currentRoom.hostName}
                                  </h4>
                                  <p className="text-sm text-gray-400">Host</p>
                                </div>

                                {/* Second Player or Waiting */}
                                <div className="bg-gray-700 rounded-lg p-4">
                                  {currentRoom.players && currentRoom.players.length > 1 ? (
                                    <>
                                      <div className="w-16 h-16 bg-red-600 rounded-full mx-auto mb-3 flex items-center justify-center">
                                        <i className="fas fa-user text-white text-xl"></i>
                                      </div>
                                      <h4 className="font-bold text-red-400">
                                        {/* Show the other player's name if current user is host, otherwise show current user */}
                                        {user && currentRoom.hostId === user.uid 
                                          ? 'Player 2' 
                                          : user?.displayName || 'You'}
                                      </h4>
                                      <p className="text-sm text-gray-400">Player</p>
                                    </>
                                  ) : (
                                    <>
                                      <div className="w-16 h-16 bg-gray-600 rounded-full mx-auto mb-3 flex items-center justify-center animate-pulse">
                                        <i className="fas fa-hourglass-half text-gray-400 text-xl"></i>
                                      </div>
                                      <h4 className="font-bold text-gray-400">Waiting...</h4>
                                      <p className="text-sm text-gray-500">For opponent</p>
                                    </>
                                  )}
                                </div>
                              </div>

                              <div className="mt-8">
                                {currentRoom.players && currentRoom.players.length > 1 ? (
                                  <Button
                                    onClick={() => handleBattleSubTabChange('fight')}
                                    size="lg" 
                                    className="bg-red-600 hover:bg-red-700 text-xl px-8 py-3"
                                  >
                                    <i className="fas fa-play mr-2"></i>
                                    START BATTLE
                                  </Button>
                                ) : (
                                  <div className="text-gray-400">
                                    <i className="fas fa-clock mr-2"></i>
                                    Waiting for another player to join...
                                  </div>
                                )}
                              </div>

                              <div className="mt-6">
                                <Button
                                  onClick={() => {
                                    setCurrentRoomId(null);
                                    handleTabChange('ranking');
                                  }}
                                  variant="outline"
                                  className="border-gray-600 text-gray-300 hover:bg-gray-700"
                                >
                                  <i className="fas fa-arrow-left mr-2"></i>
                                  Leave Room
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="text-center">
                              <div className="w-20 h-20 bg-gray-700 rounded-full mx-auto mb-4 flex items-center justify-center">
                                <i className="fas fa-door-open text-gray-400 text-3xl"></i>
                              </div>
                              <h3 className="text-xl font-bold text-gray-400 mb-2">No Active Room</h3>
                              <p className="text-gray-500 mb-6">Create or join a room to start waiting for battle</p>
                              
                              <div className="flex justify-center space-x-4">
                                <Button
                                  onClick={() => handleTabChange('rooms')}
                                  className="bg-blue-600 hover:bg-blue-700 px-6 py-3"
                                >
                                  <i className="fas fa-search mr-2"></i>
                                  Find Room
                                </Button>
                                <Button
                                  onClick={() => handleTabChange('create-room')}
                                  disabled={isGuest}
                                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 px-6 py-3"
                                >
                                  <i className="fas fa-plus mr-2"></i>
                                  Create Room
                                </Button>
                              </div>
                            </div>
                          )}
                        </Card>
                      </TabsContent>

                      <TabsContent value="fight" className="mt-6">
                        {/* Fight Content */}
                        <Card className="bg-gray-800 border-red-600 p-8">
                          {currentRoom ? (
                            <div className="text-center mb-8">
                              <h3 className="text-2xl font-bold text-red-400 mb-4">
                                Fighting in: {currentRoom.name}
                              </h3>
                              
                              <div className="w-full h-96 bg-gradient-to-b from-red-900 to-gray-900 rounded-lg mb-6 flex items-center justify-center border-2 border-red-400">
                                <div className="text-4xl font-bold text-red-400">FIGHT ARENA - ACTIVE BATTLE</div>
                              </div>

                              {/* Opponent Cards (Top) */}
                              <div className="mb-6">
                                <h3 className="text-lg font-bold text-red-400 mb-3">Opponent Hand</h3>
                                <div className="flex space-x-2 justify-center">
                                  {[1, 2, 3, 4, 5].map((card) => (
                                    <div key={card} className="w-16 h-24 bg-red-600 rounded border-2 border-red-400 flex items-center justify-center">
                                      <span className="text-xs font-bold">?</span>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Battlefield */}
                              <div className="bg-gradient-to-r from-yellow-900 to-orange-900 rounded-lg p-4 mb-6 border-2 border-yellow-600">
                                <h3 className="text-center text-lg font-bold text-yellow-400 mb-4">BATTLEFIELD</h3>
                                <div className="grid grid-cols-3 gap-4">
                                  {/* Opponent Battlefield */}
                                  <div className="text-center">
                                    <div className="w-20 h-28 bg-red-700 rounded border-2 border-red-500 mx-auto mb-2 flex items-center justify-center">
                                      <span className="text-sm font-bold">Enemy</span>
                                    </div>
                                  </div>
                                  <div className="text-center">
                                    <div className="w-20 h-28 bg-gray-600 rounded border-2 border-gray-500 mx-auto mb-2 flex items-center justify-center">
                                      <span className="text-xs">Empty</span>
                                    </div>
                                  </div>
                                  <div className="text-center">
                                    <div className="w-20 h-28 bg-gray-600 rounded border-2 border-gray-500 mx-auto mb-2 flex items-center justify-center">
                                      <span className="text-xs">Empty</span>
                                    </div>
                                  </div>
                                  
                                  {/* Your Battlefield */}
                                  <div className="text-center">
                                    <div className="w-20 h-28 bg-blue-700 rounded border-2 border-blue-500 mx-auto mb-2 flex items-center justify-center">
                                      <span className="text-sm font-bold">Your</span>
                                    </div>
                                  </div>
                                  <div className="text-center">
                                    <div className="w-20 h-28 bg-gray-600 rounded border-2 border-gray-500 mx-auto mb-2 flex items-center justify-center">
                                      <span className="text-xs">Empty</span>
                                    </div>
                                  </div>
                                  <div className="text-center">
                                    <div className="w-20 h-28 bg-gray-600 rounded border-2 border-gray-500 mx-auto mb-2 flex items-center justify-center">
                                      <span className="text-xs">Empty</span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Your Cards (Bottom) */}
                              <div className="mb-6">
                                <h3 className="text-lg font-bold text-blue-400 mb-3">Your Hand</h3>
                                <div className="flex space-x-2 justify-center">
                                  {[1, 2, 3, 4, 5].map((card) => (
                                    <div key={card} className="w-16 h-24 bg-blue-600 rounded border-2 border-blue-400 flex items-center justify-center cursor-pointer hover:bg-blue-500">
                                      <span className="text-xs font-bold">{card}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Battle Controls */}
                              <div className="flex justify-center mt-6 space-x-4">
                                <Button className="bg-green-600 hover:bg-green-700 px-6">
                                  <i className="fas fa-play mr-2"></i>
                                  End Turn
                                </Button>
                                <Button variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-700 px-6">
                                  <i className="fas fa-shield mr-2"></i>
                                  Defend
                                </Button>
                                <Button
                                  onClick={() => {
                                    setCurrentRoomId(null);
                                    handleTabChange('ranking');
                                  }}
                                  variant="destructive"
                                  className="px-6"
                                >
                                  <i className="fas fa-flag mr-2"></i>
                                  Surrender
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="text-center">
                              <div className="w-20 h-20 bg-gray-700 rounded-full mx-auto mb-4 flex items-center justify-center">
                                <i className="fas fa-swords text-gray-400 text-3xl"></i>
                              </div>
                              <h3 className="text-xl font-bold text-gray-400 mb-2">No Active Battle</h3>
                              <p className="text-gray-500 mb-6">Join a room and start a battle first</p>
                              
                              <Button
                                onClick={() => handleBattleSubTabChange('waiting-room')}
                                className="bg-orange-600 hover:bg-orange-700 px-6 py-3"
                              >
                                <i className="fas fa-hourglass-half mr-2"></i>
                                Go to Waiting Room
                              </Button>
                            </div>
                          )}
                        </Card>
                      </TabsContent>
                    </Tabs>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'battle-old-removed' && !currentRoom && (
              <div>
                <div className="p-6">
                  <div className="mb-6">
                    <h2 className="text-3xl font-bold text-yellow-400 mb-2">
                      <i className="fas fa-sword mr-2"></i>
                      Battle Arena
                    </h2>
                    <p className="text-gray-400">Choose your action to start battling</p>
                  </div>

                  <Card className="bg-gray-800 border-blue-600 p-8 text-center">
                    <div className="mb-6">
                      <div className="w-20 h-20 bg-gray-700 rounded-full mx-auto mb-4 flex items-center justify-center">
                        <i className="fas fa-swords text-yellow-400 text-3xl"></i>
                      </div>
                      <h3 className="text-xl font-bold text-gray-400 mb-2">Ready for Action</h3>
                      <p className="text-gray-500">Choose how you want to battle!</p>
                    </div>
                    
                    <div className="flex justify-center space-x-4">
                      <Button
                        onClick={() => handleTabChange('rooms')}
                        className="bg-blue-600 hover:bg-blue-700 px-6 py-3"
                      >
                        <i className="fas fa-search mr-2"></i>
                        Find Room
                      </Button>
                      <Button
                        onClick={() => handleTabChange('create-room')}
                        disabled={isGuest}
                        className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 px-6 py-3"
                      >
                        <i className="fas fa-plus mr-2"></i>
                        Create Room
                      </Button>
                      <Button
                        onClick={() => handleBattleSubTabChange('waiting-room')}
                        className="bg-yellow-600 hover:bg-yellow-700 px-6 py-3"
                      >
                        <i className="fas fa-hourglass-half mr-2"></i>
                        Waiting Room
                      </Button>
                    </div>
                  </Card>
                </div>
              </div>
            )}

            {activeTab === 'battle' && currentRoom && (
              <div>
                <div className="p-6">
                  <div className="mb-6">
                    <h2 className="text-3xl font-bold text-yellow-400 mb-2">
                      <i className="fas fa-sword mr-2"></i>
                      Battle Arena
                    </h2>
                    <p className="text-gray-400">Room: {currentRoom.name}</p>
                  </div>

                  <Card className="bg-gray-800 border-red-600 p-8">
                    <div className="text-center mb-8">
                      <div className="w-full h-96 bg-gradient-to-b from-blue-900 to-green-900 rounded-lg mb-6 flex items-center justify-center border-2 border-yellow-400">
                        <div className="text-4xl font-bold text-yellow-400">BATTLEFIELD IMAGE PLACEHOLDER</div>
                      </div>
                    </div>

                    {/* Player 1 Cards (Bottom) */}
                    <div className="mb-6">
                      <h3 className="text-lg font-bold text-blue-400 mb-3">Your Hand</h3>
                      <div className="flex space-x-2 justify-center">
                        {[1, 2, 3, 4, 5].map((card) => (
                          <div key={card} className="w-16 h-24 bg-blue-600 rounded border-2 border-blue-400 flex items-center justify-center cursor-pointer hover:bg-blue-500">
                            <span className="text-xs font-bold">{card}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Battlefield Slots */}
                    <div className="grid grid-cols-2 gap-8 mb-6">
                      {/* Player 1 Battlefield */}
                      <div>
                        <h4 className="text-blue-400 font-bold mb-2">Your Battlefield</h4>
                        <div className="flex space-x-2">
                          {[1, 2, 3].map((slot) => (
                            <div key={slot} className="w-16 h-24 bg-gray-700 rounded border-2 border-gray-500 flex items-center justify-center">
                              <span className="text-xs text-gray-400">Slot {slot}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Player 2 Battlefield */}
                      <div>
                        <h4 className="text-red-400 font-bold mb-2">Opponent Battlefield</h4>
                        <div className="flex space-x-2">
                          {[1, 2, 3].map((slot) => (
                            <div key={slot} className="w-16 h-24 bg-gray-700 rounded border-2 border-gray-500 flex items-center justify-center">
                              <span className="text-xs text-gray-400">Slot {slot}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Player 2 Cards (Top) */}
                    <div>
                      <h3 className="text-lg font-bold text-red-400 mb-3">Opponent Hand</h3>
                      <div className="flex space-x-2 justify-center">
                        {[1, 2, 3, 4, 5].map((card) => (
                          <div key={card} className="w-16 h-24 bg-red-600 rounded border-2 border-red-400 flex items-center justify-center">
                            <span className="text-xs font-bold">?</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-6 text-center">
                      <Button
                        onClick={() => {
                          setCurrentRoomId(null);
                          handleTabChange('ranking');
                        }}
                        variant="destructive"
                      >
                        <i className="fas fa-door-open mr-2"></i>
                        Leave Battle
                      </Button>
                    </div>
                  </Card>
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
                              <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center overflow-hidden">
                                {player.profilePicture ? (
                                  <img 
                                    src={player.profilePicture} 
                                    alt={player.displayName} 
                                    className="w-full h-full object-cover" 
                                  />
                                ) : (
                                  <i className="fas fa-user text-sm"></i>
                                )}
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
                        
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleJoinRoom(room.id)}
                            disabled={isGuest || room.status !== 'waiting' || (user ? room.players.includes(user.uid) : false)}
                            className={`flex-1 font-bold py-3 transition-colors ${
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
                          
                          {/* Delete button for room hosts or admins */}
                          {user && (user.uid === room.hostId || user.isAdmin) && (
                            <Button
                              onClick={async () => {
                                if (confirm(`Delete room "${room.name}"?`)) {
                                  await deleteRoom(room.id);
                                }
                              }}
                              variant="outline"
                              size="sm"
                              className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white px-3"
                            >
                              <i className="fas fa-times"></i>
                            </Button>
                          )}
                        </div>
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
          
          {/* Chat Panel */}
          <div className={`fixed top-0 right-0 h-full bg-gray-800 border-l border-blue-600 transition-transform duration-300 z-40 ${
            chatCollapsed ? 'translate-x-full' : 'translate-x-0'
          } w-80`}>
            {/* Chat Header */}
            <div className="bg-blue-900 text-white p-3 flex items-center justify-between">
              <h4 className="font-bold text-sm">
                <i className="fas fa-comments mr-2"></i>
                General Chat
              </h4>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setChatCollapsed(!chatCollapsed)}
                className="h-6 w-6 p-0 text-white hover:bg-blue-800"
              >
                <i className={`fas ${chatCollapsed ? 'fa-chevron-left' : 'fa-chevron-right'} text-xs`}></i>
              </Button>
            </div>
            
            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-2 bg-gray-900 text-xs" style={{ height: 'calc(100vh - 120px)' }}>
              {chatMessages.map((msg) => (
                <div key={msg.id} className="text-gray-400 mb-1">
                  <span className={msg.type === 'system' ? 'text-blue-400' : 'text-green-400'}>
                    [{msg.user}]
                  </span> {msg.message}
                </div>
              ))}
            </div>
            
            {/* Chat Input */}
            <div className="p-2 bg-gray-800">
              <div className="flex space-x-1">
                <Input
                  placeholder={isGuest ? "Login to chat" : "Type message..."}
                  disabled={isGuest}
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  className="flex-1 h-8 text-xs bg-gray-700 border-gray-600 text-white"
                />
                <Button
                  size="sm"
                  disabled={isGuest || !chatMessage.trim()}
                  onClick={handleSendMessage}
                  className="h-8 px-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600"
                >
                  <i className="fas fa-paper-plane text-xs"></i>
                </Button>
              </div>
            </div>
          </div>
          
          {/* Chat Collapse Button (when collapsed) */}
          {chatCollapsed && (
            <div className="fixed top-1/2 right-0 transform -translate-y-1/2 z-50">
              <Button
                size="sm"
                onClick={() => setChatCollapsed(false)}
                className="h-12 w-6 bg-blue-600 hover:bg-blue-700 rounded-l-lg rounded-r-none border-r-0"
              >
                <i className="fas fa-comments text-xs"></i>
              </Button>
            </div>
          )}
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
