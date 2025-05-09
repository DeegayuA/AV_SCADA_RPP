// app/dashboard/page.tsx
'use client';
import { useEffect, useState }  from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'; // CardContent is not used for the WelcomeExperience card anymore
import { clearOnboardingData } from '@/lib/idb-store'; // For the reset button
import { toast } from 'sonner';
import WelcomeExperience from './WelcomeExperience';

interface User {
    email: string;
    avatar?: string;
    name?: string; // Optional name for personalization
}

export default function DashboardPage() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        } else {
            router.replace('/login');
        }
    }, [router]);

    const handleLogout = () => {
        localStorage.removeItem('user');
        setUser(null);
        router.push('/login');
        toast.success("Logged out successfully.");
    };

    const handleResetApp = async () => {
        if (window.confirm("Are you sure you want to reset all application data and go through onboarding again? This cannot be undone.")) {
            await clearOnboardingData();
            localStorage.removeItem('user');
            toast.success("Application reset. Redirecting to onboarding...");
            router.push('/onboarding?reset=true');
        }
    };

    const handleExploreDashboard = () => {
        // Example: Navigate to a specific part of the dashboard or just acknowledge
        toast.info("Let's get started!", { description: "Check out your system status below."});
        router.push('/control');
        // You might scroll to a specific section or enable a tour, etc.
        // For now, it can be a no-op if the welcome is just visual.
    };

    if (!user) {
        return <div className="flex items-center justify-center min-h-screen">Loading user data...</div>;
    }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="flex items-center gap-4">
            {user.avatar && <img src={user.avatar} alt="User Avatar" className="h-10 w-10 rounded-full" />}
            <span>{user.email}</span>
            <Button variant="outline" onClick={handleLogout}>Logout</Button>
        </div>
      </header>
      
      {/* UPDATED WELCOME SECTION */}
      {/* The outer Card can be kept for consistent sectioning or removed if WelcomeExperience handles its own bg/padding */}
      <Card className="overflow-hidden"> 
        {/* CardHeader might not be needed if WelcomeExperience has its own title logic, or adjust as needed */}
     
        <CardHeader>
          <CardTitle>Welcome Aboard!</CardTitle> 
        </CardHeader>
   
        {/* CardContent is replaced by WelcomeExperience. The component manages its own padding. */}
        <WelcomeExperience 
          userName={user.name || user.email.split('@')[0]} // Pass user name for personalization
          onGetStarted={handleExploreDashboard} 
        />
      </Card>
      
      {/* Other placeholder for actual dashboard content - THIS IS WHERE YOUR COMPLEX DASHBOARD (like UnifiedDashboardPage content) would go */}
      <Card className="mt-8">
        <CardHeader><CardTitle>System Overview</CardTitle></CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            (Placeholder: Your main dashboard components like graphs, SLD, data cards would be rendered here, potentially the content from your `UnifiedDashboardPage` if this `DashboardPage` is just a wrapper.)
          </p>
        </CardContent>
      </Card>


      <Card className="mt-8">
          <CardHeader>
              <CardTitle>Application Settings</CardTitle>
          </CardHeader>
          <CardContent>
              <p className="text-muted-foreground mb-4">
                  This will clear all stored configuration (plant details, data points) and your session, then take you back to the initial setup wizard.
              </p>
              <Button variant="destructive" onClick={handleResetApp}>
                  Reset Application & Start Onboarding Over
              </Button>
          </CardContent>
      </Card>
    </div>
  );
}