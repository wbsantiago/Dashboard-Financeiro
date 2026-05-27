/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Download, 
  Upload, 
  Trash2, 
  Sparkles, 
  ChevronLeft, 
  ChevronRight, 
  Calendar,
  DollarSign,
  PiggyBank,
  Check,
  RefreshCw,
  Coins,
  Settings,
  Eye,
  EyeOff,
  Sliders,
  LogIn,
  LogOut,
  Cloud,
  CloudOff,
  FolderHeart,
  Database,
  Chrome
} from 'lucide-react';

import { AppData, Expense, Revenue, CategoryBudget, MonthlyBudget } from './types';
import { loadAppData, saveAppData, exportDataAsJSON, importDataFromJSON, DEFAULT_CATEGORIES, INITIAL_MOCK_DATA } from './utils/storage';
import { formatCurrency, formatMonthName, getCurrentMonthStr, getInstallmentInfo } from './utils/format';

import { 
  db, 
  auth, 
  isFirebaseConfigured, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut,
  OperationType,
  handleFirestoreError
} from './utils/firebase';
import { collection, doc, setDoc, onSnapshot, writeBatch, deleteDoc } from 'firebase/firestore';

// import components
import { KpiCards } from './components/KpiCards';
import { CategoryBudgets } from './components/CategoryBudgets';
import { ExpenseTracker } from './components/ExpenseTracker';
import { ChartsView } from './components/ChartsView';
import { AnnualSummary } from './components/AnnualSummary';

