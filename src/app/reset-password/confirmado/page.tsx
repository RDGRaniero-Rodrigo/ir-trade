import Link from "next/link";

export default function ResetConfirmadoPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0b132b] px-4">
      <div className="w-full max-w-sm rounded-xl bg-[#1c2541] p-8 text-center">
        {/* Ícone de sucesso */}
        <div className="mb-4 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#06d6a0]/20">
            <svg
              className="h-8 w-8 text-[#06d6a0]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        </div>

        <h2 className="mb-2 text-2xl font-bold text-white">Senha redefinida!</h2>
        <p className="mb-6 text-sm text-slate-400">
          Sua senha foi atualizada com sucesso. Agora você já pode fazer login
          com a nova senha.
        </p>

        <Link
          href="/login"
          className="block w-full rounded-lg bg-[#3a86ff] py-3 font-semibold text-white transition hover:bg-[#2d6fd9]"
        >
          Ir para o Login
        </Link>
      </div>
    </div>
  );
}
