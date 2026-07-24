"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  FORM_STEPS,
  RASHI_OPTIONS,
  portfolioDataSchema,
  type PortfolioData,
  type FormStepKey,
  type Portfolio,
} from "@/types/portfolio";
import {
  User,
  Heart,
  Star,
  GraduationCap,
  Briefcase,
  Users,
  Music,
  Phone,
  Palette,
  ChevronLeft,
  ChevronRight,
  Check,
  Loader2,
  Upload,
  X,
  AlertCircle,
} from "lucide-react";
import {
  getDefaultRashiPalette,
  getRashiPalette,
  getRashiPalettes,
  type RashiPalette,
} from "@/features/portfolio/rashi-theme";
import { RashiPalettePicker } from "@/components/portfolio/RashiPalettePicker";

const STEP_ICONS: Record<string, React.ElementType> = {
  User, Heart, Star, GraduationCap, Briefcase, Users, Music, Phone, Palette,
};

// Map Zod error paths to step indexes
const PATH_TO_STEP: Record<string, number> = {
  personal: 0, vitals: 1, astrology: 2, education: 3,
  career: 4, family: 5, lifestyle: 6, contact: 7, style: 8,
};

interface Props {
  portfolio: Portfolio | null;
}

const EMPTY_DATA: PortfolioData = {
  personal: { name: "", dob: "", gender: "male" },
  vitals: {},
  astrology: {},
  education: {},
  career: {},
  family: {},
  lifestyle: {},
  contact: {},
  style: { template_name: "Royal Heritage" },
};

