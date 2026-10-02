import { useState } from "react";
import { Link } from "react-router";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useLanguage } from "@/lib/i18n";
import { LanguageSelector } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPicker } from "@/hooks/use-map";
import { useAuthActions } from "@convex-dev/auth/react";
import {
  Landmark, Search, Loader2, MapPin, Camera, Clock, FileText, ArrowLeft,
} from "lucide-react";
import type { ComplaintStatus } from "@/lib/complaint-meta";

const STATUS_FLOW: ComplaintStatus[] = ["new", "verified", "assigned", "in_progress", "resolved"];

function fmtDate(ms: number) {
  return new Date(ms).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Track() {
  const { t } = useLanguage();
  const [trackingId, setTrackingId] = useState("");
  const [phone, setPhone] = useState("");
  const [submitted, setSubmitted] = useState<{ id: string; phone: string } | null>(null);
  const [searching, setSearching] = useState(false);

  // Only run the query once the user has submitted.
  const result = useQuery(
    api.complaints.trackComplaint,
    submitted ? { trackingId: submitted.id, phone: submitted.phone } : "skip",
  );

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingId.trim() || phone.replace(/\D/g, "").length < 10) return;
    setSearching(true);
    setSubmitted({ id: trackingId.trim().toUpperCase(), phone: phone.trim() });
    setTimeout(() => setSearching(false), 300);
  };

  return (
    <div className="min-h-screen">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-full border-2 border-primary/70 text-primary">
              <Landmark className="size-5" />
            </span>
            <span className="font-serif text-lg">{t("brand.name")}</span>
          </Link>
          <LanguageSelector compact />
        </div>
      </header>

      <main className="hero-wash mx-auto max-w-2xl px-4 py-10">
        <Link to="/" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> {t("nav.home")}
        </Link>

        <h1 className="fade-up font-serif text-3xl">{t("track.title")}</h1>
        <p className="fade-up d1 mt-2 text-sm text-muted-foreground">{t("track.subtitle")}</p>

        <form onSubmit={onSubmit} className="archive-frame paper-card fade-up d2 mt-6 rounded-lg p-5">
          <div className="archive-frame-inner space-y-4">
            <div>
              <label htmlFor="tid" className="type-label mb-1.5 block text-[10px] text-muted-foreground">
                {t("track.id")}
              </label>
              <Input
                id="tid"
                value={trackingId}
                onChange={(e) => setTrackingId(e.target.value.toUpperCase())}
                placeholder={t("track.idPlaceholder")}
                className="type-label"
                required
              />
            </div>
            <div>
              <label htmlFor="tphone" className="type-label mb-1.5 block text-[10px] text-muted-foreground">
                {t("track.phone")}
              </label>
              <Input
                id="tphone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t("login.phonePlaceholder")}
                required
              />
            </div>
            {result === null && (
              <p className="text-sm text-destructive">{t("track.notFound")}</p>
            )}
            <Button type="submit" className="w-full" disabled={searching}>
              {searching ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> {t("track.tracking")}
                </>
              ) : (
                <>
                  <Search className="size-4" /> {t("track.submit")}
                </>
              )}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              {t("track.privacyNote")}
            </p>
          </div>
        </form>

        {result && (
          <section className="archive-frame paper-card fade-up mt-6 rounded-lg p-5">
            <div className="archive-frame-inner space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="type-label text-xs text-primary">{result.trackingId}</span>
                <span className="type-label rounded-full border border-primary/50 bg-primary/10 px-3 py-1 text-[10px] text-primary">
                  {t(`status.${result.status}`)}
                </span>
              </div>
              <h2 className="font-serif text-xl">{result.title}</h2>
              <p className="text-sm leading-relaxed">{result.description}</p>

              {/* status timeline */}
              <div className="flex flex-wrap items-center gap-1">
                {STATUS_FLOW.map((s, i) => {
                  const stage = STATUS_FLOW.indexOf(result.status);
                  return (
                    <div key={s} className="flex items-center gap-1">
                      <span className={`flex size-6 items-center justify-center rounded-full border text-[10px] ${i <= stage ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"}`}>
                        {i + 1}
                      </span>
                      {i < STATUS_FLOW.length - 1 && <span className={`h-px w-5 ${i < stage ? "bg-primary" : "bg-border"}`} />}
                    </div>
                  );
                })}
              </div>

              <div className="grid gap-3 text-xs text-muted-foreground sm:grid-cols-2">
                <p className="flex items-center gap-1.5">
                  <MapPin className="size-3.5" />
                  {result.location.address ?? `${result.location.lat.toFixed(4)}, ${result.location.lng.toFixed(4)}`}
                </p>
                <p className="flex items-center gap-1.5">
                  <Clock className="size-3.5" /> {fmtDate(result.createdAt)}
                </p>
                <p className="flex items-center gap-1.5 capitalize">
                  <FileText className="size-3.5" /> {result.issueType.replace("_", " ")} — {t(`severity.${result.severity}`)}
                </p>
                {result.evidence.length > 0 && (
                  <p className="flex items-center gap-1.5">
                    <Camera className="size-3.5" /> {result.evidence.length} attachment(s)
                  </p>
                )}
              </div>

              {result.evidence.length > 0 && (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {result.evidence.map((e, i) => (
                    <img key={i} src={e.dataUrl} alt="" className="h-24 w-full rounded border border-border object-cover" />
                  ))}
                </div>
              )}

              <div className="h-48 overflow-hidden rounded border border-border">
                <MapPicker
                  center={result.location}
                  pin={result.location}
                  interactive={false}
                  className="h-full w-full"
                />
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
