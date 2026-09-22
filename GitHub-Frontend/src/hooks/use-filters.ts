'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useCallback } from 'react';
import { DashboardFilters, DateRangePreset, ActivityTypeOption } from '../types';

export function useFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const filters: DashboardFilters = {
    projectId: searchParams.get('project') || undefined,
    repositoryId: searchParams.get('repository') || undefined,
    developerId: searchParams.get('developer') || undefined,
    activityType: (searchParams.get('activity') as ActivityTypeOption) || undefined,
    from: searchParams.get('from') || undefined,
    to: searchParams.get('to') || undefined,
    preset: (searchParams.get('preset') as DateRangePreset) || '7d',
  };

  const setFilter = useCallback(
    (key: string, value?: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.push(`${pathname}?${params.toString()}`);
    },
    [searchParams, router, pathname]
  );

  const setFilters = useCallback(
    (newFilters: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(newFilters).forEach(([key, value]) => {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      });
      router.push(`${pathname}?${params.toString()}`);
    },
    [searchParams, router, pathname]
  );

  const resetFilters = useCallback(() => {
    router.push(pathname);
  }, [router, pathname]);

  const setPreset = useCallback(
    (preset: DateRangePreset) => {
      if (preset !== 'custom') {
        setFilters({ preset, from: undefined, to: undefined });
      } else {
        setFilter('preset', 'custom');
      }
    },
    [setFilter, setFilters]
  );

  const setCustomDate = useCallback(
    (from?: string, to?: string) => {
      setFilters({
        preset: 'custom',
        from: from || undefined,
        to: to || undefined,
      });
    },
    [setFilters]
  );

  return {
    filters,
    setFilter,
    setFilters,
    resetFilters,
    setPreset,
    setCustomDate,
  };
}
