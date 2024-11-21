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

resource "cloudflare_workers_kv_namespace" "game_state" {
  account_id = var.cloudflare_account_id
  title      = "${var.project_name}-game-state"
}

resource "cloudflare_r2_bucket" "game_assets" {
  account_id = var.cloudflare_account_id
  name       = "${var.project_name}-assets"
  location   = "WNAM"
}

# Add public access for the R2 bucket
resource "cloudflare_r2_bucket_public_access" "game_assets_public" {
  account_id = var.cloudflare_account_id
  bucket     = cloudflare_r2_bucket.game_assets.name
  public_access {
    enabled = true
  }
}

resource "cloudflare_workers_script" "game_api" {
  account_id = var.cloudflare_account_id
  name       = var.project_name # Removed -api suffix to match workers.dev URL format

  module  = true
  content = file("${path.module}/workers/dist/index.js")

  kv_namespace_binding {
    name         = "GAME_STATE"
    namespace_id = cloudflare_workers_kv_namespace.game_state.id
  }

  r2_bucket_binding {
    name        = "GAME_ASSETS"
    bucket_name = cloudflare_r2_bucket.game_assets.name
  }

  plain_text_binding {
    name = "ENVIRONMENT"
    text = var.environment
  }

  plain_text_binding {
    name = "SOURCE_VERSION"
    text = filesha256("${path.module}/workers/src/index.ts")
  }

  compatibility_date  = "2024-01-01"
  compatibility_flags = ["nodejs_compat"]
}

resource "cloudflare_workers_route" "api_route" {
  count       = var.custom_domain != "" ? 1 : 0
  zone_id     = var.cloudflare_zone_id
  pattern     = "api.${var.custom_domain}/*"
  script_name = cloudflare_workers_script.game_api.name
}
