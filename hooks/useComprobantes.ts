'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import {
  getComprobantes,
  type ComprobanteListItem,
  type ComprobantesFilters,
  type PaginatedResult,
} from '@/lib/api/comprobantes';

interface UseComprobantesOptions {
  pageSize?: number;
}

export function useComprobantes({ pageSize = 10 }: UseComprobantesOptions = {}) {
  const { data: session } = useSession();
  const token = session?.accessToken;
  const sucursalId = session?.user?.sucursalId ?? undefined;

  const [data, setData] = useState<PaginatedResult<ComprobanteListItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [search, setSearch] = useState('');
  const [filterTipo, setFilterTipo] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Debounce para search
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setDebouncedSearch(search), 350);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [search]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, filterTipo, filterEstado, fechaDesde, fechaHasta]);

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);

    const filters: ComprobantesFilters = {
      sucursalId: sucursalId ?? undefined,
      page: currentPage,
      pageSize,
    };
    if (debouncedSearch) filters.search = debouncedSearch;
    if (filterTipo) filters.tipoComprobante = filterTipo;
    if (filterEstado) filters.estadoSunat = filterEstado;
    if (fechaDesde) filters.fechaInicio = fechaDesde;
    if (fechaHasta) filters.fechaFin = fechaHasta;

    try {
      const result = await getComprobantes(token, filters);
      setData(result);
    } catch (err: any) {
      setError(err.message ?? 'Error al cargar comprobantes.');
    } finally {
      setLoading(false);
    }
  }, [token, sucursalId, currentPage, pageSize, debouncedSearch, filterTipo, filterEstado, fechaDesde, fechaHasta]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    token,
    comprobantes: data?.items ?? [],
    totalCount: data?.totalCount ?? 0,
    totalPages: data?.totalPages ?? 1,
    currentPage,
    setCurrentPage,
    loading,
    error,
    refetch: fetchData,

    // Filtros
    search,
    setSearch,
    filterTipo,
    setFilterTipo,
    filterEstado,
    setFilterEstado,
    fechaDesde,
    setFechaDesde,
    fechaHasta,
    setFechaHasta,
  };
}
