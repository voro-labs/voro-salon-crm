// app/not-found.tsx
export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="max-w-md text-center">
        <h1 className="text-3xl font-semibold text-foreground">
          Página não encontrada
        </h1>
        <p className="mt-4 text-sm text-muted-foreground">
          O recurso solicitado não existe, foi removido ou a URL está incorreta.
          Verifique o endereço ou retorne para a página inicial.
        </p>
      </div>
    </div>
  );
}
