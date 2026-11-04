const LOGOS: Array<{ name: string; src: string }> = [
  { name: "ENT", src: "/logos/ent.jpg" },
  { name: "Pronote", src: "/logos/pronote.png" },
  { name: "Université de Lille", src: "/logos/universite-lille.webp" },
  { name: "EduConnect", src: "/logos/educonnect.png" },
  { name: "Région Hauts-de-France", src: "/logos/hauts-de-france.webp" },
  { name: "Région Île-de-France", src: "/logos/ile-de-france.webp" },
  { name: "CROUS", src: "/logos/crous.svg" },
  { name: "Université Paris-Dauphine", src: "/logos/dauphine.png" },
  { name: "Sorbonne Université", src: "/logos/sorbonne.svg" },
  { name: "Sciences Po", src: "/logos/sciences-po.jpg" },
  { name: "Parcoursup", src: "/logos/parcoursup.jpg" },
  { name: "Pix", src: "/logos/pix.svg" },
];

export default function LogosMarquee({ size = "default" }: { size?: "default" | "compact" }) {
  // mr-* (porté par chaque logo) plutôt que gap sur le conteneur : avec gap,
  // les 24 logos dupliqués n'ont que 23 espacements entre eux (nombre
  // impair), donc translateX(-50%) ne tombe jamais exactement sur la
  // répétition du motif (décalage d'un demi-espacement) — d'où le saut
  // visible à chaque boucle. En mettant la marge sur chaque élément (y
  // compris le dernier), les deux moitiés ont une largeur strictement
  // identique et la boucle devient parfaitement continue.
  const itemClassName =
    size === "compact"
      ? "flex h-9 w-20 shrink-0 items-center mr-9 sm:h-10 sm:w-24"
      : "flex h-14 w-32 shrink-0 items-center mr-12 sm:h-16 sm:w-40";

  return (
    <div className="overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
      <div className="animate-marquee flex w-max items-center">
        {[...LOGOS, ...LOGOS].map((logo, i) => (
          <span key={i} className={itemClassName}>
            {/* eslint-disable-next-line @next/next/no-img-element -- logos
                viennent de sources externes variées (SVG, JPEG, WEBP) sans
                dimensions connues à l'avance, Image nécessite l'une des deux. */}
            <img
              src={logo.src}
              alt={logo.name}
              loading="lazy"
              decoding="async"
              draggable={false}
              className="h-full w-full object-contain"
            />
          </span>
        ))}
      </div>
    </div>
  );
}
