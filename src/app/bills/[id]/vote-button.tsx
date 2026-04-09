"use client";
import { useState } from "react";

type Position = "SUPPORT" | "OPPOSE" | "ABSTAIN";
interface Props { billId: string; currentVote?: Position | null; isVerified: boolean; }
export default function VoteButton({ billId, currentVote, isVerified }: Props) {
  const [selected, setSelected] = useState<Position | null>(currentVote || null);
  const [loading, setLoading] = useState(false);
  const [comment, setComment] = useState("");
  const [done, setDone] = useState(false);
  if (!isVerified) return (<div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center"><p className="text-amber-800 font-medium mb-2">Verify your address to vote</p><p className="text-amber-700 text-sm mb-3">We need to confirm your electorate before you can vote.</p><a href="/account/verify" className="bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-700">Verify my address →</a></div>);
  async function castVote(position: Position) { setLoading(true); setSelected(position); const res = await fetch("/api/vote", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ billId, position, comment: comment || undefined }), }); setLoading(false); if (res.ok) setDone(true); }
  if (done) return (<div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center"><p className="text-green-800 font-medium">✓ Vote recorded</p><p className="text-green-700 text-sm mt-1">You voted <strong>{selected}</strong> on this bill.</p></div>);
  const buttons = [{ position: "SUPPORT", label: "👍 Support", color: "border-green-300 text-green-700 hover:bg-green-50", active: "bg-green-100 border-green-500 text-green-800 font-bold" }, { position: "OPPOSE", label: "👎 Oppose", color: "border-red-300 text-red-700 hover:bg-red-50", active: "bg-red-100 border-red-500 text-red-800 font-bold" }, { position: "ABSTAIN", label: "🤷 Abstain", color: "border-gray-300 text-gray-600 hover:bg-gray-50", active: "bg-gray-100 border-gray-500 text-gray-800 font-bold" }] as const;
  return (<div className="space-y-4"><p className="text-sm font-medium text-gray-700">Cast your vote:</p><div className="grid grid-cols-3 gap-3">{buttons.map(({ position, label, color, active }) => (<button key={position} onClick={() => castVote(position)} disabled={loading} className={`py-3 px-2 rounded-lg border-2 text-sm transition-all ${selected === position ? active : color} disabled:opacity-50`}>{label}</button>))}</div><textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Add a comment (optional)" rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>);
}
