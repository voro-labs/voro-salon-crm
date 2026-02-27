// app/not-authorized.tsx
export default function NotAuthorized() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="max-w-md text-center">
        <h1 className="text-3xl font-semibold text-foreground">
          Acesso não autorizado
        </h1>
        <p className="mt-4 text-sm text-muted-foreground">
          Você não possui permissão para acessar este conteúdo.
          Caso acredite que isso seja um erro, entre em contato com o administrador.
        </p>
      </div>
    </div>
  );
}
