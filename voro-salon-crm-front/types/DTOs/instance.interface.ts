import type { InstanceExtensionDto } from "./instance-extension.interface"

export interface InstanceDto {
  id?: string
  name?: string
  status?: string
  createdAt?: string
  instanceExtension?: InstanceExtensionDto
}
