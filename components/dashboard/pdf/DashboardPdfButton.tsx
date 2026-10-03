'use client';

import { useState } from 'react';
import { FileDown } from 'lucide-react';
import { Button } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import type { DashboardPdfData } from './dashboardPdf';

interface Props {
  /** Datos ya cargados en pantalla para la fecha elegida; null mientras no hay nada que exportar. */
  data: DashboardPdfData | null;
}

/** Descarga el Resumen Ejecutivo en PDF. jsPDF se carga solo al pulsar, fuera del bundle inicial. */
export function DashboardPdfButton({ data }: Props) {
  const { triggerToast } = useApp();
  const [generando, setGenerando] = useState(false);

  const descargar = async () => {
    if (!data) return;
    setGenerando(true);
    try {
      const { buildDashboardPdf, dashboardPdfFileName } = await import('./dashboardPdf');
      buildDashboardPdf(data).save(dashboardPdfFileName(data));
    } catch (err) {
      console.warn('Dashboard PDF error:', err);
      triggerToast('No se pudo generar el PDF del dashboard.', 'error');
    } finally {
      setGenerando(false);
    }
  };

  return (
    <Button variant="ghost" size="sm" icon={<FileDown className="h-3.5 w-3.5" />} loading={generando} disabled={!data} onClick={descargar}>
      Dashboard PDF
    </Button>
  );
}
