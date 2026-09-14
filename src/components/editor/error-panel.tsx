"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, AlertCircle, CheckCircle2, Wand2 } from "lucide-react";

interface Passage {
  id: string;
  number: number;
  title: string | null;
}

interface PassageError {
  type: "orphan" | "no_exit" | "broken_link" | "cycle";
  passageNumber: number;
  message: string;
  autoFixable: boolean;
}

interface ErrorPanelProps {
  errors: PassageError[];
  passages: Passage[];
  onAutoFix?: () => void;
  autoFixing?: boolean;
}

export function ErrorPanel({ errors, passages, onAutoFix, autoFixing }: ErrorPanelProps) {
  const fixableCount = errors.filter(e => e.autoFixable).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2 text-yellow-500" />
            Verificación de Pasajes
          </CardTitle>
          {fixableCount > 0 && onAutoFix && (
            <Button
              onClick={onAutoFix}
              disabled={autoFixing}
              size="sm"
            >
              <Wand2 className="w-4 h-4 mr-2" />
              {autoFixing ? "Arreglando..." : `Auto-fix (${fixableCount})`}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {errors.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-green-500" />
            <h3 className="text-lg font-medium mb-2 text-green-500">
              ¡Todo correcto!
            </h3>
            <p className="text-muted-foreground">
              No se encontraron errores en las conexiones entre pasajes.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Se encontraron {errors.length} problema(s):
            </p>
            <div className="space-y-2">
              {errors.map((error, index) => (
                <div
                  key={index}
                  className={`flex items-start p-3 rounded-md ${
                    error.autoFixable
                      ? "bg-blue-500/10 border border-blue-500/50"
                      : "bg-yellow-500/10 border border-yellow-500/50"
                  }`}
                >
                  <AlertCircle className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0 text-yellow-500" />
                  <div className="flex-1">
                    <p className="text-sm">{error.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {error.autoFixable ? "Auto-fixable" : "Requiere intervención manual"}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 bg-muted rounded-md">
              <h4 className="font-medium mb-2">Resumen</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>Total de pasajes: {passages.length}</li>
                <li>Pasajes de inicio: {passages.filter((_, i) => i === 0).length}</li>
                <li>Errores auto-fixables: {fixableCount}</li>
                <li>Errores manuales: {errors.length - fixableCount}</li>
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
