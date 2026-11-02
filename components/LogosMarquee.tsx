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

export default function LogosMarquee() {
  return (
    <div className="overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
      <div className="animate-marquee flex w-max items-center gap-12">
        {[...LOGOS, ...LOGOS].map((logo, i) => (
          <span key={i} className="flex h-14 w-32 shrink-0 items-center sm:h-16 sm:w-40">
            {/* eslint-disable-next-line @next/next/no-img-element -- logos
                viennent de sources externes variées (SVG, JPEG, WEBP) sans
                dimensions connues à l'avance, Image nécessite l'une des deux. */}
            <img
              src={logo.src}
              alt={logo.name}
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
