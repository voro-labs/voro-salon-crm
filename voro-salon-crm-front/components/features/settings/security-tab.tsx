"use client"

import {
  Shield,
  ShieldCheck,
  ShieldOff,
  Mail,
  CheckCircle,
  AlertTriangle,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { useSecuritySettings } from "@/hooks/use-security-settings.hook"

export function SecurityTab() {
  const {
    user,
    emailConfirmed,
    twoFactorEnabled,
    tfa2Dialog,
    set2FADialog,
    tfaCode,
    setTfaCode,
    tfaLoading,
    tfaError,
    resendingEmail,
    emailResent,
    handleRequest2FA,
    handleConfirm2FA,
    handleDisable2FA,
    handleResendConfirmEmail,
  } = useSecuritySettings()

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle>Segurança</CardTitle>
          </div>
          <CardDescription>Gerencie a verificação de e-mail e a autenticação de dois fatores da sua conta</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {/* Confirmação de e-mail */}
          <div className={`flex items-start justify-between gap-4 p-4 rounded-lg border ${emailConfirmed ? "border-border bg-muted/20" : "border-amber-400 bg-amber-50 dark:bg-amber-950/20"}`}>
            <div className="flex items-start gap-3">
              {emailConfirmed
                ? <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                : <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              }
              <div>
                <p className="font-semibold text-sm text-foreground">
                  {emailConfirmed ? "E-mail confirmado" : "E-mail não confirmado"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {emailConfirmed
                    ? `${user?.email} — verificado e pronto para uso.`
                    : `Confirme ${user?.email} para poder ativar a autenticação de dois fatores.`}
                </p>
              </div>
            </div>
            {!emailConfirmed && (
              <Button
                size="sm"
                variant="outline"
                className="shrink-0 border-amber-400 text-amber-700 hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-900/30 text-xs"
                onClick={handleResendConfirmEmail}
                disabled={resendingEmail || emailResent}
              >
                {resendingEmail
                  ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  : <Mail className="mr-1.5 h-3.5 w-3.5" />
                }
                {emailResent ? "E-mail enviado" : "Reenviar confirmação"}
              </Button>
            )}
          </div>

          {/* 2FA */}
          <div className={`flex items-center justify-between p-4 rounded-lg border border-border ${emailConfirmed ? "bg-muted/20" : "opacity-50"}`}>
            <div className="flex items-center gap-3">
              {twoFactorEnabled
                ? <ShieldCheck className="h-5 w-5 text-emerald-500 shrink-0" />
                : <ShieldOff className="h-5 w-5 text-muted-foreground shrink-0" />
              }
              <div>
                <p className="font-semibold text-foreground text-sm">Autenticação de dois fatores</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {!emailConfirmed
                    ? "É necessário confirmar o e-mail antes de ativar."
                    : twoFactorEnabled
                      ? "Ativado — um código será enviado por e-mail a cada login."
                      : "Desativado — ative para aumentar a segurança da sua conta."}
                </p>
              </div>
            </div>
            <Switch
              checked={twoFactorEnabled}
              disabled={!emailConfirmed}
              onCheckedChange={(checked) => {
                set2FADialog(checked ? "request" : "disable")
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Dialog: solicitar código */}
      <Dialog open={tfa2Dialog === "request"} onOpenChange={(o) => !o && set2FADialog("idle")}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Ativar autenticação de dois fatores
            </DialogTitle>
            <DialogDescription>
              Vamos enviar um código de verificação para <strong>{user?.email}</strong>. Confirme para continuar.
            </DialogDescription>
          </DialogHeader>
          {tfaError && <p className="text-sm text-destructive">{tfaError}</p>}
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => set2FADialog("idle")} disabled={tfaLoading}>Cancelar</Button>
            <Button onClick={handleRequest2FA} disabled={tfaLoading}>
              {tfaLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enviar código
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: confirmar código */}
      <Dialog open={tfa2Dialog === "confirm"} onOpenChange={(o) => !o && set2FADialog("idle")}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Digite o código de verificação
            </DialogTitle>
            <DialogDescription>
              Insira o código de 6 dígitos enviado para <strong>{user?.email}</strong>. Válido por 10 minutos.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center py-2">
            <InputOTP maxLength={6} value={tfaCode} onChange={setTfaCode}>
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>
          {tfaError && <p className="text-sm text-destructive text-center">{tfaError}</p>}
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => set2FADialog("idle")} disabled={tfaLoading}>Cancelar</Button>
            <Button onClick={handleConfirm2FA} disabled={tfaLoading || tfaCode.length !== 6}>
              {tfaLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: desativar 2FA */}
      <Dialog open={tfa2Dialog === "disable"} onOpenChange={(o) => !o && set2FADialog("idle")}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldOff className="h-5 w-5 text-destructive" />
              Desativar autenticação de dois fatores
            </DialogTitle>
            <DialogDescription>
              Sua conta ficará protegida apenas por senha. Tem certeza que deseja desativar o 2FA?
            </DialogDescription>
          </DialogHeader>
          {tfaError && <p className="text-sm text-destructive">{tfaError}</p>}
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => set2FADialog("idle")} disabled={tfaLoading}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDisable2FA} disabled={tfaLoading}>
              {tfaLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Desativar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
