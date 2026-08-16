"use client";

import { useState } from 'react';
import RoutineBuilder from '@/app/components/RoutineBuilder';
import RoutineDisplay from '@/app/components/RoutineDisplay';

export default function RoutineOrchestrator() {
  // Centralized state bridge between Builder and Display
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Left Column: The Builder Form */}
      <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-6">
        <RoutineBuilder onRoutineAdded={() => setRefreshTrigger(prev => prev + 1)} />
      </div>

      {/* Right Column: The Routine Display */}
      <div className="lg:col-span-7 xl:col-span-8">
        <RoutineDisplay refreshTrigger={refreshTrigger} />
      </div>
    </div>
  );
}