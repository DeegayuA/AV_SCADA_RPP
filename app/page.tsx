'use client';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { clearOnboardingData } from '@/lib/idb-store';
import { toast } from 'sonner';
import WelcomeExperience from './WelcomeExperience';
import Link from 'next/link';
import { useEffect } from 'react';

export default function DashboardPage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.replace('/login');
        }
    }, [status, router]);

    const handleLogout = () => {
        signOut({ callbackUrl: '/login' });
        toast.success("Logged out successfully.");
    };

    const handleResetApp = async () => {
        if (window.confirm("Are you sure you want to reset all application data and go through onboarding again? This cannot be undone.")) {
            await clearOnboardingData();
            handleLogout();
            toast.success("Application reset. Redirecting to onboarding...");
            router.push('/onboarding?reset=true');
        }
    };

    const handleExploreDashboard = () => {
        toast.info("Let's get started!", { description: "Check out your system status below."});
        router.push('/control');
    };

    if (status === 'loading' || !session) {
        return <div className="flex items-center justify-center min-h-screen">Loading user data...</div>;
    }

    const user = session.user;

  return (
    <div className="container mx-auto p-4 md:p-8">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="flex items-center gap-4">
            {(user as any).avatar && <img src={(user as any).avatar} alt="User Avatar" className="h-10 w-10 rounded-full" />}
            <span>{user?.name}</span>
            {(user as any).role === 'admin' && (
              <Link href="/admin/users" passHref>
                <Button variant="outline">User Management</Button>
              </Link>
            )}
            <Button variant="outline" onClick={handleLogout}>Logout</Button>
        </div>
      </header>
      
      <Card className="overflow-hidden"> 
        <CardHeader>
          <CardTitle>Welcome Aboard!</CardTitle> 
        </CardHeader>
   
        <WelcomeExperience 
          userName={user?.name || user?.email?.split('@')[0]}
          onGetStarted={handleExploreDashboard} 
        />
      </Card>
      
      <Card className="mt-8">
        <CardHeader><CardTitle>System Overview</CardTitle></CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            (Placeholder: Your main dashboard components would be rendered here.)
          </p>
        </CardContent>
      </Card>


      <Card className="mt-8">
          <CardHeader>
              <CardTitle>Application Settings</CardTitle>
          </CardHeader>
          <CardContent>
              <p className="text-muted-foreground mb-4">
                  This will clear all stored configuration and your session, then take you back to the initial setup wizard.
              </p>
              <Button variant="destructive" onClick={handleResetApp}>
                  Reset Application & Start Onboarding Over
              </Button>
          </CardContent>
      </Card>
    </div>
  );
}