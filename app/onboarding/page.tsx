// app/onboarding/page.tsx
import { Suspense } from 'react';
import OnboardingClient from './OnboardingClient';

const LoadingFallback = () => (
  <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white p-4 overflow-hidden">
    {/* Animated background effect */}
    <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-repeat opacity-5" style={{backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%239C92AC\' fill-opacity=\'0.12\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")'}}></div>
    </div>
    <div className="relative">
      <div className="absolute -inset-1.5 rounded-full bg-gradient-to-r from-sky-500 via-purple-500 to-pink-500 opacity-75 blur-xl animate-pulse"></div>
      <div className="relative flex items-center justify-center h-20 w-20 bg-slate-800/70 backdrop-blur-sm rounded-full shadow-2xl">
        <svg className="animate-spin h-10 w-10 text-sky-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    </div>
    <p className="text-2xl font-semibold mt-8 animate-bounce">
      <span className="inline-block animate-pulse" style={{animationDelay: '0s'}}>P</span>
      <span className="inline-block animate-pulse" style={{animationDelay: '0.1s'}}>r</span>
      <span className="inline-block animate-pulse" style={{animationDelay: '0.2s'}}>e</span>
      <span className="inline-block animate-pulse" style={{animationDelay: '0.3s'}}>p</span>
      <span className="inline-block animate-pulse" style={{animationDelay: '0.4s'}}>a</span>
      <span className="inline-block animate-pulse" style={{animationDelay: '0.5s'}}>r</span>
      <span className="inline-block animate-pulse" style={{animationDelay: '0.6s'}}>i</span>
      <span className="inline-block animate-pulse" style={{animationDelay: '0.7s'}}>n</span>
      <span className="inline-block animate-pulse" style={{animationDelay: '0.8s'}}>g</span>
      <span className="inline-block animate-pulse" style={{animationDelay: '0.9s'}}>...</span>
    </p>
    <p className="text-md text-slate-400 mt-2">Your awesome experience is loading!</p>
  </div>
);


export default function OnboardingPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <OnboardingClient />
    </Suspense>
  );
}