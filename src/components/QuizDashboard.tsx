import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, Users, Target, Award, ChevronDown, ChevronUp, LogIn, LogOut, ShieldCheck, RefreshCw } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User } from 'firebase/auth';
import { collection, onSnapshot, query, orderBy, getDocs, where } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { Language } from '../types';
import { translations } from '../translations';

interface QuizDashboardProps {
  lang: Language;
}

interface ParsedResult {
  id: string;
  quizTitle: string;
  studentName: string;
  score: number;
  totalQuestions: number;
  date: string;
  timeSpent?: number;
  startTime?: number;
  endTime?: number;
  attempts?: number;
  details: {
    question: string;
    selected: string;
    correct: string;
    isCorrect: boolean;
  }[];
}

export const QuizDashboard: React.FC<QuizDashboardProps> = ({ lang }) => {
  const [results, setResults] = useState<ParsedResult[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const t = translations[lang];

  const ADMIN_EMAIL = "oussamsabrou031@gmail.com";

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAdmin(currentUser?.email === ADMIN_EMAIL && currentUser?.emailVerified === true);
    });
    return () => unsubscribe();
  }, []);

  const fetchResults = async () => {
    console.log('fetchResults called, user:', user);
    if (user) {
      try {
        // Always filter by teacherId to ensure each teacher only sees their own students' results
        const q = query(collection(db, 'quiz_results'), where('teacherId', '==', user.uid), orderBy('date', 'desc'));
        
        const snapshot = await getDocs(q);
        console.log('Snapshot size:', snapshot.size);
        const firestoreResults = snapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as (ParsedResult & { teacherId?: string })[];
        
        console.log('Fetched results:', firestoreResults);
        setResults(firestoreResults);
      } catch (error) {
        console.error('Error fetching results:', error);
        handleFirestoreError(error, OperationType.LIST, 'quiz_results');
      }
    } else {
      // Fallback to local storage if not logged in
      const saved = localStorage.getItem('quiz_results');
      if (saved) setResults(JSON.parse(saved));
      console.log('Loaded from local storage:', saved);
    }
  };

  useEffect(() => {
    console.log('Dashboard state:', { isAdmin, user });
    fetchResults();
  }, [isAdmin, user]);

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error('Login error:', error);
      if (error.code === 'auth/popup-closed-by-user') {
        console.warn('The login window was closed before completing the login.');
      } else if (error.code === 'auth/popup-blocked') {
        console.error('The login window was blocked by your browser. Please allow popups for this site.');
      } else {
        console.error('Authentication error:', error.message);
      }
    }
  };

  const handleLogout = () => signOut(auth);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        parseCSV(text);
      };
      reader.readAsText(file);
    });
  };

  const parseCSV = (text: string) => {
    try {
      // Robust CSV parser that handles newlines within quotes
      const parseCSVText = (csvText: string) => {
        const rows: string[][] = [];
        let currentRow: string[] = [];
        let currentCell = '';
        let inQuotes = false;
        
        for (let i = 0; i < csvText.length; i++) {
          const char = csvText[i];
          const nextChar = csvText[i + 1];
          
          if (char === '"') {
            if (inQuotes && nextChar === '"') {
              // Escaped quote
              currentCell += '"';
              i++; // Skip next quote
            } else {
              // Toggle quotes
              inQuotes = !inQuotes;
            }
          } else if (char === ',' && !inQuotes) {
            // End of cell
            currentRow.push(currentCell);
            currentCell = '';
          } else if ((char === '\n' || (char === '\r' && nextChar === '\n')) && !inQuotes) {
            // End of row
            if (char === '\r') i++; // Skip \n
            currentRow.push(currentCell);
            rows.push(currentRow);
            currentRow = [];
            currentCell = '';
          } else {
            // Normal character
            currentCell += char;
          }
        }
        
        // Push last cell and row if not empty
        if (currentCell !== '' || currentRow.length > 0) {
          currentRow.push(currentCell);
          rows.push(currentRow);
        }
        
        return rows.filter(row => row.some(cell => cell.trim() !== ''));
      };

      const allRows = parseCSVText(text);
      if (allRows.length < 2) return;

      const dataRows = allRows.slice(1);
      if (dataRows.length === 0) return;

      // Extract metadata from the first row
      const firstRow = dataRows[0];
      const quizTitle = firstRow[0];
      const studentName = firstRow[1];
      const score = parseInt(firstRow[2], 10);
      const totalQuestions = parseInt(firstRow[3], 10);
      const date = firstRow[4];

      const details = dataRows.map(row => ({
        question: row[5] || '',
        selected: row[6] || '',
        correct: row[7] || '',
        isCorrect: row[8] === 'true'
      }));

      const newResult: ParsedResult = {
        id: crypto.randomUUID(),
        quizTitle,
        studentName,
        score,
        totalQuestions,
        date,
        details
      };

      setResults(prev => [...prev, newResult]);
    } catch (error) {
      console.error('Error parsing CSV', error);
    }
  };

  const totalParticipants = results.length;
  const averageScore = totalParticipants > 0 
    ? (results.reduce((acc, curr) => acc + (curr.score / curr.totalQuestions), 0) / totalParticipants) * 100 
    : 0;
  const passRate = totalParticipants > 0 
    ? (results.filter(r => (r.score / r.totalQuestions) >= 0.5).length / totalParticipants) * 100 
    : 0;

  const pieData = [
    { name: 'Pass', value: results.filter(r => (r.score / r.totalQuestions) >= 0.5).length, color: '#10b981' },
    { name: 'Fail', value: results.filter(r => (r.score / r.totalQuestions) < 0.5).length, color: '#ef4444' }
  ];

  const barData = results.map(r => ({
    name: r.studentName,
    score: (r.score / r.totalQuestions) * 100
  }));

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-black text-black dark:text-white tracking-tighter flex items-center gap-3">
            {t.dashboard}
            {isAdmin && <ShieldCheck className="text-primary" size={24} />}
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 font-medium mt-1">
            {isAdmin 
              ? (lang === 'ar' ? 'يتم عرض النتائج مباشرة من قاعدة البيانات' : 'Results are displayed live from the database')
              : (lang === 'ar' ? 'قم بتسجيل الدخول كمسؤول لعرض النتائج السحابية' : 'Log in as admin to view cloud results')}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {isAdmin && (
            <button 
              onClick={fetchResults}
              className="p-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 rounded-2xl hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all"
              title="Refresh"
            >
              <RefreshCw size={20} />
            </button>
          )}
          {!user ? (
            <div className="flex flex-col items-end gap-2">
              <button 
                onClick={handleLogin}
                className="px-6 py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl font-black shadow-lg hover:scale-105 transition-all flex items-center gap-2"
              >
                <LogIn size={20} />
                <span>{lang === 'ar' ? 'دخول المسؤول' : 'Admin Login'}</span>
              </button>
              <p className="text-xs text-zinc-500 font-medium">
                {lang === 'ar' ? 'إذا كنت المسؤول، يرجى تسجيل الدخول' : 'If you are an admin, please log in'}
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <div className="text-right hidden md:block">
                <p className="text-xs font-black text-accent uppercase tracking-widest">{user.displayName}</p>
                <p className="text-[10px] text-zinc-500 truncate max-w-[150px]">{user.email}</p>
              </div>
              <button 
                onClick={handleLogout}
                className="p-3 bg-zinc-100 dark:bg-zinc-800 text-red-500 rounded-2xl hover:bg-red-50 transition-all"
                title="Logout"
              >
                <LogOut size={20} />
              </button>
            </div>
          )}

          {!isAdmin && (
            <>
              <input 
                type="file" 
                accept=".csv" 
                multiple 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                className="hidden" 
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="px-6 py-3 bg-primary text-white rounded-2xl font-black shadow-lg shadow-primary/20 hover:scale-105 transition-all flex items-center gap-2"
              >
                <Upload size={20} />
                <span>{t.importResults}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {results.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-[2.5rem]">
          <div className="w-24 h-24 bg-zinc-50 dark:bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-8">
            <Upload size={48} className="text-zinc-300 dark:text-zinc-700" />
          </div>
          <p className="text-xl font-black text-zinc-400 dark:text-zinc-600">{t.noData}</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] border-2 border-zinc-100 dark:border-zinc-800 shadow-sm flex items-center gap-6">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-900/20 text-blue-500 flex items-center justify-center flex-shrink-0">
                <Users size={32} />
              </div>
              <div>
                <p className="text-sm font-bold text-zinc-500 uppercase tracking-widest">{t.totalParticipants}</p>
                <p className="text-3xl font-black text-black dark:text-white">{totalParticipants}</p>
              </div>
            </div>
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] border-2 border-zinc-100 dark:border-zinc-800 shadow-sm flex items-center gap-6">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 flex items-center justify-center flex-shrink-0">
                <Target size={32} />
              </div>
              <div>
                <p className="text-sm font-bold text-zinc-500 uppercase tracking-widest">{t.averageScore}</p>
                <p className="text-3xl font-black text-black dark:text-white">{averageScore.toFixed(1)}%</p>
              </div>
            </div>
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] border-2 border-zinc-100 dark:border-zinc-800 shadow-sm flex items-center gap-6">
              <div className="w-16 h-16 rounded-2xl bg-purple-50 dark:bg-purple-900/20 text-purple-500 flex items-center justify-center flex-shrink-0">
                <Award size={32} />
              </div>
              <div>
                <p className="text-sm font-bold text-zinc-500 uppercase tracking-widest">{t.passRate}</p>
                <p className="text-3xl font-black text-black dark:text-white">{passRate.toFixed(1)}%</p>
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] border-2 border-zinc-100 dark:border-zinc-800 shadow-sm lg:col-span-1">
              <h3 className="text-xl font-black text-black dark:text-white mb-6 text-center">{t.passRate}</h3>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
                      itemStyle={{ fontWeight: 'bold' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-6 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-sm font-bold text-zinc-600 dark:text-zinc-400">Pass</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <span className="text-sm font-bold text-zinc-600 dark:text-zinc-400">Fail</span>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] border-2 border-zinc-100 dark:border-zinc-800 shadow-sm lg:col-span-2">
              <h3 className="text-xl font-black text-black dark:text-white mb-6">{t.score} (%)</h3>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData}>
                    <XAxis dataKey="name" tick={{ fill: '#71717a', fontWeight: 'bold', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#71717a', fontWeight: 'bold', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip 
                      cursor={{ fill: 'rgba(16, 185, 129, 0.05)' }}
                      contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
                    />
                    <Bar dataKey="score" fill="#10b981" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] border-2 border-zinc-100 dark:border-zinc-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50 dark:bg-zinc-800/50 border-b-2 border-zinc-100 dark:border-zinc-800">
                    <th className="p-6 text-xs font-black text-zinc-500 uppercase tracking-widest">{t.studentName}</th>
                    <th className="p-6 text-xs font-black text-zinc-500 uppercase tracking-widest">Quiz</th>
                    <th className="p-6 text-xs font-black text-zinc-500 uppercase tracking-widest">{t.score}</th>
                    <th className="p-6 text-xs font-black text-zinc-500 uppercase tracking-widest">{t.date}</th>
                    <th className="p-6 text-xs font-black text-zinc-500 uppercase tracking-widest">Start Time</th>
                    <th className="p-6 text-xs font-black text-zinc-500 uppercase tracking-widest">End Time</th>
                    <th className="p-6 text-xs font-black text-zinc-500 uppercase tracking-widest">Attempts</th>
                    <th className="p-6 text-xs font-black text-zinc-500 uppercase tracking-widest">Time (s)</th>
                    <th className="p-6 text-xs font-black text-zinc-500 uppercase tracking-widest text-right">{t.details}</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((result) => (
                    <React.Fragment key={result.id}>
                      <tr className="border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-colors">
                        <td className="p-6 font-bold text-black dark:text-white">{result.studentName}</td>
                        <td className="p-6 font-medium text-zinc-600 dark:text-zinc-400">{result.quizTitle}</td>
                        <td className="p-6">
                          <span className={`inline-flex px-3 py-1 rounded-full text-xs font-black ${
                            (result.score / result.totalQuestions) >= 0.5 
                              ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' 
                              : 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'
                          }`}>
                            {((result.score / result.totalQuestions) * 100).toFixed(0)}%
                          </span>
                        </td>
                        <td className="p-6 font-medium text-zinc-500 text-sm">
                          {new Date(result.date).toLocaleDateString()}
                        </td>
                        <td className="p-6 font-medium text-zinc-500 text-sm">
                          {result.startTime ? new Date(result.startTime).toLocaleTimeString() : '-'}
                        </td>
                        <td className="p-6 font-medium text-zinc-500 text-sm">
                          {result.endTime ? new Date(result.endTime).toLocaleTimeString() : '-'}
                        </td>
                        <td className="p-6 font-medium text-zinc-500 text-sm">
                          {result.attempts || 1}
                        </td>
                        <td className="p-6 font-medium text-zinc-500 text-sm">
                          {result.timeSpent || '-'}s
                        </td>
                        <td className="p-6 text-right">
                          <button 
                            onClick={() => setExpandedRow(expandedRow === result.id ? null : result.id)}
                            className="p-2 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-black dark:hover:text-white transition-colors inline-flex"
                          >
                            {expandedRow === result.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                          </button>
                        </td>
                      </tr>
                      <AnimatePresence>
                        {expandedRow === result.id && (
                          <tr className="bg-zinc-50/50 dark:bg-zinc-900/50">
                            <td colSpan={9} className="p-0">
                              <motion.div 
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="p-6 md:p-8">
                                  <div className="grid grid-cols-1 gap-4">
                                    {result.details.map((detail, idx) => (
                                      <div key={idx} className={`p-4 rounded-2xl border-2 ${detail.isCorrect ? 'border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-900/10' : 'border-red-500/20 bg-red-50/50 dark:bg-red-900/10'}`}>
                                        <p className="font-bold text-black dark:text-white mb-3">{idx + 1}. {detail.question}</p>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                          <div>
                                            <span className="text-zinc-500 font-bold block mb-1">Selected:</span>
                                            <span className={`font-medium ${detail.isCorrect ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                              {detail.selected || '(No answer)'}
                                            </span>
                                          </div>
                                          <div>
                                            <span className="text-zinc-500 font-bold block mb-1">Correct Answer:</span>
                                            <span className="font-medium text-emerald-600 dark:text-emerald-400">
                                              {detail.correct}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </motion.div>
                            </td>
                          </tr>
                        )}
                      </AnimatePresence>
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default QuizDashboard;
