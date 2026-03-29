"use client"

import { useState, useEffect } from "react"
import { ChevronDown } from "lucide-react"
import { CountryDto } from "@/types/DTOs/country.interface"
import { flags } from "@/lib/flag-utils"

interface CountrySelectorProps {
  value: string
  onChange: (countryCode: string) => void
}

export function CountrySelector({ value, onChange }: CountrySelectorProps) {
  const [countries] = useState<CountryDto[]>(
    Object.entries(flags).map(([code, { name, flagUrl, dialCode }]) => ({
      code,
      name,
      flagUrl,
      dialCode,
    }))
  )

  const [selectedCountry, setSelectedCountry] = useState<CountryDto | null>(null)

  useEffect(() => {
    const country = countries.find((c) => c.code === value)
    setSelectedCountry(country || countries[0])
  }, [value, countries])

  const handleCountryChange = (countryCode: string) => {
    const country = countries.find((c) => c.code === countryCode)
    if (country) {
      setSelectedCountry(country)
      onChange(countryCode)
    }
  }

  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => handleCountryChange(e.target.value)}
        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
        aria-label="Selecionar país"
      >
        {countries.map((country) => (
          <option key={country.code} value={country.code}>
            {country.name} ({country.dialCode})
          </option>
        ))}
      </select>

      <div className="flex items-center gap-1.5 px-3 py-1 h-9 shadow-xs border border-input rounded-md bg-transparent min-w-[90px]">
        {selectedCountry?.flagUrl && (
          <img
            src={selectedCountry.flagUrl}
            alt={selectedCountry.name}
            className="w-5 h-3.5 object-cover shrink-0 rounded-sm"
          />
        )}
        <span className="text-sm font-medium text-foreground">
          {selectedCountry?.dialCode ?? "+?"}
        </span>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0 ml-auto" />
      </div>
    </div>
  )
}
