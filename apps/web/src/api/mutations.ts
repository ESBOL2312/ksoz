import type { Home, Me } from '@ksoz/shared';
import { useMutation, useQueryClient, type QueryClient } from '@tanstack/vue-query';
import { api, type PatchMeBody } from './endpoints';
import { qk } from './keys';

/** Новый баланс сразу в шапку (home и me), без ожидания refetch. */
export function setBalance(qc: QueryClient, balance: number): void {
  qc.setQueryData<Home>(qk.home, (h) => (h ? { ...h, altyn: balance } : h));
  qc.setQueryData<Me>(qk.me, (m) => (m ? { ...m, altyn: balance } : m));
}

/** После урока меняется почти всё, что видно на вкладках. */
export function invalidateAfterLesson(qc: QueryClient): void {
  void qc.invalidateQueries({ queryKey: qk.home });
  void qc.invalidateQueries({ queryKey: qk.me });
  void qc.invalidateQueries({ queryKey: qk.baige() });
  void qc.invalidateQueries({ queryKey: ['words'] });
}

export function usePatchMe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: PatchMeBody) => api.patchMe(body),
    onSuccess: (me, body) => {
      qc.setQueryData(qk.me, me);
      if (body.level) void qc.invalidateQueries({ queryKey: qk.bazaar });
      if (body.city_id !== undefined) void qc.invalidateQueries({ queryKey: qk.baige('city') });
    },
  });
}

export function usePurchase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (itemId: number) => api.purchase(itemId),
    onSuccess: (res) => {
      setBalance(qc, res.balance);
      void qc.invalidateQueries({ queryKey: qk.bazaar });
      void qc.invalidateQueries({ queryKey: qk.home });
    },
  });
}

export function useEquip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { itemId: number; equipped: boolean }) => api.equip(v.itemId, v.equipped),
    onSuccess: (res) => {
      qc.setQueryData<Home>(qk.home, (h) => (h ? { ...h, equipped: res.equipped } : h));
      void qc.invalidateQueries({ queryKey: qk.bazaar });
    },
  });
}

export function useClaimTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => api.claimTask(code),
    onSuccess: (res, code) => {
      setBalance(qc, res.balance);
      qc.setQueryData<Home>(qk.home, (h) =>
        h ? { ...h, tasks: h.tasks.map((t) => (t.code === code ? { ...t, claimed: true } : t)) } : h,
      );
      void qc.invalidateQueries({ queryKey: qk.home });
    },
  });
}
