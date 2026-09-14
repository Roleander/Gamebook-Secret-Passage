"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, AlertCircle, CheckCircle2 } from "lucide-react";

interface Passage {
  id: string;
  number: number;
  title: string | null;
}

interface ErrorPanelProps {
  errors: string[];
  passages: Passage[];
}

export function ErrorPanel({ errors, passages }: ErrorPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <AlertTriangle className="w-5 h-5 mr-2 text-yellow-500" />
          Verificación de Pasajes
        </CardTitle>
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
              Se encontraron {errors.length} problema(s) que requieren atención:
            </p>
            <div className="space-y-2">
              {errors.map((error, index) => (
                <div
                  key={index}
                  className="flex items-start p-3 bg-yellow-500/10 border border-yellow-500/50 rounded-md"
                >
                  <AlertCircle className="w-5 h-5 text-yellow-500 mr-3 mt-0.5 flex-shrink-0" />
                  <p className="text-sm">{error}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 bg-muted rounded-md">
              <h4 className="font-medium mb-2">Resumen del proyecto</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>Total de pasajes: {passages.length}</li>
                <li>
                  Pasajes de inicio:{" "}
                  {passages.filter((p) => p.number === 1).length}
                </li>
                <li>
                  Pasajes finales:{" "}
                  {passages.filter((p) => {
                    // A passage is an endpoint if it has no outgoing links
                    // This would need to be checked from the full passage data
                    return false;
                  }).length}
                </li>
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
