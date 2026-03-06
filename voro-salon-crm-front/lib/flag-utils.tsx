export const flags: Record<string, { name: string; flagUrl: string, dialCode: string, dialCodeOnlyNumber: string }> = {
    BR: { name: "Brasil", flagUrl: "https://flagcdn.com/w20/br.png", dialCode: "+55", dialCodeOnlyNumber: "55" },
    US: { name: "Estados Unidos", flagUrl: "https://flagcdn.com/w20/us.png", dialCode: "+1", dialCodeOnlyNumber: "1" },
    GB: { name: "Reino Unido", flagUrl: "https://flagcdn.com/w20/gb.png", dialCode: "+44", dialCodeOnlyNumber: "44" },
    CA: { name: "Canadá", flagUrl: "https://flagcdn.com/w20/ca.png", dialCode: "+1", dialCodeOnlyNumber: "1" },
    AU: { name: "Austrália", flagUrl: "https://flagcdn.com/w20/au.png", dialCode: "+61", dialCodeOnlyNumber: "61" },
    AR: { name: "Argentina", flagUrl: "https://flagcdn.com/w20/ar.png", dialCode: "+54", dialCodeOnlyNumber: "54" },
    MX: { name: "México", flagUrl: "https://flagcdn.com/w20/mx.png", dialCode: "+52", dialCodeOnlyNumber: "52" },
    FR: { name: "França", flagUrl: "https://flagcdn.com/w20/fr.png", dialCode: "+33", dialCodeOnlyNumber: "33" },
    DE: { name: "Alemanha", flagUrl: "https://flagcdn.com/w20/de.png", dialCode: "+49", dialCodeOnlyNumber: "49" },
    IT: { name: "Itália", flagUrl: "https://flagcdn.com/w20/it.png", dialCode: "+39", dialCodeOnlyNumber: "39" },
}

/**
 * Identifies the country code and the remaining phone number from a full phone string.
 * Defaults to BR if no dial code matches.
 */
export function getCountryFromPhone(fullPhone: string): { countryCode: string; phoneNumber: string } {
    if (!fullPhone) return { countryCode: "BR", phoneNumber: "" }

    // Remove any non-numeric characters
    const cleanPhone = fullPhone.replace(/\D/g, "")

    // Try to match dialCodeOnlyNumber from longest to shortest (to avoid matching 1 for 11 etc)
    const sortedCountries = Object.entries(flags).sort((a, b) => b[1].dialCodeOnlyNumber.length - a[1].dialCodeOnlyNumber.length)

    for (const [code, data] of sortedCountries) {
        if (cleanPhone.startsWith(data.dialCodeOnlyNumber)) {
            return {
                countryCode: code,
                phoneNumber: cleanPhone.slice(data.dialCodeOnlyNumber.length)
            }
        }
    }

    return { countryCode: "BR", phoneNumber: cleanPhone }
}
