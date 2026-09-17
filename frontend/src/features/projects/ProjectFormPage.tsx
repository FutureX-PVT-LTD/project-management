"use client";

import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  Code2,
  Edit2,
  Loader2,
  Megaphone,
  Search,
  X,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { asArray, asRecord } from "@/lib/api-data";
import { ProductType } from "@futurex/shared";
import { AppShell } from "@/components/layout/AppShell";
import { FormPageLayout } from "@/components/layout/FormPageLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn, formatDate } from "@/lib/utils";
import Link from "next/link";

interface ProjectFormPageProps {
  mode: "create" | "edit";
}

export function ProjectFormPage({ mode }: ProjectFormPageProps) {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const projectId = params?.id as string | undefined;

  const urlDraftId = searchParams.get("draft");
  const urlStep = searchParams.get("step");

  const [draftId, setDraftId] = useState<string | null>(urlDraftId);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null);
  const [isActivating, setIsActivating] = useState(false);
  const [isHydrated, setIsHydrated] = useState(mode === "edit" || !urlDraftId);

  // Form State
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [targetMarket, setTargetMarket] = useState("");
  const [targetLanguage, setTargetLanguage] = useState("");
  const [productType, setProductType] = useState<ProductType>(ProductType.GAME);
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [targetDate, setTargetDate] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [projectRoles, setProjectRoles] = useState<Record<string, string[]>>({});
  const [memberSearch, setMemberSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  const getStepNumber = (s: string | null): number => {
    if (s === "team") return 2;
    if (s === "workstreams") return 3;
    if (s === "review") return 4;
    return 1;
  };

  const getStepName = (s: number): string => {
    if (s === 2) return "team";
    if (s === 3) return "workstreams";
    if (s === 4) return "review";
    return "details";
  };

  const getStepEnum = (s: number): string => {
    if (s === 2) return "TEAM";
    if (s === 3) return "WORKSTREAMS";
    if (s === 4) return "REVIEW";
    return "DETAILS";
  };

  const [step, setStep] = useState(() => (mode === "create" ? getStepNumber(urlStep) : 1));
  const [developmentEnabled, setDevelopmentEnabled] = useState(true);
  const [marketingEnabled, setMarketingEnabled] = useState(true);

  // Tracking last saved payload to avoid redundant autosaves
  const lastSavedPayloadRef = useRef<string>("");
  const autosaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load project for edit mode
  const { data: projectData } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => api.get(`/projects/${projectId}`),
    enabled: mode === "edit" && !!projectId,
  });

  const project = asRecord(projectData);

  // Load draft for create mode if urlDraftId is present
  const { data: draftData, isError: draftError } = useQuery({
    queryKey: ["project-draft", urlDraftId],
    queryFn: () => api.get(`/projects/drafts/${urlDraftId}`),
    enabled: mode === "create" && !!urlDraftId,
    staleTime: 0,
  });

  // Load users for team assignment
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ["users", "eligible-members"],
    queryFn: () => api.get("/users?isActive=true"),
  });

  const employees = useMemo(
    () =>
      asArray<any>(usersData).filter(
        (u) => u.isActive !== false,
      ),
    [usersData],
  );

  const filteredEmployees = employees.filter((u) => {
    if (!memberSearch) return true;
    const q = memberSearch.toLowerCase();
    const fullName = `${u.firstName} ${u.lastName}`.toLowerCase();
    return (
      fullName.includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.jobTitle?.toLowerCase().includes(q)
    );
  });

  // Hydrate from draftData
  useEffect(() => {
    if (mode !== "create" || !draftData) return;
    const d = asRecord(draftData);
    if (!d || !d.id) return;

    setName(d.name === "Untitled Draft" ? "" : d.name || "");
    setDescription(d.description || "");
    setTargetMarket(d.targetMarket || "");
    setTargetLanguage(d.targetLanguage || "");
    setProductType(d.productType || ProductType.GAME);
    if (d.startDate) setStartDate(d.startDate.split("T")[0]);
    if (d.targetDate) setTargetDate(d.targetDate.split("T")[0]);
    setSelectedMemberIds(asArray<string>(d.selectedMemberIds));
    setProjectRoles((d.projectRoles as Record<string, string[]>) || {});
    setDevelopmentEnabled(d.developmentEnabled !== false);
    setMarketingEnabled(d.marketingEnabled !== false);
    setDraftId(d.id);

    if (!urlStep && d.currentStep) {
      setStep(getStepNumber(d.currentStep.toLowerCase()));
    }

    setSaveStatus("saved");
    if (d.updatedAt) setLastSavedTime(new Date(d.updatedAt));

    const initialSnapshot = JSON.stringify({
      name: (d.name === "Untitled Draft" ? "" : d.name || "").trim(),
      description: (d.description || "").trim(),
      targetMarket: (d.targetMarket || "").trim(),
      targetLanguage: (d.targetLanguage || "").trim(),
      productType: d.productType || ProductType.GAME,
      startDate: d.startDate ? d.startDate.split("T")[0] : undefined,
      targetDate: d.targetDate ? d.targetDate.split("T")[0] : undefined,
      selectedMemberIds: asArray<string>(d.selectedMemberIds),
      projectRoles: d.projectRoles || {},
      developmentEnabled: d.developmentEnabled !== false,
      marketingEnabled: d.marketingEnabled !== false,
      currentStep: d.currentStep || "DETAILS",
    });
    lastSavedPayloadRef.current = initialSnapshot;
    setIsHydrated(true);
  }, [mode, draftData, urlStep]);

  // Handle draft loading error
  useEffect(() => {
    if (draftError && mode === "create") {
      setDraftId(null);
      setIsHydrated(true);
      setError("This draft is unavailable or you do not have permission to open it.");
      window.history.replaceState(null, "", "/projects/new");
    }
  }, [draftError, mode]);

  // Hydrate from edit mode
  useEffect(() => {
    if (mode !== "edit" || !project?.id) return;
    setName(project.name || "");
    setDescription(project.description || "");
    setTargetMarket(project.targetMarket || "");
    setTargetLanguage(project.targetLanguage || "");
    setProductType(project.productType || ProductType.GAME);
    setStartDate(project.startDate ? project.startDate.split("T")[0] : "");
    setTargetDate(project.targetDate ? project.targetDate.split("T")[0] : "");
  }, [
    mode,
    project?.id,
    project.name,
    project.description,
    project.targetMarket,
    project.targetLanguage,
    project.productType,
    project.startDate,
    project.targetDate,
  ]);

  // Current Payload for Autosave
  const currentPayload = useMemo(() => ({
    name: name.trim(),
    description: description.trim(),
    targetMarket: targetMarket.trim(),
    targetLanguage: targetLanguage.trim(),
    productType,
    startDate: startDate || undefined,
    targetDate: targetDate || undefined,
    selectedMemberIds,
    projectRoles,
    developmentEnabled,
    marketingEnabled,
    currentStep: getStepEnum(step),
  }), [
    name,
    description,
    targetMarket,
    targetLanguage,
    productType,
    startDate,
    targetDate,
    selectedMemberIds,
    projectRoles,
    developmentEnabled,
    marketingEnabled,
    step,
  ]);

  // Save Draft API Call
  const performSaveDraft = useCallback(
    async (payloadToSave: typeof currentPayload, explicitDraftId?: string | null) => {
      const activeDraftId = explicitDraftId !== undefined ? explicitDraftId : draftId;
      setSaveStatus("saving");

      try {
        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current);
          retryTimeoutRef.current = null;
        }
        const res = activeDraftId
          ? await api.patch(`/projects/drafts/${activeDraftId}`, payloadToSave)
          : await api.post("/projects/drafts", payloadToSave);

        const saved = asRecord(res);
        const resolvedId = saved?.id || activeDraftId;

        if (resolvedId && resolvedId !== draftId) {
          setDraftId(resolvedId);
          const routeStep = getStepName(getStepNumber(String(payloadToSave.currentStep).toLowerCase()));
          window.history.replaceState(
            null,
            "",
            `/projects/new?draft=${resolvedId}&step=${routeStep}`,
          );
        }

        lastSavedPayloadRef.current = JSON.stringify(payloadToSave);
        setSaveStatus("saved");
        setLastSavedTime(new Date());
        queryClient.invalidateQueries({ queryKey: ["projects", "drafts"] });
        return resolvedId;
      } catch (err) {
        console.error("Autosave error:", err);
        setSaveStatus("error");
        if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = setTimeout(() => {
          performSaveDraft(payloadToSave, activeDraftId);
        }, 3000);
        return null;
      }
    },
    [draftId, queryClient],
  );

  useEffect(() => () => {
    if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
  }, []);

  // Debounced Autosave Effect
  useEffect(() => {
    if (mode !== "create" || !isHydrated) return;

    const payloadString = JSON.stringify(currentPayload);
    if (payloadString === lastSavedPayloadRef.current) return;

    // Do not create a draft on an empty blank form until user starts typing
    const hasMeaningfulContent =
      currentPayload.name.length > 0 ||
      currentPayload.description.length > 0 ||
      currentPayload.selectedMemberIds.length > 0 ||
      Boolean(currentPayload.targetDate);

    if (!hasMeaningfulContent && !draftId) return;

    setSaveStatus("saving");

    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
    }

    autosaveTimeoutRef.current = setTimeout(() => {
      performSaveDraft(currentPayload);
    }, 700);

    return () => {
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
      }
    };
  }, [currentPayload, mode, isHydrated, draftId, performSaveDraft]);

  // Step switching helper
  const goToStep = async (newStep: number) => {
    setError(null);
    if (newStep > step) {
      if (step === 1 && !name.trim()) {
        setError("Product name is required.");
        return;
      }
      if (step === 3 && !developmentEnabled && !marketingEnabled) {
        setError("Enable at least one Product workstream.");
        return;
      }
      if (step === 3 && marketingEnabled && !targetDate) {
        setError("Target Delivery Date is required when Marketing & Launch is enabled.");
        return;
      }
    }

    setStep(newStep);
    const newStepName = getStepName(newStep);
    const newStepEnum = getStepEnum(newStep);

    if (mode === "create") {
      if (draftId) {
        window.history.replaceState(
          null,
          "",
          `/projects/new?draft=${draftId}&step=${newStepName}`,
        );
      }
      // Flush save with updated currentStep
      const payloadWithNewStep = { ...currentPayload, currentStep: newStepEnum };
      performSaveDraft(payloadWithNewStep);
    }
  };

  // Handle Save & Exit
  const handleSaveAndExit = async () => {
    if (mode === "create") {
      const hasMeaningfulContent =
        name.trim().length > 0 ||
        description.trim().length > 0 ||
        selectedMemberIds.length > 0 ||
        targetDate.length > 0;
      if (!hasMeaningfulContent && !draftId) {
        router.push("/projects");
        return;
      }
      await performSaveDraft(currentPayload);
    }
    router.push("/projects");
  };

  // Edit Mode Save Mutation
  const editSaveMutation = useMutation({
    mutationFn: async () => {
      return api.patch(`/projects/${projectId}`, {
        name: name.trim(),
        description: description.trim() || undefined,
        targetMarket: targetMarket.trim() || undefined,
        targetLanguage: targetLanguage.trim() || undefined,
        productType,
        startDate: startDate ? new Date(startDate).toISOString() : undefined,
        targetDate: targetDate ? new Date(targetDate).toISOString() : undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      router.push(`/projects/${projectId}?updated=1`);
    },
    onError: (err: any) =>
      setError(err.message || "Project could not be saved."),
  });

  // Activate / Create Mutation
  const handleCreateProduct = async () => {
    setError(null);
    if (!name.trim()) {
      setError("Product name is required.");
      setStep(1);
      return;
    }
    if (marketingEnabled && !targetDate) {
      setError("Target Delivery Date is required when Marketing & Launch is enabled.");
      setStep(1);
      return;
    }
    if (!developmentEnabled && !marketingEnabled) {
      setError("Enable at least one Product workstream.");
      setStep(3);
      return;
    }

    setIsActivating(true);

    try {
      // 1. Ensure draft is up to date and we have a draftId
      let activeDraftId = draftId;
      if (!activeDraftId) {
        activeDraftId = await performSaveDraft({ ...currentPayload, currentStep: "REVIEW" });
      } else {
        await performSaveDraft({ ...currentPayload, currentStep: "REVIEW" }, activeDraftId);
      }

      if (!activeDraftId) {
        throw new Error("Could not save product draft before activation.");
      }

      // 2. Call activate endpoint
      const activateRes = await api.post(`/projects/drafts/${activeDraftId}/activate`, {});
      const activateData = asRecord(activateRes);

      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["projects", "drafts"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["reports"] });

      const finalProjectId = activateData?.project?.id || activeDraftId;
      router.push(`/projects/${finalProjectId}/setup`);
    } catch (err: any) {
      console.error("Product activation failed:", err);
      setError(err.message || "Failed to activate product.");
      setIsActivating(false);
    }
  };

  const toggleMember = (userId: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "edit") {
      editSaveMutation.mutate();
    } else {
      if (step < 4) {
        goToStep(step + 1);
      } else {
        handleCreateProduct();
      }
    }
  };

  // Header Status Element
  const headerStatusElement = useMemo(() => {
    if (mode !== "create") return null;

    return (
      <div className="flex items-center gap-2 mt-1">
        <span className="rounded bg-[#F3F5F7] px-2 py-0.5 text-[10px] font-semibold text-[#60666F] border border-[#E0E4E9]">
          DRAFT
        </span>
        <span className="text-[#8B929B] text-xs">·</span>
        {saveStatus === "saving" && (
          <span className="flex items-center gap-1.5 text-[11px] text-[#60666F]">
            <Loader2 className="h-3 w-3 animate-spin text-[#2563EB]" />
            Saving draft...
          </span>
        )}
        {saveStatus === "saved" && (
          <span className="flex items-center gap-1.5 text-[11px] text-[#16A34A]">
            <Check className="h-3 w-3" />
            Autosaved{lastSavedTime ? ` · ${lastSavedTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}
          </span>
        )}
        {saveStatus === "error" && (
          <span className="flex items-center gap-1.5 text-[11px] text-red-600">
            <AlertCircle className="h-3 w-3" />
            Draft could not be saved.
            <button
              type="button"
              className="font-semibold underline underline-offset-2"
              onClick={() => performSaveDraft(currentPayload)}
            >
              Retry
            </button>
          </span>
        )}
        {saveStatus === "idle" && (
          <span className="text-[11px] text-[#8B929B]">
            Autosave enabled
          </span>
        )}
      </div>
    );
  }, [mode, saveStatus, lastSavedTime, performSaveDraft, currentPayload]);

  return (
    <AppShell>
      <form id="project-form" onSubmit={handleSubmit}>
        <FormPageLayout
          title={
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span>{mode === "create" ? (name.trim() || "New Product") : "Edit Product"}</span>
              </div>
              {headerStatusElement}
            </div>
          }
          description={
            mode === "create"
              ? "Drafts autosave continuously and can be resumed at any time without creating incomplete records."
              : "Update product details without changing the team assignment workflow."
          }
          breadcrumbs={[
            { label: "Products", href: "/projects" },
            ...(mode === "edit" && projectId
              ? [
                  {
                    label: project.name || "Product",
                    href: `/projects/${projectId}`,
                  },
                ]
              : []),
            { label: mode === "create" ? "New Product" : "Edit" },
          ]}
          footer={
            <>
              {mode === "create" ? (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleSaveAndExit}
                    className="text-[#60666F] hover:text-[#17191C]"
                  >
                    Save & Exit
                  </Button>
                  {step > 1 && (
                    <Button
                      type="button"
                      variant="secondary"
                      leftIcon={<ArrowLeft className="h-3.5 w-3.5" />}
                      onClick={() => goToStep(step - 1)}
                    >
                      Back
                    </Button>
                  )}
                  {step < 4 ? (
                    <Button
                      type="button"
                      variant="primary"
                      rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
                      onClick={() => goToStep(step + 1)}
                    >
                      Continue
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="primary"
                      loading={isActivating}
                      onClick={handleCreateProduct}
                    >
                      Create Product
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <Link href={`/projects/${projectId}`}>
                    <Button type="button" variant="secondary">
                      Cancel
                    </Button>
                  </Link>
                  <Button type="submit" loading={editSaveMutation.isPending}>
                    Save Changes
                  </Button>
                </>
              )}
            </>
          }
        >
          {/* Continuous Stepper Header */}
          {mode === "create" && (
            <div className="grid grid-cols-4 border-b border-fx-border text-[11px] bg-white rounded-t-lg overflow-hidden border border-fx-border">
              {[
                { label: "Details", stepNum: 1 },
                { label: "Team", stepNum: 2 },
                { label: "Workstreams", stepNum: 3 },
                { label: "Review", stepNum: 4 },
              ].map(({ label, stepNum }) => {
                const isActive = step === stepNum;
                const isPassed = step > stepNum;
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => goToStep(stepNum)}
                    className={cn(
                      "flex items-center justify-center gap-1.5 py-2.5 px-2 text-center transition-colors border-b-2",
                      isActive
                        ? "border-[#2563EB] font-semibold text-[#245EC7] bg-[#EEF4FF]/30"
                        : isPassed
                        ? "border-transparent text-[#17191C] hover:text-[#2563EB] hover:bg-slate-50"
                        : "border-transparent text-fx-text-muted hover:text-fx-text-secondary",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-4 w-4 items-center justify-center rounded-full text-[10px]",
                        isActive
                          ? "bg-[#2563EB] text-white"
                          : isPassed
                          ? "bg-emerald-100 text-emerald-700 font-semibold"
                          : "bg-slate-100 text-fx-text-muted",
                      )}
                    >
                      {isPassed ? <Check className="h-2.5 w-2.5" /> : stepNum}
                    </span>
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-800 flex gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: PRODUCT DETAILS & SCHEDULE */}
          {(mode === "edit" || step === 1) && (
            <>
              <section className="bg-white border border-fx-border rounded-lg p-4 space-y-4">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-fx-text-secondary">
                  Product Details
                </h2>
                <div className="grid gap-3">
                  <div>
                    <label className="block text-xs font-medium text-fx-text-primary mb-1">
                      Product Name *
                    </label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. FutureX Combat Royale"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-fx-text-primary mb-2">
                    Product Type
                  </label>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {[
                      {
                        value: ProductType.GAME,
                        label: "Game",
                        note: "Gameplay, assets, release flow",
                      },
                      {
                        value: ProductType.APP,
                        label: "App",
                        note: "Screens, API, monetization",
                      },
                      {
                        value: ProductType.WEBSITE_TOOL,
                        label: "Website / Tool",
                        note: "Web workflow and launch",
                      },
                    ].map((option) => {
                      const selected = productType === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setProductType(option.value)}
                          className={cn(
                            "rounded-lg border p-3 text-left fx-transition",
                            selected
                              ? "border-[#2563EB] bg-[#EEF4FF] text-[#181B20]"
                              : "border-fx-border bg-white text-fx-text-secondary hover:bg-fx-bg-hover",
                          )}
                        >
                          <span className="block text-xs font-semibold">
                            {option.label}
                          </span>
                          <span className="mt-1 block text-[11px] text-fx-text-muted">
                            {option.note}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-fx-text-primary mb-1">
                      Target Market
                    </label>
                    <Input
                      value={targetMarket}
                      onChange={(e) => setTargetMarket(e.target.value)}
                      placeholder="e.g. Global, Sri Lanka"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-fx-text-primary mb-1">
                      Target Language
                    </label>
                    <Input
                      value={targetLanguage}
                      onChange={(e) => setTargetLanguage(e.target.value)}
                      placeholder="e.g. English, Sinhala"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-fx-text-primary mb-1">
                    Description
                  </label>
                  <textarea
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full rounded-md border border-fx-border bg-white p-3 text-xs text-fx-text-primary focus:border-[#2563EB] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                    placeholder="Scope, release target, and important production notes."
                  />
                </div>
              </section>

              <section className="bg-white border border-fx-border rounded-lg p-4 space-y-4">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-fx-text-secondary">
                  Schedule
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
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
                      Target Delivery Date {marketingEnabled && <span className="text-[#2563EB]">*</span>}
                    </label>
                    <Input
                      type="date"
                      value={targetDate}
                      onChange={(e) => setTargetDate(e.target.value)}
                    />
                    {marketingEnabled && !targetDate && (
                      <span className="text-[11px] text-[#9A6515] mt-1 block">
                        Required for Marketing buzz calendar calculation
                      </span>
                    )}
                  </div>
                </div>
              </section>
            </>
          )}

          {/* STEP 2: TEAM MEMBERS */}
          {mode === "create" && step === 2 && (
            <section className="bg-white border border-fx-border rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-fx-text-secondary">
                    Product Team
                  </h2>
                  <p className="text-[11px] text-fx-text-muted mt-0.5">
                    Assign members who will execute tasks in this workspace.
                  </p>
                </div>
                <span className="text-xs font-medium rounded-full bg-[#EEF4FF] px-2.5 py-0.5 text-[#2563EB]">
                  {selectedMemberIds.length} Selected
                </span>
              </div>

              {selectedMemberIds.length > 0 && (
                <div className="flex flex-wrap gap-2 p-3 bg-[#F8F9FB] rounded-lg border border-fx-border/60">
                  {selectedMemberIds.map((id) => {
                    const emp = employees.find((u) => u.id === id);
                    if (!emp) return null;
                    const assignedRoles = projectRoles[id] || [];
                    return (
                      <div
                        key={id}
                        className="flex flex-col gap-1.5 rounded-md border border-fx-border bg-white p-2 text-[11px] max-w-xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-fx-text-primary">
                            {emp.firstName} {emp.lastName}
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleMember(id)}
                            className="text-fx-text-muted hover:text-red-700"
                            title="Remove member"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <span className="text-[10px] text-fx-text-muted">
                          {assignedRoles.length} Project Roles Selected
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {(emp.functionalRoles || []).map((role: any) => (
                            <label
                              key={role.id}
                              className="flex items-center gap-1 rounded border border-fx-border bg-[#F8F9FB] px-1.5 py-0.5 text-[10px] cursor-pointer hover:bg-white"
                            >
                              <input
                                type="checkbox"
                                checked={assignedRoles.includes(role.id)}
                                onChange={(event) =>
                                  setProjectRoles((current) => ({
                                    ...current,
                                    [id]: event.target.checked
                                      ? [...(current[id] || []), role.id]
                                      : (current[id] || []).filter(
                                          (item) => item !== role.id,
                                        ),
                                  }))
                                }
                              />
                              {role.name}
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fx-text-muted" />
                <input
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder="Search members by name, email, or job role..."
                  className="w-full rounded-md border border-fx-border bg-white py-2 pl-8 pr-3 text-xs focus:border-[#2563EB] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                />
              </div>

              <div className="max-h-72 overflow-y-auto rounded-lg border border-fx-border divide-y divide-fx-border/60">
                {usersLoading ? (
                  <p className="p-4 text-center text-xs text-fx-text-muted">
                    Loading team members...
                  </p>
                ) : filteredEmployees.length === 0 ? (
                  <p className="p-4 text-center text-xs text-fx-text-muted">
                    No active team members found.
                  </p>
                ) : (
                  filteredEmployees.map((emp) => {
                    const selected = selectedMemberIds.includes(emp.id);
                    return (
                      <button
                        type="button"
                        key={emp.id}
                        onClick={() => {
                          toggleMember(emp.id);
                          if (!selected) {
                            setProjectRoles((current) => ({
                              ...current,
                              [emp.id]: (emp.functionalRoles || []).map(
                                (role: any) => role.id,
                              ),
                            }));
                          }
                        }}
                        className={cn(
                          "flex w-full items-center justify-between gap-3 p-3 text-left text-xs hover:bg-fx-bg-hover transition-colors",
                          selected && "bg-[#EEF4FF]/50",
                        )}
                      >
                        <div>
                          <span className="block font-semibold text-fx-text-primary">
                            {emp.firstName} {emp.lastName}
                          </span>
                          <span className="block text-[11px] text-fx-text-muted mt-0.5">
                            {emp.jobTitle || "Team Member"} ·{" "}
                            {(emp.functionalRoles || [])
                              .map((role: any) => role.name)
                              .join(" · ") || "No Functional Roles"}
                          </span>
                        </div>
                        {selected && (
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#2563EB] text-white">
                            <Check className="h-3 w-3" />
                          </div>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </section>
          )}

          {/* STEP 3: WORKSTREAMS */}
          {mode === "create" && step === 3 && (
            <section className="space-y-4">
              <div className="bg-white border border-fx-border rounded-lg p-4 space-y-3">
                <div>
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-fx-text-secondary">
                    Product Workstreams
                  </h2>
                  <p className="text-[11px] text-fx-text-muted mt-0.5">
                    Select the execution frameworks to activate for this product.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setDevelopmentEnabled((value) => !value)}
                  className={cn(
                    "flex w-full items-start gap-3.5 rounded-lg border p-4 text-left transition-colors",
                    developmentEnabled
                      ? "border-[#2563EB] bg-[#F7FAFF]"
                      : "border-fx-border bg-white hover:bg-slate-50",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border",
                      developmentEnabled
                        ? "border-[#2563EB] bg-[#2563EB] text-white"
                        : "border-fx-border bg-white",
                    )}
                  >
                    {developmentEnabled && <Check className="h-3.5 w-3.5" />}
                  </span>
                  <Code2 className="h-5 w-5 text-[#60666F] shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-sm font-semibold text-fx-text-primary">
                      Development Workstream
                    </strong>
                    <span className="mt-1 block text-xs text-fx-text-muted">
                      FutureX Development Checklist · 46 standard items across Concept,
                      Core Mechanics, Production, Testing, and Release. Generated unassigned.
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setMarketingEnabled((value) => !value)}
                  className={cn(
                    "flex w-full items-start gap-3.5 rounded-lg border p-4 text-left transition-colors",
                    marketingEnabled
                      ? "border-[#2563EB] bg-[#F7FAFF]"
                      : "border-fx-border bg-white hover:bg-slate-50",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border",
                      marketingEnabled
                        ? "border-[#2563EB] bg-[#2563EB] text-white"
                        : "border-fx-border bg-white",
                    )}
                  >
                    {marketingEnabled && <Check className="h-3.5 w-3.5" />}
                  </span>
                  <Megaphone className="h-5 w-5 text-[#60666F] shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-sm font-semibold text-fx-text-primary">
                      Marketing & Launch Workstream
                    </strong>
                    <span className="mt-1 block text-xs text-fx-text-muted">
                      Digital presence, channel registry, content bank, buzz schedule,
                      marketing gates, and final release sign-off items.
                    </span>
                  </div>
                </button>

                {marketingEnabled && !targetDate && (
                  <div className="rounded border border-amber-200 bg-amber-50 p-2.5 text-xs text-[#9A6515] flex gap-2 items-center">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>
                      Target Delivery Date is required to schedule Marketing Buzz activities.{" "}
                      <button
                        type="button"
                        className="underline font-semibold"
                        onClick={() => goToStep(1)}
                      >
                        Set date in Step 1
                      </button>
                    </span>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* STEP 4: INTEGRATED REVIEW FLOW */}
          {mode === "create" && step === 4 && (
            <section className="space-y-4">
              {/* Review Card 1: Details & Schedule */}
              <div className="bg-white border border-fx-border rounded-lg p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-fx-border pb-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-fx-text-secondary">
                      1. Product Details & Schedule
                    </h3>
                    <span className="rounded bg-[#EEF4FF] px-2 py-0.5 text-[10px] font-semibold text-[#2563EB]">
                      {productType}
                    </span>
                  </div>
                  <Button
                    type="button"
                    size="xs"
                    variant="ghost"
                    leftIcon={<Edit2 className="h-3 w-3" />}
                    onClick={() => goToStep(1)}
                  >
                    Edit
                  </Button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 text-xs">
                  <div>
                    <span className="text-[11px] text-fx-text-muted block">Product Name</span>
                    <span className="font-semibold text-sm text-fx-text-primary">
                      {name.trim() || "Untitled"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-fx-text-muted block">Target Delivery</span>
                    <span className="font-medium text-fx-text-primary">
                      {targetDate ? formatDate(targetDate) : "Not scheduled"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-fx-text-muted block">Target Market</span>
                    <span className="text-fx-text-primary">
                      {targetMarket || "Not specified"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-fx-text-muted block">Target Language</span>
                    <span className="text-fx-text-primary">
                      {targetLanguage || "Not specified"}
                    </span>
                  </div>
                  {description && (
                    <div className="sm:col-span-2">
                      <span className="text-[11px] text-fx-text-muted block">Description</span>
                      <p className="mt-0.5 text-xs text-fx-text-secondary whitespace-pre-line">
                        {description}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Review Card 2: Team Members */}
              <div className="bg-white border border-fx-border rounded-lg p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-fx-border pb-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-fx-text-secondary">
                      2. Product Team
                    </h3>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-fx-text-secondary">
                      {selectedMemberIds.length} Members
                    </span>
                  </div>
                  <Button
                    type="button"
                    size="xs"
                    variant="ghost"
                    leftIcon={<Edit2 className="h-3 w-3" />}
                    onClick={() => goToStep(2)}
                  >
                    Edit
                  </Button>
                </div>

                {selectedMemberIds.length === 0 ? (
                  <p className="text-xs text-fx-text-muted">
                    No team members selected. You can assign members later in Product Setup.
                  </p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {selectedMemberIds.map((id) => {
                      const emp = employees.find((u) => u.id === id);
                      if (!emp) return null;
                      const roles = (emp.functionalRoles || []).filter((r: any) =>
                        (projectRoles[id] || []).includes(r.id),
                      );
                      return (
                        <div
                          key={id}
                          className="flex items-center justify-between p-2.5 rounded border border-fx-border bg-[#F8F9FB] text-xs"
                        >
                          <div>
                            <span className="font-medium text-fx-text-primary block">
                              {emp.firstName} {emp.lastName}
                            </span>
                            <span className="text-[11px] text-fx-text-muted">
                              {emp.jobTitle || "Team Member"}
                            </span>
                          </div>
                          <span className="text-[10px] text-[#2563EB] bg-white border px-1.5 py-0.5 rounded">
                            {roles.length} roles
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Review Card 3: Workstreams */}
              <div className="bg-white border border-fx-border rounded-lg p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-fx-border pb-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-fx-text-secondary">
                    3. Workstreams & Deliverables
                  </h3>
                  <Button
                    type="button"
                    size="xs"
                    variant="ghost"
                    leftIcon={<Edit2 className="h-3 w-3" />}
                    onClick={() => goToStep(3)}
                  >
                    Edit
                  </Button>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between p-3 rounded border border-fx-border">
                    <div className="flex items-center gap-2.5">
                      <Code2 className="h-4 w-4 text-[#60666F]" />
                      <div>
                        <span className="font-semibold block">Development Workstream</span>
                        <span className="text-[11px] text-fx-text-muted">
                          Standard checklist (46 items) generated unassigned
                        </span>
                      </div>
                    </div>
                    <span
                      className={cn(
                        "rounded px-2 py-0.5 text-[10px] font-semibold",
                        developmentEnabled
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-slate-100 text-slate-500",
                      )}
                    >
                      {developmentEnabled ? "ENABLED" : "DISABLED"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded border border-fx-border">
                    <div className="flex items-center gap-2.5">
                      <Megaphone className="h-4 w-4 text-[#60666F]" />
                      <div>
                        <span className="font-semibold block">Marketing & Launch</span>
                        <span className="text-[11px] text-fx-text-muted">
                          Channels, content bank, buzz calendar & sign-off
                        </span>
                      </div>
                    </div>
                    <span
                      className={cn(
                        "rounded px-2 py-0.5 text-[10px] font-semibold",
                        marketingEnabled
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-slate-100 text-slate-500",
                      )}
                    >
                      {marketingEnabled ? "ENABLED" : "DISABLED"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Ready Notice */}
              <div className="rounded-lg border border-[#2563EB]/20 bg-[#EEF4FF]/40 p-4 text-xs text-[#245EC7] flex gap-3">
                <Check className="h-4 w-4 shrink-0 mt-0.5 text-[#2563EB]" />
                <div>
                  <strong className="block font-semibold">Ready for Activation</strong>
                  <p className="mt-0.5 text-[11px] text-[#42649C]">
                    Clicking <strong>Create Product</strong> activates the product in a single transaction,
                    generates execution workstreams, notifies selected team members, and redirects to Product Setup.
                  </p>
                </div>
              </div>
            </section>
          )}
        </FormPageLayout>
      </form>
    </AppShell>
  );
}
