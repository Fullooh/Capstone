import { Button } from "@/components/ui/button";
import { difficultyStyles, letterGrade, type Subject } from "@/lib/subjects";

type ClassCardProps = {
  subject: Subject;
  deleting: boolean;
  onEdit: () => void;
  onDelete: () => void;
};

export function ClassCard({ subject, deleting, onEdit, onDelete }: ClassCardProps) {
  return (
    <li className="flex flex-col rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <h3 className="min-w-0 text-lg font-semibold break-words">
          {subject.name}
        </h3>
        {subject.difficulty && (
          <span
            className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${difficultyStyles[subject.difficulty]}`}
          >
            {subject.difficulty}
          </span>
        )}
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-muted/50 p-3">
          <dt className="text-xs text-muted-foreground">Grade</dt>
          <dd className="mt-1 text-xl font-semibold">
            {subject.grade !== null ? (
              <>
                {subject.grade}%{" "}
                <span className="text-sm font-medium text-muted-foreground">
                  {letterGrade(subject.grade)}
                </span>
              </>
            ) : (
              "—"
            )}
          </dd>
        </div>
        <div className="rounded-lg bg-muted/50 p-3">
          <dt className="text-xs text-muted-foreground">Study / Week</dt>
          <dd className="mt-1 text-xl font-semibold">
            {subject.study_hours !== null ? `${subject.study_hours} hrs` : "—"}
          </dd>
        </div>
      </dl>

      {subject.notes && (
        <p className="mt-4 text-sm whitespace-pre-wrap break-words text-muted-foreground">
          {subject.notes}
        </p>
      )}

      <div className="mt-auto flex justify-end gap-2 pt-4">
        <Button variant="outline" size="sm" onClick={onEdit}>
          Edit
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          disabled={deleting}
          onClick={onDelete}
        >
          {deleting ? "Deleting..." : "Delete"}
        </Button>
      </div>
    </li>
  );
}
