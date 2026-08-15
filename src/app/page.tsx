"use client";

import React, { useState, useEffect } from "react";

interface RowData {
  rowNum: number;
  course: string;
  sec: string;
  room: string;
  day: string;
  time: string;
  teacher: string;
  status: "Valid" | "Missing Room" | "Missing Time" | "Invalid";
}

// Fallback high-fidelity mock data using exact excel headers
const MOCK_PREVIEW_ROWS: RowData[] = [
  { rowNum: 2, course: "CSE471", sec: "1", room: "10A22C", day: "Mon", time: "09:00-10:30", teacher: "AQU", status: "Valid" },
  { rowNum: 3, course: "CSE421", sec: "2", room: "7H24C", day: "Sun", time: "11:00-12:30", teacher: "MSMA", status: "Valid" },
  { rowNum: 4, course: "BIO100", sec: "L1", room: "TBD", day: "Wed", time: "14:00-15:30", teacher: "M.R.", status: "Missing Room" },
  { rowNum: 5, course: "MAT120", sec: "03", room: "NAC401", day: "Sun", time: "09:40-11:10", teacher: "L.H.", status: "Valid" },
];

export default function Home() {
  const [darkMode, setDarkMode] = useState(false);
  const [sheetId, setSheetId] = useState("1KtZhO9B5p7a1eYhlVZNknvuzxP-ssfYN-Gb9bBPhv7c");
  const [inputUrl, setInputUrl] = useState(`https://docs.google.com/spreadsheets/d/${sheetId}/edit`);
  const [isEditingUrl, setIsEditingUrl] = useState(false);
  const [range, setRange] = useState("Sheet1!A2:F");
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentRow, setCurrentRow] = useState(0);
  const [totalRows, setTotalRows] = useState(850);
  const [lastSync, setLastSync] = useState("Today, 08:45 AM");
  const [previewRows, setPreviewRows] = useState<RowData[]>(MOCK_PREVIEW_ROWS);
  const [autoSync, setAutoSync] = useState(true);
  const [frequency, setFrequency] = useState("Every 6 Hours");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Toggle Dark Mode
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  // Load preview data from backend or fallback to mock data on mount
  useEffect(() => {
    fetchPreview();
  }, []);

  const fetchPreview = async (targetSheetId = sheetId) => {
    try {
      const res = await fetch("/api/routine-intake/preview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": "demo-admin-key-123",
        },
        body: JSON.stringify({ sheetId: targetSheetId, range }),
      });
      if (res.ok) {
        const data = await res.json();
        const mapped: RowData[] = [];
        let count = 2;
        if (data.parsed && Array.isArray(data.parsed)) {
          data.parsed.forEach((r: any) => {
            mapped.push({
              rowNum: count++,
              course: r.courseCode || "N/A",
              sec: r.sectionNo || "N/A",
              room: r.roomNumber || "TBD",
              day: r.day ? ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][r.day - 1] : "N/A",
              time: `${r.startTime || ""}-${r.endTime || ""}`,
              teacher: r.teacherInitials || "N/A",
              status: r.roomNumber && r.roomNumber !== "TBD" ? "Valid" : "Missing Room",
            });
          });
        }
        if (data.failed && Array.isArray(data.failed)) {
          data.failed.forEach((f: any) => {
            mapped.push({
              rowNum: count++,
              course: f.row[0] || "N/A",
              sec: f.row[1] || "N/A",
              room: f.row[2] || "TBD",
              day: f.row[3] || "N/A",
              time: f.row[4] || "N/A",
              teacher: f.row[5] || "N/A",
              status: "Invalid",
            });
          });
        }
        if (mapped.length > 0) {
          setPreviewRows(mapped);
          setTotalRows(mapped.length);
        }
      }
    } catch (err) {
      console.log("Failed to fetch live preview, using mock data", err);
    }
  };

  const handleSaveUrl = () => {
    if (isEditingUrl) {
      const parts = inputUrl.split("/d/");
      let extractedId = sheetId;
      if (parts[1]) {
        extractedId = parts[1].split("/")[0];
      } else if (inputUrl.trim().length > 0) {
        extractedId = inputUrl.trim();
      }
      setSheetId(extractedId);
      setInputUrl(`https://docs.google.com/spreadsheets/d/${extractedId}/edit`);
      setIsEditingUrl(false);
      fetchPreview(extractedId);
    } else {
      setIsEditingUrl(true);
    }
  };

  const handleSync = async () => {
    if (syncing) return;
    setSyncing(true);
    setProgress(0);
    setCurrentRow(0);
    setMessage(null);

    // Simulate progress counting up visually to 850 rows as per design layout
    const interval = setInterval(() => {
      setCurrentRow((prev) => {
        const next = prev + Math.floor(Math.random() * 50) + 10;
        if (next >= totalRows) {
          clearInterval(interval);
          return totalRows;
        }
        setProgress(Math.min((next / totalRows) * 100, 95));
        return next;
      });
    }, 150);

    try {
      const res = await fetch("/api/routine-intake/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": "demo-admin-key-123",
        },
        body: JSON.stringify({ sheetId, range }),
      });

      clearInterval(interval);
      setCurrentRow(totalRows);
      setProgress(100);

      if (res.ok) {
        const result = await res.json();
        setMessage({
          type: "success",
          text: `Sync completed successfully! Processed ${result.rowsRead} rows (${result.rowsUpserted} upserted, ${result.rowsFailed} failed).`,
        });
        const now = new Date();
        setLastSync(`Today, ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
        fetchPreview();
      } else {
        const errData = await res.json().catch(() => ({}));
        setMessage({
          type: "error",
          text: errData.message || "Failed to execute intake routine database ingestion.",
        });
      }
    } catch (err) {
      clearInterval(interval);
      setMessage({
        type: "error",
        text: "Network error occurred while executing sync routine.",
      });
    } finally {
      setTimeout(() => {
        setSyncing(false);
      }, 500);
    }
  };

  return (
    <div className="min-h-screen bg-transparent font-sans text-slate-800 transition-colors duration-200 dark:text-slate-200">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white px-8 py-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <button className="flex h-10 w-10 flex-col items-center justify-center gap-1 rounded bg-[#EBF1F5] dark:bg-zinc-800">
              <span className="h-0.5 w-5 bg-slate-600 dark:bg-white"></span>
              <span className="h-0.5 w-5 bg-slate-600 dark:bg-white"></span>
              <span className="h-0.5 w-5 bg-slate-600 dark:bg-white"></span>
            </button>
            <div className="flex flex-col">
              <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white font-manrope">ClassConnect</span>
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-hanken">Academic Portal</span>
            </div>
          </div>
          <div className="flex items-center gap-3 font-hanken">
            <button className="rounded bg-[#003B46] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#00272e]">
              Routine
            </button>
            <button className="rounded bg-[#E0E8F5] px-5 py-2 text-sm font-semibold text-[#003B46] transition hover:bg-slate-200 dark:bg-zinc-800 dark:text-white">
              Notes
            </button>
            <button className="rounded bg-[#E0E8F5] px-5 py-2 text-sm font-semibold text-[#003B46] transition hover:bg-slate-200 dark:bg-zinc-800 dark:text-white">
              Chat
            </button>
            <button className="rounded bg-[#E0E8F5] px-5 py-2 text-sm font-semibold text-[#003B46] transition hover:bg-slate-200 dark:bg-zinc-800 dark:text-white">
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-7xl px-8 py-8">
        {/* Dark Mode Toggle */}
        <div className="flex justify-end mb-6">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#003B46] text-white transition hover:bg-[#00272e]"
            title="Toggle theme"
          >
            {darkMode ? (
              <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.46 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 100 2h1z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
              </svg>
            )}
          </button>
        </div>

        {/* Top Navigation Grid Cards */}
        <section className="mb-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { title: "Class Schedule" },
            { title: "Canvas" },
            { title: "Notes and Material" },
            { title: "Group Chats" },
          ].map((card, idx) => (
            <div
              key={idx}
              className="flex h-44 items-center justify-center rounded-xl bg-[#C9D6D3] text-[#1e342e] shadow-sm transition duration-200 hover:scale-[1.02] hover:shadow-md cursor-pointer"
            >
              <span className="text-xl font-bold tracking-tight text-center font-manrope">{card.title}</span>
            </div>
          ))}
        </section>

        {/* Feature Sub-header */}
        <section className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h2 className="text-3xl font-extrabold text-[#003B46] dark:text-white font-manrope">Automated Routine Intake</h2>
            <div className="mt-1 flex items-center gap-2 text-sm text-[#64748B] dark:text-slate-400 font-hanken">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2a8.001 8.001 0 1121.21 8H17" />
              </svg>
              <span>Spreadsheet Integration & Parser</span>
            </div>
          </div>
          <div className="flex items-center gap-4 font-hanken">
            <div className="text-right">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Last Sync Status</span>
              <div className="flex items-center gap-1.5 justify-end">
                <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse"></span>
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{lastSync}</span>
              </div>
            </div>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-2 rounded bg-[#003B46] px-5 py-3 text-sm font-semibold text-white shadow transition hover:bg-[#00272e] disabled:opacity-50"
            >
              <svg className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2a8.001 8.001 0 1121.21 8H17" />
              </svg>
              Sync Now
            </button>
          </div>
        </section>

        {/* Global Feedback Banner */}
        {message && (
          <div className={`mb-6 rounded-lg p-4 text-sm font-medium border shadow-sm transition font-hanken ${
            message.type === "success" 
              ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900" 
              : "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-900"
          }`}>
            {message.text}
          </div>
        )}

        {/* Ingest Progress bar */}
        {syncing && (
          <div className="mb-8 rounded-xl border border-slate-200 bg-[#EBF1F5] p-6 shadow-inner dark:border-zinc-800 dark:bg-zinc-900/50">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <svg className="h-5 w-5 animate-spin text-[#003B46]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="font-bold text-[#003B46] dark:text-[#C9D6D3]">Intake Script Running...</span>
              </div>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                Parsing row {currentRow} of {totalRows}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-zinc-800">
              <div
                className="h-full bg-[#003B46] transition-all duration-150 ease-out"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Dashboard Grid Sections */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Raw Data Preview */}
          <div className="lg:col-span-2">
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              {/* Card Header */}
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-zinc-800">
                <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-white font-manrope">
                  <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                  <span>Raw Data Preview</span>
                </div>
                <div className="flex items-center gap-2 rounded border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:border-zinc-800 dark:bg-zinc-800 dark:text-slate-300 font-hanken">
                  <span>Sheet: Fall_Schedule_Master</span>
                  <svg className="h-3 w-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {/* Table Data */}
              <div className="overflow-x-auto font-hanken">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-400 dark:bg-zinc-900/50">
                      <th className="px-6 py-3">Row #</th>
                      <th className="px-6 py-3">Course</th>
                      <th className="px-6 py-3">Sec</th>
                      <th className="px-6 py-3">Room</th>
                      <th className="px-6 py-3">Day</th>
                      <th className="px-6 py-3">Time</th>
                      <th className="px-6 py-3">Teacher</th>
                      <th className="px-6 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                    {previewRows.map((row) => (
                      <tr key={row.rowNum} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/30">
                        <td className="px-6 py-4 font-semibold text-slate-400">{row.rowNum}</td>
                        <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">{row.course}</td>
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{row.sec}</td>
                        <td className={`px-6 py-4 font-semibold ${row.room === "TBD" ? "text-rose-500 font-bold" : ""}`}>
                          {row.room}
                        </td>
                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{row.day}</td>
                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{row.time}</td>
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{row.teacher}</td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
                              row.status === "Valid"
                                ? "bg-[#E6F4EA] text-[#137333]"
                                : "bg-[#FCE8E6] text-[#C5221F]"
                            }`}
                          >
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Table Footer */}
              <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4 dark:border-zinc-800 font-hanken">
                <span className="text-xs text-slate-400">
                  Showing {previewRows.length} of {totalRows} rows
                </span>
                <div className="flex items-center gap-1">
                  <button className="rounded border border-slate-200 p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-600 dark:border-zinc-800 dark:hover:bg-zinc-800">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button className="rounded border border-slate-200 p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-600 dark:border-zinc-800 dark:hover:bg-zinc-800">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Sidebar Controls */}
          <div className="flex flex-col gap-6">
            {/* DataSource Link Card */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center gap-2 font-bold mb-4 font-manrope">
                <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                <span>DataSource Link</span>
              </div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 font-hanken">
                Google Sheets URL
              </label>
              <input
                type="text"
                value={inputUrl}
                disabled={!isEditingUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                className="w-full rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:outline-[#003B46] dark:border-zinc-800 dark:bg-zinc-800 dark:text-slate-300 font-hanken disabled:opacity-75 disabled:cursor-not-allowed"
              />
              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-zinc-800/50 font-hanken">
                <div className="flex items-center gap-1.5">
                  <svg className="h-4 w-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Connected</span>
                </div>
                <button 
                  onClick={handleSaveUrl}
                  className="text-xs font-bold text-[#003B46] hover:text-[#00272e]"
                >
                  {isEditingUrl ? "Save" : "Edit"}
                </button>
              </div>
            </div>

            {/* Routine Schedule Card */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center gap-2 font-bold mb-6 font-manrope">
                <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Routine Schedule</span>
              </div>

              {/* Automated Sync Toggle */}
              <div className="flex items-center justify-between mb-5 font-hanken">
                <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">Automated Sync</span>
                <button
                  onClick={() => setAutoSync(!autoSync)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${
                    autoSync ? "bg-[#003B46]" : "bg-slate-200 dark:bg-zinc-800"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                      autoSync ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {/* Frequency dropdown */}
              <div className="mb-5 font-hanken">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Frequency
                </label>
                <div className="relative">
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value)}
                    disabled={!autoSync}
                    className="w-full appearance-none rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:outline-none disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-800 dark:text-slate-300"
                  >
                    <option>Every 2 Hours</option>
                    <option>Every 6 Hours</option>
                    <option>Every 12 Hours</option>
                    <option>Every 24 Hours</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Next Run Info */}
              <div className="border-t border-slate-100 pt-4 dark:border-zinc-800/50 font-hanken">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Next Run</span>
                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  {autoSync ? "Today, 02:45 PM" : "Disabled"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
