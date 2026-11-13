import Link from "next/link";

export const metadata = {
  title: "Garantie remboursement",
};

export default function RemboursementPage() {
  return (
    <div className="isolate relative flex min-h-screen flex-col items-center bg-[#070a12] px-4 py-6 sm:py-16">
      <div className="mb-8 flex w-full max-w-2xl items-center justify-between sm:mb-10">
        <Link
          href="/pricing"
          className="text-sm font-medium text-[#8b97b0] transition-colors hover:text-[#e7ecf5]"
        >
          ← Retour
        </Link>
        <span className="text-sm font-semibold text-[#e7ecf5]">Memoflash</span>
      </div>

      <div className="w-full max-w-2xl">
        <h1 className="mb-2 text-2xl font-bold text-[#e7ecf5] sm:text-3xl">
          Garantie remboursement
        </h1>
        <p className="mb-8 text-sm text-[#8b97b0]">
          Voici, sans détour, les conditions exactes dans lesquelles on te rembourse.
        </p>

        <div className="space-y-6 text-sm leading-relaxed text-[#c3cbdc]">
          <div>
            <h2 className="mb-1 font-semibold text-emerald-400">
              Forfaits concernés
            </h2>
            <p>
              La garantie s&apos;applique uniquement aux forfaits <strong>Standard</strong> et{" "}
              <strong>Pro</strong>. Le forfait <strong>À vie</strong> n&apos;est pas couvert.
            </p>
          </div>

          <div>
            <h2 className="mb-1 font-semibold text-emerald-400">Délai</h2>
            <p>
              Tu dois nous écrire dans les <strong>24h suivant ton achat</strong>. Passé ce délai,
              aucune demande n&apos;est acceptée.
            </p>
          </div>

          <div>
            <h2 className="mb-1 font-semibold text-emerald-400">
              Une raison valable
            </h2>
            <p>
              Ce n&apos;est pas un remboursement automatique ni sans justification : ta demande doit
              expliquer pourquoi Memoflash ne te convient pas. On l&apos;étudie et on te rembourse
              si la raison est valable.
            </p>
          </div>

          <div>
            <h2 className="mb-1 font-semibold text-emerald-400">
              Comment faire la demande
            </h2>
            <p>
              Écris-nous à{" "}
              <a
                href="mailto:memoflash@outlook.fr"
                className="underline hover:text-[#e7ecf5]"
              >
                memoflash@outlook.fr
              </a>{" "}
              en précisant ton adresse email utilisée sur Memoflash et la raison de ta demande.
            </p>
          </div>

          <div>
            <h2 className="mb-1 font-semibold text-emerald-400">
              Comment on te rembourse
            </h2>
            <p>
              Si ta demande est acceptée, le remboursement est effectué via Stripe, sur le même
              moyen de paiement utilisé lors de l&apos;achat.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
