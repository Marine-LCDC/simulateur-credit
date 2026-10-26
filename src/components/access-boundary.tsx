"use client";
import { useEffect, useState } from "react";
export default function AccessBoundary({
  children,
}: {
  children: React.ReactNode;
}) {
  const [allowed, setAllowed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [reason, setReason] = useState<'temporary' | 'required'>('required');
  useEffect(() => {
    let stopped = false;
    let running = false;
    let generation = 0;
    // After a failure, recovery is explicit through a fresh SSO handshake.
    // Keep periodic checks only while the previously verified session is healthy.
    let blocked = false;
    const check = async () => {
      if (running || stopped || blocked) return;
      if (!navigator.onLine) {
        blocked = true;
        setReason('temporary');
        setAllowed(false);
        setChecking(false);
        return;
      }
      running = true;
      const current = generation;
      try {
        const signal = AbortSignal.timeout(5000);
        const r = await fetch("/api/titayla/session/", {
          cache: "no-store",
          credentials: "same-origin",
          redirect: "error",
          signal,
        });
        const ok = !signal.aborted && r.ok && (await r.json()).allowed === true && !signal.aborted;
        if (!stopped && current === generation) {
          blocked = !ok;
          setReason([401,403].includes(r.status) ? 'required' : 'temporary');
          setAllowed(ok);
          setChecking(false);
        }
      } catch {
        if (!stopped && current === generation) {
          blocked = true;
          setReason('temporary');
          setAllowed(false);
          setChecking(false);
        }
      } finally {
        running = false;
      }
    };
    const offline = () => {
      generation++;
      blocked = true;
      setReason('temporary');
      setChecking(false);
      setAllowed(false);
    };
    const resume = () => {
      if (blocked) return;
      generation++;
      setChecking(true);
      void check();
    };
    const visibility = () => {
      if (document.hidden && !blocked) setChecking(true);
      else resume();
    };
    void check();
    const timer = setInterval(() => void check(), 15000);
    window.addEventListener("offline", offline);
    window.addEventListener("online", resume);
    window.addEventListener("pageshow", resume);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      stopped = true;
      clearInterval(timer);
      window.removeEventListener("offline", offline);
      window.removeEventListener("online", resume);
      window.removeEventListener("pageshow", resume);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);
  if (checking && !allowed) return <main role="status">Vérification de votre accès…</main>;
  if (!allowed)
    return (
      <main role="alert">
        <h1>{reason === 'temporary' ? 'Vérification temporairement indisponible' : 'Vérification de votre accès'}</h1>
        <p>
          {reason === 'temporary' ? 'Votre accès n’a pas pu être vérifié. Réessayez dans quelques instants.' : 'Une connexion ou un accès valide est nécessaire.'} Les calculs restent effectués sur cet appareil.
        </p>
        <a href="/auth/titayla/start/">Réessayer auprès de Titayla</a>
      </main>
    );
  return (
    <>
      <div hidden={checking} inert={checking}>
        {children}
      </div>
      {checking && <main role="alert">Vérification de votre accès…</main>}
    </>
  );
}
