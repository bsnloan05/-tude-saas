const NOTIFICATIONS = [
  {
    time: "à l'instant",
    text: "Ta fiche de Biologie est prête",
    scale: "scale-100",
    opacity: "opacity-100",
    z: "z-30",
  },
  {
    time: "il y a 2 min",
    text: "Cours de Droit transcrit avec succès",
    scale: "scale-[0.96]",
    opacity: "opacity-70",
    z: "z-20",
  },
  {
    time: "il y a 5 min",
    text: "Nouvelle fiche : Histoire de France",
    scale: "scale-[0.92]",
    opacity: "opacity-40",
    z: "z-10",
  },
];

export default function LiveDemoMockup() {
  return (
    <div className="relative mx-auto w-72 select-none">
      {/* Boutons latéraux */}
      <div className="absolute top-24 -left-[3px] h-8 w-[3px] rounded-l bg-[#3a3a3e]" />
      <div className="absolute top-36 -left-[3px] h-12 w-[3px] rounded-l bg-[#3a3a3e]" />
      <div className="absolute top-32 -right-[3px] h-16 w-[3px] rounded-r bg-[#3a3a3e]" />

      {/* Corps du téléphone */}
      <div className="rounded-[2.75rem] border-[6px] border-[#3a3a3e] bg-black shadow-2xl shadow-black/50">
        <div className="relative h-[480px] overflow-hidden rounded-[2.25rem] bg-gradient-to-b from-[#0b1120] to-[#0f1729]">
          {/* Encoche */}
          <div className="absolute top-2.5 left-1/2 z-40 h-6 w-24 -translate-x-1/2 rounded-full bg-black" />

          {/* Barre de statut */}
          <div className="flex items-center justify-between px-7 pt-4 text-xs font-semibold text-white">
            <span>9:41</span>
            <div className="flex items-center gap-1">
              <svg viewBox="0 0 16 12" className="h-2.5 w-4 fill-white">
                <rect x="0" y="7" width="2.5" height="5" rx="0.5" />
                <rect x="4.5" y="4.5" width="2.5" height="7.5" rx="0.5" />
                <rect x="9" y="2" width="2.5" height="10" rx="0.5" />
                <rect x="13.5" y="0" width="2.5" height="12" rx="0.5" opacity="0.4" />
              </svg>
              <svg viewBox="0 0 16 12" className="h-2.5 w-4 fill-white">
                <path d="M8 10.5a1.2 1.2 0 100-2.4 1.2 1.2 0 000 2.4z" />
                <path d="M8 2C4.7 2 2 4.2 2 4.2l1.2 1.5S5.3 4 8 4s4.8 1.7 4.8 1.7L14 4.2S11.3 2 8 2z" />
              </svg>
              <span className="ml-0.5 h-2.5 w-5 rounded-[2px] border border-white/70" />
            </div>
          </div>

          <p className="mt-3 text-center text-3xl font-semibold tracking-tight text-white">
            9:41
          </p>

          {/* Pile de notifications */}
          <div className="relative mt-10 px-4">
            {NOTIFICATIONS.map((notif, index) => (
              <div
                key={notif.time}
                className={`${index > 0 ? "absolute inset-x-4 top-0" : "relative"} ${notif.z}`}
                style={index > 0 ? { top: `${index * 6}px` } : undefined}
              >
                <div
                  className={`origin-top rounded-2xl border border-[#232d45] bg-[#141b2e]/95 p-3 shadow-lg backdrop-blur ${notif.scale} ${notif.opacity}`}
                >
                  <div className="flex items-start gap-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.6rem] bg-[#2563eb] text-xs font-bold text-white">
                      M
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-white">
                          Memoflash
                        </span>
                        <span className="shrink-0 text-[10px] text-[#8b97b0]">
                          {notif.time}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-[#c3cbdc]">
                        {notif.text}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