export default function EditWizard({ portfolio }: Props) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<PortfolioData>(
    (portfolio?.draft_data as PortfolioData) || EMPTY_DATA
  );
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const publishingRef = useRef(false);
  const router = useRouter();

  const currentStep = FORM_STEPS[step];
  const isLastStep = step === FORM_STEPS.length - 1;

  // Auto-save with debounce
  const autoSave = useCallback(
    async (newData: PortfolioData) => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

      saveTimeoutRef.current = setTimeout(async () => {
        setSaving(true);
        setSaveError(null);
        try {
          const response = await fetch("/api/dashboard", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ data: newData }),
          });
          if (response.status === 401) {
            setSaving(false);
            router.push("/login?error=session_expired");
            return;
          }

          if (!response.ok) {
            setSaveError("Save failed — will retry");
            setSaving(false);
            return;
          }

          setSaving(false);
          setLastSaved(new Date());
        } catch {
          setSaveError("Save failed — check your connection");
          setSaving(false);
        }
      }, 1000);
    },
    [router]
  );

  function updateSection(key: FormStepKey, sectionData: Record<string, unknown>) {
    const newData = { ...data, [key]: sectionData };
    setData(newData);
    // Clear validation errors for this section
    setValidationErrors((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((k) => {
        if (k.startsWith(key + ".") || k === key) delete next[k];
      });
      return next;
    });
    autoSave(newData);
  }

  async function handlePublish() {
    if (publishingRef.current) return;

    // Validate with Zod
    const result = portfolioDataSchema.safeParse(data);
    if (!result.success) {
      const errors: Record<string, string> = {};
      let firstStepIndex = 9;
      for (const issue of result.error.issues) {
        const path = issue.path.join(".");
        errors[path] = issue.message;
        const stepKey = issue.path[0] as string;
        const stepIdx = PATH_TO_STEP[stepKey] ?? 9;
        if (stepIdx < firstStepIndex) firstStepIndex = stepIdx;
      }
      setValidationErrors(errors);
      if (firstStepIndex < 9) setStep(firstStepIndex);
      return;
    }

    publishingRef.current = true;
    setPublishing(true);

    try {
      const response = await fetch("/api/portfolio/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data }),
      });
      publishingRef.current = false;
      if (response.status === 401) {
        setPublishing(false);
        router.push("/login?error=session_expired");
        return;
      }
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        setPublishing(false);
        setValidationErrors({ _publish: `Publish failed: ${body?.error || "Try again."}` });
        return;
      }
      setPublishing(false);
      router.push("/dashboard");
    } catch {
      publishingRef.current = false;
      setPublishing(false);
      setValidationErrors({ _publish: "Publish failed: Check your connection and try again." });
    }
  }

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  // Get errors for current step
  const currentStepErrors = Object.entries(validationErrors).filter(
    ([key]) => key.startsWith(currentStep.key + ".") || key === currentStep.key
  );

  return (
    <div className="flex flex-1 flex-col">
      {/* Progress bar */}
      <div className="border-b border-border">
        <div className="mx-auto max-w-3xl px-4 py-3">
          <div className="flex items-center justify-between">
            {FORM_STEPS.map((s, i) => {
              const Icon = STEP_ICONS[s.icon];
              const isActive = i === step;
              const isDone = i < step;
              const hasError = Object.keys(validationErrors).some(
                (k) => k.startsWith(s.key + ".") || k === s.key
              );
              return (
                <button
                  key={s.key}
                  onClick={() => setStep(i)}
                  className={`flex flex-col items-center gap-1 transition-colors ${
                    hasError
                      ? "text-destructive"
                      : isActive
                        ? "text-foreground"
                        : isDone
                          ? "text-green-600"
                          : "text-muted-foreground"
                  }`}
                >
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors ${
                      hasError
                        ? "border-destructive bg-destructive text-white"
                        : isActive
                          ? "border-foreground bg-foreground text-background"
                          : isDone
                            ? "border-green-600 bg-green-600 text-white"
                            : "border-border"
                    }`}
                  >
                    {hasError ? (
                      <AlertCircle className="h-4 w-4" />
                    ) : isDone ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                  </div>
                  <span className="hidden text-[10px] font-medium sm:block">
                    {s.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Progress bar */}
          <div className="mt-3 h-1 w-full rounded-full bg-muted">
            <div
              className="h-1 rounded-full bg-foreground transition-all duration-300"
              style={{
                width: `${((step + 1) / FORM_STEPS.length) * 100}%`,
              }}
            />
          </div>

          {/* Mobile step label */}
          <p className="text-xs text-muted-foreground sm:hidden mt-2">
            Step {step + 1} of {FORM_STEPS.length}: {currentStep.label}
          </p>
        </div>
      </div>

      {/* Form content */}
      <main className="flex-1 px-4 py-6">
        <div className="mx-auto max-w-lg">
          <h2 className="text-xl font-semibold">{currentStep.label}</h2>

          {/* Save status */}
          <div className="mt-1 flex items-center gap-2 text-xs">
            {saving ? (
              <span className="flex items-center gap-1 text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Saving...
              </span>
            ) : saveError ? (
              <span className="flex items-center gap-1 text-destructive">
                <AlertCircle className="h-3 w-3" />
                {saveError}
              </span>
            ) : lastSaved ? (
              <span className="flex items-center gap-1 text-muted-foreground">
                <Check className="h-3 w-3" />
                Saved
              </span>
            ) : null}
          </div>

          {/* Validation errors for current step */}
          {currentStepErrors.length > 0 && (
            <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2">
              {currentStepErrors.map(([path, msg]) => (
                <p key={path} className="text-xs text-destructive">
                  {msg}
                </p>
              ))}
            </div>
          )}

          {/* Publish error */}
          {validationErrors._publish && (
            <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2">
              <p className="text-xs text-destructive">
                {validationErrors._publish}
              </p>
            </div>
          )}

          <div className="mt-6">
            <StepForm
              stepKey={currentStep.key}
              data={data}
              errors={validationErrors}
              onUpdate={updateSection}
            />
          </div>
        </div>
      </main>

      {/* Navigation */}
      <div className="border-t border-border px-4 py-4">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <button
            onClick={() => setStep(Math.max(0, step - 1))}
            disabled={step === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>

          <div className="flex gap-2">
            {isLastStep ? (
              <button
                onClick={handlePublish}
                disabled={publishing}
                className="inline-flex items-center gap-2 rounded-lg bg-foreground px-6 py-2.5 text-sm font-medium text-background transition-colors hover:bg-foreground/90 disabled:opacity-50"
              >
                {publishing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                Publish
              </button>
            ) : (
              <button
                onClick={() => setStep(Math.min(FORM_STEPS.length - 1, step + 1))}
                className="inline-flex items-center gap-1.5 rounded-lg bg-foreground px-4 py-2.5 text-sm font-medium text-background transition-colors hover:bg-foreground/90"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Step Forms ---

function StepForm({
  stepKey,
  data,
  errors,
  onUpdate,
}: {
  stepKey: FormStepKey;
  data: PortfolioData;
  errors: Record<string, string>;
  onUpdate: (key: FormStepKey, data: Record<string, unknown>) => void;
}) {
  const stepErrors = Object.fromEntries(
    Object.entries(errors)
      .filter(([k]) => k.startsWith(stepKey + "."))
      .map(([k, v]) => [k.replace(stepKey + ".", ""), v])
  );

  switch (stepKey) {
    case "personal":
      return <PersonalForm data={data.personal} errors={stepErrors} onUpdate={(d) => onUpdate("personal", d)} />;
    case "vitals":
      return <VitalsForm data={data.vitals || {}} onUpdate={(d) => onUpdate("vitals", d)} />;
    case "astrology":
      return <AstrologyForm data={data.astrology || {}} onUpdate={(d) => onUpdate("astrology", d)} />;
    case "education":
      return <EducationForm data={data.education || {}} onUpdate={(d) => onUpdate("education", d)} />;
    case "career":
      return <CareerForm data={data.career || {}} onUpdate={(d) => onUpdate("career", d)} />;
    case "family":
      return <FamilyForm data={data.family || {}} onUpdate={(d) => onUpdate("family", d)} />;
    case "lifestyle":
      return <LifestyleForm data={data.lifestyle || {}} onUpdate={(d) => onUpdate("lifestyle", d)} />;
    case "contact":
      return <ContactForm data={data.contact || {}} errors={stepErrors} onUpdate={(d) => onUpdate("contact", d)} />;
    case "style":
      return <StyleForm data={data.style || {}} rashi={data.astrology?.rashi} onUpdate={(d) => onUpdate("style", d)} />;
  }
}

// --- Input helpers ---

function FormField({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function Input({
  value,
  onChange,
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> & {
  value: string;
  onChange: (val: string) => void;
}) {
  return (
    <input
      {...props}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
    />
  );
}

function Select({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

// --- Individual Step Forms ---

function PersonalForm({
  data,
  errors,
  onUpdate,
}: {
  data: Record<string, unknown>;
  errors: Record<string, string>;
  onUpdate: (d: Record<string, unknown>) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const update = (field: string, value: unknown) => onUpdate({ ...data, [field]: value });

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError("");

    const formData = new FormData();
    formData.append("photo", file);

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const result = await res.json();

      if (!res.ok) {
        setUploadError(result.error || "Upload failed");
      } else {
        onUpdate({
          ...data,
          photo_url: result.photo_url,
          photo_thumb_url: result.photo_thumb_url,
        });
      }
    } catch {
      setUploadError("Upload failed — check your connection");
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removePhoto() {
    onUpdate({ ...data, photo_url: undefined, photo_thumb_url: undefined });
  }

  const photoUrl = data.photo_url as string | undefined;

  return (
    <div className="flex flex-col gap-4">
      {/* Photo upload */}
      <FormField label="Photo">
        <div className="flex items-center gap-4">
          {photoUrl ? (
            <div className="relative">
              <Image
                src={photoUrl}
                alt="Profile"
                width={80}
                height={80}
                className="h-20 w-20 rounded-full object-cover"
              />
              <button
                type="button"
                onClick={removePhoto}
                className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-white"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
              <User className="h-8 w-8 text-muted-foreground" />
            </div>
          )}
          <div className="flex flex-col gap-1">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50"
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {photoUrl ? "Change photo" : "Upload photo"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
            />
            <span className="text-xs text-muted-foreground">Max 10MB</span>
          </div>
        </div>
        {uploadError && (
          <p className="text-xs text-destructive mt-1">{uploadError}</p>
        )}
      </FormField>

      <FormField label="Full Name" required error={errors.name}>
        <Input value={(data.name as string) || ""} onChange={(v) => update("name", v)} placeholder="Enter full name" />
      </FormField>
      <FormField label="Date of Birth" required error={errors.dob}>
        <Input value={(data.dob as string) || ""} onChange={(v) => update("dob", v)} type="date" />
      </FormField>
      <FormField label="Place of Birth">
        <Input value={(data.place_of_birth as string) || ""} onChange={(v) => update("place_of_birth", v)} placeholder="City, State" />
      </FormField>
      <FormField label="Gender" required>
        <Select
          value={(data.gender as string) || "male"}
          onChange={(v) => update("gender", v)}
          options={[
            { value: "male", label: "Male" },
            { value: "female", label: "Female" },
          ]}
        />
      </FormField>
    </div>
  );
}

function VitalsForm({
  data,
  onUpdate,
}: {
  data: Record<string, unknown>;
  onUpdate: (d: Record<string, unknown>) => void;
}) {
  const update = (field: string, value: unknown) => onUpdate({ ...data, [field]: value });

  return (
    <div className="flex flex-col gap-4">
      <FormField label="Height">
        <Input value={(data.height as string) || ""} onChange={(v) => update("height", v)} placeholder="e.g., 5'8&quot;" />
      </FormField>
      <FormField label="Complexion">
        <Input value={(data.complexion as string) || ""} onChange={(v) => update("complexion", v)} placeholder="e.g., Fair, Wheatish" />
      </FormField>
      <FormField label="Gotra">
        <Input value={(data.gotra as string) || ""} onChange={(v) => update("gotra", v)} placeholder="Family gotra" />
      </FormField>
    </div>
  );
}

function AstrologyForm({
  data,
  onUpdate,
}: {
  data: Record<string, unknown>;
  onUpdate: (d: Record<string, unknown>) => void;
}) {
  const update = (field: string, value: unknown) => onUpdate({ ...data, [field]: value });

  return (
    <div className="flex flex-col gap-4">
      <FormField label="Rashi (Moon Sign)">
        <Select
          value={(data.rashi as string) || ""}
          onChange={(v) => update("rashi", v)}
          placeholder="Select rashi"
          options={RASHI_OPTIONS.map((r) => ({
            value: r.key,
            label: r.label,
          }))}
        />
      </FormField>
      <FormField label="Nakshatra">
        <Input value={(data.nakshatra as string) || ""} onChange={(v) => update("nakshatra", v)} placeholder="e.g., Rohini, Ashwini" />
      </FormField>
      <FormField label="Time of Birth">
        <Input value={(data.time_of_birth as string) || ""} onChange={(v) => update("time_of_birth", v)} type="time" />
      </FormField>
    </div>
  );
}

function EducationForm({
  data,
  onUpdate,
}: {
  data: Record<string, unknown>;
  onUpdate: (d: Record<string, unknown>) => void;
}) {
  const update = (field: string, value: unknown) => onUpdate({ ...data, [field]: value });

  return (
    <div className="flex flex-col gap-4">
      <FormField label="Degree">
        <Input value={(data.degree as string) || ""} onChange={(v) => update("degree", v)} placeholder="e.g., B.Tech, MBA" />
      </FormField>
      <FormField label="Institution">
        <Input value={(data.institution as string) || ""} onChange={(v) => update("institution", v)} placeholder="University / College name" />
      </FormField>
      <FormField label="Year">
        <Input value={(data.year as string) || ""} onChange={(v) => update("year", v)} placeholder="e.g., 2020" />
      </FormField>
    </div>
  );
}

function CareerForm({
  data,
  onUpdate,
}: {
  data: Record<string, unknown>;
  onUpdate: (d: Record<string, unknown>) => void;
}) {
  const update = (field: string, value: unknown) => onUpdate({ ...data, [field]: value });

  return (
    <div className="flex flex-col gap-4">
      <FormField label="Job Title">
        <Input value={(data.title as string) || ""} onChange={(v) => update("title", v)} placeholder="e.g., Software Engineer" />
      </FormField>
      <FormField label="Company">
        <Input value={(data.company as string) || ""} onChange={(v) => update("company", v)} placeholder="Company name" />
      </FormField>
    </div>
  );
}

function FamilyForm({
  data,
  onUpdate,
}: {
  data: Record<string, unknown>;
  onUpdate: (d: Record<string, unknown>) => void;
}) {
  const father = (data.father as Record<string, string>) || {};
  const mother = (data.mother as Record<string, string>) || {};
  const siblings = (data.siblings as Record<string, string>[]) || [];

  function updateFather(field: string, value: string) {
    onUpdate({ ...data, father: { ...father, [field]: value } });
  }
  function updateMother(field: string, value: string) {
    onUpdate({ ...data, mother: { ...mother, [field]: value } });
  }
  function updateSibling(index: number, field: string, value: string) {
    const newSiblings = [...siblings];
    newSiblings[index] = { ...newSiblings[index], [field]: value };
    onUpdate({ ...data, siblings: newSiblings });
  }
  function addSibling() {
    if (siblings.length >= 10) return;
    onUpdate({ ...data, siblings: [...siblings, { name: "", occupation: "" }] });
  }
  function removeSibling(index: number) {
    onUpdate({ ...data, siblings: siblings.filter((_, i) => i !== index) });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <p className="text-sm font-medium text-muted-foreground">Father</p>
        <FormField label="Name">
          <Input value={father.name || ""} onChange={(v) => updateFather("name", v)} placeholder="Father's name" />
        </FormField>
        <FormField label="Occupation">
          <Input value={father.occupation || ""} onChange={(v) => updateFather("occupation", v)} placeholder="Occupation" />
        </FormField>
      </div>

      <div className="flex flex-col gap-4">
        <p className="text-sm font-medium text-muted-foreground">Mother</p>
        <FormField label="Name">
          <Input value={mother.name || ""} onChange={(v) => updateMother("name", v)} placeholder="Mother's name" />
        </FormField>
        <FormField label="Occupation">
          <Input value={mother.occupation || ""} onChange={(v) => updateMother("occupation", v)} placeholder="Occupation" />
        </FormField>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">
            Siblings ({siblings.length}/10)
          </p>
          <button
            type="button"
            onClick={addSibling}
            disabled={siblings.length >= 10}
            className="text-xs font-medium text-foreground underline disabled:opacity-30"
          >
            + Add sibling
          </button>
        </div>
        {siblings.map((s, i) => (
          <div key={i} className="flex flex-col gap-2 rounded-lg border border-border p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Sibling {i + 1}</span>
              <button
                type="button"
                onClick={() => removeSibling(i)}
                className="text-xs text-destructive"
              >
                Remove
              </button>
            </div>
            <Input value={s.name || ""} onChange={(v) => updateSibling(i, "name", v)} placeholder="Name" />
            <Input value={s.occupation || ""} onChange={(v) => updateSibling(i, "occupation", v)} placeholder="Occupation" />
          </div>
        ))}
      </div>
    </div>
  );
}

function LifestyleForm({
  data,
  onUpdate,
}: {
  data: Record<string, unknown>;
  onUpdate: (d: Record<string, unknown>) => void;
}) {
  const update = (field: string, value: unknown) => onUpdate({ ...data, [field]: value });

  return (
    <div className="flex flex-col gap-4">
      <FormField label="Hobbies">
        <Input value={(data.hobbies as string) || ""} onChange={(v) => update("hobbies", v)} placeholder="e.g., Reading, Traveling, Cooking" />
      </FormField>
      <FormField label="Languages">
        <Input value={(data.languages as string) || ""} onChange={(v) => update("languages", v)} placeholder="e.g., Hindi, English, Marathi" />
      </FormField>
      <FormField label="Diet">
        <Input value={(data.diet as string) || ""} onChange={(v) => update("diet", v)} placeholder="e.g., Vegetarian, Non-vegetarian" />
      </FormField>
      <FormField label="Music">
        <Input value={(data.music as string) || ""} onChange={(v) => update("music", v)} placeholder="e.g., Classical, Bollywood" />
      </FormField>
    </div>
  );
}

function ContactForm({
  data,
  errors,
  onUpdate,
}: {
  data: Record<string, unknown>;
  errors: Record<string, string>;
  onUpdate: (d: Record<string, unknown>) => void;
}) {
  const update = (field: string, value: unknown) => onUpdate({ ...data, [field]: value });

  return (
    <div className="flex flex-col gap-4">
      <FormField label="Contact Person">
        <Input value={(data.contact_person as string) || ""} onChange={(v) => update("contact_person", v)} placeholder="e.g., Father's name" />
      </FormField>
      <FormField label="Phone" error={errors.phone}>
        <Input value={(data.phone as string) || ""} onChange={(v) => update("phone", v)} placeholder="+91 XXXXX XXXXX" type="tel" />
      </FormField>
      <FormField label="Email" error={errors.email}>
        <Input value={(data.email as string) || ""} onChange={(v) => update("email", v)} placeholder="email@example.com" type="email" />
      </FormField>
    </div>
  );
}

function StyleForm({
  data,
  rashi,
  onUpdate,
}: {
  data: Record<string, unknown>;
  rashi?: string;
  onUpdate: (d: Record<string, unknown>) => void;
}) {
  const palettes = getRashiPalettes(rashi);
  const selectedPalette = getRashiPalette(data.rashi_palette as string | undefined, rashi);
  const defaultPalette = getDefaultRashiPalette(rashi);

  useEffect(() => {
    if (defaultPalette && !selectedPalette) {
      onUpdate({
        ...data,
        rashi_palette: defaultPalette.id,
        theme_color: defaultPalette.background,
      });
    }
  }, [data, defaultPalette, onUpdate, selectedPalette]);

  /** Persists the selected rashi palette for the legacy edit flow. */
  function selectPalette(palette: RashiPalette) {
    onUpdate({ ...data, rashi_palette: palette.id, theme_color: palette.background });
  }

  /** Persists the selected portfolio template for the legacy edit flow. */
  function selectTemplate(templateName: string) {
    onUpdate({ ...data, template_name: templateName });
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm font-medium">Rashi palette</p>
        <p className="mt-1 text-sm text-muted-foreground">Your selected background automatically receives readable dark or light typography.</p>
        <div className="mt-3">
          <RashiPalettePicker
            palettes={palettes}
            selectedPaletteId={selectedPalette?.id}
            onSelect={selectPalette}
          />
        </div>
      </div>

      <div>
        <p className="text-sm font-medium">Portfolio template</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {["Royal Heritage", "Celestial Union"].map((templateName) => {
            const selected = (data.template_name as string | undefined || "Royal Heritage") === templateName;
            return (
              <button
                key={templateName}
                type="button"
                onClick={() => selectTemplate(templateName)}
                className={`rounded-lg border px-3 py-3 text-left text-xs font-semibold transition ${
                  selected ? "border-foreground bg-muted" : "border-border hover:bg-muted"
                }`}
                aria-pressed={selected}
              >
                {templateName}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
