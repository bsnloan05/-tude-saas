import Link from "next/link";

export const metadata = {
  title: "Conditions générales de vente",
};

// À compléter dès que l'immatriculation est faite (mêmes infos que
// mentions-legales/page.tsx) et à faire relire par un professionnel avant
// de s'y fier : le droit de la consommation (rétractation, médiation) est
// pointu, cette page pose une base sérieuse mais pas une validation
// juridique.
export default function CgvPage() {
  return (
    <div className="isolate relative flex min-h-screen flex-col items-center bg-[#070a12] px-4 py-6 sm:py-16">
      <div className="mb-8 flex w-full max-w-2xl items-center justify-between sm:mb-10">
        <Link
          href="/"
          className="text-sm font-medium text-[#8b97b0] transition-colors hover:text-[#e7ecf5]"
        >
          ← Retour
        </Link>
        <span className="text-sm font-semibold text-[#e7ecf5]">Memoflash</span>
      </div>

      <div className="w-full max-w-2xl">
        <h1 className="mb-8 text-2xl font-bold text-[#e7ecf5] sm:text-3xl">
          Conditions générales de vente
        </h1>

        <div className="space-y-6 text-sm leading-relaxed text-[#c3cbdc]">
          <div>
            <h2 className="mb-1 font-semibold text-[#38bdf8]">Éditeur</h2>
            <p>
              Memoflash, <em>à compléter</em> (raison sociale, statut et numéro SIRET — voir{" "}
              <Link href="/mentions-legales" className="underline hover:text-[#e7ecf5]">
                mentions légales
              </Link>
              ).
            </p>
          </div>

          <div>
            <h2 className="mb-1 font-semibold text-[#38bdf8]">Objet</h2>
            <p>
              Memoflash est un service en ligne qui transforme un cours (écouté en direct, importé
              en PDF ou en audio) en fiche de révision, flashcards, quiz ou conversation vocale
              avec une IA. Ces CGV s&apos;appliquent à tout achat d&apos;un forfait payant sur
              memoflash.io.
            </p>
          </div>

          <div>
            <h2 className="mb-1 font-semibold text-[#38bdf8]">Prix et paiement</h2>
            <p>
              Les prix affichés sur la page{" "}
              <Link href="/pricing" className="underline hover:text-[#e7ecf5]">
                Tarifs
              </Link>{" "}
              sont en euros, toutes taxes comprises. Le paiement est traité par Stripe ; Memoflash
              ne stocke aucune donnée bancaire. Les forfaits Standard et Pro sont des abonnements
              renouvelés automatiquement (mensuel ou trimestriel selon le forfait) jusqu&apos;à
              résiliation ; le forfait À vie est un paiement unique sans renouvellement.
            </p>
          </div>

          <div>
            <h2 className="mb-1 font-semibold text-[#38bdf8]">Droit de rétractation</h2>
            <p>
              Conformément à l&apos;article L221-28 du Code de la consommation, le droit de
              rétractation ne s&apos;applique pas à un contenu numérique fourni sans support
              matériel dont l&apos;exécution a commencé avec l&apos;accord préalable du client et
              renoncement exprès à ce droit. En souscrivant à un forfait, le client reconnaît que
              l&apos;accès au service est immédiat et renonce à son droit de rétractation. Memoflash
              propose néanmoins sa propre garantie, voir ci-dessous.
            </p>
          </div>

          <div>
            <h2 className="mb-1 font-semibold text-[#38bdf8]">Garantie remboursement</h2>
            <p>
              Memoflash propose une garantie remboursement sous conditions, détaillée sur la page{" "}
              <Link href="/remboursement" className="underline hover:text-[#e7ecf5]">
                Garantie remboursement
              </Link>
              .
            </p>
          </div>

          <div>
            <h2 className="mb-1 font-semibold text-[#38bdf8]">Résiliation</h2>
            <p>
              Un abonnement (Standard ou Pro) peut être résilié à tout moment depuis l&apos;espace
              client Stripe, accessible depuis les réglages du compte. La résiliation prend effet à
              la fin de la période déjà payée.
            </p>
          </div>

          <div>
            <h2 className="mb-1 font-semibold text-[#38bdf8]">Responsabilité</h2>
            <p>
              Les fiches, flashcards, quiz et réponses générés par Memoflash sont produits à partir
              du contenu fourni par l&apos;utilisateur (cours, PDF, audio) et peuvent contenir des
              erreurs, notamment en cas de mauvaise qualité d&apos;enregistrement. Memoflash ne
              garantit pas l&apos;exactitude à 100% du contenu généré et ne saurait être tenu
              responsable d&apos;un usage de ce contenu sans vérification par l&apos;utilisateur.
            </p>
          </div>

          <div>
            <h2 className="mb-1 font-semibold text-[#38bdf8]">Médiation de la consommation</h2>
            <p>
              Conformément à l&apos;article L616-1 du Code de la consommation, en cas de litige non
              résolu directement avec nous, le client peut recourir gratuitement à un médiateur de
              la consommation : <em>à compléter</em>.
            </p>
          </div>

          <div>
            <h2 className="mb-1 font-semibold text-[#38bdf8]">Droit applicable</h2>
            <p>Les présentes CGV sont soumises au droit français.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
