'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type NotificationType =
  | 'clip_saved'
  | 'clip_analyzed'
  | 'collection_updated'
  | 'credit_low';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  createdAt: string; // ISO string
  isRead: boolean;
}

const MAX_NOTIFICATIONS = 50;

interface NotificationState {
  notifications: Notification[];
}

interface NotificationActions {
  addNotification: (input: Omit<Notification, 'id' | 'createdAt' | 'isRead'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
}

export const useNotifications = create<NotificationState & NotificationActions>()(
  persist(
    (set) => ({
      notifications: [],

      addNotification: (input) =>
        set((s) => {
          const next: Notification = {
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
            isRead: false,
            ...input,
          };
          const updated = [next, ...s.notifications].slice(0, MAX_NOTIFICATIONS);
          return { notifications: updated };
        }),

      markAsRead: (id) =>
        set((s) => ({
          notifications: s.notifications.map((n) =>
            n.id === id ? { ...n, isRead: true } : n
          ),
        })),

      markAllAsRead: () =>
        set((s) => ({
          notifications: s.notifications.map((n) => ({ ...n, isRead: true })),
        })),

      clearAll: () => set({ notifications: [] }),
    }),
    {
      name: 'linkbrain-notifications',
      version: 1,
    }
  )
);

// Convenience selector
export function addNotification(
  input: Omit<Notification, 'id' | 'createdAt' | 'isRead'>
): void {
  useNotifications.getState().addNotification(input);
}
