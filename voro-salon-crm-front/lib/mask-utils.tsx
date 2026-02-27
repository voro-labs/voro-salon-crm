// Utilitários para conversão de datas

/**
 * Converte data ISO completa (2002-09-17T00:00:00Z) para formato yyyy-MM-dd
 * @param isoString - String no formato ISO completo
 * @returns String no formato yyyy-MM-dd ou string vazia se inválida
 */
export const phoneMasks: Record<string, { mask: string; placeholder: string }> = {
    BR: { mask: "(##) ####-####", placeholder: "(11) 9999-9999" },
    US: { mask: "(###) ###-####", placeholder: "(555) 123-4567" },
    GB: { mask: "#### ### ####", placeholder: "0123 456 7890" },
    CA: { mask: "(###) ###-####", placeholder: "(555) 123-4567" },
    AU: { mask: "#### ### ###", placeholder: "0412 345 678" },
    AR: { mask: "## ####-####", placeholder: "11 1234-5678" },
    MX: { mask: "## #### ####", placeholder: "55 1234 5678" },
    FR: { mask: "## ## ## ## ##", placeholder: "01 23 45 67 89" },
    DE: { mask: "### #######", placeholder: "030 1234567" },
    IT: { mask: "### ### ####", placeholder: "06 1234 5678" },
}

export function applyMask(inputValue: string, mask: string): string {
    // Remove todos os caracteres não numéricos
    const numbers = inputValue.replace(/\D/g, "")

    let masked = ""
    let numberIndex = 0

    for (let i = 0; i < mask.length && numberIndex < numbers.length; i++) {
        if (mask[i] === "#") {
        masked += numbers[numberIndex]
        numberIndex++
        } else {
        masked += mask[i]
        }
    }

    return masked
}

export function removeMask(maskedValue: string): string {
    return maskedValue.replace(/\D/g, "")
}
