"use client";
import { useEffect, useState } from "react";
export default function AccessBoundary({
  children,
}: {
  children: React.ReactNode;
}) {
  const [allowed, setAllowed] = useState(false);
  const [checking, setChecking] = useState(true);
  useEffect(() => {
    let stopped = false;
    let running = false;
    let generation = 0;
    const check = async () => {
      if (running || stopped) return;
      if (!navigator.onLine) {
        setAllowed(false);
        return;
      }
      running = true;
      const current = generation;
      try {
        const r = await fetch("/api/titayla/session/", {
          cache: "no-store",
          credentials: "same-origin",
          redirect: "error",
          signal: AbortSignal.timeout(5000),
        });
        const ok = r.ok && (await r.json()).allowed === true;
        if (!stopped && current === generation) {
          setAllowed(ok);
          setChecking(false);
        }
      } catch {
        if (!stopped && current === generation) {
          setAllowed(false);
          setChecking(false);
        }
      } finally {
        running = false;
      }
    };
    const offline = () => {
      generation++;
      setAllowed(false);
    };
    const resume = () => {
      generation++;
      setChecking(true);
      void check();
    };
    const visibility = () => {
      if (document.hidden) setChecking(true);
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
  if (!allowed)
    return (
      <main role="alert">
        <h1>Vérification de votre accès</h1>
        <p>
          Une connexion est nécessaire. Les calculs restent effectués
          sur cet appareil.
        </p>
        <a href="/auth/titayla/start/">Vérifier auprès de Titayla</a>
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
