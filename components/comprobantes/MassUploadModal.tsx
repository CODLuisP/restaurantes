'use client';

import { useState } from 'react';
import { Check, FileSpreadsheet, UploadCloud } from 'lucide-react';
import { Modal } from '@/components/ui';
import type { Comprobante } from './types';

interface MassUploadModalProps {
  open: boolean;
  onClose: () => void;
  onUploadComplete: (newComps: Comprobante[]) => void;
}

export default function MassUploadModal({ open, onClose, onUploadComplete }: MassUploadModalProps) {
  const [progress, setProgress] = useState(-1); // -1: no cargando, 0-100: cargando
  const [loadedFiles, setLoadedFiles] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState('');

  const simulateUpload = () => {
    setLoadedFiles(['invoice_2026_01.xml', 'invoice_2026_02.xml', 'invoice_2026_03.xml', 'invoice_2026_04.xml', 'invoice_2026_05.xml']);
    setProgress(0);
    setCurrentStep('Leyendo firmas de archivos XML...');

    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            // Generar 5 comprobantes simulados
            const now = new Date();
            const dateStr = `${now.toLocaleDateString('es-PE')} ${now.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}`;
            const comps: Comprobante[] = [
              {
                id: 'M-1',
                fecha: dateStr,
                tipo: 'Factura',
                numero: 'F001-00015120',
                clienteDoc: { type: 'RUC', number: '20102030405', name: 'CORPORACION TEXTIL DEL SUR S.A.C.' },
                monto: 1500.00,
                subtotal: 1271.19,
                igv: 228.81,
                estadoSunat: 'Aceptado',
                correoStatus: 'Pendiente',
                whatsappStatus: 'Pendiente',
                metodoPago: 'Tarjeta',
                hash: 'FAB76A52C098',
                tieneSunat: true,
                items: [{ name: 'Catering corporativo RestoPro', quantity: 1, price: 1500.00 }]
              },
              {
                id: 'M-2',
                fecha: dateStr,
                tipo: 'Factura',
                numero: 'F001-00015119',
                clienteDoc: { type: 'RUC', number: '20509080706', name: 'CONSTRUCTORA SAN GABRIEL S.A.' },
                monto: 890.00,
                subtotal: 754.24,
                igv: 135.76,
                estadoSunat: 'Aceptado',
                correoStatus: 'Pendiente',
                whatsappStatus: 'Pendiente',
                metodoPago: 'Tarjeta',
                hash: 'EAB65A41B087',
                tieneSunat: true,
                items: [{ name: 'Almuerzos Ejecutivos Premium', quantity: 20, price: 44.50 }]
              },
              {
                id: 'M-3',
                fecha: dateStr,
                tipo: 'Boleta',
                numero: 'B001-00012205',
                clienteDoc: { type: 'DNI', number: '10987654', name: 'ALVARADO MEDINA CARLOS ENRIQUE' },
                monto: 110.00,
                subtotal: 93.22,
                igv: 16.78,
                estadoSunat: 'Aceptado',
                correoStatus: 'Pendiente',
                whatsappStatus: 'Pendiente',
                metodoPago: 'Efectivo',
                hash: 'DAB54A30A076',
                tieneSunat: true,
                items: [
                  { name: 'Ceviche Clásico Carretillero', quantity: 2, price: 39.50 },
                  { name: 'Chicha Morada RestoPro (Jarra 1L)', quantity: 1, price: 18.00 },
                  { name: 'Suspiro a la Limeña de la Casa', quantity: 1, price: 16.00 }
                ]
              },
              {
                id: 'M-4',
                fecha: dateStr,
                tipo: 'Boleta',
                numero: 'B001-00012204',
                clienteDoc: { type: 'DNI', number: '20304050', name: 'GUERRERO QUISPE ELENA ISABEL' },
                monto: 68.00,
                subtotal: 57.63,
                igv: 10.37,
                estadoSunat: 'Aceptado',
                correoStatus: 'Pendiente',
                whatsappStatus: 'Pendiente',
                metodoPago: 'Yape / Plin',
                hash: 'CAB43A209065',
                tieneSunat: true,
                items: [
                  { name: 'Ají de Gallina de la Abuela', quantity: 2, price: 34.00 }
                ]
              },
              {
                id: 'M-5',
                fecha: dateStr,
                tipo: 'Boleta',
                numero: 'B001-00012203',
                clienteDoc: { type: 'DNI', number: '09887766', name: 'LOPEZ VALENCIA JULIO CESAR' },
                monto: 96.50,
                subtotal: 81.78,
                igv: 14.72,
                estadoSunat: 'Aceptado',
                correoStatus: 'Pendiente',
                whatsappStatus: 'Pendiente',
                metodoPago: 'Efectivo',
                hash: 'BAB32A108054',
                tieneSunat: true,
                items: [
                  { name: 'Lomo Saltado con Papas Amarillas', quantity: 2, price: 45.00 },
                  { name: 'Inka Kola Personal Vidrio', quantity: 1, price: 6.50 }
                ]
              }
            ];

            onUploadComplete(comps);
            setProgress(-1);
            setLoadedFiles([]);
          }, 800);
          return 100;
        }

        const nextVal = p + 20;
        if (nextVal === 40) setCurrentStep('Validando certificados digitales con el OSE...');
        if (nextVal === 80) setCurrentStep('Transmitiendo a SUNAT y registrando CDR...');
        return nextVal;
      });
    }, 400);
  };

  return (
    <Modal
      open={open}
      onClose={progress === -1 ? onClose : () => {}}
      title="Carga Masiva de XML (Comprobantes)"
      subtitle="Sube comprobantes emitidos en otros sistemas de facturación para guardarlos en RestoPro"
      size="md"
      fullHeight={false}
    >
      <div className="space-y-4">
        {progress === -1 ? (
          <div 
            onClick={simulateUpload}
            className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center bg-slate-50 hover:bg-slate-100 hover:border-brand cursor-pointer transition-all flex flex-col items-center justify-center space-y-3 group"
          >
            <div className="bg-brand/10 p-4 rounded-full group-hover:scale-110 transition-transform">
              <UploadCloud className="h-8 w-8 text-brand" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-700">Arrastra archivos XML o haz click para explorar</p>
              <p className="text-[10px] text-slate-400 mt-1">Soporta múltiples archivos XML oficiales validados por SUNAT</p>
            </div>
          </div>
        ) : (
          <div className="border border-slate-200 rounded-xl p-6 bg-white space-y-4">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
              <span className="flex items-center gap-1.5"><FileSpreadsheet className="h-4 w-4 text-brand animate-pulse" /> {currentStep}</span>
              <span>{progress}%</span>
            </div>

            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
              <div 
                className="bg-brand h-full rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>

            <div className="text-[10px] text-slate-400 max-h-[100px] overflow-y-auto font-mono space-y-1">
              {loadedFiles.map((file, idx) => (
                <div key={idx} className="flex justify-between">
                  <span>{file}</span>
                  {progress >= (idx + 1) * 20 ? (
                    <span className="text-emerald-600 font-bold flex items-center gap-0.5"><Check className="h-3 w-3" /> OK</span>
                  ) : (
                    <span className="text-slate-400">Procesando...</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={progress !== -1}
            className="btn-secondary py-1.5 px-3 text-xs disabled:opacity-50"
          >
            Cancelar
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SUBCOMPONENTE: MODAL REENVIAR POR EMAIL
// ═══════════════════════════════════════════════════════════════════════════
