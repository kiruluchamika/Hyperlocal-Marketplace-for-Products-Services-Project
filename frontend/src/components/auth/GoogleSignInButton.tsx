import React, { useEffect, useRef, useState } from 'react';

interface GoogleSignInButtonProps {
  onCredential: (idToken: string) => Promise<void>;
  text?: 'signin_with' | 'signup_with';
}

interface GoogleCredentialResponse {
  credential?: string;
}

const SCRIPT_ID = 'google-identity-services';
const GOOGLE_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

const loadGoogleScript = async (): Promise<void> => {
  if (window.google?.accounts?.id) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;

    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Failed to load Google script')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = GOOGLE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google script'));
    document.head.appendChild(script);
  });
};

const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({ onCredential, text = 'signin_with' }) => {
  const buttonContainerRef = useRef<HTMLDivElement | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const setupGoogleButton = async () => {
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

      if (!clientId) {
        setError('Google sign-in is not configured. Set VITE_GOOGLE_CLIENT_ID.');
        return;
      }

      try {
        await loadGoogleScript();

        if (!active || !window.google?.accounts?.id || !buttonContainerRef.current) {
          return;
        }

        window.google.accounts.id.initialize({
          client_id: clientId,
          ux_mode: 'popup',
          callback: async (response: GoogleCredentialResponse) => {
            if (!response.credential) {
              setError('Google sign-in failed. Please try again.');
              return;
            }

            setError(null);
            setIsSubmitting(true);
            try {
              await onCredential(response.credential);
            } catch {
              setError('Google sign-in failed. Please try again.');
            } finally {
              setIsSubmitting(false);
            }
          }
        });

        buttonContainerRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(buttonContainerRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text,
          shape: 'pill',
          logo_alignment: 'left',
          width: 360
        });
      } catch {
        if (active) {
          setError('Unable to load Google sign-in. Please refresh and try again.');
        }
      }
    };

    void setupGoogleButton();

    return () => {
      active = false;
    };
  }, [onCredential, text]);

  return (
    <div className="space-y-2">
      <div className={`transition-opacity ${isSubmitting ? 'opacity-70 pointer-events-none' : ''}`} ref={buttonContainerRef} />
      {isSubmitting && <p className="text-xs text-slate-500">Signing in with Google...</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
};

export default GoogleSignInButton;
