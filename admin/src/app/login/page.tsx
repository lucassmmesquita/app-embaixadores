"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import Image from "next/image";
import type { ApiError } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await login(email, password);
      router.replace("/dashboard");
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.detail || "Erro ao fazer login");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
    }}>
      {/* Color Bar */}
      <div className="color-bar">
        <div className="color-bar__segment color-bar__segment--red" />
        <div className="color-bar__segment color-bar__segment--yellow" />
        <div className="color-bar__segment color-bar__segment--green" />
        <div className="color-bar__segment color-bar__segment--blue" />
      </div>

      {/* Login Form */}
      <div style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--space-lg)",
      }}>
        <div style={{
          width: "100%",
          maxWidth: "420px",
        }}>
          {/* Logo / Title */}
          <div style={{
            textAlign: "center",
            marginBottom: "var(--space-xl)",
          }}>
            <Image
              src="/icon.png"
              alt="Rede de Embaixadores"
              width={72}
              height={72}
              style={{
                borderRadius: "var(--radius-lg)",
                marginBottom: "var(--space-base)",
                boxShadow: "0 8px 24px rgba(33, 113, 186, 0.25)",
              }}
            />
            <h1 className="text-title-2" style={{ marginBottom: "var(--space-xs)" }}>
              Rede de Embaixadores
            </h1>
            <p className="text-subhead text-secondary">
              Administração
            </p>
          </div>

          {/* Form Card */}
          <div className="card">
            <div className="card-body" style={{ padding: "var(--space-xl)" }}>
              <form onSubmit={handleSubmit}>
                <div className="flex-col gap-lg" style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)" }}>
                  {/* Error Alert */}
                  {error && (
                    <div className="alert alert-error">
                      <span>{error}</span>
                    </div>
                  )}

                  {/* Email */}
                  <div className="form-group">
                    <label htmlFor="login-email" className="label">Email</label>
                    <input
                      id="login-email"
                      type="email"
                      className="input"
                      placeholder="admin@rede.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                      autoFocus
                    />
                  </div>

                  {/* Password */}
                  <div className="form-group">
                    <label htmlFor="login-password" className="label">Senha</label>
                    <input
                      id="login-password"
                      type="password"
                      className="input"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                      minLength={6}
                    />
                  </div>

                  {/* Submit */}
                  <button
                    type="submit"
                    className="btn btn-primary btn-lg w-full"
                    disabled={isSubmitting || authLoading}
                    style={{ width: "100%", marginTop: "var(--space-sm)" }}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                        Entrando...
                      </>
                    ) : (
                      "Entrar"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

