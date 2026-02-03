'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { HighlightType } from '@/app/actions';

export interface FilterState {
  query: string;
  types: HighlightType[];
  domains: string[];
  skills: string[];
  onlyWithMetrics: boolean;
}

interface FilterContextValue {
  filters: FilterState;
  setQuery: (query: string) => void;
  setTypes: (types: HighlightType[]) => void;
  toggleType: (type: HighlightType) => void;
  setDomains: (domains: string[]) => void;
  toggleDomain: (domain: string) => void;
  setSkills: (skills: string[]) => void;
  toggleSkill: (skill: string) => void;
  setOnlyWithMetrics: (value: boolean) => void;
  clearFilters: () => void;
  hasActiveFilters: boolean;
  activeFilterCount: number;
}

const FilterContext = createContext<FilterContextValue | null>(null);

const EMPTY_FILTERS: FilterState = {
  query: '',
  types: [],
  domains: [],
  skills: [],
  onlyWithMetrics: false,
};

export function FilterProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Parse initial values from URL
  const [filters, setFilters] = useState<FilterState>(() => ({
    query: searchParams.get('q') || '',
    types: (searchParams.get('types')?.split(',').filter(Boolean) as HighlightType[]) || [],
    domains: searchParams.get('domains')?.split(',').filter(Boolean) || [],
    skills: searchParams.get('skills')?.split(',').filter(Boolean) || [],
    onlyWithMetrics: searchParams.get('metrics') === 'true',
  }));

  // Sync filters to URL with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams();

      if (filters.query.trim()) {
        params.set('q', filters.query.trim());
      }
      if (filters.types.length > 0) {
        params.set('types', filters.types.join(','));
      }
      if (filters.domains.length > 0) {
        params.set('domains', filters.domains.join(','));
      }
      if (filters.skills.length > 0) {
        params.set('skills', filters.skills.join(','));
      }
      if (filters.onlyWithMetrics) {
        params.set('metrics', 'true');
      }

      const queryString = params.toString();
      const newUrl = queryString ? `/?${queryString}` : '/';

      router.push(newUrl, { scroll: false });
    }, 300);

    return () => clearTimeout(timer);
  }, [filters, router]);

  const setQuery = useCallback((query: string) => {
    setFilters((prev) => ({ ...prev, query }));
  }, []);

  const setTypes = useCallback((types: HighlightType[]) => {
    setFilters((prev) => ({ ...prev, types }));
  }, []);

  const toggleType = useCallback((type: HighlightType) => {
    setFilters((prev) => ({
      ...prev,
      types: prev.types.includes(type)
        ? prev.types.filter((t) => t !== type)
        : [...prev.types, type],
    }));
  }, []);

  const setDomains = useCallback((domains: string[]) => {
    setFilters((prev) => ({ ...prev, domains }));
  }, []);

  const toggleDomain = useCallback((domain: string) => {
    setFilters((prev) => ({
      ...prev,
      domains: prev.domains.includes(domain)
        ? prev.domains.filter((d) => d !== domain)
        : [...prev.domains, domain],
    }));
  }, []);

  const setSkills = useCallback((skills: string[]) => {
    setFilters((prev) => ({ ...prev, skills }));
  }, []);

  const toggleSkill = useCallback((skill: string) => {
    setFilters((prev) => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter((s) => s !== skill)
        : [...prev.skills, skill],
    }));
  }, []);

  const setOnlyWithMetrics = useCallback((onlyWithMetrics: boolean) => {
    setFilters((prev) => ({ ...prev, onlyWithMetrics }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(EMPTY_FILTERS);
  }, []);

  const hasActiveFilters =
    filters.query.trim() !== '' ||
    filters.types.length > 0 ||
    filters.domains.length > 0 ||
    filters.skills.length > 0 ||
    filters.onlyWithMetrics;

  const activeFilterCount =
    (filters.query.trim() ? 1 : 0) +
    filters.types.length +
    filters.domains.length +
    filters.skills.length +
    (filters.onlyWithMetrics ? 1 : 0);

  return (
    <FilterContext.Provider
      value={{
        filters,
        setQuery,
        setTypes,
        toggleType,
        setDomains,
        toggleDomain,
        setSkills,
        toggleSkill,
        setOnlyWithMetrics,
        clearFilters,
        hasActiveFilters,
        activeFilterCount,
      }}
    >
      {children}
    </FilterContext.Provider>
  );
}

export function useFilters() {
  const context = useContext(FilterContext);
  if (!context) {
    throw new Error('useFilters must be used within a FilterProvider');
  }
  return context;
}
