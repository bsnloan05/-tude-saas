import Link from "next/link";

export const metadata = {
  title: "Mentions légales",
};

// À compléter dès que l'immatriculation (auto-entrepreneur ou société) est
// faite — voir mémoire "seo-pages-dediees-mots-cles" / tâche legal pour le
// contexte. Rien ici n'est inventé : les champs marqués "à compléter"
// doivent rester visibles tels quels tant que l'info réelle n'existe pas.
export default function MentionsLegalesPage() {
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
          Mentions légales
        </h1>

        <div className="space-y-6 text-sm leading-relaxed text-[#c3cbdc]">
          <div>
            <h2 className="mb-1 font-semibold text-[#38bdf8]">Éditeur du site</h2>
            <p>
              Raison sociale / nom : <em>à compléter</em>
              <br />
              Statut : <em>en cours d&apos;immatriculation</em>
              <br />
              Numéro SIRET : <em>à compléter</em>
              <br />
              Adresse : <em>à compléter</em>
              <br />
              Contact :{" "}
              <a href="mailto:memoflash@outlook.fr" className="underline hover:text-[#e7ecf5]">
                memoflash@outlook.fr
              </a>
            </p>
          </div>

          <div>
            <h2 className="mb-1 font-semibold text-[#38bdf8]">Directeur de la publication</h2>
            <p>
              <em>À compléter</em> (même personne que l&apos;éditeur du site, une fois
              l&apos;immatriculation faite).
            </p>
          </div>

          <div>
            <h2 className="mb-1 font-semibold text-[#38bdf8]">Hébergement</h2>
            <p>
              Vercel Inc.
              <br />
              340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis
            </p>
          </div>

          <div>
            <h2 className="mb-1 font-semibold text-[#38bdf8]">Propriété intellectuelle</h2>
            <p>
              L&apos;ensemble du contenu de ce site (textes, visuels, logo) est protégé par le
              droit d&apos;auteur. Toute reproduction sans autorisation est interdite.
            </p>
          </div>

          <div>
            <h2 className="mb-1 font-semibold text-[#38bdf8]">Contact</h2>
            <p>
              Pour toute question relative au site ou à ces mentions, écris à{" "}
              <a href="mailto:memoflash@outlook.fr" className="underline hover:text-[#e7ecf5]">
                memoflash@outlook.fr
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
