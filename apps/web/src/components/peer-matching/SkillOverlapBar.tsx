interface SkillOverlapBarProps {
  skills: string[];
  maxVisible?: number;
}

export function SkillOverlapBar({ skills, maxVisible = 5 }: SkillOverlapBarProps) {
  if (skills.length === 0) {
    return <p className="text-xs text-muted-foreground">No skills listed</p>;
  }

  const visible = skills.slice(0, maxVisible);
  const remaining = skills.length - visible.length;

  return (
    <div className="flex flex-wrap gap-1 items-center">
      {visible.map((skill) => (
        <span
          key={skill}
          className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground"
        >
          {skill}
        </span>
      ))}
      {remaining > 0 && (
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
          +{remaining} more
        </span>
      )}
    </div>
  );
}
