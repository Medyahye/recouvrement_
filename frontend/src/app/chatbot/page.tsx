import { BotMessageSquare, Database, MessageSquareText, Sparkles } from "lucide-react";

export default function ChatbotPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[22px] font-semibold tracking-normal text-slate-950">Assistant IA</h1>
        <p className="mt-1 text-sm text-slate-500">
          Interrogez prochainement vos données de recouvrement en langage naturel.
        </p>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
            <BotMessageSquare size={28} />
          </div>
          <h2 className="mt-4 text-xl font-semibold text-slate-950">Chatbot de données bientôt disponible</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Cette page permettra de poser des questions sur les imports, les zones, les clients et les rapports.
            Le moteur conversationnel sera branché dans une prochaine étape.
          </p>

          <div className="mt-6 grid gap-3 text-left sm:grid-cols-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <MessageSquareText size={20} className="text-blue-700" />
              <p className="mt-3 text-sm font-semibold text-slate-900">Questions naturelles</p>
              <p className="mt-1 text-xs text-slate-500">Dialoguer simplement avec les données métier.</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <Database size={20} className="text-emerald-700" />
              <p className="mt-3 text-sm font-semibold text-slate-900">Données internes</p>
              <p className="mt-1 text-xs text-slate-500">Zones, clients, imports et rapports.</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <Sparkles size={20} className="text-violet-700" />
              <p className="mt-3 text-sm font-semibold text-slate-900">Réponses synthétiques</p>
              <p className="mt-1 text-xs text-slate-500">Analyse claire et exploitable.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
