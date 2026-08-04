import { useState } from 'react';
import type { Comment } from '../../types';
import { userName } from '../../config/users';
import { CommentForm } from './CommentForm';
import styles from './Comments.module.css';

interface Props {
  comments: Comment[];
  currentUid: string;
  admin: boolean;
  onEdit: (commentId: string, text: string) => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
}

const formatDate = (d: Date): string =>
  d.toLocaleString('pl-PL', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });

export function CommentList({ comments, currentUid, admin, onEdit, onDelete }: Props) {
  const [editing, setEditing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function remove(commentId: string) {
    if (!confirm('Usunąć ten komentarz?')) return;
    setDeleting(commentId);
    setDeleteError(null);
    try {
      await onDelete(commentId);
    } catch (err) {
      console.error(err);
      setDeleteError('Nie udało się usunąć komentarza. Sprawdź połączenie i spróbuj ponownie.');
    } finally {
      setDeleting(null);
    }
  }

  if (comments.length === 0) {
    return <p className={styles.empty}>Brak komentarzy. Możesz być pierwszy.</p>;
  }

  return (
    <>
      {deleteError && (
        <p className={styles.error} role="alert">
          {deleteError}
        </p>
      )}
      <ul className={styles.list}>
      {comments.map((c) => {
        const mine = c.uid === currentUid;

        return (
          <li key={c.id} className={styles.item}>
            <div className={styles.head}>
              <span className={styles.author}>{userName(c.uid)}</span>
              {c.createdAt && (
                <time className={styles.date} dateTime={c.createdAt.toISOString()}>
                  {formatDate(c.createdAt)}
                </time>
              )}
              {c.editedAt && <span className={styles.edited}>edytowany</span>}
            </div>

            {editing === c.id ? (
              <CommentForm
                initialText={c.text}
                submitLabel="Zapisz"
                autoFocus
                onCancel={() => setEditing(null)}
                onSubmit={async (text) => {
                  await onEdit(c.id, text);
                  setEditing(null);
                }}
              />
            ) : (
              <>
                {/* React sam escapuje tekst - w kodzie nie ma i nie może pojawić
                    się dangerouslySetInnerHTML. */}
                <p className={styles.text}>{c.text}</p>

                {(mine || admin) && (
                  <div className={styles.itemActions}>
                    {mine && (
                      <button type="button" className={styles.link} onClick={() => setEditing(c.id)}>
                        Edytuj
                      </button>
                    )}
                    <button
                      type="button"
                      className={styles.link}
                      disabled={deleting === c.id}
                      onClick={() => void remove(c.id)}
                    >
                      {deleting === c.id ? 'Usuwanie...' : 'Usuń'}
                    </button>
                  </div>
                )}
              </>
            )}
          </li>
        );
      })}
      </ul>
    </>
  );
}
