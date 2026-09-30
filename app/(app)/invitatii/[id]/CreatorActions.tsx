import ActionButtonForm from '@/components/ui/ActionButtonForm';
import type { ActionState } from '@/lib/result';

type BoundAction = (prev: ActionState, formData: FormData) => Promise<ActionState>;

interface CreatorActionsProps {
  acceptProposal: BoundAction | null;
  cancel: BoundAction | null;
}

export default function CreatorActions({ acceptProposal, cancel }: CreatorActionsProps) {
  if (!acceptProposal && !cancel) return null;
  return (
    <section className="card row" aria-label="Actiuni">
      {acceptProposal && <ActionButtonForm action={acceptProposal} label="Accept ora propusa" variant="primary" />}
      {cancel && (
        <ActionButtonForm
          action={cancel}
          label="Anulez invitatia"
          variant="danger"
          confirmText="Sigur anulezi invitatia?"
        />
      )}
    </section>
  );
}
