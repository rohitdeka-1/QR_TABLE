import { useEffect, useState } from 'react';
import jsQR from 'jsqr';
import { parseTableLink } from '../utils/session';

export default function QRLandingPage({ onLoadSession, errorMessage = '' }) {
  const [scanValue, setScanValue] = useState('');
  const [error, setError] = useState('');
  const [scannerActive, setScannerActive] = useState(false);

  useEffect(() => {
    if (!scannerActive) return undefined;

    const videoElement = document.getElementById('qr-video');
    if (!videoElement) return undefined;

    let animationId;
    let stream;

    async function startCamera() {
      try {
        setError('');
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        videoElement.srcObject = stream;

        videoElement.onloadedmetadata = () => {
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d', { willReadFrequently: true });

          function scanFrame() {
            if (videoElement.readyState === videoElement.HAVE_ENOUGH_DATA) {
              canvas.width = videoElement.videoWidth;
              canvas.height = videoElement.videoHeight;
              context.drawImage(videoElement, 0, 0);

              const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
              const qrCode = jsQR(imageData.data, imageData.width, imageData.height);

              if (qrCode) {
                const session = parseTableLink(qrCode.data);
                if (session.accessCode || (session.tableId && session.token)) {
                  onLoadSession(session);
                  return;
                }
              }
            }
            animationId = requestAnimationFrame(scanFrame);
          }

          animationId = requestAnimationFrame(scanFrame);
        };
      } catch (err) {
        setError(
          err.name === 'NotAllowedError'
            ? 'Camera permission denied. Please enable camera access in browser settings.'
            : err.message || 'Unable to access camera',
        );
      }
    }

    startCamera();

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
      if (stream) stream.getTracks().forEach((track) => track.stop());
    };
  }, [onLoadSession, scannerActive]);

  function handleLoadSession(event) {
    event.preventDefault();
    const session = parseTableLink(scanValue);
    if (!session.tableId || !session.token) {
      setError('Paste the scanned QR link or the tableId/token query string.');
      return;
    }
    onLoadSession(session);
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10 pb-14">
      <div className="grid w-full max-w-4xl gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-[2rem] border border-amber-100 bg-white/90 p-8 shadow-[0_20px_70px_rgba(15,23,42,0.08)] backdrop-blur-xl">
          <p className="text-xs uppercase tracking-[0.4em] text-amber-500">QR Restaurant</p>
          <h1 className="mt-4 text-4xl font-semibold text-slate-900">Scan the table QR to start ordering</h1>
          <p className="mt-4 text-sm leading-6 text-slate-600">
            The menu stays hidden until the QR is scanned. Once the scanned link provides a valid
            <span className="font-semibold text-slate-900"> access code</span>, the menu opens automatically.
          </p>

          <div className="mt-8 flex flex-col gap-3">
            <button
              type="button"
              onClick={() => {
                setError('');
                setScannerActive(true);
              }}
              className="rounded-2xl bg-emerald-500 px-4 py-3 font-semibold text-white transition hover:bg-emerald-600"
            >
              Start camera scan
            </button>
            <p className="text-xs text-slate-500">
              Camera access is only requested after you click the button.
            </p>
          </div>

          <div className="mt-6 rounded-[1.75rem] border border-slate-200 bg-slate-50 p-4">
            {scannerActive && <video id="qr-video" autoPlay playsInline className="w-full rounded-2xl" />}
            {!scannerActive && <p className="text-sm text-slate-500">Camera scanner is off. Click the button above to request permission.</p>}
          </div>

          {error || errorMessage ? <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error || errorMessage}</p> : null}
        </section>

        <section className="rounded-[2rem] border border-amber-100 bg-white/90 p-8 shadow-[0_20px_70px_rgba(15,23,42,0.08)] backdrop-blur-xl">
          <h2 className="text-xl font-semibold text-slate-900">Test scan / manual paste</h2>
          <p className="mt-2 text-sm text-slate-600">For development, paste the scanned QR URL here.</p>

          <form onSubmit={handleLoadSession} className="mt-6 space-y-4">
            <label className="grid gap-2 text-sm text-slate-700">
              Scanned QR link
              <textarea
                rows={5}
                value={scanValue}
                onChange={(event) => setScanValue(event.target.value)}
                placeholder="http://localhost:5174/?accessCode=..."
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none placeholder:text-slate-400 focus:border-amber-400/50"
              />
            </label>

            <button
              type="submit"
              className="w-full rounded-2xl bg-amber-500 px-4 py-3 font-semibold text-white transition hover:bg-amber-600"
            >
              Open menu
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}

