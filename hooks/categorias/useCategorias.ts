'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useApp } from '@/context/AppContext';
import {
  getCategorias,
  createCategoria,
  updateCategoria,
  deleteCategoria,
} from '@/lib/api/categorias';
import type { CategoriaDto, CreateCategoriaDto, UpdateCategoriaDto } from '@/types/categorias';

export function useCategorias() {
  const { data: session } = useSession();
  const { triggerToast } = useApp();
  const [categorias, setCategorias] = useState<CategoriaDto[]>([]);
  const [loading, setLoading] = useState(false);

  const token = session?.accessToken;
  const sessionError = (session as any)?.error;

  const fetchCategorias = useCallback(async () => {
    if (!token || sessionError) return;
    setLoading(true);
    try {
      const data = await getCategorias(token);
      setCategorias(data);
    } catch (err: any) {
      if (err?.status === 401) {
        triggerToast('Sesión expirada, vuelve a iniciar sesión', 'error');
        return;
      }
      triggerToast('Error al cargar categorías', 'error');
    } finally {
      setLoading(false);
    }
  }, [token, sessionError]);

  useEffect(() => {
    if (token && !sessionError) {
      fetchCategorias();
    }
  }, [token, sessionError, fetchCategorias]);

  const crearCategoria = useCallback(
    async (dto: CreateCategoriaDto) => {
      if (!token || sessionError) return null;
      try {
        const categoria = await createCategoria(token, dto);
        setCategorias((prev) => [...prev, categoria]);
        triggerToast('Categoría creada exitosamente', 'success');
        return categoria;
      } catch (err: any) {
        triggerToast(err?.message || 'Error al crear categoría', 'error');
        return null;
      }
    },
    [token, sessionError]
  );

  const editarCategoria = useCallback(
    async (id: number, dto: UpdateCategoriaDto) => {
      if (!token || sessionError) return null;
      try {
        const categoria = await updateCategoria(token, id, dto);
        setCategorias((prev) =>
          prev.map((c) => (c.id === id ? categoria : c))
        );
        triggerToast('Categoría actualizada exitosamente', 'success');
        return categoria;
      } catch (err: any) {
        triggerToast(err?.message || 'Error al actualizar categoría', 'error');
        return null;
      }
    },
    [token, sessionError]
  );

  const eliminarCategoria = useCallback(
    async (id: number) => {
      if (!token || sessionError) return false;
      try {
        await deleteCategoria(token, id);
        setCategorias((prev) => prev.filter((c) => c.id !== id));
        triggerToast('Categoría eliminada', 'success');
        return true;
      } catch (err: any) {
        triggerToast(err?.message || 'Error al eliminar categoría', 'error');
        return false;
      }
    },
    [token, sessionError]
  );

  return {
    categorias,
    loading,
    fetchCategorias,
    crearCategoria,
    editarCategoria,
    eliminarCategoria,
  };
}
