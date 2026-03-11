import 'reflect-metadata'

export const APP_VERSION = '0.1.0'

export function getAppInfo(): string {
  return `Smart Email Agent v${APP_VERSION}`
}