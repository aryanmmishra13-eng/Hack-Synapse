import React, { useState, useEffect, useRef } from 'react';
import { 
  QrCode, Camera, CheckCircle2, XCircle, AlertTriangle, ShieldCheck, 
  Clock, User, Building2, Package, RefreshCw, ArrowRight, History, Zap
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import api from '../services/api';

export const AdminQRScannerPage = () => {
  const [qrInput, setQrInput] = useState('');
  const [scanning, setScanning] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [approving, setApproving] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [approvalResult, setApprovalResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [cameraError, setCameraError] = useState(null);

  const scannerRef = useRef(null);
  const html5QrCodeRef = useRef(null);

  useEffect(() => {
    fetchHistory();
    return () => {
      stopCameraScanner();
    };
  }, []);

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await api.get('/admin/qr/history');
      setHistory(res.data || []);
    } catch (err) {
      console.error('Failed to load check-in history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const startCameraScanner = async () => {
    setCameraError(null);
    setScanning(true);
    try {
      const html5QrCode = new Html5Qrcode("reader");
      html5QrCodeRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          setQrInput(decodedText);
          stopCameraScanner();
          handleVerify(decodedText);
        },
        (errorMessage) => {
          // scanning frame errors can be ignored
        }
      );
    } catch (err) {
      console.error("Camera scanner error:", err);
      setCameraError("Camera access denied or unavailable. Please use manual code entry.");
      setScanning(false);
    }
  };

  const stopCameraScanner = async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        await html5QrCodeRef.current.stop();
        await html5QrCodeRef.current.clear();
      } catch (e) {
        console.error("Error stopping camera:", e);
      }
    }
    setScanning(false);
  };

  const handleVerify = async (codeToVerify) => {
    const target = codeToVerify || qrInput;
    if (!target.trim()) return;

    setVerifying(true);
    setVerificationResult(null);
    setApprovalResult(null);

    try {
      const res = await api.post('/admin/qr/verify', { qr_code: target.trim() });
      setVerificationResult(res.data);
    } catch (err) {
      setVerificationResult({
        valid: false,
        can_approve: false,
        message: err.response?.data?.detail || "Network error verifying QR pass."
      });
    } finally {
      setVerifying(false);
    }
  };

  const handleApprove = async () => {
    if (!verificationResult || !verificationResult.booking) return;

    setApproving(true);
    try {
      const res = await api.post('/admin/qr/approve', {
        booking_id: verificationResult.booking.id,
        qr_code: verificationResult.booking.qr_code
      });
      setApprovalResult(res.data);
      fetchHistory();
    } catch (err) {
      setApprovalResult({
        success: false,
        message: err.response?.data?.detail || "Failed to approve check-in."
      });
    } finally {
      setApproving(false);
    }
  };

  const handleReset = () => {
    setQrInput('');
    setVerificationResult(null);
    setApprovalResult(null);
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2 text-[#FF4D00] font-mono text-xs uppercase tracking-widest mb-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>GATE ACCESS CONTROL &amp; SECURITY PROTOCOL</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-display font-bold uppercase tracking-tight text-white">
            QR GATE SCANNER
          </h1>
          <p className="text-sm text-[#888880] mt-1 font-sans">
            Validate student QR credentials, inspect rented equipment attachments, and approve court check-ins in real-time.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchHistory}
            className="px-3 py-2 border border-white/10 bg-[#161616] text-[#888880] hover:text-white flex items-center gap-2 text-xs font-mono uppercase transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingHistory ? 'animate-spin' : ''}`} />
            <span>SYNC LOGS</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Scanner Left / Result Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: QR Input / Scanner */}
        <div className="lg:col-span-6 space-y-6">
          <div className="card-panel p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-[#FF4D00]" />
                <h2 className="text-xl font-display font-bold uppercase text-white">
                  PASS AUTHENTICATION
                </h2>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 bg-[#FF4D00]/10 text-[#FF4D00] border border-[#FF4D00]/30 uppercase">
                DESK TERMINAL
              </span>
            </div>

            {/* Camera Viewport */}
            <div className="space-y-3">
              <div 
                id="reader" 
                className={`w-full overflow-hidden bg-black border ${scanning ? 'border-[#FF4D00]' : 'border-white/10'} rounded-none min-h-[160px] flex items-center justify-center`}
              >
                {!scanning && (
                  <div className="text-center p-8 space-y-3">
                    <Camera className="w-10 h-10 text-[#888880] mx-auto opacity-50" />
                    <p className="text-xs font-mono text-[#888880] uppercase">
                      WEBCAM SCANNER READY
                    </p>
                  </div>
                )}
              </div>

              {cameraError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{cameraError}</span>
                </div>
              )}

              <div className="flex gap-3">
                {!scanning ? (
                  <button
                    onClick={startCameraScanner}
                    className="flex-1 py-3 px-4 bg-[#FF4D00] hover:bg-[#ff6524] text-black font-mono font-bold text-xs uppercase flex items-center justify-center gap-2 transition-colors"
                  >
                    <Camera className="w-4 h-4" />
                    <span>LAUNCH CAMERA SCANNER</span>
                  </button>
                ) : (
                  <button
                    onClick={stopCameraScanner}
                    className="flex-1 py-3 px-4 bg-rose-600 hover:bg-rose-700 text-white font-mono font-bold text-xs uppercase flex items-center justify-center gap-2 transition-colors"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>STOP CAMERA</span>
                  </button>
                )}
              </div>
            </div>

            {/* Manual Code Input Form */}
            <div className="pt-4 border-t border-white/10 space-y-3">
              <label className="block text-xs font-mono uppercase text-[#888880]">
                OR MANUAL / HARDWARE SCANNER INPUT:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={qrInput}
                  onChange={(e) => setQrInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                  placeholder="Paste pass code (e.g. CSH-QR-ABC1234 or Booking ID)"
                  className="flex-1 bg-[#111111] border border-white/20 text-white px-4 py-2.5 font-mono text-xs focus:outline-none focus:border-[#FF4D00]"
                />
                <button
                  onClick={() => handleVerify()}
                  disabled={verifying || !qrInput.trim()}
                  className="px-5 py-2.5 bg-white hover:bg-[#F2F0EB] text-black font-mono font-bold text-xs uppercase disabled:opacity-40 transition-colors flex items-center gap-1.5"
                >
                  {verifying ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>VERIFY</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Verification & Approval Card */}
        <div className="lg:col-span-6 space-y-6">
          <div className="card-panel p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h2 className="text-xl font-display font-bold uppercase text-white">
                  VERIFICATION RESULTS
                </h2>
              </div>
              {verificationResult && (
                <button
                  onClick={handleReset}
                  className="text-xs font-mono text-[#888880] hover:text-white uppercase"
                >
                  CLEAR
                </button>
              )}
            </div>

            {/* State 1: No scan yet */}
            {!verificationResult && !verifying && (
              <div className="p-12 text-center text-[#888880] space-y-3">
                <QrCode className="w-12 h-12 mx-auto text-[#888880] opacity-30" />
                <p className="font-mono text-xs uppercase">
                  AWAITING SCANNER TELEMETRY...
                </p>
                <p className="text-xs text-[#888880] max-w-sm mx-auto">
                  Scan a student's digital pass or input their reservation identifier to inspect credential legitimacy.
                </p>
              </div>
            )}

            {/* State 2: Verifying Loader */}
            {verifying && (
              <div className="p-12 text-center text-[#FF4D00] space-y-3">
                <RefreshCw className="w-8 h-8 mx-auto animate-spin" />
                <p className="font-mono text-xs uppercase">
                  QUERYING CENTRAL PASS DATABASE...
                </p>
              </div>
            )}

            {/* State 3: Result Card */}
            {verificationResult && !verifying && (
              <div className="space-y-5">
                
                {/* Status Banner */}
                <div className={`p-4 border ${
                  approvalResult?.success || (verificationResult.valid && verificationResult.can_approve)
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : verificationResult.valid && !verificationResult.can_approve
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                }`}>
                  <div className="flex items-start gap-3">
                    {approvalResult?.success ? (
                      <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400 mt-0.5" />
                    ) : verificationResult.valid && verificationResult.can_approve ? (
                      <Zap className="w-5 h-5 shrink-0 text-emerald-400 mt-0.5" />
                    ) : verificationResult.valid ? (
                      <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
                    )}
                    <div>
                      <h4 className="font-mono text-xs font-bold uppercase tracking-wider">
                        {approvalResult?.success 
                          ? "ENTRY PERMIT GRANTED" 
                          : verificationResult.valid && verificationResult.can_approve 
                          ? "VALID MATCH PASS DETECTED" 
                          : verificationResult.valid 
                          ? "ATTENTION REQUIRED" 
                          : "INVALID / EXPIRED PASS"}
                      </h4>
                      <p className="text-xs mt-1 leading-relaxed">
                        {approvalResult ? approvalResult.message : verificationResult.message}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Warning Alert if date is not today */}
                {verificationResult.warning && !approvalResult && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-mono flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{verificationResult.warning}</span>
                  </div>
                )}

                {/* Student Profile & Booking Info */}
                {verificationResult.booking && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-[#111111] border border-white/10 space-y-1">
                        <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#888880] uppercase">
                          <User className="w-3.5 h-3.5 text-[#FF4D00]" />
                          <span>ATHLETE</span>
                        </div>
                        <p className="font-display font-bold text-white text-base truncate">
                          {verificationResult.player?.name || "Student"}
                        </p>
                        <p className="font-mono text-[11px] text-[#888880] truncate">
                          {verificationResult.player?.email}
                        </p>
                      </div>

                      <div className="p-3 bg-[#111111] border border-white/10 space-y-1">
                        <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#888880] uppercase">
                          <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>FACILITY / SPORT</span>
                        </div>
                        <p className="font-display font-bold text-white text-base truncate">
                          {verificationResult.booking.facility_name}
                        </p>
                        <p className="font-mono text-[11px] text-emerald-400">
                          {verificationResult.booking.sport_name}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-[#111111] border border-white/10 space-y-1">
                        <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#888880] uppercase">
                          <Clock className="w-3.5 h-3.5 text-blue-400" />
                          <span>RESERVED TIMEFRAME</span>
                        </div>
                        <p className="font-mono text-xs font-bold text-white">
                          {verificationResult.booking.booking_date}
                        </p>
                        <p className="font-mono text-[11px] text-blue-400">
                          {verificationResult.booking.start_time} - {verificationResult.booking.end_time}
                        </p>
                      </div>

                      <div className="p-3 bg-[#111111] border border-white/10 space-y-1">
                        <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#888880] uppercase">
                          <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                          <span>PASS STATUS</span>
                        </div>
                        <p className="font-mono text-xs font-bold text-white">
                          {verificationResult.booking.status}
                        </p>
                        <p className="font-mono text-[10px] text-[#888880] truncate">
                          {verificationResult.booking.qr_code}
                        </p>
                      </div>
                    </div>

                    {/* Rented Equipment info */}
                    {verificationResult.rentals && verificationResult.rentals.length > 0 && (
                      <div className="p-3 bg-[#111111] border border-white/10 space-y-2">
                        <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#FF4D00] uppercase">
                          <Package className="w-3.5 h-3.5" />
                          <span>ATTACHED GEAR RENTALS ({verificationResult.rentals.length})</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {verificationResult.rentals.map((r, i) => (
                            <span 
                              key={i}
                              className="px-2 py-1 bg-white/5 border border-white/10 text-white font-mono text-xs"
                            >
                              {r.name} &times; {r.quantity}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Action Button: Approve Check-in */}
                    {verificationResult.can_approve && !approvalResult?.success && (
                      <button
                        onClick={handleApprove}
                        disabled={approving}
                        className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-mono font-bold text-sm uppercase flex items-center justify-center gap-2 transition-colors"
                      >
                        {approving ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <CheckCircle2 className="w-5 h-5" />
                            <span>APPROVE &amp; GRANT GATE ADMISSION</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Section: Real-time Check-in Audit Logs */}
      <div className="card-panel p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-[#FF4D00]" />
            <h3 className="text-xl font-display font-bold uppercase text-white">
              LIVE GATE CHECK-IN AUDIT TRAIL
            </h3>
          </div>
          <span className="text-xs font-mono text-[#888880]">
            {history.length} ENTRIES RECORDED
          </span>
        </div>

        {loadingHistory ? (
          <div className="p-8 text-center text-[#888880] font-mono text-xs">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
            LOADING AUDIT FEED...
          </div>
        ) : history.length === 0 ? (
          <div className="p-8 text-center text-[#888880] font-mono text-xs uppercase">
            NO CHECK-IN RECORDS FOR TODAY YET
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-white/10 text-[#888880] uppercase text-[10px]">
                  <th className="py-2.5 px-3">ATHLETE</th>
                  <th className="py-2.5 px-3">FACILITY &amp; SPORT</th>
                  <th className="py-2.5 px-3">SCHEDULED SLOT</th>
                  <th className="py-2.5 px-3">CHECKED-IN TIME</th>
                  <th className="py-2.5 px-3 text-right">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-white">
                {history.slice(0, 15).map((rec) => (
                  <tr key={rec.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-3">
                      <div className="font-bold text-white">{rec.player_name}</div>
                      <div className="text-[10px] text-[#888880]">{rec.player_email}</div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="text-emerald-400">{rec.facility_name}</div>
                      <div className="text-[10px] text-[#888880]">{rec.sport_name}</div>
                    </td>
                    <td className="py-3 px-3 text-[#888880]">
                      <div>{rec.booking_date}</div>
                      <div className="text-white text-[10px]">{rec.slot_time}</div>
                    </td>
                    <td className="py-3 px-3 text-emerald-400 font-bold">
                      {rec.checked_in_at ? new Date(rec.checked_in_at).toLocaleTimeString() : 'Verified'}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] uppercase">
                        ADMITTED
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
