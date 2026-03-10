'use client';

import { useState } from 'react';
import { FolderPlus, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import { useCollections } from '@/lib/hooks/use-collections';
import { useBulkMoveToCollection } from '@/lib/hooks/use-bulk-actions';

interface BulkCollectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clipIds: string[];
  onSuccess?: () => void;
}

export function BulkCollectionDialog({
  open,
  onOpenChange,
  clipIds,
  onSuccess,
}: BulkCollectionDialogProps) {
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>('');

  const { data: collections = [], isLoading: collectionsLoading } = useCollections();
  const bulkMove = useBulkMoveToCollection();

  async function handleApply() {
    if (!selectedCollectionId || clipIds.length === 0) return;
    await bulkMove.mutateAsync({
      clipIds,
      collectionId: selectedCollectionId,
    });
    setSelectedCollectionId('');
    onOpenChange(false);
    onSuccess?.();
  }

  function handleClose(open: boolean) {
    if (!open) {
      setSelectedCollectionId('');
    }
    onOpenChange(open);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderPlus className="h-4 w-4 text-primary" />
            컬렉션에 추가
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          선택한 클립{' '}
          <span className="font-semibold text-foreground">{clipIds.length}개</span>를
          이동할 컬렉션을 선택하세요.
        </p>

        {/* 컬렉션 목록 */}
        <div className="max-h-64 overflow-y-auto rounded-xl border border-border/60 bg-surface p-1">
          {collectionsLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : collections.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              컬렉션이 없습니다. 먼저 컬렉션을 만들어주세요.
            </p>
          ) : (
            <RadioGroup
              value={selectedCollectionId}
              onValueChange={setSelectedCollectionId}
              className="gap-0"
            >
              {collections.map((col) => {
                const isSelected = selectedCollectionId === col.id;
                return (
                  <label
                    key={col.id}
                    className={cn(
                      'flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-accent',
                      isSelected && 'bg-primary/5'
                    )}
                  >
                    <RadioGroupItem value={col.id} id={`col-${col.id}`} />
                    <div className="flex min-w-0 flex-col">
                      <Label
                        htmlFor={`col-${col.id}`}
                        className="cursor-pointer truncate font-medium"
                      >
                        {col.name}
                      </Label>
                      {col.description && (
                        <span className="truncate text-xs text-muted-foreground">
                          {col.description}
                        </span>
                      )}
                    </div>
                  </label>
                );
              })}
            </RadioGroup>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => handleClose(false)}
            disabled={bulkMove.isPending}
          >
            취소
          </Button>
          <Button
            onClick={() => void handleApply()}
            disabled={!selectedCollectionId || bulkMove.isPending}
          >
            {bulkMove.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                이동 중...
              </>
            ) : (
              '컬렉션에 추가'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
