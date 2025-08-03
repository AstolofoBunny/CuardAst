import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
}

export function AuthModal({ open, onClose }: AuthModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { signInWithEmail, registerWithEmail, signInWithGoogle, loginBypass, loading } = useAuth();

  const handleEmailAuth = async (isLogin: boolean) => {
    if (!email || !password) return;
    
    if (isLogin) {
      await signInWithEmail(email, password);
    } else {
      await registerWithEmail(email, password);
    }
  };

  const handleDevLogin = () => {
    loginBypass();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-96 max-w-md mx-4 bg-gray-800 border border-blue-600">
        <DialogHeader className="text-center mb-6">
          <DialogTitle className="text-2xl font-bold text-yellow-400 mb-2">
            <i className="fas fa-sword mr-2"></i>
            Battle Arena
          </DialogTitle>
          <p className="text-gray-300">Enter the card battle realm</p>
        </DialogHeader>
        
        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-gray-700">
            <TabsTrigger value="login" className="data-[state=active]:bg-red-600 data-[state=active]:text-white">
              Login
            </TabsTrigger>
            <TabsTrigger value="register" className="data-[state=active]:bg-red-600 data-[state=active]:text-white">
              Register
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="login" className="space-y-4 mt-6">
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-gray-900 border-gray-600 focus:border-yellow-400"
            />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-gray-900 border-gray-600 focus:border-yellow-400"
            />
            <Button 
              onClick={() => handleEmailAuth(true)}
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3"
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </Button>
          </TabsContent>
          
          <TabsContent value="register" className="space-y-4 mt-6">
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-gray-900 border-gray-600 focus:border-yellow-400"
            />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-gray-900 border-gray-600 focus:border-yellow-400"
            />
            <Button 
              onClick={() => handleEmailAuth(false)}
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3"
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </Button>
          </TabsContent>
        </Tabs>

        <div className="mt-4 space-y-2">
          <Button
            onClick={signInWithGoogle}
            disabled={loading}
            className="w-full bg-white hover:bg-gray-100 text-gray-800 font-bold py-3 flex items-center justify-center"
          >
            <i className="fab fa-google mr-2"></i>
            Continue with Google
          </Button>
          
          {/* Development bypass login */}
          <Button
            onClick={handleDevLogin}
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 flex items-center justify-center"
          >
            <i className="fas fa-code mr-2"></i>
            Dev Login (Local Only)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
