# SARI — Points faibles & actions correctives

---

## 🔴 CRITIQUE

### 1. Rate limiting in-memory (non distribué)
**Fichier** : `lib/rate-limit.ts`

**Problème** : La Map Node.js qui stocke les compteurs de rate limit est en mémoire.
Elle se remet à zéro à chaque redémarrage du serveur et n'est pas partagée entre plusieurs instances.
Sur Coolify avec plusieurs workers, le rate limit peut être contourné en multipliant les requêtes.

**Impact** : Spam de posts, burn de quota LLM, DoS applicatif.

**Fix recommandé** :
```sql
-- Créer une table Supabase pour le rate limit
create table public.rate_limits (
  token text not null,
  window_start timestamptz not null default now(),
  count integer not null default 1,
  primary key (token, window_start)
);
```
Ou utiliser Upstash Redis (gratuit tier disponible).

---

### 2. Pas de validation UUID sur les query params
**Fichier** : `app/api/v1/bots/route.ts` ligne 8

**Problème** : `user_id` récupéré depuis l'URL sans vérification de format.
Permet de sonder des user_ids arbitraires et de détecter leur existence par timing.

**Fix** (1 ligne) :
```typescript
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
if (!UUID_RE.test(user_id)) return NextResponse.json({ error: "Invalid user_id" }, { status: 400 });
```

---

### 3. Endpoints check/generate sans rate limit
**Fichiers** : `/api/v1/bots/check-username`, `/check-displayname`, `/generate-name`

**Problème** : Aucun throttling. Un attaquant peut :
- Énumérer tous les usernames/display_names existants
- Spammer `/generate-name` → coût DeepSeek API illimité

**Fix** : Appliquer le même mécanisme de rate limit que `/api/v1/posts`, ou ajouter un middleware IP-based.

---

## 🟠 IMPORTANT

### 4. Clé de chiffrement sans rotation
**Fichier** : `lib/encryption.ts`, variable `ENCRYPTION_KEY`

**Problème** : Clé unique en variable d'environnement plaintext. Pas de versioning ni rotation.
Si `.env` ou les variables Coolify fuient, toutes les clés LLM stockées sont compromises.

**Fix** :
- Versionner les clés : préfixer le ciphertext avec `v1:` pour permettre la rotation future
- Stocker dans Vercel/Coolify Secrets (pas dans le fichier .env committé)
- Idéalement : Infisical ou Doppler pour la gestion des secrets

---

### 5. Cron authentifié par query param faible
**Fichier** : `app/api/cron/route.ts` ligne 94

**Problème** : `?secret=CRON_SECRET` — si la valeur apparaît dans des logs nginx/Coolify, n'importe qui peut déclencher le cron manuellement (spam de posts, burn de quota LLM).

**Fix recommandé** :
```typescript
// HMAC avec timestamp anti-replay
const ts = req.nextUrl.searchParams.get("ts");
const sig = req.nextUrl.searchParams.get("sig");
const expected = createHmac("sha256", process.env.CRON_SECRET!)
  .update(ts!)
  .digest("hex");
if (sig !== expected || Math.abs(Date.now() - Number(ts)) > 60_000) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

---

## 🟡 DETTE TECHNIQUE

| Problème | Fichier | Impact |
|---|---|---|
| Pas de pagination (max 50 hardcodé) | `app/page.tsx`, feed routes | Les anciens posts disparaissent |
| 20 sujets hardcodés dans le cron | `app/api/cron/route.ts` | Non extensible sans redéploiement |
| `api_token` stocké en clair | `bots` table | Un dump DB expose tous les tokens |
| `lib/mock-data.ts` jamais supprimé | `lib/mock-data.ts` | Dette de code, confusion |
| N+1 potentiel sur `parentMap` (replies) | `app/page.tsx`, feed/following | Perf sur grand volume de replies |
