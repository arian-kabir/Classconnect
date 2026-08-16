"use client";

import { useState } from 'react';
import RoutineBuilder from '@/app/components/RoutineBuilder';
import RoutineDisplay from '@/app/components/RoutineDisplay';

export default function Home() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  return (
    <main className="min-h-screen bg-zinc-50 font-sans p-4 md:p-8">
      <div className="max-w-7xl mx-auto pt-8 md:pt-12">
        
        <header className="mb-8 md:mb-12 text-center md:text-left">
          <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">
            ClassConnect Dashboard
          </h1>
          <p className="text-gray-500 mt-2 font-medium">
            Module 1 Feature 1: Student Routine Orchestrator
          </p>
        </header>
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-6">
            <RoutineBuilder onRoutineAdded={() => setRefreshTrigger(prev => prev + 1)} />
          </div>

          <div className="lg:col-span-7 xl:col-span-8">
            <RoutineDisplay refreshTrigger={refreshTrigger} />
          </div>

        </div>
      </div>
    </main>
  );
}