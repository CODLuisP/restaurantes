'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useApp } from '@/context/AppContext';
import {
  getProductos,
  createProducto,
  updateProducto,
  setPrecioSucursal,
  deleteProducto,
} from '@/lib/api/productos';
import type {
  ProductoDto,
  CreateProductoDto,
  UpdateProductoDto,
  SetPrecioSucursalDto,
} from '@/types/productos';

export function useProductos(sucursalId?: number | null) {
  const { data: session } = useSession();
  const { triggerToast } = useApp();
  const [productos, setProductos] = useState<ProductoDto[]>([]);
  const [loading, setLoading] = useState(false);

  const token = session?.accessToken;
  const sessionError = (session as any)?.error;

  const fetchProductos = useCallback(async () => {
    if (!token || sessionError) return;
    setLoading(true);
    try {
      const data = await getProductos(token, {
        sucursalId: sucursalId ?? undefined,
      });
      setProductos(data);
    } catch (err: any) {
      if (err?.status === 401) {
        triggerToast('Sesión expirada, vuelve a iniciar sesión', 'error');
        return;
      }
      triggerToast('Error al cargar productos', 'error');
    } finally {
      setLoading(false);
    }
  }, [token, sessionError, sucursalId]);

  useEffect(() => {
    if (token && !sessionError) {
      fetchProductos();
    }
  }, [token, sessionError, fetchProductos]);

  const crearProducto = useCallback(
    async (dto: CreateProductoDto, precio?: number, disponible: boolean = true) => {
      if (!token || sessionError) return null;
      try {
        const producto = await createProducto(token, dto);

        if (precio !== undefined && sucursalId) {
          await setPrecioSucursal(token, producto.id, sucursalId, {
            precio,
            disponible,
            controlaStock: false,
          });
          producto.precio = precio;
          producto.disponible = disponible;
        }

        setProductos((prev) => [...prev, producto]);
        triggerToast('Producto creado exitosamente', 'success');
        return producto;
      } catch (err: any) {
        triggerToast(err?.message || 'Error al crear producto', 'error');
        return null;
      }
    },
    [token, sessionError, sucursalId]
  );

  const editarProducto = useCallback(
    async (id: number, dto: UpdateProductoDto, precioSucursal?: { precio?: number; disponible?: boolean }) => {
      if (!token || sessionError) return null;
      try {
        const producto = await updateProducto(token, id, dto);

        if (precioSucursal && sucursalId) {
          await setPrecioSucursal(token, id, sucursalId, {
            precio: precioSucursal.precio,
            disponible: precioSucursal.disponible ?? true,
            controlaStock: false,
          });
          producto.precio = precioSucursal.precio;
          producto.disponible = precioSucursal.disponible ?? true;
        }

        setProductos((prev) =>
          prev.map((p) => (p.id === id ? { ...p, ...producto } : p))
        );
        triggerToast('Producto actualizado exitosamente', 'success');
        return producto;
      } catch (err: any) {
        triggerToast(err?.message || 'Error al actualizar producto', 'error');
        return null;
      }
    },
    [token, sessionError, sucursalId]
  );

  const toggleDisponible = useCallback(
    async (id: number, disponible: boolean) => {
      if (!token || sessionError || !sucursalId) return;
      try {
        await setPrecioSucursal(token, id, sucursalId, {
          disponible,
          controlaStock: false,
        });
        setProductos((prev) =>
          prev.map((p) => (p.id === id ? { ...p, disponible } : p))
        );
      } catch (err: any) {
        triggerToast(err?.message || 'Error al cambiar disponibilidad', 'error');
      }
    },
    [token, sessionError, sucursalId]
  );

  const eliminarProducto = useCallback(
    async (id: number) => {
      if (!token || sessionError) return false;
      try {
        await deleteProducto(token, id);
        setProductos((prev) => prev.filter((p) => p.id !== id));
        triggerToast('Producto eliminado', 'success');
        return true;
      } catch (err: any) {
        triggerToast(err?.message || 'Error al eliminar producto', 'error');
        return false;
      }
    },
    [token, sessionError]
  );

  return {
    productos,
    loading,
    fetchProductos,
    crearProducto,
    editarProducto,
    toggleDisponible,
    eliminarProducto,
  };
}
