"use client";

import { useState } from "react";
import type { CreateRoomRequest } from "../../types/rooms";

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateRoomRequest) => Promise<void>;
}

export default function CreateRoomModal({
  isOpen,
  onClose,
  onSubmit,
}: CreateRoomModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [maxCapacity, setMaxCapacity] = useState(10);
  const [joinApprovalRequired, setJoinApprovalRequired] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim() || undefined,
        max_capacity: maxCapacity,
        join_approval_required: joinApprovalRequired,
      });
      setName("");
      setDescription("");
      setMaxCapacity(10);
      setJoinApprovalRequired(false);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create room");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      <div className="relative bg-background border border-border rounded-lg w-full max-w-md p-6 shadow-lg">
        <h2 className="text-lg font-semibold text-foreground">Create Room</h2>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground">
              Room Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={200}
              className="mt-1 w-full px-3 py-2 bg-background border border-border rounded-md text-foreground"
              placeholder="Study Group"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="mt-1 w-full px-3 py-2 bg-background border border-border rounded-md text-foreground"
              placeholder="What's this room about?"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground">
              Max Members (1-50)
            </label>
            <input
              type="number"
              value={maxCapacity}
              onChange={(e) => setMaxCapacity(Math.min(50, Math.max(1, parseInt(e.target.value) || 10)))}
              min={1}
              max={50}
              className="mt-1 w-full px-3 py-2 bg-background border border-border rounded-md text-foreground"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="joinApproval"
              checked={joinApprovalRequired}
              onChange={(e) => setJoinApprovalRequired(e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="joinApproval" className="text-sm text-foreground">
              Require approval to join
            </label>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-border rounded-md text-foreground hover:bg-card transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}