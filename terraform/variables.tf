# ./terraform/variables.tf

# Required variables
variable "cloudflare_api_token" {
  description = "Cloudflare API Token with appropriate permissions"
  type        = string
  sensitive   = true

  validation {
    condition     = length(var.cloudflare_api_token) > 0
    error_message = "Cloudflare API token must be provided"
  }
}

variable "cloudflare_account_id" {
  description = "Cloudflare Account ID"
  type        = string
  default     = "9c653f9fe8d125ea14e33f3f82894614"
  validation {
    condition     = can(regex("^[0-9a-fA-F]{32}$", var.cloudflare_account_id))
    error_message = "Cloudflare Account ID must be a 32-character hex string"
  }
}

# Optional variables with defaults
variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
  default     = "moldy-worldbuilding"

  validation {
    condition     = can(regex("^[a-z0-9-]+$", var.project_name))
    error_message = "Project name must contain only lowercase letters, numbers, and hyphens"
  }
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "development"

  validation {
    condition     = contains(["development", "staging", "production"], var.environment)
    error_message = "Environment must be one of: development, staging, production"
  }
}

variable "region" {
  description = "R2 bucket region"
  type        = string
  default     = "WNAM" # North America

  validation {
    condition     = contains(["WNAM", "ENAM", "EU", "APAC"], var.region)
    error_message = "Region must be one of: WNAM, ENAM, EU, APAC"
  }
}

variable "worker_memory" {
  description = "Worker memory limit in MB"
  type        = number
  default     = 128

  validation {
    condition     = var.worker_memory >= 128 && var.worker_memory <= 1024
    error_message = "Worker memory must be between 128 and 1024 MB"
  }
}

variable "custom_domain" {
  description = "Custom domain for the API (optional)"
  type        = string
  default     = ""

  validation {
    condition     = var.custom_domain == "" || can(regex("^[a-z0-9.-]+$", var.custom_domain))
    error_message = "Custom domain must be empty or contain only lowercase letters, numbers, dots, and hyphens"
  }
}

variable "cloudflare_zone_id" {
  description = "Cloudflare Zone ID (only needed if using custom domain)"
  type        = string
  default     = ""

  validation {
    condition     = var.cloudflare_zone_id == "" || can(regex("^[0-9a-fA-F]{32}$", var.cloudflare_zone_id))
    error_message = "Cloudflare Zone ID must be empty or a 32-character hex string"
  }
}

variable "worker_routes" {
  description = "List of routes to attach to the worker"
  type        = list(string)
  default     = []

  validation {
    condition     = alltrue([for route in var.worker_routes : can(regex("^[\\w.*/-]+$", route))])
    error_message = "Worker routes must contain only letters, numbers, dots, asterisks, and hyphens"
  }
}

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default = {
    Project     = "moldy-worldbuilding"
    Environment = "development"
    ManagedBy   = "terraform"
  }
}