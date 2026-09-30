import { STATUS_LABELS, type InvitationStatus } from '@/lib/domain';

export default function StatusPill({ status }: { status: InvitationStatus }) {
  return <span className={`status status-${status}`}>{STATUS_LABELS[status]}</span>;
}