export default function App() {
  // Cloud Sync or Client-Side Local Storage toggle
  const [storageType, setStorageType] = useState<'local' | 'cloud'>(() => {
    return (localStorage.getItem('storage-type') || 'local') as 'local' | 'cloud';
  });
  const [user, setUser] = useState<any>(null);

  // Load initial state
  const [data, setData] = useState<AppData>(() => loadAppData());
  const [selectedMonth, setSelectedMonth] = useState<string>(() => getCurrentMonthStr()); // "2026-05"
  
  // UI States
  const [activeView, setActiveView] = useState<'monthly' | 'annual'>('monthly');
  const [showConfigPanel, setShowConfigPanel] = useState<boolean>(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [salaryInput, setSalaryInput] = useState<string>('');
  const [savingsInput, setSavingsInput] = useState<number>(30);
  const [showNotification, setShowNotification] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [privacyMode, setPrivacyMode] = useState<boolean>(() => {
    return localStorage.getItem('privacy-mode') === 'true';
  });
  const [hideMobileBudgets, setHideMobileBudgets] = useState<boolean>(() => {
    return localStorage.getItem('hide-mobile-budgets') === 'true';
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cloudFileInputRef = useRef<HTMLInputElement>(null);
  const [showDataMenu, setShowDataMenu] = useState<boolean>(false);
  const dataMenuRef = useRef<HTMLDivElement>(null);
  const [showProfileMenu, setShowProfileMenu] = useState<boolean>(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Click outside to close Data Menu and Profile Menu Dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dataMenuRef.current && !dataMenuRef.current.contains(event.target as Node)) {
        setShowDataMenu(false);
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // 1. Dynamic sync with Firebase cloud database OR LocalStorage fallback
  useEffect(() => {
    if (!isFirebaseConfigured || !auth || !db) {
      setUser(null);
      setStorageType('local');
      return;
    }

    const unsubscribeAuth = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Se houver um usuário autenticado, garante o modo 'cloud' imediatamente
        setStorageType('cloud');
        localStorage.setItem('storage-type', 'cloud');

        const userDocRef = doc(db!, 'users', currentUser.uid);
        
        // Listen to configuration and budgets
        const unsubProfile = onSnapshot(userDocRef, (snapshot) => {
          if (snapshot.exists()) {
            const profileData = snapshot.data();
            setData(prev => ({
              ...prev,
              categoryBudgets: profileData.categoryBudgets || prev.categoryBudgets,
              monthlyBudgets: profileData.monthlyBudgets || prev.monthlyBudgets,
              defaultMonthlySalary: profileData.defaultMonthlySalary ?? prev.defaultMonthlySalary,
              defaultTargetSavingsPercentage: profileData.defaultTargetSavingsPercentage ?? prev.defaultTargetSavingsPercentage,
            }));
          } else {
            // Bootstrap default budgets in Firebase User document (ignored Local Storage for pristine Cloud storage)
            const defaultData = INITIAL_MOCK_DATA;
            setDoc(userDocRef, {
              uid: currentUser.uid,
              categoryBudgets: defaultData.categoryBudgets,
              monthlyBudgets: defaultData.monthlyBudgets,
              defaultMonthlySalary: defaultData.defaultMonthlySalary,
              defaultTargetSavingsPercentage: defaultData.defaultTargetSavingsPercentage
            }, { merge: true }).catch(err => {
              console.error("Erro ao criar perfil:", err);
            });
          }
        }, (err) => handleFirestoreError(err, OperationType.GET, `users/${currentUser.uid}`));

        // Listen to expenses list
        const expensesColRef = collection(db!, 'users', currentUser.uid, 'expenses');
        const unsubExpenses = onSnapshot(expensesColRef, (snapshot) => {
          const expensesList: Expense[] = [];
          snapshot.forEach((doc) => {
            expensesList.push({ id: doc.id, ...doc.data() } as Expense);
          });
          expensesList.sort((a, b) => b.createdAt - a.createdAt);
          setData(prev => ({
            ...prev,
            expenses: expensesList
          }));
        }, (err) => handleFirestoreError(err, OperationType.LIST, `users/${currentUser.uid}/expenses`));

        // Listen to revenues list
        const revenuesColRef = collection(db!, 'users', currentUser.uid, 'revenues');
        const unsubRevenues = onSnapshot(revenuesColRef, (snapshot) => {
          const revenuesList: Revenue[] = [];
          snapshot.forEach((doc) => {
            revenuesList.push({ id: doc.id, ...doc.data() } as Revenue);
          });
          revenuesList.sort((a, b) => b.createdAt - a.createdAt);
          setData(prev => ({
            ...prev,
            revenues: revenuesList
          }));
        }, (err) => handleFirestoreError(err, OperationType.LIST, `users/${currentUser.uid}/revenues`));

        return () => {
          unsubProfile();
          unsubExpenses();
          unsubRevenues();
        };
      } else {
        // Fallback or Local offline mode when logged out
        setStorageType('local');
        localStorage.setItem('storage-type', 'local');
        const localData = loadAppData();
        setData(localData);
      }
    });

    return () => {
      unsubscribeAuth();
    };
  }, [storageType]);

  // Sync state changes with localStorage only under local mode
  useEffect(() => {
    if (storageType === 'local') {
      saveAppData(data);
    }
  }, [data, storageType]);

  // General-purpose data uploader to Cloud Firestore
  const uploadDataToCloud = async (uid: string, targetData: AppData, successMessage: string) => {
    if (!db) return;
    try {
      const cleanObject = (obj: any) => {
        const cleaned: any = {};
        Object.keys(obj).forEach((key) => {
          if (obj[key] !== undefined && obj[key] !== null) {
            cleaned[key] = obj[key];
          }
        });
        return cleaned;
      };
      
      // Upload configuration profile
      await setDoc(doc(db, 'users', uid), cleanObject({
        uid: uid,
        categoryBudgets: targetData.categoryBudgets,
        monthlyBudgets: targetData.monthlyBudgets || [],
        defaultMonthlySalary: targetData.defaultMonthlySalary,
        defaultTargetSavingsPercentage: targetData.defaultTargetSavingsPercentage
      }), { merge: true });

      // Firestore batches are limited to 500 documents per batch.
      // We partition documents into chunks of 400 to make the write transaction extremely safe.
      const chunkArray = (arr: any[], size: number): any[][] => {
        const chunks: any[][] = [];
        for (let i = 0; i < arr.length; i += size) {
          chunks.push(arr.slice(i, i + size));
        }
        return chunks;
      };

      // Upload expenses
      if (targetData.expenses && targetData.expenses.length > 0) {
        const expenseChunks = chunkArray(targetData.expenses, 400);
        for (const chunk of expenseChunks) {
          const batchExp = writeBatch(db);
          chunk.forEach(exp => {
            batchExp.set(doc(db, 'users', uid, 'expenses', exp.id), cleanObject(exp));
          });
          await batchExp.commit();
        }
      }

      // Upload revenues
      if (targetData.revenues && targetData.revenues.length > 0) {
        const revenueChunks = chunkArray(targetData.revenues, 400);
        for (const chunk of revenueChunks) {
          const batchRev = writeBatch(db);
          chunk.forEach(rev => {
            batchRev.set(doc(db, 'users', uid, 'revenues', rev.id), cleanObject(rev));
          });
          await batchRev.commit();
        }
      }

      triggerNotification(successMessage);
    } catch (err) {
      console.error('Erro ao enviar dados para a nuvem:', err);
      triggerNotification('Erro ao enviar dados para a nuvem.', 'error');
    }
  };

  // Bulk merge helper from local localStorage context state to Cloud FireStore standard
  const handleMergeLocalDataToCloud = async (uid: string) => {
    const localData = loadAppData();
    await uploadDataToCloud(
      uid, 
      localData, 
      'Sincronização realizada! Seus dados locais foram enviados para a nuvem! ☁️'
    );
  };

  const handleCloudImportButtonClick = () => {
    cloudFileInputRef.current?.click();
  };

  const handleCloudImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!user) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const fileContent = event.target?.result as string;
        const importedData = importDataFromJSON(fileContent);
        
        await uploadDataToCloud(
          user.uid, 
          importedData, 
          'Backup importado e gravado com sucesso no seu banco na Nuvem! ☁️'
        );
      } catch (err: any) {
        alert(`Falha na importação na nuvem: ${err.message || 'Formato de arquivo incorreto'}`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };


  useEffect(() => {
    localStorage.setItem('privacy-mode', String(privacyMode));
  }, [privacyMode]);

  useEffect(() => {
    localStorage.setItem('hide-mobile-budgets', String(hideMobileBudgets));
  }, [hideMobileBudgets]);

  // Load active month config values into inputs
  useEffect(() => {
    const activeBudget = getCurrentMonthBudget();
    setSalaryInput(activeBudget.salary.toString());
    setSavingsInput(activeBudget.targetSavingsPercentage);
  }, [selectedMonth, data]);

  // Helper toast notifier
  const triggerNotification = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setShowNotification({ message, type });
    setTimeout(() => {
      setShowNotification(null);
    }, 4000);
  };

  // Get active month budget data or bootstrap default
  const getCurrentMonthBudget = (): MonthlyBudget => {
    const budget = data.monthlyBudgets.find(b => b.month === selectedMonth);
    if (budget) return budget;
    
    // Fallback default structure
    return {
      month: selectedMonth,
      salary: data.defaultMonthlySalary,
      targetSavingsPercentage: data.defaultTargetSavingsPercentage
    };
  };

  const activeBudget = getCurrentMonthBudget();

  // Navigation handlers
  const handlePrevMonth = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const d = new Date(year, month - 2, 15);
    const prevStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonth(prevStr);
  };

  const handleNextMonth = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const d = new Date(year, month, 15);
    const nextStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonth(nextStr);
  };

  // Add / Delete core items
  const handleAddExpense = async (expenseData: Omit<Expense, 'id' | 'createdAt'>) => {
    if (storageType === 'cloud' && auth?.currentUser?.uid) {
      const uid = auth.currentUser.uid;
      if (expenseData.isInstallment && expenseData.totalInstallments && expenseData.currentInstallment) {
        const startInstallment = expenseData.currentInstallment;
        const totalInst = expenseData.totalInstallments;
        const baseMonth = expenseData.month; // e.g., "2026-05"
        const baseDate = expenseData.date; // e.g., "2026-05-15"
        
        const generatedExpenses: Expense[] = [];
        const now = Date.now();
        const shift = expenseData.firstInstallmentInNextMonth ? 1 : 0;
        
        for (let i = startInstallment; i <= totalInst; i++) {
          const offset = (i - startInstallment) + shift;
          const [y, m] = baseMonth.split('-').map(Number);
          const futDateObj = new Date(y, m - 1 + offset, 1);
          const futureMonth = `${futDateObj.getFullYear()}-${String(futDateObj.getMonth() + 1).padStart(2, '0')}`;
          
          const [, , d] = baseDate.split('-').map(Number);
          const dateObj = new Date(y, m - 1 + offset, d);
          const futureDate = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
          
          const parsedTitle = expenseData.title.trim();
          const hasInstallmentSuffix = /(?:\d+)\s*[\/／]\s*(?:\d+)$/.test(parsedTitle);
          const finalTitle = hasInstallmentSuffix ? parsedTitle : `${parsedTitle} ${i}/${totalInst}`;
          
          generatedExpenses.push({
            ...expenseData,
            id: `exp-${now}-${i}-${Math.random().toString(36).substr(2, 5)}`,
            title: finalTitle,
            currentInstallment: i,
            month: futureMonth,
            date: futureDate,
            createdAt: now
          });
        }
        
        const batch = writeBatch(db!);
        generatedExpenses.forEach(exp => {
          batch.set(doc(db!, 'users', uid, 'expenses', exp.id), exp);
        });
        await batch.commit().catch(err => handleFirestoreError(err, OperationType.WRITE, `users/${uid}/expenses`));
        triggerNotification(`Lançadas automaticamente ${generatedExpenses.length} parcelas na nuvem!`);
        
      } else {
        const newId = `exp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const newExpense: Expense = {
          ...expenseData,
          id: newId,
          createdAt: Date.now()
        };
        await setDoc(doc(db!, 'users', uid, 'expenses', newId), newExpense)
          .catch(err => handleFirestoreError(err, OperationType.WRITE, `users/${uid}/expenses/${newId}`));
        triggerNotification(`Lançamento "${expenseData.title}" adicionado na nuvem!`);
      }
    } else {
      // Local Storage Offline
      if (expenseData.isInstallment && expenseData.totalInstallments && expenseData.currentInstallment) {
        const startInstallment = expenseData.currentInstallment;
        const totalInst = expenseData.totalInstallments;
        const baseMonth = expenseData.month; // e.g., "2026-05"
        const baseDate = expenseData.date; // e.g., "2026-05-15"
        
        const generatedExpenses: Expense[] = [];
        const now = Date.now();
        const shift = expenseData.firstInstallmentInNextMonth ? 1 : 0;
        
        for (let i = startInstallment; i <= totalInst; i++) {
          const offset = (i - startInstallment) + shift;
          const [y, m] = baseMonth.split('-').map(Number);
          const futDateObj = new Date(y, m - 1 + offset, 1);
          const futureMonth = `${futDateObj.getFullYear()}-${String(futDateObj.getMonth() + 1).padStart(2, '0')}`;
          
          const [, , d] = baseDate.split('-').map(Number);
          const dateObj = new Date(y, m - 1 + offset, d);
          const futureDate = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
          
          const parsedTitle = expenseData.title.trim();
          const hasInstallmentSuffix = /(?:\d+)\s*[\/／]\s*(?:\d+)$/.test(parsedTitle);
          const finalTitle = hasInstallmentSuffix ? parsedTitle : `${parsedTitle} ${i}/${totalInst}`;

          generatedExpenses.push({
            ...expenseData,
            id: `exp-${now}-${i}-${Math.random().toString(36).substr(2, 5)}`,
            title: finalTitle,
            currentInstallment: i,
            month: futureMonth,
            date: futureDate,
            createdAt: now
          });
        }
        
        setData(prev => ({
          ...prev,
          expenses: [...generatedExpenses, ...prev.expenses]
        }));
        triggerNotification(`Lançadas automaticamente ${generatedExpenses.length} parcelas para "${expenseData.title}"!`);
        
      } else {
        const newExpense: Expense = {
          ...expenseData,
          id: `exp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          createdAt: Date.now()
        };

        setData(prev => ({
          ...prev,
          expenses: [newExpense, ...prev.expenses]
        }));
        triggerNotification(`Lançamento "${expenseData.title}" adicionado!`);
      }
    }
  };

  const handleDeleteExpense = async (id: string) => {
    const item = data.expenses.find(e => e.id === id);
    if (!item) return;

    if (storageType === 'cloud' && auth?.currentUser?.uid) {
      const uid = auth.currentUser.uid;
      if (item.isInstallment && item.createdAt) {
        const batch = writeBatch(db!);
        const related = data.expenses.filter(e => e.isInstallment && e.createdAt === item.createdAt);
        related.forEach(exp => {
          batch.delete(doc(db!, 'users', uid, 'expenses', exp.id));
        });
        await batch.commit().catch(err => handleFirestoreError(err, OperationType.DELETE, `users/${uid}/expenses`));
        const cleanTitle = item.title.replace(/\s*\d+\s*[\/／]\s*\d+\s*$/, '').trim();
        triggerNotification(`Lançamento parcelado "${cleanTitle}" e todas as suas parcelas foram excluídos da nuvem.`);
      } else {
        await deleteDoc(doc(db!, 'users', uid, 'expenses', id))
          .catch(err => handleFirestoreError(err, OperationType.DELETE, `users/${uid}/expenses/${id}`));
        triggerNotification(`Lançamento "${item.title}" removido da nuvem.`);
      }
    } else {
      // Local Storage Offline
      setData(prev => {
        let finalExpenses = prev.expenses;
        if (item.isInstallment && item.createdAt) {
          finalExpenses = prev.expenses.filter(e => !(e.isInstallment && e.createdAt === item.createdAt));
        } else {
          finalExpenses = prev.expenses.filter(e => e.id !== id);
        }
        return {
          ...prev,
          expenses: finalExpenses
        };
      });

      if (item.isInstallment && item.createdAt) {
        const cleanTitle = item.title.replace(/\s*\d+\s*[\/／]\s*\d+\s*$/, '').trim();
        triggerNotification(`Lançamento parcelado "${cleanTitle}" e todas as suas parcelas foram excluídos.`);
      } else {
        triggerNotification(`Lançamento "${item.title}" removido com sucesso.`);
      }
    }
  };

  const handleUpdateExpense = async (
    id: string, 
    updatedFields: Partial<Omit<Expense, 'id' | 'createdAt'>>,
    scope: 'single' | 'all' | 'rebuild' = 'single',
    rebuildParams?: {
      totalInstallments: number;
      firstInstallmentInNextMonth: boolean;
      installmentValueType: 'total' | 'single';
      rawValue: number;
    }
  ) => {
    const originalExpense = data.expenses.find(e => e.id === id);
    if (!originalExpense) return;

    if (storageType === 'cloud' && auth?.currentUser?.uid) {
      const uid = auth.currentUser.uid;

      if (scope === 'single') {
        const merged = { ...originalExpense, ...updatedFields };
        if (updatedFields.date) {
          merged.month = updatedFields.date.substring(0, 7);
        }
        await setDoc(doc(db!, 'users', uid, 'expenses', id), merged)
          .catch(err => handleFirestoreError(err, OperationType.UPDATE, `users/${uid}/expenses/${id}`));
      } 
      else if (scope === 'all') {
        const batch = writeBatch(db!);
        const related = data.expenses.filter(e => e.isInstallment && e.createdAt === originalExpense.createdAt);
        
        related.forEach(exp => {
          let finalTitle = updatedFields.title || exp.title;
          const rootTitle = finalTitle.replace(/\s*\d+\s*[\/／]\s*\d+\s*$/, '').trim();
          if (exp.currentInstallment && exp.totalInstallments) {
            finalTitle = `${rootTitle} ${exp.currentInstallment}/${exp.totalInstallments}`;
          }

          const merged = { 
            ...exp, 
            title: finalTitle,
            category: updatedFields.category ?? exp.category,
            value: updatedFields.value ?? exp.value
          };
          
          batch.set(doc(db!, 'users', uid, 'expenses', exp.id), merged);
        });

        await batch.commit().catch(err => handleFirestoreError(err, OperationType.UPDATE, `users/${uid}/expenses`));
      } 
      else if (scope === 'rebuild' && rebuildParams) {
        const batch = writeBatch(db!);
        const related = data.expenses.filter(e => e.isInstallment && e.createdAt === originalExpense.createdAt);
        related.forEach(exp => {
          batch.delete(doc(db!, 'users', uid, 'expenses', exp.id));
        });

        const startInstallment = 1;
        const totalInst = rebuildParams.totalInstallments;
        const baseMonth = updatedFields.date ? updatedFields.date.substring(0, 7) : originalExpense.month;
        const baseDate = updatedFields.date || originalExpense.date;
        const singlePrice = rebuildParams.installmentValueType === 'total' 
          ? rebuildParams.rawValue / totalInst 
          : rebuildParams.rawValue;

        const now = Date.now();
        const shift = rebuildParams.firstInstallmentInNextMonth ? 1 : 0;

        for (let i = startInstallment; i <= totalInst; i++) {
          const offset = (i - startInstallment) + shift;

          const [y, m] = baseMonth.split('-').map(Number);
          const futDateObj = new Date(y, m - 1 + offset, 1);
          const futureMonth = `${futDateObj.getFullYear()}-${String(futDateObj.getMonth() + 1).padStart(2, '0')}`;

          const [, , d] = baseDate.split('-').map(Number);
          const dateObj = new Date(y, m - 1 + offset, d);
          const futureDate = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;

          const rootTitle = (updatedFields.title || originalExpense.title).replace(/\s*\d+\s*[\/／]\s*\d+\s*$/, '').trim();
          const finalTitle = `${rootTitle} ${i}/${totalInst}`;

          const expData = {
            id: `exp-${now}-${i}-${Math.random().toString(36).substr(2, 5)}`,
            title: finalTitle,
            value: Number(singlePrice.toFixed(2)),
            category: updatedFields.category || originalExpense.category,
            month: futureMonth,
            isInstallment: true,
            totalInstallments: totalInst,
            currentInstallment: i,
            firstInstallmentInNextMonth: rebuildParams.firstInstallmentInNextMonth,
            date: futureDate,
            createdAt: now
          };

          batch.set(doc(db!, 'users', uid, 'expenses', expData.id), expData);
        }

        await batch.commit().catch(err => handleFirestoreError(err, OperationType.UPDATE, `users/${uid}/expenses`));
      }
    } else {
      // Local state update
      setData(prev => {
        let finalExpenses = [...prev.expenses];

        if (scope === 'single') {
          finalExpenses = prev.expenses.map(exp => {
            if (exp.id === id) {
              const merged = { ...exp, ...updatedFields };
              if (updatedFields.date) {
                merged.month = updatedFields.date.substring(0, 7);
              }
              return merged;
            }
            return exp;
          });
        } 
        else if (scope === 'all') {
          const related = prev.expenses.filter(e => e.isInstallment && e.createdAt === originalExpense.createdAt);
          const relatedIds = related.map(e => e.id);
          
          finalExpenses = prev.expenses.map(exp => {
            if (relatedIds.includes(exp.id)) {
              let finalTitle = updatedFields.title || exp.title;
              const rootTitle = finalTitle.replace(/\s*\d+\s*[\/／]\s*\d+\s*$/, '').trim();
              if (exp.currentInstallment && exp.totalInstallments) {
                finalTitle = `${rootTitle} ${exp.currentInstallment}/${exp.totalInstallments}`;
              }

              return {
                ...exp,
                title: finalTitle,
                category: updatedFields.category ?? exp.category,
                value: updatedFields.value ?? exp.value
              };
            }
            return exp;
          });
        } 
        else if (scope === 'rebuild' && rebuildParams) {
          const otherLeftovers = prev.expenses.filter(e => !(e.isInstallment && e.createdAt === originalExpense.createdAt));
          
          const startInstallment = 1;
          const totalInst = rebuildParams.totalInstallments;
          const baseMonth = updatedFields.date ? updatedFields.date.substring(0, 7) : originalExpense.month;
          const baseDate = updatedFields.date || originalExpense.date;
          const singlePrice = rebuildParams.installmentValueType === 'total' 
            ? rebuildParams.rawValue / totalInst 
            : rebuildParams.rawValue;

          const now = Date.now();
          const shift = rebuildParams.firstInstallmentInNextMonth ? 1 : 0;
          const generatedExpenses: Expense[] = [];

          for (let i = startInstallment; i <= totalInst; i++) {
            const offset = (i - startInstallment) + shift;

            const [y, m] = baseMonth.split('-').map(Number);
            const futDateObj = new Date(y, m - 1 + offset, 1);
            const futureMonth = `${futDateObj.getFullYear()}-${String(futDateObj.getMonth() + 1).padStart(2, '0')}`;

            const [, , d] = baseDate.split('-').map(Number);
            const dateObj = new Date(y, m - 1 + offset, d);
            const futureDate = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;

            const rootTitle = (updatedFields.title || originalExpense.title).replace(/\s*\d+\s*[\/／]\s*\d+\s*$/, '').trim();
            const finalTitle = `${rootTitle} ${i}/${totalInst}`;

            generatedExpenses.push({
              id: `exp-${now}-${i}-${Math.random().toString(36).substr(2, 5)}`,
              title: finalTitle,
              value: Number(singlePrice.toFixed(2)),
              category: updatedFields.category || originalExpense.category,
              month: futureMonth,
              isInstallment: true,
              totalInstallments: totalInst,
              currentInstallment: i,
              firstInstallmentInNextMonth: rebuildParams.firstInstallmentInNextMonth,
              date: futureDate,
              createdAt: now
            });
          }

          finalExpenses = [...generatedExpenses, ...otherLeftovers];
        }

        return { ...prev, expenses: finalExpenses };
      });
    }
    triggerNotification('Lançamento de saída atualizado com sucesso!');
  };

  const handleAddRevenue = async (revenueData: Omit<Revenue, 'id' | 'createdAt'>) => {
    if (storageType === 'cloud' && auth?.currentUser?.uid) {
      const uid = auth.currentUser.uid;
      const newId = `rev-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newRevenue: Revenue = {
        ...revenueData,
        id: newId,
        createdAt: Date.now()
      };
      await setDoc(doc(db!, 'users', uid, 'revenues', newId), newRevenue)
        .catch(err => handleFirestoreError(err, OperationType.WRITE, `users/${uid}/revenues/${newId}`));
      triggerNotification(`Rendimento "${revenueData.title}" adicionado na nuvem!`);
    } else {
      const newRevenue: Revenue = {
        ...revenueData,
        id: `rev-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        createdAt: Date.now()
      };

      setData(prev => ({
        ...prev,
        revenues: [newRevenue, ...(prev.revenues || [])]
      }));
      triggerNotification(`Rendimento "${revenueData.title}" adicionado!`);
    }
  };

  const handleDeleteRevenue = async (id: string) => {
    const item = (data.revenues || []).find(r => r.id === id);
    if (!item) return;

    if (storageType === 'cloud' && auth?.currentUser?.uid) {
      const uid = auth.currentUser.uid;
      await deleteDoc(doc(db!, 'users', uid, 'revenues', id))
        .catch(err => handleFirestoreError(err, OperationType.DELETE, `users/${uid}/revenues/${id}`));
      triggerNotification(`Rendimento "${item.title}" removido da nuvem.`);
    } else {
      setData(prev => ({
        ...prev,
        revenues: (prev.revenues || []).filter(r => r.id !== id)
      }));
      triggerNotification(`Rendimento "${item.title}" removido com sucesso.`);
    }
  };

  const handleUpdateRevenue = async (id: string, updatedFields: Partial<Omit<Revenue, 'id' | 'createdAt'>>) => {
    const originalRev = (data.revenues || []).find(r => r.id === id);
    if (!originalRev) return;

    if (storageType === 'cloud' && auth?.currentUser?.uid) {
      const uid = auth.currentUser.uid;
      const merged = { ...originalRev, ...updatedFields };
      if (updatedFields.date) {
        merged.month = updatedFields.date.substring(0, 7);
      }
      await setDoc(doc(db!, 'users', uid, 'revenues', id), merged)
        .catch(err => handleFirestoreError(err, OperationType.UPDATE, `users/${uid}/revenues/${id}`));
    } else {
      setData(prev => {
        const revenues = (prev.revenues || []).map(rev => {
          if (rev.id === id) {
            const merged = { ...rev, ...updatedFields };
            if (updatedFields.date) {
              merged.month = updatedFields.date.substring(0, 7);
            }
            return merged;
          }
          return rev;
        });
        return { ...prev, revenues };
      });
    }
    triggerNotification('Rendimento atualizado com sucesso!');
  };

  // Update ideal category limits
  const handleUpdateCategoryBudget = async (category: string, idealLimit: number) => {
    const budgetsCopy = [...data.categoryBudgets];
    const idx = budgetsCopy.findIndex(b => b.category === category);
    
    if (idx !== -1) {
      budgetsCopy[idx] = { category, idealLimit };
    } else {
      budgetsCopy.push({ category, idealLimit });
    }

    if (storageType === 'cloud' && auth?.currentUser?.uid) {
      const uid = auth.currentUser.uid;
      await setDoc(doc(db!, 'users', uid), {
        categoryBudgets: budgetsCopy
      }, { merge: true }).catch(err => handleFirestoreError(err, OperationType.UPDATE, `users/${uid}`));
    } else {
      setData(prev => ({ ...prev, categoryBudgets: budgetsCopy }));
    }
    triggerNotification(`Meta limite de ${category} reajustada.`);
  };

  // Save current month's configuration adjustments
  const handleSaveMonthConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    const sal = parseFloat(salaryInput);
    if (isNaN(sal) || sal < 0) {
      triggerNotification('O salário inserido deve ser um número positivo.', 'error');
      return;
    }

    const budgetsCopy = [...data.monthlyBudgets];
    const idx = budgetsCopy.findIndex(b => b.month === selectedMonth);
    const newBudget: MonthlyBudget = {
      month: selectedMonth,
      salary: sal,
      targetSavingsPercentage: savingsInput
    };

    if (idx !== -1) {
      budgetsCopy[idx] = newBudget;
    } else {
      budgetsCopy.push(newBudget);
    }

    if (storageType === 'cloud' && auth?.currentUser?.uid) {
      const uid = auth.currentUser.uid;
      await setDoc(doc(db!, 'users', uid), {
        monthlyBudgets: budgetsCopy,
        defaultMonthlySalary: sal,
        defaultTargetSavingsPercentage: savingsInput
      }, { merge: true }).catch(err => handleFirestoreError(err, OperationType.UPDATE, `users/${uid}`));
    } else {
      setData(prev => ({
        ...prev,
        monthlyBudgets: budgetsCopy,
        defaultMonthlySalary: sal,
        defaultTargetSavingsPercentage: savingsInput
      }));
    }

    setShowConfigPanel(false);
    triggerNotification(`Planejamento de ${formatMonthName(selectedMonth)} foi atualizado.`);
  };

  // JSON Export / Import handlers
  const handleExportData = () => {
    exportDataAsJSON(data);
    triggerNotification('Backup exportado com sucesso.', 'info');
  };

  const handleImportButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const fileContent = event.target?.result as string;
        const importedData = importDataFromJSON(fileContent);
        
        setData(importedData);
        triggerNotification('Seus dados foram importados com sucesso!');
      } catch (err: any) {
        alert(`Falha na importação: ${err.message || 'Formato incorreto'}`);
      }
    };
    reader.readAsText(file);
    // Clear input after handle
    e.target.value = '';
  };

  // Destructive reset triggered from custom modal
  const handleRealClearData = () => {
    const emptyData: AppData = {
      expenses: [],
      revenues: [],
      categoryBudgets: [
        { category: 'Alimentação', idealLimit: 0.00 },
        { category: 'Presentes', idealLimit: 0.00 },
        { category: 'Saúde', idealLimit: 0.00 },
        { category: 'Moradia', idealLimit: 0.00 },
        { category: 'Transporte', idealLimit: 0.00 },
        { category: 'Vestuário', idealLimit: 0.00 },
        { category: 'Lazer & Entretenimento', idealLimit: 0.00 },
        { category: 'Serviços de utilidade pública', idealLimit: 0.00 },
        { category: 'Viagens', idealLimit: 0.00 },
        { category: 'Tecnologia & Eletrônicos', idealLimit: 0.00 },
        { category: 'Cuidados Pessoais', idealLimit: 0.00 },
        { category: 'Assinaturas', idealLimit: 0.00 },
        { category: 'Educação & Profissional', idealLimit: 0.00 },
        { category: 'Outros', idealLimit: 0.00 }
      ],
      monthlyBudgets: [],
      defaultMonthlySalary: 0.00,
      defaultTargetSavingsPercentage: 20
    };

    // Limpeza completa em todos os níveis
    localStorage.clear();
    saveAppData(emptyData);
    setData(emptyData);
    setShowDeleteConfirm(false);

    triggerNotification('Todos os dados foram completamente limpos!', 'success');

    // Forçar o recarregamento total da página para resetar todos os estados de componentes internos e campos de input
    setTimeout(() => {
      window.location.reload();
    }, 150);
  };

  const handleClearData = () => {
    setShowDeleteConfirm(true);
  };

  // Aggregated analytics values for selected month
  const expensesInMonth = data.expenses.filter(e => e.month === selectedMonth);
  const totalSpent = expensesInMonth.reduce((sum, item) => sum + item.value, 0);

  // Calcular divida de parcelas futuras do mes analisado
  const futureInstallmentsDebt = expensesInMonth.reduce((sum, exp) => {
    const info = getInstallmentInfo(exp);
    const isInst = info.hasInfo || exp.isInstallment;
    if (isInst && info.remaining > 0) {
      return sum + (exp.value * info.remaining);
    }
    return sum;
  }, 0);

  const revenuesInMonth = (data.revenues || []).filter(r => r.month === selectedMonth);
  const totalRevenues = revenuesInMonth.reduce((sum, item) => sum + item.value, 0);

  // Se o usuário lançou pelo menos um rendimento, o salário que usamos para os cartões passa a ser a soma totalRevenues.
  // Senão, adota activeBudget.salary como fallback padrão do mês para não aparecer zerado.
  const currentMonthSalary = revenuesInMonth.length > 0 ? totalRevenues : activeBudget.salary;

  // Gasto real por categoria
  const expensesByCategory = expensesInMonth.reduce((acc, exp) => {
    acc[exp.category] = (acc[exp.category] || 0) + exp.value;
    return acc;
  }, {} as Record<string, number>);

  // Média acumulada geral de todas as despesas por mês
  const uniqueMonthsWithExpenses = Array.from(new Set(data.expenses.map(e => e.month)));
  const totalSpentHistory = data.expenses.reduce((sum, item) => sum + item.value, 0);
  const overallAverageSpent = uniqueMonthsWithExpenses.length > 0 
    ? totalSpentHistory / uniqueMonthsWithExpenses.length 
    : totalSpent;

  return (
    <div className={`min-h-screen bg-[#0a0a0a] flex flex-col items-center text-white ${privacyMode ? 'privacy-mode-active' : ''}`}>
      
      {/* GLOWING NOTIFICATION TOAST */}
      {showNotification && (
        <div 
          className={`fixed bottom-6 right-6 px-4 py-3 rounded-2xl shadow-xl border text-sm font-semibold z-50 flex items-center gap-2 animate-fade-in ${
            showNotification.type === 'error' 
              ? 'bg-rose-950 text-rose-100 border-rose-800' 
              : showNotification.type === 'info'
              ? 'bg-indigo-950 text-indigo-100 border-indigo-800'
              : 'bg-emerald-950 text-emerald-100 border-emerald-800'
          }`}
          id="toast-notification"
        >
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>{showNotification.message}</span>
        </div>
      )}

      {/* HEADER PRINCIPAL */}
      <header className="w-full bg-[#111111] border-b border-white/5 shrink-0 text-white" id="main-app-header">
        <div className="w-full max-w-7xl mx-auto px-4 py-4 sm:px-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          
          {/* Logo e Nome */}
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 select-none shrink-0" id="main-brand-logo">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className="w-full h-full">
                <defs>
                  {/* Gradiente de Fundo Premium (Efeito Espacial Profundo) */}
                  <radialGradient id="bgGlow" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                    <stop offset="0%" stopColor="#0f172a" />
                    <stop offset="100%" stopColor="#030712" />
                  </radialGradient>
                  
                  {/* Gradiente Principal Fintech (Esmeralda para Turquesa) */}
                  <linearGradient id="fintechGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#10B981" />
                    <stop offset="50%" stopColor="#059669" />
                    <stop offset="100%" stopColor="#2DD4BF" />
                  </linearGradient>

                  {/* Gradiente para a Borda com Efeito de Vidro (Glassmorphism) */}
                  <linearGradient id="borderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity={0.18} />
                    <stop offset="100%" stopColor="#ffffff" stopOpacity={0.02} />
                  </linearGradient>

                  {/* Filtro de Brilho Neon para o Ponto de Convergência */}
                  <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="8" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>

                {/* Base do Ícone: Cantos Arredondados com Borda Subtil */}
                <rect x="16" y="16" width="480" height="480" rx="120" fill="url(#bgGlow)" />
                <rect x="16" y="16" width="480" height="480" rx="120" fill="none" stroke="url(#borderGrad)" strokeWidth="4" />

                {/* Símbolo Centralizado Otimizado (Preenche melhor com scale 1.65x) */}
                <g transform="translate(41, 95) scale(1.65)">
                  
                  {/* Linhas de Grelha de Fundo (Simula Análise e Precisão) */}
                  <line x1="30" y1="200" x2="250" y2="200" stroke="#ffffff" strokeOpacity={0.04} strokeWidth="2" strokeDasharray="6 6" />
                  <line x1="30" y1="140" x2="250" y2="140" stroke="#ffffff" strokeOpacity={0.04} strokeWidth="2" strokeDasharray="6 6" />
                  <line x1="30" y1="80" x2="250" y2="80" stroke="#ffffff" strokeOpacity={0.04} strokeWidth="2" strokeDasharray="6 6" />

                  {/* Barra 1 (Crescimento Inicial - Baixa Opacidade) */}
                  <rect x="40" y="145" width="32" height="55" rx="8" fill="url(#fintechGrad)" opacity={0.3} />

                  {/* Barra 2 (Consolidação de Capital - Média Opacidade) */}
                  <rect x="96" y="95" width="32" height="105" rx="8" fill="url(#fintechGrad)" opacity={0.6} />

                  {/* Barra 3 (Performance de Topo e Sucesso - Opacidade Máxima) */}
                  <rect x="152" y="35" width="32" height="165" rx="8" fill="url(#fintechGrad)" />

                  {/* Curva Dinâmica de Fluxo de Caixa (Seta Ascendente) */}
                  <path d="M 20,175 C 60,170 100,145 136,95 C 166,55 205,30 225,10" 
                        fill="none" 
                        stroke="url(#fintechGrad)" 
                        strokeWidth="14" 
                        strokeLinecap="round" />
                        
                  {/* Cabeça da Seta (Aceleração de Mercado) */}
                  <path d="M 180,10 L 227,8 L 225,55" 
                        fill="none" 
                        stroke="url(#fintechGrad)" 
                        strokeWidth="14" 
                        strokeLinecap="round" 
                        strokeLinejoin="round" />
                        
                  {/* Ponto de Brilho Ativo (Sucesso e Alvo Financeiro Alcançado) */}
                  <circle cx="225" cy="10" r="14" fill="#ffffff" filter="url(#neonGlow)" />
                  <circle cx="225" cy="10" r="6" fill="#2DD4BF" />
                </g>
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold font-sans tracking-tight">Dashboard de Finanças Pessoais</h1>
              <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">Planejamento & Controle</p>
            </div>
          </div>

          {/* Navegação Mensal */}
          <div className="flex items-center bg-[#1c1c1c] p-1.5 rounded-2xl border border-white/5" id="month-navigation">
            <button 
              onClick={handlePrevMonth}
              className="p-1 px-1.5 hover:bg-white/5 hover:text-white rounded-xl transition-all cursor-pointer text-slate-300"
              title="Mês Anterior"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="px-3 min-w-[130px] text-center">
              <span className="text-xs text-slate-500 block font-bold leading-none font-mono">Competência</span>
              <span className="text-sm font-bold text-white font-sans mt-0.5 inline-block">
                {formatMonthName(selectedMonth)}
              </span>
            </div>
            <button 
              onClick={handleNextMonth}
              className="p-1 px-1.5 hover:bg-white/5 hover:text-white rounded-xl transition-all cursor-pointer text-slate-300"
              title="Próximo Mês"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Ações de Dados e Backup */}
          <div className="flex flex-wrap items-center gap-2" id="action-controls-row">
            {/* Olho - Modo Privacidade */}
            <button
              onClick={() => {
                const nv = !privacyMode;
                setPrivacyMode(nv);
                triggerNotification(nv ? 'Modo de privacidade ativado! Os valores foram borrados para locais públicos.' : 'Modo de privacidade desativado. Valores visíveis.', 'info');
              }}
              className={`w-8 h-8 flex items-center justify-center rounded-xl border transition-all cursor-pointer shrink-0 ${
                privacyMode 
                  ? 'bg-amber-950/40 text-amber-400 border-amber-500/30 shadow-md shadow-amber-950/20' 
                  : 'bg-[#1c1c1c] hover:bg-[#252525] text-slate-200 border-white/5'
              }`}
              title={privacyMode ? 'Mostrar valores (Modo público)' : 'Esconder valores (Modo privado)'}
            >
              {privacyMode ? <EyeOff className="w-4 h-4 text-amber-400" /> : <Eye className="w-4 h-4 text-slate-400" />}
            </button>

            {/* Esconder Teto de Gastos (Apenas Mobile/Tablet) */}
            <button
              onClick={() => {
                const nv = !hideMobileBudgets;
                setHideMobileBudgets(nv);
                triggerNotification(nv ? 'Seção de Teto de Gastos ocultada para telas menores.' : 'Seção de Teto de Gastos visível.', 'info');
              }}
              className={`lg:hidden w-8 h-8 flex items-center justify-center rounded-xl border transition-all cursor-pointer shrink-0 ${
                hideMobileBudgets 
                  ? 'bg-indigo-950/40 text-indigo-400 border-indigo-500/30 shadow-md shadow-indigo-950/20' 
                  : 'bg-[#1c1c1c] hover:bg-[#252525] text-slate-200 border-white/5'
              }`}
              title={hideMobileBudgets ? 'Mostrar Teto de Gastos Adotado' : 'Esconder Teto de Gastos Adotado'}
            >
              <Sliders className="w-4 h-4" />
            </button>

            {/* Editar Salário e Metas */}
            <button
              onClick={() => setShowConfigPanel(prev => !prev)}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer ${
                showConfigPanel 
                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-600/20' 
                  : 'bg-[#1c1c1c] hover:bg-[#252525] text-slate-200 border-white/5'
              }`}
              title="Configurações do Orçamento Mensal"
            >
              <Settings className="w-3.5 h-3.5" />
              Configurar Mês
            </button>

            {/* Input de arquivo invisível para importação */}
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImportFile} 
              accept=".json" 
              className="hidden" 
            />

            {/* Input de arquivo invisível para importação na nuvem */}
            <input 
              type="file" 
              ref={cloudFileInputRef} 
              onChange={handleCloudImportFile} 
              accept=".json" 
              className="hidden" 
            />

            {/* Menu Dropdown de Gerenciamento de Dados Locais */}
            <div className="relative" ref={dataMenuRef} id="local-storage-menu-container">
              <button
                onClick={() => setShowDataMenu(prev => !prev)}
                className={`w-8 h-8 flex items-center justify-center text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                  showDataMenu 
                    ? 'bg-zinc-900 text-white border-white/10 shadow-lg' 
                    : 'bg-[#1c1c1c] hover:bg-[#252525] text-slate-200 border-white/5'
                }`}
                title="Ações de Backup e Armazenamento Local"
              >
                <Database className="w-4 h-4 text-zinc-400" />
              </button>

              {showDataMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-[#141414] border border-white/10 rounded-2xl shadow-2xl p-2.5 z-50 flex flex-col gap-1.5 animate-fade-in text-left">
                  <div className="px-2 py-1.5 border-b border-white/5 mb-1">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 block">Armazenamento Local</span>
                    <span className="text-[11px] text-slate-400 mt-0.5 block">Gerencie backups e integridade física de seus lançamentos.</span>
                  </div>

                  {/* Opção Exportar */}
                  <button
                    onClick={() => {
                      handleExportData();
                      setShowDataMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-white/5 text-slate-200 hover:text-white rounded-xl transition-all flex items-start gap-2.5 cursor-pointer group"
                  >
                    <Download className="w-4 h-4 text-emerald-400 mt-0.5 group-hover:scale-110 transition-transform" />
                    <div>
                      <span className="text-xs font-bold block">Fazer Backup JSON</span>
                      <span className="text-[9px] text-slate-500">Exportar todos os dados salvos localmente.</span>
                    </div>
                  </button>

                  {/* Opção Importar */}
                  <button
                    onClick={() => {
                      handleImportButtonClick();
                      setShowDataMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-white/5 text-slate-200 hover:text-white rounded-xl transition-all flex items-start gap-2.5 cursor-pointer group"
                  >
                    <Upload className="w-4 h-4 text-indigo-400 mt-0.5 group-hover:scale-110 transition-transform" />
                    <div>
                      <span className="text-xs font-bold block">Recuperar Backup</span>
                      <span className="text-[9px] text-slate-500">Restaurar arquivo de backup no navegador.</span>
                    </div>
                  </button>

                  <div className="h-px bg-white/5 my-1" />

                  {/* Opção Destrutiva: Limpar */}
                  <button
                    onClick={() => {
                      handleClearData();
                      setShowDataMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-rose-950/20 text-rose-350 hover:text-rose-200 rounded-xl transition-all flex items-start gap-2.5 cursor-pointer group"
                  >
                    <Trash2 className="w-4 h-4 text-rose-400 mt-0.5 group-hover:scale-110 transition-transform" />
                    <div>
                      <span className="text-xs font-bold block text-rose-400">Limpar Banco de Dados</span>
                      <span className="text-[9px] text-rose-500/80">Apagar todos os registros do navegador local.</span>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* Firebase Google Cloud Sync controller */}
            {isFirebaseConfigured ? (
              <div id="firebase-cloud-sync-widget" className="relative shrink-0">
                {user ? (
                  <div className="relative" ref={profileMenuRef}>
                    <button
                      onClick={() => setShowProfileMenu(prev => !prev)}
                      className="w-8 h-8 rounded-full border border-indigo-500/80 hover:border-indigo-400 transition-all focus:outline-none shrink-0 shadow-md flex items-center justify-center p-0 cursor-pointer overflow-hidden"
                      title={`${user.displayName || 'Usuário'} (${user.email || ''})`}
                    >
                      <img 
                        src={user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.displayName}`} 
                        alt={user.displayName || 'Avatar'} 
                        className="w-full h-full object-cover rounded-full" 
                        referrerPolicy="no-referrer"
                      />
                    </button>

                    {showProfileMenu && (
                      <div className="absolute right-0 mt-2 w-64 bg-[#141414] border border-white/10 rounded-2xl shadow-2xl p-2.5 z-50 flex flex-col gap-1.5 animate-fade-in text-left">
                        <div className="px-2 py-1.5 border-b border-white/5 mb-1 flex items-center gap-2">
                          <img 
                            src={user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.displayName}`} 
                            alt={user.displayName || 'Avatar'} 
                            className="w-7 h-7 rounded-full object-cover shrink-0" 
                            referrerPolicy="no-referrer"
                          />
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-bold text-white truncate">{user.displayName || 'Usuário'}</span>
                            <span className="text-[10px] text-zinc-500 truncate">{user.email || ''}</span>
                          </div>
                        </div>

                        <div className="px-2 py-0.5 mb-1">
                          <span className="text-[10px] uppercase tracking-wider font-bold text-indigo-400 block">Sincronização ☁️</span>
                          <span className="text-[9px] text-slate-500 block leading-tight mt-0.5">Seus dados estão sincronizados na nuvem de forma privada e segura.</span>
                        </div>

                        {/* Opção Importar Backup para Nuvem via Arquivo */}
                        <button
                          onClick={() => {
                            setShowProfileMenu(false);
                            handleCloudImportButtonClick();
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-white/5 text-slate-200 hover:text-white rounded-xl transition-all flex items-start gap-2.5 cursor-pointer group border border-transparent hover:border-white/10"
                        >
                          <Upload className="w-4 h-4 text-indigo-400 mt-0.5 group-hover:scale-110 transition-transform shrink-0" />
                          <div>
                            <span className="text-xs font-bold block text-indigo-300">Importar do Computador</span>
                            <span className="text-[9px] text-slate-500">Enviar arquivo backup JSON para sua conta na Nuvem.</span>
                          </div>
                        </button>

                        <div className="h-px bg-white/5 my-1" />

                        {/* Opção Sair */}
                        <button
                          onClick={async () => {
                            setShowProfileMenu(false);
                            if (signOut && auth) {
                              await signOut(auth).catch(err => console.error(err));
                            }
                            setUser(null);
                            setStorageType('local');
                            localStorage.setItem('storage-type', 'local');
                            triggerNotification('Desconectado com sucesso.', 'info');
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-rose-950/20 text-rose-350 hover:text-rose-200 rounded-xl transition-all flex items-start gap-2.5 cursor-pointer group"
                        >
                          <LogOut className="w-4 h-4 text-rose-400 mt-0.5 group-hover:scale-110 transition-transform shrink-0" />
                          <div>
                            <span className="text-xs font-bold block text-rose-450">Sair da Conta Google</span>
                            <span className="text-[9px] text-slate-500">Voltar ao armazenamento local offline.</span>
                          </div>
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={async () => {
                      try {
                        if (signInWithPopup && auth) {
                          const provider = new GoogleAuthProvider();
                          const result = await signInWithPopup(auth, provider);
                          setUser(result.user);
                          
                          // Enable Cloud sync immediately
                          setStorageType('cloud');
                          localStorage.setItem('storage-type', 'cloud');
                          
                          triggerNotification(`Conectado como ${result.user.displayName}!`, 'success');
                        }
                      } catch (err) {
                        console.error('Erro de Login Google:', err);
                        triggerNotification('Erro ao autenticar com Google.', 'error');
                      }
                    }}
                    className="px-3 py-1.5 flex items-center justify-center gap-2 bg-[#1c1c1c] hover:bg-[#252525] text-slate-300 hover:text-white border border-white/5 rounded-xl transition-all cursor-pointer shrink-0 hover:border-indigo-500/30 shadow-sm text-xs font-bold"
                    title="Conectar com o Google"
                  >
                    <svg className="w-3.5 h-3.5 shrink-0 animate-pulse" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.08H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.92l2.85-2.22.81-.6z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.08l3.66 2.84c.87-2.6 3.3-4.54 6.16-4.54z" fill="#EA4335"/>
                    </svg>
                    <span>Conectar</span>
                  </button>
                )}
              </div>
            ) : null}
          </div>

        </div>
      </header>

      {/* PAINEL FLUTUANTE DE CONFIGURAÇÃO DE SALÁRIO ANCORADO NO HEADER */}
      {showConfigPanel && (
        <div className="w-full bg-[#141414] border-b border-white/5 text-white animate-fade-in" id="config-panel">
          <div className="w-full max-w-7xl mx-auto px-4 py-5 sm:px-6">
            <form onSubmit={handleSaveMonthConfig} className="grid grid-cols-1 md:grid-cols-3 gap-5 items-end">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Salário Ideal / Rendimento Fixo (R$) — {formatMonthName(selectedMonth)}
                </label>
                <div className="relative mt-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 text-sm">
                    R$
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-white outline-none focus:border-indigo-500 font-semibold"
                    placeholder="Ex: 5000.00"
                    value={salaryInput}
                    onChange={(e) => setSalaryInput(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <span>Meta de Poupança Ideal (%)</span>
                  <span className="text-indigo-400 font-bold font-mono">{savingsInput}%</span>
                </div>
                <div className="mt-2.5 flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="90"
                    step="5"
                    className="flex-1 accent-indigo-500 bg-zinc-900 h-1.5 rounded-lg cursor-pointer"
                    value={savingsInput}
                    onChange={(e) => setSavingsInput(parseInt(e.target.value))}
                  />
                  <span className="text-xs text-slate-500 whitespace-nowrap">
                    Poupe: {formatCurrency(parseFloat(salaryInput || '0') * (savingsInput / 100))}
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-2 px-4 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer flex items-center justify-center gap-1"
                >
                  <Check className="w-4 h-4" />
                  Salvar Orçamento
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfigPanel(false)}
                  className="px-4 py-2 bg-[#1c1c1c] hover:bg-[#252525] text-slate-300 rounded-xl text-xs font-bold transition-all"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ÁREA DE CONTEÚDO PRINCIPAL (DASHBOARD) */}
      <main className="w-full max-w-7xl mx-auto px-4 py-4 sm:px-6 flex-1 space-y-4" id="dashboard-main-area">
        
        {/* VIEW SELECTOR TAB BAR */}
        <div className="flex bg-[#121212] p-1 rounded-xl border border-white/5 max-w-[325px]" id="view-selector-tabs">
          <button
            onClick={() => setActiveView('monthly')}
            type="button"
            className={`flex-1 py-1.5 px-3 text-xs font-bold rounded-lg transition-all cursor-pointer text-center ${
              activeView === 'monthly'
                ? 'bg-[#1c1c1c] text-white border border-white/5 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Painel Mensal
          </button>
          <button
            onClick={() => setActiveView('annual')}
            type="button"
            className={`flex-1 py-1.5 px-3 text-xs font-bold rounded-lg transition-all cursor-pointer text-center ${
              activeView === 'annual'
                ? 'bg-[#1c1c1c] text-white border border-white/5 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Resumo Anual ({selectedMonth.substring(0, 4)})
          </button>
        </div>

        {activeView === 'monthly' ? (
          <>
            {/* ROW 1: CARDS GERAIS DE CONTROLE */}
            <KpiCards 
              totalSpent={totalSpent}
              salary={activeBudget.salary}
              targetSavingsPercentage={activeBudget.targetSavingsPercentage}
              extraIncome={totalRevenues}
              selectedMonth={selectedMonth}
              futureInstallmentsDebt={futureInstallmentsDebt}
              expenses={data.expenses}
            />

            {/* ROW 2: GRÁFICOS INTERATIVOS E TETOS POR CATEGORIA */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="middle-dashboard-layout">
              {/* Gráficos Recharts (8 colunas) */}
              <div className="lg:col-span-8">
                <ChartsView 
                  expenses={data.expenses}
                  categoryBudgets={data.categoryBudgets}
                  selectedMonth={selectedMonth}
                />
              </div>

              {/* Planejamento de Metas Limites por Categoria (4 colunas) */}
              <div className={`lg:col-span-4 lg:h-[590px] ${hideMobileBudgets ? 'hidden lg:block' : ''}`}>
                <CategoryBudgets 
                  categoryBudgets={data.categoryBudgets}
                  expensesByCategory={expensesByCategory}
                  onUpdateBudget={handleUpdateCategoryBudget}
                />
              </div>
            </div>

            {/* ROW 3: TABELA DE LANÇAMENTOS E ADICIONAR DESPESA */}
            <div className="p-px rounded-3xl bg-transparent" id="bottom-tracker-layout">
              <ExpenseTracker 
                expenses={data.expenses}
                onAddExpense={handleAddExpense}
                onDeleteExpense={handleDeleteExpense}
                onUpdateExpense={handleUpdateExpense}
                revenues={data.revenues || []}
                onAddRevenue={handleAddRevenue}
                onDeleteRevenue={handleDeleteRevenue}
                onUpdateRevenue={handleUpdateRevenue}
                selectedMonth={selectedMonth}
              />
            </div>
          </>
        ) : (
          <AnnualSummary 
            expenses={data.expenses} 
            revenues={data.revenues || []} 
            selectedYear={selectedMonth.substring(0, 4)} 
          />
        )}

      </main>

      {/* FOOTER */}
      <footer className="w-full bg-[#111111] border-t border-white/5 text-slate-400 py-6 text-center mt-12 text-xs shrink-0 font-medium">
        <div className="w-full max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p>
            Controle de Orçamento Pessoal • {storageType === 'cloud' && user ? 'Sincronizado na Nuvem de forma segura' : 'Todos os dados permanecem salvos localmente'} (<code className="bg-zinc-900 px-1 rounded text-rose-450 font-mono">{storageType === 'cloud' && user ? 'Firebase Firestore' : 'localStorage'}</code>).
          </p>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider">
            Desenvolvido sob medida em Português (Brasil)
          </p>
        </div>
      </footer>

      {/* CONFIRMAÇÃO DE EXCLUSÃO DE DADOS */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-white/5 max-w-md w-full rounded-2xl p-6 shadow-2xl flex flex-col gap-4">
            <div className="w-12 h-12 rounded-full bg-rose-950/40 text-rose-400 flex items-center justify-center">
              <Trash2 className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white mb-1">
                Apagar todos os dados registrados?
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Tem certeza de que deseja limpar completamente todas as despesas, rendimentos, limites e planejamentos do navegador? Esta ação é irreversível.
              </p>
            </div>
            <div className="flex gap-3 justify-end mt-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 bg-[#1c1c1c] hover:bg-[#252525] text-slate-200 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleRealClearData}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-rose-600/20 cursor-pointer"
              >
                Confirmar Limpeza
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
