import { useState } from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { Loader2, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setError('Please enter your email address');
      toast.error('Please enter your email address');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        setError(error.message || 'Failed to send reset email');
        toast.error(error.message || 'Failed to send reset email');
        return;
      }

      setSuccess(true);
      toast.success('Password reset email sent!');
    } catch (e: any) {
      console.error('[Forgot Password]', e);
      const errorMsg = e.message || 'Failed to send reset email';
      setError(errorMsg);
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
          <h1 className="text-3xl font-bold text-[#F5F7FA] mb-2" data-testid="text-forgot-password-title">
            Forgot Password?
          </h1>
          <p className="text-[#9CA3AF]">Enter your email to reset your password</p>
        </div>

        <Card className="bg-[#111820] border-[#1f2937]">
          <CardHeader>
            <CardTitle className="text-[#F5F7FA]">Reset Password</CardTitle>
            <CardDescription className="text-[#9CA3AF]">
              We'll send you a link to reset your password
            </CardDescription>
          </CardHeader>
          <CardContent>
            {success ? (
              <div className="space-y-4">
                <div className="bg-green-900/20 border border-green-500 rounded p-4 flex items-start gap-3" data-testid="success-reset-email">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-green-400 font-medium mb-1">Email Sent!</p>
                    <p className="text-green-400/80 text-sm">
                      Check your email for a password reset link. If you don't see it, check your spam folder.
                    </p>
                  </div>
                </div>
                
                <Link href="/login">
                  <a className="flex items-center justify-center gap-2 text-[#009898] hover:text-[#00b8b8] transition-colors" data-testid="link-back-to-login">
                    <ArrowLeft className="w-4 h-4" />
                    Back to Login
                  </a>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                {error && (
                  <div 
                    className="bg-red-900/20 border border-red-500 rounded p-3 flex items-start gap-2" 
                    data-testid="error-forgot-password"
                  >
                    <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                    <p className="text-red-400 text-sm">{error}</p>
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
                      setError(null);
                    }}
                    placeholder="your@email.com"
                    className="bg-[#1f2937] border-[#374151] text-[#F5F7FA] placeholder:text-[#6B7280]"
                    disabled={isLoading}
                    data-testid="input-forgot-password-email"
                    autoComplete="email"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-[#009898] hover:bg-[#007878] text-[#F5F7FA]"
                  disabled={isLoading}
                  data-testid="button-reset-password"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    'Send Reset Link'
                  )}
                </Button>

                <div className="text-center">
                  <Link href="/login">
                    <a className="text-sm text-[#009898] hover:text-[#00b8b8] transition-colors" data-testid="link-back-to-login-bottom">
                      Back to Login
                    </a>
                  </Link>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
