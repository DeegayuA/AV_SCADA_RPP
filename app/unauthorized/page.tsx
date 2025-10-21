'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function UnauthorizedPage() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center">Unauthorized</h1>
        <p className="text-center">You do not have permission to access this page.</p>
        <Button onClick={() => router.back()} className="w-full">
          Go Back
        </Button>
      </div>
    </div>
  );
}