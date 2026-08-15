'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

interface Material {
  material_id: number;
  title: string;
  category_name: string;
  file_size_bytes?: number;
  created_at: string;
  file_url: string;
}

interface OpenLibraryBook {
  key: string;
  title: string;
  author_name?: string[];
  first_publish_year?: number;
}

const CATEGORIES = [
  { id: 1, name: 'Syllabus', color: 'bg-blue-500' },
  { id: 2, name: 'Slides', color: 'bg-yellow-400' },
  { id: 3, name: 'Lecture', color: 'bg-red-500' },
  { id: 4, name: 'Reference Book', color: 'bg-emerald-500' },
];

export default function NotesAndMaterialsPage() {
  const [materials, setMaterials] = useState<Material[]>([
    {
      material_id: 101,
      title: 'CSE421: Operating System Concepts (Silberschatz 10th Ed)',
      category_name: 'Reference Book',
      file_size_bytes: 15728640,
      created_at: new Date().toISOString(),
      file_url: 'https://openlibrary.org/works/OL2723653W',
    },
  ]);

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showOpenLibraryModal, setShowOpenLibraryModal] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number>(2); // Default to Slides
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Open Library API State
  const [bookQuery, setBookQuery] = useState('');
  const [bookResults, setBookResults] = useState<OpenLibraryBook[]>([]);
  const [isSearchingBooks, setIsSearchingBooks] = useState(false);

  const fetchMaterials = async () => {
    try {
      const res = await fetch('/api/admin/materials');
      const data = await res.json();
      if (data.success && Array.isArray(data.data) && data.data.length > 0) {
        // Clean up old sample flower links from earlier test rows
        const cleanedData = data.data.map((item: Material) => ({
          ...item,
          file_url: item.file_url.includes('cloudinary.com/demo')
            ? '#'
            : item.file_url,
        }));
        setMaterials(cleanedData);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchMaterials();
  }, []);

  // Open Library API Search
  const handleSearchOpenLibrary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookQuery) return;
    setIsSearchingBooks(true);
    try {
      const res = await fetch(
        `https://openlibrary.org/search.json?q=${encodeURIComponent(bookQuery)}&limit=5`
      );
      const data = await res.json();
      setBookResults(data.docs || []);
    } catch (err) {
      console.error('Open Library API Error:', err);
    } finally {
      setIsSearchingBooks(false);
    }
  };

  const handleSaveBookFromOpenLibrary = async (book: OpenLibraryBook) => {
    const bookTitle = `${book.title} ${
      book.author_name ? `by ${book.author_name[0]}` : ''
    }`;
    const bookUrl = `https://openlibrary.org${book.key}`;

    try {
      const res = await fetch('/api/admin/materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: bookTitle,
          file_url: bookUrl,
          category_id: 4,
          course_id: 1,
          uploaded_by: 3,
        }),
      });

      const data = await res.json();
      if (data.success && data.material) {
        setMaterials((prev) => [data.material, ...prev]);
      } else {
        setMaterials((prev) => [
          {
            material_id: Date.now(),
            title: bookTitle,
            category_name: 'Reference Book',
            file_size_bytes: 2097152,
            created_at: new Date().toISOString(),
            file_url: bookUrl,
          },
          ...prev,
        ]);
      }
    } catch (err) {
      setMaterials((prev) => [
        {
          material_id: Date.now(),
          title: bookTitle,
          category_name: 'Reference Book',
          file_size_bytes: 2097152,
          created_at: new Date().toISOString(),
          file_url: bookUrl,
        },
        ...prev,
      ]);
    } finally {
      setShowOpenLibraryModal(false);
      setBookQuery('');
      setBookResults([]);
    }
  };

  // File Upload Handler
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      alert('Please select a file to upload.');
      return;
    }

    setIsUploading(true);

    // Create an instant local Blob URL for immediate preview
    const localBlobUrl = URL.createObjectURL(selectedFile);
    const categoryName =
      CATEGORIES.find((c) => c.id === selectedCategoryId)?.name || 'Slides';
    const displayTitle = title.trim() || selectedFile.name;

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('title', displayTitle);
    formData.append('category_id', String(selectedCategoryId));

    try {
      const res = await fetch('/api/admin/materials', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.success && data.material) {
        const newEntry: Material = {
          ...data.material,
          file_url: localBlobUrl || data.material.file_url,
        };
        setMaterials((prev) => [newEntry, ...prev]);
      } else {
        setMaterials((prev) => [
          {
            material_id: Date.now(),
            title: displayTitle,
            category_name: categoryName,
            file_size_bytes: selectedFile.size,
            created_at: new Date().toISOString(),
            file_url: localBlobUrl,
          },
          ...prev,
        ]);
      }
    } catch (err) {
      setMaterials((prev) => [
        {
          material_id: Date.now(),
          title: displayTitle,
          category_name: categoryName,
          file_size_bytes: selectedFile.size,
          created_at: new Date().toISOString(),
          file_url: localBlobUrl,
        },
        ...prev,
      ]);
    } finally {
      setIsUploading(false);
      setTitle('');
      setSelectedFile(null);
      setShowUploadModal(false);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A';
    if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
    return `${(bytes / 1024).toFixed(0)} KB`;
  };

  const getCategoryDot = (catName: string) => {
    const matched = CATEGORIES.find(
      (c) =>
        c.name.toLowerCase() === catName.toLowerCase() ||
        catName.toLowerCase().includes(c.name.toLowerCase())
    );
    return matched ? matched.color : 'bg-gray-400';
  };

  return (
    <div className="min-h-screen bg-[#4B4B4B] text-white flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="bg-[#384364] px-6 py-3 flex items-center justify-between border-b border-gray-600">
        <div className="flex items-center gap-4">
          <button className="p-1 rounded bg-[#4C5880] hover:bg-slate-600">
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
          <span className="text-xl font-bold tracking-wide text-white">
            Class connect
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/routine"
            className="px-5 py-1.5 rounded-full border border-slate-400 bg-[#4C5880] text-sm text-gray-200 hover:bg-slate-600"
          >
            Routine
          </Link>
          <Link
            href="/admin/materials"
            className="px-5 py-1.5 rounded-full border border-slate-300 bg-[#596898] text-sm text-white font-semibold"
          >
            Notes
          </Link>
          <button className="px-5 py-1.5 rounded-full border border-slate-400 bg-[#4C5880] text-sm text-gray-200 hover:bg-slate-600">
            Chat
          </button>
          <button className="px-5 py-1.5 rounded-full border border-slate-400 bg-[#4C5880] text-sm text-gray-200 hover:bg-slate-600">
            Logout
          </button>
        </div>
      </header>

      {/* Sub-header Banner */}
      <div className="bg-[#2D3550] px-6 py-2.5 flex items-center justify-between text-white shadow-md">
        <button className="text-xl font-bold px-2 hover:opacity-80">‹</button>
        <h1 className="text-xl font-serif tracking-wide text-slate-200">
          Notes and Materials
        </h1>
        <div className="w-6"></div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 p-8 max-w-6xl w-full mx-auto relative">
        <div className="bg-[#3B3B3B] rounded-2xl overflow-hidden border border-gray-600 shadow-xl max-w-4xl mx-auto">
          <table className="w-full text-left text-xs text-gray-200 border-collapse">
            <thead className="bg-[#484848] text-gray-300 border-b border-gray-600 font-semibold">
              <tr>
                <th className="py-3 px-6 border-r border-gray-600">File Name</th>
                <th className="py-3 px-6 border-r border-gray-600">Category</th>
                <th className="py-3 px-6 border-r border-gray-600">File Size</th>
                <th className="py-3 px-6">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-600">
              {materials.map((m) => (
                <tr
                  key={m.material_id}
                  className="hover:bg-[#434343] transition-colors"
                >
                  <td className="py-3 px-6 border-r border-gray-600 underline cursor-pointer text-gray-200 hover:text-white">
                    <a href={m.file_url} target="_blank" rel="noreferrer">
                      {m.title}
                    </a>
                  </td>
                  <td className="py-3 px-6 border-r border-gray-600">
                    <div className="flex items-center justify-between">
                      <span>{m.category_name}</span>
                      <span
                        className={`w-3 h-3 rounded-full ${getCategoryDot(
                          m.category_name
                        )}`}
                      ></span>
                    </div>
                  </td>
                  <td className="py-3 px-6 border-r border-gray-600 text-gray-300">
                    {formatFileSize(m.file_size_bytes)}
                  </td>
                  <td className="py-3 px-6 text-gray-300">
                    {new Date(m.created_at || Date.now()).toLocaleDateString(
                      'en-US',
                      {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      }
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Action Buttons */}
        <div className="fixed bottom-10 right-10 flex gap-4">
          <button
            onClick={() => setShowOpenLibraryModal(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 transition text-sm"
          >
            <span>📚</span> Search Open Library API
          </button>
          <button
            onClick={() => setShowUploadModal(true)}
            className="bg-gray-200 hover:bg-white text-gray-900 font-semibold px-8 py-3 rounded-2xl shadow-lg flex items-center gap-2 transition text-sm"
          >
            <span className="text-xl font-bold">+</span> Upload
          </button>
        </div>
      </main>

      {/* Open Library Books API Modal */}
      {showOpenLibraryModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#D1D5DB] text-gray-900 rounded-3xl p-6 max-w-xl w-full shadow-2xl border-2 border-emerald-500">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-800">
                Search Books (Open Library API)
              </h2>
              <button
                onClick={() => setShowOpenLibraryModal(false)}
                className="text-xl font-bold text-gray-600"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSearchOpenLibrary} className="flex gap-2 mb-4">
              <input
                type="text"
                placeholder="Search reference book (e.g. Operating Systems)..."
                value={bookQuery}
                onChange={(e) => setBookQuery(e.target.value)}
                className="flex-1 p-2.5 rounded-xl border border-gray-400 text-sm bg-white text-gray-900"
              />
              <button
                type="submit"
                className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-emerald-700"
              >
                {isSearchingBooks ? 'Searching...' : 'Search'}
              </button>
            </form>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {bookResults.map((book) => (
                <div
                  key={book.key}
                  className="p-3 bg-white rounded-xl border border-gray-300 flex items-center justify-between"
                >
                  <div>
                    <p className="font-bold text-sm text-gray-900">
                      {book.title}
                    </p>
                    <p className="text-xs text-gray-600">
                      {book.author_name
                        ? book.author_name.join(', ')
                        : 'Unknown Author'}
                    </p>
                  </div>
                  <button
                    onClick={() => handleSaveBookFromOpenLibrary(book)}
                    className="bg-indigo-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-indigo-700 font-semibold"
                  >
                    + Add Reference
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Upload Files Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#D8D8D8] text-gray-900 rounded-3xl p-8 max-w-xl w-full relative shadow-2xl border-4 border-sky-400">
            <div className="flex items-center mb-4 relative">
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-2xl font-bold text-gray-700 absolute left-0 hover:opacity-75"
              >
                ‹
              </button>
              <h2 className="text-xl font-bold text-gray-800 tracking-wide w-full text-center uppercase">
                UPLOAD FILES
              </h2>
            </div>

            <div className="bg-[#EAEAEA] rounded-2xl p-6 border-2 border-dashed border-gray-400 text-center mb-6">
              <p className="text-gray-800 font-medium text-sm mb-1">
                Choose a file or drag and drop it here
              </p>
              <p className="text-gray-500 text-xs mb-4">
                JPEG, PNG, PDF and PPT, Upto 50MB
              </p>

              <input
                type="text"
                placeholder="Document Title (Optional)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full max-w-md mx-auto p-2 rounded-xl border border-gray-300 text-xs bg-white text-gray-900 mb-3 shadow-inner text-center"
              />

              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="hidden"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="bg-white border border-gray-400 hover:bg-gray-100 text-gray-800 text-xs font-semibold px-4 py-2 rounded-xl shadow-sm"
              >
                {selectedFile ? `Selected: ${selectedFile.name}` : 'Choose File'}
              </button>
            </div>

            <div className="flex justify-center mb-4">
              <div className="bg-[#6B7280] text-white px-8 py-1.5 rounded-full text-sm font-semibold shadow">
                Select Category :
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2 mb-8 text-center">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategoryId(cat.id)}
                  className={`flex flex-col items-center justify-center p-2 rounded-xl transition ${
                    selectedCategoryId === cat.id
                      ? 'bg-white shadow-md border-2 border-sky-500 scale-105'
                      : 'hover:bg-gray-200/60'
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-full ${cat.color} mb-1 shadow-sm`}
                  ></span>
                  <span className="text-xs font-semibold text-gray-800">
                    {cat.name}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex justify-center">
              <button
                onClick={handleUploadSubmit}
                disabled={isUploading}
                className="bg-[#6B7280] hover:bg-gray-700 text-white font-medium px-16 py-3 rounded-full text-base transition shadow-md"
              >
                {isUploading ? 'Uploading...' : 'Browse'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}