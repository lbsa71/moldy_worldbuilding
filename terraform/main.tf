# ./terraform/main.tf
terraform {
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
  }

  cloud {
    organization = "lbsa71"
    workspaces {
      name = "moldy-worldbuilding"
    }
  }
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

# KV namespace for game state
resource "cloudflare_workers_kv_namespace" "game_state" {
  account_id = var.cloudflare_account_id
  title      = "${var.project_name}-game-state"
}

# R2 bucket for assets
resource "cloudflare_r2_bucket" "game_assets" {
  account_id = var.cloudflare_account_id
  name       = "${var.project_name}-assets"
  location   = "WNAM" # North America
}

# Worker script
resource "cloudflare_worker_script" "game_api" {
  account_id = var.cloudflare_account_id
  name       = "${var.project_name}-api"

  # Now we need to provide the built JS content
  content = file("${path.module}/workers/dist/index.js")

  # Add source content for better visibility
  plain_text_binding {
    name = "SOURCE_VERSION"
    text = filesha256("${path.module}/workers/src/index.ts")
  }

  kv_namespace_binding {
    name         = "GAME_STATE"
    namespace_id = cloudflare_workers_kv_namespace.game_state.id
  }

  r2_bucket_binding {
    name        = "GAME_ASSETS"
    bucket_name = cloudflare_r2_bucket.game_assets.name
  }

  compatibility_date = "2024-01-01"
}

# Optional: Custom domain for the worker
resource "cloudflare_worker_route" "api_route" {
  count       = var.custom_domain != "" ? 1 : 0
  zone_id     = var.cloudflare_zone_id
  pattern     = "api.${var.custom_domain}/*"
  script_name = cloudflare_worker_script.game_api.name
}