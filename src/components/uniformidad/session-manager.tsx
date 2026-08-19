'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useUniformidadStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Save, History, Trash2, Download } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from '@/hooks/use-toast';

interface Session {
  id: string;
  lineaGenetica: string;
  edadSemanas: number | null;
  pesos: string;
  createdAt: string;
  updatedAt: string;
}

export function SessionManager() {
  const { pesos, lineaGenetica, edadSemanas, setPesos, setLineaGenetica, setEdadSemanas, resetAll } = useUniformidadStore();
  const t = useTranslations('sessions');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [open, setOpen] = useState(false);

  const fetchSessions = async () => {
    try {
      const { listFlockSessions } = await import('@/lib/local-api');
      setSessions(await listFlockSessions());
    } catch (err) {
      console.error('Error fetching sessions:', err);
    }
  };

  const handleOpenChange = useCallback((isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) fetchSessions();
  }, []);

  const handleSave = async () => {
    if (pesos.length === 0) {
      toast({ title: t('noDataTitle'), description: t('noDataBody'), variant: 'destructive' });
      return;
    }
    try {
      const { createFlockSession } = await import('@/lib/local-api');
      await createFlockSession({ lineaGenetica, edadSemanas, pesos });
      toast({ title: t('savedTitle'), description: t('savedBody') });
      fetchSessions();
    } catch (err) {
      console.error('Error saving session:', err);
      toast({ title: t('saveErrorTitle'), description: t('saveErrorBody'), variant: 'destructive' });
    }
  };

  const handleLoad = (session: Session) => {
    const loadedPesos = JSON.parse(session.pesos) as number[];
    setLineaGenetica(session.lineaGenetica);
    setEdadSemanas(session.edadSemanas ? session.edadSemanas.toString() : '');
    setPesos(loadedPesos);
    setOpen(false);
    toast({ title: t('loadedTitle'), description: t('loadedBody', { n: loadedPesos.length }) });
  };

  const handleDelete = async (id: string) => {
    try {
      const { deleteFlockSession } = await import('@/lib/local-api');
      await deleteFlockSession(id);
      toast({ title: t('deletedTitle') });
      fetchSessions();
    } catch (err) {
      console.error('Error deleting session:', err);
    }
  };

  return (
    <div className="flex gap-2 mb-6">
      <Button
        onClick={handleSave}
        variant="outline"
        className="flex-1 border-green-600 text-green-700 hover:bg-green-50 font-semibold"
      >
        <Save className="h-4 w-4 mr-2" />
        {t('save')}
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Button variant="outline" className="flex-1 border-blue-600 text-blue-700 hover:bg-blue-50 font-semibold">
            <History className="h-4 w-4 mr-2" />
            {t('saved')}
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('saved')}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-80">
            {sessions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">{t('empty')}</p>
            ) : (
              <div className="space-y-3">
                {sessions.map((session) => {
                  const sessionPesos = JSON.parse(session.pesos) as number[];
                  return (
                    <Card key={session.id} className="overflow-hidden">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate">{session.lineaGenetica}</p>
                            <p className="text-xs text-muted-foreground">
                              {session.edadSemanas ? t('weeks', { n: session.edadSemanas }) : t('noAge')} • {t('birds', { n: sessionPesos.length })}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(session.createdAt).toLocaleDateString()} {new Date(session.createdAt).toLocaleTimeString()}
                            </p>
                          </div>
                          <div className="flex gap-1.5 ml-2 shrink-0">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleLoad(session)}
                              className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                              title={t('load')}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(session.id)}
                              className="text-red-400 hover:text-red-600 hover:bg-red-50"
                              title={t('delete')}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
