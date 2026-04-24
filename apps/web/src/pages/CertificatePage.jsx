import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getCertificateById } from '../api';
import Layout from '../components/Layout';
import { Printer, ArrowLeft, Award, Shield } from 'lucide-react';
import lucyLogo from '../assets/lucy_logobg.png';

export default function CertificatePage() {
  const { id } = useParams();
  const { t } = useTranslation();
  const [certificate, setCertificate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const certRef = useRef(null);

  useEffect(() => {
    loadCertificate();
  }, [id]);

  async function loadCertificate() {
    try {
      const data = await getCertificateById(id);
      setCertificate(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handlePrint() {
    const printContent = certRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Certificate - ${certificate?.student?.fullName || 'Student'}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;900&family=Inter:wght@300;400;500;600&family=Cormorant+Garamond:wght@400;600;700&display=swap');
          
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            display: flex; justify-content: center; align-items: center; 
            min-height: 100vh; background: #f5f5f5; 
          }
          .certificate {
            width: 297mm; height: 210mm; position: relative;
            background: linear-gradient(135deg, #fefef9 0%, #f8f5e8 50%, #fefef9 100%);
            border: 4px double #b8860b;
            padding: 12mm;
            overflow: hidden;
          }
          .border-inner {
            position: absolute; top: 6mm; left: 6mm; right: 6mm; bottom: 6mm;
            border: 1px solid #d4a843;
            pointer-events: none;
          }
          .border-outer {
            position: absolute; top: 3mm; left: 3mm; right: 3mm; bottom: 3mm;
            border: 2px solid #c9a034;
            pointer-events: none;
          }
          .corner { position: absolute; width: 30mm; height: 30mm; }
          .corner-tl { top: 8mm; left: 8mm; border-top: 3px solid #b8860b; border-left: 3px solid #b8860b; }
          .corner-tr { top: 8mm; right: 8mm; border-top: 3px solid #b8860b; border-right: 3px solid #b8860b; }
          .corner-bl { bottom: 8mm; left: 8mm; border-bottom: 3px solid #b8860b; border-left: 3px solid #b8860b; }
          .corner-br { bottom: 8mm; right: 8mm; border-bottom: 3px solid #b8860b; border-right: 3px solid #b8860b; }
          .content { 
            position: relative; z-index: 1; height: 100%;
            display: flex; flex-direction: column; align-items: center; 
            justify-content: center; text-align: center; 
          }
          .institution { font-family: 'Playfair Display', serif; font-size: 11pt; color: #5a4a2a; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 2mm; }
          .logo { width: 20mm; height: 20mm; object-fit: contain; margin-bottom: 2mm; }
          .title { font-family: 'Playfair Display', serif; font-size: 32pt; font-weight: 900; color: #1a1a1a; letter-spacing: 4px; text-transform: uppercase; margin: 3mm 0; }
          .subtitle { font-family: 'Cormorant Garamond', serif; font-size: 13pt; color: #6b5b3a; letter-spacing: 2px; margin-bottom: 6mm; }
          .name { font-family: 'Playfair Display', serif; font-size: 26pt; font-weight: 700; color: #2c1810; margin: 4mm 0; border-bottom: 2px solid #b8860b; padding-bottom: 2mm; display: inline-block; min-width: 200px; }
          .body-text { font-family: 'Inter', sans-serif; font-size: 11pt; color: #333; line-height: 1.8; max-width: 80%; margin: 2mm auto; }
          .highlight { font-weight: 600; color: #1a1a1a; }
          .stats { display: flex; gap: 20mm; margin: 5mm 0; }
          .stat { text-align: center; }
          .stat-value { font-family: 'Playfair Display', serif; font-size: 20pt; font-weight: 700; color: #b8860b; }
          .stat-label { font-family: 'Inter', sans-serif; font-size: 8pt; color: #666; text-transform: uppercase; letter-spacing: 1px; }
          .divider { width: 60%; height: 1px; background: linear-gradient(90deg, transparent, #b8860b, transparent); margin: 4mm auto; }
          .footer { display: flex; justify-content: space-between; width: 85%; margin-top: 6mm; }
          .sig-block { text-align: center; width: 35%; }
          .sig-line { width: 100%; height: 1px; background: #999; margin-top: 12mm; margin-bottom: 2mm; }
          .sig-label { font-family: 'Inter', sans-serif; font-size: 8pt; color: #666; text-transform: uppercase; letter-spacing: 1px; }
          .cert-number { font-family: 'Inter', sans-serif; font-size: 7pt; color: #999; margin-top: 3mm; }
          .seal { position: absolute; bottom: 14mm; right: 14mm; width: 22mm; height: 22mm; border: 2px solid #b8860b; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
          .seal-text { font-family: 'Playfair Display', serif; font-size: 6pt; color: #b8860b; text-align: center; font-weight: 700; text-transform: uppercase; line-height: 1.3; }
          .watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg); font-family: 'Playfair Display', serif; font-size: 80pt; color: rgba(184,134,11,0.04); font-weight: 900; letter-spacing: 10px; pointer-events: none; white-space: nowrap; }
          
          @media print {
            @page { size: landscape; margin: 0; }
            body { background: white; margin: 0; padding: 0; }
            .certificate { border: 4px double #b8860b; width: 297mm; height: 210mm; }
          }
        </style>
      </head>
      <body>
        ${printContent.innerHTML}
        <script>window.print();</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  }

  if (loading) return <Layout><div className="p-8">{t('common.loading')}</div></Layout>;
  if (error) return <Layout><div className="p-8 text-red-600">{error}</div></Layout>;
  if (!certificate) return <Layout><div className="p-8">{t('results.certificate')} {t('common.notFound')}</div></Layout>;

  const issuedDate = new Date(certificate.issuedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <Layout>
      <div className="max-w-5xl mx-auto p-4">
        <div className="flex items-center justify-between mb-4">
          <Link to="/student/results" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-4 h-4" />
            {t('common.back')} {t('nav.results')}
          </Link>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg"
          >
            <Printer className="w-4 h-4" />
            {t('results.printReport')}
          </button>
        </div>

        {/* Certificate Preview */}
        <div ref={certRef} className="bg-white shadow-2xl" style={{ width: '297mm', minHeight: '210mm', margin: '0 auto', position: 'relative', background: 'linear-gradient(135deg, #fefef9 0%, #f8f5e8 50%, #fefef9 100%)', border: '4px double #b8860b', padding: '12mm', overflow: 'hidden', fontFamily: 'serif' }}>
          {/* Decorative borders */}
          <div style={{ position: 'absolute', top: '3mm', left: '3mm', right: '3mm', bottom: '3mm', border: '2px solid #c9a034', pointerEvents: 'none' }}></div>
          <div style={{ position: 'absolute', top: '6mm', left: '6mm', right: '6mm', bottom: '6mm', border: '1px solid #d4a843', pointerEvents: 'none' }}></div>
          
          {/* Corner decorations */}
          <div style={{ position: 'absolute', top: '8mm', left: '8mm', width: '30mm', height: '30mm', borderTop: '3px solid #b8860b', borderLeft: '3px solid #b8860b' }}></div>
          <div style={{ position: 'absolute', top: '8mm', right: '8mm', width: '30mm', height: '30mm', borderTop: '3px solid #b8860b', borderRight: '3px solid #b8860b' }}></div>
          <div style={{ position: 'absolute', bottom: '8mm', left: '8mm', width: '30mm', height: '30mm', borderBottom: '3px solid #b8860b', borderLeft: '3px solid #b8860b' }}></div>
          <div style={{ position: 'absolute', bottom: '8mm', right: '8mm', width: '30mm', height: '30mm', borderBottom: '3px solid #b8860b', borderRight: '3px solid #b8860b' }}></div>

          {/* Watermark */}
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%) rotate(-30deg)', fontSize: '80pt', color: 'rgba(184,134,11,0.04)', fontWeight: 900, letterSpacing: '10px', pointerEvents: 'none', whiteSpace: 'nowrap', fontFamily: 'Playfair Display, serif' }}>
            LUCY LMS
          </div>

          {/* Content */}
          <div style={{ position: 'relative', zIndex: 1, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
            <img src={lucyLogo} alt="Lucy College" style={{ width: '20mm', height: '20mm', objectFit: 'contain', marginBottom: '2mm' }} />
            <div style={{ fontSize: '11pt', color: '#5a4a2a', letterSpacing: '3px', textTransform: 'uppercase', fontFamily: 'Playfair Display, serif' }}>
              Lucy College
            </div>
            
            <div style={{ fontSize: '32pt', fontWeight: 900, color: '#1a1a1a', letterSpacing: '4px', textTransform: 'uppercase', margin: '3mm 0', fontFamily: 'Playfair Display, serif' }}>
              {t('results.certificate')}
            </div>
            
            <div style={{ fontSize: '13pt', color: '#6b5b3a', letterSpacing: '2px', marginBottom: '6mm', fontFamily: 'Cormorant Garamond, serif' }}>
              {t('certificate.ofCompletion')}
            </div>

            <div style={{ width: '60%', height: '1px', background: 'linear-gradient(90deg, transparent, #b8860b, transparent)', margin: '2mm auto' }}></div>

            <div style={{ fontSize: '11pt', color: '#333', lineHeight: 1.8, maxWidth: '80%', margin: '3mm auto', fontFamily: 'Inter, sans-serif' }}>
              {t('certificate.thisIsToCertify')}
            </div>

            <div style={{ fontSize: '26pt', fontWeight: 700, color: '#2c1810', margin: '4mm 0', borderBottom: '2px solid #b8860b', paddingBottom: '2mm', display: 'inline-block', minWidth: '200px', fontFamily: 'Playfair Display, serif' }}>
              {certificate.student?.fullName}
            </div>

            <div style={{ fontSize: '11pt', color: '#333', lineHeight: 1.8, maxWidth: '80%', margin: '2mm auto', fontFamily: 'Inter, sans-serif' }}>
              {t('certificate.hasCompleted')} <span style={{ fontWeight: 600, color: '#1a1a1a' }}>{certificate.department?.name}</span>
              {' '}({certificate.department?.code}) {t('certificate.fulfilledRequirements')}
            </div>

            <div style={{ display: 'flex', gap: '20mm', margin: '5mm 0' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '20pt', fontWeight: 700, color: '#b8860b', fontFamily: 'Playfair Display, serif' }}>
                  {certificate.cgpa?.toFixed(2)}
                </div>
                <div style={{ fontSize: '8pt', color: '#666', textTransform: 'uppercase', letterSpacing: '1px', fontFamily: 'Inter, sans-serif' }}>
                  {t('grade.cgpa')}
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '20pt', fontWeight: 700, color: '#b8860b', fontFamily: 'Playfair Display, serif' }}>
                  {certificate.totalCreditHours}
                </div>
                <div style={{ fontSize: '8pt', color: '#666', textTransform: 'uppercase', letterSpacing: '1px', fontFamily: 'Inter, sans-serif' }}>
                  {t('dashboard.creditHours')}
                </div>
              </div>
            </div>

            <div style={{ width: '60%', height: '1px', background: 'linear-gradient(90deg, transparent, #b8860b, transparent)', margin: '4mm auto' }}></div>

            <div style={{ display: 'flex', justifyContent: 'space-between', width: '85%', marginTop: '6mm' }}>
              <div style={{ textAlign: 'center', width: '35%' }}>
                <div style={{ width: '100%', height: '1px', background: '#999', marginTop: '12mm', marginBottom: '2mm' }}></div>
                <div style={{ fontSize: '8pt', color: '#666', textTransform: 'uppercase', letterSpacing: '1px', fontFamily: 'Inter, sans-serif' }}>
                  {t('certificate.academicDirector')}
                </div>
              </div>
              <div style={{ textAlign: 'center', width: '35%' }}>
                <div style={{ width: '100%', height: '1px', background: '#999', marginTop: '12mm', marginBottom: '2mm' }}></div>
                <div style={{ fontSize: '8pt', color: '#666', textTransform: 'uppercase', letterSpacing: '1px', fontFamily: 'Inter, sans-serif' }}>
                  {t('certificate.registrar')}
                </div>
              </div>
            </div>

            <div style={{ fontSize: '7pt', color: '#999', marginTop: '3mm', fontFamily: 'Inter, sans-serif' }}>
              {t('results.certificateNumber')}: {certificate.certificateNumber} | {t('results.issued')}: {issuedDate}
            </div>
          </div>

          {/* Seal */}
          <div style={{ position: 'absolute', bottom: '14mm', right: '14mm', width: '22mm', height: '22mm', border: '2px solid #b8860b', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontSize: '6pt', color: '#b8860b', textAlign: 'center', fontWeight: 700, textTransform: 'uppercase', lineHeight: 1.3, fontFamily: 'Playfair Display, serif' }}>
              Lucy<br/>LMS<br/>Official
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
