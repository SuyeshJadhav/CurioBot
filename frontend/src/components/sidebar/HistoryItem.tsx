// HistoryItem — A single past session entry in the left sidebar.
// Pure presentational — receives topic and onClick from LeftSidebar.

interface HistoryItemProps {
  topic: string;
  onClick: () => void;
}

export function HistoryItem({ topic, onClick }: HistoryItemProps) {
  return (
    <div className="history-item" onClick={onClick} role="button" tabIndex={0}>
      <span className="material-symbols-outlined">article</span>
      {topic}
    </div>
  );
}
