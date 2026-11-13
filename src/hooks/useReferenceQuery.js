import { useQuery } from '@tanstack/react-query';

export const REFERENCE_STALE_TIME = 5 * 60 * 1000;

export const useReferenceQuery = (queryKey, queryFn, options = {}) =>
    useQuery({
        queryKey,
        queryFn,
        staleTime: REFERENCE_STALE_TIME,
        refetchOnWindowFocus: false,
        ...options,
    });
