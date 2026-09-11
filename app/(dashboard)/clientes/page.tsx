'use client';

import { useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import ExcelJS from 'exceljs';
import { Search, Download, Plus, Users, Eye, Pencil, Trash2, Check, MapPin, Loader2 } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { getSegment, SEGMENT_COLORS, SEGMENTS } from '@/components/clientes/segment';
import { useClientes } from '@/hooks/clientes/useClientes';
import { deleteCliente } from '@/lib/api/clientes';
import ClienteDetailModal from '@/components/clientes/ClienteDetailModal';
import NuevoClienteModal from '@/components/clientes/NuevoClienteModal';
import EditarClienteModal from '@/components/clientes/EditarClienteModal';
import type { Cliente, NivelCliente } from '@/types/clientes';
import type { Segment } from '@/components/clientes/segment';

const NIVEL_SEGMENT: Record<NivelCliente, Segment> = {
  NUEVO: 'Nuevo', OCASIONAL: 'Ocasional', FRECUENTE: 'Frecuente', FIEL: 'Fiel', VIP: 'VIP',
};

/** Colores de relleno por nivel (aprox. a SEGMENT_COLORS de Tailwind) para las celdas del Excel. */
const NIVEL_EXCEL_COLORS: Record<NivelCliente, { bg: string; text: string }> = {
  NUEVO:     { bg: 'FFF1F5F9', text: 'FF475569' },
  OCASIONAL: { bg: 'FFEFF6FF', text: 'FF2563EB' },
  FRECUENTE: { bg: 'FFFFF7ED', text: 'FFEA580C' },
  FIEL:      { bg: 'FFF5F3FF', text: 'FF7C3AED' },
  VIP:       { bg: 'FFFFF1F2', text: 'FFE11D48' },
};

const NIVEL_LABEL: Record<NivelCliente, string> = {
  NUEVO: 'Nuevo', OCASIONAL: 'Ocasional', FRECUENTE: 'Frecuente', FIEL: 'Fiel', VIP: 'VIP',
};

const BRAND_COLOR = 'FF007542';

async function exportClientesExcel(clientes: Cliente[], usuario: string, filtroSegmento: Segment | 'Todos') {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'RestoPro';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Clientes', { views: [{ state: 'frozen', ySplit: 4 }] });

  const columnas = ['N°', 'Cliente', 'Documento', 'Teléfono', 'Correo', 'Dirección', 'Nivel', 'Total gastado', 'Último pedido'];
  sheet.columns = [
    { key: 'n', width: 6 },
    { key: 'nombre', width: 30 },
    { key: 'documento', width: 16 },
    { key: 'telefono', width: 16 },
    { key: 'email', width: 28 },
    { key: 'direccion', width: 32 },
    { key: 'nivel', width: 14 },
    { key: 'total', width: 16 },
    { key: 'ultimoPedido', width: 16 },
  ];

  // ── Encabezado (título + metadata) ──
  const ahora = new Date();
  sheet.mergeCells(1, 1, 1, columnas.length);
  const tituloCell = sheet.getCell(1, 1);
  tituloCell.value = 'REPORTE DE CLIENTES — RESTOPRO';
  tituloCell.font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
  tituloCell.alignment = { vertical: 'middle', horizontal: 'left' };
  tituloCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND_COLOR } };
  sheet.getRow(1).height = 28;

  sheet.mergeCells(2, 1, 2, columnas.length);
  const subtituloCell = sheet.getCell(2, 1);
  const filtroTxt = filtroSegmento === 'Todos' ? 'Todos los niveles' : `Nivel: ${filtroSegmento}`;
  subtituloCell.value =
    `Generado el ${ahora.toLocaleDateString('es-PE')} ${ahora.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}` +
    `  ·  Por: ${usuario}  ·  ${filtroTxt}  ·  Total: ${clientes.length} cliente${clientes.length === 1 ? '' : 's'}`;
  subtituloCell.font = { italic: true, size: 10, color: { argb: 'FF64748B' } };
  subtituloCell.alignment = { vertical: 'middle', horizontal: 'left' };

  // ── Fila 3 en blanco como respiro visual ──

  // ── Encabezado de la tabla ──
  const headerRow = sheet.getRow(4);
  headerRow.values = columnas;
  headerRow.eachCell(cell => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E8C45' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = { bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } } };
  });
  headerRow.height = 20;

  // ── Filas de datos, numeradas ──
  clientes.forEach((c, idx) => {
    const primeraDir = c.direcciones?.[0];
    const direccion = primeraDir
      ? (primeraDir.direccion || [primeraDir.distrito, primeraDir.provincia].filter(Boolean).join(', ') || '')
      : '';

    const row = sheet.addRow({
      n: idx + 1,
      nombre: c.nombre,
      documento: c.numeroDocumento ? `${c.tipoDocumento ?? ''} ${c.numeroDocumento}`.trim() : '',
      telefono: c.telefono ?? '',
      email: c.email ?? '',
      direccion,
      nivel: NIVEL_LABEL[c.nivel],
      total: c.totalGastado,
      ultimoPedido: c.ultimoPedido ? new Date(c.ultimoPedido).toLocaleDateString('es-PE') : '',
    });

    row.getCell('n').alignment = { horizontal: 'center' };
    row.getCell('total').numFmt = '"S/." #,##0.00';
    row.getCell('ultimoPedido').alignment = { horizontal: 'center' };

    const colores = NIVEL_EXCEL_COLORS[c.nivel];
    const nivelCell = row.getCell('nivel');
    nivelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colores.bg } };
    nivelCell.font = { bold: true, color: { argb: colores.text } };
    nivelCell.alignment = { horizontal: 'center' };

    if (idx % 2 === 1) {
      ['n', 'nombre', 'documento', 'telefono', 'email', 'direccion', 'total', 'ultimoPedido'].forEach(key => {
        row.getCell(key).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      });
    }
  });

  sheet.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: columnas.length } };

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `clientes-${new Date().toISOString().split('T')[0]}.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function ClientesPage() {
  const { data: session } = useSession();
  const { triggerToast } = useApp();
  const { clientes, setClientes, loading, fetchClientes } = useClientes();

  const [search, setSearch] = useState('');
  const [filterSegment, setFilterSegment] = useState<Segment | 'Todos'>('Todos');
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [editandoCliente, setEditandoCliente] = useState<Cliente | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);

  const token = session?.accessToken;

  const segmentCounts = useMemo(() => {
    const counts: Record<Segment, number> = { Nuevo: 0, Ocasional: 0, Frecuente: 0, Fiel: 0, VIP: 0 };
    clientes.forEach(c => { counts[NIVEL_SEGMENT[c.nivel]]++; });
    return counts;
  }, [clientes]);

  const filtered = clientes.filter(c => {
    const matchesSearch =
      c.nombre.toLowerCase().includes(search.toLowerCase()) ||
      (c.telefono ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (c.email ?? '').toLowerCase().includes(search.toLowerCase());
    const matchesSegment = filterSegment === 'Todos' || NIVEL_SEGMENT[c.nivel] === filterSegment;
    return matchesSearch && matchesSegment;
  });

  const handleDelete = async (id: number) => {
    if (deleteConfirm !== id) { setDeleteConfirm(id); return; }
    if (!token) return;
    try {
      await deleteCliente(token, id);
      setClientes(prev => prev.filter(c => c.id !== id));
      triggerToast('Cliente eliminado', 'success');
    } catch {
      triggerToast('Error al eliminar el cliente', 'error');
    } finally {
      setDeleteConfirm(null);
    }
  };

  const handleCreated = (cliente: Cliente) => {
    setClientes(prev => [cliente, ...prev]);
  };

  const handleUpdated = (cliente: Cliente) => {
    setClientes(prev => prev.map(c => c.id === cliente.id ? cliente : c));
    if (selectedCliente?.id === cliente.id) setSelectedCliente(cliente);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const usuario = session?.user?.name ?? session?.user?.username ?? 'Usuario';
      await exportClientesExcel(filtered, usuario, filterSegment);
      triggerToast('Reporte de clientes descargado como archivo Excel.', 'success');
    } catch {
      triggerToast('No se pudo generar el archivo Excel.', 'error');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-5 animate-section">
      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="bg-brand p-2 rounded-xl">
            <Users className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 leading-tight">Clientes</h3>
            <p className="text-[11px] text-slate-500">Total de clientes: {clientes.length}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-1 min-w-65">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nombre, teléfono o email..."
              className="input w-full pl-9 pr-3 py-2"
            />
          </div>
          <button type="button" onClick={() => fetchClientes()} className="btn-secondary shrink-0">
            Buscar
          </button>
          <select
            value={filterSegment}
            onChange={e => setFilterSegment(e.target.value as Segment | 'Todos')}
            className="input px-3 py-2 shrink-0"
          >
            <option value="Todos">Todos</option>
            {SEGMENTS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button onClick={handleExport} disabled={exporting} className="btn-secondary disabled:opacity-60">
            {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />} Excel
          </button>
          <button onClick={() => setShowNewModal(true)} className="btn-primary">
            <Plus className="h-3.5 w-3.5" /> Nuevo cliente
          </button>
        </div>
      </div>

      {/* ── Segment tiles ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {SEGMENTS.map(s => {
          const count = segmentCounts[s.key];
          const pct = clientes.length ? Math.round((count / clientes.length) * 100) : 0;
          const colors = SEGMENT_COLORS[s.key];
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => setFilterSegment(filterSegment === s.key ? 'Todos' : s.key)}
              className={`text-left card p-3.5 transition-all ${filterSegment === s.key ? 'ring-2 ring-brand' : ''}`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className={`text-[11px] font-bold uppercase tracking-wide ${colors.text}`}>{s.label}</span>
                <span className="text-[10px] text-slate-400">{s.range}</span>
              </div>
              <p className="text-2xl font-bold text-slate-900">{count}</p>
              <div className="h-1 rounded-full bg-slate-100 mt-2 mb-1.5 overflow-hidden">
                <div className={`h-full rounded-full ${colors.bar}`} style={{ width: `${pct}%` }} />
              </div>
              <p className="text-[10px] text-slate-400">{pct}% del total</p>
            </button>
          );
        })}
      </div>

      {/* ── Tabla ── */}
      <div className="card-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left">
                <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Cliente</th>
                <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Correo</th>
                <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Dirección</th>
                <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Nivel</th>
                <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total gastado</th>
                <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Último pedido</th>
                <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-400">
                    Cargando clientes...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-400">
                    No se encontraron clientes.
                  </td>
                </tr>
              ) : (
                filtered.map(c => {
                  const segment = NIVEL_SEGMENT[c.nivel];
                  const colors = SEGMENT_COLORS[segment];
                  const primeraDir = c.direcciones?.[0];
                  return (
                    <tr
                      key={c.id}
                      onClick={() => setSelectedCliente(c)}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      {/* Cliente */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-brand/10 text-brand flex items-center justify-center text-sm font-bold shrink-0">
                            {c.nombre.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-800 truncate">{c.nombre}</p>
                            {c.numeroDocumento && (
                              <p className="text-[11px] text-slate-400">
                                {c.tipoDocumento ? `${c.tipoDocumento}: ` : ''}{c.numeroDocumento}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Correo */}
                      <td className="px-4 py-3 text-xs text-slate-600">{c.email ?? '—'}</td>

                      {/* Dirección */}
                      <td className="px-4 py-3">
                        {primeraDir ? (
                          <div className="flex items-center gap-1 text-xs text-slate-600 max-w-40">
                            <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                            <span className="truncate">{primeraDir.direccion || [primeraDir.distrito, primeraDir.provincia].filter(Boolean).join(', ') || '—'}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>

                      {/* Nivel */}
                      <td className="px-4 py-3">
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
                          {segment}
                        </span>
                      </td>

                      {/* Total gastado */}
                      <td className="px-4 py-3 text-sm font-semibold text-slate-800">S/. {c.totalGastado.toFixed(2)}</td>

                      {/* Último pedido */}
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {c.ultimoPedido ? new Date(c.ultimoPedido).toLocaleDateString('es-PE') : '—'}
                      </td>

                      {/* Acciones */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => setSelectedCliente(c)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-brand hover:bg-brand/5"
                            title="Ver detalle"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setEditandoCliente(c)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(c.id)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              deleteConfirm === c.id ? 'bg-red-100 text-red-600' : 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                            }`}
                            title={deleteConfirm === c.id ? 'Clic de nuevo para confirmar' : 'Eliminar'}
                          >
                            {deleteConfirm === c.id ? <Check className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ClienteDetailModal
        cliente={selectedCliente}
        onClose={() => setSelectedCliente(null)}
        onUpdated={handleUpdated}
      />
      <NuevoClienteModal
        open={showNewModal}
        onClose={() => setShowNewModal(false)}
        onCreated={handleCreated}
      />
      <EditarClienteModal
        cliente={editandoCliente}
        open={!!editandoCliente}
        onClose={() => setEditandoCliente(null)}
        onUpdated={handleUpdated}
      />
    </div>
  );
}
