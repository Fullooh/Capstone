import type { SubmitEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { Difficulty, Subject, SubjectInput } from "@/lib/subjects";

type ClassFormProps = {
  initial: Subject | null;
  saving: boolean;
  onSubmit: (input: SubjectInput) => void;
  onCancel: () => void;
};

const inputClass = "mt-2 w-full rounded-md border bg-background px-3 py-2";

function textOrNull(value: FormDataEntryValue | null) {
  const text = (value as string | null)?.trim();
  return text || null;
}

function numberOrNull(value: FormDataEntryValue | null) {
  const text = (value as string | null)?.trim();
  return text ? Number(text) : null;
}

export function ClassForm({ initial, saving, onSubmit, onCancel }: ClassFormProps) {
  const editing = initial !== null;

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = (data.get("name") as string).trim();
    const notes = (data.get("notes") as string).trim();

    if (!name) {
      toast.error("Please add a class name");
      return;
    }

    onSubmit({
      name,
      grade: numberOrNull(data.get("grade")),
      difficulty: (data.get("difficulty") as Difficulty | "") || null,
      study_hours: numberOrNull(data.get("studyHours")),
      class_days: textOrNull(data.get("classDays")),
      start_time: textOrNull(data.get("startTime")),
      end_time: textOrNull(data.get("endTime")),
      notes: notes || null,
    });
  }

  return (
    <form
      id="class-form"
      onSubmit={handleSubmit}
      className="scroll-mt-6 rounded-xl border bg-card p-6 sm:p-8"
    >
      <h2 className="text-xl font-semibold">
        {editing ? `Edit ${initial.name}` : "Add a Class"}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {editing
          ? "Update the details for this class."
          : "Track each class you're taking with its own grade, difficulty, and study time."}
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="className" className="text-sm font-medium">
            Class Name
          </label>
          <input
            id="className"
            name="name"
            required
            defaultValue={initial?.name ?? ""}
            placeholder="Example: AP Biology"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="grade" className="text-sm font-medium">
            Current Grade (%)
          </label>
          <input
            id="grade"
            name="grade"
            type="number"
            min="0"
            max="100"
            step="any"
            defaultValue={initial?.grade ?? ""}
            placeholder="Example: 85"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="difficulty" className="text-sm font-medium">
            Difficulty
          </label>
          <select
            id="difficulty"
            name="difficulty"
            defaultValue={initial?.difficulty ?? ""}
            className={inputClass}
          >
            <option value="">Not set</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>

        <div>
          <label htmlFor="studyHours" className="text-sm font-medium">
            Study Hours Per Week
          </label>
          <input
            id="studyHours"
            name="studyHours"
            type="number"
            min="0"
            step="any"
            defaultValue={initial?.study_hours ?? ""}
            placeholder="Example: 5"
            className={inputClass}
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="classDays" className="text-sm font-medium">
            Class Days
          </label>
          <input
            id="classDays"
            name="classDays"
            defaultValue={initial?.class_days ?? ""}
            placeholder="Example: Mon/Wed/Fri or Tue-Thu"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="classStart" className="text-sm font-medium">
            Start Time
          </label>
          <input
            id="classStart"
            name="startTime"
            type="time"
            defaultValue={initial?.start_time?.slice(0, 5) ?? ""}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="classEnd" className="text-sm font-medium">
            End Time
          </label>
          <input
            id="classEnd"
            name="endTime"
            type="time"
            defaultValue={initial?.end_time?.slice(0, 5) ?? ""}
            className={inputClass}
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="classNotes" className="text-sm font-medium">
            Notes
          </label>
          <textarea
            id="classNotes"
            name="notes"
            rows={4}
            defaultValue={initial?.notes ?? ""}
            placeholder="Upcoming exams, assignments, difficult topics..."
            className={inputClass}
          />
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-2">
        {editing && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : editing ? "Save Changes" : "Add Class"}
        </Button>
      </div>
    </form>
  );
}
