import React, { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, Download } from 'lucide-react';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Textarea } from './components/ui/textarea';
import { Button } from './components/ui/button';
import { Card } from './components/ui/card';
import { ImageWithFallback } from './components/figma/ImageWithFallback';
import logoImg from '@/imports/WhatsApp_Image_2026-06-21_at_12.38.52_PM.jpeg';

interface QuotationItem {
  id: string;
  details: string;
  qty: number;
  unitPrice: number;
}

interface FormData {
  quoteNumber: string;
  date: string;
  validUntil: string;
  billToName: string;
  billToCompany: string;
  billToAddress: string;
  billToEmail: string;
  billToPhone: string;
  shipToName: string;
  shipToCompany: string;
  shipToAddress: string;
  shipToEmail: string;
  shipToPhone: string;
  paymentTerms: string;
  taxRate: number;
}

function generateQuoteNumber(): string {
  const today = new Date();
  const year = today.getFullYear();
  const key = `quote_counter_${year}`;
  const last = parseInt(localStorage.getItem(key) || '0', 10);
  const next = last + 1;
  localStorage.setItem(key, next.toString());
  return `QT-${year}-${String(next).padStart(3, '0')}`;
}

export default function App() {
  const previewRef = useRef<HTMLDivElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const [previewScale, setPreviewScale] = useState(1);
  
  const [formData, setFormData] = useState<FormData>({
    quoteNumber: generateQuoteNumber(),
    date: '2026-06-21',
    validUntil: '2026-07-21',
    billToName: '',
    billToCompany: '',
    billToAddress: '',
    billToEmail: '',
    billToPhone: '',
    shipToName: '',
    shipToCompany: '',
    shipToAddress: '',
    shipToEmail: '',
    shipToPhone: '',
    paymentTerms: 'Payment due within 30 days.\nBank Transfer to Account: 1234567890\nBank Name: Sample Bank Ltd.\nCurrency: PKR',
    taxRate: 8.75,
  });

  const [items, setItems] = useState<QuotationItem[]>([
    { id: '1', details: '', qty: 1, unitPrice: 0 },
  ]);

  const updateFormData = (field: keyof FormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addItem = () => {
    const newItem: QuotationItem = {
      id: Date.now().toString(),
      details: '',
      qty: 1,
      unitPrice: 0,
    };
    setItems([...items, newItem]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof QuotationItem, value: string | number) => {
    setItems(items.map(item => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const calculateItemTotal = (item: QuotationItem) => {
    return item.qty * item.unitPrice;
  };

  const calculateSubTotal = () => {
    return items.reduce((sum, item) => sum + calculateItemTotal(item), 0);
  };

  const calculateTaxAmount = () => {
    return (calculateSubTotal() * formData.taxRate) / 100;
  };

  const calculateGrandTotal = () => {
    return calculateSubTotal() + calculateTaxAmount();
  };

  const downloadPDF = async () => {
    try {
      const res = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteNumber: formData.quoteNumber,
          date: formData.date,
          validUntil: formData.validUntil,
          billToName: formData.billToName,
          billToCompany: formData.billToCompany,
          billToAddress: formData.billToAddress,
          billToEmail: formData.billToEmail,
          billToPhone: formData.billToPhone,
          shipToName: formData.shipToName,
          shipToCompany: formData.shipToCompany,
          shipToAddress: formData.shipToAddress,
          shipToEmail: formData.shipToEmail,
          shipToPhone: formData.shipToPhone,
          paymentTerms: formData.paymentTerms,
          taxRate: formData.taxRate,
          items: items.map(i => ({
            id: i.id,
            details: i.details,
            qty: i.qty,
            unitPrice: i.unitPrice,
          })),
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(err || 'Server error');
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Quotation_${formData.quoteNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF download failed:', err);
      alert('Failed to download PDF. Please try again.');
    }
  };

  useEffect(() => {
    const container = previewContainerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      const containerWidth = container.clientWidth;
      const A4_WIDTH_PX = 210 * 3.779527559;

      if (containerWidth > 0 && containerWidth < A4_WIDTH_PX) {
        setPreviewScale(containerWidth / A4_WIDTH_PX);
      } else {
        setPreviewScale(1);
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const container = previewContainerRef.current;
    if (!container) return;

    const preview = container.querySelector('.quotation-preview') as HTMLElement;
    if (!preview) return;

    if (previewScale < 1) {
      const unscaledHeight = preview.scrollHeight;
      container.style.height = `${unscaledHeight * previewScale}px`;
      container.style.width = `${preview.clientWidth * previewScale}px`;
    } else {
      container.style.height = '';
      container.style.width = '';
    }
  }, [previewScale]);

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-6 md:p-8">
      <div className="max-w-[1800px] mx-auto">
        <div className="mb-6 text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">Quotation Generator</h1>
          <p className="text-gray-600 text-sm sm:text-base">Burhan Aluminium Traders</p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 xl:gap-8">
          {/* INPUT FORM */}
          <div className="space-y-5">
            <Card className="p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-semibold mb-4 text-gray-900">Quotation Details</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="quoteNumber">Quote Number</Label>
                  <Input
                    id="quoteNumber"
                    value={formData.quoteNumber}
                    readOnly
                    className="cursor-not-allowed opacity-80"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => updateFormData('date', e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="validUntil">Valid Until</Label>
                  <Input
                    id="validUntil"
                    type="date"
                    value={formData.validUntil}
                    onChange={(e) => updateFormData('validUntil', e.target.value)}
                  />
                </div>
              </div>
            </Card>

            <Card className="p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-semibold mb-4 text-gray-900">Bill To</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="billToName">Client Name</Label>
                  <Input
                    id="billToName"
                    value={formData.billToName}
                    onChange={(e) => updateFormData('billToName', e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="billToCompany">Company</Label>
                  <Input
                    id="billToCompany"
                    value={formData.billToCompany}
                    onChange={(e) => updateFormData('billToCompany', e.target.value)}
                  />
                </div>
                <div className="sm:col-span-2 flex flex-col gap-1.5">
                  <Label htmlFor="billToAddress">Address</Label>
                  <Input
                    id="billToAddress"
                    value={formData.billToAddress}
                    onChange={(e) => updateFormData('billToAddress', e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="billToEmail">Email</Label>
                  <Input
                    id="billToEmail"
                    type="email"
                    value={formData.billToEmail}
                    onChange={(e) => updateFormData('billToEmail', e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="billToPhone">Phone</Label>
                  <Input
                    id="billToPhone"
                    value={formData.billToPhone}
                    onChange={(e) => updateFormData('billToPhone', e.target.value)}
                  />
                </div>
              </div>
            </Card>

            <Card className="p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-semibold mb-4 text-gray-900">Ship To</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="shipToName">Recipient Name</Label>
                  <Input
                    id="shipToName"
                    value={formData.shipToName}
                    onChange={(e) => updateFormData('shipToName', e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="shipToCompany">Company</Label>
                  <Input
                    id="shipToCompany"
                    value={formData.shipToCompany}
                    onChange={(e) => updateFormData('shipToCompany', e.target.value)}
                  />
                </div>
                <div className="sm:col-span-2 flex flex-col gap-1.5">
                  <Label htmlFor="shipToAddress">Address</Label>
                  <Input
                    id="shipToAddress"
                    value={formData.shipToAddress}
                    onChange={(e) => updateFormData('shipToAddress', e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="shipToEmail">Email</Label>
                  <Input
                    id="shipToEmail"
                    type="email"
                    value={formData.shipToEmail}
                    onChange={(e) => updateFormData('shipToEmail', e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="shipToPhone">Phone</Label>
                  <Input
                    id="shipToPhone"
                    value={formData.shipToPhone}
                    onChange={(e) => updateFormData('shipToPhone', e.target.value)}
                  />
                </div>
              </div>
            </Card>

            <Card className="p-4 sm:p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Items</h2>
                <Button onClick={addItem} size="sm">
                  <Plus className="w-4 h-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Add Item</span>
                  <span className="sm:hidden">Add</span>
                </Button>
              </div>
              <div className="space-y-3">
                {items.map((item) => (
                  <div key={item.id} className="border border-gray-200 rounded-lg p-3 sm:p-4 bg-gray-50">
                    {/* Mobile: stacked layout */}
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor={`item-details-${item.id}`}>Item Details</Label>
                        <Input
                          id={`item-details-${item.id}`}
                          value={item.details}
                          onChange={(e) => updateItem(item.id, 'details', e.target.value)}
                          placeholder="Description"
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="flex flex-col gap-1.5">
                          <Label htmlFor={`item-qty-${item.id}`}>Qty</Label>
                          <Input
                            id={`item-qty-${item.id}`}
                            type="number"
                            min="0"
                            step="1"
                            value={item.qty}
                            onChange={(e) => updateItem(item.id, 'qty', parseFloat(e.target.value) || 0)}
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <Label htmlFor={`item-price-${item.id}`}>Unit Price (PKR)</Label>
                          <Input
                            id={`item-price-${item.id}`}
                            type="number"
                            min="0"
                            step="1"
                            value={item.unitPrice}
                            onChange={(e) => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <Label>Total (PKR)</Label>
                          <div className="h-10 flex items-center font-semibold text-gray-900 text-sm">
                            {calculateItemTotal(item).toLocaleString('en-PK')}
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(item.id)}
                          disabled={items.length === 1}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 text-xs"
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-semibold mb-4 text-gray-900">Additional Details</h2>
              <div className="space-y-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="taxRate">Tax Rate (%)</Label>
                  <Input
                    id="taxRate"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.taxRate}
                    onChange={(e) => updateFormData('taxRate', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="paymentTerms">Payment Terms</Label>
                  <Textarea
                    id="paymentTerms"
                    value={formData.paymentTerms}
                    onChange={(e) => updateFormData('paymentTerms', e.target.value)}
                    rows={4}
                  />
                </div>
              </div>
            </Card>

            <div className="flex justify-center pb-2">
              <Button onClick={downloadPDF} size="lg" className="w-full sm:w-auto">
                <Download className="w-5 h-5 mr-2" />
                Download PDF
              </Button>
            </div>
          </div>

          {/* LIVE PREVIEW */}
          <div className="xl:sticky xl:top-8 xl:self-start">
            <p className="text-xs text-gray-500 mb-2 text-center xl:hidden">
              Live Preview {previewScale < 1 ? `(${Math.round(previewScale * 100)}% scale)` : '(scroll to see full)'}
            </p>
          <div
            ref={previewContainerRef}
            className="bg-white shadow-2xl rounded-lg overflow-hidden mx-auto"
          >
            <div
              style={{
                transform: `scale(${previewScale})`,
                transformOrigin: 'top left',
                width: '210mm',
                margin: previewScale >= 1 ? '0 auto' : 0,
              }}
            >
            <div
              ref={previewRef}
              className="quotation-preview bg-white"
              style={{
                width: '210mm',
                minHeight: '297mm',
                position: 'relative',
              }}
              >
                {/* Header with Colored Banner */}
                <div className="relative" style={{ backgroundColor: '#93b4bd', padding: '20px 30px' }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {/* Company Logo */}
                      <div className="w-[70px] h-[70px] rounded-full overflow-hidden bg-white flex-shrink-0 border-2 border-white/60">
                        <ImageWithFallback
                          src={logoImg}
                          alt="Burhan Aluminium Traders logo"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <h1 className="text-white text-2xl font-bold tracking-wide">
                          BURHAN ALUMINIUM TRADERS
                        </h1>
                        <p className="text-white/90 text-sm">Quality Aluminium Solutions</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Main Content Wrapper with Right Sidebar */}
                <div className="relative">
                  {/* Right Sidebar - Vertical QUOTATION Text */}
                  <div
                    className="absolute right-0 top-0 h-full flex items-center justify-center"
                    style={{
                      width: '40px',
                      backgroundColor: '#93b4bd',
                      writingMode: 'vertical-rl',
                      textOrientation: 'mixed'
                    }}
                  >
                    <span className="text-white font-bold tracking-widest transform rotate-180" style={{ fontSize: '11px', letterSpacing: '3px' }}>
                      BURHAN ALUMINIUM TRADERS
                    </span>
                  </div>

                  {/* Content Area */}
                  <div style={{ padding: '30px 50px 30px 30px' }}>
                    {/* Quote Info Row */}
                    <div className="grid grid-cols-3 gap-4 mb-6 text-sm">
                      <div>
                        <div className="font-semibold text-gray-700">Quote #:</div>
                        <div className="text-gray-900">{formData.quoteNumber || '-'}</div>
                      </div>
                      <div>
                        <div className="font-semibold text-gray-700">Date:</div>
                        <div className="text-gray-900">{formData.date || '-'}</div>
                      </div>
                      <div>
                        <div className="font-semibold text-gray-700">Valid Until:</div>
                        <div className="text-gray-900">{formData.validUntil || '-'}</div>
                      </div>
                    </div>

                    {/* Bill To & Ship To */}
                    <div className="grid grid-cols-2 gap-6 mb-6 text-sm">
                      <div>
                        <div
                          className="font-bold text-white px-3 py-1 mb-2"
                          style={{ backgroundColor: '#93b4bd' }}
                        >
                          BILL TO
                        </div>
                        <div className="space-y-1 px-2">
                          <div className="font-semibold text-gray-900">{formData.billToName || '-'}</div>
                          <div className="text-gray-700">{formData.billToCompany || '-'}</div>
                          <div className="text-gray-700">{formData.billToAddress || '-'}</div>
                          <div className="text-gray-700">{formData.billToEmail || '-'}</div>
                          <div className="text-gray-700">{formData.billToPhone || '-'}</div>
                        </div>
                      </div>
                      <div>
                        <div
                          className="font-bold text-white px-3 py-1 mb-2"
                          style={{ backgroundColor: '#93b4bd' }}
                        >
                          SHIP TO
                        </div>
                        <div className="space-y-1 px-2">
                          <div className="font-semibold text-gray-900">{formData.shipToName || '-'}</div>
                          <div className="text-gray-700">{formData.shipToCompany || '-'}</div>
                          <div className="text-gray-700">{formData.shipToAddress || '-'}</div>
                          <div className="text-gray-700">{formData.shipToEmail || '-'}</div>
                          <div className="text-gray-700">{formData.shipToPhone || '-'}</div>
                        </div>
                      </div>
                    </div>

                    {/* Items Table with Watermark */}
                    <div className="relative mb-6">
                      {/* Diagonal Watermark */}
                      <div
                        className="absolute inset-0 flex items-center justify-center pointer-events-none"
                        style={{
                          transform: 'rotate(-45deg)',
                          opacity: 0.08,
                          fontSize: '48px',
                          fontWeight: 'bold',
                          color: '#93b4bd',
                          letterSpacing: '8px',
                          zIndex: 1
                        }}
                      >
                        BURHAN ALUMINIUM TRADERS
                      </div>

                      {/* Table */}
                      <table className="w-full text-sm border-collapse relative z-10">
                        <thead>
                          <tr style={{ backgroundColor: '#93b4bd' }}>
                            <th className="text-left text-white font-bold px-3 py-2 border border-gray-300">
                              ITEM DETAILS
                            </th>
                            <th className="text-center text-white font-bold px-3 py-2 border border-gray-300">
                              QTY
                            </th>
                            <th className="text-right text-white font-bold px-3 py-2 border border-gray-300">
                              UNIT PRICE (PKR)
                            </th>
                            <th className="text-right text-white font-bold px-3 py-2 border border-gray-300">
                              TOTAL (PKR)
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((item) => (
                            <tr key={item.id}>
                              <td className="px-3 py-2 border border-gray-300 text-gray-900">
                                {item.details || '-'}
                              </td>
                              <td className="px-3 py-2 border border-gray-300 text-center text-gray-900">
                                {item.qty}
                              </td>
                              <td className="px-3 py-2 border border-gray-300 text-right text-gray-900">
                                PKR {item.unitPrice.toLocaleString('en-PK')}
                              </td>
                              <td className="px-3 py-2 border border-gray-300 text-right font-semibold text-gray-900">
                                PKR {calculateItemTotal(item).toLocaleString('en-PK')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Totals Section */}
                    <div className="flex justify-end mb-6">
                      <div className="w-80">
                        <div className="flex justify-between py-2 text-sm border-b border-gray-300">
                          <span className="font-semibold text-gray-700">Sub Total:</span>
                          <span className="text-gray-900">PKR {calculateSubTotal().toLocaleString('en-PK')}</span>
                        </div>
                        <div className="flex justify-between py-2 text-sm border-b border-gray-300">
                          <span className="font-semibold text-gray-700">Tax ({formData.taxRate}%):</span>
                          <span className="text-gray-900">PKR {calculateTaxAmount().toLocaleString('en-PK', { maximumFractionDigits: 2 })}</span>
                        </div>
                        <div
                          className="flex justify-between py-3 px-4 mt-2 text-white font-bold"
                          style={{ backgroundColor: '#93b4bd' }}
                        >
                          <span>GRAND TOTAL:</span>
                          <span>PKR {calculateGrandTotal().toLocaleString('en-PK', { maximumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                    </div>

                    {/* Payment Terms */}
                    <div className="border-t border-gray-300 pt-4">
                      <div
                        className="font-bold text-white px-3 py-1 mb-2 inline-block"
                        style={{ backgroundColor: '#93b4bd' }}
                      >
                        PAYMENT TERMS
                      </div>
                      <div className="text-sm text-gray-700 whitespace-pre-line px-2">
                        {formData.paymentTerms || 'No payment terms specified.'}
                      </div>
                    </div>

                    {/* Footer Note */}
                    <div className="mt-6 text-center text-xs text-gray-500">
                      <p>Thank you for your business!</p>
                      <p className="mt-1">For any queries, please contact us.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .quotation-preview, .quotation-preview * {
            visibility: visible;
          }
          .quotation-preview {
            position: absolute;
            left: 0;
            top: 0;
          }
        }
      `}</style>
    </div>
  );
}
