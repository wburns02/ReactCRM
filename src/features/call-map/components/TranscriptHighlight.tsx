interface TranscriptHighlightProps {
  text: string;
}

export function TranscriptHighlight({ text }: TranscriptHighlightProps) {
  if (!text) return null;
  return (
    <div className="rounded-md bg-muted/50 px-2 py-1.5 text-xs italic text-muted-foreground">
      &ldquo;{text}&rdquo;
    </div>
  );
}
