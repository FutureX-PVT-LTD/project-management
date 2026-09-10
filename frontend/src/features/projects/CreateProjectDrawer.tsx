"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Drawer } from "@/components/ui/Drawer";
import { UserRole } from "@futurex/shared";
import { X, Search, Check, Users, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface CreateProjectDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateProjectDrawer({
  open,
  onOpenChange,
}: CreateProjectDrawerProps) {
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [targetDate, setTargetDate] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Reset form when drawer opens
  useEffect(() => {
    if (open) {
      setName("");
      setDescription("");
      setStartDate(new Date().toISOString().split("T")[0]);
      setTargetDate("");
      setSelectedMemberIds([]);
      setMemberSearch("");
      setError(null);
    }
  }, [open]);

  // Fetch only active TEAM_MEMBER users (exclude Admin/Owner)
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ["users", "eligible-members"],
    queryFn: () => api.get("/users?isActive=true"),
    enabled: open,
  });

  const availableEmployees = ((usersData as any[]) || []).filter(
    (u) => u.isActive !== false,
  );

  const filteredEmployees = availableEmployees.filter((u) => {
    if (!memberSearch) return true;
    const q = memberSearch.toLowerCase();
    const fullName = `${u.firstName} ${u.lastName}`.toLowerCase();
    return (
      fullName.includes(q) ||
      (u.jobTitle && u.jobTitle.toLowerCase().includes(q))
    );
  });

  const createProjectMutation = useMutation({
    mutationFn: (dto: any) => api.post("/projects", dto),
    onSuccess: () => {
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
    onError: (err: any) => {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to create project",
      );
    },
  });

  const toggleMember = (userId: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  };

  const removeMember = (userId: string) => {
    setSelectedMemberIds((prev) => prev.filter((id) => id !== userId));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Product name is required");
      return;
    }

    createProjectMutation.mutate({
      name: name.trim(),
      description: description.trim() || undefined,
      startDate: startDate ? new Date(startDate).toISOString() : undefined,
      targetDate: targetDate ? new Date(targetDate).toISOString() : undefined,
      memberIds: selectedMemberIds,
    });
  };

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      title="Create New Product"
      description="Set up product workspace deliverables, schedule targets, and assign team members."
      footer={
        <>
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="create-project-form"
            variant="primary"
            size="md"
            isLoading={createProjectMutation.isPending}
          >
            Create Product
          </Button>
        </>
      }
    >
      <form
        onSubmit={handleSubmit}
        id="create-project-form"
        className="space-y-6 text-xs"
      >
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2 text-xs text-fx-semantic-danger animate-fadeIn">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Section 1: Product Details */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-fx-text-secondary">
            Product Details
          </h3>

          <div>
            <label className="block text-xs font-medium text-fx-text-primary mb-1">
              Product Name <span className="text-fx-semantic-danger">*</span>
            </label>
            <Input
              placeholder="e.g. Colombo Rider – Season 2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-fx-text-primary mb-1">
              Description & Scope
            </label>
            <textarea
              rows={3}
              placeholder="Outline key game features, technical milestones, and scope specifications..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-white border border-fx-border rounded-md p-3 text-xs text-fx-text-primary placeholder:text-fx-text-muted focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
            />
          </div>
        </div>

        {/* Section 2: Delivery Schedule */}
        <div className="space-y-3 pt-4 border-t border-fx-border/70">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-fx-text-secondary">
            Schedule & Milestones
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-fx-text-primary mb-1">
                Start Date
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-fx-text-primary mb-1">
                Target Delivery Date
              </label>
              <Input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Section 3: Team Assignment */}
        <div className="space-y-3 pt-4 border-t border-fx-border/70">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-fx-text-secondary flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              <span>Assign Team Members</span>
            </h3>
            <span className="text-[11px] text-fx-text-muted">
              {selectedMemberIds.length} selected
            </span>
          </div>

          {/* Selected member badges */}
          {selectedMemberIds.length > 0 && (
            <div className="flex flex-wrap gap-1.5 p-2.5 bg-fx-bg-subtle rounded-md border border-fx-border/60">
              {selectedMemberIds.map((id) => {
                const emp = availableEmployees.find((u) => u.id === id);
                if (!emp) return null;
                return (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1.5 px-2 py-1 bg-white border border-fx-border rounded text-[11px] font-medium text-fx-text-primary"
                  >
                    <span>
                      {emp.firstName} {emp.lastName}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeMember(id)}
                      className="text-fx-text-muted hover:text-fx-semantic-danger"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                );
              })}
            </div>
          )}

          {/* Searchable member picker */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-fx-text-muted" />
              <input
                type="text"
                placeholder="Search active team members..."
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-fx-border rounded-md text-fx-text-primary placeholder:text-fx-text-muted focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
              />
            </div>

            {usersLoading ? (
              <p className="text-[11px] text-fx-text-muted py-2 text-center">
                Loading team directory...
              </p>
            ) : availableEmployees.length === 0 ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-[11px] text-amber-900 space-y-1">
                <p className="font-semibold">No team members found</p>
                <p className="text-amber-800">
                  Create team member accounts in{" "}
                  <Link
                    href="/admin/users"
                    className="font-medium underline text-amber-950"
                  >
                    User Management
                  </Link>{" "}
                  first to assign them to projects.
                </p>
              </div>
            ) : (
              <div className="max-h-44 overflow-y-auto border border-fx-border rounded-md divide-y divide-fx-border/60 bg-white">
                {filteredEmployees.length === 0 ? (
                  <p className="text-[11px] text-fx-text-muted p-3 text-center">
                    No team members match &quot;{memberSearch}&quot;
                  </p>
                ) : (
                  filteredEmployees.map((emp) => {
                    const isSelected = selectedMemberIds.includes(emp.id);
                    return (
                      <div
                        key={emp.id}
                        onClick={() => toggleMember(emp.id)}
                        className={cn(
                          "p-2.5 flex items-center justify-between cursor-pointer fx-transition select-none",
                          isSelected
                            ? "bg-[#EEF4FF]/60"
                            : "hover:bg-fx-bg-hover",
                        )}
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className={cn(
                              "w-4 h-4 rounded border flex items-center justify-center shrink-0",
                              isSelected
                                ? "bg-[#2563EB] border-[#2563EB] text-white"
                                : "border-fx-border bg-white",
                            )}
                          >
                            {isSelected && (
                              <Check className="w-3 h-3 stroke-[3]" />
                            )}
                          </div>
                          <div>
                            <p className="text-xs font-medium text-fx-text-primary">
                              {emp.firstName} {emp.lastName}
                            </p>
                            <p className="text-[10px] text-fx-text-muted">
                              {emp.jobTitle || "Team Member"}
                            </p>
                          </div>
                        </div>
                        <span className="text-[10px] text-fx-text-muted font-mono">
                          {emp.email}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>
      </form>
    </Drawer>
  );
}
