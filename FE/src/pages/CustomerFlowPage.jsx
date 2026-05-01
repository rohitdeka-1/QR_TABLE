import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { API_BASE_URL } from '../config/api';
import CustomerMenuPage from './CustomerMenuPage';
import QRLandingPage from './QRLandingPage';

export default function CustomerFlowPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [resolvedSession, setResolvedSession] = useState(null);
  const [loadingSession, setLoadingSession] = useState(false);
  const [sessionError, setSessionError] = useState('');

  const session = useMemo(
    () => ({
      accessCode: searchParams.get('accessCode') || '',
      tableId: searchParams.get('tableId') || '',
      token: searchParams.get('token') || '',
    }),
    [searchParams],
  );

  useEffect(() => {
    let cancelled = false;

    async function resolveAccessCode() {
      if (!session.accessCode) {
        setResolvedSession(null);
        setSessionError('');
        setLoadingSession(false);
        return;
      }

      setLoadingSession(true);
      setSessionError('');
      try {
        const response = await fetch(`${API_BASE_URL}/tables/session/${session.accessCode}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data?.message || 'Failed to resolve QR session');
        if (!cancelled) {
          setResolvedSession({
            tableId: data.tableId,
            token: data.token,
            tableNumber: data.tableNumber,
            location: data.location,
          });
        }
      } catch (error) {
        if (!cancelled) {
          setResolvedSession(null);
          setSessionError(error.message || 'Failed to resolve QR session');
        }
      } finally {
        if (!cancelled) setLoadingSession(false);
      }
    }

    resolveAccessCode();
    return () => {
      cancelled = true;
    };
  }, [session.accessCode]);

  function loadSession(nextSession) {
    if (nextSession.accessCode) {
      setSearchParams({ accessCode: nextSession.accessCode });
      return;
    }

    setSearchParams({
      tableId: nextSession.tableId,
      token: nextSession.token,
    });
  }

  function resetSession() {
    setSearchParams({});
    setResolvedSession(null);
    setSessionError('');
  }

  if (session.accessCode) {
    if (loadingSession) {
      return (
        <div className="flex min-h-screen items-center justify-center px-4 py-10">
          <div className="rounded-[2rem] border border-amber-100 bg-white/90 p-8 text-center text-slate-900 shadow-[0_20px_70px_rgba(15,23,42,0.08)] backdrop-blur-xl">
            <h1 className="text-2xl font-semibold">Loading menu...</h1>
            <p className="mt-2 text-sm text-slate-600">Resolving your table session.</p>
          </div>
        </div>
      );
    }

    if (!resolvedSession) {
      return <QRLandingPage onLoadSession={loadSession} errorMessage={sessionError} />;
    }

    return <CustomerMenuPage session={resolvedSession} onResetSession={resetSession} />;
  }

  if (!session.tableId || !session.token) {
    return <QRLandingPage onLoadSession={loadSession} />;
  }

  return <CustomerMenuPage session={{ tableId: session.tableId, token: session.token }} onResetSession={resetSession} />;
}
