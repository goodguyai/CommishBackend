import { useState } from 'react';
import { useLocation, Link } from 'wouter';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { Loader2, AlertCircle } from 'lucide-react';
import { api } from '@/lib/apiApp';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

export function LoginPage() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim() || !password) {
      setLoginError('Please enter your email and password');
      toast.error('Please enter your email and password');
      return;
    }

    setIsLoading(true);
    setLoginError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setLoginError(error.message || 'Failed to sign in');
        toast.error(error.message || 'Failed to sign in');
        return;
      }

      if (!data.user || !data.session?.access_token) {
        setLoginError('Sign in failed - no session returned');
        toast.error('Sign in failed - no session returned');
        return;
      }

      try {
        await api('/api/auth/session', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${data.session.access_token.trim()}`,
          },
        });

        toast.success('Signed in successfully!');
        setLocation('/app/dashboard');
      } catch (sessionError: any) {
        console.error('[Session Exchange]', sessionError);
        setLoginError('Failed to establish session');
        toast.error('Failed to establish session');
      }
    } catch (e: any) {
      console.error('[Login]', e);
      const errorMsg = e.message || 'Failed to sign in';
      setLoginError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050607] flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-14 h-14 bg-[#009898] rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-2xl font-bold text-[#F5F7FA]">TC</span>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-[#F5F7FA] mb-2" data-testid="text-login-title">
            Welcome Back
          </h1>
          <p className="text-[#9CA3AF]">Sign in to your account</p>
        </div>

        <Card className="bg-[#111820] border-[#1f2937]">
          <CardHeader>
            <CardTitle className="text-[#F5F7FA]">Login</CardTitle>
            <CardDescription className="text-[#9CA3AF]">
              Enter your credentials to access your league
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              {loginError && (
                <div 
                  className="bg-red-900/20 border border-red-500 rounded p-3 flex items-start gap-2" 
                  data-testid="error-login"
                >
                  <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                  <p className="text-red-400 text-sm">{loginError}</p>
                </div>
              )}

              <div>
                <Label htmlFor="email" className="text-[#F5F7FA]">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setLoginError(null);
                  }}
                  placeholder="your@email.com"
                  className="bg-[#1f2937] border-[#374151] text-[#F5F7FA] placeholder:text-[#6B7280]"
                  disabled={isLoading}
                  data-testid="input-login-email"
                  autoComplete="email"
                />
              </div>

              <div>
                <Label htmlFor="password" className="text-[#F5F7FA]">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setLoginError(null);
                  }}
                  placeholder="Enter your password"
                  className="bg-[#1f2937] border-[#374151] text-[#F5F7FA] placeholder:text-[#6B7280]"
                  disabled={isLoading}
                  data-testid="input-login-password"
                  autoComplete="current-password"
                />
              </div>

              <div className="flex items-center justify-between">
                <Link href="/forgot-password">
                  <a className="text-sm text-[#009898] hover:text-[#00b8b8] transition-colors" data-testid="link-forgot-password">
                    Forgot password?
                  </a>
                </Link>
              </div>

              <Button
                type="submit"
                className="w-full bg-[#009898] hover:bg-[#007878] text-[#F5F7FA]"
                disabled={isLoading}
                data-testid="button-login"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-[#9CA3AF] text-sm">
                Don't have an account?{' '}
                <Link href="/onboarding">
                  <a className="text-[#009898] hover:text-[#00b8b8] font-medium transition-colors" data-testid="link-signup">
                    Sign Up
                  </a>
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
