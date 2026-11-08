// Fiche pré-générée une seule fois à partir de DEMO_TRANSCRIPT (voir
// lib/demoTranscript.ts), servie telle quelle par /api/demo-fiche : la démo
// montre toujours le même cours, donc regénérer via Groq à chaque utilisation
// n'apporte rien et consomme inutilement le quota partagé avec les vrais
// clients. Si DEMO_TRANSCRIPT change un jour, régénérer cette constante.
export const DEMO_FICHE_NOTES = `> **L'essentiel** : les biais cognitifs perturbent la rationalité économique ; le biais de confirmation favorise les informations qui confirment nos croyances ; l'heuristique de disponibilité surestime les événements mémorables ; l'effet d'ancrage fixe nos jugements sur la première information reçue ; l'aversion à la perte rend la douleur d'une perte plus forte que le plaisir d'un gain équivalent

## Fondements de l'économie comportementale
- L'économie classique suppose un agent **rationnel** cherchant à maximiser son intérêt.
- L'économie comportementale montre que le cerveau introduit des **erreurs systémiques** lorsqu'il prend des décisions.

## Biais de confirmation
> **Biais de confirmation** : tendance à rechercher, privilégier et retenir les informations qui confirment nos croyances, tout en minimisant ou ignorant les informations contradictoires.
- Exemple : un investisseur convaincu que le cours d'une action va monter ne lit que les articles favorables et écarte les signaux négatifs.

## Heuristique de disponibilité
> **Heuristique de disponibilité** : raccourci mental consistant à estimer la probabilité d'un événement en fonction de la facilité avec laquelle des exemples viennent à l'esprit.
- Exemple classique : la peur de l'avion après un crash médiatisé, malgré des statistiques montrant que le vol est plus sûr que la voiture.
> ⚠️ **Attention** : ne pas confondre ce biais avec le biais de confirmation ; l'heuristique de disponibilité ne sert pas à confirmer une opinion, mais à juger selon la facilité de rappel d'un souvenir.

## Effet d'ancrage
> **Effet d'ancrage** : influence excessive de la première information reçue (l'ancre) sur les jugements ultérieurs, même si cette information est sans lien réel avec la décision.
- Exemple en négociation : un prix de départ très élevé conduit l'acheteur à accepter un prix final plus élevé que s'il avait commencé avec une offre plus basse.

## Aversion à la perte et processus décisionnel
> **Aversion à la perte** : la douleur ressentie face à une perte est nettement supérieure au plaisir procuré par un gain de même valeur. (Kahneman & Tversky)
- Illustration : les investisseurs conservent des actions perdantes pour éviter de matérialiser la perte.

### Mécanisme décisionnel en quatre étapes
1. **Réception d'une information** (chiffre, actualité, offre).
2. **Activation automatique de biais** (confirmation, disponibilité, ancrage, etc.).
3. **Distorsion du jugement** (surestimation ou sous-estimation).
4. **Décision sous-optimale** (mauvais investissement, paiement excessif, maintien d'un actif perdant).

\`\`\`mermaid
flowchart TD
    A[Réception d'une information] --> B[Activation de biais]
    B --> C[Distorsion du jugement]
    C --> D[Décision sous-optimale]
    classDef step fill:#1e3a5f,stroke:#38bdf8,color:#e7ecf5
    class A,B,C,D step
\`\`\`
`;
