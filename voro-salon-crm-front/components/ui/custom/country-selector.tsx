"use client"

import { useState, useEffect } from "react"
import { CountryDto } from "@/types/DTOs/country.interface"
import { flags } from "@/lib/flag-utils"

interface CountrySelectorProps {
  value: string
  onChange: (countryCode: string) => void
}

export function CountrySelector({ value, onChange }: CountrySelectorProps) {
  
const [countries, setCountries] = useState<CountryDto[]>(
  Object.entries(flags).map(([code, { name, flagUrl, dialCode }]) => ({
      code,
      name,
      flagUrl,
      dialCode,
    }))
  );

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
        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
      >
        {countries.map((country) => (
          <option key={country.code} value={country.code}>
            {country.name}
          </option>
        ))}
      </select>

      <div className="flex items-center gap-2 px-3 py-2 shadow-sm border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring">
        {selectedCountry && (
          <img src={selectedCountry.flagUrl || "/placeholder.svg"} alt="Bandeira" className="w-6 h-4 object-cover" />
        )}
        <span className="text-sm">{selectedCountry ? selectedCountry.name : "Selecione um país"}</span>
      </div>
    </div>
  )
}
