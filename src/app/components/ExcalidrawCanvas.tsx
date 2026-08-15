'use client';

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';

interface ExcalidrawElement {
  id: string;
  type: string;
  [key: string]: any;
}

interface ExcalidrawContent {
  type: string;
  elements: ExcalidrawElement[];
}

interface ExcalidrawCanvasProps {
  noteId: number | null;
  userId: number;
  initialContent: ExcalidrawContent | null;
  onSave: (updatedNote: any) => void;
}

const Excalidraw = dynamic(
  () => import('@excalidraw/excalidraw').then((mod) => mod.Excalidraw),
  { 
    ssr: false,
    loading: () => <div className="p-4 text-gray-500">Loading canvas...</div>
  }
);

import '@excalidraw/excalidraw/index.css';

export default function ExcalidrawCanvas({ 
  noteId, 
  userId, 
  initialContent, 
  onSave 
}: ExcalidrawCanvasProps) {
  const [elements, setElements] = useState<ExcalidrawElement[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const [hasLoaded, setHasLoaded] = useState<boolean>(false);
  
  // Tracking current note ID to detect changes
  const currentNoteIdRef = useRef<number | null>(null);

  // Handle mounting
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Load content when note changes or initialContent updates
  useEffect(() => {
    if (!isMounted) return;
    
    // Check if note ID changed
    const noteChanged = noteId !== currentNoteIdRef.current;
    
    if (noteChanged) {
      console.log(`📝 Switching to note ${noteId}`);
      
      // Reset state
      setElements([]);
      setHasLoaded(false);
      
      // Load new content
      if (initialContent) {
        try {
          const parsed = typeof initialContent === 'string' 
            ? JSON.parse(initialContent) 
            : initialContent;
          
          const loadedElements = parsed?.elements || [];
          setElements(loadedElements);
          setHasLoaded(true);
          console.log(`Loaded ${loadedElements.length} elements for note ${noteId}`);
        } catch (error) {
          console.error('Error parsing content:', error);
          setElements([]);
          setHasLoaded(true);
        }
      } else {
        // No content, start with empty canvas
        setHasLoaded(true);
      }
      
      // Update ref
      currentNoteIdRef.current = noteId;
    }
  }, [noteId, initialContent, isMounted]);

  // Handle save - only save current canvas, don't create new note
  const handleSave = async (): Promise<void> => {
    if (!noteId) {
      console.error('❌ No note ID');
      return;
    }
    
    setLoading(true);
    try {
      console.log(`💾 Saving note ${noteId} with ${elements.length} elements`);
      
      const response = await fetch(`/api/notes/${noteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId,
          content: { type: 'excalidraw', elements }
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        console.log(' Save successful');
        onSave(data.data);
      } else {
        console.error('Save failed:', data.error);
      }
    } catch (error) {
      console.error('Save error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isMounted) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <p className="text-gray-500">Loading canvas...</p>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full border rounded-lg overflow-hidden bg-white">
      {/* Force re-render with key when note changes */}
      <div className="h-full w-full" key={`canvas-${noteId}`}>
        <Excalidraw
          key={noteId || 'empty'}
          initialData={{ elements: elements as any }}
          onChange={setElements as any}/>
      </div>
      
      <button
        onClick={handleSave}
        disabled={loading || !noteId}
        className="absolute bottom-4 right-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 shadow-lg z-10"
      >
        {loading ? 'Saving...' : '💾 Save Canvas'}
      </button>
    </div>
  );
}