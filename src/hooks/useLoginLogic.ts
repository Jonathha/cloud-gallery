import React, { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { dbPrimary } from '../firebase';
import { getApiUrl } from '../utils/apiUrl';

export function useLoginLogic() {
  const { signIn, signInEmail, signUpEmail, resetPassword } = useAuth();
  const [isEmailLogin, setIsEmailLogin] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  
  const verifyCaptcha = async () => {
    return true;
  };

  const handleSendCode = async () => {
    setError('');
    setMessage('');
    setLoading(true);
    const emailKey = email.toLowerCase().trim();
    try {
      // Check if blocked in Firestore first (as part of anti-bypass / rate-limiting persistence)
      const verifyDoc = await getDoc(doc(dbPrimary, "email_verifications", emailKey));
      if (verifyDoc.exists()) {
        const verifyData = verifyDoc.data();
        if (verifyData.blockedUntil && Date.now() < verifyData.blockedUntil) {
          const remainingMinutes = Math.ceil((verifyData.blockedUntil - Date.now()) / 60000);
          throw new Error(`Este e-mail está temporariamente bloqueado por excesso de tentativas incorretas. Tente novamente em ${remainingMinutes} minuto(s).`);
        }
      }

      const response = await fetch(getApiUrl('/api/auth/send-code'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailKey }),
      });
      const data = await response.json();
      if (!response.ok || data.success === false) {
        throw new Error(data.error || 'Erro ao enviar código de verificação.');
      }

      // Sync the sent status to Firestore
      await setDoc(doc(dbPrimary, "email_verifications", emailKey), {
        email: emailKey,
        codeSentAt: Date.now(),
        expiresAt: Date.now() + 10 * 60 * 1000,
        verified: false,
        attempts: verifyDoc.exists() ? (verifyDoc.data().attempts || 0) : 0,
        blockedUntil: verifyDoc.exists() ? (verifyDoc.data().blockedUntil || null) : null
      }, { merge: true });

      setIsVerifyingCode(true);
      setMessage('Código de verificação enviado! Verifique sua caixa de entrada.');
    } catch (err: any) {
      console.error('Erro ao enviar código:', err);
      setError(err.message || 'Erro de conexão ao enviar código.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (isSignUp && !termsAccepted) {
      setError('Você deve aceitar os Termos de Uso e a Política de Privacidade para criar uma conta.');
      return;
    }

    setLoading(true);

    if (isSignUp) {
      const isHuman = await verifyCaptcha();
      if (!isHuman) {
        setError('Verificação de segurança falhou. Tente novamente.');
        setLoading(false);
        return;
      }
    }

    const emailKey = email.toLowerCase().trim();

    try {
      if (isSignUp) {
        if (!isVerifyingCode) {
          // Step 1: Send verification code via Resend
          setLoading(false); // Let handleSendCode manage loading state
          await handleSendCode();
          return;
        } else {
          // Step 2: Verify the code
          const verifyResponse = await fetch(getApiUrl('/api/auth/verify-code'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: emailKey, code: verificationCode }),
          });
          const verifyData = await verifyResponse.json();
          
          if (!verifyResponse.ok || verifyData.success === false) {
            // Save failure and block info in Firestore
            await setDoc(doc(dbPrimary, "email_verifications", emailKey), {
              attempts: verifyData.attempts || 0,
              blockedUntil: verifyData.blockedUntil || null,
              verified: false
            }, { merge: true });

            throw new Error(verifyData.error || 'Código de verificação incorreto ou expirado.');
          }

          // Code verified successfully! Save verified state in Firestore
          await setDoc(doc(dbPrimary, "email_verifications", emailKey), {
            verified: true,
            verifiedAt: Date.now(),
            attempts: 0,
            blockedUntil: null
          }, { merge: true });

          // Proceed with registration
          await signUpEmail(emailKey, password);
        }
      } else {
        await signInEmail(emailKey, password);
      }
    } catch (err: any) {
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('E-mail ou senha incorretos.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('Este e-mail já está em uso.');
      } else if (err.code === 'auth/weak-password') {
        setError('A senha deve ter pelo menos 6 caracteres.');
      } else if (err.code === 'auth/operation-not-allowed') {
        setError('O login por e-mail e senha não está ativado no Firebase. Por favor, ative-o no Console do Firebase (Authentication > Sign-in method).');
      } else {
        console.error('Erro de autenticação:', err);
        setError(err.message || 'Ocorreu um erro inesperado no login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      setError('Digite seu e-mail para recuperar a senha.');
      return;
    }
    setLoading(true);

    try {
      await resetPassword(email);
      setMessage('E-mail de recuperação enviado!');
    } catch (err: any) {
      setError('Erro ao enviar e-mail. Verifique o endereço digitado.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      await signIn();
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') {
        setError('O login foi cancelado.');
      } else if (err.code === 'auth/unauthorized-domain') {
        const domain = window.location.hostname;
        setError(`Domínio não autorizado!\n\nEste domínio não foi adicionado em seu projeto Firebase.\nPara corrigir, acesse o Console do Firebase e vá em:\nAuthentication -> Settings -> Authorized domains\n\nAdicione o domínio abaixo:\n${domain}`);
      } else {
        console.error('Erro no Google Sign-In:', err);
        setError(`Ops! Algo deu errado\n${err.message || 'Ocorreu um erro inesperado no login'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBackToSignUp = () => {
    setIsVerifyingCode(false);
    setVerificationCode('');
    setError('');
    setMessage('');
  };

  return {
    isEmailLogin,
    setIsEmailLogin,
    isSignUp,
    setIsSignUp,
    isVerifyingCode,
    setIsVerifyingCode,
    verificationCode,
    setVerificationCode,
    email,
    setEmail,
    password,
    setPassword,
    loading,
    setLoading,
    error,
    setError,
    message,
    setMessage,
    termsAccepted,
    setTermsAccepted,
    showTerms,
    setShowTerms,
    handleSubmit,
    handleResetPassword,
    handleGoogleSignIn,
    handleSendCode,
    handleBackToSignUp,
  };
}
