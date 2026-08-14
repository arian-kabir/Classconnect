// src/app/notes/page.tsx
'use client';

import { useState, useEffect } from 'react';
// import { useSession } from 'next-auth/react';
// import { useRouter } from 'next/navigation';
import ExcalidrawCanvas from '../components/ExcalidrawCanvas';

interface Note {
  id: number;
  title: string;
  content: any;
  text_content: string;
  user_id: number;
  section_id: number;
  is_archived: number;
  created_at: string;
  updated_at: string;
}

export default function NotesPage() {
  // const { data: session, status } = useSession();
  // const router = useRouter();
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  
  const userId = 1//session?.user?.id ? parseInt(session.user.id) : 1; // Fallback to 1 for testing
  const sectionId = 3;


  // useEffect(() => {
  //     if (status === 'unauthenticated') {
  //       router.push('/auth/signin');
  //     }
  //   }, [status, router]);


  const fetchNotes = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      
      const res = await fetch(
        `/api/notes?userId=${userId}&sectionId=${sectionId}`
      );
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();
      
      if (data.success) {
        setNotes(data.data);
        
        // Auto-select first note if none selected
        if (data.data.length > 0 && !selectedNote) {
          setSelectedNote(data.data[0]);
        }
      } else {
        setError('Failed to fetch notes');
      }
    } catch (error) {
      console.error('Fetch error:', error);
      setError('Error loading notes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const createNote = async (): Promise<void> => {
    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Note ${notes.length + 1}`,
          content: { type: 'excalidraw', elements: [] },
          text_content: '',
          user_id: userId,
          section_id: sectionId
        })
      });
      
      const data = await res.json();
      
      if (data.success) {
        await fetchNotes();
        setSelectedNote(data.data);
      }
    } catch (error) {
      console.error('Create error:', error);
    }
  };

  const deleteNote = async (noteId: number): Promise<void> => {
    if (!confirm('Delete this note?')) return;
    
    try {
      const res = await fetch(`/api/notes/${noteId}?userId=${userId}`, {
        method: 'DELETE'
      });
      
      const data = await res.json();
      
      if (data.success) {
        await fetchNotes();
        if (selectedNote?.id === noteId) {
          setSelectedNote(notes.find(n => n.id !== noteId) || null);
        }
      }
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  const handleNoteSelect = (note: Note): void => {
    console.log(`Selecting note: ${note.id} - ${note.title}`);
    setSelectedNote(note);
  };

  const handleNoteUpdate = (updatedNote: Note): void => {
    console.log(`Updating note: ${updatedNote.id}`);
    setSelectedNote(updatedNote);
    fetchNotes();
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500">Loading notes...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <div className="w-80 border-r p-4 overflow-y-auto bg-gray-50 flex-shrink-0">
        <h2 className="text-xl font-bold mb-4"> My Notes</h2>
        <button
          onClick={createNote}
          className="w-full mb-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          + New Note
        </button>
        
        {notes.length === 0 ? (
          <p className="text-gray-500 text-sm">No notes yet. Create one!</p>
        ) : (
          notes.map((note) => (
            <div
              key={note.id}
              onClick={() => handleNoteSelect(note)}
              className={`p-3 mb-2 rounded-lg cursor-pointer border transition-colors ${
                selectedNote?.id === note.id 
                  ? 'bg-blue-100 border-blue-500' 
                  : 'bg-white hover:bg-gray-100 border-gray-200'
              }`}
            >
              <div className="font-semibold">{note.title}</div>
              <div className="text-sm text-gray-500">
                {new Date(note.updated_at).toLocaleDateString()}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteNote(note.id);
                }}
                className="mt-1 text-sm text-red-600 hover:text-red-800 transition-colors"
              >
                Delete
              </button>
            </div>
          ))
        )}
      </div>

      {/* Canvas Area */}
      <div className="flex-1 p-4 flex flex-col overflow-hidden">
        {selectedNote ? (
          <>
            <h2 className="text-xl font-bold mb-3">{selectedNote.title}</h2>
            <div className="flex-1 min-h-0">
              <ExcalidrawCanvas
                key={`canvas-${selectedNote.id}-${selectedNote.updated_at}`}
                noteId={selectedNote.id}
                userId={userId}
                initialContent={selectedNote.content}
                onSave={handleNoteUpdate}
              />
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            Select a note or create a new one
          </div>
        )}
      </div>
    </div>
  );
}