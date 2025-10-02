import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface WaiverItem {
  id: string;
  player: string;
  team: string;
  pos: string;
  priority: number;
  faab: number;
  note?: string;
}

export interface TradeItem {
  type: 'give' | 'get';
  player: string;
  teamId?: string;
}

export interface Notification {
  id: string;
  text: string;
  read: boolean;
}

interface AppState {
  selectedLeagueId: string;
  currentWeek: number;
  userPersona: 'neutral' | 'sassy' | 'batman' | 'yoda';
  waiverQueue: WaiverItem[];
  tradeDraft: {
    withTeamId?: string;
    items: TradeItem[];
  };
  notifications: Notification[];
  commissioner: {
    showCoachMarks: boolean;
  };
  
  // Actions
  setSelectedLeague: (leagueId: string) => void;
  setCurrentWeek: (week: number) => void;
  setUserPersona: (persona: 'neutral' | 'sassy' | 'batman' | 'yoda') => void;
  addWaiverToQueue: (waiver: WaiverItem) => void;
  removeWaiverFromQueue: (id: string) => void;
  reorderWaiver: (fromIndex: number, toIndex: number) => void;
  clearWaiverQueue: () => void;
  setTradeDraft: (draft: { withTeamId?: string; items: TradeItem[] }) => void;
  clearTradeDraft: () => void;
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  markNotificationRead: (id: string) => void;
  clearNotifications: () => void;
  setShowCoachMarks: (show: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      selectedLeagueId: 'lg_demo_1',
      currentWeek: 4,
      userPersona: 'neutral',
      waiverQueue: [],
      tradeDraft: { items: [] },
      notifications: [],
      commissioner: {
        showCoachMarks: true,
      },

      setSelectedLeague: (leagueId) => set({ selectedLeagueId: leagueId }),
      setCurrentWeek: (week) => set({ currentWeek: week }),
      setUserPersona: (persona) => set({ userPersona: persona }),
      
      addWaiverToQueue: (waiver) =>
        set((state) => ({
          waiverQueue: [...state.waiverQueue, waiver],
        })),
      
      removeWaiverFromQueue: (id) =>
        set((state) => ({
          waiverQueue: state.waiverQueue.filter((w) => w.id !== id),
        })),
      
      reorderWaiver: (fromIndex, toIndex) =>
        set((state) => {
          const newQueue = [...state.waiverQueue];
          const [removed] = newQueue.splice(fromIndex, 1);
          newQueue.splice(toIndex, 0, removed);
          return { waiverQueue: newQueue };
        }),
      
      clearWaiverQueue: () => set({ waiverQueue: [] }),
      
      setTradeDraft: (draft) => set({ tradeDraft: draft }),
      clearTradeDraft: () => set({ tradeDraft: { items: [] } }),
      
      addNotification: (notification) =>
        set((state) => ({
          notifications: [
            ...state.notifications,
            { ...notification, id: `notif_${Date.now()}` },
          ],
        })),
      
      markNotificationRead: (id) =>
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
        })),
      
      clearNotifications: () => set({ notifications: [] }),
      
      setShowCoachMarks: (show) =>
        set((state) => ({
          commissioner: { ...state.commissioner, showCoachMarks: show },
        })),
    }),
    {
      name: 'commish-store',
      partialize: (state) => ({
        selectedLeagueId: state.selectedLeagueId,
        userPersona: state.userPersona,
        commissioner: state.commissioner,
      }),
    }
  )
);
